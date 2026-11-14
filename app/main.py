import asyncio
import logging
import os
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI
from prometheus_client import start_http_server
from starlette.middleware.cors import CORSMiddleware

from app.api.dev_auth import router as dev_auth_router
from app.api.routes import router
from app.api.trust import router as trust_router
from app.api.workspaces import router as workspaces_router
from app.core.config import settings
from app.events.publisher import publisher
from app.middleware.hardening import BodyLimitMiddleware, install_error_handlers
from app.middleware.rate_limiter import rate_limit_middleware
from app.observability.logging import configure_logging_with_tracing
from app.observability.metrics import configure_metrics
from app.observability.tracing import init_tracing, instrument_app, shutdown_tracing
from app.services.auth_startup import validate_local_binding

# Configure basic logging early so startup logs appear in platform logs
configure_logging_with_tracing("api")
logging.getLogger().info("APP MODULE LOADED - PORT=%s", os.getenv("PORT", "not-set"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    started = time.monotonic()
    supervisor = None
    if settings.CLIENT_IP_MODE == "peer_only":
        logging.getLogger(__name__).warning(
            "CLIENT_IP_MODE=peer_only: anonymous per-IP limits are shared across "
            "visitors behind the platform proxy and are not enforced to avoid "
            "shared lockouts; no per-visitor IP attribution. Authenticated "
            "limits and report CAPTCHA remain required."
        )
    await _on_startup()
    if settings.APP_ROLE in {"all", "worker"}:
        from app.workers.supervisor import hosted_supervisor

        supervisor = hosted_supervisor()
        app.state.supervisor = supervisor
        supervisor.start()
    logging.getLogger().info(
        "Startup complete duration_ms=%.1f", (time.monotonic() - started) * 1000
    )
    try:
        yield
    finally:
        if supervisor is not None:
            await asyncio.to_thread(supervisor.close)
            del app.state.supervisor
        await _on_shutdown()


app = FastAPI(title="URL Shortener", lifespan=lifespan)

install_error_handlers(app)
app.middleware("http")(rate_limit_middleware)
app.add_middleware(BodyLimitMiddleware, limit=settings.MAX_REQUEST_BODY_BYTES)

# Add CORS middleware FIRST (so it executes FIRST in middleware stack)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-API-Key", "Authorization", "X-Workspace-ID"],
    expose_headers=[
        "RateLimit-Limit",
        "RateLimit-Remaining",
        "RateLimit-Reset",
        "Retry-After",
    ],
)

# Configure metrics before the app starts so middleware can be added successfully.
try:
    configure_metrics(app)
except Exception:
    logging.getLogger().exception("configure_metrics failed")


async def _on_startup():
    validate_local_binding()
    logging.getLogger().info("APP STARTUP event - initializing observability")
    # Initialize tracing and instrumentation (non-fatal on error)
    try:
        init_tracing(service_name="api")
    except Exception as exc:  # pragma: no cover - defensive
        logging.getLogger().exception("init_tracing failed: %s", exc)

    # Configure logging with tracing (best-effort)
    try:
        configure_logging_with_tracing()
    except Exception:
        logging.getLogger().exception("configure_logging_with_tracing failed")

    if settings.METRICS_PORT:
        app.state.metrics_server, app.state.metrics_thread = start_http_server(
            settings.METRICS_PORT
        )
    publisher.start()

    # Yield once; backing services never gate API-only startup.
    await asyncio.sleep(0)


app.include_router(dev_auth_router)
app.include_router(workspaces_router)
app.include_router(trust_router)
app.include_router(router)
instrument_app(app)


async def _on_shutdown():
    if settings.APP_ROLE == "api":
        await asyncio.to_thread(publisher.close)
        await asyncio.to_thread(shutdown_tracing)
    else:
        await asyncio.to_thread(publisher.close, 1.0)
        # Exporters may block on unavailable endpoints; do not delay SIGTERM.
        from threading import Thread

        shutdown = Thread(target=shutdown_tracing, daemon=True)
        shutdown.start()
        await asyncio.to_thread(shutdown.join, 0.5)
    if hasattr(app.state, "metrics_server"):
        await asyncio.to_thread(app.state.metrics_server.shutdown)
        app.state.metrics_server.server_close()
        await asyncio.to_thread(app.state.metrics_thread.join)

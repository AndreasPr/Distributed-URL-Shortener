import asyncio
import logging
import os

from fastapi import FastAPI
from prometheus_client import start_http_server
from starlette.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import settings
from app.events.publisher import publisher
from app.middleware.hardening import BodyLimitMiddleware, install_error_handlers
from app.middleware.rate_limiter import rate_limit_middleware
from app.observability.logging import configure_logging_with_tracing
from app.observability.metrics import configure_metrics
from app.observability.tracing import init_tracing, instrument_app, shutdown_tracing

# Configure basic logging early so startup logs appear in platform logs
configure_logging_with_tracing("api")
logging.getLogger().info("APP MODULE LOADED - PORT=%s", os.getenv("PORT", "not-set"))

app = FastAPI(title="URL Shortener")

install_error_handlers(app)
app.middleware("http")(rate_limit_middleware)
app.add_middleware(BodyLimitMiddleware, limit=settings.MAX_REQUEST_BODY_BYTES)

# Add CORS middleware FIRST (so it executes FIRST in middleware stack)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-API-Key"],
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


@app.on_event("startup")
async def _on_startup():
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

    # Delay briefly to allow dependent services to become reachable in hostile envs
    await asyncio.sleep(0)


app.include_router(router)
instrument_app(app)


@app.on_event("shutdown")
async def _on_shutdown():
    await asyncio.to_thread(publisher.close)
    await asyncio.to_thread(shutdown_tracing)
    if hasattr(app.state, "metrics_server"):
        await asyncio.to_thread(app.state.metrics_server.shutdown)
        app.state.metrics_server.server_close()
        await asyncio.to_thread(app.state.metrics_thread.join)

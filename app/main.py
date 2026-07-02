import logging
import os
import asyncio

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import settings
from app.observability.logging import configure_logging_with_tracing
from app.observability.metrics import configure_metrics
from app.observability.tracing import init_tracing

# Configure basic logging early so startup logs appear in platform logs
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logging.getLogger().info("APP MODULE LOADED - PORT=%s", os.getenv("PORT", "not-set"))

app = FastAPI(title="URL Shortener")

# Add CORS middleware FIRST (so it executes FIRST in middleware stack)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
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
        init_tracing(service_name="url-shortener-api")
    except Exception as exc:  # pragma: no cover - defensive
        logging.getLogger().exception("init_tracing failed: %s", exc)

    # Configure logging with tracing (best-effort)
    try:
        configure_logging_with_tracing()
    except Exception:
        logging.getLogger().exception("configure_logging_with_tracing failed")

    # Delay briefly to allow dependent services to become reachable in hostile envs
    await asyncio.sleep(0)


app.include_router(router)

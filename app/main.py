import logging
import os

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
import asyncio

from app.api.routes import router
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
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "https://distributed-url-shortener-two.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


@app.on_event("startup")
async def _on_startup():
    logging.getLogger().info("APP STARTUP event - initializing observability and metrics")
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

    # Configure metrics
    try:
        configure_metrics(app)
    except Exception:
        logging.getLogger().exception("configure_metrics failed")

    # Delay briefly to allow dependent services to become reachable in hostile envs
    await asyncio.sleep(0)


app.include_router(router)

import logging
import os

from fastapi import FastAPI
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from starlette.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.observability.logging import configure_logging_with_tracing
from app.observability.metrics import configure_metrics
from app.observability.tracing import init_tracing

# Configure basic logging early so startup logs appear in platform logs
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logging.getLogger().info("APP STARTING - PORT=%s", os.getenv("PORT", "not-set"))

# Initialize OpenTelemetry tracing before any other initialization
init_tracing(service_name="url-shortener-api")

# Configure logging with trace ID correlation
configure_logging_with_tracing()

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

# Instrument FastAPI with OpenTelemetry
FastAPIInstrumentor().instrument_app(app)
configure_metrics(app)
app.include_router(router)

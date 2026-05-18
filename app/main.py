from fastapi import FastAPI

from app.api.routes import router
from app.middleware.rate_limiter import rate_limit_middleware
from app.observability.metrics import configure_metrics
from app.observability.tracing import init_tracing
from app.observability.logging import configure_logging_with_tracing

# Initialize OpenTelemetry tracing before any other initialization
init_tracing(service_name="url-shortener-api")

# Configure logging with trace ID correlation
configure_logging_with_tracing()

app = FastAPI(title="URL Shortener")

app.middleware("http")(rate_limit_middleware)

configure_metrics(app)
app.include_router(router)

from fastapi import FastAPI

from app.api.routes import router
from app.middleware.rate_limiter import rate_limit_middleware
from app.observability.metrics import configure_metrics

app = FastAPI(title="URL Shortener")

app.middleware("http")(rate_limit_middleware)

configure_metrics(app)
app.include_router(router)
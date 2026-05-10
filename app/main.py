from fastapi import FastAPI

from app.api.routes import router
from app.middleware.rate_limiter import rate_limit_middleware

app = FastAPI(title="URL Shortener")

app.middleware("http")(rate_limit_middleware)

app.include_router(router)
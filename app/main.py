from fastapi import FastAPI

from api.routes import router

app = FastAPI(title="URL Shortener")

app.include_router(router)
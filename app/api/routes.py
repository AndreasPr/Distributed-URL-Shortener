from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.cache.redis_client import redis_client
from app.db.database import get_db
from app.observability.metrics import record_redirect
from app.schemas.url_schema import URLCreate, URLResponse
from app.services.analytics_service import AnalyticsService
from app.services.url_service import URLService

router = APIRouter()
service = URLService()
analytics_service = AnalyticsService()


@router.post("/shorten", response_model=URLResponse)
def create_short_url(req: URLCreate, db: Session = Depends(get_db)):
    code = service.shorten(db, req.long_url)
    return {"short_code": code}


@router.get("/analytics/{short_code}")
def analytics(short_code: str, db: Session = Depends(get_db)):
    try:
        return analytics_service.get_analytics(db, short_code)
    except Exception as exc:
        raise HTTPException(status_code=404, detail=f"Analytics not found: {str(exc)}")


@router.get("/urls")
def list_urls(limit: int = 20, db: Session = Depends(get_db)):
    try:
        return service.list_recent_urls(db, limit=limit)
    except Exception:
        return []


@router.get("/health")
def health(db: Session = Depends(get_db)):
    db_status = "reachable"

    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "unreachable"

    try:
        redis_ok = bool(redis_client.ping())
        redis_status = "reachable" if redis_ok else "unreachable"
    except Exception:
        redis_status = "unreachable"

    overall_status = (
        "ok" if db_status == "reachable" and redis_status == "reachable" else "degraded"
    )

    return {
        "status": overall_status,
        "db": db_status,
        "redis": redis_status,
    }


@router.get("/health/redis")
def redis_health():
    try:
        pong = redis_client.ping()
        return {
            "status": "ok" if pong else "error",
            "redis": "reachable" if pong else "unreachable",
            "dbsize": redis_client.dbsize(),
        }
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Redis unavailable: {exc}")


@router.get("/{code}")
def redirect(code: str, db: Session = Depends(get_db)):
    long_url = service.resolve(db, code)

    if not long_url:
        raise HTTPException(status_code=404, detail="Not found")

    record_redirect()
    return RedirectResponse(url=long_url)

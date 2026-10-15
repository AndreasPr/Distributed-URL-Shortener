import logging
from collections.abc import Iterator

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.cache.redis_client import read_cache, redis_client
from app.db.database import get_db
from app.models.url import URL
from app.observability.metrics import record_redirect
from app.schemas.url_schema import URLCreate, URLResponse
from app.services.analytics_service import AnalyticsService, URLNotFoundError
from app.services.url_service import URLService

logger = logging.getLogger(__name__)
router = APIRouter()
service = URLService()
analytics_service = AnalyticsService()


@router.post("/shorten", response_model=URLResponse)
def create_short_url(req: URLCreate, db: Session = Depends(get_db)):
    code = service.shorten(db, str(req.long_url))
    return {"short_code": code}


@router.get("/analytics/{short_code}")
def analytics(short_code: str, db: Session = Depends(get_db)):
    try:
        return analytics_service.get_analytics(db, short_code)
    except URLNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Analytics not found") from exc
    except Exception as exc:
        logger.exception("Failed to load analytics")
        raise HTTPException(status_code=503, detail="Analytics unavailable") from exc


@router.get("/urls")
def list_urls(limit: int = 20, db: Session = Depends(get_db)):
    try:
        return service.list_recent_urls(db, limit=limit)
    except Exception as exc:
        logger.exception("Failed to list URLs")
        raise HTTPException(status_code=503, detail="URL listing unavailable") from exc


def get_health_db() -> Iterator[Session | None]:
    """Allow readiness to report session acquisition failures as degraded."""
    sessions = get_db()
    try:
        db = next(sessions)
    except Exception:
        logger.exception("Database session unavailable for health check")
        db = None
    try:
        yield db
    finally:
        sessions.close()


@router.get("/health")
def health(db: Session | None = Depends(get_health_db)):
    db_status = "reachable"
    total_urls = 0

    try:
        if db is None:
            raise RuntimeError("Database session unavailable")
        db.execute(text("SELECT 1"))
        total_urls = db.query(func.count(URL.id)).scalar() or 0
    except Exception:
        logger.exception("Database health check failed")
        db_status = "unreachable"

    try:
        redis_ok = bool(read_cache(redis_client.ping))
        redis_status = "reachable" if redis_ok else "unreachable"
    except Exception:
        redis_status = "unreachable"

    overall_status = (
        "ok" if db_status == "reachable" and redis_status == "reachable" else "degraded"
    )

    body = {
        "status": overall_status,
        "db": db_status,
        "redis": redis_status,
        "total_urls": int(total_urls),
    }

    if overall_status != "ok":
        return JSONResponse(status_code=503, content=body)
    return body


@router.get("/livez")
def livez():
    """Process liveness; deliberately independent of backing services."""
    return {"status": "ok"}


@router.get("/health/redis")
def redis_health():
    try:
        pong = read_cache(redis_client.ping)
        size = read_cache(redis_client.dbsize)
        if pong is None or size is None:
            raise RuntimeError("Redis read failed")
        return {
            "status": "ok" if pong else "error",
            "redis": "reachable" if pong else "unreachable",
            "dbsize": size,
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

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.cache.redis_client import redis_client
from app.db.database import get_db
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


@router.get("/{code}")
def redirect(code: str, db: Session = Depends(get_db)):
    long_url = service.resolve(db, code)
    
    if not long_url:
        raise HTTPException(status_code=404, detail="Not found")
    
    return RedirectResponse(url=long_url)


@router.get("/analytics/{short_code}")
def analytics(short_code: str, db: Session = Depends(get_db)):
    return analytics_service.get_analytics(db, short_code)


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
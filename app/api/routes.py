import logging
from collections.abc import Iterator
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Response
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.abuse.persistence import LinkBlockedError, flagged, review
from app.abuse.schemas import ReviewRequest
from app.api.auth import require_admin, require_read, require_write
from app.cache.redis_client import read_cache, redis_client
from app.db.database import get_db
from app.models.api_key import APIKey
from app.models.url import URL
from app.models.url_verdict import URLVerdict
from app.observability.metrics import record_redirect
from app.repositories.url_repository import AliasTakenError
from app.schemas.url_schema import URLCreate, URLResponse
from app.services.activity_signals import signals
from app.services.analytics_service import AnalyticsService, URLNotFoundError
from app.services.api_keys import list_keys, revoke_key
from app.services.url_service import LinkExpiredError, URLService

logger = logging.getLogger(__name__)
router = APIRouter()
service = URLService()
analytics_service = AnalyticsService()


@router.post(
    "/shorten",
    response_model=URLResponse,
    summary="Shorten a public HTTP(S) URL",
    responses={
        409: {"description": "Alias already allocated"},
        422: {"description": "Invalid URL, alias, or expiry"},
    },
)
def create_short_url(
    req: URLCreate, key: APIKey = Depends(require_write), db: Session = Depends(get_db)
):
    try:
        code = service.shorten(
            db,
            str(req.long_url),
            req.custom_alias,
            req.expires_at,
            created_by=str(key.id),
        )
    except AliasTakenError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return {"short_code": code}


@router.get("/analytics/{short_code}")
def analytics(
    short_code: str, key: APIKey = Depends(require_read), db: Session = Depends(get_db)
):
    try:
        return analytics_service.get_analytics(db, short_code)
    except URLNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Analytics not found") from exc
    except Exception as exc:
        logger.exception("Failed to load analytics")
        raise HTTPException(status_code=503, detail="Analytics unavailable") from exc


@router.get("/urls", summary="List recent links, excluding soft-deleted entries")
def list_urls(
    limit: int = 20, key: APIKey = Depends(require_read), db: Session = Depends(get_db)
):
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
    except Exception:
        logger.exception("Redis health check failed")
        raise HTTPException(status_code=503, detail="Redis unavailable")


@router.delete(
    "/urls/{code}",
    status_code=204,
    summary="Soft-delete a link and evict its cache",
    responses={404: {"description": "Missing or already deleted"}},
)
def delete_url(
    code: str, key: APIKey = Depends(require_write), db: Session = Depends(get_db)
):
    if not service.delete(db, code):
        raise HTTPException(status_code=404, detail="Not found")
    return Response(status_code=204)


@router.get("/admin/keys", summary="List key metadata (never key hashes)")
def admin_keys(key: APIKey = Depends(require_admin), db: Session = Depends(get_db)):
    return list_keys(db)


@router.delete("/admin/keys/{key_id}", status_code=204)
def admin_revoke(
    key_id: int, key: APIKey = Depends(require_admin), db: Session = Depends(get_db)
):
    if not revoke_key(db, key_id):
        raise HTTPException(404, "Key not found")
    return Response(status_code=204)


@router.get("/admin/flagged", summary="Unreviewed suspicious and malicious links")
def admin_flagged(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    key: APIKey = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return flagged(db, limit, offset)


@router.post("/admin/flagged/{code}/review", status_code=204)
def admin_review(
    code: str,
    request: ReviewRequest,
    key: APIKey = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if not review(db, code, request.decision, str(key.id)):
        raise HTTPException(404, "Verdict not found")
    return Response(status_code=204)


@router.get(
    "/urls/{code}/status",
    summary="Link lifecycle without redirecting or recording a click",
)
def url_status(
    code: str = Path(pattern=r"^[A-Za-z0-9_-]{1,32}$"),
    key: APIKey = Depends(require_read),
    db: Session = Depends(get_db),
):
    row = db.query(URL).filter_by(short_code=code).first()
    if row is None:
        raise HTTPException(404, "Not found")
    verdict = db.query(URLVerdict).filter_by(short_code=code).first()
    state = "active"
    if row.deleted_at is not None:
        state = "deleted"
    elif row.expires_at and row.expires_at.replace(tzinfo=timezone.utc) <= datetime.now(
        timezone.utc
    ):
        state = "expired"
    elif verdict and (
        verdict.review_decision == "block"
        or (verdict.verdict == "malicious" and verdict.review_decision != "allow")
    ):
        state = "blocked"
    return {
        "short_code": code,
        "status": state,
        "expires_at": row.expires_at,
        "verdict": verdict.verdict if verdict else "pending",
    }


@router.get(
    "/admin/activity/{code}",
    summary="Per-code clicks and actual 429s in completed minute buckets",
)
def activity(
    code: str = Path(pattern=r"^[A-Za-z0-9_-]{1,32}$"),
    window_minutes: int = Query(60, ge=1, le=60),
    key: APIKey = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return signals(db, code, window_minutes)


@router.get(
    "/{code}",
    status_code=307,
    response_class=RedirectResponse,
    responses={
        307: {"description": "Redirect to active destination"},
        404: {"description": "Missing or deleted link"},
        410: {"description": "Expired link"},
        451: {"description": "Blocked by abuse verdict or admin review"},
    },
)
def redirect(code: str, db: Session = Depends(get_db)):
    try:
        long_url = service.resolve(db, code)
    except LinkBlockedError as exc:
        raise HTTPException(status_code=451, detail=str(exc)) from exc
    except LinkExpiredError as exc:
        raise HTTPException(status_code=410, detail=str(exc)) from exc

    if not long_url:
        raise HTTPException(status_code=404, detail="Not found")

    record_redirect()
    return RedirectResponse(url=long_url)

"""Public warning/report flow and explicitly global platform moderation."""

import re
from typing import Literal
from urllib.parse import urlsplit
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.abuse.heuristics import analyze
from app.abuse.persistence import LinkBlockedError
from app.api.auth import get_principal, require_permission, require_platform_admin
from app.api.principal import Principal
from app.api.workspaces import workspace_for
from app.cache.redis_client import invalidate_cache
from app.core.config import settings
from app.db.database import get_db
from app.middleware.rate_limiter import check_bucket, client_ip
from app.models.identity import User
from app.models.trust import AbuseReport, AuditLog, DeniedDomain
from app.models.url import URL
from app.models.url_verdict import URLVerdict
from app.services.api_keys import utcnow
from app.services.data_rights import disable_user_links, export_user
from app.services.trust import audit, destination_denied
from app.services.turnstile import verify_captcha
from app.services.url_service import LinkExpiredError, URLService

router = APIRouter()


def public_limit(request: Request) -> None:
    # A platform peer identifies many visitors; exhausting its bucket must not
    # lock them all out. Report CAPTCHA verification remains mandatory below.
    if settings.CLIENT_IP_MODE == "peer_only":
        return
    try:
        result = check_bucket(
            request.scope["route"].path, "ip:" + client_ip(request), 10, 1 / 60
        )
    except Exception:
        raise HTTPException(503, "Rate limiter unavailable") from None
    if not result.allowed:
        raise HTTPException(429, "Rate limit exceeded", headers=result.headers())


def warning_row(db: Session, code: str) -> tuple[URL, URLVerdict | None]:
    row = db.scalar(select(URL).where(URL.short_code == code))
    if not row or row.deleted_at:
        raise HTTPException(404, "Link not found")
    if row.expires_at and row.expires_at <= utcnow():
        raise HTTPException(410, "Link expired")
    verdict = db.get(URLVerdict, code)
    if destination_denied(db, row.long_url) or (
        verdict
        and (
            verdict.review_decision == "block"
            or (verdict.verdict == "malicious" and verdict.review_decision != "allow")
        )
    ):
        raise HTTPException(451, "Link blocked")
    return row, verdict


@router.get("/warnings/{code}")
def warning(code: str, db: Session = Depends(get_db)):
    row, verdict = warning_row(db, code)
    return {
        "host": urlsplit(row.long_url).hostname,
        "reasons": verdict.reasons if verdict else [],
        "short_code": code,
    }


@router.post("/warnings/{code}/continue")
def continue_warning(code: str, request: Request, db: Session = Depends(get_db)):
    public_limit(request)
    warning_row(db, code)
    try:
        destination = URLService().resolve(db, code, acknowledged=True)
    except LinkBlockedError:
        raise HTTPException(451, "Link blocked") from None
    except LinkExpiredError:
        raise HTTPException(410, "Link expired") from None
    if destination is None:
        raise HTTPException(404, "Link not found")
    return {"redirect_url": destination}


class ReportCreate(BaseModel):
    short_code: str = Field(pattern=r"^[A-Za-z0-9_-]{1,32}$")
    category: Literal["phishing", "malware", "spam", "other"]
    captcha_token: str = Field(min_length=1, max_length=2048)


@router.post("/reports", status_code=202)
def report(payload: ReportCreate, request: Request, db: Session = Depends(get_db)):
    public_limit(request)
    verify_captcha(payload.captcha_token, "report")
    row = db.scalar(
        select(URL).where(URL.short_code == payload.short_code).with_for_update()
    )
    if not row or row.deleted_at:
        raise HTTPException(404, "Link not found")
    db.add(
        AbuseReport(
            short_code=row.short_code,
            workspace_id=row.workspace_id,
            category=payload.category,
        )
    )
    verdict = db.get(URLVerdict, payload.short_code)
    if verdict is None:
        features = analyze(row.long_url)
        db.add(
            URLVerdict(
                short_code=row.short_code,
                workspace_id=row.workspace_id,
                created_by_user_id=row.created_by_user_id,
                verdict="suspicious",
                score=features.score,
                reasons=["public_report"],
                source="heuristic",
            )
        )
    elif verdict.verdict != "malicious" and verdict.review_decision != "block":
        verdict.verdict = "suspicious"
        verdict.review_decision = None
        verdict.reasons = list(dict.fromkeys([*verdict.reasons, "public_report"]))
    db.commit()
    invalidate_cache(payload.short_code)
    return {"status": "received"}


class DomainInput(BaseModel):
    domain: str = Field(min_length=1, max_length=253)

    @field_validator("domain")
    @classmethod
    def normalize(cls, value: str) -> str:
        value = value.lower().rstrip(".").encode("idna").decode()
        if not re.fullmatch(r"[a-z0-9-]+(?:\.[a-z0-9-]+)+", value):
            raise ValueError("Provide a domain, not a URL")
        return value


@router.get("/admin/denylist")
def denylist(
    key: Principal = Depends(require_platform_admin), db: Session = Depends(get_db)
):
    return list(
        db.scalars(
            select(DeniedDomain.domain).order_by(DeniedDomain.domain).limit(1000)
        )
    )


@router.post("/admin/denylist", status_code=201)
def add_domain(
    payload: DomainInput,
    key: Principal = Depends(require_platform_admin),
    db: Session = Depends(get_db),
):
    if db.get(DeniedDomain, payload.domain) is None:
        db.add(DeniedDomain(domain=payload.domain))
        db.commit()
    return {"domain": payload.domain}


@router.delete("/admin/denylist/{domain}", status_code=204)
def remove_domain(
    domain: str,
    key: Principal = Depends(require_platform_admin),
    db: Session = Depends(get_db),
):
    row = db.get(DeniedDomain, DomainInput(domain=domain).domain)
    if row:
        db.delete(row)
        db.commit()
    return Response(status_code=204)


@router.get("/admin/reports/{code}")
def report_history(
    code: str,
    limit: int = Query(50, ge=1, le=100),
    key: Principal = Depends(require_platform_admin),
    db: Session = Depends(get_db),
):
    return [
        {"id": row.id, "category": row.category, "created_at": row.created_at}
        for row in db.scalars(
            select(AbuseReport)
            .where(AbuseReport.short_code == code)
            .order_by(AbuseReport.created_at.desc())
            .limit(limit)
        )
    ]


@router.post("/admin/links/{code}/disable", status_code=204)
def disable_link(
    code: str,
    key: Principal = Depends(require_platform_admin),
    db: Session = Depends(get_db),
):
    row = db.scalar(select(URL).where(URL.short_code == code).with_for_update())
    if not row:
        raise HTTPException(404, "Link not found")
    row.deleted_at = utcnow()
    audit(
        db, row.workspace_id, "link.disabled", key.user_id, code, row.created_by_user_id
    )
    db.commit()
    invalidate_cache(code)
    return Response(status_code=204)


@router.post("/admin/users/{user_id}/suspend", status_code=204)
def suspend(
    user_id: UUID,
    key: Principal = Depends(require_platform_admin),
    db: Session = Depends(get_db),
):
    row = db.scalar(select(User).where(User.id == str(user_id)).with_for_update())
    if not row:
        raise HTTPException(404, "User not found")
    row.suspended_at = utcnow()
    workspaces = set(
        db.scalars(select(URL.workspace_id).where(URL.created_by_user_id == row.id))
    )
    disable_user_links(db, row.id, key.user_id)
    for workspace in workspaces or {key.workspace_id}:
        audit(db, workspace, "user.suspended", key.user_id, row.id, row.id)
    db.commit()
    return Response(status_code=204)


@router.get("/workspaces/{workspace_id}/audit")
def workspace_audit(
    workspace_id: UUID,
    limit: int = Query(50, ge=1, le=100),
    key: Principal = Depends(require_permission("keys:manage")),
    db: Session = Depends(get_db),
):
    workspace_for(db, key, workspace_id)
    return [
        {
            "id": row.id,
            "action": row.action,
            "actor_id": row.actor_id,
            "target": row.target,
            "created_at": row.created_at,
        }
        for row in db.scalars(
            select(AuditLog)
            .where(AuditLog.workspace_id == key.workspace_id)
            .order_by(AuditLog.created_at.desc())
            .limit(limit)
        )
    ]


@router.get("/me/export")
def export(
    response: Response,
    key: Principal = Depends(get_principal),
    db: Session = Depends(get_db),
):
    if key.user_id is None:
        raise HTTPException(403, "Human sign-in required")
    response.headers["Cache-Control"] = "no-store"
    return export_user(db, key.user_id)

"""Database-serialized plan limits and destination policy; no remote page fetches."""

from dataclasses import dataclass
from datetime import timedelta
from urllib.parse import urlsplit

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.abuse.heuristics import analyze
from app.api.principal import Principal
from app.core.config import settings
from app.models.api_key import APIKey
from app.models.identity import User, Workspace, WorkspaceMember
from app.models.trust import AuditLog, DailyCreation, DeniedDomain
from app.models.url import URL
from app.models.url_verdict import URLVerdict
from app.services.api_keys import utcnow


@dataclass(frozen=True)
class Plan:
    daily: int
    total: int


def plans() -> dict[str, Plan]:
    return {"free": Plan(settings.FREE_DAILY_LINKS, settings.FREE_WORKSPACE_LINKS)}


def audit(
    db: Session,
    workspace: str,
    action: str,
    actor: str | None,
    target: str | None = None,
    subject: str | None = None,
) -> None:
    db.add(
        AuditLog(
            workspace_id=workspace,
            action=action,
            actor_id=actor,
            target=target,
            subject_user_id=subject,
            details={},
        )
    )


def creation_user(db: Session, principal: Principal) -> User:
    owner = principal.user_id
    if principal.api_key_id is not None:
        key = db.scalar(
            select(APIKey).where(
                APIKey.id == principal.api_key_id,
                APIKey.workspace_id == principal.workspace_id,
            )
        )
        owner = key.created_by_user_id if key else None
    user = (
        db.scalar(
            select(User)
            .where(User.id == owner)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        if owner
        else None
    )
    if user is None or user.suspended_at or user.deleted_at:
        raise HTTPException(
            403,
            detail={
                "code": "verified_owner_required",
                "message": "Creation requires an active verified user or their API key",
            },
        )
    if not user.email_verified:
        raise HTTPException(
            403,
            detail={
                "code": "email_unverified",
                "message": "Verify your email before creating links",
            },
        )
    return user


def consume_creation(db: Session, user: User, workspace_id: str) -> None:
    # Caller holds user row lock, then workspace lock. Count and INSERT commit together.
    workspace = db.scalar(
        select(Workspace).where(Workspace.id == workspace_id).with_for_update()
    )
    if workspace is None:
        raise HTTPException(404, "Workspace not found")
    membership = db.get(WorkspaceMember, (workspace_id, user.id))
    if membership is None or membership.role == "viewer":
        raise HTTPException(403, "Workspace creation permission required")
    plan = plans().get(workspace.plan, plans()["free"])
    today = utcnow().date()
    usage = db.get(DailyCreation, (user.id, today))
    if usage and usage.count >= plan.daily:
        raise HTTPException(
            429,
            detail={
                "code": "daily_creation_limit",
                "message": "Daily link creation limit reached",
                "limit": plan.daily,
            },
            headers={
                "Retry-After": str(
                    int(
                        (
                            (
                                utcnow().replace(
                                    hour=0, minute=0, second=0, microsecond=0
                                )
                                + timedelta(days=1)
                            )
                            - utcnow()
                        ).total_seconds()
                    )
                    + 1
                )
            },
        )
    total = (
        db.scalar(
            select(func.count())
            .select_from(URL)
            .where(URL.workspace_id == workspace_id, URL.deleted_at.is_(None))
        )
        or 0
    )
    if total >= plan.total:
        raise HTTPException(
            402,
            detail={
                "code": "workspace_link_limit",
                "message": "Workspace link cap reached; remove links to free capacity",
                "limit": plan.total,
            },
        )
    if usage is None:
        db.add(DailyCreation(user_id=user.id, day=today, count=1))
    else:
        usage.count += 1


def destination_denied(db: Session, url: str) -> bool:
    host = (urlsplit(url).hostname or "").lower().rstrip(".")
    domains = (
        set(settings.PRODUCT_HOSTS)
        | {urlsplit(settings.PUBLIC_WEB_URL).hostname or ""}
        | set(db.scalars(select(DeniedDomain.domain)))
    )
    return any(
        domain and (host == domain or host.endswith("." + domain)) for domain in domains
    )


def probation(db: Session, code: str, url: str, user: User, workspace: str) -> None:
    features = analyze(url)
    if (
        utcnow() - user.created_at < timedelta(hours=24)
        and features.score >= settings.ABUSE_GRAY_LOW
    ):
        db.add(
            URLVerdict(
                short_code=code,
                workspace_id=workspace,
                created_by_user_id=user.id,
                verdict=(
                    "malicious"
                    if features.score >= settings.ABUSE_GRAY_HIGH
                    else "suspicious"
                ),
                score=features.score,
                reasons=features.reasons,
                source="heuristic",
            )
        )

"""Account export and repeatable retention cleanup; no provider admin credentials."""

import hashlib
from datetime import timedelta

from sqlalchemy import delete, or_, select, update
from sqlalchemy.orm import Session

from app.cache.redis_client import invalidate_cache
from app.models.analytics import Analytics
from app.models.api_key import APIKey
from app.models.identity import User, Workspace, WorkspaceInvite, WorkspaceMember
from app.models.trust import AbuseReport, AuditLog, DailyCreation, DeletedIdentity
from app.models.url import URL
from app.models.url_verdict import AbuseOutbox, URLVerdict
from app.services.api_keys import utcnow


def subject_hash(subject: str) -> str:
    return hashlib.sha256(subject.encode()).hexdigest()


def export_user(db: Session, user_id: str) -> dict:
    user = db.get(User, user_id)
    urls = list(db.scalars(select(URL).where(URL.created_by_user_id == user_id)))
    return {
        "user": {
            "id": user_id,
            "email": user.email if user else None,
            "display_name": user.display_name if user else None,
            "created_at": user.created_at if user else None,
            "avatar_url": user.avatar_url if user else None,
            "email_verified": user.email_verified if user else None,
            "last_login_at": user.last_login_at if user else None,
        },
        "links": [
            {
                "short_code": row.short_code,
                "long_url": row.long_url,
                "created_at": row.created_at,
                "deleted_at": row.deleted_at,
                "expires_at": row.expires_at,
                "workspace_id": row.workspace_id,
            }
            for row in urls
        ],
        "keys": [
            {
                "id": row.id,
                "name": row.name,
                "prefix": row.prefix,
                "scopes": row.scopes,
                "revoked_at": row.revoked_at,
            }
            for row in db.scalars(
                select(APIKey).where(APIKey.created_by_user_id == user_id)
            )
        ],
        "memberships": [
            {"workspace_id": row.workspace_id, "role": row.role}
            for row in db.scalars(
                select(WorkspaceMember).where(WorkspaceMember.user_id == user_id)
            )
        ],
        "analytics": [
            {"short_code": row.short_code, "clicked_at": row.clicked_at}
            for row in db.scalars(
                select(Analytics).where(
                    Analytics.short_code.in_([row.short_code for row in urls])
                )
            )
        ],
    }


def disable_user_links(db: Session, user_id: str, actor_id: str | None = None) -> None:
    from app.services.trust import audit

    for row in db.scalars(select(URL).where(URL.created_by_user_id == user_id)):
        row.deleted_at = utcnow()
        audit(db, row.workspace_id, "link.disabled", actor_id, row.short_code, user_id)
        if row.short_code:
            invalidate_cache(row.short_code)
    for key in db.scalars(
        select(APIKey).where(
            APIKey.created_by_user_id == user_id, APIKey.revoked_at.is_(None)
        )
    ):
        audit(db, key.workspace_id, "key.revoked", actor_id, str(key.id), user_id)
    db.execute(
        update(APIKey)
        .where(APIKey.created_by_user_id == user_id)
        .values(revoked_at=utcnow())
    )


def purge_due(db: Session) -> int:
    users = list(
        db.scalars(
            select(User)
            .where(User.deleted_at <= utcnow() - timedelta(days=30))
            .with_for_update(skip_locked=True)
            .limit(100)
        )
    )
    for user in users:
        codes = list(
            db.scalars(select(URL.short_code).where(URL.created_by_user_id == user.id))
        )
        for code in codes:
            if code:
                invalidate_cache(code)
        for model in (Analytics, AbuseOutbox, URLVerdict, AbuseReport):
            db.execute(delete(model).where(model.short_code.in_(codes)))
        db.execute(delete(URL).where(URL.created_by_user_id == user.id))
        db.execute(delete(APIKey).where(APIKey.created_by_user_id == user.id))
        db.execute(delete(DailyCreation).where(DailyCreation.user_id == user.id))
        db.execute(delete(WorkspaceMember).where(WorkspaceMember.user_id == user.id))
        db.execute(
            delete(WorkspaceInvite).where(
                or_(
                    WorkspaceInvite.created_by_user_id == user.id,
                    WorkspaceInvite.email == user.email,
                )
            )
        )
        db.execute(
            update(AuditLog)
            .where(
                or_(AuditLog.actor_id == user.id, AuditLog.subject_user_id == user.id)
            )
            .values(actor_id=None, subject_user_id=None, target=None)
        )
        for workspace in db.scalars(
            select(Workspace).where(Workspace.slug == "personal-" + user.id)
        ):
            workspace.name = "Deleted workspace"
            workspace.slug = "deleted-" + workspace.id
        if db.get(DeletedIdentity, subject_hash(user.id)) is None:
            db.add(DeletedIdentity(subject_hash=subject_hash(user.id)))
        db.delete(user)
    db.execute(
        delete(DailyCreation).where(
            DailyCreation.day < (utcnow() - timedelta(days=31)).date()
        )
    )
    db.execute(
        delete(AbuseReport).where(
            AbuseReport.created_at < utcnow() - timedelta(days=90)
        )
    )
    db.execute(
        delete(AuditLog).where(AuditLog.created_at < utcnow() - timedelta(days=90))
    )
    db.commit()
    return len(users)

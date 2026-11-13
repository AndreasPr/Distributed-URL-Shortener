"""Verified identities acquire authority only through stored memberships."""

from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import NAMESPACE_URL, uuid5

from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.orm import Session

from app.api.principal import Principal
from app.core.config import settings
from app.models.identity import DEFAULT_WORKSPACE_ID, User, Workspace, WorkspaceMember
from app.services.email_verification import confirmed_email
from app.services.jwt_auth import InvalidToken

DEMO_USERS = {
    "owner": "00000000-0000-0000-0000-000000000010",
    "viewer": "00000000-0000-0000-0000-000000000011",
}


def insert_once(db: Session, model: Any, values: dict[str, Any]) -> bool:
    insert = pg_insert if db.get_bind().dialect.name == "postgresql" else sqlite_insert
    return (
        db.execute(
            insert(model).values(**values).on_conflict_do_nothing().returning(model.id)
        ).scalar_one_or_none()
        is not None
    )


def user_principal(
    db: Session,
    claims: dict[str, Any],
    workspace: str | None = None,
    *,
    token: str | None = None,
) -> Principal:
    if claims.get("is_anonymous") is True:
        raise InvalidToken("anonymous_session")
    subject = claims["sub"]
    from app.models.trust import DeletedIdentity
    from app.services.data_rights import subject_hash

    if db.get(DeletedIdentity, subject_hash(subject)) is not None:
        raise InvalidToken("disabled_user")
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    created = insert_once(
        db,
        User,
        {
            "id": subject,
            "email": str(claims.get("email", ""))[:320],
            # Email verification is not inferred from mutable user_metadata.
            "email_verified": False,
        },
    )
    user = db.scalar(select(User).where(User.id == subject).with_for_update())
    if user is None or user.suspended_at is not None or user.deleted_at is not None:
        db.rollback()
        raise InvalidToken("disabled_user")
    personal_id = str(uuid5(NAMESPACE_URL, "relaymark:personal:" + subject))
    if created:
        db.add(
            Workspace(
                id=personal_id, name="Personal workspace", slug="personal-" + subject
            )
        )
        db.flush()
        db.add(WorkspaceMember(workspace_id=personal_id, user_id=subject, role="owner"))
        db.flush()
    user.last_login_at = now
    refresh_email = (
        settings.AUTH_MODE == "supabase"
        and token is not None
        and (
            user.email_verification_checked_at is None
            or now - user.email_verification_checked_at >= timedelta(hours=1)
        )
    )
    if refresh_email:
        # Persist the attempt before network I/O, across replicas and failures.
        # The user/workspace provisioning above remains one atomic transaction.
        user.email_verification_checked_at = now
    db.commit()
    if refresh_email:
        result = confirmed_email(subject, str(token))
        if result is not None:
            user.email, user.email_verified = result
            db.commit()
    db.refresh(user)
    if user.suspended_at is not None or user.deleted_at is not None:
        raise InvalidToken("disabled_user")
    query = select(WorkspaceMember).where(WorkspaceMember.user_id == subject)
    if workspace:
        query = query.where(WorkspaceMember.workspace_id == workspace)
    else:
        # Prefer the personal workspace; deterministic fallback for demo/shared users.
        query = query.order_by(
            (WorkspaceMember.workspace_id == personal_id).desc(),
            WorkspaceMember.workspace_id,
        )
    membership = db.scalar(query.limit(1))
    if membership is None:
        db.rollback()
        raise InvalidToken("workspace_membership")
    principal = Principal(
        user_id=subject,
        workspace_id=membership.workspace_id,
        role=membership.role,
        scopes=frozenset(),
        auth_method="user",
        email_verified=user.email_verified,
        platform_admin=user.email_verified
        and user.email.lower() in settings.PLATFORM_ADMIN_EMAILS,
    )
    db.commit()
    return principal


def seed_demo_users(db: Session) -> None:
    # The demo's seeded links and API keys already belong to this workspace.
    insert_once(
        db,
        Workspace,
        {"id": DEFAULT_WORKSPACE_ID, "name": "Legacy workspace", "slug": "legacy"},
    )
    for role, subject in DEMO_USERS.items():
        if insert_once(
            db,
            User,
            {"id": subject, "email": f"{role}@example.test", "email_verified": True},
        ):
            db.add(
                WorkspaceMember(
                    workspace_id=DEFAULT_WORKSPACE_ID, user_id=subject, role=role
                )
            )
        db.execute(update(User).where(User.id == subject).values(email_verified=True))
    db.commit()

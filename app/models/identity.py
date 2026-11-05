"""Identity and workspace records. Identity-provider subjects are never credentials."""

from datetime import datetime
from typing import Literal
from uuid import uuid4

from sqlalchemy import (
    TIMESTAMP,
    Boolean,
    CheckConstraint,
    ForeignKey,
    String,
    Uuid,
    false,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base

DEFAULT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000001"
ROLES_SQL = "role IN ('owner', 'admin', 'member', 'viewer')"


def new_id() -> str:
    return str(uuid4())


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, server_default=false())
    email_verification_checked_at: Mapped[datetime | None] = mapped_column(TIMESTAMP)
    email: Mapped[str] = mapped_column(String(320))
    display_name: Mapped[str | None] = mapped_column(String(200))
    avatar_url: Mapped[str | None] = mapped_column(String(2048))
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())
    last_login_at: Mapped[datetime | None] = mapped_column(TIMESTAMP)
    suspended_at: Mapped[datetime | None] = mapped_column(TIMESTAMP)
    deleted_at: Mapped[datetime | None] = mapped_column(TIMESTAMP)


class Workspace(Base):
    __tablename__ = "workspaces"
    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=new_id
    )
    name: Mapped[str] = mapped_column(String(100))
    slug: Mapped[str] = mapped_column(String(100), unique=True)
    plan: Mapped[str] = mapped_column(String(32), server_default="free")
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())


class WorkspaceMember(Base):
    __tablename__ = "workspace_members"
    __table_args__ = (CheckConstraint(ROLES_SQL, name="ck_workspace_member_role"),)
    workspace_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    role: Mapped[Literal["owner", "admin", "member", "viewer"]] = mapped_column(
        String(16)
    )
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())


class WorkspaceInvite(Base):
    __tablename__ = "workspace_invites"
    __table_args__ = (CheckConstraint(ROLES_SQL, name="ck_workspace_invite_role"),)
    workspace_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        primary_key=True,
    )
    email: Mapped[str] = mapped_column(String(320), primary_key=True)
    role: Mapped[Literal["owner", "admin", "member", "viewer"]] = mapped_column(
        String(16)
    )
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())
    created_by_user_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("users.id")
    )

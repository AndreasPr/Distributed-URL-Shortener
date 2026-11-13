"""Trust-control records. Reports intentionally contain no free text or IPs."""

from datetime import date, datetime

from sqlalchemy import JSON, TIMESTAMP, Date, ForeignKey, Integer, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.identity import new_id
from app.models.tenant import TenantRecord


class DailyCreation(Base):
    __tablename__ = "daily_creations"
    user_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    day: Mapped[date] = mapped_column(Date, primary_key=True)
    count: Mapped[int] = mapped_column(Integer, nullable=False)


class DeniedDomain(Base):
    __tablename__ = "denied_domains"
    domain: Mapped[str] = mapped_column(String(253), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())


class AbuseReport(TenantRecord, Base):
    __tablename__ = "abuse_reports"
    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=new_id
    )
    short_code: Mapped[str] = mapped_column(
        String(32), ForeignKey("urls.short_code", ondelete="CASCADE")
    )
    category: Mapped[str] = mapped_column(String(32))
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_log"
    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=new_id
    )
    workspace_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("workspaces.id", ondelete="CASCADE")
    )
    actor_id: Mapped[str | None] = mapped_column(String(64))
    subject_user_id: Mapped[str | None] = mapped_column(Uuid(as_uuid=False))
    action: Mapped[str] = mapped_column(String(64))
    target: Mapped[str | None] = mapped_column(String(100))
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())


class DeletedIdentity(Base):
    __tablename__ = "deleted_identities"
    subject_hash: Mapped[str] = mapped_column(String(64), primary_key=True)

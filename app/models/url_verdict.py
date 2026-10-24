from datetime import datetime

from sqlalchemy import JSON, TIMESTAMP, CheckConstraint, Float, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.url import Base


class URLVerdict(Base):
    __tablename__ = "url_verdicts"
    __table_args__ = (
        CheckConstraint(
            "verdict IN ('clean', 'suspicious', 'malicious')", name="ck_verdict"
        ),
        CheckConstraint("score >= 0 AND score <= 1", name="ck_verdict_score"),
        CheckConstraint(
            "source IN ('heuristic', 'llm', 'combined')", name="ck_verdict_source"
        ),
        CheckConstraint(
            "review_decision IS NULL OR review_decision IN ('allow', 'block')",
            name="ck_review_decision",
        ),
    )
    short_code: Mapped[str] = mapped_column(
        String(32), ForeignKey("urls.short_code", ondelete="CASCADE"), primary_key=True
    )
    verdict: Mapped[str] = mapped_column(String(16), nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    reasons: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    source: Mapped[str] = mapped_column(String(16), nullable=False)
    model: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP, server_default=func.now(), nullable=False
    )
    reviewed_by: Mapped[str | None] = mapped_column(String, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(TIMESTAMP, nullable=True)
    review_decision: Mapped[str | None] = mapped_column(String(8), nullable=True)


class AbuseOutbox(Base):
    __tablename__ = "abuse_outbox"
    short_code: Mapped[str] = mapped_column(
        String(32), ForeignKey("urls.short_code", ondelete="CASCADE"), primary_key=True
    )
    event_id: Mapped[str] = mapped_column(String(36), nullable=False, unique=True)
    trace_context: Mapped[dict[str, str]] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP, server_default=func.now(), nullable=False
    )

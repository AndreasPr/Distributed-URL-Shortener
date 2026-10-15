from datetime import datetime

from sqlalchemy import TIMESTAMP, ForeignKey, Index, Integer, String, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.url import Base


class Analytics(Base):
    __tablename__ = "analytics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    short_code: Mapped[str] = mapped_column(
        String(10),
        ForeignKey(
            "urls.short_code", name="fk_analytics_short_code", ondelete="CASCADE"
        ),
        nullable=False,
    )
    clicked_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP, server_default=func.now(), nullable=True
    )

    event_id: Mapped[str | None] = mapped_column(String, nullable=True)

    __table_args__ = (
        Index("idx_analytics_short_code_clicked_at", short_code, clicked_at.desc()),
        Index(
            "uq_analytics_event_id",
            event_id,
            unique=True,
            postgresql_where=text("event_id IS NOT NULL"),
            sqlite_where=text("event_id IS NOT NULL"),
        ),
    )

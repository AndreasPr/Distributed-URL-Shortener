from datetime import datetime

from sqlalchemy import TIMESTAMP, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.url import Base


class Analytics(Base):
    __tablename__ = "analytics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    short_code: Mapped[str | None] = mapped_column(
        String(10), index=True, nullable=True
    )
    clicked_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP, server_default=func.now(), nullable=True
    )

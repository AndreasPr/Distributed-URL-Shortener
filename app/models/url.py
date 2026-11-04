from datetime import datetime

from sqlalchemy import TIMESTAMP, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.tenant import TenantRecord


class URL(TenantRecord, Base):
    __tablename__ = "urls"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    short_code: Mapped[str | None] = mapped_column(
        String(32), unique=True, nullable=True
    )
    long_url: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP, server_default=func.now(), nullable=True
    )

    expires_at: Mapped[datetime | None] = mapped_column(TIMESTAMP, nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(TIMESTAMP, nullable=True)
    created_by: Mapped[str | None] = mapped_column(String, nullable=True)

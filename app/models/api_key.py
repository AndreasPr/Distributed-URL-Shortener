from datetime import datetime

from sqlalchemy import JSON, TIMESTAMP, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.url import Base


class APIKey(Base):
    __tablename__ = "api_keys"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    key_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    prefix: Mapped[str] = mapped_column(String(8), nullable=False)
    scopes: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP, server_default=func.now(), nullable=False
    )
    revoked_at: Mapped[datetime | None] = mapped_column(TIMESTAMP, nullable=True)
    last_used_at: Mapped[datetime | None] = mapped_column(TIMESTAMP, nullable=True)

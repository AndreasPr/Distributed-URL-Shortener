from sqlalchemy import TIMESTAMP, Column, Integer, String, func

from app.models.url import Base


class Analytics(Base):
    __tablename__ = "analytics"

    id = Column(Integer, primary_key=True, index=True)
    short_code = Column(String(10), index=True)
    clicked_at = Column(TIMESTAMP, server_default=func.now())

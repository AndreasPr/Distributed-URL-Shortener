from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, func
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class URL(Base):
    __tablename__ = "urls"
    
    id = Column(Integer, primary_key==True, index=True)
    short_code = Column(String(10), unique=True, index=True)
    long_url = Column(Text, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    
from sqlalchemy import Column, String, Integer, Float, DateTime, Uuid, Boolean
from datetime import datetime, timezone
import uuid
from app.db.base_class import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String, nullable=False)
    security_question = Column(String, nullable=True)
    security_answer_hash = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    
class ThreatLog(Base):
    __tablename__ = "threat_log"
    
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    src_ip = Column(String, index=True)
    dst_ip = Column(String, index=True)
    protocol = Column(String)
    label = Column(String)
    confidence = Column(Float)
    is_blocked = Column(Boolean, default=False)

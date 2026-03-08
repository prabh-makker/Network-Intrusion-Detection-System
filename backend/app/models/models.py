from sqlalchemy import Column, String, Integer, Float, DateTime, Uuid, Boolean
from datetime import datetime
import uuid
from app.db.base_class import Base

class ThreatLog(Base):
    __tablename__ = "threat_log"
    
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    timestamp = Column(DateTime, default=datetime.utcnow)
    src_ip = Column(String, index=True)
    dst_ip = Column(String, index=True)
    protocol = Column(String)
    label = Column(String)
    confidence = Column(Float)
    is_blocked = Column(Boolean, default=False)

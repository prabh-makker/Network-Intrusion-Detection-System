from sqlalchemy import Column, String, Integer, Float, DateTime, Uuid, Boolean, JSON, Text
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
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    src_ip = Column(String, index=True)
    dst_ip = Column(String, index=True)
    protocol = Column(String)

    # ──── PREDICTION DATA ────
    label = Column(String, index=True)  # Model prediction
    confidence = Column(Float)
    model_used = Column(String, default="nids_xgb_mega_2000_2026")  # Which model made prediction
    is_blocked = Column(Boolean, default=False)

    # ──── ML TRAINING DATA (NEW) ────
    # 12-feature vector (NSL-KDD format)
    duration = Column(Float, nullable=True)
    protocol_type = Column(String, nullable=True)
    service = Column(String, nullable=True)
    flag = Column(String, nullable=True)
    src_bytes = Column(Float, nullable=True)
    dst_bytes = Column(Float, nullable=True)
    count = Column(Float, nullable=True)
    srv_count = Column(Float, nullable=True)
    serror_rate = Column(Float, nullable=True)
    rerror_rate = Column(Float, nullable=True)
    same_srv_rate = Column(Float, nullable=True)
    diff_srv_rate = Column(Float, nullable=True)

    # Feature vector as JSON (backup/search)
    feature_vector = Column(JSON, nullable=True)

    # ──── GROUND TRUTH (for retraining) ────
    actual_label = Column(String, nullable=True)  # Manual correction by analyst
    label_corrected_at = Column(DateTime, nullable=True)  # When analyst corrected it
    corrected_by = Column(String, nullable=True)  # Which user corrected it
    is_prediction_correct = Column(Boolean, nullable=True)  # Did prediction match actual?
    correction_notes = Column(Text, nullable=True)  # Why analyst changed it

from sqlalchemy import Column, String, Integer, Float, DateTime, Uuid, Boolean, JSON, Text, Enum, ForeignKey, Index
from datetime import datetime, timezone
import uuid
from enum import Enum as PyEnum
from app.db.base_class import Base


class RemediationStatusEnum(PyEnum):
    """Status of threat remediation."""
    pending = "pending"
    in_progress = "in_progress"
    resolved = "resolved"

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
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

    # ──── ANALYTICS & REMEDIATION (NEW) ────
    geo_country = Column(String, index=True, nullable=True)  # GeoIP country code (e.g., "US", "CN")
    severity_score = Column(Float, default=0.0)  # CVSS-style score 0-10
    time_to_block = Column(Integer, nullable=True)  # Milliseconds from detection to blocking
    analyst_review_at = Column(DateTime, nullable=True)  # When analyst first reviewed threat
    resolved_at = Column(DateTime, nullable=True)  # When threat was fully resolved
    remediation_status = Column(Enum(RemediationStatusEnum), index=True, default=RemediationStatusEnum.pending)
    mute_until = Column(DateTime, nullable=True)  # Suppress alerts until this timestamp
    threat_notes = Column(Text, nullable=True)  # Analyst comments and observations
    compliance_labels = Column(JSON, nullable=True)  # ["PCI-DSS", "HIPAA", "SOC2", ...]
    threat_intel_source = Column(String, nullable=True)  # External threat intelligence reference


class RetrainingHistory(Base):
    """Track model retraining events and performance improvements."""
    __tablename__ = "retraining_history"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # ──── RETRAINING EVENT ────
    triggered_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    triggered_by = Column(String, nullable=True)  # Username who triggered it

    # ──── BEFORE RETRAIN ────
    accuracy_before = Column(Float, nullable=True)  # Model accuracy before retrain
    model_version_before = Column(String, nullable=True)  # e.g., "nids_xgb_mega_2000_2026"

    # ──── RETRAINING PROCESS ────
    corrections_used = Column(Integer, default=0)  # How many corrections were used
    training_samples = Column(Integer, default=0)  # Total training samples used

    # ──── AFTER RETRAIN ────
    completed_at = Column(DateTime, nullable=True)  # When retrain finished
    success = Column(Boolean, default=False)  # Did retrain complete successfully?
    accuracy_after = Column(Float, nullable=True)  # Model accuracy after retrain
    model_version_after = Column(String, nullable=True)  # New model version
    improvement = Column(Float, nullable=True)  # Accuracy improvement percentage

    # ──── METADATA ────
    status = Column(String, default="pending")  # pending, training, completed, failed
    error_message = Column(Text, nullable=True)  # If failed, why?
    training_duration_seconds = Column(Integer, nullable=True)  # How long training took


class ThreatTimeline(Base):
    """Pre-computed hourly/daily threat aggregates for fast analytics queries."""
    __tablename__ = "threat_timeline"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # ──── TIME BUCKET ────
    bucket_start = Column(DateTime, index=True, nullable=False)  # Start of aggregation period
    bucket_end = Column(DateTime, nullable=False)  # End of aggregation period
    bucket_size_minutes = Column(Integer, nullable=False)  # 60, 1440, etc.

    # ──── THREAT COUNTS ────
    total_threats = Column(Integer, default=0)  # Total threats in bucket
    active_threats = Column(Integer, default=0)  # Unresolved threats
    blocked_count = Column(Integer, default=0)  # Threats that were blocked

    # ──── BY THREAT TYPE ────
    dos_count = Column(Integer, default=0)
    ddos_count = Column(Integer, default=0)
    u2r_count = Column(Integer, default=0)
    r2l_count = Column(Integer, default=0)
    probe_count = Column(Integer, default=0)
    normal_count = Column(Integer, default=0)

    # ──── BY SEVERITY ────
    critical_count = Column(Integer, default=0)  # Score 9-10
    high_count = Column(Integer, default=0)  # Score 7-8.9
    medium_count = Column(Integer, default=0)  # Score 4-6.9
    low_count = Column(Integer, default=0)  # Score 0-3.9

    # ──── BY GEOGRAPHY ────
    top_source_country = Column(String, nullable=True)  # Most common source country
    unique_source_countries = Column(Integer, default=0)  # Distinct source countries
    unique_sources = Column(Integer, default=0)  # Distinct source IPs
    unique_targets = Column(Integer, default=0)  # Distinct destination IPs

    # ──── PERFORMANCE ────
    avg_time_to_block_ms = Column(Float, nullable=True)  # Average response time
    avg_severity_score = Column(Float, default=0.0)  # Average CVSS score

    # ──── METADATA ────
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class RemediationTask(Base):
    """Links threats to remediation actions and tracks their status."""
    __tablename__ = "remediation_task"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # ──── RELATIONSHIP ────
    threat_id = Column(Uuid(as_uuid=True), ForeignKey("threat_log.id"), index=True, nullable=False)

    # ──── TASK DETAILS ────
    action_type = Column(String, nullable=False)  # block, isolate, patch, config_change, investigate
    status = Column(Enum(RemediationStatusEnum), index=True, default=RemediationStatusEnum.pending)

    # ──── ASSIGNMENT ────
    assigned_to = Column(String, nullable=True)  # Username of responsible analyst
    due_date = Column(DateTime, nullable=True)  # When task should be completed

    # ──── TIMELINE ────
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    # ──── DETAILS ────
    description = Column(Text, nullable=True)  # Task description and scope
    notes = Column(Text, nullable=True)  # Implementation notes and findings

    # ──── VERIFICATION ────
    verification_method = Column(String, nullable=True)  # How to verify task is complete
    verified_by = Column(String, nullable=True)  # Who verified completion


class ComplianceMapping(Base):
    """Maps threat types and patterns to compliance framework requirements."""
    __tablename__ = "compliance_mapping"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # ──── THREAT CLASSIFICATION ────
    threat_type = Column(String, index=True, nullable=False)  # DoS, DDoS, U2R, R2L, Probe
    threat_pattern = Column(String, nullable=True)  # More specific pattern (e.g., "SQL injection")

    # ──── COMPLIANCE FRAMEWORK ────
    compliance_framework = Column(String, index=True, nullable=False)  # PCI-DSS, HIPAA, SOC2, NIST, etc.
    requirement_id = Column(String, nullable=True)  # e.g., "PCI-DSS-6.6" for web app testing

    # ──── MAPPING DETAILS ────
    requirement_text = Column(Text, nullable=True)  # Full text of the requirement
    control_objective = Column(String, nullable=True)  # What the control is trying to achieve

    # ──── REMEDIATION GUIDANCE ────
    recommended_action = Column(Text, nullable=True)  # How to remediate
    urgency_level = Column(String, default="medium")  # critical, high, medium, low

    # ──── REFERENCES ────
    documentation_url = Column(String, nullable=True)  # Link to compliance docs
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

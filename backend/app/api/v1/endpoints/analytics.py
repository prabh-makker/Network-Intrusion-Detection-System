from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc, Integer
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from app.db.session import get_db
from app.models.models import ThreatLog, ThreatTimeline, RemediationTask, ComplianceMapping
from app.api import deps
import json

router = APIRouter()

# Threat type severity multipliers (CVSS-style)
SEVERITY_MULTIPLIERS = {
    "U2R": 9.5,
    "DDoS": 8.5,
    "DoS": 7.5,
    "R2L": 7.0,
    "Probe": 4.0,
    "Normal": 0.0,
}

# Label → severity score fallback when severity_score column is null/0
LABEL_SEVERITY = {
    "U2R (Root Access)": 9.5,
    "U2R": 9.5,
    "DDoS (Ping of Death)": 8.5,
    "DDoS": 8.5,
    "DoS": 7.5,
    "R2L (Unauthorized Access)": 7.0,
    "R2L": 7.0,
    "Probe": 4.5,
}


@router.get("/trends")
async def get_threat_trends(
    db: Session = Depends(get_db),
    time_range: str = Query(default="24h", pattern="^(1h|6h|24h|7d|30d)$"),
    bucket_interval: str = Query(default="auto", pattern="^(auto|5min|30min|hour|day)$"),
    current_user=Depends(deps.get_current_active_user),
):
    """
    Get historical threat trends with time-series data.

    Args:
        time_range: Time window (1h, 6h, 24h, 7d, 30d)
        bucket_interval: Aggregation interval (auto, 5min, 30min, hour, day)

    Returns:
        List of time-series data points with threat counts and metrics
    """
    # Calculate time window
    now = datetime.utcnow()
    if time_range == "1h":
        start_time = now - timedelta(hours=1)
        if bucket_interval == "auto":
            bucket_interval = "5min"
    elif time_range == "6h":
        start_time = now - timedelta(hours=6)
        if bucket_interval == "auto":
            bucket_interval = "30min"
    elif time_range == "24h":
        start_time = now - timedelta(hours=24)
        if bucket_interval == "auto":
            bucket_interval = "hour"
    elif time_range == "7d":
        start_time = now - timedelta(days=7)
        if bucket_interval == "auto":
            bucket_interval = "hour"
    else:  # 30d
        start_time = now - timedelta(days=30)
        if bucket_interval == "auto":
            bucket_interval = "day"

    # Calculate bucket size in minutes
    bucket_minutes = {
        "5min": 5,
        "30min": 30,
        "hour": 60,
        "day": 1440,
    }[bucket_interval]

    # Try to get pre-computed ThreatTimeline data if available
    timeline_data = db.query(ThreatTimeline).filter(
        ThreatTimeline.bucket_start >= start_time,
        ThreatTimeline.bucket_size_minutes == bucket_minutes
    ).order_by(ThreatTimeline.bucket_start).all()

    if timeline_data:
        # Use pre-computed data
        return [
            {
                "timestamp": t.bucket_start.isoformat(),
                "total_threats": t.total_threats,
                "active_threats": t.active_threats,
                "blocked_count": t.blocked_count,
                "dos_count": t.dos_count,
                "ddos_count": t.ddos_count,
                "u2r_count": t.u2r_count,
                "r2l_count": t.r2l_count,
                "probe_count": t.probe_count,
                "critical_count": t.critical_count,
                "high_count": t.high_count,
                "medium_count": t.medium_count,
                "low_count": t.low_count,
                "avg_severity_score": t.avg_severity_score or 0.0,
                "avg_time_to_block_ms": t.avg_time_to_block_ms,
            }
            for t in timeline_data
        ]

    # Fallback: compute from raw ThreatLog data
    threats = db.query(ThreatLog).filter(
        ThreatLog.timestamp >= start_time,
        ThreatLog.timestamp <= now
    ).all()

    if not threats:
        return []

    # Group threats into buckets
    buckets: Dict[datetime, Dict[str, Any]] = {}
    for threat in threats:
        # Round timestamp to bucket boundary (strip tzinfo so all keys are naive)
        ts = threat.timestamp.replace(tzinfo=None) if threat.timestamp.tzinfo else threat.timestamp
        bucket_timestamp = ts.replace(
            minute=0 if bucket_minutes >= 60 else (ts.minute // bucket_minutes) * bucket_minutes,
            second=0,
            microsecond=0
        )
        if bucket_minutes >= 1440:  # Day buckets
            bucket_timestamp = bucket_timestamp.replace(hour=0)

        if bucket_timestamp not in buckets:
            buckets[bucket_timestamp] = {
                "timestamp": bucket_timestamp.isoformat(),
                "total_threats": 0,
                "active_threats": 0,
                "blocked_count": 0,
                "dos_count": 0,
                "ddos_count": 0,
                "u2r_count": 0,
                "r2l_count": 0,
                "probe_count": 0,
                "critical_count": 0,
                "high_count": 0,
                "medium_count": 0,
                "low_count": 0,
                "total_severity_score": 0.0,
                "total_time_to_block": 0,
                "block_count_for_avg": 0,
            }

        bucket = buckets[bucket_timestamp]
        bucket["total_threats"] += 1

        # Count by status
        if threat.remediation_status == "resolved" or threat.resolved_at:
            pass
        else:
            bucket["active_threats"] += 1

        if threat.is_blocked:
            bucket["blocked_count"] += 1

        # Count by threat type
        if threat.label == "DoS":
            bucket["dos_count"] += 1
        elif threat.label == "DDoS":
            bucket["ddos_count"] += 1
        elif threat.label == "U2R":
            bucket["u2r_count"] += 1
        elif threat.label == "R2L":
            bucket["r2l_count"] += 1
        elif threat.label == "Probe":
            bucket["probe_count"] += 1

        # Count by severity — fall back to label-based score when field is null/0
        severity = threat.severity_score if (threat.severity_score and threat.severity_score > 0) else LABEL_SEVERITY.get(threat.label, 4.5)
        if severity >= 9:
            bucket["critical_count"] += 1
        elif severity >= 7:
            bucket["high_count"] += 1
        elif severity >= 4:
            bucket["medium_count"] += 1
        else:
            bucket["low_count"] += 1

        bucket["total_severity_score"] += severity

        if threat.time_to_block is not None:
            bucket["total_time_to_block"] += threat.time_to_block
            bucket["block_count_for_avg"] += 1

    # Convert buckets to list format with averages
    result = []
    for timestamp in sorted(buckets.keys()):
        bucket = buckets[timestamp]
        avg_severity = bucket["total_severity_score"] / bucket["total_threats"] if bucket["total_threats"] > 0 else 0
        avg_time_to_block = bucket["total_time_to_block"] / bucket["block_count_for_avg"] if bucket["block_count_for_avg"] > 0 else None

        result.append({
            "timestamp": bucket["timestamp"],
            "total_threats": bucket["total_threats"],
            "active_threats": bucket["active_threats"],
            "blocked_count": bucket["blocked_count"],
            "dos_count": bucket["dos_count"],
            "ddos_count": bucket["ddos_count"],
            "u2r_count": bucket["u2r_count"],
            "r2l_count": bucket["r2l_count"],
            "probe_count": bucket["probe_count"],
            "critical_count": bucket["critical_count"],
            "high_count": bucket["high_count"],
            "medium_count": bucket["medium_count"],
            "low_count": bucket["low_count"],
            "avg_severity_score": avg_severity,
            "avg_time_to_block_ms": avg_time_to_block,
        })

    return result


@router.get("/geo")
async def get_geographic_intelligence(
    db: Session = Depends(get_db),
    time_range: str = Query(default="24h", pattern="^(1h|6h|24h|7d|30d)$"),
    limit: int = Query(default=20, le=100),
    current_user=Depends(deps.get_current_active_user),
):
    """
    Get geographic threat intelligence by source country.

    Args:
        time_range: Time window (1h, 6h, 24h, 7d, 30d)
        limit: Maximum number of countries to return

    Returns:
        List of countries with threat counts and statistics
    """
    # Calculate time window
    now = datetime.utcnow()
    if time_range == "1h":
        start_time = now - timedelta(hours=1)
    elif time_range == "6h":
        start_time = now - timedelta(hours=6)
    elif time_range == "24h":
        start_time = now - timedelta(hours=24)
    elif time_range == "7d":
        start_time = now - timedelta(days=7)
    else:  # 30d
        start_time = now - timedelta(days=30)

    # Query threats grouped by country
    country_stats = db.query(
        ThreatLog.geo_country,
        func.count(ThreatLog.id).label("threat_count"),
        func.sum(func.cast(ThreatLog.is_blocked, type_=Integer)).label("blocked_count"),
        func.avg(ThreatLog.severity_score).label("avg_severity"),
        func.max(ThreatLog.severity_score).label("max_severity"),
    ).filter(
        ThreatLog.timestamp >= start_time,
        ThreatLog.geo_country.isnot(None)
    ).group_by(ThreatLog.geo_country).order_by(
        desc(func.count(ThreatLog.id))
    ).limit(limit).all()

    # Get top threat types per country
    result = []
    for country, count, blocked, avg_sev, max_sev in country_stats:
        threat_types = db.query(
            ThreatLog.label,
            func.count(ThreatLog.id).label("type_count")
        ).filter(
            ThreatLog.timestamp >= start_time,
            ThreatLog.geo_country == country
        ).group_by(ThreatLog.label).order_by(
            desc(func.count(ThreatLog.id))
        ).limit(3).all()

        result.append({
            "country_code": country,
            "threat_count": count,
            "blocked_count": blocked or 0,
            "avg_severity": float(avg_sev) if avg_sev else 0.0,
            "max_severity": float(max_sev) if max_sev else 0.0,
            "top_threat_types": [
                {"label": label, "count": type_count}
                for label, type_count in threat_types
            ]
        })

    return result


@router.get("/threats/{threat_id}/severity")
async def get_threat_severity(
    threat_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_active_user),
):
    """
    Calculate CVSS-style severity score for a threat.

    Args:
        threat_id: UUID of the threat

    Returns:
        Severity score (0-10), breakdown, and recommendations
    """
    threat = db.query(ThreatLog).filter(ThreatLog.id == threat_id).first()
    if not threat:
        raise HTTPException(status_code=404, detail="Threat not found")

    # Base score from threat type
    base_score = SEVERITY_MULTIPLIERS.get(threat.label, 5.0)

    # Adjust by time-to-block (faster blocking = lower severity)
    time_to_block_adjustment = 0.0
    if threat.time_to_block:
        # Reward fast blocking (0-500ms = -0.5, >5000ms = +1.0)
        if threat.time_to_block < 500:
            time_to_block_adjustment = -0.5
        elif threat.time_to_block > 5000:
            time_to_block_adjustment = 0.5
        else:
            time_to_block_adjustment = (threat.time_to_block - 500) / 9000  # Linear scaling

    # Adjust by network impact (multiple targets increase severity)
    impact_adjustment = 0.0
    if threat.dst_ip and threat.is_blocked == False:
        # Check if this is a widespread threat
        other_threats_same_src = db.query(ThreatLog).filter(
            ThreatLog.src_ip == threat.src_ip,
            ThreatLog.timestamp > threat.timestamp - timedelta(hours=1)
        ).count()
        if other_threats_same_src > 5:
            impact_adjustment = 0.5

    # Adjust by analyst feedback
    analyst_adjustment = 0.0
    if threat.is_prediction_correct == False:
        # Analyst said we were wrong - might be worse than detected
        analyst_adjustment = 0.5
    elif threat.is_prediction_correct == True:
        # Analyst confirmed - we were right
        analyst_adjustment = -0.2

    # Calculate final score
    final_score = min(10.0, max(0.0, base_score + time_to_block_adjustment + impact_adjustment + analyst_adjustment))

    # Determine urgency level
    if final_score >= 9:
        urgency = "CRITICAL"
        remediation_hours = 1
    elif final_score >= 7:
        urgency = "HIGH"
        remediation_hours = 4
    elif final_score >= 4:
        urgency = "MEDIUM"
        remediation_hours = 24
    else:
        urgency = "LOW"
        remediation_hours = 72

    return {
        "threat_id": threat_id,
        "severity_score": round(final_score, 2),
        "urgency_level": urgency,
        "estimated_remediation_hours": remediation_hours,
        "breakdown": {
            "base_score_from_type": round(base_score, 2),
            "time_to_block_adjustment": round(time_to_block_adjustment, 2),
            "network_impact_adjustment": round(impact_adjustment, 2),
            "analyst_feedback_adjustment": round(analyst_adjustment, 2),
        },
        "threat_details": {
            "type": threat.label,
            "src_ip": threat.src_ip,
            "dst_ip": threat.dst_ip,
            "is_blocked": threat.is_blocked,
            "time_to_block_ms": threat.time_to_block,
            "confidence": threat.confidence,
        },
        "recommendations": [
            {
                "priority": "IMMEDIATE" if urgency in ["CRITICAL", "HIGH"] else "DEFER",
                "action": "Block source IP and all traffic from this subnet",
            },
            {
                "priority": "HIGH" if urgency in ["CRITICAL", "HIGH"] else "MEDIUM",
                "action": "Review logs for other activity from this source",
            },
            {
                "priority": "MEDIUM",
                "action": "Check if threat signature indicates new attack pattern",
            },
        ]
    }


@router.get("/compliance")
async def get_compliance_status(
    db: Session = Depends(get_db),
    time_range: str = Query(default="24h", pattern="^(1h|6h|24h|7d|30d)$"),
    framework: Optional[str] = Query(default=None),
    current_user=Depends(deps.get_current_active_user),
):
    """
    Get threats mapped to compliance framework requirements.

    Args:
        time_range: Time window (1h, 6h, 24h, 7d, 30d)
        framework: Filter by specific framework (PCI-DSS, HIPAA, SOC2, NIST, etc.)

    Returns:
        Compliance status with threats mapped to requirements and gaps
    """
    # Calculate time window
    now = datetime.utcnow()
    if time_range == "1h":
        start_time = now - timedelta(hours=1)
    elif time_range == "6h":
        start_time = now - timedelta(hours=6)
    elif time_range == "24h":
        start_time = now - timedelta(hours=24)
    elif time_range == "7d":
        start_time = now - timedelta(days=7)
    else:  # 30d
        start_time = now - timedelta(days=30)

    # Get all compliance mappings
    mappings_query = db.query(ComplianceMapping)
    if framework:
        mappings_query = mappings_query.filter(ComplianceMapping.compliance_framework == framework)
    mappings = mappings_query.all()

    # Get threats in time range
    threats = db.query(ThreatLog).filter(
        ThreatLog.timestamp >= start_time
    ).all()

    # Map threats to compliance requirements
    framework_status = {}
    for mapping in mappings:
        fw = mapping.compliance_framework
        if fw not in framework_status:
            framework_status[fw] = {
                "framework": fw,
                "total_requirements": 0,
                "violated_requirements": 0,
                "violations": [],
                "compliant_threats": 0,
                "risk_score": 0.0,
            }

        framework_status[fw]["total_requirements"] += 1

        # Check if any threats match this compliance requirement
        matching_threats = [t for t in threats if t.label == mapping.threat_type]
        if matching_threats and not all(t.is_blocked or t.remediation_status == "resolved" for t in matching_threats):
            framework_status[fw]["violated_requirements"] += 1
            framework_status[fw]["risk_score"] += sum(t.severity_score or 0.0 for t in matching_threats)

            framework_status[fw]["violations"].append({
                "requirement_id": mapping.requirement_id,
                "requirement_text": mapping.requirement_text,
                "threat_type": mapping.threat_type,
                "threat_count": len(matching_threats),
                "control_objective": mapping.control_objective,
                "recommended_action": mapping.recommended_action,
                "urgency_level": mapping.urgency_level,
            })
        else:
            framework_status[fw]["compliant_threats"] += len(matching_threats)

    # Calculate compliance percentage for each framework
    result = []
    for fw, status in framework_status.items():
        if status["total_requirements"] > 0:
            compliance_pct = ((status["total_requirements"] - status["violated_requirements"]) / status["total_requirements"]) * 100
        else:
            compliance_pct = 100.0

        result.append({
            "framework": fw,
            "compliance_percentage": round(compliance_pct, 2),
            "violations": status["violated_requirements"],
            "total_requirements": status["total_requirements"],
            "risk_score": round(status["risk_score"], 2),
            "violation_details": status["violations"][:5],  # Top 5 violations
            "status": "COMPLIANT" if compliance_pct >= 95 else "AT_RISK" if compliance_pct >= 80 else "NON_COMPLIANT",
        })

    return sorted(result, key=lambda x: x["compliance_percentage"])

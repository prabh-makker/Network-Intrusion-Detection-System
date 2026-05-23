from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from app.db.session import get_db
from app.models.models import ThreatLog
from app.api import deps
from typing import Optional, List
from datetime import datetime, timedelta
import math

router = APIRouter()

# AI Threat Severity Multipliers for risk calculation
SEVERITY_MULTIPLIERS = {
    "DoS": 2.0,
    "DDoS": 2.5,
    "DDoS (Ping of Death)": 2.5,
    "U2R (Root Access)": 3.0,
    "R2L (Unauthorized Access)": 2.5,
    "Probe": 1.0,
    "Normal": 0.0,
}

# Feature importance & threat explanations (copied from alerts.py)
THREAT_EXPLANATIONS = {
    "DoS": {
        "description": "Denial of Service attack detected. High volume of connections with elevated error rates indicates a flood-based attack attempting to overwhelm system resources.",
        "key_indicators": [
            {"feature": "serror_rate", "impact": "HIGH", "detail": "SYN error rate exceeds 80%, indicating SYN flood"},
            {"feature": "count", "impact": "HIGH", "detail": "Connection count > 200 from single source"},
            {"feature": "srv_count", "impact": "MEDIUM", "detail": "Repeated service targeting pattern"},
        ],
        "severity": "CRITICAL",
        "mitigation": "Rate limit the source IP. Enable SYN cookies. Consider blackholing the traffic."
    },
    "DDoS": {
        "description": "Distributed Denial of Service attack. Multiple sources flood target with traffic exceeding its capacity, rendering services unavailable.",
        "key_indicators": [
            {"feature": "count", "impact": "CRITICAL", "detail": "Massive concurrent connection count from distributed sources"},
            {"feature": "src_bytes", "impact": "HIGH", "detail": "High bandwidth consumption per connection"},
            {"feature": "serror_rate", "impact": "HIGH", "detail": "Elevated SYN error rate indicates volumetric flood"},
        ],
        "severity": "CRITICAL",
        "mitigation": "Enable DDoS scrubbing service. Block top source IPs. Implement traffic rate limiting per source."
    },
    "DDoS (Ping of Death)": {
        "description": "Distributed Denial of Service via oversized ICMP packets. Malformed ping packets exceed maximum allowed size, potentially causing buffer overflow.",
        "key_indicators": [
            {"feature": "src_bytes", "impact": "CRITICAL", "detail": "ICMP packet size > 65535 bytes (illegal)"},
            {"feature": "protocol_type", "impact": "HIGH", "detail": "ICMP protocol with anomalous payload"},
            {"feature": "duration", "impact": "MEDIUM", "detail": "Sustained attack over extended period"},
        ],
        "severity": "CRITICAL",
        "mitigation": "Block oversized ICMP at firewall. Enable ICMP rate limiting. Deploy DDoS mitigation."
    },
    "Probe": {
        "description": "Network reconnaissance/scanning detected. Attacker is mapping network topology and open services to identify vulnerabilities for future exploitation.",
        "key_indicators": [
            {"feature": "diff_srv_rate", "impact": "HIGH", "detail": "High diversity in targeted services (port scanning)"},
            {"feature": "count", "impact": "HIGH", "detail": "Rapid connection attempts across multiple ports"},
            {"feature": "flag", "impact": "MEDIUM", "detail": "REJ/RST flags indicate rejected connection probes"},
        ],
        "severity": "HIGH",
        "mitigation": "Enable port scan detection rules. Consider honeypot deployment. Log source for threat intelligence."
    },
    "U2R (Root Access)": {
        "description": "User-to-Root privilege escalation attempt. Attacker has user-level access and is attempting to gain root/admin privileges through exploitation.",
        "key_indicators": [
            {"feature": "service", "impact": "CRITICAL", "detail": "Targeting privileged services (shell, root)"},
            {"feature": "flag", "impact": "HIGH", "detail": "RSTR flag indicates connection reset after exploitation attempt"},
            {"feature": "src_bytes", "impact": "MEDIUM", "detail": "Payload contains potential shellcode or exploit"},
        ],
        "severity": "CRITICAL",
        "mitigation": "Immediately isolate affected host. Audit user accounts. Check for rootkits. Rotate credentials."
    },
    "R2L (Unauthorized Access)": {
        "description": "Remote-to-Local attack detected. Attacker is attempting to gain unauthorized local access from a remote system.",
        "key_indicators": [
            {"feature": "count", "impact": "HIGH", "detail": "Multiple connection attempts from remote source"},
            {"feature": "serror_rate", "impact": "MEDIUM", "detail": "High error rate indicating failed authentication attempts"},
        ],
        "severity": "HIGH",
        "mitigation": "Review failed login logs. Implement account lockout policy. Enable MFA. Check for brute force patterns."
    },
}

# Future improvement recommendations (static, context-aware)
FUTURE_IMPROVEMENTS = [
    {
        "category": "Network Hardening",
        "title": "Implement Zero Trust Architecture",
        "description": "Move from perimeter-based defense to continuous verification of all users and devices.",
        "benefits": ["Reduce breach blast radius", "Better visibility into network activity", "Compliance alignment"],
        "effort": "High",
        "timeline": "3-6 months",
        "priority": 1
    },
    {
        "category": "Detection & Response",
        "title": "Deploy SIEM Solution",
        "description": "Centralized Security Information and Event Management for log aggregation and threat detection.",
        "benefits": ["Real-time threat detection", "Audit trail compliance", "Faster incident response"],
        "effort": "High",
        "timeline": "2-4 months",
        "priority": 2
    },
    {
        "category": "Incident Response",
        "title": "Establish Incident Response Plan",
        "description": "Documented procedures for detecting, containing, and recovering from security incidents.",
        "benefits": ["Faster mean-time-to-detection (MTTD)", "Organized team coordination", "Compliance readiness"],
        "effort": "Medium",
        "timeline": "1 month",
        "priority": 1
    },
    {
        "category": "Access Control",
        "title": "Implement Network Segmentation",
        "description": "Divide network into security zones with restricted inter-zone traffic.",
        "benefits": ["Limit lateral movement", "Reduce attack surface", "Better traffic control"],
        "effort": "High",
        "timeline": "2-3 months",
        "priority": 2
    },
    {
        "category": "Compliance & Audit",
        "title": "Schedule Regular Security Audit",
        "description": "Third-party vulnerability assessment and penetration testing.",
        "benefits": ["Find vulnerabilities proactively", "Compliance certification", "Prioritized remediation"],
        "effort": "Medium",
        "timeline": "Quarterly",
        "priority": 2
    },
]

# In-memory store for trend detection (5-minute snapshots)
_trend_snapshots: List[tuple] = []  # [(timestamp, active_count), ...]

def _calculate_risk_score(stats: dict) -> int:
    """
    Calculate risk score 0-100 based on threat distribution and active counts.
    Formula: (active_threats / max(total_threats, 1)) * 100, capped at 100
    """
    total = stats.get("total_threats", 0)
    active = stats.get("active_threats", 0)

    if total == 0:
        return 0

    # Base score on proportion of active threats
    score = int((active / total) * 100)

    # Boost score if there are critical threats
    by_label = stats.get("by_label_active", {})
    critical_threats = by_label.get("U2R (Root Access)", 0) + by_label.get("DoS", 0) + by_label.get("DDoS (Ping of Death)", 0)

    if critical_threats > 0:
        score = min(100, score + (critical_threats * 5))

    return min(100, score)

def _calculate_trend(current_active: int) -> str:
    """
    Determine if threat trend is worsening, improving, or stable.
    Compare current active threats to 5-minute ago snapshot.
    """
    now = datetime.utcnow()

    # Clean old snapshots (older than 30 minutes)
    global _trend_snapshots
    _trend_snapshots = [(ts, cnt) for ts, cnt in _trend_snapshots if now - ts < timedelta(minutes=30)]

    # If we have a recent snapshot (within 5 minutes)
    if _trend_snapshots and (now - _trend_snapshots[-1][0]) < timedelta(minutes=5):
        previous_active = _trend_snapshots[-1][1]

        if current_active > previous_active * 1.2:  # >20% increase
            trend = "worsening"
        elif current_active < previous_active * 0.8:  # <20% decrease
            trend = "improving"
        else:
            trend = "stable"
    else:
        trend = "stable"  # Default if no history

    # Store current snapshot
    _trend_snapshots.append((now, current_active))

    return trend

def _get_top_threats(stats: dict, limit: int = 3) -> List[dict]:
    """
    Get top N threats by active count × severity multiplier.
    Return threat type, active count, total count, and ranking score.
    """
    by_label_active = stats.get("by_label_active", {})
    by_label_total = stats.get("by_label", {})

    threats = []
    for label, active_count in by_label_active.items():
        if label == "Normal":
            continue

        total_count = by_label_total.get(label, active_count)
        severity_mult = SEVERITY_MULTIPLIERS.get(label, 1.0)

        # Ranking: (active_count + 1) × severity_multiplier
        # +1 to avoid zero score for low-count threats
        score = (active_count + 1) * severity_mult

        threats.append({
            "label": label,
            "active_count": active_count,
            "total_count": total_count,
            "severity_multiplier": severity_mult,
            "score": score,
        })

    # Sort by score descending
    threats.sort(key=lambda x: x["score"], reverse=True)

    return threats[:limit]

def _get_top_sources(db: Session, limit: int = 5) -> List[dict]:
    """Get top attacker IPs (only unblocked threats)."""
    top_sources = (
        db.query(ThreatLog.src_ip, func.count(ThreatLog.id).label("count"))
        .filter(ThreatLog.is_blocked == False)
        .group_by(ThreatLog.src_ip)
        .order_by(desc("count"))
        .limit(limit)
        .all()
    )

    return [{"ip": ip, "count": c} for ip, c in top_sources]

@router.get("/")
async def get_recommendations(
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_active_user)
):
    """
    Get AI-powered security recommendations based on current threat landscape.

    Returns dynamic recommendations that include:
    - Risk score (0-100)
    - Threat trend (improving/stable/worsening)
    - Immediate actions for top 3 threats
    - Long-term security improvements
    """

    # Fetch current stats
    total = db.query(func.count(ThreatLog.id)).scalar() or 0
    blocked_count = db.query(func.count(ThreatLog.id)).filter(ThreatLog.is_blocked == True).scalar() or 0
    active_count = total - blocked_count

    by_label = (
        db.query(ThreatLog.label, func.count(ThreatLog.id))
        .group_by(ThreatLog.label)
        .all()
    )
    by_label_active = (
        db.query(ThreatLog.label, func.count(ThreatLog.id))
        .filter(ThreatLog.is_blocked == False)
        .group_by(ThreatLog.label)
        .all()
    )

    stats = {
        "total_threats": total,
        "active_threats": active_count,
        "blocked_threats": blocked_count,
        "by_label": {label: count for label, count in by_label},
        "by_label_active": {label: count for label, count in by_label_active},
    }

    # Calculate risk metrics
    risk_score = _calculate_risk_score(stats)
    risk_trend = _calculate_trend(active_count)

    # Get top threats and generate immediate actions
    top_threats = _get_top_threats(stats, limit=3)
    immediate_actions = []

    for threat in top_threats:
        label = threat["label"]
        explanation = THREAT_EXPLANATIONS.get(label, {})

        # Determine priority color
        severity = explanation.get("severity", "MEDIUM")
        if severity == "CRITICAL":
            priority = "CRITICAL"
        elif threat["active_count"] > 10:
            priority = "HIGH"
        else:
            priority = "MEDIUM"

        action = {
            "priority": priority,
            "threat_type": label,
            "title": f"{label} Attack Detected" if label != "Probe" else "Network Reconnaissance Detected",
            "description": explanation.get("description", ""),
            "why_dangerous": explanation.get("description", ""),
            "active_count": threat["active_count"],
            "total_count": threat["total_count"],
            "top_sources": [s["ip"] for s in _get_top_sources(db, limit=3)],
            "steps": explanation.get("mitigation", "").split(". "),
            "time_needed": "15-30 minutes" if priority == "CRITICAL" else "30 minutes to 1 hour",
            "can_execute": True,  # SECURE NOW button is available
            "explanation": explanation,
        }
        immediate_actions.append(action)

    # Get threat breakdown for pie chart
    threat_breakdown = stats["by_label_active"]

    # Filter future improvements based on threat profile
    # Prioritize security measures relevant to detected threats
    filtered_improvements = []

    # Always include incident response as priority 1
    incident_response = next((imp for imp in FUTURE_IMPROVEMENTS if "Incident Response" in imp["title"]), None)
    if incident_response:
        filtered_improvements.append(incident_response)

    # Add other improvements
    for imp in FUTURE_IMPROVEMENTS:
        if "Incident Response" not in imp["title"] and len(filtered_improvements) < 5:
            filtered_improvements.append(imp)

    return {
        "risk_score": risk_score,
        "risk_trend": risk_trend,
        "stats": stats,
        "top_threat": top_threats[0]["label"] if top_threats else "Normal",
        "immediate_actions": immediate_actions,
        "future_improvements": filtered_improvements,
        "threat_breakdown": threat_breakdown,
    }

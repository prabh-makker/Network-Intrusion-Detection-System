from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from app.db.session import get_db
from app.models.models import ThreatLog
from app.api import deps
from typing import Optional
from app.services.pdf_report import generate_threat_pdf
import requests as http_requests

router = APIRouter()

# AI Explainability data - feature importance from trained Random Forest
FEATURE_IMPORTANCE = {
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
}

@router.get("/recent")
async def get_recent_alerts(
    db: Session = Depends(get_db),
    limit: int = Query(default=50, le=200),
    label: Optional[str] = None,
    current_user=Depends(deps.get_current_active_user)
):
    """Fetch recent threat alerts from the database."""
    query = db.query(ThreatLog).order_by(desc(ThreatLog.timestamp))
    if label:
        query = query.filter(ThreatLog.label == label)
    alerts = query.limit(limit).all()
    
    return [
        {
            "id": str(a.id),
            "timestamp": a.timestamp.isoformat() if a.timestamp else None,
            "src_ip": a.src_ip,
            "dst_ip": a.dst_ip,
            "protocol": a.protocol,
            "label": a.label,
            "confidence": a.confidence,
            "is_blocked": a.is_blocked,
        }
        for a in alerts
    ]

@router.get("/stats")
async def get_alert_stats(
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_active_user)
):
    """Get aggregated threat statistics."""
    total = db.query(func.count(ThreatLog.id)).scalar() or 0
    by_label = (
        db.query(ThreatLog.label, func.count(ThreatLog.id))
        .group_by(ThreatLog.label)
        .all()
    )
    top_sources = (
        db.query(ThreatLog.src_ip, func.count(ThreatLog.id).label("count"))
        .group_by(ThreatLog.src_ip)
        .order_by(desc("count"))
        .limit(10)
        .all()
    )
    
    return {
        "total_threats": total,
        "by_label": {label: count for label, count in by_label},
        "top_sources": [{"ip": ip, "count": c} for ip, c in top_sources],
    }

@router.get("/timeline")
async def get_threat_timeline(
    db: Session = Depends(get_db),
    range: str = Query(default="24h"),
    current_user=Depends(deps.get_current_active_user)
):
    """Return real threat counts grouped by time period for the historical timeline chart."""
    from datetime import datetime, timezone, timedelta
    import builtins

    now = datetime.now(timezone.utc)

    time_range = range  # Avoid shadowing builtin range

    if time_range == "7d":
        since = now - timedelta(days=7)
        label_fmt = "%a"
        periods = 7
        delta = timedelta(days=1)
    elif time_range == "30d":
        since = now - timedelta(days=30)
        label_fmt = "%b %d"
        periods = 30
        delta = timedelta(days=1)
    else:  # 24h default
        since = now - timedelta(hours=24)
        label_fmt = "%H:00"
        periods = 24
        delta = timedelta(hours=1)

    # Get all threats in the range
    rows = (
        db.query(ThreatLog)
        .filter(ThreatLog.timestamp >= since)
        .all()
    )

    # Group threats by period
    db_map = {}
    for row in rows:
        if time_range == "7d":
            key = row.timestamp.strftime("%Y-%m-%d")
        elif time_range == "30d":
            key = row.timestamp.strftime("%Y-%m-%d")
        else:  # 24h
            key = row.timestamp.strftime("%Y-%m-%d %H:00")
        db_map[key] = db_map.get(key, 0) + 1

    result = []
    for i in builtins.range(periods):
        period_start = since + (i * delta)
        if time_range == "7d":
            key = period_start.strftime("%Y-%m-%d")
        elif time_range == "30d":
            key = period_start.strftime("%Y-%m-%d")
        else:  # 24h
            key = period_start.strftime("%Y-%m-%d %H:00")
        label = period_start.strftime(label_fmt)
        threats = db_map.get(key, 0)
        result.append({"time": label, "threats": threats, "traffic": threats * 5 + 50})

    return result

@router.get("/explain/{label}")
async def explain_threat(

    label: str,
    current_user=Depends(deps.get_current_active_user)
):
    """AI Explainability endpoint - returns why the model flagged this threat type."""
    explanation = FEATURE_IMPORTANCE.get(label)
    if not explanation:
        return {"error": f"No explanation available for label: {label}"}
    return {
        "label": label,
        **explanation
    }

@router.get("/export")
async def export_alerts_pdf(
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_active_user)
):
    """Export recent threats as a downloadable PDF format."""
    total = db.query(func.count(ThreatLog.id)).scalar() or 0
    alerts_data = db.query(ThreatLog).order_by(desc(ThreatLog.timestamp)).limit(100).all()
    pdf_buffer = generate_threat_pdf(alerts_data, total)
    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=nids-threat-report.pdf"}
    )

@router.get("/geoip/{ip}")
async def geoip_lookup(
    ip: str,
    current_user=Depends(deps.get_current_active_user)
):
    """Server-side proxy for ip-api.com to avoid CORS/browser restrictions."""
    try:
        r = http_requests.get(f"http://ip-api.com/json/{ip}", timeout=5)
        return r.json()
    except Exception:
        raise HTTPException(status_code=502, detail="GeoIP lookup failed")

from app.services.firewall_service import firewall_service
import uuid

@router.post("/{alert_id}/block")
async def block_threat(
    alert_id: str, 
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_active_user)
):
    """Mark a threat as blocked and ban the IP on the OS Firewall."""
    try:
        alert_id_uuid = uuid.UUID(alert_id)
    except ValueError:
        return {"error": "Invalid alert ID format"}

    alert = db.query(ThreatLog).filter(ThreatLog.id == alert_id_uuid).first()
    if not alert:
        return {"error": "Alert not found"}
    
    # Active Defense: Ban the IP via pfctl/iptables
    firewall_status = firewall_service.block_ip(alert.src_ip)
    
    alert.is_blocked = True
    db.commit()
    
    return {
        "status": "blocked", 
        "id": alert_id, 
        "ip": alert.src_ip, 
        "firewall_active": firewall_status
    }


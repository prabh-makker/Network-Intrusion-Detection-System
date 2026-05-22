from fastapi import APIRouter, Depends, Query, HTTPException, Request, status, Body
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.db.session import get_db
from app.models.models import ThreatLog
from app.api import deps
from typing import Optional, List
from app.services.pdf_report import generate_threat_pdf
from app.services.firewall_service import firewall_service
import requests as http_requests
import uuid

router = APIRouter()
_geoip_limiter = Limiter(key_func=get_remote_address)

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
    """Get aggregated threat statistics with blocked/active breakdown."""
    total = db.query(func.count(ThreatLog.id)).scalar() or 0
    blocked_count = db.query(func.count(ThreatLog.id)).filter(ThreatLog.is_blocked == True).scalar() or 0
    active_count = total - blocked_count

    by_label = (
        db.query(ThreatLog.label, func.count(ThreatLog.id))
        .group_by(ThreatLog.label)
        .all()
    )
    # Active (unblocked) counts per label — drops when SECURE NOW blocks threats
    by_label_active = (
        db.query(ThreatLog.label, func.count(ThreatLog.id))
        .filter(ThreatLog.is_blocked == False)
        .group_by(ThreatLog.label)
        .all()
    )
    # Top sources should only count UNBLOCKED threats (active attackers)
    top_sources = (
        db.query(ThreatLog.src_ip, func.count(ThreatLog.id).label("count"))
        .filter(ThreatLog.is_blocked == False)
        .group_by(ThreatLog.src_ip)
        .order_by(desc("count"))
        .limit(10)
        .all()
    )

    return {
        "total_threats": total,
        "active_threats": active_count,
        "blocked_threats": blocked_count,
        "by_label": {label: count for label, count in by_label},
        "by_label_active": {label: count for label, count in by_label_active},
        "top_sources": [{"ip": ip, "count": c} for ip, c in top_sources],
    }


@router.post("/bulk-block")
async def bulk_block_threats(
    alert_ids: List[str] = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_active_user)
):
    """Block multiple threats at once."""
    blocked = []
    failed = []

    for alert_id_str in alert_ids:
        try:
            alert_id_uuid = uuid.UUID(alert_id_str)
            alert = db.query(ThreatLog).filter(ThreatLog.id == alert_id_uuid).first()
            if alert and not alert.is_blocked:
                firewall_service.block_ip(alert.src_ip)
                alert.is_blocked = True
                blocked.append({"id": alert_id_str, "ip": alert.src_ip})
            elif alert and alert.is_blocked:
                failed.append({"id": alert_id_str, "reason": "already_blocked"})
            else:
                failed.append({"id": alert_id_str, "reason": "not_found"})
        except ValueError:
            failed.append({"id": alert_id_str, "reason": "invalid_id"})
        except Exception as e:
            failed.append({"id": alert_id_str, "reason": str(e)})

    db.commit()
    return {
        "status": "completed",
        "blocked_count": len(blocked),
        "failed_count": len(failed),
        "blocked": blocked,
        "failed": failed,
    }


@router.post("/block-all-active")
async def block_all_active_threats(
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_active_user)
):
    """Block ALL active (unblocked) threats in the database."""
    active_alerts = db.query(ThreatLog).filter(
        ThreatLog.is_blocked == False,
        ThreatLog.label != "Normal"
    ).all()

    blocked_ips = set()
    blocked_count = 0

    for alert in active_alerts:
        if alert.src_ip not in blocked_ips:
            try:
                firewall_service.block_ip(alert.src_ip)
                blocked_ips.add(alert.src_ip)
            except Exception:
                pass
        alert.is_blocked = True
        blocked_count += 1

    db.commit()
    return {
        "status": "completed",
        "blocked_count": blocked_count,
        "unique_ips_blocked": len(blocked_ips),
        "blocked_ips": list(blocked_ips)[:20],  # Cap response size
    }

@router.get("/timeline")
async def get_threat_timeline(
    db: Session = Depends(get_db),
    time_range: str = Query(default="24h"),
    current_user=Depends(deps.get_current_active_user)
):
    """Return real threat counts grouped by time period for the historical timeline chart."""
    from datetime import datetime, timedelta

    now = datetime.utcnow()

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
    else:  # 24h default — show 24 hours of data ending now
        since = now - timedelta(hours=23)  # 23 + the current partial hour = 24 hours
        label_fmt = "%H:00"
        periods = 24
        delta = timedelta(hours=1)

    # Get aggregated threat counts by period (database-level grouping)
    from sqlalchemy import func as sql_func, cast, String

    if time_range == "7d" or time_range == "30d":
        group_expr = sql_func.substr(cast(ThreatLog.timestamp, String), 1, 10)  # YYYY-MM-DD
    else:  # 24h
        group_expr = sql_func.substr(cast(ThreatLog.timestamp, String), 1, 13)  # YYYY-MM-DD HH

    rows = (
        db.query(
            group_expr.label("period"),
            sql_func.count(ThreatLog.id).label("threat_count")
        )
        .filter(ThreatLog.timestamp >= since)
        .group_by(group_expr)
        .all()
    )

    db_map = {row[0]: row[1] for row in rows}

    result = []
    for i in range(periods):
        period_start = since + (i * delta)
        if time_range == "7d":
            key = period_start.strftime("%Y-%m-%d")
        elif time_range == "30d":
            key = period_start.strftime("%Y-%m-%d")
        else:  # 24h — must match the 13-char substr "YYYY-MM-DD HH"
            key = period_start.strftime("%Y-%m-%d %H")
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No explanation available for the requested threat label")
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

_geoip_cache: dict[str, dict] = {}  # Simple in-memory cache for GeoIP results

@router.get("/by-severity")
async def get_alerts_by_severity(
    severity: str = Query(default="high"),
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_active_user)
):
    """Filter alerts by severity label."""
    alerts = db.query(ThreatLog).filter(
        ThreatLog.label.ilike(f"%{severity}%")
    ).order_by(desc(ThreatLog.timestamp)).limit(100).all()
    return [
        {
            "id": str(a.id),
            "timestamp": a.timestamp.isoformat() if a.timestamp else None,
            "src_ip": a.src_ip,
            "label": a.label,
            "confidence": a.confidence,
            "is_blocked": a.is_blocked,
        }
        for a in alerts
    ]


@router.get("/date-range")
async def get_alerts_date_range(
    start: str = Query(...),
    end: str = Query(...),
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_active_user)
):
    """Filter alerts by date range."""
    from datetime import datetime
    try:
        start_dt = datetime.fromisoformat(start)
        end_dt = datetime.fromisoformat(end)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")
    alerts = db.query(ThreatLog).filter(
        ThreatLog.timestamp >= start_dt,
        ThreatLog.timestamp <= end_dt
    ).order_by(desc(ThreatLog.timestamp)).limit(500).all()
    return [
        {
            "id": str(a.id),
            "timestamp": a.timestamp.isoformat() if a.timestamp else None,
            "src_ip": a.src_ip,
            "label": a.label,
            "confidence": a.confidence,
            "is_blocked": a.is_blocked,
        }
        for a in alerts
    ]


@router.get("/geoip/{ip}")
@_geoip_limiter.limit("60/minute")
async def geoip_lookup(
    request: Request,
    ip: str,
):
    """Server-side proxy for ip-api.com to avoid CORS/browser restrictions. Results cached to prevent rate limiting.

    Validates IP addresses and rejects non-routable/dangerous IPs.
    """
    from ipaddress import ip_address, AddressValueError

    # Validate IP format
    try:
        ip_obj = ip_address(ip)
    except (ValueError, AddressValueError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid IP address format")

    # Reject non-routable IPs (same logic as firewall_service._validate_ip)
    if ip_obj.is_private:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot geolocate private IP addresses")
    if ip_obj.is_loopback:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot geolocate loopback IP addresses")
    if ip_obj.is_reserved:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot geolocate reserved IP addresses")
    if ip_obj.is_link_local:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot geolocate link-local IP addresses")
    if ip_obj.is_multicast:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot geolocate multicast IP addresses")
    if ip_obj.is_unspecified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot geolocate unspecified IP addresses")

    # Check cache first
    if ip in _geoip_cache:
        return _geoip_cache[ip]

    try:
        r = http_requests.get(f"http://ip-api.com/json/{ip}", timeout=5)
        result = r.json()
        # Cache up to 1000 IPs (LRU eviction would be better but this is simple)
        if len(_geoip_cache) < 1000:
            _geoip_cache[ip] = result
        return result
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
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid alert ID format — must be a valid UUID")

    alert = db.query(ThreatLog).filter(ThreatLog.id == alert_id_uuid).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    
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


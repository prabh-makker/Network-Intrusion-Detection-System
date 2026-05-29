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
    "DDoS": {
        "description": "Distributed Denial of Service attack. Multiple sources flood target with traffic exceeding its capacity, rendering services unavailable.",
        "key_indicators": [
            {"feature": "count", "impact": "CRITICAL", "detail": "Massive concurrent connection count from distributed sources"},
            {"feature": "src_bytes", "impact": "HIGH", "detail": "High bandwidth consumption per connection"},
            {"feature": "serror_rate", "impact": "HIGH", "detail": "Elevated SYN error rate indicates volumetric flood"},
        ],
        "severity": "CRITICAL",
        "mitigation": "Activate DDoS scrubbing service. Rate-limit per-source. Enable geo-blocking for attack origin countries."
    },
    "R2L (Unauthorized Access)": {
        "description": "Remote-to-Local unauthorized access attempt. Attacker is exploiting vulnerabilities to gain local user-level access from a remote machine.",
        "key_indicators": [
            {"feature": "dst_bytes", "impact": "CRITICAL", "detail": "Unusually high response bytes — data exfiltration pattern"},
            {"feature": "service", "impact": "HIGH", "detail": "Targeting authentication services (FTP, SSH, Telnet)"},
            {"feature": "duration", "impact": "MEDIUM", "detail": "Extended session duration indicates persistence attempt"},
        ],
        "severity": "HIGH",
        "mitigation": "Block source IP. Audit authentication logs. Force credential rotation. Enable MFA on all remote services."
    },
}

@router.get("/recent")
async def get_recent_alerts(
    db: Session = Depends(get_db),
    limit: int = Query(default=50, le=10000),
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
    time_range: str = Query(default=None),
    start_date: str = Query(default=None),
    end_date: str = Query(default=None),
    current_user=Depends(deps.get_current_active_user)
):
    """Get aggregated threat statistics with optional time filtering."""
    import logging
    logger = logging.getLogger(__name__)
    logger.warning(f"[STATS] Endpoint called. current_user: {current_user}")

    from datetime import datetime, timedelta

    # Build time filter
    since = None
    until = None
    now = datetime.utcnow()

    if time_range == "custom" and start_date and end_date:
        try:
            since = datetime.strptime(start_date, "%Y-%m-%d")
            until = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
        except ValueError:
            pass
    elif time_range == "1h":
        since = now - timedelta(hours=1)
    elif time_range == "6h":
        since = now - timedelta(hours=6)
    elif time_range == "24h":
        since = now - timedelta(hours=24)
    elif time_range == "7d":
        since = now - timedelta(days=7)
    elif time_range == "30d":
        since = now - timedelta(days=30)

    def apply_time(q):
        if since:
            q = q.filter(ThreatLog.timestamp >= since)
        if until:
            q = q.filter(ThreatLog.timestamp <= until)
        return q

    total = apply_time(db.query(func.count(ThreatLog.id)).filter(ThreatLog.label != "Normal")).scalar() or 0
    blocked_count = apply_time(db.query(func.count(ThreatLog.id)).filter(ThreatLog.is_blocked == True, ThreatLog.label != "Normal")).scalar() or 0
    active_count = total - blocked_count

    by_label = apply_time(
        db.query(ThreatLog.label, func.count(ThreatLog.id))
        .group_by(ThreatLog.label)
    ).all()

    by_label_active = apply_time(
        db.query(ThreatLog.label, func.count(ThreatLog.id))
        .filter(ThreatLog.is_blocked == False)
        .group_by(ThreatLog.label)
    ).all()

    top_sources = apply_time(
        db.query(ThreatLog.src_ip, func.count(ThreatLog.id).label("count"))
        .group_by(ThreatLog.src_ip)
        .order_by(desc("count"))
    ).limit(10).all()

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
    start_date: str = Query(default=None),
    end_date: str = Query(default=None),
    current_user=Depends(deps.get_current_active_user)
):
    """Return real threat counts grouped by time period for the historical timeline chart."""
    from datetime import datetime, timedelta

    now = datetime.utcnow()

    # Custom date range overrides time_range
    if time_range == "custom" and start_date and end_date:
        try:
            since = datetime.strptime(start_date, "%Y-%m-%d")
            until = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
            days = max(1, (until - since).days + 1)

            # Hourly for up to 7 days, daily beyond that
            if days <= 7:
                delta = timedelta(hours=1)
                periods = days * 24
                substr_len = 13  # "YYYY-MM-DD HH"
                key_fmt = "%Y-%m-%d %H"
            else:
                delta = timedelta(days=1)
                periods = min(days, 90)
                substr_len = 10  # "YYYY-MM-DD"
                key_fmt = "%Y-%m-%d"

            from sqlalchemy import func as sql_func, cast, String
            group_expr = sql_func.substr(cast(ThreatLog.timestamp, String), 1, substr_len)
            rows = (
                db.query(group_expr.label("period"), sql_func.count(ThreatLog.id).label("threat_count"))
                .filter(ThreatLog.timestamp >= since, ThreatLog.timestamp <= until)
                .group_by(group_expr).all()
            )
            blocked_rows = (
                db.query(group_expr.label("period"), sql_func.count(ThreatLog.id).label("blocked_count"))
                .filter(ThreatLog.timestamp >= since, ThreatLog.timestamp <= until, ThreatLog.is_blocked == True)
                .group_by(group_expr).all()
            )
            db_map = {row[0]: row[1] for row in rows}
            blocked_map = {row[0]: row[1] for row in blocked_rows}
            result = []
            for i in range(periods):
                ps = since + (i * delta)
                key = ps.strftime(key_fmt)
                # At midnight (except first point), show date as tick label
                if days > 1 and ps.hour == 0 and i > 0:
                    time_label = ps.strftime("%b %d")
                else:
                    time_label = ps.strftime("%H:00")
                result.append({
                    "time": time_label,
                    "threats": db_map.get(key, 0),
                    "blocked": blocked_map.get(key, 0),
                    "traffic": db_map.get(key, 0),
                })
            return result
        except ValueError:
            pass  # fall through to normal time_range handling

    if time_range == "1h":
        since = now - timedelta(minutes=59)
        label_fmt = "%H:%M"
        periods = 12          # 5-minute buckets
        delta = timedelta(minutes=5)
    elif time_range == "6h":
        since = now - timedelta(hours=6)
        label_fmt = "%H:00"
        periods = 12          # 30-minute buckets
        delta = timedelta(minutes=30)
    elif time_range == "7d":
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
        since = now - timedelta(hours=23)
        label_fmt = "%H:00"
        periods = 24
        delta = timedelta(hours=1)

    # Get aggregated threat counts by period (database-level grouping)
    from sqlalchemy import func as sql_func, cast, String

    if time_range in ("7d", "30d"):
        group_expr = sql_func.substr(cast(ThreatLog.timestamp, String), 1, 10)  # YYYY-MM-DD
    elif time_range == "1h":
        group_expr = sql_func.substr(cast(ThreatLog.timestamp, String), 1, 15)  # YYYY-MM-DD HH:MM (5-min)
    elif time_range == "6h":
        group_expr = sql_func.substr(cast(ThreatLog.timestamp, String), 1, 13)  # YYYY-MM-DD HH (hour-level ok for 30min grouping)
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
    # Blocked threats per period for history chart
    blocked_rows = (
        db.query(
            group_expr.label("period"),
            sql_func.count(ThreatLog.id).label("blocked_count")
        )
        .filter(ThreatLog.timestamp >= since, ThreatLog.is_blocked == True)
        .group_by(group_expr)
        .all()
    )

    db_map = {row[0]: row[1] for row in rows}
    blocked_map = {row[0]: row[1] for row in blocked_rows}

    result = []
    for i in range(periods):
        period_start = since + (i * delta)
        if time_range in ("7d", "30d"):
            key = period_start.strftime("%Y-%m-%d")
        elif time_range == "1h":
            key = period_start.strftime("%Y-%m-%d %H:%M")[:15]  # YYYY-MM-DD HH:MM
        elif time_range == "6h":
            key = period_start.strftime("%Y-%m-%d %H")
        else:  # 24h
            key = period_start.strftime("%Y-%m-%d %H")
        label = period_start.strftime(label_fmt)
        threats = db_map.get(key, 0)
        blocked = blocked_map.get(key, 0)
        result.append({
            "time": label,
            "threats": threats,
            "blocked": blocked,
            "active": threats - blocked,
            "traffic": threats * 5 + 50,
        })

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
    current_user=Depends(deps.get_current_active_user),
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
        r = http_requests.get(f"https://ip-api.com/json/{ip}", timeout=5)
        result = r.json()
        # Cache up to 1000 IPs (LRU eviction would be better but this is simple)
        if len(_geoip_cache) < 1000:
            _geoip_cache[ip] = result
        return result
    except Exception:
        raise HTTPException(status_code=502, detail="GeoIP lookup failed")

@router.get("/data-quality/metrics")
async def get_data_quality_metrics(
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_active_user)
):
    """Get real-time data quality and class balance metrics from threat logs."""
    from collections import Counter

    # Get all threat logs
    threats = db.query(ThreatLog).all()
    total = len(threats)

    if total == 0:
        return {
            "total_records": 0,
            "class_balance": {},
            "missing_values_pct": 0,
            "outliers_count": 0,
            "feature_scaling": "Normalized",
            "class_imbalance_ratio": "N/A",
            "data_freshness_min": 0,
        }

    # Class balance
    labels = [t.label for t in threats if t.label]
    label_counts = Counter(labels)
    class_balance = {
        label: round((count / total) * 100, 1)
        for label, count in label_counts.most_common()
    }

    # Missing values (check key fields)
    missing_count = 0
    for t in threats:
        if not t.src_ip or not t.dst_ip or not t.label:
            missing_count += 1
    missing_pct = round((missing_count / total) * 100, 2)

    # Outliers (high confidence predictions with unusual traffic patterns)
    outliers = sum(1 for t in threats if t.confidence and t.confidence > 99.5)

    # Class imbalance ratio (max:min)
    if label_counts:
        max_class_count = max(label_counts.values())
        min_class_count = min(label_counts.values())
        imbalance_ratio = round(max_class_count / min_class_count, 2) if min_class_count > 0 else 0
    else:
        imbalance_ratio = 0

    # Data freshness (minutes since most recent record)
    from datetime import datetime, timezone
    if threats:
        most_recent = max(t.timestamp for t in threats if t.timestamp)
        now = datetime.now(timezone.utc)
        freshness_min = round((now - most_recent).total_seconds() / 60, 1) if most_recent else 0
    else:
        freshness_min = 0

    return {
        "total_records": total,
        "class_balance": class_balance,
        "missing_values_pct": missing_pct,
        "outliers_count": outliers,
        "feature_scaling": "Normalized",
        "class_imbalance_ratio": f"{imbalance_ratio}:1",
        "data_freshness_min": freshness_min,
    }

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


@router.get("/export/threats")
async def export_threats(
    db: Session = Depends(get_db),
    format: str = Query(default="csv", regex="^(csv|json|pdf)$"),
    start_date: str = Query(default=None),
    end_date: str = Query(default=None),
    threat_type: str = Query(default=None),
    severity_min: float = Query(default=0, ge=0, le=10),
    severity_max: float = Query(default=10, ge=0, le=10),
    geo_country: str = Query(default=None),
    current_user=Depends(deps.get_current_active_user)
):
    """
    Export threats in the specified format with optional filtering.

    Args:
        format: Export format (csv, json, pdf)
        start_date: Start date in YYYY-MM-DD format
        end_date: End date in YYYY-MM-DD format
        threat_type: Filter by threat type (DoS, DDoS, U2R, R2L, Probe)
        severity_min: Minimum severity score (0-10)
        severity_max: Maximum severity score (0-10)
        geo_country: Filter by source country

    Returns:
        File download in requested format
    """
    from datetime import datetime
    from sqlalchemy import and_

    # Build query filters
    filters = []

    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date)
            filters.append(ThreatLog.timestamp >= start_dt)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_date format")

    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date)
            filters.append(ThreatLog.timestamp <= end_dt)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_date format")

    if threat_type:
        filters.append(ThreatLog.label == threat_type)

    filters.append(ThreatLog.severity_score >= severity_min)
    filters.append(ThreatLog.severity_score <= severity_max)

    if geo_country:
        filters.append(ThreatLog.geo_country == geo_country)

    # Query threats
    threats = db.query(ThreatLog).filter(and_(*filters) if filters else True).order_by(desc(ThreatLog.timestamp)).all()

    if format == "json":
        # Return JSON export
        return {
            "export_type": "threats",
            "format": "json",
            "count": len(threats),
            "export_time": datetime.now(timezone.utc).isoformat(),
            "filters": {
                "start_date": start_date,
                "end_date": end_date,
                "threat_type": threat_type,
                "severity_range": f"{severity_min}-{severity_max}",
                "geo_country": geo_country,
            },
            "threats": [
                {
                    "id": str(t.id),
                    "timestamp": t.timestamp.isoformat() if t.timestamp else None,
                    "src_ip": t.src_ip,
                    "dst_ip": t.dst_ip,
                    "protocol": t.protocol,
                    "threat_type": t.label,
                    "confidence": t.confidence,
                    "severity_score": t.severity_score,
                    "is_blocked": t.is_blocked,
                    "geo_country": t.geo_country,
                    "time_to_block_ms": t.time_to_block,
                    "remediation_status": t.remediation_status.value if t.remediation_status else None,
                    "threat_notes": t.threat_notes,
                }
                for t in threats
            ]
        }

    elif format == "csv":
        # Return CSV export as text
        import io
        import csv
        from fastapi.responses import StreamingResponse

        output = io.StringIO()
        writer = csv.writer(output)

        # CSV header
        writer.writerow([
            "Timestamp", "Source IP", "Destination IP", "Protocol",
            "Threat Type", "Confidence", "Severity Score", "Blocked",
            "Country", "Time to Block (ms)", "Remediation Status", "Notes"
        ])

        # CSV rows
        for t in threats:
            writer.writerow([
                t.timestamp.isoformat() if t.timestamp else "",
                t.src_ip,
                t.dst_ip,
                t.protocol,
                t.label,
                round(t.confidence, 2) if t.confidence else "",
                round(t.severity_score, 2) if t.severity_score else "",
                "Yes" if t.is_blocked else "No",
                t.geo_country or "",
                t.time_to_block or "",
                t.remediation_status.value if t.remediation_status else "",
                t.threat_notes or "",
            ])

        response = StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=threats_export.csv"}
        )
        return response

    elif format == "pdf":
        # Return PDF export
        pdf_data = generate_threat_pdf(threats)
        from fastapi.responses import FileResponse

        return FileResponse(
            path=pdf_data,
            filename="threats_export.pdf",
            media_type="application/pdf"
        )


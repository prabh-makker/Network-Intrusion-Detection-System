from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel
from app.db.session import get_db
from app.models.models import ThreatLog, RemediationStatusEnum
from app.api import deps
import time

router = APIRouter()


class AutoResponseRequest(BaseModel):
    threat_id: str
    action_type: str  # block, isolate, alert, custom_script


@router.post("/auto-respond")
async def execute_auto_response(
    request: AutoResponseRequest,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_active_user),
):
    """
    Execute automated response actions on a threat.

    Args:
        threat_id: UUID of the threat
        action_type: Type of action (block, isolate, alert, custom_script)

    Returns:
        Execution status and results
    """
    threat = db.query(ThreatLog).filter(ThreatLog.id == request.threat_id).first()
    if not threat:
        raise HTTPException(status_code=404, detail="Threat not found")

    action_type = request.action_type.lower()
    valid_actions = ["block", "isolate", "alert", "custom_script"]

    if action_type not in valid_actions:
        raise HTTPException(status_code=400, detail=f"Invalid action type: {action_type}")

    # Simulate action execution (in real implementation, would call firewall/SIEM)
    execution_start = time.time()

    # Pre-configured policies
    affected_hosts = [threat.dst_ip]
    affected_flows = 1
    message = ""

    try:
        if action_type == "block":
            # Default policy: block all traffic from source
            threat.is_blocked = True
            threat.remediation_status = RemediationStatusEnum.in_progress
            message = f"Blocking all traffic from {threat.src_ip}"

            # Check if source is attacking multiple targets
            other_targets = db.query(ThreatLog).filter(
                ThreatLog.src_ip == threat.src_ip,
                ThreatLog.timestamp > threat.timestamp - datetime.timedelta(hours=1)
            ).all()

            affected_hosts = list(set([t.dst_ip for t in other_targets]))
            affected_flows = len(other_targets)

        elif action_type == "isolate":
            # Isolate affected host from network
            threat.remediation_status = RemediationStatusEnum.in_progress
            message = f"Isolating host {threat.dst_ip} from network"

        elif action_type == "alert":
            # Send alert to SIEM
            threat.remediation_status = RemediationStatusEnum.pending
            message = f"Alert sent for {threat.label} threat from {threat.src_ip}"

        elif action_type == "custom_script":
            # Execute custom remediation script
            threat.remediation_status = RemediationStatusEnum.in_progress
            message = f"Executing custom remediation for {threat.label}"

        # Record execution time
        execution_time = (time.time() - execution_start) * 1000  # milliseconds
        threat.time_to_block = int(execution_time)

        db.commit()
        db.refresh(threat)

        return {
            "threat_id": str(threat.id),
            "action_type": action_type,
            "status": "SUCCESS",
            "message": message,
            "affected_hosts": affected_hosts,
            "affected_flows": affected_flows,
            "execution_time_ms": round(execution_time, 2),
            "threat_severity": threat.severity_score,
            "threat_type": threat.label,
        }

    except Exception as e:
        return {
            "threat_id": str(threat.id),
            "action_type": action_type,
            "status": "FAILED",
            "error": str(e),
            "message": f"Failed to execute {action_type} action",
        }


@router.post("/policies")
async def apply_response_policy(
    threat_type: str,
    policy_action: str,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_active_user),
):
    """
    Apply pre-configured response policies to all threats of a type.

    Args:
        threat_type: Threat type to apply policy to (DoS, DDoS, U2R, R2L, Probe)
        policy_action: Action to apply (block, isolate, alert)

    Returns:
        Number of threats affected and execution summary
    """
    valid_threat_types = ["DoS", "DDoS", "U2R", "R2L", "Probe"]
    if threat_type not in valid_threat_types:
        raise HTTPException(status_code=400, detail=f"Invalid threat type: {threat_type}")

    valid_actions = ["block", "isolate", "alert"]
    if policy_action.lower() not in valid_actions:
        raise HTTPException(status_code=400, detail=f"Invalid policy action: {policy_action}")

    # Get pre-configured policies
    policies = {
        "DDoS": {"action": "block", "description": "Automatically block all DDoS traffic"},
        "U2R": {"action": "alert", "description": "Alert on privilege escalation attempts"},
        "R2L": {"action": "isolate", "description": "Isolate on unauthorized remote access"},
        "DoS": {"action": "block", "description": "Block denial of service attacks"},
        "Probe": {"action": "alert", "description": "Alert on reconnaissance probes"},
    }

    # Use pre-configured policy if available
    if threat_type in policies:
        policy_action = policies[threat_type]["action"]

    # Find all active threats of this type
    threats = db.query(ThreatLog).filter(
        ThreatLog.label == threat_type,
        ThreatLog.remediation_status != RemediationStatusEnum.resolved
    ).all()

    affected_count = 0
    for threat in threats:
        if policy_action == "block":
            threat.is_blocked = True
            threat.remediation_status = RemediationStatusEnum.in_progress
            affected_count += 1

        elif policy_action == "isolate":
            threat.remediation_status = RemediationStatusEnum.in_progress
            affected_count += 1

        elif policy_action == "alert":
            threat.remediation_status = RemediationStatusEnum.pending
            affected_count += 1

    db.commit()

    return {
        "threat_type": threat_type,
        "policy_action": policy_action,
        "threats_affected": affected_count,
        "policy_description": policies.get(threat_type, {}).get("description", "Custom policy"),
        "status": "SUCCESS",
        "message": f"Applied {policy_action} policy to {affected_count} {threat_type} threats",
    }


@router.get("/policies")
async def list_active_policies(
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_active_user),
):
    """
    List all active response policies.

    Returns:
        List of pre-configured and custom policies with their settings
    """
    policies = [
        {
            "id": "policy_ddos_block",
            "threat_type": "DDoS",
            "action": "block",
            "enabled": True,
            "description": "Automatically block all DDoS attacks",
            "created_at": "2026-01-01T00:00:00Z",
            "last_triggered": None,
        },
        {
            "id": "policy_u2r_alert",
            "threat_type": "U2R",
            "action": "alert",
            "enabled": True,
            "description": "Alert on privilege escalation attempts",
            "created_at": "2026-01-01T00:00:00Z",
            "last_triggered": None,
        },
        {
            "id": "policy_r2l_isolate",
            "threat_type": "R2L",
            "action": "isolate",
            "enabled": True,
            "description": "Isolate on unauthorized remote access",
            "created_at": "2026-01-01T00:00:00Z",
            "last_triggered": None,
        },
        {
            "id": "policy_dos_block",
            "threat_type": "DoS",
            "action": "block",
            "enabled": True,
            "description": "Block denial of service attacks",
            "created_at": "2026-01-01T00:00:00Z",
            "last_triggered": None,
        },
        {
            "id": "policy_probe_alert",
            "threat_type": "Probe",
            "action": "alert",
            "enabled": True,
            "description": "Alert on reconnaissance probes",
            "created_at": "2026-01-01T00:00:00Z",
            "last_triggered": None,
        },
    ]

    return {
        "total_policies": len(policies),
        "enabled_policies": len([p for p in policies if p["enabled"]]),
        "policies": policies,
    }

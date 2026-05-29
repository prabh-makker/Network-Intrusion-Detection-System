from fastapi import APIRouter, Depends, Query, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from pydantic import BaseModel
from app.db.session import get_db
from app.models.models import ThreatLog, RemediationTask, RemediationStatusEnum
from app.api import deps
import uuid

router = APIRouter()


class RemediationTaskCreate(BaseModel):
    threat_id: str
    action_type: str  # block, isolate, patch, config_change, investigate
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    due_date: Optional[str] = None  # ISO format


class RemediationTaskUpdate(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    due_date: Optional[str] = None
    notes: Optional[str] = None
    verified_by: Optional[str] = None


@router.get("/tasks")
async def list_remediation_tasks(
    db: Session = Depends(get_db),
    status: Optional[str] = Query(default=None),
    assigned_to: Optional[str] = Query(default=None),
    threat_id: Optional[str] = Query(default=None),
    limit: int = Query(default=100, le=1000),
    current_user=Depends(deps.get_current_active_user),
):
    """
    List remediation tasks with optional filtering.

    Args:
        status: Filter by status (pending, in_progress, resolved)
        assigned_to: Filter by assignee username
        threat_id: Filter by threat ID
        limit: Maximum number of tasks to return

    Returns:
        List of remediation tasks with threat and status info
    """
    query = db.query(RemediationTask)

    if status:
        try:
            status_enum = RemediationStatusEnum(status)
            query = query.filter(RemediationTask.status == status_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")

    if assigned_to:
        query = query.filter(RemediationTask.assigned_to == assigned_to)

    if threat_id:
        query = query.filter(RemediationTask.threat_id == threat_id)

    tasks = query.order_by(desc(RemediationTask.created_at)).limit(limit).all()

    result = []
    for task in tasks:
        threat = db.query(ThreatLog).filter(ThreatLog.id == task.threat_id).first()

        result.append({
            "task_id": str(task.id),
            "threat_id": str(task.threat_id),
            "threat_type": threat.label if threat else None,
            "threat_severity": threat.severity_score if threat else None,
            "threat_src_ip": threat.src_ip if threat else None,
            "action_type": task.action_type,
            "status": task.status.value if task.status else None,
            "assigned_to": task.assigned_to,
            "due_date": task.due_date.isoformat() if task.due_date else None,
            "created_at": task.created_at.isoformat() if task.created_at else None,
            "started_at": task.started_at.isoformat() if task.started_at else None,
            "completed_at": task.completed_at.isoformat() if task.completed_at else None,
            "description": task.description,
            "notes": task.notes,
        })

    return result


@router.post("/tasks")
async def create_remediation_task(
    task_data: RemediationTaskCreate,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_active_user),
):
    """
    Create a new remediation task linked to a threat.

    Args:
        task_data: Remediation task details

    Returns:
        Created task with full details
    """
    # Verify threat exists
    threat = db.query(ThreatLog).filter(ThreatLog.id == task_data.threat_id).first()
    if not threat:
        raise HTTPException(status_code=404, detail="Threat not found")

    # Parse due date if provided
    due_date = None
    if task_data.due_date:
        try:
            due_date = datetime.fromisoformat(task_data.due_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format")

    # Create task
    new_task = RemediationTask(
        id=uuid.uuid4(),
        threat_id=task_data.threat_id,
        action_type=task_data.action_type,
        status=RemediationStatusEnum.pending,
        description=task_data.description,
        assigned_to=task_data.assigned_to,
        due_date=due_date,
        created_at=datetime.now(timezone.utc),
    )

    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    return {
        "task_id": str(new_task.id),
        "threat_id": str(new_task.threat_id),
        "action_type": new_task.action_type,
        "status": new_task.status.value,
        "assigned_to": new_task.assigned_to,
        "due_date": new_task.due_date.isoformat() if new_task.due_date else None,
        "created_at": new_task.created_at.isoformat(),
        "message": "Task created successfully",
    }


@router.patch("/tasks/{task_id}")
async def update_remediation_task(
    task_id: str,
    task_data: RemediationTaskUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_active_user),
):
    """
    Update a remediation task.

    Args:
        task_id: UUID of the task to update
        task_data: Fields to update

    Returns:
        Updated task details
    """
    task = db.query(RemediationTask).filter(RemediationTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Update fields
    if task_data.status:
        try:
            task.status = RemediationStatusEnum(task_data.status)
            if task_data.status == "in_progress":
                task.started_at = datetime.now(timezone.utc)
            elif task_data.status == "resolved":
                task.completed_at = datetime.now(timezone.utc)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {task_data.status}")

    if task_data.assigned_to is not None:
        task.assigned_to = task_data.assigned_to

    if task_data.due_date is not None:
        try:
            task.due_date = datetime.fromisoformat(task_data.due_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format")

    if task_data.notes is not None:
        task.notes = task_data.notes

    if task_data.verified_by is not None:
        task.verified_by = task_data.verified_by

    db.commit()
    db.refresh(task)

    return {
        "task_id": str(task.id),
        "status": task.status.value,
        "assigned_to": task.assigned_to,
        "due_date": task.due_date.isoformat() if task.due_date else None,
        "started_at": task.started_at.isoformat() if task.started_at else None,
        "completed_at": task.completed_at.isoformat() if task.completed_at else None,
        "verified_by": task.verified_by,
        "message": "Task updated successfully",
    }


@router.get("/metrics")
async def get_remediation_metrics(
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_active_user),
):
    """
    Get remediation performance metrics (MTTD, MTTR, etc.).

    Returns:
        MTTD: Mean Time To Detection (from threat creation to analyst review)
        MTTR: Mean Time To Remediation (from detection to resolution)
        Task completion rate
    """
    # Calculate MTTD (Mean Time To Detection)
    reviewed_threats = db.query(ThreatLog).filter(
        ThreatLog.analyst_review_at.isnot(None)
    ).all()

    mttd_list = []
    for threat in reviewed_threats:
        if threat.analyst_review_at and threat.timestamp:
            delta = threat.analyst_review_at - threat.timestamp
            mttd_list.append(delta.total_seconds() / 60)  # Convert to minutes

    avg_mttd = sum(mttd_list) / len(mttd_list) if mttd_list else 0

    # Calculate MTTR (Mean Time To Remediation)
    resolved_threats = db.query(ThreatLog).filter(
        ThreatLog.resolved_at.isnot(None)
    ).all()

    mttr_list = []
    for threat in resolved_threats:
        if threat.resolved_at and threat.timestamp:
            delta = threat.resolved_at - threat.timestamp
            mttr_list.append(delta.total_seconds() / 60)  # Convert to minutes

    avg_mttr = sum(mttr_list) / len(mttr_list) if mttr_list else 0

    # Task completion rate
    total_tasks = db.query(func.count(RemediationTask.id)).scalar()
    completed_tasks = db.query(func.count(RemediationTask.id)).filter(
        RemediationTask.status == RemediationStatusEnum.resolved
    ).scalar()

    completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0

    # Average time to block
    blocked_threats = db.query(ThreatLog).filter(
        ThreatLog.time_to_block.isnot(None)
    ).all()

    avg_time_to_block = sum(t.time_to_block for t in blocked_threats) / len(blocked_threats) if blocked_threats else 0

    return {
        "mttd_minutes": round(avg_mttd, 2),
        "mttr_minutes": round(avg_mttr, 2),
        "task_completion_rate": round(completion_rate, 2),
        "avg_time_to_block_ms": round(avg_time_to_block, 2),
        "total_threats": len(reviewed_threats + resolved_threats),
        "threats_reviewed": len(reviewed_threats),
        "threats_resolved": len(resolved_threats),
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
    }


@router.post("/mute")
async def mute_alerts(
    threat_type: Optional[str] = Query(default=None),
    threat_id: Optional[str] = Query(default=None),
    duration_hours: int = Query(default=24, ge=1, le=720),
    reason: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_active_user),
):
    """
    Mute alerts for a specified duration.

    Args:
        threat_type: Mute all threats of this type (DoS, DDoS, etc.)
        threat_id: Mute specific threat by ID
        duration_hours: How long to mute (1-720 hours, default 24)
        reason: Reason for muting

    Returns:
        List of muted threats and duration
    """
    mute_until = datetime.now(timezone.utc) + timedelta(hours=duration_hours)

    if threat_id:
        # Mute specific threat
        threat = db.query(ThreatLog).filter(ThreatLog.id == threat_id).first()
        if not threat:
            raise HTTPException(status_code=404, detail="Threat not found")

        threat.mute_until = mute_until
        db.commit()

        return {
            "muted_count": 1,
            "mute_until": mute_until.isoformat(),
            "duration_hours": duration_hours,
            "reason": reason,
            "message": f"Threat {threat_id} muted until {mute_until.isoformat()}",
        }

    elif threat_type:
        # Mute all threats of a type
        threats = db.query(ThreatLog).filter(
            ThreatLog.label == threat_type,
            ThreatLog.mute_until < datetime.now(timezone.utc)  # Only unmuted threats
        ).all()

        for threat in threats:
            threat.mute_until = mute_until

        db.commit()

        return {
            "muted_count": len(threats),
            "threat_type": threat_type,
            "mute_until": mute_until.isoformat(),
            "duration_hours": duration_hours,
            "reason": reason,
            "message": f"{len(threats)} {threat_type} threats muted until {mute_until.isoformat()}",
        }

    else:
        raise HTTPException(status_code=400, detail="Must provide either threat_type or threat_id")

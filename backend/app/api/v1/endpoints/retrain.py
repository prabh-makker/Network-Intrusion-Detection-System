"""
Continuous Learning Endpoints — Correct Predictions & Manage Retraining

Analysts use these endpoints to:
1. Mark predictions as correct/incorrect
2. Provide actual threat labels
3. View retraining status
4. Trigger manual retraining
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import Optional
from uuid import UUID
from datetime import datetime

from app.api import deps
from app.db.session import get_db
from app.models.models import ThreatLog, RetrainingHistory
import os
import json
from pathlib import Path

router = APIRouter()


class CorrectPredictionRequest(BaseModel):
    """Analyst correction of a prediction."""
    actual_label: str  # What the threat actually was
    is_correct: Optional[bool] = None  # Was the model right?
    notes: Optional[str] = None  # Why analyst corrected it


class RetrainingStatus(BaseModel):
    """Status of continuous learning."""
    total_predictions: int
    corrected_predictions: int
    correction_rate: float  # % of predictions corrected
    accuracy_with_corrections: Optional[float]
    last_retrain: Optional[str]
    models_trained: int


@router.post("/correct/{prediction_id}")
def correct_prediction(
    prediction_id: UUID,
    correction: CorrectPredictionRequest,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_active_user),
):
    """
    Analyst marks a prediction as correct/incorrect and provides actual label.

    Example:
    ```json
    {
        "actual_label": "DoS",
        "is_correct": false,
        "notes": "Model missed SYN flood - flag was S0 with serror_rate 0.95"
    }
    ```
    """
    # Find prediction
    threat_log = db.query(ThreatLog).filter(ThreatLog.id == prediction_id).first()
    if not threat_log:
        raise HTTPException(status_code=404, detail="Prediction not found")

    # Update with correction
    threat_log.actual_label = correction.actual_label
    threat_log.is_prediction_correct = correction.is_correct
    threat_log.label_corrected_at = datetime.utcnow()
    threat_log.corrected_by = current_user.username
    threat_log.correction_notes = correction.notes

    db.add(threat_log)
    db.commit()
    db.refresh(threat_log)

    return {
        "id": threat_log.id,
        "model_predicted": threat_log.label,
        "actual_label": threat_log.actual_label,
        "was_correct": threat_log.is_prediction_correct,
        "corrected_at": threat_log.label_corrected_at,
        "message": f"Prediction corrected: {threat_log.label} -> {correction.actual_label}",
    }


@router.get("/corrections/stats")
def get_correction_stats(
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_active_user),
):
    """
    Get statistics on analyst corrections and model accuracy.

    Shows:
    - How many predictions have been corrected
    - Which threats are most often misclassified
    - Model accuracy with corrections applied
    """
    total = db.query(func.count(ThreatLog.id)).scalar() or 0
    corrected = db.query(func.count(ThreatLog.id)).filter(
        ThreatLog.actual_label.isnot(None)
    ).scalar() or 0

    # Accuracy with corrections
    correct_preds = db.query(func.count(ThreatLog.id)).filter(
        ThreatLog.is_prediction_correct == True
    ).scalar() or 0

    accuracy = (correct_preds / corrected * 100) if corrected > 0 else 0

    # Most often misclassified
    misclassified = db.query(
        ThreatLog.label,  # What model predicted
        ThreatLog.actual_label,  # What it actually was
        func.count(ThreatLog.id).label("count")
    ).filter(
        ThreatLog.is_prediction_correct == False
    ).group_by(
        ThreatLog.label,
        ThreatLog.actual_label
    ).order_by(
        desc(func.count(ThreatLog.id))
    ).limit(10).all()

    return {
        "total_predictions": total,
        "corrected_predictions": corrected,
        "correction_rate": round(corrected / total * 100, 2) if total > 0 else 0,
        "accuracy_with_corrections": round(accuracy, 2),
        "top_misclassifications": [
            {
                "model_predicted": row[0],
                "actual_label": row[1],
                "count": row[2],
            }
            for row in misclassified
        ],
    }


@router.get("/predictions/awaiting-review")
def get_predictions_awaiting_review(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_active_user),
):
    """Get recent predictions awaiting analyst correction/review."""
    predictions = db.query(ThreatLog).filter(
        ThreatLog.actual_label.is_(None)  # Not yet corrected
    ).order_by(
        desc(ThreatLog.timestamp)
    ).limit(limit).all()

    return {
        "count": len(predictions),
        "predictions": [
            {
                "id": str(p.id),
                "timestamp": p.timestamp,
                "model_predicted": p.label,
                "model_confidence": p.confidence,
                "src_ip": p.src_ip,
                "dst_ip": p.dst_ip,
            }
            for p in predictions
        ],
    }


@router.get("/corrections/recent")
def get_recent_corrections(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_active_user),
):
    """Get recent analyst corrections for review."""
    corrections = db.query(ThreatLog).filter(
        ThreatLog.actual_label.isnot(None)
    ).order_by(
        desc(ThreatLog.label_corrected_at)
    ).limit(limit).all()

    return {
        "count": len(corrections),
        "corrections": [
            {
                "id": str(c.id),
                "timestamp": c.timestamp,
                "model_predicted": c.label,
                "model_confidence": c.confidence,
                "actual_label": c.actual_label,
                "was_correct": c.is_prediction_correct,
                "corrected_by": c.corrected_by,
                "notes": c.correction_notes,
            }
            for c in corrections
        ],
    }


@router.get("/data-for-retrain")
def get_training_data_status(
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_active_user),
):
    """
    Get status of data available for retraining.

    Shows how many labeled samples we have for continuous learning.
    """
    # Total labeled samples
    labeled = db.query(func.count(ThreatLog.id)).filter(
        ThreatLog.actual_label.isnot(None)
    ).scalar() or 0

    # By threat type
    by_label = db.query(
        ThreatLog.actual_label,
        func.count(ThreatLog.id).label("count")
    ).filter(
        ThreatLog.actual_label.isnot(None)
    ).group_by(
        ThreatLog.actual_label
    ).order_by(
        desc(func.count(ThreatLog.id))
    ).all()

    return {
        "total_labeled_samples": labeled,
        "ready_for_retrain": labeled >= 50,  # Need minimum samples
        "distribution": {
            row[0]: row[1] for row in by_label
        },
        "recommendation": (
            "Ready to retrain!" if labeled >= 50
            else f"Need {50 - labeled} more labeled samples"
        ),
    }


def get_current_model_accuracy():
    """Load accuracy from current model metadata."""
    try:
        model_dir = os.environ.get("MODEL_DIR", "app/shared-models")
        metadata_path = Path(model_dir) / "nids_xgb_mega_2000_2026_metadata.json"

        if metadata_path.exists():
            with open(metadata_path) as f:
                metadata = json.load(f)
                return metadata.get("test_accuracy", 0.9592)
    except:
        pass
    return 0.9592  # Default fallback


@router.get("/test-endpoint")
def test_endpoint():
    """Simple test endpoint to verify routing works."""
    return {"status": "test endpoint works", "message": "Router is functional"}


@router.post("/trigger-retrain")
def trigger_retrain(
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_active_user),
):
    """
    [ADMIN ONLY] Manually trigger retraining pipeline.

    In production, use: docker exec nids-backend python scripts/retrain_from_production.py
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Superuser only")

    import subprocess
    from datetime import datetime as dt
    import time

    try:
        # Record accuracy before retraining
        accuracy_before = get_current_model_accuracy()

        # Count corrections that will be used for training
        corrections_used = db.query(func.count(ThreatLog.id)).filter(
            ThreatLog.actual_label.isnot(None)
        ).scalar() or 0

        # Create retraining history record
        retrain_record = RetrainingHistory(
            triggered_by=current_user.username,
            accuracy_before=accuracy_before,
            model_version_before="nids_xgb_mega_2000_2026",
            corrections_used=corrections_used,
            status="training",
        )
        db.add(retrain_record)
        db.commit()

        start_time = time.time()

        # Execute retraining
        result = subprocess.run(
            ["python", "scripts/retrain_from_production.py"],
            capture_output=True,
            text=True,
            timeout=300,
        )

        training_duration = int(time.time() - start_time)

        # Update retraining record with results
        if result.returncode == 0:
            # Get new accuracy from metadata (if retrain updated it)
            accuracy_after = get_current_model_accuracy()
            improvement = ((accuracy_after - accuracy_before) / accuracy_before * 100) if accuracy_before > 0 else 0

            retrain_record.success = True
            retrain_record.status = "completed"
            retrain_record.accuracy_after = accuracy_after
            retrain_record.model_version_after = "nids_xgb_mega_2000_2026"
            retrain_record.improvement = improvement
            retrain_record.completed_at = dt.utcnow()
            retrain_record.training_duration_seconds = training_duration
        else:
            retrain_record.success = False
            retrain_record.status = "failed"
            retrain_record.error_message = result.stderr[-500:] if result.stderr else "Unknown error"
            retrain_record.completed_at = dt.utcnow()

        db.add(retrain_record)
        db.commit()

        return {
            "status": "success" if result.returncode == 0 else "failed",
            "exit_code": result.returncode,
            "output": result.stdout[-500:],  # Last 500 chars
            "message": "Retraining pipeline executed",
            "retrain_id": str(retrain_record.id),
            "accuracy_before": round(accuracy_before * 100, 2),
            "accuracy_after": round(get_current_model_accuracy() * 100, 2) if result.returncode == 0 else None,
            "improvements_used": corrections_used,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Retrain failed: {str(e)}")


@router.get("/history")
def get_retraining_history(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_active_user),
):
    """
    Get retraining history with model improvement metrics.

    Shows:
    - When each retrain was triggered
    - Accuracy before/after each retrain
    - How many corrections were used
    - Overall improvement trend
    """
    history = db.query(RetrainingHistory).order_by(
        desc(RetrainingHistory.triggered_at)
    ).limit(limit).all()

    return {
        "count": len(history),
        "retrains": [
            {
                "id": str(h.id),
                "triggered_at": h.triggered_at.isoformat(),
                "triggered_by": h.triggered_by,
                "accuracy_before": round(h.accuracy_before * 100, 2) if h.accuracy_before else None,
                "accuracy_after": round(h.accuracy_after * 100, 2) if h.accuracy_after else None,
                "improvement_percent": round(h.improvement, 2) if h.improvement else None,
                "corrections_used": h.corrections_used,
                "status": h.status,
                "success": h.success,
                "completed_at": h.completed_at.isoformat() if h.completed_at else None,
                "training_duration_seconds": h.training_duration_seconds,
            }
            for h in history
        ],
    }


@router.get("/latest-retrain")
def get_latest_retrain(
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_active_user),
):
    """
    Get latest retraining event details (for UI display).

    Returns data for showing:
    - Last retrain timestamp
    - Current model version
    - Accuracy improvement
    - Whether retrain is in progress
    """
    latest = db.query(RetrainingHistory).order_by(
        desc(RetrainingHistory.triggered_at)
    ).first()

    if not latest:
        # No retrains yet, return defaults
        return {
            "last_retrain": None,
            "current_model_version": "nids_xgb_mega_2000_2026",
            "current_accuracy": get_current_model_accuracy(),
            "status": "no_retrains_yet",
        }

    # Get current correction count
    corrections_now = db.query(func.count(ThreatLog.id)).filter(
        ThreatLog.actual_label.isnot(None)
    ).scalar() or 0

    return {
        "last_retrain_timestamp": latest.triggered_at.isoformat() if latest.triggered_at else None,
        "last_retrain_success": latest.success,
        "last_accuracy": round(latest.accuracy_after * 100, 2) if latest.accuracy_after else None,
        "improvement_percent": round(latest.improvement, 2) if latest.improvement else None,
        "corrections_since_last_retrain": corrections_now,
        "corrections_used_in_last_retrain": latest.corrections_used,
        "current_model_version": "nids_xgb_mega_2000_2026",
        "current_accuracy": round(get_current_model_accuracy() * 100, 2),
        "status": "ready" if corrections_now >= 50 else "training",
        "message": f"Ready to retrain! {corrections_now} corrections available" if corrections_now >= 50 else f"Need {50 - corrections_now} more corrections to retrain",
    }

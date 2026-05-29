"""
Settings endpoint — GET and POST for system configuration persistence.
Stores the full settings payload in a JSON file at data/nids_settings.json.
Falls back gracefully if the directory doesn't exist (returns defaults).
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Any, Dict, Optional
import json
import os
from pathlib import Path
from app.api import deps

router = APIRouter()

# ── Storage location ────────────────────────────────────────────────────────
_SETTINGS_PATH = Path(__file__).parents[5] / "data" / "nids_settings.json"

_DEFAULT_SETTINGS: Dict[str, Any] = {
    "networkConfig": {
        "interface": "eth0",
        "ip_address": "0.0.0.0",
        "port": 5000,
        "packet_buffer_size": 1000,
        "timeout": 30,
    },
    "alertThresholds": {
        "ddos_confidence": 0.88,
        "dos_confidence": 0.85,
        "probe_confidence": 0.80,
        "r2l_confidence": 0.90,
        "u2r_confidence": 0.95,
        "alert_cooldown": 5,
        "max_alerts_per_minute": 100,
    },
    "modelParams": {
        "n_estimators": 150,
        "max_depth": 8,
        "learning_rate": 0.1,
        "feature_threshold": 0.01,
        "auto_retrain": False,
        "retrain_interval": 604800,
    },
    "ipEntries": [],
    "notifConfig": {
        "discord_webhook": "",
        "notify_level": "critical",
        "min_confidence": 0.85,
    },
}


def _load() -> Dict[str, Any]:
    """Load settings from disk, return defaults if missing or corrupt."""
    try:
        if _SETTINGS_PATH.exists():
            with open(_SETTINGS_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return dict(_DEFAULT_SETTINGS)


def _save(payload: Dict[str, Any]) -> None:
    """Persist settings to disk; create parent directories if needed."""
    try:
        _SETTINGS_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(_SETTINGS_PATH, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)
    except Exception:
        pass  # Silent fallback — frontend localStorage is the source of truth


class SettingsPayload(BaseModel):
    networkConfig: Optional[Dict[str, Any]] = None
    alertThresholds: Optional[Dict[str, Any]] = None
    modelParams: Optional[Dict[str, Any]] = None
    ipEntries: Optional[list] = None
    notifConfig: Optional[Dict[str, Any]] = None
    savedAt: Optional[str] = None


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("")
@router.get("/")
async def get_settings(
    current_user=Depends(deps.get_current_active_user),
):
    """Return the currently persisted settings (or defaults if none saved)."""
    return _load()


@router.post("")
@router.post("/")
async def save_settings(
    payload: SettingsPayload,
    current_user=Depends(deps.get_current_active_user),
):
    """Persist the full settings payload to disk."""
    existing = _load()
    # Merge provided fields on top of existing, preserving unset sections
    data = dict(existing)
    if payload.networkConfig   is not None: data["networkConfig"]   = payload.networkConfig
    if payload.alertThresholds is not None: data["alertThresholds"] = payload.alertThresholds
    if payload.modelParams     is not None: data["modelParams"]     = payload.modelParams
    if payload.ipEntries       is not None: data["ipEntries"]       = payload.ipEntries
    if payload.notifConfig     is not None: data["notifConfig"]     = payload.notifConfig
    if payload.savedAt         is not None: data["savedAt"]         = payload.savedAt

    _save(data)
    return {"status": "saved", "savedAt": payload.savedAt}

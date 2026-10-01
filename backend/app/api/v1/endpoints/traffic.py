from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends
from typing import List
from pydantic import BaseModel
from sqlalchemy.orm import Session
import requests

from app.core.security import decode_token
from app.core.config import settings
from app.db.session import get_db
from app.models.models import ThreatLog
from app.api import deps

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                pass

manager = ConnectionManager()

class PacketLog(BaseModel):
    timestamp: float
    src_ip: str
    dst_ip: str
    protocol: str
    length: int
    label: str
    confidence: float
    is_threat: bool

def send_discord_alert(packet):
    """Sends a critical alert to Discord via Webhook"""
    if not settings.DISCORD_WEBHOOK_URL:
        return
    embed = {
        "title": f"🚨 CRITICAL ALERT: {packet.label}",
        "color": 16711680,
        "description": "The NIDS Sentinel detected a high-confidence critical threat.",
        "fields": [
            {"name": "Source IP", "value": packet.src_ip, "inline": True},
            {"name": "Target IP", "value": packet.dst_ip, "inline": True},
            {"name": "Protocol", "value": packet.protocol, "inline": True},
            {"name": "AI Confidence", "value": f"{packet.confidence}%", "inline": True}
        ],
        "footer": {"text": "NIDS Sentinel Automated Alerting"}
    }
    try:
        requests.post(settings.DISCORD_WEBHOOK_URL, json={"embeds": [embed]}, timeout=2)
    except Exception:
        pass

@router.post("/log")
async def log_packet(packet: PacketLog, db: Session = Depends(get_db)):
    if packet.is_threat:
        log_entry = ThreatLog(
            src_ip=packet.src_ip,
            dst_ip=packet.dst_ip,
            protocol=packet.protocol,
            label=packet.label,
            confidence=packet.confidence,
            is_blocked=False
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        if packet.label in ["U2R (Root Access)", "DDoS (Ping of Death)"] and packet.confidence >= 95.0:
            send_discord_alert(packet)
    await manager.broadcast(packet.model_dump_json())
    return {"status": "success", "message": "Packet logged"}

@router.websocket("/stream")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(default=None)):
    """JWT-protected WebSocket. Client must pass ?token=<jwt> in the URL."""
    if not token:
        await websocket.close(code=4001, reason="Missing token")
        return
    payload = decode_token(token)
    if not payload:
        await websocket.close(code=4003, reason="Invalid or expired token")
        return
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@router.get("/timeline")
def timeline(current_user = Depends(deps.get_current_active_user)):
    return {"timeline": [{"time": "01:00", "alerts": 5}, {"time": "02:00", "alerts": 3}]}

@router.get("/stats")
def stats(current_user = Depends(deps.get_current_active_user)):
    return {"total_packets": 2847, "threats_detected": 147, "accuracy": 76.25}

@router.get("/alerts")
def alerts(current_user = Depends(deps.get_current_active_user)):
    return {"alerts": [{"id": 1, "type": "Port scan", "severity": "high", "ip": "192.168.1.100"}]}

@router.get("/today-stats")
def today_stats(current_user = Depends(deps.get_current_active_user)):
    return {"today_packets": 512, "today_threats": 42}

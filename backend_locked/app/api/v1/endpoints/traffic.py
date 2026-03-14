from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
import asyncio
import json
import random
from typing import List
from app.core.security import decode_token

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

from pydantic import BaseModel
from sqlalchemy.orm import Session
from fastapi import Depends
from app.db.session import get_db
from app.models.models import ThreatLog
import time

class PacketLog(BaseModel):
    timestamp: float
    src_ip: str
    dst_ip: str
    protocol: str
    length: int
    label: str
    confidence: float
    is_threat: bool

import requests
from app.core.config import settings

def send_discord_alert(packet):
    """Sends a critical alert to Discord via Webhook"""
    if not settings.DISCORD_WEBHOOK_URL:
        return
        
    embed = {
        "title": f"🚨 CRITICAL ALERT: {packet.label}",
        "color": 16711680, # Red
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
    except Exception as e:
        print(f"Webhook Failed: {e}")

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
        
        # Fire critical alerts securely via webhook (only for extreme severity: Root Action or Huge DDoS > 95%)
        if packet.label in ["U2R (Root Access)", "DDoS (Ping of Death)"] and packet.confidence >= 95.0:
            send_discord_alert(packet)

    # Broadcast to all connected websocket clients
    await manager.broadcast(packet.model_dump_json())
    return {"status": "success", "message": "Packet logged"}

@router.websocket("/stream")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(default=None)):
    """JWT-protected WebSocket. Client must pass ?token=<jwt> in the URL."""
    if not token:
        await websocket.close(code=4001, reason="Missing token")
        return
    
    print(f"DEBUG: WebSocket connection attempt with token: {token[:10]}...")
    payload = decode_token(token)
    if not payload:
        print("DEBUG: WebSocket auth failed: Invalid or expired token")
        await websocket.close(code=4003, reason="Invalid or expired token")
        return

    print(f"DEBUG: WebSocket authenticated for user: {payload.get('sub')}")
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection open; data arrives via POST→broadcast
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

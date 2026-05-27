from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
import asyncio
import json
import logging
import random
from typing import List
from app.core.security import decode_token

logger = logging.getLogger(__name__)
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
        logger.warning("Discord webhook failed: %s", e)

@router.post("/log")
async def log_packet(
    packet: PacketLog,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_active_user),
):
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
    
    payload = decode_token(token)
    if not payload:
        await websocket.close(code=4003, reason="Invalid or expired token")
        return
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection open; data arrives via POST→broadcast
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

import uuid
import os
import shutil
from fastapi import File, UploadFile
from app.services.pcap_service import pcap_analyzer
from app.api import deps

@router.post("/upload-pcap")
async def upload_pcap(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_active_user)
):
    """Securely upload and analyze a PCAP file for historical threats."""
    if not file.filename.endswith('.pcap'):
        return {"error": "Only .pcap files are supported"}
    
    # Save temp file in system temp dir, not CWD
    import tempfile
    tmp = tempfile.NamedTemporaryFile(suffix=".pcap", delete=False)
    temp_path = tmp.name
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        results = pcap_analyzer.analyze(temp_path, db)
        return {
            "status": "completed",
            "filename": file.filename,
            "analysis": results
        }
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

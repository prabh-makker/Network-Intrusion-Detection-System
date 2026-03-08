from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio
import json
import random
from typing import List

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

@router.post("/log")
async def log_packet(packet: PacketLog, db: Session = Depends(get_db)):
    # Save to database if it's a threat
    if True: # Let's save all for now or just threats. Let's do threats only to save space.
        pass
        
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

    # Broadcast to all connected websocket clients
    await manager.broadcast(packet.json())
    return {"status": "success", "message": "Packet logged"}

@router.websocket("/stream")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection open, wait for incoming messages if any, 
            # but primary data comes from the POST endpoint broadcast.
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

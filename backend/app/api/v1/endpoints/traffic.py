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

def generate_mock_packet():
    # Mocking a classified network packet
    protocols = ["TCP", "UDP", "ICMP"]
    labels = ["Normal", "Normal", "Normal", "DDoS", "Port Scan", "SQL Injection", "Normal"]
    
    src_ip = f"192.168.1.{random.randint(1, 255)}"
    dst_ip = f"10.0.0.{random.randint(1, 255)}"
    label = random.choice(labels)
    
    return {
        "timestamp": asyncio.get_event_loop().time(),
        "src_ip": src_ip,
        "dst_ip": dst_ip,
        "protocol": random.choice(protocols),
        "length": random.randint(40, 1500),
        "label": label,
        "confidence": round(random.uniform(0.7, 0.99) if label != "Normal" else 0.99, 2),
        "is_threat": label != "Normal"
    }

@router.websocket("/stream")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Simulate streaming network packets at 1-2 packets per second
            await asyncio.sleep(random.uniform(0.5, 1.5))
            packet = generate_mock_packet()
            await manager.broadcast(json.dumps(packet))
    except WebSocketDisconnect:
        manager.disconnect(websocket)

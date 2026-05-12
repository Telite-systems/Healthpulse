# ============================================
# WebSocket Route
# Real-time event broadcasting via WebSocket
# ============================================

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List, Dict, Set
import asyncio
import json
import random
import time
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["WebSocket"])


class ConnectionManager:
    """Manages active WebSocket connections and broadcasts events."""

    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self._running = False

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """Send message to all connected clients."""
        dead = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead.append(connection)
        for d in dead:
            self.disconnect(d)


manager = ConnectionManager()

# Event templates matching the frontend's WSEvent format
EVENT_TEMPLATES = [
    {"type": "vital_update", "title": "Vitals Updated", "message": "Patient John Anderson — BP: 138/88, HR: 76 bpm", "severity": "info"},
    {"type": "vital_update", "title": "Abnormal Vitals", "message": "Patient Robert Chen — BP: 165/95 ⚠️ Above threshold", "severity": "warning"},
    {"type": "appointment_update", "title": "Appointment Check-in", "message": "Maria Garcia has checked in for Dr. Anna Lee", "severity": "info"},
    {"type": "appointment_update", "title": "Appointment Delayed", "message": "Dr. Raj Patel running 15 min behind schedule", "severity": "warning"},
    {"type": "patient_alert", "title": "New Patient Registered", "message": "Patient Alex Rivera — Emergency Department", "severity": "info"},
    {"type": "patient_alert", "title": "Patient Discharged", "message": "Emily Davis discharged from Pediatrics", "severity": "success"},
    {"type": "billing_event", "title": "Payment Received", "message": "$495 payment from Robert Chen — Card ending 4582", "severity": "success"},
    {"type": "billing_event", "title": "Insurance Claim Filed", "message": "Claim #IC-4821 for David Kim submitted to BlueCross", "severity": "info"},
    {"type": "system_event", "title": "System Backup", "message": "Daily backup completed — 1.2GB synced", "severity": "success"},
    {"type": "system_event", "title": "Server Load", "message": "CPU load at 72% — Auto-scaling triggered", "severity": "warning"},
    {"type": "staff_status", "title": "Doctor Available", "message": "Dr. Michael Torres is now back from leave", "severity": "success"},
    {"type": "staff_status", "title": "Shift Change", "message": "Night shift handover complete — 12 staff on duty", "severity": "info"},
    {"type": "vital_update", "title": "Critical Alert", "message": "ICU Bed 7 — Patient heart rate dropped to 48 bpm", "severity": "critical"},
    {"type": "patient_alert", "title": "Lab Results Ready", "message": "Complete blood panel ready for Lisa Thompson", "severity": "info"},
    {"type": "billing_event", "title": "Invoice Overdue", "message": "Invoice B005 — David Kim — $880 overdue by 3 days", "severity": "warning"},
]


async def event_generator():
    """Background task that generates random events and broadcasts them."""
    while True:
        if manager.active_connections:
            template = random.choice(EVENT_TEMPLATES)
            event = {
                **template,
                "id": f"ws_{int(time.time() * 1000)}_{random.randint(1000, 9999)}",
                "timestamp": int(time.time() * 1000),
            }
            await manager.broadcast(event)
        delay = 4 + random.random() * 12  # 4-16 seconds
        await asyncio.sleep(delay)


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time events."""
    await manager.connect(websocket)
    try:
        while True:
            # Listen for client messages (heartbeat, etc.)
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await websocket.send_json({"type": "pong", "timestamp": int(time.time() * 1000)})
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)

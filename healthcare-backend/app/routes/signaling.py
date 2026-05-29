# ============================================
# Call Signaling WebSocket Route
# ============================================
# Each user connects to /ws/call/{user_id}
# Server routes call signals directly between users by ID.
# This enables real cross-browser, cross-device video/voice calls.
# ============================================

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Optional
import json
import time
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Call Signaling"])


class SignalingManager:
    """
    Registry of connected users and their WebSockets.
    Routes call signals (initiate / accept / reject / end) between users.
    """

    def __init__(self):
        # user_id → WebSocket
        self._connections: Dict[str, WebSocket] = {}
        # user_id → display name (for logging)
        self._names: Dict[str, str] = {}

    async def connect(self, user_id: str, user_name: str, websocket: WebSocket):
        await websocket.accept()
        self._connections[user_id] = websocket
        self._names[user_id] = user_name
        logger.info(f"📞 Call WS connected: {user_name} ({user_id}). Online: {list(self._names.values())}")

    def disconnect(self, user_id: str):
        self._connections.pop(user_id, None)
        name = self._names.pop(user_id, user_id)
        logger.info(f"📴 Call WS disconnected: {name} ({user_id}). Online: {list(self._names.values())}")

    async def send_to(self, target_id: str, message: dict) -> bool:
        """Send a message to a specific user. Returns True if delivered."""
        ws = self._connections.get(target_id)
        if not ws:
            return False
        try:
            await ws.send_json(message)
            return True
        except Exception as e:
            logger.warning(f"Failed to send to {target_id}: {e}")
            self.disconnect(target_id)
            return False

    def is_online(self, user_id: str) -> bool:
        return user_id in self._connections

    def online_users(self) -> list:
        return list(self._names.items())


signaling = SignalingManager()


@router.websocket("/ws/call/{user_id}")
async def call_signaling_endpoint(
    websocket: WebSocket,
    user_id: str,
    user_name: Optional[str] = "Unknown"
):
    """
    Per-user call signaling WebSocket.

    Connect as: ws://<host>/ws/call/<user_id>?user_name=<name>

    Message types sent BY client:
      call_initiate  → { type, callId, callerId, callerName, callerRole, callerAvatar,
                          targetId, targetName, callType, zegoRoomID, startedAt }
      call_accept    → { type, callId, zegoRoomID, targetId (= original callerId) }
      call_reject    → { type, callId, targetId }
      call_end       → { type, callId, targetId }
      ping           → { type: "ping" }

    Messages RECEIVED by client from server:
      Same shapes, forwarded from the other party + server-side fields:
        delivered: true/false (for call_initiate — was target online?)
    """
    await signaling.connect(user_id, user_name, websocket)
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg: dict = json.loads(raw)
            except json.JSONDecodeError:
                continue

            msg_type = msg.get("type", "")

            # ── Heartbeat ──────────────────────────────────────────────────
            if msg_type == "ping":
                await websocket.send_json({"type": "pong", "timestamp": int(time.time() * 1000)})
                continue

            # ── Call initiate — route to target ────────────────────────────
            if msg_type == "call_initiate":
                target_id = msg.get("targetId", "")
                delivered = await signaling.send_to(target_id, {**msg, "serverTs": int(time.time() * 1000)})
                # Tell caller if the target is online
                await websocket.send_json({
                    "type": "call_status",
                    "callId": msg.get("callId"),
                    "delivered": delivered,
                    "targetOnline": signaling.is_online(target_id),
                    "serverTs": int(time.time() * 1000),
                })
                logger.info(f"📲 {msg.get('callerName')} → {msg.get('targetName')} | delivered={delivered}")

            # ── Accept / Reject / End — route back to original caller ───────
            elif msg_type in ("call_accept", "call_reject", "call_end"):
                target_id = msg.get("targetId", "")
                await signaling.send_to(target_id, {**msg, "serverTs": int(time.time() * 1000)})
                logger.info(f"📡 Signal '{msg_type}' routed to {target_id}")

    except WebSocketDisconnect:
        signaling.disconnect(user_id)
    except Exception as e:
        logger.error(f"Call WS error ({user_id}): {e}")
        signaling.disconnect(user_id)


@router.get("/api/call/online", tags=["Call Signaling"])
async def get_online_users():
    """List currently connected users (for debugging)."""
    return {"online": signaling.online_users(), "count": len(signaling.online_users())}

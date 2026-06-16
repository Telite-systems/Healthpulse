# ============================================
# Notification Model
# ============================================

from pydantic import BaseModel
from typing import Literal, Optional
from app.models.base import MongoBaseModel


class NotificationModel(MongoBaseModel):
    """Notification document model."""
    title: str
    message: str
    type: Literal["info", "success", "warning", "error"] = "info"
    time: str = ""
    read: bool = False
    # ---- Actionable notification fields (optional, backward-compatible) ----
    recipientId: Optional[str] = None       # Target user ID
    recipientName: Optional[str] = None     # Target user name (fallback matching)
    actionType: Optional[str] = None        # e.g. "view_followup", "review_reschedule"
    actionTargetId: Optional[str] = None    # ID of the target entity (e.g. followup ID)


class NotificationCreate(BaseModel):
    """Schema for creating a notification."""
    id: Optional[str] = None
    title: str
    message: str
    type: Literal["info", "success", "warning", "error"] = "info"
    time: str = ""
    read: bool = False
    # ---- Actionable notification fields (optional, backward-compatible) ----
    recipientId: Optional[str] = None
    recipientName: Optional[str] = None
    actionType: Optional[str] = None
    actionTargetId: Optional[str] = None


class NotificationUpdate(BaseModel):
    """Schema for updating a notification."""
    title: Optional[str] = None
    message: Optional[str] = None
    type: Optional[Literal["info", "success", "warning", "error"]] = None
    read: Optional[bool] = None

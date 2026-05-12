# ============================================
# Notification Model
# ============================================

from pydantic import BaseModel, Field
from typing import Literal, Optional
from app.models.base import MongoBaseModel


class NotificationModel(MongoBaseModel):
    """Notification document model."""
    title: str
    message: str
    type: Literal["info", "success", "warning", "error"] = "info"
    time: str = ""
    read: bool = False


class NotificationCreate(BaseModel):
    """Schema for creating a notification."""
    id: Optional[str] = None
    title: str
    message: str
    type: Literal["info", "success", "warning", "error"] = "info"
    time: str = ""
    read: bool = False


class NotificationUpdate(BaseModel):
    """Schema for updating a notification."""
    title: Optional[str] = None
    message: Optional[str] = None
    type: Optional[Literal["info", "success", "warning", "error"]] = None
    read: Optional[bool] = None

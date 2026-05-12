# ============================================
# Staff Model
# ============================================

from pydantic import BaseModel, Field
from typing import Literal, Optional
from app.models.base import MongoBaseModel


class StaffModel(MongoBaseModel):
    """Staff document model."""
    name: str
    role: str
    department: str
    contact: str
    email: str
    joinDate: str
    status: Literal["Active", "Inactive"] = "Active"


class StaffCreate(BaseModel):
    """Schema for creating a new staff member."""
    id: Optional[str] = None
    name: str = Field(..., min_length=2)
    role: str
    department: str
    contact: str
    email: str
    joinDate: Optional[str] = None
    status: Literal["Active", "Inactive"] = "Active"


class StaffUpdate(BaseModel):
    """Schema for updating staff."""
    name: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    contact: Optional[str] = None
    email: Optional[str] = None
    joinDate: Optional[str] = None
    status: Optional[Literal["Active", "Inactive"]] = None

# ============================================
# Doctor Model
# ============================================

from pydantic import BaseModel, Field
from typing import Literal, Optional
from app.models.base import MongoBaseModel


class DoctorModel(MongoBaseModel):
    """Doctor document model."""
    name: str
    specialization: str
    contact: str
    email: str
    experience: int = Field(..., ge=0)
    department: str
    availability: str
    status: Literal["Available", "On Leave", "Busy"] = "Available"


class DoctorCreate(BaseModel):
    """Schema for creating a new doctor."""
    id: Optional[str] = None
    name: str = Field(..., min_length=2)
    specialization: str
    contact: str
    email: str
    experience: int = Field(..., ge=0)
    department: str
    availability: str
    status: Literal["Available", "On Leave", "Busy"] = "Available"


class DoctorUpdate(BaseModel):
    """Schema for updating a doctor."""
    name: Optional[str] = None
    specialization: Optional[str] = None
    contact: Optional[str] = None
    email: Optional[str] = None
    experience: Optional[int] = Field(None, ge=0)
    department: Optional[str] = None
    availability: Optional[str] = None
    status: Optional[Literal["Available", "On Leave", "Busy"]] = None

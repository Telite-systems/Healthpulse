# ============================================
# Appointment Model
# ============================================

from pydantic import BaseModel, Field
from typing import Literal, Optional
from app.models.base import MongoBaseModel


class AppointmentModel(MongoBaseModel):
    """Appointment document model."""
    patientName: str
    doctorName: str
    department: str
    date: str
    time: str
    status: Literal["Scheduled", "Completed", "Cancelled", "In Progress"] = "Scheduled"
    type: Literal["Consultation", "Follow-up", "Emergency"] = "Consultation"
    notes: str = ""
    createdAt: Optional[str] = None


class AppointmentCreate(BaseModel):
    """Schema for creating a new appointment."""
    id: Optional[str] = None
    patientName: str
    doctorName: str
    department: str
    date: str
    time: str
    status: Literal["Scheduled", "Completed", "Cancelled", "In Progress"] = "Scheduled"
    type: Literal["Consultation", "Follow-up", "Emergency"] = "Consultation"
    notes: str = ""
    createdAt: Optional[str] = None


class AppointmentUpdate(BaseModel):
    """Schema for updating an appointment."""
    patientName: Optional[str] = None
    doctorName: Optional[str] = None
    department: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    status: Optional[Literal["Scheduled", "Completed", "Cancelled", "In Progress"]] = None
    type: Optional[Literal["Consultation", "Follow-up", "Emergency"]] = None
    notes: Optional[str] = None

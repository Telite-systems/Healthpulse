# ============================================
# Appointment Model
# ============================================

from pydantic import BaseModel
from typing import Literal, Optional
from app.models.base import MongoBaseModel


class AppointmentModel(MongoBaseModel):
    """Appointment document model."""
    patientName: str
    patientId: Optional[str] = None
    doctorName: str
    doctorId: Optional[str] = None
    department: str
    date: str
    time: str
    status: Literal["Pending", "Confirmed", "Completed", "Cancelled", "Scheduled", "In Progress"] = "Pending"
    type: Literal["Consultation", "Follow-up", "Emergency"] = "Consultation"
    notes: str = ""
    createdAt: Optional[str] = None


class AppointmentCreate(BaseModel):
    """Schema for creating a new appointment."""
    id: Optional[str] = None
    patientName: str
    patientId: Optional[str] = None
    doctorName: str
    doctorId: Optional[str] = None
    department: str
    date: str
    time: str
    status: Literal["Pending", "Confirmed", "Completed", "Cancelled", "Scheduled", "In Progress"] = "Pending"
    type: Literal["Consultation", "Follow-up", "Emergency"] = "Consultation"
    notes: str = ""
    createdAt: Optional[str] = None


class AppointmentUpdate(BaseModel):
    """Schema for updating an appointment."""
    patientName: Optional[str] = None
    patientId: Optional[str] = None
    doctorName: Optional[str] = None
    doctorId: Optional[str] = None
    department: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    status: Optional[Literal["Pending", "Confirmed", "Completed", "Cancelled", "Scheduled", "In Progress"]] = None
    type: Optional[Literal["Consultation", "Follow-up", "Emergency"]] = None
    notes: Optional[str] = None

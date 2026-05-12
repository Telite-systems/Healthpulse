# ============================================
# Prescription Model
# ============================================

from pydantic import BaseModel, Field
from typing import Literal, Optional
from app.models.base import MongoBaseModel


class PrescriptionModel(MongoBaseModel):
    """Prescription document model."""
    patientName: str
    doctorName: str
    date: str
    medications: str
    dosage: str
    duration: str
    instructions: str
    status: Literal["Active", "Completed", "Expired"] = "Active"
    createdAt: Optional[str] = None


class PrescriptionCreate(BaseModel):
    """Schema for creating a new prescription."""
    id: Optional[str] = None
    patientName: str
    doctorName: str
    date: str
    medications: str
    dosage: str
    duration: str
    instructions: str
    status: Literal["Active", "Completed", "Expired"] = "Active"
    createdAt: Optional[str] = None


class PrescriptionUpdate(BaseModel):
    """Schema for updating a prescription."""
    patientName: Optional[str] = None
    doctorName: Optional[str] = None
    date: Optional[str] = None
    medications: Optional[str] = None
    dosage: Optional[str] = None
    duration: Optional[str] = None
    instructions: Optional[str] = None
    status: Optional[Literal["Active", "Completed", "Expired"]] = None

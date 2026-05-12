# ============================================
# Patient Visit Model
# ============================================

from pydantic import BaseModel, Field
from typing import Literal, Optional, Dict
from app.models.base import MongoBaseModel


class VitalsModel(BaseModel):
    """Vitals sub-document."""
    bp: str = ""
    temp: str = ""
    pulse: str = ""
    weight: str = ""


class PatientVisitModel(MongoBaseModel):
    """Patient visit document model."""
    patientName: str
    doctorName: str
    visitDate: str
    diagnosis: str
    treatment: str
    followUpDate: str = ""
    status: Literal["Completed", "Pending", "Follow-up Required"] = "Pending"
    vitals: VitalsModel = VitalsModel()
    createdAt: Optional[str] = None


class VisitCreate(BaseModel):
    """Schema for creating a new visit."""
    id: Optional[str] = None
    patientName: str
    doctorName: str
    visitDate: str
    diagnosis: str
    treatment: str
    followUpDate: str = ""
    status: Literal["Completed", "Pending", "Follow-up Required"] = "Pending"
    vitals: Optional[VitalsModel] = VitalsModel()
    createdAt: Optional[str] = None


class VisitUpdate(BaseModel):
    """Schema for updating a visit."""
    patientName: Optional[str] = None
    doctorName: Optional[str] = None
    visitDate: Optional[str] = None
    diagnosis: Optional[str] = None
    treatment: Optional[str] = None
    followUpDate: Optional[str] = None
    status: Optional[Literal["Completed", "Pending", "Follow-up Required"]] = None
    vitals: Optional[VitalsModel] = None

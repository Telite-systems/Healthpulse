# ============================================
# Patient Model
# ============================================

from pydantic import BaseModel, Field
from typing import Literal, Optional
from app.models.base import MongoBaseModel


class PatientModel(MongoBaseModel):
    """Patient document model."""
    name: str
    age: int = Field(..., ge=0, le=150)
    gender: Literal["Male", "Female", "Other"]
    contact: str
    email: str
    address: str
    bloodGroup: str
    registeredDate: str
    status: Literal["Active", "Inactive"] = "Active"


class PatientCreate(BaseModel):
    """Schema for creating a new patient."""
    id: Optional[str] = None
    name: str = Field(..., min_length=2)
    age: int = Field(..., ge=0, le=150)
    gender: Literal["Male", "Female", "Other"]
    contact: str
    email: str
    address: str
    bloodGroup: str
    registeredDate: Optional[str] = None
    status: Literal["Active", "Inactive"] = "Active"


class PatientUpdate(BaseModel):
    """Schema for updating a patient."""
    name: Optional[str] = None
    age: Optional[int] = Field(None, ge=0, le=150)
    gender: Optional[Literal["Male", "Female", "Other"]] = None
    contact: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    bloodGroup: Optional[str] = None
    status: Optional[Literal["Active", "Inactive"]] = None

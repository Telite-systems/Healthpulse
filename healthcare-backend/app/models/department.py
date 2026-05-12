# ============================================
# Department Model
# ============================================

from pydantic import BaseModel, Field
from typing import Literal, Optional
from app.models.base import MongoBaseModel


class DepartmentModel(MongoBaseModel):
    """Department document model."""
    name: str
    head: str
    staffCount: int = Field(..., ge=0)
    location: str
    status: Literal["Active", "Inactive"] = "Active"


class DepartmentCreate(BaseModel):
    """Schema for creating a new department."""
    id: Optional[str] = None
    name: str = Field(..., min_length=2)
    head: str
    staffCount: int = Field(0, ge=0)
    location: str
    status: Literal["Active", "Inactive"] = "Active"


class DepartmentUpdate(BaseModel):
    """Schema for updating a department."""
    name: Optional[str] = None
    head: Optional[str] = None
    staffCount: Optional[int] = Field(None, ge=0)
    location: Optional[str] = None
    status: Optional[Literal["Active", "Inactive"]] = None

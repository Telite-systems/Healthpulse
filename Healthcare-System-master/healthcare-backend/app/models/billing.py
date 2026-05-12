# ============================================
# Billing Model
# ============================================

from pydantic import BaseModel, Field
from typing import Literal, Optional
from app.models.base import MongoBaseModel


class BillingModel(MongoBaseModel):
    """Billing document model."""
    patientName: str
    invoiceDate: str
    services: str
    amount: float = Field(..., ge=0)
    discount: float = Field(0, ge=0)
    tax: float = Field(0, ge=0)
    total: float = Field(..., ge=0)
    paymentMethod: Literal["Cash", "Card", "Insurance", "UPI"] = "Cash"
    status: Literal["Paid", "Pending", "Overdue"] = "Pending"
    createdAt: Optional[str] = None


class BillingCreate(BaseModel):
    """Schema for creating a new billing record."""
    id: Optional[str] = None
    patientName: str
    invoiceDate: str
    services: str
    amount: float = Field(..., ge=0)
    discount: float = Field(0, ge=0)
    tax: float = Field(0, ge=0)
    total: float = Field(..., ge=0)
    paymentMethod: Literal["Cash", "Card", "Insurance", "UPI"] = "Cash"
    status: Literal["Paid", "Pending", "Overdue"] = "Pending"
    createdAt: Optional[str] = None


class BillingUpdate(BaseModel):
    """Schema for updating a billing record."""
    patientName: Optional[str] = None
    invoiceDate: Optional[str] = None
    services: Optional[str] = None
    amount: Optional[float] = Field(None, ge=0)
    discount: Optional[float] = Field(None, ge=0)
    tax: Optional[float] = Field(None, ge=0)
    total: Optional[float] = Field(None, ge=0)
    paymentMethod: Optional[Literal["Cash", "Card", "Insurance", "UPI"]] = None
    status: Optional[Literal["Paid", "Pending", "Overdue"]] = None

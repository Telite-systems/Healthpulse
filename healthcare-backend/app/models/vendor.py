# ============================================
# Pharmacy Vendor, Medicine Order & Inventory Models
# ============================================

from pydantic import BaseModel
from typing import List, Literal, Optional, Dict, Any
from app.models.base import MongoBaseModel

# ─── Vendor Model ─────────────────────────────────────────────────────────────

class VendorModel(MongoBaseModel):
    """Pharmacy Vendor document model."""
    name: str
    username: str
    email: str
    contact: str
    address: str
    rating: float = 5.0
    distance: str = "0.0 km"
    deliveryTime: str = "20-30 min"
    status: Literal["Active", "Suspended"] = "Active"

class VendorCreate(BaseModel):
    """Schema for creating a new vendor."""
    id: Optional[str] = None
    name: str
    username: str
    email: str
    contact: str
    address: str
    rating: float = 5.0
    distance: str = "0.0 km"
    deliveryTime: str = "20-30 min"
    status: Literal["Active", "Suspended"] = "Active"

class VendorUpdate(BaseModel):
    """Schema for updating a vendor."""
    name: Optional[str] = None
    email: Optional[str] = None
    contact: Optional[str] = None
    address: Optional[str] = None
    rating: Optional[float] = None
    distance: Optional[str] = None
    deliveryTime: Optional[str] = None
    status: Optional[Literal["Active", "Suspended"]] = None


# ─── Medicine Order Model ─────────────────────────────────────────────────────

class MedicineItem(BaseModel):
    name: str
    quantity: int
    price: float
    instructions: Optional[str] = ""

class MedicineOrderModel(MongoBaseModel):
    """Medicine Order document model."""
    patientId: str
    patientName: str
    prescriptionId: Optional[str] = ""
    doctorId: Optional[str] = ""
    doctorName: Optional[str] = ""
    medicines: List[MedicineItem]
    instructions: Optional[str] = ""
    deliveryAddress: str
    contactNumber: str
    vendorId: str
    vendorName: str
    status: Literal[
        "Created", "Assigned", "Accepted", "Processing", 
        "Ready for Dispatch", "Out for Delivery", "Delivered", "Cancelled", "Rejected"
    ] = "Created"
    totalAmount: float
    deliveryEta: Optional[str] = "30-45 min"
    createdAt: Optional[str] = None
    prescriptionUrl: Optional[str] = None
    paymentMethod: Optional[Literal["UPI", "Card", "Net Banking", "COD", "Online"]] = "COD"
    paymentStatus: Optional[Literal["Pending", "Processing", "Paid", "Failed", "Expired", "Pending Verification"]] = "Pending"
    transactionId: Optional[str] = ""
    transactionDetails: Optional[Dict[str, Any]] = None
    deliveryCharges: Optional[float] = 0.0
    taxAmount: Optional[float] = 0.0
    grandTotal: Optional[float] = 0.0

class MedicineOrderCreate(BaseModel):
    """Schema for creating a new medicine order."""
    id: Optional[str] = None
    patientId: str
    patientName: str
    prescriptionId: Optional[str] = ""
    doctorId: Optional[str] = ""
    doctorName: Optional[str] = ""
    medicines: List[MedicineItem]
    instructions: Optional[str] = ""
    deliveryAddress: str
    contactNumber: str
    vendorId: str
    vendorName: str
    status: Literal[
        "Created", "Assigned", "Accepted", "Processing", 
        "Ready for Dispatch", "Out for Delivery", "Delivered", "Cancelled", "Rejected"
    ] = "Created"
    totalAmount: float
    deliveryEta: Optional[str] = "30-45 min"
    createdAt: Optional[str] = None
    prescriptionUrl: Optional[str] = None
    paymentMethod: Optional[Literal["UPI", "Card", "Net Banking", "COD", "Online"]] = "COD"
    paymentStatus: Optional[Literal["Pending", "Processing", "Paid", "Failed", "Expired", "Pending Verification"]] = "Pending"
    transactionId: Optional[str] = ""
    transactionDetails: Optional[Dict[str, Any]] = None
    deliveryCharges: Optional[float] = 0.0
    taxAmount: Optional[float] = 0.0
    grandTotal: Optional[float] = 0.0

class MedicineOrderUpdate(BaseModel):
    """Schema for updating an order's status or details."""
    status: Optional[Literal[
        "Created", "Assigned", "Accepted", "Processing", 
        "Ready for Dispatch", "Out for Delivery", "Delivered", "Cancelled", "Rejected"
    ]] = None
    deliveryEta: Optional[str] = None
    instructions: Optional[str] = None
    paymentStatus: Optional[Literal["Pending", "Processing", "Paid", "Failed", "Expired", "Pending Verification"]] = None
    transactionId: Optional[str] = None
    transactionDetails: Optional[Dict[str, Any]] = None
    deliveryCharges: Optional[float] = None
    taxAmount: Optional[float] = None
    grandTotal: Optional[float] = None


# ─── Vendor Inventory Model ───────────────────────────────────────────────────

class InventoryModel(MongoBaseModel):
    """Vendor Inventory item model."""
    vendorId: str
    medicineName: str
    sku: str
    quantity: int
    expiryDate: str
    price: float
    manufacturer: str
    category: Optional[str] = "General"
    description: Optional[str] = ""
    dosageInfo: Optional[str] = ""
    isPrescriptionRequired: Optional[bool] = False

class InventoryCreate(BaseModel):
    """Schema for adding new stock item."""
    id: Optional[str] = None
    vendorId: str
    medicineName: str
    sku: str
    quantity: int
    expiryDate: str
    price: float
    manufacturer: str
    category: Optional[str] = "General"
    description: Optional[str] = ""
    dosageInfo: Optional[str] = ""
    isPrescriptionRequired: Optional[bool] = False

class InventoryUpdate(BaseModel):
    """Schema for updating stock quantity or price."""
    quantity: Optional[int] = None
    price: Optional[float] = None
    expiryDate: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    dosageInfo: Optional[str] = None
    isPrescriptionRequired: Optional[bool] = None


# ─── Delivery Tracking Model (Readiness Architecture) ──────────────────────────

class DeliveryTrackingModel(MongoBaseModel):
    """Delivery tracking simulation model."""
    orderId: str
    status: str
    timestamp: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None


# ─── Vendor Analytics Model ───────────────────────────────────────────────────

class VendorAnalyticsModel(MongoBaseModel):
    """Vendor daily analytics statistics."""
    vendorId: str
    date: str
    dailyOrders: int = 0
    revenue: float = 0.0
    deliveryTimeAvg: float = 0.0
    fulfillmentRate: float = 100.0

from pydantic import BaseModel, Field
from typing import Optional
from app.models.base import MongoBaseModel
from datetime import datetime

class DeliveryTrackingModel(MongoBaseModel):
    """Data model for delivery tracking details."""
    order_id: str
    vendor_id: str
    patient_id: str
    delivery_partner_id: str
    delivery_partner_name: str
    delivery_partner_vehicle_type: str
    delivery_partner_vehicle_number: str
    delivery_partner_avatar: str
    delivery_partner_phone: str
    current_latitude: float
    current_longitude: float
    eta_minutes: int
    distance_remaining: float
    delivery_status: str
    last_updated: str
    delivery_completed_at: Optional[str] = None

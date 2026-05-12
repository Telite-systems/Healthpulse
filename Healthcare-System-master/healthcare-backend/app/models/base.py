# ============================================
# Base Model for all MongoDB documents
# ============================================

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class MongoBaseModel(BaseModel):
    """Base model that all MongoDB document models inherit from."""

    id: str = Field(..., description="Unique document identifier")
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }

    def to_mongo(self) -> dict:
        """Convert model to MongoDB document format."""
        data = self.model_dump(by_alias=True)
        data["_id"] = data.pop("id")
        return data

    @classmethod
    def from_mongo(cls, data: dict):
        """Create model instance from MongoDB document."""
        if not data:
            return None
        if "_id" in data:
            data["id"] = str(data.pop("_id"))
        return cls(**data)

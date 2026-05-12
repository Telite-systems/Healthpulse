# ============================================
# Generic CRUD Service
# Reusable async CRUD operations for any MongoDB collection
# ============================================

from typing import Optional, List, Dict, Any
from datetime import datetime
from app.database import database
import logging
import re

logger = logging.getLogger(__name__)


class CRUDService:
    """Generic async CRUD operations for MongoDB collections."""

    def __init__(self, collection_name: str):
        self.collection_name = collection_name

    @property
    def collection(self):
        return database.get_collection(self.collection_name)

    async def get_all(
        self,
        page: int = 1,
        page_size: int = 50,
        sort_field: str = "_id",
        sort_order: int = 1,
        filters: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of documents."""
        query = filters or {}
        skip = (page - 1) * page_size

        cursor = self.collection.find(query).sort(sort_field, sort_order).skip(skip).limit(page_size)
        items = []
        async for doc in cursor:
            doc["id"] = str(doc.pop("_id"))
            items.append(doc)

        total = await self.collection.count_documents(query)

        return {
            "data": items,
            "total": total,
            "page": page,
            "pageSize": page_size,
            "totalPages": max(1, -(-total // page_size)),  # ceil division
        }

    async def get_by_id(self, doc_id: str) -> Optional[Dict[str, Any]]:
        """Get a single document by ID."""
        doc = await self.collection.find_one({"_id": doc_id})
        if doc:
            doc["id"] = str(doc.pop("_id"))
        return doc

    async def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new document."""
        # Use the provided id as _id, or generate one
        if "id" in data:
            data["_id"] = data.pop("id")
        elif "_id" not in data:
            # Generate a sequential-style ID
            data["_id"] = await self._generate_id()

        now = datetime.utcnow().isoformat()
        data.setdefault("created_at", now)
        data["updated_at"] = now

        await self.collection.insert_one(data)
        data["id"] = str(data.pop("_id"))
        return data

    async def update(self, doc_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update a document by ID."""
        # Remove None values
        updates = {k: v for k, v in updates.items() if v is not None}
        if not updates:
            return await self.get_by_id(doc_id)

        updates["updated_at"] = datetime.utcnow().isoformat()

        result = await self.collection.find_one_and_update(
            {"_id": doc_id},
            {"$set": updates},
            return_document=True,
        )
        if result:
            result["id"] = str(result.pop("_id"))
        return result

    async def delete(self, doc_id: str) -> bool:
        """Delete a document by ID."""
        result = await self.collection.delete_one({"_id": doc_id})
        return result.deleted_count > 0

    async def search(self, query: str, fields: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """
        Search documents by matching query string against all string fields
        (or specified fields).
        """
        if not query:
            result = await self.get_all(page_size=100)
            return result["data"]

        # Build regex search across fields
        regex = re.compile(re.escape(query), re.IGNORECASE)

        if fields:
            or_conditions = [
                {field: {"$regex": regex}} for field in fields
            ]
        else:
            # Get a sample document to determine searchable fields
            sample = await self.collection.find_one()
            if not sample:
                return []
            string_fields = [k for k, v in sample.items() if isinstance(v, str) and k != "_id"]
            or_conditions = [
                {field: {"$regex": regex}} for field in string_fields
            ]

        if not or_conditions:
            return []

        cursor = self.collection.find({"$or": or_conditions}).limit(100)
        results = []
        async for doc in cursor:
            doc["id"] = str(doc.pop("_id"))
            results.append(doc)
        return results

    async def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """Count documents matching filter."""
        return await self.collection.count_documents(filters or {})

    async def _generate_id(self) -> str:
        """Generate a sequential ID based on collection prefix."""
        prefix_map = {
            "patients": "P",
            "doctors": "D",
            "staff": "S",
            "departments": "DEP",
            "appointments": "APT",
            "visits": "V",
            "billing": "B",
            "prescriptions": "RX",
            "notifications": "N",
            "users": "U",
        }
        prefix = prefix_map.get(self.collection_name, "DOC")
        count = await self.collection.count_documents({})
        return f"{prefix}{str(count + 1).zfill(3)}"


# Pre-built CRUD service instances for each collection
patients_service = CRUDService("patients")
doctors_service = CRUDService("doctors")
staff_service = CRUDService("staff")
departments_service = CRUDService("departments")
appointments_service = CRUDService("appointments")
visits_service = CRUDService("visits")
billing_service = CRUDService("billing")
prescriptions_service = CRUDService("prescriptions")
notifications_service = CRUDService("notifications")

# ============================================
# Follow-Up Service
# Core business logic for follow-up management
# ============================================

from typing import Optional, Dict, Any, List
from datetime import datetime
from app.database import database
from app.models.followup import VALID_TRANSITIONS
import logging

logger = logging.getLogger(__name__)

COLLECTION = "followups"


class FollowUpService:
    """Handles all follow-up business logic including status transitions and audit trails."""

    @property
    def collection(self):
        return database.get_collection(COLLECTION)

    # ---- ID Generation ----

    async def _generate_id(self) -> str:
        count = await self.collection.count_documents({})
        return f"FU{str(count + 1).zfill(3)}"

    # ---- Audit Trail ----

    @staticmethod
    def _audit_entry(
        user_id: str,
        user_name: str,
        action: str,
        previous_value: Optional[str] = None,
        new_value: Optional[str] = None,
    ) -> dict:
        """Create an immutable audit trail entry."""
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "userId": user_id,
            "userName": user_name,
            "action": action,
            "previousValue": previous_value,
            "newValue": new_value,
        }

    # ---- Status Transition Validation ----

    @staticmethod
    def validate_transition(current_status: str, new_status: str) -> bool:
        """Check if a status transition is valid according to the transition matrix."""
        allowed = VALID_TRANSITIONS.get(current_status, [])
        return new_status in allowed

    # ---- CRUD Operations ----

    async def create(self, data: Dict[str, Any], user_id: str, user_name: str) -> Dict[str, Any]:
        """Create a new follow-up with initial audit entry."""
        fu_id = await self._generate_id()
        now = datetime.utcnow().isoformat()

        doc = {
            "_id": fu_id,
            "patientId": data["patientId"],
            "patientName": data["patientName"],
            "doctorId": data["doctorId"],
            "doctorName": data["doctorName"],
            "department": data.get("department", ""),
            "originalAppointmentId": data.get("originalAppointmentId"),
            "followupType": data.get("followupType", "Physical Visit"),
            "priority": data.get("priority", "Normal"),
            "reason": data.get("reason", ""),
            "notes": data.get("notes", ""),
            "scheduledDate": data["scheduledDate"],
            "scheduledTime": data["scheduledTime"],
            "status": "Scheduled",
            "rescheduleRequest": None,
            "auditTrail": [
                self._audit_entry(user_id, user_name, "Follow-Up Created", None, "Scheduled")
            ],
            "created_at": now,
            "updated_at": now,
            "createdAt": now,
        }

        await self.collection.insert_one(doc)
        doc["id"] = str(doc.pop("_id"))
        logger.info(f"Follow-up created: {fu_id} for patient {data['patientName']} by {user_name}")
        return doc

    async def get_by_id(self, fu_id: str) -> Optional[Dict[str, Any]]:
        """Get a single follow-up by ID."""
        doc = await self.collection.find_one({"_id": fu_id})
        if doc:
            doc["id"] = str(doc.pop("_id"))
        return doc

    async def get_all(
        self,
        page: int = 1,
        page_size: int = 50,
        status_filter: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of all follow-ups."""
        query: Dict[str, Any] = {}
        if status_filter:
            query["status"] = status_filter

        skip = (page - 1) * page_size
        cursor = self.collection.find(query).sort("scheduledDate", -1).skip(skip).limit(page_size)

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
            "totalPages": max(1, -(-total // page_size)),
        }

    async def list_by_doctor(self, doctor_id: str) -> List[Dict[str, Any]]:
        """Get all follow-ups for a specific doctor."""
        cursor = self.collection.find({"doctorId": doctor_id}).sort("scheduledDate", -1)
        items = []
        async for doc in cursor:
            doc["id"] = str(doc.pop("_id"))
            items.append(doc)
        return items

    async def list_by_patient(self, patient_id: str) -> List[Dict[str, Any]]:
        """Get all follow-ups for a specific patient."""
        cursor = self.collection.find({"patientId": patient_id}).sort("scheduledDate", -1)
        items = []
        async for doc in cursor:
            doc["id"] = str(doc.pop("_id"))
            items.append(doc)
        return items

    # ---- Update ----

    async def update(
        self, fu_id: str, updates: Dict[str, Any], user_id: str, user_name: str
    ) -> Optional[Dict[str, Any]]:
        """Partial update of a follow-up (doctor only)."""
        existing = await self.collection.find_one({"_id": fu_id})
        if not existing:
            return None

        # Build audit entries for changed fields
        clean_updates: Dict[str, Any] = {}
        audit_entries = []
        for key, value in updates.items():
            if value is not None and existing.get(key) != value:
                audit_entries.append(
                    self._audit_entry(user_id, user_name, f"Updated {key}", str(existing.get(key)), str(value))
                )
                clean_updates[key] = value

        if not clean_updates:
            doc = existing
            doc["id"] = str(doc.pop("_id"))
            return doc

        clean_updates["updated_at"] = datetime.utcnow().isoformat()

        result = await self.collection.find_one_and_update(
            {"_id": fu_id},
            {
                "$set": clean_updates,
                "$push": {"auditTrail": {"$each": audit_entries}},
            },
            return_document=True,
        )
        if result:
            result["id"] = str(result.pop("_id"))
        return result

    # ---- Status Transitions ----

    async def _transition_status(
        self,
        fu_id: str,
        new_status: str,
        user_id: str,
        user_name: str,
        action_label: str,
        extra_set: Optional[Dict[str, Any]] = None,
    ) -> Optional[Dict[str, Any]]:
        """Generic status transition with validation and audit."""
        existing = await self.collection.find_one({"_id": fu_id})
        if not existing:
            return None

        current_status = existing["status"]
        if not self.validate_transition(current_status, new_status):
            raise ValueError(
                f"Invalid status transition: {current_status} → {new_status}"
            )

        update_set: Dict[str, Any] = {
            "status": new_status,
            "updated_at": datetime.utcnow().isoformat(),
        }
        if extra_set:
            update_set.update(extra_set)

        audit = self._audit_entry(user_id, user_name, action_label, current_status, new_status)

        result = await self.collection.find_one_and_update(
            {"_id": fu_id},
            {"$set": update_set, "$push": {"auditTrail": audit}},
            return_document=True,
        )
        if result:
            result["id"] = str(result.pop("_id"))
        logger.info(f"Follow-up {fu_id}: {current_status} → {new_status} by {user_name}")
        return result

    async def accept(self, fu_id: str, user_id: str, user_name: str) -> Optional[Dict[str, Any]]:
        """Patient accepts a follow-up."""
        return await self._transition_status(fu_id, "Accepted", user_id, user_name, "Patient Accepted")

    async def request_reschedule(
        self, fu_id: str, user_id: str, user_name: str, reschedule_data: dict
    ) -> Optional[Dict[str, Any]]:
        """Patient requests to reschedule."""
        reschedule_req = {
            "preferredDate": reschedule_data["preferredDate"],
            "preferredTime": reschedule_data["preferredTime"],
            "reason": reschedule_data.get("reason", ""),
            "requestedAt": datetime.utcnow().isoformat(),
        }
        return await self._transition_status(
            fu_id, "Reschedule Requested", user_id, user_name,
            "Reschedule Requested",
            extra_set={"rescheduleRequest": reschedule_req},
        )

    async def approve_reschedule(
        self, fu_id: str, user_id: str, user_name: str,
        approved_date: Optional[str] = None, approved_time: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Doctor approves reschedule (may modify date/time)."""
        existing = await self.collection.find_one({"_id": fu_id})
        if not existing:
            return None

        reschedule_req = existing.get("rescheduleRequest") or {}
        new_date = approved_date or reschedule_req.get("preferredDate", existing["scheduledDate"])
        new_time = approved_time or reschedule_req.get("preferredTime", existing["scheduledTime"])

        return await self._transition_status(
            fu_id, "Scheduled", user_id, user_name,
            "Reschedule Approved",
            extra_set={
                "scheduledDate": new_date,
                "scheduledTime": new_time,
                "rescheduleRequest": None,
            },
        )

    async def complete(self, fu_id: str, user_id: str, user_name: str) -> Optional[Dict[str, Any]]:
        """Mark follow-up as completed."""
        return await self._transition_status(fu_id, "Completed", user_id, user_name, "Follow-Up Completed")

    async def mark_missed(self, fu_id: str, user_id: str, user_name: str) -> Optional[Dict[str, Any]]:
        """Mark follow-up as missed."""
        return await self._transition_status(fu_id, "Missed", user_id, user_name, "Follow-Up Missed")

    # ---- Analytics ----

    async def get_analytics(self) -> Dict[str, Any]:
        """Aggregate follow-up analytics for admin dashboard."""
        total = await self.collection.count_documents({})
        completed = await self.collection.count_documents({"status": "Completed"})
        missed = await self.collection.count_documents({"status": "Missed"})
        rescheduled = await self.collection.count_documents({"status": "Reschedule Requested"})
        scheduled = await self.collection.count_documents({"status": "Scheduled"})
        accepted = await self.collection.count_documents({"status": "Accepted"})

        return {
            "total": total,
            "completed": completed,
            "missed": missed,
            "rescheduled": rescheduled,
            "upcoming": scheduled + accepted,
            "scheduled": scheduled,
            "accepted": accepted,
        }


# Singleton instance
followup_service = FollowUpService()

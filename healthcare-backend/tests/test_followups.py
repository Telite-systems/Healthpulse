import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.followup_service import FollowUpService


@pytest.mark.asyncio
async def test_create_followup():
    service = FollowUpService()
    mock_coll = AsyncMock()
    mock_coll.count_documents.return_value = 5

    with patch("app.services.followup_service.database.get_collection", return_value=mock_coll):
        data = {
            "patientId": "P001",
            "patientName": "John Doe",
            "doctorId": "D001",
            "doctorName": "Dr. Smith",
            "department": "Cardiology",
            "originalAppointmentId": "APT001",
            "followupType": "Physical Visit",
            "priority": "Normal",
            "reason": "Checkup",
            "notes": "Bring reports",
            "scheduledDate": "2026-06-20",
            "scheduledTime": "10:00 AM"
        }

        result = await service.create(data, "D001", "Dr. Smith")

        assert result["id"] == "FU006"
        assert result["status"] == "Scheduled"
        assert len(result["auditTrail"]) == 1
        assert result["auditTrail"][0]["action"] == "Follow-Up Created"
        mock_coll.insert_one.assert_called_once()


@pytest.mark.asyncio
async def test_status_transitions():
    service = FollowUpService()

    # Scheduled -> Accepted
    existing_scheduled = {
        "_id": "FU001",
        "status": "Scheduled",
        "patientId": "P001",
        "patientName": "John Doe",
        "doctorId": "D001",
        "doctorName": "Dr. Smith",
        "scheduledDate": "2026-06-20",
        "scheduledTime": "10:00 AM",
        "auditTrail": []
    }

    mock_coll = AsyncMock()
    mock_coll.find_one.return_value = existing_scheduled
    mock_coll.find_one_and_update.side_effect = lambda q, u, return_document=True: {
        **existing_scheduled,
        "id": "FU001",
        "status": "Accepted"
    }

    with patch("app.services.followup_service.database.get_collection", return_value=mock_coll):
        result = await service.accept("FU001", "P001", "John Doe")
        assert result["status"] == "Accepted"

    # Accepted -> Reschedule Requested
    existing_accepted = {
        "_id": "FU001",
        "status": "Accepted",
        "patientId": "P001",
        "patientName": "John Doe",
        "doctorId": "D001",
        "doctorName": "Dr. Smith",
        "scheduledDate": "2026-06-20",
        "scheduledTime": "10:00 AM",
        "auditTrail": []
    }
    mock_coll.find_one.return_value = existing_accepted
    mock_coll.find_one_and_update.side_effect = lambda q, u, return_document=True: {
        **existing_accepted,
        "id": "FU001",
        "status": "Reschedule Requested"
    }

    with patch("app.services.followup_service.database.get_collection", return_value=mock_coll):
        resched_payload = {"preferredDate": "2026-06-25", "preferredTime": "11:00 AM", "reason": "Conflict"}
        result = await service.request_reschedule("FU001", "P001", "John Doe", resched_payload)
        assert result["status"] == "Reschedule Requested"

    # Completed transition
    existing_accepted["status"] = "Accepted"
    mock_coll.find_one.return_value = existing_accepted
    mock_coll.find_one_and_update.side_effect = lambda q, u, return_document=True: {
        **existing_accepted,
        "id": "FU001",
        "status": "Completed"
    }
    with patch("app.services.followup_service.database.get_collection", return_value=mock_coll):
        result = await service.complete("FU001", "D001", "Dr. Smith")
        assert result["status"] == "Completed"


def test_transition_validation():
    # Enforce VALID_TRANSITIONS logic
    assert FollowUpService.validate_transition("Scheduled", "Accepted") is True
    assert FollowUpService.validate_transition("Scheduled", "Reschedule Requested") is True
    assert FollowUpService.validate_transition("Accepted", "Completed") is True
    assert FollowUpService.validate_transition("Completed", "Scheduled") is False
    assert FollowUpService.validate_transition("Missed", "Accepted") is False

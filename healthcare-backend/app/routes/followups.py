# ============================================
# Follow-Up Routes
# ============================================

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional, List
from app.services.auth import get_current_user
from app.services.followup_service import followup_service
from app.models.followup import (
    FollowUpCreate,
    FollowUpUpdate,
    RescheduleRequestCreate,
    ApproveRescheduleRequest,
)
from app.services.notification_helper import (
    notify_followup_created,
    notify_followup_accepted,
    notify_reschedule_requested,
    notify_reschedule_approved,
    notify_followup_completed,
)
from app.routes.collections import make_api_response

router = APIRouter(prefix="/api/followups", tags=["Follow-Ups"])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_followup(
    payload: FollowUpCreate,
    current_user: dict = Depends(get_current_user),
):
    """Doctor schedules a follow-up for a patient."""
    user_id = current_user.get("id") or current_user.get("userId", "unknown")
    user_name = current_user.get("name") or current_user.get("username", "Unknown")

    data = payload.dict()
    result = await followup_service.create(data, user_id, user_name)

    # Automatically notify patient
    try:
        await notify_followup_created(
            patient_id=result["patientId"],
            patient_name=result["patientName"],
            doctor_name=result["doctorName"],
            scheduled_date=result["scheduledDate"],
            scheduled_time=result["scheduledTime"],
            followup_id=result["id"],
        )
    except Exception as e:
        # Don't fail the create call if notification fails
        pass

    return make_api_response(result, 201, "Follow-up created successfully")


@router.get("")
async def get_all_followups(
    page: int = Query(1, ge=1),
    pageSize: int = Query(50, ge=1, le=1000),
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: dict = Depends(get_current_user),
):
    """Get all follow-ups with pagination and optional status filter."""
    result = await followup_service.get_all(page=page, page_size=pageSize, status_filter=status_filter)
    return make_api_response(result)


# ---- Fixed-path routes MUST come BEFORE the /{fu_id} wildcard ----

@router.get("/analytics")
async def get_followup_analytics(
    current_user: dict = Depends(get_current_user),
):
    """Get high-level follow-up analytics/statistics."""
    result = await followup_service.get_analytics()
    return make_api_response(result)


@router.get("/patient/{patient_id}")
async def list_by_patient(
    patient_id: str,
    current_user: dict = Depends(get_current_user),
):
    """List all follow-ups for a specific patient."""
    result = await followup_service.list_by_patient(patient_id)
    return make_api_response(result)


@router.get("/doctor/{doctor_id}")
async def list_by_doctor(
    doctor_id: str,
    current_user: dict = Depends(get_current_user),
):
    """List all follow-ups for a specific doctor."""
    result = await followup_service.list_by_doctor(doctor_id)
    return make_api_response(result)


# ---- Wildcard ID route (must be after all fixed-path GET routes) ----

@router.get("/{fu_id}")
async def get_followup_by_id(
    fu_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get details of a single follow-up by ID."""
    result = await followup_service.get_by_id(fu_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Follow-up with ID {fu_id} not found",
        )
    return make_api_response(result)


@router.put("/{fu_id}")
async def update_followup(
    fu_id: str,
    payload: FollowUpUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update follow-up details (Doctor only)."""
    user_id = current_user.get("id") or current_user.get("userId", "unknown")
    user_name = current_user.get("name") or current_user.get("username", "Unknown")

    updates = payload.dict(exclude_unset=True)
    result = await followup_service.update(fu_id, updates, user_id, user_name)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Follow-up with ID {fu_id} not found",
        )

    return make_api_response(result, 200, "Follow-up updated successfully")


@router.post("/{fu_id}/accept")
async def accept_followup(
    fu_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Patient accepts a scheduled follow-up."""
    user_id = current_user.get("id") or current_user.get("userId", "unknown")
    user_name = current_user.get("name") or current_user.get("username", "Unknown")

    try:
        result = await followup_service.accept(fu_id, user_id, user_name)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Follow-up with ID {fu_id} not found",
        )

    # Notify doctor
    try:
        await notify_followup_accepted(
            doctor_id=result["doctorId"],
            doctor_name=result["doctorName"],
            patient_name=result["patientName"],
            followup_id=result["id"],
        )
    except Exception:
        pass

    return make_api_response(result, 200, "Follow-up accepted successfully")


@router.post("/{fu_id}/reschedule-request")
async def request_reschedule(
    fu_id: str,
    payload: RescheduleRequestCreate,
    current_user: dict = Depends(get_current_user),
):
    """Patient requests rescheduling for a follow-up."""
    user_id = current_user.get("id") or current_user.get("userId", "unknown")
    user_name = current_user.get("name") or current_user.get("username", "Unknown")

    reschedule_data = payload.dict()
    try:
        result = await followup_service.request_reschedule(fu_id, user_id, user_name, reschedule_data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Follow-up with ID {fu_id} not found",
        )

    # Notify doctor
    try:
        await notify_reschedule_requested(
            doctor_id=result["doctorId"],
            doctor_name=result["doctorName"],
            patient_name=result["patientName"],
            scheduled_date=result["scheduledDate"],
            followup_id=result["id"],
        )
    except Exception:
        pass

    return make_api_response(result, 200, "Reschedule requested successfully")


@router.post("/{fu_id}/approve-reschedule")
async def approve_reschedule(
    fu_id: str,
    payload: ApproveRescheduleRequest,
    current_user: dict = Depends(get_current_user),
):
    """Doctor approves patient's reschedule request, optionally modifying date/time."""
    user_id = current_user.get("id") or current_user.get("userId", "unknown")
    user_name = current_user.get("name") or current_user.get("username", "Unknown")

    try:
        result = await followup_service.approve_reschedule(
            fu_id, user_id, user_name, payload.approvedDate, payload.approvedTime
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Follow-up with ID {fu_id} not found",
        )

    # Notify patient
    try:
        await notify_reschedule_approved(
            patient_id=result["patientId"],
            patient_name=result["patientName"],
            doctor_name=result["doctorName"],
            new_date=result["scheduledDate"],
            new_time=result["scheduledTime"],
            followup_id=result["id"],
        )
    except Exception:
        pass

    return make_api_response(result, 200, "Reschedule request approved successfully")


@router.post("/{fu_id}/complete")
async def complete_followup(
    fu_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Mark the follow-up as completed (Doctor only)."""
    user_id = current_user.get("id") or current_user.get("userId", "unknown")
    user_name = current_user.get("name") or current_user.get("username", "Unknown")

    try:
        result = await followup_service.complete(fu_id, user_id, user_name)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Follow-up with ID {fu_id} not found",
        )

    # Notify patient and trigger real-time sync
    try:
        await notify_followup_completed(
            patient_id=result["patientId"],
            patient_name=result["patientName"],
            doctor_name=result["doctorName"],
            followup_id=result["id"],
        )
        
        # Trigger real-time sync via WebSocket
        from app.routes.websocket import manager as ws_manager
        await ws_manager.broadcast({
            "type": "appointment_update",
            "title": "Follow-Up Completed",
            "message": "Your follow-up appointment has been completed.",
            "severity": "success",
            "data": {
                "followupId": result["id"],
                "patientId": result["patientId"],
            }
        })
    except Exception:
        pass

    return make_api_response(result, 200, "Follow-up marked completed successfully")


@router.post("/{fu_id}/missed")
async def mark_followup_missed(
    fu_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Mark the follow-up as missed (Doctor/System)."""
    user_id = current_user.get("id") or current_user.get("userId", "unknown")
    user_name = current_user.get("name") or current_user.get("username", "Unknown")

    try:
        result = await followup_service.mark_missed(fu_id, user_id, user_name)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Follow-up with ID {fu_id} not found",
        )

    return make_api_response(result, 200, "Follow-up marked missed successfully")


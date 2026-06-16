# ============================================
# Notification Helper Service
# Creates actionable notifications for the follow-up system
# ============================================

from datetime import datetime
from app.database import database
import logging

logger = logging.getLogger(__name__)


async def create_actionable_notification(
    recipient_id: str,
    recipient_name: str,
    title: str,
    message: str,
    notif_type: str = "info",
    action_type: str = "",
    action_target_id: str = "",
) -> dict:
    """
    Create an actionable notification and store it in the notifications collection.

    Uses the existing notifications collection — adds optional fields for
    deep-link navigation without breaking existing notification flow.
    """
    col = database.get_collection("notifications")

    # Generate sequential ID matching existing pattern (N001, N002, ...)
    count = await col.count_documents({})
    notif_id = f"N{str(count + 1).zfill(3)}"

    now = datetime.utcnow().isoformat()
    notif_doc = {
        "_id": notif_id,
        "title": title,
        "message": message,
        "type": notif_type,
        "time": "Just now",
        "read": False,
        "recipientId": recipient_id,
        "recipientName": recipient_name,
        "actionType": action_type,
        "actionTargetId": action_target_id,
        "patientName": recipient_name,  # backward-compat field used by frontend filtering
        "created_at": now,
        "updated_at": now,
        "createdAt": now,
    }

    await col.insert_one(notif_doc)

    # Convert to response format
    notif_doc["id"] = str(notif_doc.pop("_id"))
    logger.info(f"Notification created: {notif_id} → {recipient_name} | {title}")
    return notif_doc


async def notify_followup_created(
    patient_id: str,
    patient_name: str,
    doctor_name: str,
    scheduled_date: str,
    scheduled_time: str,
    followup_id: str,
) -> dict:
    """Generate notification when a doctor creates a follow-up."""
    return await create_actionable_notification(
        recipient_id=patient_id,
        recipient_name=patient_name,
        title="📅 Follow-Up Scheduled",
        message=f"{doctor_name} has scheduled a follow-up appointment for {scheduled_date} at {scheduled_time}.",
        notif_type="info",
        action_type="view_followup",
        action_target_id=followup_id,
    )


async def notify_followup_accepted(
    doctor_id: str,
    doctor_name: str,
    patient_name: str,
    followup_id: str,
) -> dict:
    """Notify doctor when patient accepts a follow-up."""
    return await create_actionable_notification(
        recipient_id=doctor_id,
        recipient_name=doctor_name,
        title="✅ Follow-Up Accepted",
        message=f"{patient_name} has accepted the scheduled follow-up.",
        notif_type="success",
        action_type="view_followup",
        action_target_id=followup_id,
    )


async def notify_reschedule_requested(
    doctor_id: str,
    doctor_name: str,
    patient_name: str,
    scheduled_date: str,
    followup_id: str,
) -> dict:
    """Notify doctor when patient requests to reschedule."""
    return await create_actionable_notification(
        recipient_id=doctor_id,
        recipient_name=doctor_name,
        title="🔄 Reschedule Requested",
        message=f"{patient_name} has requested to reschedule the follow-up scheduled for {scheduled_date}.",
        notif_type="warning",
        action_type="review_reschedule",
        action_target_id=followup_id,
    )


async def notify_reschedule_approved(
    patient_id: str,
    patient_name: str,
    doctor_name: str,
    new_date: str,
    new_time: str,
    followup_id: str,
) -> dict:
    """Notify patient when doctor approves/modifies reschedule."""
    return await create_actionable_notification(
        recipient_id=patient_id,
        recipient_name=patient_name,
        title="📅 Follow-Up Rescheduled",
        message=f"{doctor_name} has rescheduled your follow-up to {new_date} at {new_time}.",
        notif_type="success",
        action_type="view_followup",
        action_target_id=followup_id,
    )


async def notify_reminder(
    patient_id: str,
    patient_name: str,
    doctor_name: str,
    scheduled_date: str,
    scheduled_time: str,
    followup_id: str,
    days_before: int,
) -> dict:
    """Generate a reminder notification for an upcoming follow-up."""
    if days_before == 0:
        time_desc = "today"
    elif days_before == 1:
        time_desc = "tomorrow"
    else:
        time_desc = f"in {days_before} days"

    return await create_actionable_notification(
        recipient_id=patient_id,
        recipient_name=patient_name,
        title="⏰ Follow-Up Reminder",
        message=f"Reminder: You have a follow-up appointment with {doctor_name} {time_desc} at {scheduled_time}.",
        notif_type="info",
        action_type="view_followup",
        action_target_id=followup_id,
    )


async def notify_followup_completed(
    patient_id: str,
    patient_name: str,
    doctor_name: str,
    followup_id: str,
) -> dict:
    """Notify patient when a doctor marks a follow-up as completed."""
    return await create_actionable_notification(
        recipient_id=patient_id,
        recipient_name=patient_name,
        title="✅ Follow-Up Completed",
        message="Your follow-up appointment has been completed.",
        notif_type="success",
        action_type="view_followup",
        action_target_id=followup_id,
    )


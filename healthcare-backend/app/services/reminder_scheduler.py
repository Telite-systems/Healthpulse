# ============================================
# Reminder Scheduler Service
# Async background loop that checks for upcoming follow-ups
# and creates reminder notifications.
# ============================================

import asyncio
import logging
from datetime import datetime
from app.database import database
from app.services.notification_helper import notify_reminder

logger = logging.getLogger(__name__)


async def check_and_send_reminders():
    """
    Query followups scheduled in the next 7, 3, 1, or 0 days.
    Send notification reminder if not already sent.
    """
    col = database.get_collection("followups")
    cursor = col.find({"status": {"$in": ["Scheduled", "Accepted"]}})

    # We use UTC date to match database storage conventions
    today_dt = datetime.utcnow().date()

    async for fu in cursor:
        fu_id = fu["_id"]
        scheduled_date_str = fu.get("scheduledDate")

        if not scheduled_date_str:
            continue

        try:
            # Expected format: YYYY-MM-DD
            scheduled_date = datetime.strptime(scheduled_date_str, "%Y-%m-%d").date()
        except ValueError:
            try:
                # Fallback if stored as full ISO datetime
                scheduled_date = datetime.fromisoformat(scheduled_date_str).date()
            except Exception as e:
                logger.error(f"Could not parse scheduled date '{scheduled_date_str}' for followup {fu_id}: {e}")
                continue

        days_diff = (scheduled_date - today_dt).days

        if days_diff in [7, 3, 1, 0]:
            action_label = f"Reminder Sent - {days_diff}d"
            if days_diff == 0:
                action_label = "Reminder Sent - Same Day"

            # Check if this specific reminder action already exists in auditTrail
            audit_trail = fu.get("auditTrail", [])
            already_sent = any(entry.get("action") == action_label for entry in audit_trail)

            if not already_sent:
                try:
                    await notify_reminder(
                        patient_id=fu["patientId"],
                        patient_name=fu["patientName"],
                        doctor_name=fu["doctorName"],
                        scheduled_date=fu["scheduledDate"],
                        scheduled_time=fu["scheduledTime"],
                        followup_id=fu_id,
                        days_before=days_diff,
                    )

                    # Append to audit trail to record sent reminder
                    audit_entry = {
                        "timestamp": datetime.utcnow().isoformat(),
                        "userId": "system",
                        "userName": "System Scheduler",
                        "action": action_label,
                        "previousValue": None,
                        "newValue": None,
                    }

                    await col.update_one(
                        {"_id": fu_id},
                        {"$push": {"auditTrail": audit_entry}}
                    )
                    logger.info(f"Sent reminder ({action_label}) for follow-up {fu_id} to patient {fu['patientName']}")
                except Exception as e:
                    logger.error(f"Error sending/recording reminder for follow-up {fu_id}: {e}")


async def start_reminder_scheduler():
    logger.info("Starting background reminder scheduler")
    try:
        while True:
            await check_and_send_reminders()
            # Run every hour
            await asyncio.sleep(3600)
    except asyncio.CancelledError:
        logger.info("Background reminder scheduler cancelled")
    except Exception as e:
        logger.critical(f"Background reminder scheduler failed: {e}", exc_info=True)


async def stop_reminder_scheduler():
    logger.info("Stopped background reminder scheduler")

# ============================================
# Follow-Up Model
# ============================================

from pydantic import BaseModel, Field
from typing import Literal, Optional, List
from datetime import datetime


# ---- Audit Trail Entry ----

class AuditEntry(BaseModel):
    """Immutable audit trail entry for follow-up history."""
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    userId: str = ""
    userName: str = ""
    action: str = ""
    previousValue: Optional[str] = None
    newValue: Optional[str] = None


# ---- Reschedule Request Sub-document ----

class RescheduleRequest(BaseModel):
    """Patient's reschedule request details."""
    preferredDate: str
    preferredTime: str
    reason: str = ""
    requestedAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


# ---- Follow-Up Status Type ----

FollowUpStatus = Literal[
    "Scheduled",
    "Accepted",
    "Reschedule Requested",
    "Completed",
    "Missed",
]

FollowUpType = Literal[
    "Physical Visit",
    "Teleconsultation",
    "Routine Checkup",
    "Test Review",
    "Post-Operation Review",
    "Medication Review",
]

FollowUpPriority = Literal["Normal", "Important", "Urgent"]


# ---- Status Transition Matrix ----

VALID_TRANSITIONS: dict[str, list[str]] = {
    "Scheduled": ["Accepted", "Reschedule Requested", "Completed", "Missed"],
    "Accepted": ["Reschedule Requested", "Completed", "Missed"],
    "Reschedule Requested": ["Scheduled"],  # Doctor approves → back to Scheduled
    "Completed": [],   # Terminal
    "Missed": [],      # Terminal
}


# ---- Pydantic Models ----

class FollowUpCreate(BaseModel):
    """Schema for creating a new follow-up."""
    patientId: str
    patientName: str
    doctorId: str
    doctorName: str
    department: str = ""
    originalAppointmentId: Optional[str] = None
    followupType: FollowUpType = "Physical Visit"
    priority: FollowUpPriority = "Normal"
    reason: str = ""
    notes: str = ""
    scheduledDate: str
    scheduledTime: str


class FollowUpUpdate(BaseModel):
    """Schema for partial follow-up updates by the doctor."""
    followupType: Optional[FollowUpType] = None
    priority: Optional[FollowUpPriority] = None
    reason: Optional[str] = None
    notes: Optional[str] = None
    scheduledDate: Optional[str] = None
    scheduledTime: Optional[str] = None


class RescheduleRequestCreate(BaseModel):
    """Schema for a patient's reschedule request."""
    preferredDate: str
    preferredTime: str
    reason: str = ""


class ApproveRescheduleRequest(BaseModel):
    """Schema for the doctor approving/modifying a reschedule."""
    approvedDate: Optional[str] = None   # If None, use patient's preferred date
    approvedTime: Optional[str] = None   # If None, use patient's preferred time

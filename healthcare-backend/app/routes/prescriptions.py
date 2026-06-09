# ============================================
# Prescriptions API Router
# ============================================

from fastapi import APIRouter, HTTPException, Depends, status, Query
import time
from datetime import datetime
import logging

from app.database import database
from app.services.auth import get_current_user
from app.models.prescription import PrescriptionCreate, PrescriptionUpdate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/prescriptions", tags=["Prescriptions"])

def make_api_response(data, status_code=200, message="Success"):
    """Wrap data in standard HealthPulse response format."""
    return {
        "data": data,
        "status": status_code,
        "message": message,
        "timestamp": int(time.time() * 1000),
        "requestId": f"req_{int(time.time())}",
    }

@router.post("", response_model=dict)
async def create_prescription(
    payload: PrescriptionCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new prescription (Doctor/Admin only)."""
    if current_user.get("role") not in ("Doctor", "Admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors or admins can issue prescriptions."
        )

    logger.info("Prescription Created: Request payload received.")
    prescriptions_col = database.get_collection("prescriptions")
    
    # ── Lookup patient ID if missing ──
    patient_id = payload.patient_id or payload.id or payload.prescription_id or payload.prescriptionId
    patient_name = payload.patientName
    
    patients_col = database.get_collection("patients")
    if not patient_id and patient_name:
        patient_doc = await patients_col.find_one({"name": {"$regex": f"^{patient_name}$", "$options": "i"}})
        if patient_doc:
            patient_id = str(patient_doc["_id"])
            logger.info(f"Resolved patient ID {patient_id} for name {patient_name}")
        else:
            # Look up in users just in case
            users_col = database.get_collection("users")
            user_doc = await users_col.find_one({"name": {"$regex": f"^{patient_name}$", "$options": "i"}})
            if user_doc:
                patient_id = str(user_doc["_id"])
                logger.info(f"Resolved patient ID {patient_id} from users for name {patient_name}")

    if not patient_id:
        logger.warning(f"Could not resolve patient_id for name {patient_name}, generating custom ID.")
        import uuid
        patient_id = f"P{uuid.uuid4().hex[:6].upper()}"

    # ── Lookup doctor ID if missing ──
    doctor_id = payload.doctor_id or payload.doctor_id
    doctor_name = payload.doctorName or current_user.get("name")
    
    if not doctor_id:
        doctor_id = current_user.get("id")

    # ── Lookup appointment ID if missing ──
    appointment_id = payload.appointment_id or payload.appointmentId
    if not appointment_id:
        appointments_col = database.get_collection("appointments")
        latest_apt = await appointments_col.find_one(
            {"$or": [
                {"patientId": patient_id}, 
                {"patient_id": patient_id},
                {"patientName": {"$regex": f"^{patient_name}$", "$options": "i"}}
            ]},
            sort=[("_id", -1)]
        )
        if latest_apt:
            appointment_id = str(latest_apt["_id"])
            logger.info(f"Linked appointment {appointment_id} for prescription")

    # ── Generate sequential/custom prescription ID ──
    presc_id = payload.id or payload.prescription_id or payload.prescriptionId
    if not presc_id:
        count = await prescriptions_col.count_documents({})
        presc_id = f"RX{str(count + 1).zfill(3)}"

    # ── Populate schema both camelCase and snake_case ──
    now = datetime.utcnow().isoformat()
    meds = payload.medications or payload.medicines or ""
    diagnosis = payload.diagnosis or "General Consultation"
    
    presc_doc = {
        "_id": presc_id,
        "id": presc_id,
        "prescription_id": presc_id,
        "prescriptionId": presc_id,
        "patientName": patient_name,
        "patient_id": patient_id,
        "patientId": patient_id,
        "doctorName": doctor_name,
        "doctor_id": doctor_id,
        "doctorId": doctor_id,
        "appointment_id": appointment_id or "",
        "appointmentId": appointment_id or "",
        "date": payload.date or now.split("T")[0],
        "medications": meds,
        "medicines": meds,
        "dosage": payload.dosage or "As directed",
        "duration": payload.duration or "7 days",
        "instructions": payload.instructions or "",
        "diagnosis": diagnosis,
        "status": payload.status or "Active",
        "createdAt": payload.createdAt or now,
        "created_at": now,
        "updated_at": now
    }

    # Save to MongoDB
    await prescriptions_col.insert_one(presc_doc)
    logger.info(f"Prescription Saved: {presc_id} created successfully in MongoDB.")

    # ── Create Patient Notification ──
    notifications_col = database.get_collection("notifications")
    notif_id = f"N{int(time.time() * 1000)}"
    notif_doc = {
        "_id": notif_id,
        "id": notif_id,
        "title": "New Prescription Available",
        "message": "Your doctor has issued a new prescription.",
        "type": "success",
        "time": "Just now",
        "read": False,
        "patientName": patient_name,
        "patientId": patient_id,
        "patient_id": patient_id,
        "doctorName": doctor_name,
        "doctorId": doctor_id,
        "doctor_id": doctor_id,
        "target": "prescriptions",
        "createdAt": now,
        "created_at": now
    }
    await notifications_col.insert_one(notif_doc)
    logger.info(f"Notification generated for patient {patient_name} (ID: {patient_id})")

    # Format return response
    return_doc = {**presc_doc}
    return_doc["id"] = str(return_doc.pop("_id"))
    return make_api_response(return_doc, 201, "Prescription saved and notification generated.")

@router.get("/patient/{patient_id}", response_model=dict)
async def get_patient_prescriptions(
    patient_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Retrieve prescriptions specifically for one patient, enforcing security and validation."""
    logger.info(f"Patient Dashboard Request: Fetching prescriptions for patient {patient_id}")
    
    # Enforce role-based ownership validation
    if current_user.get("role") == "Patient" and current_user.get("id") != patient_id:
        logger.warning(f"Security Alert: Patient {current_user.get('id')} attempted to access patient {patient_id}'s prescriptions.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: You cannot view another patient's prescriptions."
        )

    prescriptions_col = database.get_collection("prescriptions")
    
    # Retrieve patient name to perform a case-insensitive fallback if ID is missing on old records
    patients_col = database.get_collection("patients")
    patient_doc = await patients_col.find_one({"_id": patient_id})
    patient_name = patient_doc.get("name") if patient_doc else None
    
    if not patient_name:
        users_col = database.get_collection("users")
        user_doc = await users_col.find_one({"_id": patient_id})
        patient_name = user_doc.get("name") if user_doc else None

    query_conditions = [
        {"patient_id": patient_id},
        {"patientId": patient_id}
    ]
    if patient_name:
        query_conditions.append({"patientName": {"$regex": f"^{patient_name}$", "$options": "i"}})
        query_conditions.append({"patient": {"$regex": f"^{patient_name}$", "$options": "i"}})

    cursor = prescriptions_col.find({"$or": query_conditions}).sort("_id", -1)
    
    items = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        items.append(doc)

    logger.info(f"Prescription Retrieved: Found {len(items)} prescriptions for patient {patient_id}.")
    return make_api_response(items)

@router.get("", response_model=dict)
async def get_all_prescriptions(
    page: int = Query(1, ge=1),
    pageSize: int = Query(50, ge=1, le=1000),
    current_user: dict = Depends(get_current_user)
):
    """Retrieve all prescriptions (Patients can only see their own)."""
    prescriptions_col = database.get_collection("prescriptions")
    
    query = {}
    if current_user.get("role") == "Patient":
        patient_id = current_user.get("id")
        logger.info(f"Patient {patient_id} requested general prescriptions. Enforcing own filter.")
        
        # Fallback patient name match
        patient_name = current_user.get("name")
        query_conditions = [
            {"patient_id": patient_id},
            {"patientId": patient_id}
        ]
        if patient_name:
            query_conditions.append({"patientName": {"$regex": f"^{patient_name}$", "$options": "i"}})
            query_conditions.append({"patient": {"$regex": f"^{patient_name}$", "$options": "i"}})
        query = {"$or": query_conditions}
    
    skip = (page - 1) * pageSize
    cursor = prescriptions_col.find(query).sort("_id", -1).skip(skip).limit(pageSize)
    
    items = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        items.append(doc)
        
    total = await prescriptions_col.count_documents(query)
    
    logger.info(f"Prescription Retrieved: Paginated request returned {len(items)} results (total: {total}).")
    return make_api_response({
        "data": items,
        "total": total,
        "page": page,
        "pageSize": pageSize,
        "totalPages": max(1, -(-total // pageSize))
    })

@router.get("/{item_id}", response_model=dict)
async def get_prescription_by_id(
    item_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Retrieve a single prescription by ID with ownership checks."""
    prescriptions_col = database.get_collection("prescriptions")
    doc = await prescriptions_col.find_one({"_id": item_id})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Prescription with ID {item_id} not found."
        )

    # Ownership validation
    if current_user.get("role") == "Patient":
        patient_id = current_user.get("id")
        doc_patient_id = doc.get("patient_id") or doc.get("patientId")
        doc_patient_name = doc.get("patientName") or doc.get("patient")
        
        id_match = doc_patient_id == patient_id
        name_match = doc_patient_name and current_user.get("name") and doc_patient_name.lower().strip() == current_user.get("name").lower().strip()
        
        if not id_match and not name_match:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access Denied: This prescription does not belong to you."
            )

    doc["id"] = str(doc.pop("_id"))
    logger.info(f"Prescription Retrieved: Single document {item_id} fetched.")
    return make_api_response(doc)

@router.put("/{item_id}", response_model=dict)
async def update_prescription(
    item_id: str,
    payload: PrescriptionUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update an existing prescription (Doctor/Admin only)."""
    if current_user.get("role") not in ("Doctor", "Admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors or admins can update prescriptions."
        )

    prescriptions_col = database.get_collection("prescriptions")
    existing = await prescriptions_col.find_one({"_id": item_id})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Prescription with ID {item_id} not found."
        )

    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        return make_api_response(existing)

    # Align camelCase and snake_case fields
    if "medications" in updates or "medicines" in updates:
        meds = updates.get("medications") or updates.get("medicines")
        updates["medications"] = meds
        updates["medicines"] = meds

    updates["updated_at"] = datetime.utcnow().isoformat()

    result = await prescriptions_col.find_one_and_update(
        {"_id": item_id},
        {"$set": updates},
        return_document=True
    )
    
    result["id"] = str(result.pop("_id"))
    logger.info(f"Prescription Saved: Updated prescription {item_id} in MongoDB.")
    return make_api_response(result)

@router.delete("/{item_id}", response_model=dict)
async def delete_prescription(
    item_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a prescription (Doctor/Admin only)."""
    if current_user.get("role") not in ("Doctor", "Admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors or admins can delete prescriptions."
        )

    prescriptions_col = database.get_collection("prescriptions")
    res = await prescriptions_col.delete_one({"_id": item_id})
    if res.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Prescription with ID {item_id} not found."
        )

    logger.info(f"Prescription Saved: Deleted prescription {item_id} from MongoDB.")
    return make_api_response({"deleted": True})

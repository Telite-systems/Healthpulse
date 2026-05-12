# ============================================
# Database Seeder
# Populates MongoDB with initial mock data
# matching the frontend's mock data exactly
# ============================================

from app.database import database
from app.services.auth import hash_password
import logging

logger = logging.getLogger(__name__)


async def seed_database():
    """
    Seeds all collections with initial data if they are empty.
    Data matches the frontend mockData.ts exactly so behavior is consistent.
    """
    logger.info("🌱 Checking if database needs seeding...")

    # ---- Users ----
    users_col = database.get_collection("users")
    if await users_col.count_documents({}) == 0:
        users = [
            {"_id": "U001", "username": "admin", "hashed_password": hash_password("admin123"), "name": "Dr. Sarah Mitchell", "role": "Admin", "avatar": "👩‍⚕️"},
            {"_id": "U002", "username": "doctor", "hashed_password": hash_password("doctor123"), "name": "Dr. James Wilson", "role": "Doctor", "avatar": "👨‍⚕️"},
            {"_id": "U003", "username": "staff", "hashed_password": hash_password("staff123"), "name": "Emily Parker", "role": "Staff", "avatar": "👩‍💼"},
        ]
        await users_col.insert_many(users)
        logger.info("  ✅ Seeded 3 users")

    # ---- Patients ----
    patients_col = database.get_collection("patients")
    if await patients_col.count_documents({}) == 0:
        patients = [
            {"_id": "P001", "name": "John Anderson", "age": 45, "gender": "Male", "contact": "+1-555-0101", "email": "john.a@email.com", "address": "123 Oak St, Springfield", "bloodGroup": "A+", "registeredDate": "2025-01-15", "status": "Active"},
            {"_id": "P002", "name": "Maria Garcia", "age": 32, "gender": "Female", "contact": "+1-555-0102", "email": "maria.g@email.com", "address": "456 Pine Ave, Riverside", "bloodGroup": "O+", "registeredDate": "2025-02-20", "status": "Active"},
            {"_id": "P003", "name": "Robert Chen", "age": 58, "gender": "Male", "contact": "+1-555-0103", "email": "robert.c@email.com", "address": "789 Elm Dr, Lakewood", "bloodGroup": "B-", "registeredDate": "2025-03-10", "status": "Active"},
            {"_id": "P004", "name": "Emily Davis", "age": 27, "gender": "Female", "contact": "+1-555-0104", "email": "emily.d@email.com", "address": "321 Maple Ln, Fairview", "bloodGroup": "AB+", "registeredDate": "2025-04-05", "status": "Active"},
            {"_id": "P005", "name": "David Kim", "age": 63, "gender": "Male", "contact": "+1-555-0105", "email": "david.k@email.com", "address": "654 Cedar Rd, Greenville", "bloodGroup": "O-", "registeredDate": "2025-05-12", "status": "Inactive"},
            {"_id": "P006", "name": "Lisa Thompson", "age": 39, "gender": "Female", "contact": "+1-555-0106", "email": "lisa.t@email.com", "address": "987 Birch Ct, Westfield", "bloodGroup": "A-", "registeredDate": "2025-06-18", "status": "Active"},
            {"_id": "P007", "name": "Michael Brown", "age": 51, "gender": "Male", "contact": "+1-555-0107", "email": "michael.b@email.com", "address": "147 Walnut St, Eastside", "bloodGroup": "B+", "registeredDate": "2025-07-22", "status": "Active"},
            {"_id": "P008", "name": "Sarah Johnson", "age": 34, "gender": "Female", "contact": "+1-555-0108", "email": "sarah.j@email.com", "address": "258 Cherry Blvd, Northdale", "bloodGroup": "AB-", "registeredDate": "2025-08-30", "status": "Active"},
        ]
        await patients_col.insert_many(patients)
        logger.info("  ✅ Seeded 8 patients")

    # ---- Doctors ----
    doctors_col = database.get_collection("doctors")
    if await doctors_col.count_documents({}) == 0:
        doctors = [
            {"_id": "D001", "name": "Dr. James Wilson", "specialization": "Cardiology", "contact": "+1-555-0201", "email": "wilson@hospital.com", "experience": 15, "department": "Cardiology", "availability": "Mon-Fri 9AM-5PM", "status": "Available"},
            {"_id": "D002", "name": "Dr. Anna Lee", "specialization": "Neurology", "contact": "+1-555-0202", "email": "lee@hospital.com", "experience": 12, "department": "Neurology", "availability": "Mon-Sat 10AM-6PM", "status": "Available"},
            {"_id": "D003", "name": "Dr. Raj Patel", "specialization": "Orthopedics", "contact": "+1-555-0203", "email": "patel@hospital.com", "experience": 20, "department": "Orthopedics", "availability": "Tue-Sat 8AM-4PM", "status": "Busy"},
            {"_id": "D004", "name": "Dr. Sarah Mitchell", "specialization": "Pediatrics", "contact": "+1-555-0204", "email": "mitchell@hospital.com", "experience": 10, "department": "Pediatrics", "availability": "Mon-Fri 9AM-3PM", "status": "Available"},
            {"_id": "D005", "name": "Dr. Michael Torres", "specialization": "Dermatology", "contact": "+1-555-0205", "email": "torres@hospital.com", "experience": 8, "department": "Dermatology", "availability": "Mon-Thu 10AM-5PM", "status": "On Leave"},
            {"_id": "D006", "name": "Dr. Emily Zhang", "specialization": "General Surgery", "contact": "+1-555-0206", "email": "zhang@hospital.com", "experience": 18, "department": "Surgery", "availability": "Mon-Fri 7AM-3PM", "status": "Available"},
        ]
        await doctors_col.insert_many(doctors)
        logger.info("  ✅ Seeded 6 doctors")

    # ---- Staff ----
    staff_col = database.get_collection("staff")
    if await staff_col.count_documents({}) == 0:
        staff = [
            {"_id": "S001", "name": "Emily Parker", "role": "Head Nurse", "department": "General", "contact": "+1-555-0301", "email": "parker@hospital.com", "joinDate": "2020-03-15", "status": "Active"},
            {"_id": "S002", "name": "Tom Richards", "role": "Lab Technician", "department": "Pathology", "contact": "+1-555-0302", "email": "richards@hospital.com", "joinDate": "2021-06-20", "status": "Active"},
            {"_id": "S003", "name": "Nancy White", "role": "Receptionist", "department": "Front Desk", "contact": "+1-555-0303", "email": "white@hospital.com", "joinDate": "2022-01-10", "status": "Active"},
            {"_id": "S004", "name": "Carlos Mendez", "role": "Pharmacist", "department": "Pharmacy", "contact": "+1-555-0304", "email": "mendez@hospital.com", "joinDate": "2019-09-05", "status": "Active"},
            {"_id": "S005", "name": "Diana Foster", "role": "Radiologist Tech", "department": "Radiology", "contact": "+1-555-0305", "email": "foster@hospital.com", "joinDate": "2023-02-14", "status": "Inactive"},
        ]
        await staff_col.insert_many(staff)
        logger.info("  ✅ Seeded 5 staff")

    # ---- Departments ----
    departments_col = database.get_collection("departments")
    if await departments_col.count_documents({}) == 0:
        departments = [
            {"_id": "DEP001", "name": "Cardiology", "head": "Dr. James Wilson", "staffCount": 25, "location": "Building A, Floor 3", "status": "Active"},
            {"_id": "DEP002", "name": "Neurology", "head": "Dr. Anna Lee", "staffCount": 18, "location": "Building A, Floor 4", "status": "Active"},
            {"_id": "DEP003", "name": "Orthopedics", "head": "Dr. Raj Patel", "staffCount": 22, "location": "Building B, Floor 2", "status": "Active"},
            {"_id": "DEP004", "name": "Pediatrics", "head": "Dr. Sarah Mitchell", "staffCount": 15, "location": "Building C, Floor 1", "status": "Active"},
            {"_id": "DEP005", "name": "Dermatology", "head": "Dr. Michael Torres", "staffCount": 10, "location": "Building A, Floor 2", "status": "Active"},
            {"_id": "DEP006", "name": "Surgery", "head": "Dr. Emily Zhang", "staffCount": 30, "location": "Building B, Floor 1", "status": "Active"},
            {"_id": "DEP007", "name": "Emergency", "head": "Dr. Lisa Grant", "staffCount": 35, "location": "Building A, Floor 1", "status": "Active"},
        ]
        await departments_col.insert_many(departments)
        logger.info("  ✅ Seeded 7 departments")

    # ---- Appointments ----
    appointments_col = database.get_collection("appointments")
    if await appointments_col.count_documents({}) == 0:
        appointments = [
            {"_id": "APT001", "patientName": "John Anderson", "doctorName": "Dr. James Wilson", "department": "Cardiology", "date": "2026-04-07", "time": "09:00 AM", "status": "Scheduled", "type": "Consultation", "notes": "Regular heart checkup", "createdAt": "2026-04-01T10:30:00"},
            {"_id": "APT002", "patientName": "Maria Garcia", "doctorName": "Dr. Anna Lee", "department": "Neurology", "date": "2026-04-07", "time": "10:30 AM", "status": "Scheduled", "type": "Follow-up", "notes": "Post-treatment review", "createdAt": "2026-04-02T14:00:00"},
            {"_id": "APT003", "patientName": "Robert Chen", "doctorName": "Dr. Raj Patel", "department": "Orthopedics", "date": "2026-04-06", "time": "02:00 PM", "status": "In Progress", "type": "Consultation", "notes": "Knee pain evaluation", "createdAt": "2026-04-03T09:15:00"},
            {"_id": "APT004", "patientName": "Emily Davis", "doctorName": "Dr. Sarah Mitchell", "department": "Pediatrics", "date": "2026-04-05", "time": "11:00 AM", "status": "Completed", "type": "Consultation", "notes": "Routine checkup", "createdAt": "2026-04-01T08:00:00"},
            {"_id": "APT005", "patientName": "David Kim", "doctorName": "Dr. Emily Zhang", "department": "Surgery", "date": "2026-04-08", "time": "08:00 AM", "status": "Scheduled", "type": "Emergency", "notes": "Pre-surgery evaluation", "createdAt": "2026-04-04T16:30:00"},
            {"_id": "APT006", "patientName": "Lisa Thompson", "doctorName": "Dr. James Wilson", "department": "Cardiology", "date": "2026-04-06", "time": "03:30 PM", "status": "Completed", "type": "Follow-up", "notes": "ECG results review", "createdAt": "2026-04-02T11:00:00"},
        ]
        await appointments_col.insert_many(appointments)
        logger.info("  ✅ Seeded 6 appointments")

    # ---- Patient Visits ----
    visits_col = database.get_collection("visits")
    if await visits_col.count_documents({}) == 0:
        visits = [
            {"_id": "V001", "patientName": "John Anderson", "doctorName": "Dr. James Wilson", "visitDate": "2026-04-01", "diagnosis": "Mild hypertension", "treatment": "Prescribed ACE inhibitors", "followUpDate": "2026-04-15", "status": "Follow-up Required", "vitals": {"bp": "140/90", "temp": "98.6°F", "pulse": "78 bpm", "weight": "82 kg"}, "createdAt": "2026-04-01T10:45:00"},
            {"_id": "V002", "patientName": "Maria Garcia", "doctorName": "Dr. Anna Lee", "visitDate": "2026-03-28", "diagnosis": "Tension headache", "treatment": "Pain management therapy", "followUpDate": "2026-04-10", "status": "Completed", "vitals": {"bp": "120/80", "temp": "98.4°F", "pulse": "72 bpm", "weight": "65 kg"}, "createdAt": "2026-03-28T14:20:00"},
            {"_id": "V003", "patientName": "Robert Chen", "doctorName": "Dr. Raj Patel", "visitDate": "2026-04-03", "diagnosis": "Osteoarthritis - right knee", "treatment": "Physical therapy + NSAIDs", "followUpDate": "2026-04-20", "status": "Follow-up Required", "vitals": {"bp": "135/85", "temp": "98.2°F", "pulse": "80 bpm", "weight": "90 kg"}, "createdAt": "2026-04-03T09:30:00"},
            {"_id": "V004", "patientName": "Emily Davis", "doctorName": "Dr. Sarah Mitchell", "visitDate": "2026-04-05", "diagnosis": "Seasonal allergies", "treatment": "Antihistamines prescribed", "followUpDate": "", "status": "Completed", "vitals": {"bp": "110/70", "temp": "99.1°F", "pulse": "68 bpm", "weight": "58 kg"}, "createdAt": "2026-04-05T11:15:00"},
        ]
        await visits_col.insert_many(visits)
        logger.info("  ✅ Seeded 4 visits")

    # ---- Billing ----
    billing_col = database.get_collection("billing")
    if await billing_col.count_documents({}) == 0:
        billing = [
            {"_id": "B001", "patientName": "John Anderson", "invoiceDate": "2026-04-01", "services": "Consultation + ECG", "amount": 350, "discount": 0, "tax": 35, "total": 385, "paymentMethod": "Insurance", "status": "Paid", "createdAt": "2026-04-01T11:00:00"},
            {"_id": "B002", "patientName": "Maria Garcia", "invoiceDate": "2026-03-28", "services": "Neurology Consultation + MRI", "amount": 1200, "discount": 100, "tax": 110, "total": 1210, "paymentMethod": "Card", "status": "Paid", "createdAt": "2026-03-28T15:00:00"},
            {"_id": "B003", "patientName": "Robert Chen", "invoiceDate": "2026-04-03", "services": "Orthopedic Consultation + X-Ray", "amount": 500, "discount": 50, "tax": 45, "total": 495, "paymentMethod": "Cash", "status": "Pending", "createdAt": "2026-04-03T10:00:00"},
            {"_id": "B004", "patientName": "Emily Davis", "invoiceDate": "2026-04-05", "services": "Pediatric Consultation", "amount": 200, "discount": 0, "tax": 20, "total": 220, "paymentMethod": "UPI", "status": "Paid", "createdAt": "2026-04-05T12:00:00"},
            {"_id": "B005", "patientName": "David Kim", "invoiceDate": "2026-04-04", "services": "Pre-Surgery Labs + Consultation", "amount": 800, "discount": 0, "tax": 80, "total": 880, "paymentMethod": "Insurance", "status": "Overdue", "createdAt": "2026-04-04T16:45:00"},
        ]
        await billing_col.insert_many(billing)
        logger.info("  ✅ Seeded 5 billing records")

    # ---- Prescriptions ----
    prescriptions_col = database.get_collection("prescriptions")
    if await prescriptions_col.count_documents({}) == 0:
        prescriptions = [
            {"_id": "RX001", "patientName": "John Anderson", "doctorName": "Dr. James Wilson", "date": "2026-04-01", "medications": "Lisinopril 10mg, Aspirin 81mg", "dosage": "Once daily", "duration": "30 days", "instructions": "Take with food. Monitor blood pressure daily.", "status": "Active", "createdAt": "2026-04-01T11:30:00"},
            {"_id": "RX002", "patientName": "Maria Garcia", "doctorName": "Dr. Anna Lee", "date": "2026-03-28", "medications": "Ibuprofen 400mg, Sumatriptan 50mg", "dosage": "As needed, max 2x daily", "duration": "14 days", "instructions": "Take at onset of headache. Rest in dark room.", "status": "Active", "createdAt": "2026-03-28T14:45:00"},
            {"_id": "RX003", "patientName": "Robert Chen", "doctorName": "Dr. Raj Patel", "date": "2026-04-03", "medications": "Naproxen 500mg, Glucosamine 1500mg", "dosage": "Twice daily", "duration": "60 days", "instructions": "Take with meals. Physical therapy 3x/week.", "status": "Active", "createdAt": "2026-04-03T10:15:00"},
            {"_id": "RX004", "patientName": "Emily Davis", "doctorName": "Dr. Sarah Mitchell", "date": "2026-04-05", "medications": "Cetirizine 10mg, Fluticasone nasal spray", "dosage": "Once daily", "duration": "21 days", "instructions": "Take cetirizine at night. Use spray in morning.", "status": "Active", "createdAt": "2026-04-05T11:45:00"},
        ]
        await prescriptions_col.insert_many(prescriptions)
        logger.info("  ✅ Seeded 4 prescriptions")

    # ---- Notifications ----
    notifications_col = database.get_collection("notifications")
    if await notifications_col.count_documents({}) == 0:
        notifications = [
            {"_id": "N001", "title": "New Appointment", "message": "David Kim has booked an emergency appointment for Apr 8", "type": "warning", "time": "2 min ago", "read": False},
            {"_id": "N002", "title": "Payment Received", "message": "Payment of $385 received from John Anderson", "type": "success", "time": "15 min ago", "read": False},
            {"_id": "N003", "title": "Lab Results Ready", "message": "Blood work results for Maria Garcia are available", "type": "info", "time": "1 hour ago", "read": False},
            {"_id": "N004", "title": "Overdue Payment", "message": "Invoice B005 for David Kim is overdue", "type": "error", "time": "3 hours ago", "read": True},
            {"_id": "N005", "title": "Schedule Update", "message": "Dr. Torres will be on leave until Apr 15", "type": "info", "time": "5 hours ago", "read": True},
            {"_id": "N006", "title": "System Update", "message": "Healthcare system updated to v2.5", "type": "success", "time": "1 day ago", "read": True},
        ]
        await notifications_col.insert_many(notifications)
        logger.info("  ✅ Seeded 6 notifications")

    logger.info("🌱 Database seeding complete!")

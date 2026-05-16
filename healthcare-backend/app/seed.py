# ============================================
# Database Seeder — Full Rich Data
# Populates MongoDB with complete realistic data
# for Master Data + Transaction Data sections
# ============================================

from app.database import database
from app.services.auth import hash_password
import logging

logger = logging.getLogger(__name__)


async def seed_database():
    """Seeds all collections with rich initial data if they are empty."""
    logger.info("🌱 Checking if database needs seeding...")

    # ─── Users ───────────────────────────────────────────────────────────────
    users_col = database.get_collection("users")
    if await users_col.count_documents({}) == 0:
        users = [
            {"_id": "U001", "username": "admin",  "hashed_password": hash_password("admin123"),  "name": "Dr. Admin Singh",     "role": "Admin",  "avatar": "🛡️",  "department": "Administration"},
            {"_id": "U002", "username": "doctor", "hashed_password": hash_password("doctor123"), "name": "Dr. Rajesh Kumar",    "role": "Doctor", "avatar": "👨‍⚕️", "department": "Cardiology",  "specialization": "Cardiologist"},
            {"_id": "U003", "username": "staff",  "hashed_password": hash_password("staff123"),  "name": "Priya Receptionist",  "role": "Staff",  "avatar": "👩‍💼", "department": "Reception"},
        ]
        await users_col.insert_many(users)
        logger.info("  ✅ Seeded 3 users")

    # ─── Patients (20 records) ────────────────────────────────────────────────
    patients_col = database.get_collection("patients")
    if await patients_col.count_documents({}) == 0:
        patients = [
            {"_id": "P001", "name": "Rahul Sharma",       "age": 34, "gender": "Male",   "contact": "+91-9876543201", "email": "rahul.sharma@gmail.com",    "address": "12 MG Road, New Delhi",          "bloodGroup": "B+",  "registeredDate": "2025-01-10", "status": "Active"},
            {"_id": "P002", "name": "Priya Mehta",        "age": 28, "gender": "Female", "contact": "+91-9876543202", "email": "priya.mehta@gmail.com",     "address": "45 Park Street, Mumbai",         "bloodGroup": "A+",  "registeredDate": "2025-01-22", "status": "Active"},
            {"_id": "P003", "name": "Arjun Patel",        "age": 52, "gender": "Male",   "contact": "+91-9876543203", "email": "arjun.patel@yahoo.com",     "address": "78 Ring Road, Ahmedabad",        "bloodGroup": "O+",  "registeredDate": "2025-02-05", "status": "Active"},
            {"_id": "P004", "name": "Sunita Verma",       "age": 41, "gender": "Female", "contact": "+91-9876543204", "email": "sunita.verma@hotmail.com",  "address": "23 Civil Lines, Jaipur",         "bloodGroup": "AB+", "registeredDate": "2025-02-18", "status": "Active"},
            {"_id": "P005", "name": "Vikram Singh",       "age": 63, "gender": "Male",   "contact": "+91-9876543205", "email": "vikram.singh@gmail.com",    "address": "56 Sector 15, Chandigarh",       "bloodGroup": "O-",  "registeredDate": "2025-03-01", "status": "Inactive"},
            {"_id": "P006", "name": "Kavita Joshi",       "age": 36, "gender": "Female", "contact": "+91-9876543206", "email": "kavita.joshi@gmail.com",    "address": "9 Banjara Hills, Hyderabad",     "bloodGroup": "A-",  "registeredDate": "2025-03-14", "status": "Active"},
            {"_id": "P007", "name": "Suresh Rawat",       "age": 47, "gender": "Male",   "contact": "+91-9876543207", "email": "suresh.rawat@gmail.com",    "address": "34 Rajpur Road, Dehradun",       "bloodGroup": "B-",  "registeredDate": "2025-03-28", "status": "Active"},
            {"_id": "P008", "name": "Meena Joshi",        "age": 31, "gender": "Female", "contact": "+91-9876543208", "email": "meena.joshi@gmail.com",     "address": "67 Lal Darwaza, Lucknow",        "bloodGroup": "AB-", "registeredDate": "2025-04-10", "status": "Active"},
            {"_id": "P009", "name": "Deepak Gupta",       "age": 55, "gender": "Male",   "contact": "+91-9876543209", "email": "deepak.gupta@rediffmail.com","address": "11 Karol Bagh, New Delhi",      "bloodGroup": "A+",  "registeredDate": "2025-04-22", "status": "Active"},
            {"_id": "P010", "name": "Anita Chauhan",      "age": 26, "gender": "Female", "contact": "+91-9876543210", "email": "anita.chauhan@gmail.com",   "address": "88 Koregaon Park, Pune",         "bloodGroup": "B+",  "registeredDate": "2025-05-06", "status": "Active"},
            {"_id": "P011", "name": "Ramesh Negi",        "age": 60, "gender": "Male",   "contact": "+91-9876543211", "email": "ramesh.negi@gmail.com",     "address": "5 Mallital, Nainital",           "bloodGroup": "O+",  "registeredDate": "2025-05-19", "status": "Active"},
            {"_id": "P012", "name": "Pooja Agarwal",      "age": 33, "gender": "Female", "contact": "+91-9876543212", "email": "pooja.agarwal@gmail.com",   "address": "22 Gomti Nagar, Lucknow",        "bloodGroup": "A-",  "registeredDate": "2025-06-01", "status": "Active"},
            {"_id": "P013", "name": "Rohit Malhotra",     "age": 44, "gender": "Male",   "contact": "+91-9876543213", "email": "rohit.m@gmail.com",         "address": "100 Indiranagar, Bangalore",     "bloodGroup": "B+",  "registeredDate": "2025-06-15", "status": "Active"},
            {"_id": "P014", "name": "Shalini Tripathi",   "age": 38, "gender": "Female", "contact": "+91-9876543214", "email": "shalini.t@gmail.com",       "address": "77 Allahabad", "bloodGroup": "AB+", "registeredDate": "2025-06-28", "status": "Active"},
            {"_id": "P015", "name": "Karan Khanna",       "age": 29, "gender": "Male",   "contact": "+91-9876543215", "email": "karan.khanna@gmail.com",    "address": "33 South Ex, New Delhi",         "bloodGroup": "O+",  "registeredDate": "2025-07-10", "status": "Active"},
            {"_id": "P016", "name": "Nisha Rathore",      "age": 49, "gender": "Female", "contact": "+91-9876543216", "email": "nisha.rathore@gmail.com",   "address": "50 Sector 22, Noida",            "bloodGroup": "A+",  "registeredDate": "2025-07-25", "status": "Inactive"},
            {"_id": "P017", "name": "Ajay Mishra",        "age": 57, "gender": "Male",   "contact": "+91-9876543217", "email": "ajay.mishra@gmail.com",     "address": "15 Ashok Nagar, Bhopal",         "bloodGroup": "B-",  "registeredDate": "2025-08-07", "status": "Active"},
            {"_id": "P018", "name": "Geeta Pandey",       "age": 43, "gender": "Female", "contact": "+91-9876543218", "email": "geeta.pandey@gmail.com",    "address": "62 Sigra, Varanasi",             "bloodGroup": "O-",  "registeredDate": "2025-08-20", "status": "Active"},
            {"_id": "P019", "name": "Manish Tiwari",      "age": 35, "gender": "Male",   "contact": "+91-9876543219", "email": "manish.tiwari@gmail.com",   "address": "19 Hazratganj, Lucknow",         "bloodGroup": "AB-", "registeredDate": "2025-09-03", "status": "Active"},
            {"_id": "P020", "name": "Rekha Sharma",       "age": 58, "gender": "Female", "contact": "+91-9876543220", "email": "rekha.sharma@gmail.com",    "address": "4 Jodhpur Park, Kolkata",        "bloodGroup": "A+",  "registeredDate": "2025-09-16", "status": "Active"},
        ]
        await patients_col.insert_many(patients)
        logger.info("  ✅ Seeded 20 patients")

    # ─── Doctors (12 records) ─────────────────────────────────────────────────
    doctors_col = database.get_collection("doctors")
    if await doctors_col.count_documents({}) == 0:
        doctors = [
            {"_id": "D001", "name": "Dr. Rajesh Kumar",    "specialization": "Cardiology",        "contact": "+91-9811001001", "email": "rajesh.kumar@hospital.com",    "experience": 18, "department": "Cardiology",        "availability": "Mon-Fri 9AM-5PM",  "status": "Available", "qualification": "MD, DM Cardiology",    "consultationFee": 800},
            {"_id": "D002", "name": "Dr. Priya Sharma",    "specialization": "Endocrinology",     "contact": "+91-9811001002", "email": "priya.sharma@hospital.com",    "experience": 14, "department": "Endocrinology",     "availability": "Mon-Sat 10AM-6PM", "status": "Available", "qualification": "MD Medicine, DM Endocrinology", "consultationFee": 700},
            {"_id": "D003", "name": "Dr. Amit Singh",      "specialization": "Orthopedics",       "contact": "+91-9811001003", "email": "amit.singh@hospital.com",      "experience": 22, "department": "Orthopedics",       "availability": "Tue-Sat 8AM-4PM",  "status": "Busy",      "qualification": "MS Orthopedics, FRCS", "consultationFee": 900},
            {"_id": "D004", "name": "Dr. Kavita Negi",     "specialization": "Dermatology",       "contact": "+91-9811001004", "email": "kavita.negi@hospital.com",     "experience": 11, "department": "Dermatology",       "availability": "Mon-Thu 10AM-5PM", "status": "Available", "qualification": "MD Dermatology",       "consultationFee": 600},
            {"_id": "D005", "name": "Dr. Sunil Verma",     "specialization": "Neurology",         "contact": "+91-9811001005", "email": "sunil.verma@hospital.com",     "experience": 16, "department": "Neurology",         "availability": "Mon-Fri 9AM-3PM",  "status": "Available", "qualification": "MD, DM Neurology",     "consultationFee": 850},
            {"_id": "D006", "name": "Dr. Meena Agarwal",   "specialization": "Pediatrics",        "contact": "+91-9811001006", "email": "meena.agarwal@hospital.com",   "experience": 13, "department": "Pediatrics",        "availability": "Mon-Sat 9AM-5PM",  "status": "Available", "qualification": "MD Pediatrics, DCH",   "consultationFee": 650},
            {"_id": "D007", "name": "Dr. Rahul Gupta",     "specialization": "General Surgery",   "contact": "+91-9811001007", "email": "rahul.gupta@hospital.com",     "experience": 20, "department": "Surgery",           "availability": "Mon-Fri 7AM-3PM",  "status": "Available", "qualification": "MS Surgery, MCh",     "consultationFee": 1000},
            {"_id": "D008", "name": "Dr. Anita Malhotra",  "specialization": "Gynecology",        "contact": "+91-9811001008", "email": "anita.malhotra@hospital.com",  "experience": 17, "department": "Gynecology",        "availability": "Mon-Sat 10AM-6PM", "status": "Available", "qualification": "MS OBG, FRCOG",       "consultationFee": 750},
            {"_id": "D009", "name": "Dr. Vijay Rao",       "specialization": "Radiology",         "contact": "+91-9811001009", "email": "vijay.rao@hospital.com",       "experience": 15, "department": "Radiology",         "availability": "Mon-Fri 8AM-4PM",  "status": "On Leave",  "qualification": "MD Radiology, DMRE",  "consultationFee": 500},
            {"_id": "D010", "name": "Dr. Ritu Joshi",      "specialization": "Ophthalmology",     "contact": "+91-9811001010", "email": "ritu.joshi@hospital.com",      "experience": 9,  "department": "Ophthalmology",     "availability": "Tue-Sat 9AM-5PM",  "status": "Available", "qualification": "MS Ophthalmology",    "consultationFee": 600},
            {"_id": "D011", "name": "Dr. Arun Mishra",     "specialization": "Pulmonology",       "contact": "+91-9811001011", "email": "arun.mishra@hospital.com",     "experience": 12, "department": "Pulmonology",       "availability": "Mon-Fri 9AM-5PM",  "status": "Available", "qualification": "MD Pulmonology",      "consultationFee": 700},
            {"_id": "D012", "name": "Dr. Pooja Sinha",     "specialization": "Psychiatry",        "contact": "+91-9811001012", "email": "pooja.sinha@hospital.com",     "experience": 10, "department": "Psychiatry",        "availability": "Mon-Thu 10AM-4PM", "status": "Available", "qualification": "MD Psychiatry, DPM",  "consultationFee": 650},
        ]
        await doctors_col.insert_many(doctors)
        logger.info("  ✅ Seeded 12 doctors")

    # ─── Staff (10 records) ───────────────────────────────────────────────────
    staff_col = database.get_collection("staff")
    if await staff_col.count_documents({}) == 0:
        staff = [
            {"_id": "S001", "name": "Priya Receptionist",   "role": "Head Receptionist",   "department": "Reception",       "contact": "+91-9822001001", "email": "priya.r@hospital.com",     "joinDate": "2019-03-15", "status": "Active",   "salary": 35000, "shift": "Morning"},
            {"_id": "S002", "name": "Ravi Lab Tech",         "role": "Lab Technician",       "department": "Pathology",       "contact": "+91-9822001002", "email": "ravi.lab@hospital.com",    "joinDate": "2020-06-20", "status": "Active",   "salary": 32000, "shift": "Morning"},
            {"_id": "S003", "name": "Sunita Nurse",          "role": "Staff Nurse",          "department": "ICU",             "contact": "+91-9822001003", "email": "sunita.n@hospital.com",    "joinDate": "2018-11-10", "status": "Active",   "salary": 30000, "shift": "Day"},
            {"_id": "S004", "name": "Mohan Pharmacist",      "role": "Senior Pharmacist",    "department": "Pharmacy",        "contact": "+91-9822001004", "email": "mohan.pharma@hospital.com","joinDate": "2017-09-05", "status": "Active",   "salary": 40000, "shift": "Morning"},
            {"_id": "S005", "name": "Geeta Ward Boy",        "role": "Ward Attendant",       "department": "General Ward",    "contact": "+91-9822001005", "email": "geeta.w@hospital.com",     "joinDate": "2022-02-14", "status": "Active",   "salary": 18000, "shift": "Night"},
            {"_id": "S006", "name": "Ramesh Security",       "role": "Security Guard",       "department": "Security",        "contact": "+91-9822001006", "email": "ramesh.s@hospital.com",    "joinDate": "2021-07-01", "status": "Active",   "salary": 20000, "shift": "Night"},
            {"_id": "S007", "name": "Asha Dietician",        "role": "Clinical Dietician",   "department": "Nutrition",       "contact": "+91-9822001007", "email": "asha.diet@hospital.com",   "joinDate": "2020-04-18", "status": "Active",   "salary": 28000, "shift": "Morning"},
            {"_id": "S008", "name": "Sanjay Radiology Tech", "role": "Radiology Technician", "department": "Radiology",       "contact": "+91-9822001008", "email": "sanjay.rt@hospital.com",   "joinDate": "2019-12-01", "status": "Active",   "salary": 34000, "shift": "Morning"},
            {"_id": "S009", "name": "Kavita Admin",          "role": "Medical Records Clerk","department": "Administration",  "contact": "+91-9822001009", "email": "kavita.a@hospital.com",    "joinDate": "2023-01-10", "status": "Active",   "salary": 22000, "shift": "Day"},
            {"_id": "S010", "name": "Nitin Ambulance",       "role": "Ambulance Driver",     "department": "Emergency",       "contact": "+91-9822001010", "email": "nitin.ambu@hospital.com",  "joinDate": "2021-05-22", "status": "Inactive", "salary": 25000, "shift": "Rotational"},
        ]
        await staff_col.insert_many(staff)
        logger.info("  ✅ Seeded 10 staff")

    # ─── Departments (10 records) ─────────────────────────────────────────────
    departments_col = database.get_collection("departments")
    if await departments_col.count_documents({}) == 0:
        departments = [
            {"_id": "DEP001", "name": "Cardiology",      "head": "Dr. Rajesh Kumar",   "staffCount": 28, "location": "Block A, Floor 3", "contact": "+91-11-40010001", "status": "Active",   "bedsAvailable": 12, "totalBeds": 20},
            {"_id": "DEP002", "name": "Endocrinology",   "head": "Dr. Priya Sharma",   "staffCount": 15, "location": "Block B, Floor 2", "contact": "+91-11-40010002", "status": "Active",   "bedsAvailable": 6,  "totalBeds": 10},
            {"_id": "DEP003", "name": "Orthopedics",     "head": "Dr. Amit Singh",     "staffCount": 22, "location": "Block A, Floor 2", "contact": "+91-11-40010003", "status": "Active",   "bedsAvailable": 8,  "totalBeds": 15},
            {"_id": "DEP004", "name": "Dermatology",     "head": "Dr. Kavita Negi",    "staffCount": 10, "location": "Block C, Floor 1", "contact": "+91-11-40010004", "status": "Active",   "bedsAvailable": 5,  "totalBeds": 8},
            {"_id": "DEP005", "name": "Neurology",       "head": "Dr. Sunil Verma",    "staffCount": 20, "location": "Block A, Floor 4", "contact": "+91-11-40010005", "status": "Active",   "bedsAvailable": 7,  "totalBeds": 12},
            {"_id": "DEP006", "name": "Pediatrics",      "head": "Dr. Meena Agarwal",  "staffCount": 18, "location": "Block C, Floor 2", "contact": "+91-11-40010006", "status": "Active",   "bedsAvailable": 10, "totalBeds": 15},
            {"_id": "DEP007", "name": "Surgery",         "head": "Dr. Rahul Gupta",    "staffCount": 35, "location": "Block B, Floor 1", "contact": "+91-11-40010007", "status": "Active",   "bedsAvailable": 3,  "totalBeds": 20},
            {"_id": "DEP008", "name": "Gynecology",      "head": "Dr. Anita Malhotra", "staffCount": 16, "location": "Block D, Floor 1", "contact": "+91-11-40010008", "status": "Active",   "bedsAvailable": 9,  "totalBeds": 14},
            {"_id": "DEP009", "name": "Emergency & ICU", "head": "Dr. Rajesh Kumar",   "staffCount": 45, "location": "Block A, Floor 1", "contact": "+91-11-40010009", "status": "Active",   "bedsAvailable": 4,  "totalBeds": 30},
            {"_id": "DEP010", "name": "Radiology",       "head": "Dr. Vijay Rao",      "staffCount": 12, "location": "Block B, Floor 3", "contact": "+91-11-40010010", "status": "Inactive", "bedsAvailable": 0,  "totalBeds": 0},
        ]
        await departments_col.insert_many(departments)
        logger.info("  ✅ Seeded 10 departments")

    # ─── Appointments (15 records) ────────────────────────────────────────────
    appointments_col = database.get_collection("appointments")
    if await appointments_col.count_documents({}) == 0:
        appointments = [
            {"_id": "APT001", "patientName": "Rahul Sharma",     "doctorName": "Dr. Rajesh Kumar",   "department": "Cardiology",    "date": "2026-04-18", "time": "09:00 AM", "status": "Scheduled",   "type": "Consultation", "notes": "BP monitoring, ECG review",         "createdAt": "2026-04-10T10:00:00"},
            {"_id": "APT002", "patientName": "Priya Mehta",      "doctorName": "Dr. Priya Sharma",   "department": "Endocrinology", "date": "2026-04-18", "time": "10:30 AM", "status": "Scheduled",   "type": "Follow-up",    "notes": "Thyroid report review",             "createdAt": "2026-04-11T09:00:00"},
            {"_id": "APT003", "patientName": "Arjun Patel",      "doctorName": "Dr. Amit Singh",     "department": "Orthopedics",   "date": "2026-04-17", "time": "02:00 PM", "status": "In Progress", "type": "Consultation", "notes": "Right knee pain, X-ray pending",    "createdAt": "2026-04-09T14:00:00"},
            {"_id": "APT004", "patientName": "Sunita Verma",     "doctorName": "Dr. Kavita Negi",    "department": "Dermatology",   "date": "2026-04-16", "time": "11:00 AM", "status": "Completed",   "type": "Consultation", "notes": "Skin allergy treatment",            "createdAt": "2026-04-08T11:00:00"},
            {"_id": "APT005", "patientName": "Vikram Singh",     "doctorName": "Dr. Rahul Gupta",    "department": "Surgery",       "date": "2026-04-19", "time": "08:00 AM", "status": "Scheduled",   "type": "Emergency",    "notes": "Appendix evaluation pre-surgery",  "createdAt": "2026-04-12T16:00:00"},
            {"_id": "APT006", "patientName": "Kavita Joshi",     "doctorName": "Dr. Rajesh Kumar",   "department": "Cardiology",    "date": "2026-04-16", "time": "03:30 PM", "status": "Completed",   "type": "Follow-up",    "notes": "Post-angioplasty review",          "createdAt": "2026-04-08T15:00:00"},
            {"_id": "APT007", "patientName": "Suresh Rawat",     "doctorName": "Dr. Sunil Verma",    "department": "Neurology",     "date": "2026-04-20", "time": "09:30 AM", "status": "Scheduled",   "type": "Consultation", "notes": "Migraine and dizziness",           "createdAt": "2026-04-13T10:00:00"},
            {"_id": "APT008", "patientName": "Meena Joshi",      "doctorName": "Dr. Priya Sharma",   "department": "Endocrinology", "date": "2026-04-22", "time": "11:30 AM", "status": "Scheduled",   "type": "Follow-up",    "notes": "Diabetes management review",       "createdAt": "2026-04-14T09:30:00"},
            {"_id": "APT009", "patientName": "Deepak Gupta",     "doctorName": "Dr. Amit Singh",     "department": "Orthopedics",   "date": "2026-04-15", "time": "04:00 PM", "status": "Cancelled",   "type": "Consultation", "notes": "Cancelled by patient",             "createdAt": "2026-04-07T12:00:00"},
            {"_id": "APT010", "patientName": "Anita Chauhan",    "doctorName": "Dr. Meena Agarwal",  "department": "Pediatrics",    "date": "2026-04-18", "time": "01:00 PM", "status": "Scheduled",   "type": "Consultation", "notes": "Child vaccination schedule",        "createdAt": "2026-04-12T11:00:00"},
            {"_id": "APT011", "patientName": "Ramesh Negi",      "doctorName": "Dr. Arun Mishra",    "department": "Pulmonology",   "date": "2026-04-18", "time": "11:00 AM", "status": "Scheduled",   "type": "Consultation", "notes": "Chronic cough and breathlessness",  "createdAt": "2026-04-13T14:00:00"},
            {"_id": "APT012", "patientName": "Pooja Agarwal",    "doctorName": "Dr. Anita Malhotra", "department": "Gynecology",    "date": "2026-04-17", "time": "10:00 AM", "status": "Completed",   "type": "Consultation", "notes": "Routine antenatal check",           "createdAt": "2026-04-09T09:00:00"},
            {"_id": "APT013", "patientName": "Rohit Malhotra",   "doctorName": "Dr. Sunil Verma",    "department": "Neurology",     "date": "2026-04-16", "time": "02:30 PM", "status": "Completed",   "type": "Emergency",    "notes": "Severe headache, stroke screening","createdAt": "2026-04-08T13:00:00"},
            {"_id": "APT014", "patientName": "Shalini Tripathi", "doctorName": "Dr. Kavita Negi",    "department": "Dermatology",   "date": "2026-04-21", "time": "12:00 PM", "status": "Scheduled",   "type": "Follow-up",    "notes": "Eczema treatment follow-up",        "createdAt": "2026-04-14T08:00:00"},
            {"_id": "APT015", "patientName": "Karan Khanna",     "doctorName": "Dr. Ritu Joshi",     "department": "Ophthalmology", "date": "2026-04-19", "time": "10:00 AM", "status": "Scheduled",   "type": "Consultation", "notes": "Blurry vision, eye power check",    "createdAt": "2026-04-14T10:00:00"},
        ]
        await appointments_col.insert_many(appointments)
        logger.info("  ✅ Seeded 15 appointments")

    # ─── Patient Visits (10 records) ──────────────────────────────────────────
    visits_col = database.get_collection("visits")
    if await visits_col.count_documents({}) == 0:
        visits = [
            {"_id": "V001", "patientName": "Rahul Sharma",   "doctorName": "Dr. Rajesh Kumar",   "visitDate": "2026-04-10", "diagnosis": "Hypertension Stage 1",       "treatment": "Amlodipine 5mg OD, lifestyle modification",  "followUpDate": "2026-04-18", "status": "Follow-up Required", "vitals": {"bp": "140/90", "temp": "98.6°F", "pulse": "82 bpm", "weight": "75 kg", "spo2": "97%"}, "createdAt": "2026-04-10T10:00:00"},
            {"_id": "V002", "patientName": "Priya Mehta",    "doctorName": "Dr. Priya Sharma",   "visitDate": "2026-04-02", "diagnosis": "Hypothyroidism",             "treatment": "Levothyroxine 50mcg OD",                     "followUpDate": "2026-04-22", "status": "Follow-up Required", "vitals": {"bp": "118/76", "temp": "97.8°F", "pulse": "64 bpm", "weight": "62 kg", "spo2": "99%"}, "createdAt": "2026-04-02T11:00:00"},
            {"_id": "V003", "patientName": "Arjun Patel",    "doctorName": "Dr. Amit Singh",     "visitDate": "2026-04-08", "diagnosis": "Osteoarthritis Right Knee",  "treatment": "Diclofenac 75mg BD, physiotherapy 3x/week",  "followUpDate": "2026-04-20", "status": "Follow-up Required", "vitals": {"bp": "132/84", "temp": "98.2°F", "pulse": "78 bpm", "weight": "88 kg", "spo2": "98%"}, "createdAt": "2026-04-08T14:00:00"},
            {"_id": "V004", "patientName": "Sunita Verma",   "doctorName": "Dr. Kavita Negi",    "visitDate": "2026-04-16", "diagnosis": "Contact Dermatitis",         "treatment": "Hydrocortisone cream 1%, antihistamine",     "followUpDate": "",           "status": "Completed",          "vitals": {"bp": "110/70", "temp": "98.4°F", "pulse": "70 bpm", "weight": "58 kg", "spo2": "99%"}, "createdAt": "2026-04-16T11:00:00"},
            {"_id": "V005", "patientName": "Kavita Joshi",   "doctorName": "Dr. Rajesh Kumar",   "visitDate": "2026-04-16", "diagnosis": "Stable Angina",              "treatment": "Nitrate spray SOS, Metoprolol 25mg BD",      "followUpDate": "2026-05-01", "status": "Follow-up Required", "vitals": {"bp": "138/88", "temp": "98.6°F", "pulse": "88 bpm", "weight": "70 kg", "spo2": "96%"}, "createdAt": "2026-04-16T15:30:00"},
            {"_id": "V006", "patientName": "Meena Joshi",    "doctorName": "Dr. Priya Sharma",   "visitDate": "2026-04-12", "diagnosis": "Type 2 Diabetes Mellitus",   "treatment": "Metformin 500mg BD, Glimepiride 2mg OD",    "followUpDate": "2026-04-22", "status": "Follow-up Required", "vitals": {"bp": "130/82", "temp": "98.4°F", "pulse": "76 bpm", "weight": "72 kg", "spo2": "98%"}, "createdAt": "2026-04-12T10:30:00"},
            {"_id": "V007", "patientName": "Deepak Gupta",   "doctorName": "Dr. Amit Singh",     "visitDate": "2026-04-11", "diagnosis": "Lumbar Spondylosis",         "treatment": "Traction therapy, Methocarbamol 750mg TDS",  "followUpDate": "2026-04-25", "status": "Follow-up Required", "vitals": {"bp": "128/80", "temp": "98.6°F", "pulse": "72 bpm", "weight": "82 kg", "spo2": "99%"}, "createdAt": "2026-04-11T09:00:00"},
            {"_id": "V008", "patientName": "Pooja Agarwal",  "doctorName": "Dr. Anita Malhotra", "visitDate": "2026-04-17", "diagnosis": "32 weeks pregnancy - normal","treatment": "Iron + Folic acid, calcium supplements",     "followUpDate": "2026-05-01", "status": "Follow-up Required", "vitals": {"bp": "116/74", "temp": "98.0°F", "pulse": "82 bpm", "weight": "68 kg", "spo2": "98%"}, "createdAt": "2026-04-17T10:00:00"},
            {"_id": "V009", "patientName": "Rohit Malhotra", "doctorName": "Dr. Sunil Verma",    "visitDate": "2026-04-16", "diagnosis": "Tension Type Headache",      "treatment": "Paracetamol 650mg SOS, stress management",   "followUpDate": "",           "status": "Completed",          "vitals": {"bp": "122/78", "temp": "98.4°F", "pulse": "74 bpm", "weight": "80 kg", "spo2": "99%"}, "createdAt": "2026-04-16T14:30:00"},
            {"_id": "V010", "patientName": "Ramesh Negi",    "doctorName": "Dr. Arun Mishra",    "visitDate": "2026-04-13", "diagnosis": "COPD - Mild",                "treatment": "Salbutamol inhaler BD, Tiotropium OD",       "followUpDate": "2026-04-28", "status": "Follow-up Required", "vitals": {"bp": "136/86", "temp": "98.8°F", "pulse": "88 bpm", "weight": "65 kg", "spo2": "93%"}, "createdAt": "2026-04-13T11:00:00"},
        ]
        await visits_col.insert_many(visits)
        logger.info("  ✅ Seeded 10 patient visits")

    # ─── Billing (10 records) ─────────────────────────────────────────────────
    billing_col = database.get_collection("billing")
    if await billing_col.count_documents({}) == 0:
        billing = [
            {"_id": "B001", "patientName": "Rahul Sharma",     "invoiceDate": "2026-04-10", "services": "Cardiology Consultation + ECG + Blood Pressure Monitor",      "amount": 1200, "discount": 100, "tax": 110, "total": 1210, "paymentMethod": "Insurance", "status": "Paid",    "createdAt": "2026-04-10T11:00:00"},
            {"_id": "B002", "patientName": "Priya Mehta",      "invoiceDate": "2026-04-02", "services": "Endocrinology Consultation + Thyroid Panel Tests",            "amount": 1800, "discount": 200, "tax": 160, "total": 1760, "paymentMethod": "Card",      "status": "Paid",    "createdAt": "2026-04-02T12:00:00"},
            {"_id": "B003", "patientName": "Arjun Patel",      "invoiceDate": "2026-04-08", "services": "Orthopedic Consultation + X-Ray (Knee) + Physiotherapy",     "amount": 2500, "discount": 250, "tax": 225, "total": 2475, "paymentMethod": "Cash",      "status": "Pending", "createdAt": "2026-04-08T15:00:00"},
            {"_id": "B004", "patientName": "Sunita Verma",     "invoiceDate": "2026-04-16", "services": "Dermatology Consultation + Skin Biopsy + Patch Test",         "amount": 900,  "discount": 0,   "tax": 90,  "total": 990,  "paymentMethod": "UPI",       "status": "Paid",    "createdAt": "2026-04-16T12:00:00"},
            {"_id": "B005", "patientName": "Vikram Singh",     "invoiceDate": "2026-04-12", "services": "Pre-Surgery Labs + CT Abdomen + Surgery Consultation",        "amount": 4500, "discount": 500, "tax": 400, "total": 4400, "paymentMethod": "Insurance", "status": "Overdue", "createdAt": "2026-04-12T16:00:00"},
            {"_id": "B006", "patientName": "Kavita Joshi",     "invoiceDate": "2026-04-16", "services": "Cardiology Follow-up + 2D Echo + Stress Test",                "amount": 3200, "discount": 300, "tax": 290, "total": 3190, "paymentMethod": "Card",      "status": "Paid",    "createdAt": "2026-04-16T16:00:00"},
            {"_id": "B007", "patientName": "Meena Joshi",      "invoiceDate": "2026-04-12", "services": "Endocrinology Consultation + HbA1c + Fasting Blood Sugar",    "amount": 1400, "discount": 100, "tax": 130, "total": 1430, "paymentMethod": "UPI",       "status": "Paid",    "createdAt": "2026-04-12T11:30:00"},
            {"_id": "B008", "patientName": "Deepak Gupta",     "invoiceDate": "2026-04-11", "services": "Orthopedic Consultation + MRI Lumbar Spine + Traction",       "amount": 3800, "discount": 380, "tax": 342, "total": 3762, "paymentMethod": "Insurance", "status": "Pending", "createdAt": "2026-04-11T10:00:00"},
            {"_id": "B009", "patientName": "Pooja Agarwal",    "invoiceDate": "2026-04-17", "services": "Gynecology OPD + Antenatal Profile + USG Abdomen",            "amount": 2200, "discount": 200, "tax": 200, "total": 2200, "paymentMethod": "Card",      "status": "Paid",    "createdAt": "2026-04-17T11:00:00"},
            {"_id": "B010", "patientName": "Ramesh Negi",      "invoiceDate": "2026-04-13", "services": "Pulmonology Consultation + PFT + Chest X-Ray + Spirometry",   "amount": 2800, "discount": 280, "tax": 252, "total": 2772, "paymentMethod": "Cash",      "status": "Paid",    "createdAt": "2026-04-13T12:00:00"},
        ]
        await billing_col.insert_many(billing)
        logger.info("  ✅ Seeded 10 billing records")

    # ─── Prescriptions (10 records) ───────────────────────────────────────────
    prescriptions_col = database.get_collection("prescriptions")
    if await prescriptions_col.count_documents({}) == 0:
        prescriptions = [
            {"_id": "RX001", "patientName": "Rahul Sharma",   "doctorName": "Dr. Rajesh Kumar",   "date": "2026-04-10", "medications": "Amlodipine 5mg, Aspirin 75mg, Rosuvastatin 10mg", "dosage": "OD each",            "duration": "30 days", "instructions": "Take Amlodipine & Aspirin after breakfast. Rosuvastatin at night.", "status": "Active",    "createdAt": "2026-04-10T11:30:00"},
            {"_id": "RX002", "patientName": "Priya Mehta",    "doctorName": "Dr. Priya Sharma",   "date": "2026-04-02", "medications": "Levothyroxine 50mcg, Vitamin D3 60K IU",           "dosage": "OD / Weekly",        "duration": "90 days", "instructions": "Levothyroxine 30min before breakfast on empty stomach.",         "status": "Active",    "createdAt": "2026-04-02T12:30:00"},
            {"_id": "RX003", "patientName": "Arjun Patel",    "doctorName": "Dr. Amit Singh",     "date": "2026-04-08", "medications": "Diclofenac 75mg, Pantoprazole 40mg, Calcium 500mg","dosage": "BD, OD, OD",         "duration": "60 days", "instructions": "Diclofenac after food. Pantoprazole before food. Calcium at night.", "status": "Active",  "createdAt": "2026-04-08T15:30:00"},
            {"_id": "RX004", "patientName": "Sunita Verma",   "doctorName": "Dr. Kavita Negi",    "date": "2026-04-16", "medications": "Hydrocortisone cream 1%, Cetirizine 10mg",          "dosage": "BD local / OD oral", "duration": "21 days", "instructions": "Apply cream on affected areas twice daily. Cetirizine at bedtime.", "status": "Active", "createdAt": "2026-04-16T12:30:00"},
            {"_id": "RX005", "patientName": "Kavita Joshi",   "doctorName": "Dr. Rajesh Kumar",   "date": "2026-04-16", "medications": "Metoprolol 25mg, Nitroglycerin 0.5mg spray SOS",   "dosage": "BD, SOS",            "duration": "30 days", "instructions": "Metoprolol after meals. Nitrate spray under tongue for chest pain.", "status": "Active", "createdAt": "2026-04-16T16:30:00"},
            {"_id": "RX006", "patientName": "Meena Joshi",    "doctorName": "Dr. Priya Sharma",   "date": "2026-04-12", "medications": "Metformin 500mg, Glimepiride 2mg, Voglibose 0.3mg","dosage": "BD, OD, TDS",        "duration": "90 days", "instructions": "Metformin & Voglibose with meals. Glimepiride before breakfast.",   "status": "Active",  "createdAt": "2026-04-12T11:00:00"},
            {"_id": "RX007", "patientName": "Deepak Gupta",   "doctorName": "Dr. Amit Singh",     "date": "2026-04-11", "medications": "Methocarbamol 750mg, Lornoxicam 8mg, Gabapentin 300mg","dosage": "TDS, BD, OD",     "duration": "30 days", "instructions": "Take with food. Avoid alcohol. Do not drive if drowsy.",           "status": "Active",  "createdAt": "2026-04-11T09:30:00"},
            {"_id": "RX008", "patientName": "Pooja Agarwal",  "doctorName": "Dr. Anita Malhotra", "date": "2026-04-17", "medications": "Ferrous Sulphate 200mg, Folic Acid 5mg, Calcium Citrate 500mg","dosage": "BD, OD, BD","duration": "Until delivery", "instructions": "Iron & Calcium to be taken 2 hours apart. Folic acid after breakfast.", "status": "Active", "createdAt": "2026-04-17T11:30:00"},
            {"_id": "RX009", "patientName": "Rohit Malhotra", "doctorName": "Dr. Sunil Verma",    "date": "2026-04-16", "medications": "Paracetamol 650mg, Amitriptyline 10mg",            "dosage": "SOS (max TDS), OD",  "duration": "14 days", "instructions": "Paracetamol only when headache. Amitriptyline at bedtime.",        "status": "Active",  "createdAt": "2026-04-16T15:00:00"},
            {"_id": "RX010", "patientName": "Ramesh Negi",    "doctorName": "Dr. Arun Mishra",    "date": "2026-04-13", "medications": "Salbutamol inhaler, Tiotropium 18mcg, Budesonide 200mcg","dosage": "SOS, OD, BD",    "duration": "60 days", "instructions": "Use Salbutamol during breathlessness. Tiotropium & Budesonide daily.", "status": "Active", "createdAt": "2026-04-13T12:30:00"},
        ]
        await prescriptions_col.insert_many(prescriptions)
        logger.info("  ✅ Seeded 10 prescriptions")

    # ─── Notifications ────────────────────────────────────────────────────────
    notifications_col = database.get_collection("notifications")
    if await notifications_col.count_documents({}) == 0:
        notifications = [
            {"_id": "N001", "title": "🚨 Emergency Admission",     "message": "Vikram Singh admitted to Emergency. Surgery required.",           "type": "error",   "time": "5 min ago",  "read": False},
            {"_id": "N002", "title": "💰 Payment Received",        "message": "Insurance payment ₹1,210 received for Rahul Sharma (B001)",       "type": "success", "time": "12 min ago", "read": False},
            {"_id": "N003", "title": "📋 Lab Report Ready",        "message": "Thyroid panel report for Priya Mehta is ready for review.",        "type": "info",    "time": "45 min ago", "read": False},
            {"_id": "N004", "title": "⏰ Overdue Payment",         "message": "Invoice B005 for Vikram Singh (₹4,400) is 2 days overdue.",        "type": "error",   "time": "2 hrs ago",  "read": True},
            {"_id": "N005", "title": "📅 Appointment Reminder",    "message": "15 appointments scheduled tomorrow. 3 marked as urgent.",          "type": "warning", "time": "3 hrs ago",  "read": True},
            {"_id": "N006", "title": "🩺 Doctor Leave",            "message": "Dr. Vijay Rao (Radiology) on leave until April 25.",              "type": "info",    "time": "5 hrs ago",  "read": True},
            {"_id": "N007", "title": "✅ Surgery Completed",       "message": "Dr. Rahul Gupta completed appendectomy for patient successfully.", "type": "success", "time": "6 hrs ago",  "read": True},
            {"_id": "N008", "title": "💊 Low Pharmacy Stock",      "message": "Amlodipine 5mg stock below threshold. Reorder required.",          "type": "warning", "time": "1 day ago",  "read": True},
        ]
        await notifications_col.insert_many(notifications)
        logger.info("  ✅ Seeded 8 notifications")

    logger.info("🌱 Database seeding complete!")

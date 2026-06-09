import asyncio
import requests
import sys

# Ensure UTF-8 output if supported, otherwise safely ignore emojis
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

from motor.motor_asyncio import AsyncIOMotorClient
from app.services.auth import hash_password

BASE_URL = "http://localhost:8000"
MONGO_URI = 'mongodb+srv://shivanshnegi1219_db_user:J0qB3MpuCvQ7uJOJ@cluster0.6lzk2sm.mongodb.net/?appName=Cluster0'

async def main():
    print("Connecting to MongoDB...")
    client = AsyncIOMotorClient(MONGO_URI)
    db = client.healthpulse
    
    # 1. Create/Ensure Test Patient User
    patient_id = "P_AUTO_TEST"
    patient_username = "pat_auto"
    patient_pwd = "patientpwd123"
    patient_name = "Auto Test Patient"
    
    # Update or insert user
    await db.users.delete_many({"_id": patient_id})
    await db.users.delete_many({"username": patient_username})
    await db.users.insert_one({
        "_id": patient_id,
        "username": patient_username,
        "hashed_password": hash_password(patient_pwd),
        "name": patient_name,
        "role": "Patient",
        "avatar": "👤"
    })
    
    # Update or insert patient
    await db.patients.delete_many({"_id": patient_id})
    await db.patients.insert_one({
        "_id": patient_id,
        "name": patient_name,
        "email": "auto.test@example.com",
        "age": 30,
        "gender": "Male",
        "contact": "+91-9999999999",
        "address": "Test Address",
        "bloodGroup": "O+",
        "registeredDate": "2026-06-04",
        "status": "Active"
    })
    
    print(f"Created test user & patient record with ID {patient_id}")
    
    try:
        # 2. Login as Doctor
        print("\nLogging in as Doctor...")
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "doctor",
            "password": "doctor123"
        })
        assert r.status_code == 200, f"Doctor login failed: {r.text}"
        doc_token = r.json()["data"]["token"]
        doc_headers = {"Authorization": f"Bearer {doc_token}"}
        print("Logged in as Doctor successfully.")
        
        # 3. Create Prescription as Doctor for Patient
        print("\nCreating prescription...")
        presc_payload = {
            "patientName": patient_name,
            "patient_id": patient_id,
            "doctorName": "Dr. Rajesh Kumar",
            "medications": "Amoxicillin 500mg, Paracetamol 650mg",
            "dosage": "TDS / BD",
            "duration": "5 days",
            "instructions": "Take after meals",
            "diagnosis": "Mild Fever and throat infection",
            "date": "2026-06-04",
            "status": "Active"
        }
        r = requests.post(f"{BASE_URL}/api/prescriptions", json=presc_payload, headers=doc_headers)
        assert r.status_code == 200, f"Failed to create prescription: {r.text}"
        presc_res = r.json()["data"]
        presc_id = presc_res["id"]
        print(f"Prescription created with ID {presc_id}")
        
        # 4. Login as Patient
        print("\nLogging in as Patient...")
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": patient_username,
            "password": patient_pwd
        })
        assert r.status_code == 200, f"Patient login failed: {r.text}"
        pat_token = r.json()["data"]["token"]
        pat_headers = {"Authorization": f"Bearer {pat_token}"}
        print("Logged in as Patient successfully.")
        
        # 5. Fetch prescriptions as patient
        print(f"\nFetching prescriptions for patient {patient_id}...")
        r = requests.get(f"{BASE_URL}/api/prescriptions/patient/{patient_id}", headers=pat_headers)
        assert r.status_code == 200, f"Failed to fetch prescriptions: {r.text}"
        prescriptions = r.json()["data"]
        print(f"Found {len(prescriptions)} prescriptions for patient.")
        found = False
        for p in prescriptions:
            if p["id"] == presc_id:
                found = True
                print("SUCCESS: Found the newly created prescription in patient's list!")
                print(f"Details: Meds={p['medications']}, Diagnosis={p['diagnosis']}")
        assert found, "Prescription was NOT found in patient's list!"
        
        # 6. Fetch general prescriptions endpoint as patient
        print(f"\nFetching general prescriptions endpoint as patient...")
        r = requests.get(f"{BASE_URL}/api/prescriptions", headers=pat_headers)
        assert r.status_code == 200, f"Failed to fetch general prescriptions: {r.text}"
        general_prescs = r.json()["data"]["data"]
        print(f"General endpoint returned {len(general_prescs)} prescriptions for patient.")
        found_gen = any(p["id"] == presc_id for p in general_prescs)
        assert found_gen, "Prescription was NOT found in general list when fetched by patient!"
        
        # 7. Check if notification is created
        print("\nChecking for patient notification in DB...")
        notif = await db.notifications.find_one({"patientId": patient_id})
        assert notif is not None, "Notification was not generated in the database!"
        print(f"SUCCESS: Notification found! Title='{notif.get('title')}', Message='{notif.get('message')}'")
        
        print("\nALL WORKFLOW VERIFICATION CHECKS PASSED SUCCESSFULLY!")
        
    finally:
        # Cleanup
        print("\nCleaning up test records...")
        await db.users.delete_many({"_id": patient_id})
        await db.patients.delete_many({"_id": patient_id})
        await db.prescriptions.delete_many({"patient_id": patient_id})
        await db.notifications.delete_many({"patientId": patient_id})
        print("Cleanup completed.")

if __name__ == "__main__":
    asyncio.run(main())

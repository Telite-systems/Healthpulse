import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import datetime

async def main():
    client = AsyncIOMotorClient('mongodb+srv://shivanshnegi1219_db_user:J0qB3MpuCvQ7uJOJ@cluster0.6lzk2sm.mongodb.net/?appName=Cluster0')
    db = client.healthpulse
    
    # Let's check users for Shivansh Negi
    user = await db.users.find_one({"username": "shiva06"})
    if not user:
        print("User shiva06 not found!")
        return
        
    patient_id = user["_id"]
    print(f"Found user shiva06 with ID {patient_id}")
    
    # Let's insert a prescription for this user
    presc = {
        "_id": "RX999_TEST",
        "id": "RX999_TEST",
        "prescription_id": "RX999_TEST",
        "prescriptionId": "RX999_TEST",
        "patientName": "Shivansh Negi",
        "patient_id": patient_id,
        "patientId": patient_id,
        "doctorName": "Dr. Rajesh Kumar",
        "doctor_id": "U002",
        "doctorId": "U002",
        "date": "2026-06-04",
        "medications": "Paracetamol 650mg, Amoxicillin 500mg",
        "medicines": "Paracetamol 650mg, Amoxicillin 500mg",
        "dosage": "TDS / BD",
        "duration": "5 days",
        "instructions": "Take after meals.",
        "diagnosis": "Mild Fever & Cough",
        "status": "Active",
        "createdAt": datetime.datetime.utcnow().isoformat(),
        "created_at": datetime.datetime.utcnow().isoformat()
    }
    
    # Remove existing RX999_TEST if any
    await db.prescriptions.delete_one({"_id": "RX999_TEST"})
    
    # Insert new prescription
    await db.prescriptions.insert_one(presc)
    print("Inserted test prescription successfully!")

if __name__ == '__main__':
    asyncio.run(main())

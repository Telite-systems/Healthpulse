import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    client = AsyncIOMotorClient('mongodb+srv://shivanshnegi1219_db_user:J0qB3MpuCvQ7uJOJ@cluster0.6lzk2sm.mongodb.net/?appName=Cluster0')
    db = client.healthpulse
    
    print("=== USERS ===")
    users = await db.users.find({"name": {"$regex": "Shivansh", "$options": "i"}}).to_list(100)
    for u in users:
        print(u)
        
    print("\n=== PATIENTS ===")
    patients = await db.patients.find({"name": {"$regex": "Shivansh", "$options": "i"}}).to_list(100)
    for p in patients:
        print(p)
        
    print("\n=== PRESCRIPTIONS ===")
    prescriptions = await db.prescriptions.find({
        "$or": [
            {"patientName": {"$regex": "Shivansh", "$options": "i"}},
            {"patient_id": {"$in": [u["_id"] for u in users]}},
            {"patientId": {"$in": [u["_id"] for u in users]}}
        ]
    }).to_list(100)
    for pr in prescriptions:
        print(pr)

    print("\n=== APPOINTMENTS ===")
    apts = await db.appointments.find({
        "$or": [
            {"patientName": {"$regex": "Shivansh", "$options": "i"}},
            {"patientId": {"$in": [u["_id"] for u in users]}},
            {"patient_id": {"$in": [u["_id"] for u in users]}}
        ]
    }).to_list(100)
    for a in apts:
        print(a)

if __name__ == '__main__':
    asyncio.run(main())

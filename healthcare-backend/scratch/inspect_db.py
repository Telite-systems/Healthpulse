import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient('mongodb+srv://shivanshnegi1219_db_user:J0qB3MpuCvQ7uJOJ@cluster0.6lzk2sm.mongodb.net/?appName=Cluster0')
    db = client.healthpulse
    
    print("=== USERS for Shivansh ===")
    users = await db.users.find({"name": "Shivansh Negi"}).to_list(100)
    for u in users:
        print(f"User: id={u.get('_id')}, username={u.get('username')}, role={u.get('role')}")
        
    print("\n=== PATIENTS ===")
    patients = await db.patients.find().to_list(100)
    for p in patients:
        print(f"Patient: id={p.get('_id')}, user_id={p.get('user_id')}, name={p.get('name')}")
        
    print("\n=== PRESCRIPTIONS ===")
    prescriptions = await db.prescriptions.find().to_list(100)
    for pr in prescriptions:
        print(f"Prescription: id={pr.get('_id')}, patient_id={pr.get('patient_id')}, doctor_id={pr.get('doctor_id')}, diagnosis={pr.get('diagnosis')}")

if __name__ == '__main__':
    asyncio.run(main())

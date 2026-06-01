import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient('mongodb+srv://shivanshnegi1219_db_user:J0qB3MpuCvQ7uJOJ@cluster0.6lzk2sm.mongodb.net/?appName=Cluster0')
    db = client.healthpulse
    
    count = await db.prescriptions.count_documents({})
    print(f"Total prescriptions: {count}")
    
    prescs = await db.prescriptions.find().sort("_id", -1).limit(50).to_list(length=50)
    with open("prescs.txt", "w", encoding="utf-8") as f:
        f.write(f"Total count: {count}\n")
        f.write("--- LATEST 50 PRESCRIPTIONS ---\n")
        for p in prescs:
            f.write(f"ID: {p.get('_id') or p.get('id')}, Patient: {p.get('patientName') or p.get('patient')}, Doctor: {p.get('doctorName') or p.get('doctor')}, Meds: {p.get('medications') or p.get('medicines')}\n")

if __name__ == "__main__":
    asyncio.run(main())

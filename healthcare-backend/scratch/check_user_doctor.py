import asyncio
import sys
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    sys.stdout.reconfigure(encoding='utf-8')
    client = AsyncIOMotorClient('mongodb+srv://shivanshnegi1219_db_user:J0qB3MpuCvQ7uJOJ@cluster0.6lzk2sm.mongodb.net/?appName=Cluster0')
    db = client.healthpulse
    
    print("--- APPOINTMENTS ---")
    apts = await db.appointments.find().to_list(length=100)
    for a in apts:
        print(f"ID: {a.get('_id')}, Patient: {a.get('patientName')}, Doctor: {a.get('doctorName')}, Status: {a.get('status')}")
        
    print("\n--- PRESCRIPTIONS ---")
    prescs = await db.prescriptions.find().to_list(length=100)
    for p in prescs:
        print(f"ID: {p.get('_id')}, Patient: {p.get('patientName')}, Doctor: {p.get('doctorName')}, Status: {p.get('status')}")
    
if __name__ == '__main__':
    asyncio.run(main())





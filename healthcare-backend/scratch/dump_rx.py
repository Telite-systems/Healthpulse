import asyncio
import sys
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    sys.stdout.reconfigure(encoding='utf-8')
    c = AsyncIOMotorClient('mongodb+srv://shivanshnegi1219_db_user:J0qB3MpuCvQ7uJOJ@cluster0.6lzk2sm.mongodb.net/?appName=Cluster0')
    db = c.healthpulse
    async for p in db.prescriptions.find():
        print(f"ID: {p.get('_id')}, PatientName: {p.get('patientName')}, PatientId: {p.get('patientId') or p.get('patient_id')}, Meds: {p.get('medications') or p.get('medicines')}")

if __name__ == '__main__':
    asyncio.run(main())

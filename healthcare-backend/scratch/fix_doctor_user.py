"""Fix the 'doctor' user document in the DB to match seed.py expectations."""
import asyncio
import sys
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URI = 'mongodb+srv://shivanshnegi1219_db_user:J0qB3MpuCvQ7uJOJ@cluster0.6lzk2sm.mongodb.net/?appName=Cluster0'

async def main():
    sys.stdout.reconfigure(encoding='utf-8')
    client = AsyncIOMotorClient(MONGO_URI)
    db = client.healthpulse

    # 1. Show current state
    user = await db.users.find_one({"username": "doctor"})
    print(f"BEFORE: _id={user.get('_id')}, name={user.get('name')}, role={user.get('role')}, "
          f"dept={user.get('department')}, spec={user.get('specialization')}")

    # 2. Update to match seed.py (U002, Dr. Rajesh Kumar, Doctor, Cardiology)
    result = await db.users.update_one(
        {"username": "doctor"},
        {"$set": {
            "name": "Dr. Rajesh Kumar",
            "department": "Cardiology",
            "specialization": "Cardiologist",
        }}
    )
    print(f"UPDATE: matched={result.matched_count}, modified={result.modified_count}")

    # 3. Verify
    user = await db.users.find_one({"username": "doctor"})
    print(f"AFTER:  _id={user.get('_id')}, name={user.get('name')}, role={user.get('role')}, "
          f"dept={user.get('department')}, spec={user.get('specialization')}")

if __name__ == '__main__':
    asyncio.run(main())

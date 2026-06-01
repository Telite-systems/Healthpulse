import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient('mongodb+srv://shivanshnegi1219_db_user:J0qB3MpuCvQ7uJOJ@cluster0.6lzk2sm.mongodb.net/?appName=Cluster0')
    db = client.healthpulse
    
    print("--- USERS ---")
    users = await db.users.find().to_list(length=100)
    for u in users:
        print(f"ID: {u.get('_id')}, Username: {u.get('username')}, Name: {u.get('name')}, Role: {u.get('role')}")
        
    print("\n--- PATIENTS ---")
    patients = await db.patients.find().to_list(length=100)
    for p in patients:
         print(f"ID: {p.get('_id')}, Name: {p.get('name')}, Email: {p.get('email')}")

if __name__ == "__main__":
    asyncio.run(main())

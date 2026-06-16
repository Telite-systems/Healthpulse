import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    uri = 'mongodb+srv://shivanshnegi1219_db_user:J0qB3MpuCvQ7uJOJ@cluster0.6lzk2sm.mongodb.net/?appName=Cluster0'
    print(f"Connecting to {uri}...")
    client = AsyncIOMotorClient(uri)
    db = client.healthpulse
    
    collections_to_drop = [
        "users", "patients", "doctors", "staff", "departments", 
        "appointments", "visits", "billing", "prescriptions", 
        "notifications", "followups"
    ]
    
    print("Dropping collections...")
    for name in collections_to_drop:
        await db[name].drop()
        print(f"Dropped: {name}")
        
    print("All collections dropped successfully. Restart backend to re-seed database.")

if __name__ == "__main__":
    asyncio.run(main())

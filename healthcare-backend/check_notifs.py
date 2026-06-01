import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient('mongodb+srv://shivanshnegi1219_db_user:J0qB3MpuCvQ7uJOJ@cluster0.6lzk2sm.mongodb.net/?appName=Cluster0')
    db = client.healthpulse
    
    count = await db.notifications.count_documents({})
    print(f"Total notifications: {count}")
    
    # Sort descending by _id or createdAt to see the latest
    notifs = await db.notifications.find().sort("_id", -1).limit(50).to_list(length=50)
    with open("notifs.txt", "w", encoding="utf-8") as f:
        f.write(f"Total count: {count}\n")
        f.write("--- LATEST 50 NOTIFICATIONS ---\n")
        for n in notifs:
            f.write(f"ID: {n.get('_id')}, Title: {n.get('title')}, Message: {n.get('message')}, Patient: {n.get('patientName') or n.get('patient')}\n")

if __name__ == "__main__":
    asyncio.run(main())

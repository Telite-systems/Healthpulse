import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient('mongodb+srv://shivanshnegi1219_db_user:J0qB3MpuCvQ7uJOJ@cluster0.6lzk2sm.mongodb.net/?appName=Cluster0')
    db = client.healthpulse
    users = await db.users.find().to_list(100)
    for u in users:
        print(f"Username: {u.get('username')}, Name: {u.get('name')}, Role: {u.get('role')}")

if __name__ == '__main__':
    asyncio.run(main())

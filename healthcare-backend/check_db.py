import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient('mongodb+srv://shivanshnegi1219_db_user:J0qB3MpuCvQ7uJOJ@cluster0.6lzk2sm.mongodb.net/?appName=Cluster0')
    db = client.healthpulse
    apts = await db.appointments.find().to_list(length=100)
    for apt in apts:
        print(apt)

if __name__ == "__main__":
    asyncio.run(main())

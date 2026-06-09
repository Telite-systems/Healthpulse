import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient('mongodb+srv://shivanshnegi1219_db_user:J0qB3MpuCvQ7uJOJ@cluster0.6lzk2sm.mongodb.net/?appName=Cluster0')
    db = client.healthpulse
    
    for uid in ["PD048CA", "P66A677"]:
        user = await db.users.find_one({"_id": uid})
        notif_count = await db.notifications.count_documents({
            "$or": [
                {"patientId": uid},
                {"patient_id": uid},
                {"patientName": user.get("name") if user else None}
            ]
        })
        unread_count = await db.notifications.count_documents({
            "read": False,
            "$or": [
                {"patientId": uid},
                {"patient_id": uid},
                {"patientName": user.get("name") if user else None}
            ]
        })
        print(f"User ID: {uid}, Username: {user.get('username') if user else 'None'}, Total Notifs: {notif_count}, Unread Notifs: {unread_count}")

if __name__ == '__main__':
    asyncio.run(main())

import asyncio
import sys
import os

# Add the current directory to python path so app is importable
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

async def main():
    print("Connecting to MongoDB...")
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    doctors_col = db.doctors
    
    # Pre-defined mapping for the seeded doctors
    doctor_licenses = {
        "D001": ("MC-10023", "2030-12-31"),
        "D002": ("MC-20412", "2029-06-30"),
        "D003": ("MC-30114", "2028-10-15"),
        "D004": ("MC-40992", "2031-03-31"),
        "D005": ("MC-50771", "2029-11-30"),
        "D006": ("MC-60234", "2030-05-15"),
        "D007": ("MC-70119", "2032-04-20"),
        "D008": ("MC-80554", "2029-08-31"),
        "D009": ("MC-90881", "2028-12-31"),
        "D010": ("MC-11005", "2031-07-31"),
        "D011": ("MC-12006", "2030-01-31"),
        "D012": ("MC-13007", "2032-09-30"),
    }
    
    cursor = doctors_col.find({})
    count = 0
    idx = 100
    async for doc in cursor:
        doc_id = doc["_id"]
        license_no = doc.get("licenseNo")
        license_val = doc.get("licenseValidity")
        
        # Update if licenseNo or licenseValidity is missing
        if not license_no or not license_val:
            if doc_id in doctor_licenses:
                l_no, l_val = doctor_licenses[doc_id]
            else:
                l_no = f"MC-88{idx}"
                l_val = "2030-12-31"
                idx += 1
            
            await doctors_col.update_one(
                {"_id": doc_id},
                {"$set": {"licenseNo": l_no, "licenseValidity": l_val}}
            )
            print(f"Updated doctor {doc_id} ('{doc.get('name')}') -> License: {l_no}, Validity: {l_val}")
            count += 1
            
    print(f"Migration finished. Updated {count} doctors.")

if __name__ == "__main__":
    asyncio.run(main())

import asyncio
from app.database import database

async def main():
    await database.connect()
    vendors_count = await database.get_collection('vendors').count_documents({})
    inventory_count = await database.get_collection('inventory').count_documents({})
    users_count = await database.get_collection('users').count_documents({"role": "Vendor"})
    print(f"VENDORS COUNT: {vendors_count}")
    print(f"INVENTORY COUNT: {inventory_count}")
    print(f"VENDOR USERS COUNT: {users_count}")
    await database.disconnect()

if __name__ == '__main__':
    asyncio.run(main())

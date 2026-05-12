# ============================================
# MongoDB Database Connection
# Async MongoDB client using Motor driver
# Graceful retry on connection failure
# ============================================

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import settings
import asyncio
import logging

logger = logging.getLogger(__name__)


class Database:
    """Manages the async MongoDB connection lifecycle."""

    client: AsyncIOMotorClient = None
    db: AsyncIOMotorDatabase = None

    async def connect(self, max_retries: int = 3, retry_delay: float = 2.0):
        """Establish connection to MongoDB with retry logic."""
        for attempt in range(1, max_retries + 1):
            try:
                logger.info(f"Connecting to MongoDB at {settings.MONGODB_URL} (attempt {attempt}/{max_retries})...")
                self.client = AsyncIOMotorClient(
                    settings.MONGODB_URL,
                    maxPoolSize=50,
                    minPoolSize=10,
                    serverSelectionTimeoutMS=5000,
                )
                self.db = self.client[settings.MONGODB_DB_NAME]

                # Verify connection
                await self.client.admin.command("ping")
                logger.info(f"✅ Connected to MongoDB database: {settings.MONGODB_DB_NAME}")
                return
            except Exception as e:
                logger.warning(f"⚠️ Connection attempt {attempt} failed: {e}")
                if attempt < max_retries:
                    logger.info(f"   Retrying in {retry_delay}s...")
                    await asyncio.sleep(retry_delay)
                else:
                    logger.error(f"❌ Failed to connect to MongoDB after {max_retries} attempts.")
                    logger.error(f"   Make sure MongoDB is running on {settings.MONGODB_URL}")
                    raise

    async def disconnect(self):
        """Close the MongoDB connection."""
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed.")

    def get_collection(self, name: str):
        """Get a MongoDB collection by name."""
        return self.db[name]


# Singleton database instance
database = Database()


async def get_database() -> AsyncIOMotorDatabase:
    """Dependency injection for routes."""
    return database.db

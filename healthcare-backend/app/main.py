# ============================================
# FastAPI Application Entry Point
# ============================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import logging
import time

from app.config import settings
from app.database import database
from app.seed import seed_database
from app.routes.auth import router as auth_router
from app.routes.dashboard import router as dashboard_router
from app.routes.websocket import router as ws_router, event_generator
from app.routes.collections import create_collection_router

# ---- Logging Setup ----
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL, logging.INFO),
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle: startup and shutdown hooks."""
    # ---- STARTUP ----
    logger.info(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    await database.connect()
    await seed_database()

    # Start WebSocket event broadcaster in background
    event_task = asyncio.create_task(event_generator())
    logger.info("✅ Application ready!")

    yield

    # ---- SHUTDOWN ----
    event_task.cancel()
    await database.disconnect()
    logger.info("👋 Application stopped.")


# ---- Create App ----
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Backend API for the HealthPulse Healthcare Automation Platform",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ---- CORS Middleware ----
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:3000",
        *settings.cors_origins_list,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Register Routes ----
app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(ws_router)

# ---- Dynamic Collection CRUD Routes ----
collection_configs = [
    ("patients", "Patients"),
    ("doctors", "Doctors"),
    ("staff", "Staff"),
    ("departments", "Departments"),
    ("appointments", "Appointments"),
    ("visits", "Patient Visits"),
    ("billing", "Billing"),
    ("prescriptions", "Prescriptions"),
    ("notifications", "Notifications"),
]

for collection_name, tag in collection_configs:
    router = create_collection_router(collection_name, tag)
    app.include_router(router)



# ---- Auth Info Routes ----
@app.get("/auth/login")
async def auth_login_info():
    """Information about login endpoint when accessed via GET."""
    return {
        "data": {
            "method": "POST",
            "endpoint": "/api/auth/login",
            "body": {
                "username": "string (required)",
                "password": "string (required)"
            },
            "response": {
                "token": "JWT token",
                "user": "user object",
                "expiresAt": "expiration timestamp"
            },
            "example": {
                "username": "admin",
                "password": "password123"
            }
        },
        "status": 200,
        "message": "Login requires POST method to /api/auth/login",
        "timestamp": int(time.time() * 1000),
        "requestId": f"req_{int(time.time())}",
    }


# ---- Health Check ----
@app.get("/", tags=["Health"])
async def root():
    """Root health check endpoint."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "healthy",
        "docs": "/docs",
    }


@app.get("/api/health", tags=["Health"])
async def health_check():
    """Detailed health check."""
    try:
        await database.client.admin.command("ping")
        db_status = "connected"
    except Exception:
        db_status = "disconnected"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status,
        "version": settings.APP_VERSION,
    }

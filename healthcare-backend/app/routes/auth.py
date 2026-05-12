# ============================================
# Authentication Routes
# POST /api/auth/login
# POST /api/auth/logout
# GET  /api/auth/validate
# GET  /api/auth/me
# ============================================

from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime, timedelta
from app.models.user import UserLogin, TokenResponse
from app.services.auth import (
    verify_password, create_access_token, get_current_user,
    hash_password
)
from app.database import database
from app.config import settings
import logging
import time

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=dict)
async def login(credentials: UserLogin):
    """Authenticate user and return JWT token."""
    users_col = database.get_collection("users")
    user = await users_col.find_one({"username": credentials.username})

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    # Verify password
    if not verify_password(credentials.password, user.get("hashed_password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    # Create token
    expires_at = datetime.utcnow() + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(
        data={"userId": str(user["_id"]), "role": user["role"]}
    )

    # Log the login
    login_logs_col = database.get_collection("login_logs")
    await login_logs_col.insert_one({
        "userId": str(user["_id"]),
        "username": user["username"],
        "timestamp": int(time.time() * 1000),
        "ip": "192.168.1.1",
        "userAgent": "HealthPulse Client",
    })

    # Build user response (exclude password)
    user_response = {
        "id": str(user["_id"]),
        "username": user["username"],
        "name": user["name"],
        "role": user["role"],
        "avatar": user.get("avatar", "👤"),
    }

    return {
        "data": {
            "token": token,
            "user": user_response,
            "expiresAt": int(expires_at.timestamp() * 1000),
        },
        "status": 200,
        "message": "Login successful",
        "timestamp": int(time.time() * 1000),
        "requestId": f"req_{int(time.time())}",
    }


@router.get("/login")
async def login_info():
    """Information about login endpoint."""
    return {
        "data": {
            "method": "POST",
            "endpoint": "/api/auth/login",
            "body": {
                "username": "string",
                "password": "string"
            },
            "response": {
                "token": "JWT token",
                "user": "user object",
                "expiresAt": "timestamp"
            }
        },
        "status": 200,
        "message": "Use POST method to login",
        "timestamp": int(time.time() * 1000),
        "requestId": f"req_{int(time.time())}",
    }


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """Logout the current user."""
    return {
        "data": {"success": True},
        "status": 200,
        "message": "Logged out",
        "timestamp": int(time.time() * 1000),
        "requestId": f"req_{int(time.time())}",
    }


@router.get("/validate")
async def validate_token(current_user: dict = Depends(get_current_user)):
    """Validate the current JWT token and return user info."""
    return {
        "data": {
            "valid": True,
            "user": current_user,
        },
        "status": 200,
        "message": "Token valid",
        "timestamp": int(time.time() * 1000),
        "requestId": f"req_{int(time.time())}",
    }


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user profile."""
    return {
        "data": current_user,
        "status": 200,
        "message": "Success",
        "timestamp": int(time.time() * 1000),
        "requestId": f"req_{int(time.time())}",
    }


@router.get("/login-history")
async def get_login_history(current_user: dict = Depends(get_current_user)):
    """Get recent login history."""
    login_logs_col = database.get_collection("login_logs")
    cursor = login_logs_col.find().sort("timestamp", -1).limit(20)
    logs = []
    async for log in cursor:
        log.pop("_id", None)
        logs.append(log)
    return {
        "data": logs,
        "status": 200,
        "message": "Success",
        "timestamp": int(time.time() * 1000),
        "requestId": f"req_{int(time.time())}",
    }

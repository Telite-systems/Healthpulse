# ============================================
# User Model
# ============================================

from pydantic import BaseModel, Field
from typing import Literal, Optional
from app.models.base import MongoBaseModel


class UserModel(MongoBaseModel):
    """Public user representation (no password)."""
    username: str
    name: str
    role: Literal["Admin", "Doctor", "Staff"]
    avatar: str = "👤"


class UserInDB(UserModel):
    """User stored in database (includes hashed password)."""
    hashed_password: str


class UserCreate(BaseModel):
    """Schema for creating a new user."""
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    name: str = Field(..., min_length=2)
    role: Literal["Admin", "Doctor", "Staff"] = "Staff"
    avatar: str = "👤"


class UserLogin(BaseModel):
    """Schema for login request."""
    username: str
    password: str


class TokenResponse(BaseModel):
    """Schema for login response."""
    token: str
    user: dict
    expiresAt: int


class TokenPayload(BaseModel):
    """JWT token payload."""
    userId: str
    role: str
    iat: float
    exp: float

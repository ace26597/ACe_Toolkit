"""
Authentication Router

Handles user registration, login, logout, token refresh, and admin user management.
Includes 24-hour trial system for new users.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime, timedelta
from jose import jwt, JWTError
from typing import List
import uuid
from pathlib import Path

from app.core.database import get_db
from app.models.models import User, RefreshToken
from app.schemas import UserCreate, UserResponse, UserAdminResponse, Token, UserLogin
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token, hash_token
from app.core.config import settings
from app.core.notifications import notify_new_signup
import logging

logger = logging.getLogger("auth")

router = APIRouter()

# Trial duration for new users
TRIAL_DURATION_HOURS = 24

# Cookie durations (in days)
TRIAL_USER_COOKIE_DAYS = 1      # Trial users stay logged in for 1 day
APPROVED_USER_COOKIE_DAYS = 30  # Approved/admin users stay logged in for 30 days


async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    """Get the current authenticated user from JWT token."""
    token = request.cookies.get("access_token")
    if not token:
        # Check header as fallback (Bearer)
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        # Convert string back to UUID
        user_id = uuid.UUID(user_id_str)
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def get_current_admin(user: User = Depends(get_current_user)) -> User:
    """Require the current user to be an admin."""
    if not user.is_admin:
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )
    return user


def check_trial_status(user: User) -> dict:
    """Check if user's trial has expired. Returns trial info."""
    # Admins and approved users have unlimited access
    if user.is_admin or user.is_approved:
        return {
            "has_access": True,
            "is_trial": False,
            "trial_expired": False,
            "trial_expires_at": None
        }

    # Check trial expiration
    if user.trial_expires_at:
        if datetime.utcnow() > user.trial_expires_at:
            return {
                "has_access": False,
                "is_trial": True,
                "trial_expired": True,
                "trial_expires_at": user.trial_expires_at.isoformat()
            }
        else:
            return {
                "has_access": True,
                "is_trial": True,
                "trial_expired": False,
                "trial_expires_at": user.trial_expires_at.isoformat()
            }

    # User has no trial date set (shouldn't happen normally)
    return {
        "has_access": False,
        "is_trial": False,
        "trial_expired": True,
        "trial_expires_at": None
    }


@router.post("/register", response_model=UserResponse)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    """
    Register a new user with 24-hour trial access.

    After the trial expires, admin approval is required for continued access.
    """
    result = await db.execute(select(User).where(User.email == user_in.email))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Set 24-hour trial expiration
    trial_expires_at = datetime.utcnow() + timedelta(hours=TRIAL_DURATION_HOURS)

    new_user = User(
        name=user_in.name,
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        is_admin=False,
        is_approved=False,
        trial_expires_at=trial_expires_at
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # Send notification to admin
    try:
        await notify_new_signup(new_user.email, new_user.name)
    except Exception as e:
        logger.warning(f"Failed to send signup notification: {e}")

    # Create user's data directory
    user_data_dir = Path(settings.USER_DATA_BASE_DIR) / str(new_user.id)
    user_data_dir.mkdir(parents=True, exist_ok=True)
    for subdir in ["workspace", "analyst", "video-factory", "ccresearch", "research"]:
        (user_data_dir / subdir).mkdir(exist_ok=True)

    return new_user


@router.post("/login")
async def login(response: Response, user_in: UserLogin, db: AsyncSession = Depends(get_db)):
    """
    Login and receive JWT tokens.

    Returns 403 with detail="trial_expired" if user's trial has ended and they're not approved.
    """
    result = await db.execute(select(User).where(User.email == user_in.email))
    user = result.scalars().first()
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    # Check trial status (admins and approved users always have access)
    trial_info = check_trial_status(user)
    if not trial_info["has_access"]:
        raise HTTPException(
            status_code=403,
            detail="trial_expired"
        )

    # Update last login time
    user.last_login_at = datetime.utcnow()
    await db.commit()

    # Create tokens with duration based on user type
    # Admin/approved: 30 days, Trial: 1 day
    token_days = APPROVED_USER_COOKIE_DAYS if (user.is_admin or user.is_approved) else TRIAL_USER_COOKIE_DAYS
    access_token = create_access_token(subject=user.id, expires_delta=timedelta(days=token_days))
    refresh_token = create_refresh_token(subject=user.id)

    # Store refresh token
    rt_entry = RefreshToken(
        token_hash=hash_token(refresh_token),
        user_id=user.id,
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(rt_entry)
    await db.commit()

    # Set cookies with different durations based on user status
    # Trial users: 1 day, Approved/admin users: 30 days
    cookie_days = APPROVED_USER_COOKIE_DAYS if (user.is_admin or user.is_approved) else TRIAL_USER_COOKIE_DAYS
    cookie_seconds = cookie_days * 24 * 60 * 60

    cookie_kwargs = get_cookie_kwargs()
    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=cookie_seconds,
        **cookie_kwargs
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=cookie_seconds,
        **cookie_kwargs
    )

    # Return user info and trial status
    return {
        "message": "Login successful",
        "user": {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "is_admin": user.is_admin,
            "is_approved": user.is_approved
        },
        "trial": trial_info
    }


def get_cookie_kwargs():
    """Get cookie kwargs based on environment (production vs development)."""
    is_production = settings.ADMIN_EMAIL == "ace.tech.gg@gmail.com"
    if is_production:
        return {
            "httponly": True,
            "path": "/",
            "secure": True,
            "samesite": "none",
            "domain": ".orpheuscore.uk"
        }
    else:
        return {
            "httponly": True,
            "path": "/",
            "secure": False,
            "samesite": "lax"
        }


@router.post("/logout")
async def logout(response: Response, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Logout and clear cookies."""
    is_production = settings.ADMIN_EMAIL == "ace.tech.gg@gmail.com"
    delete_kwargs = {"path": "/"}
    if is_production:
        delete_kwargs["domain"] = ".orpheuscore.uk"
    response.delete_cookie("access_token", **delete_kwargs)
    response.delete_cookie("refresh_token", **delete_kwargs)
    return {"message": "Logged out"}


@router.post("/refresh")
async def refresh(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    """Refresh access token using refresh token."""
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")

    token_hash = hash_token(refresh_token)
    result = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    stored_token = result.scalars().first()

    if not stored_token or stored_token.expires_at < datetime.utcnow():
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    # Get the user to check trial status
    result = await db.execute(select(User).where(User.id == stored_token.user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # Check trial status
    trial_info = check_trial_status(user)
    if not trial_info["has_access"]:
        raise HTTPException(status_code=403, detail="trial_expired")

    # Issue new access token with duration based on user type
    token_days = APPROVED_USER_COOKIE_DAYS if (user.is_admin or user.is_approved) else TRIAL_USER_COOKIE_DAYS
    access_token = create_access_token(subject=stored_token.user_id, expires_delta=timedelta(days=token_days))
    cookie_seconds = token_days * 24 * 60 * 60

    cookie_kwargs = get_cookie_kwargs()
    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=cookie_seconds,
        **cookie_kwargs
    )

    return {"message": "Token refreshed", "trial": trial_info}


@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    """Get current user info."""
    return current_user


@router.get("/me/status")
async def get_my_status(current_user: User = Depends(get_current_user)):
    """Get current user's access status including trial info."""
    trial_info = check_trial_status(current_user)
    return {
        "user": {
            "id": str(current_user.id),
            "name": current_user.name,
            "email": current_user.email,
            "is_admin": current_user.is_admin,
            "is_approved": current_user.is_approved
        },
        "trial": trial_info
    }


# ==================== Admin Endpoints ====================

@router.get("/admin/users")
async def list_all_users(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """List all users with stats (admin only)."""
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()

    # Calculate stats
    total_users = len(users)
    approved_users = sum(1 for u in users if u.is_approved)
    trial_users = sum(1 for u in users if not u.is_approved and u.trial_expires_at)
    admin_users = sum(1 for u in users if u.is_admin)

    # Convert users to dict format
    users_data = []
    for u in users:
        users_data.append({
            "id": str(u.id),
            "email": u.email,
            "name": u.name,
            "is_admin": u.is_admin,
            "is_approved": u.is_approved,
            "is_trial": not u.is_approved and u.trial_expires_at is not None,
            "trial_expires_at": u.trial_expires_at.isoformat() if u.trial_expires_at else None,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "last_login": u.last_login_at.isoformat() if u.last_login_at else None,
        })

    return {
        "users": users_data,
        "stats": {
            "total_users": total_users,
            "approved_users": approved_users,
            "trial_users": trial_users,
            "admin_users": admin_users,
        }
    }


@router.post("/admin/users/{user_id}/approve")
async def approve_user(
    user_id: uuid.UUID,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Approve a user for continued access beyond trial (admin only)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_approved:
        return {"message": "User already approved", "user_id": str(user_id)}

    user.is_approved = True
    user.approved_at = datetime.utcnow()
    user.trial_expires_at = None  # Clear trial expiration
    await db.commit()

    return {
        "message": "User approved",
        "user_id": str(user_id),
        "approved_at": user.approved_at.isoformat()
    }


@router.post("/admin/users/{user_id}/revoke")
async def revoke_user(
    user_id: uuid.UUID,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Revoke a user's access (admin only). Sets their trial to expired."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_admin:
        raise HTTPException(status_code=400, detail="Cannot revoke admin user")

    user.is_approved = False
    user.approved_at = None
    # Set trial to past date to expire immediately
    user.trial_expires_at = datetime.utcnow() - timedelta(days=1)
    await db.commit()

    return {
        "message": "User access revoked",
        "user_id": str(user_id)
    }


@router.delete("/admin/users/{user_id}")
async def delete_user(
    user_id: uuid.UUID,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Delete a user completely (admin only)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_admin:
        raise HTTPException(status_code=400, detail="Cannot delete admin user")

    # Delete refresh tokens
    await db.execute(
        RefreshToken.__table__.delete().where(RefreshToken.user_id == user_id)
    )

    # Delete user
    await db.delete(user)
    await db.commit()

    # Note: User data directory is NOT deleted - can be cleaned up manually if needed

    return {
        "message": "User deleted",
        "user_id": str(user_id)
    }

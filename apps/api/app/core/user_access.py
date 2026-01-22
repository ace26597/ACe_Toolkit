"""
User Access Middleware

Provides dependencies for checking user access and getting user-specific directories.
Used by app routers to ensure per-user data isolation.
"""

from fastapi import Depends, HTTPException
from datetime import datetime
from pathlib import Path

from app.routers.auth import get_current_user, check_trial_status
from app.models.models import User
from app.core.config import settings


async def require_valid_access(user: User = Depends(get_current_user)) -> User:
    """
    Verify user has valid access (admin, approved, or within trial).

    Use this dependency in protected routes that require active user access.
    Returns the user if they have access, raises 403 if trial expired.
    """
    trial_info = check_trial_status(user)
    if not trial_info["has_access"]:
        raise HTTPException(
            status_code=403,
            detail="trial_expired"
        )
    return user


async def require_admin(user: User = Depends(get_current_user)) -> User:
    """
    Require the current user to be an admin.

    Use this dependency for admin-only routes.
    """
    if not user.is_admin:
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )
    return user


def get_user_data_dir(user: User) -> Path:
    """
    Get user's data directory: /data/users/{user_id}/

    This is the root directory for all user-specific data.
    Each app has its own subdirectory within this.
    """
    return Path(settings.USER_DATA_BASE_DIR) / str(user.id)


def get_user_workspace_dir(user: User) -> Path:
    """Get user's workspace directory for the Workspace app.

    NOTE: Changed from /workspace to /projects for unified project storage.
    Both Workspace and CCResearch now share the same project directories.
    """
    return get_user_data_dir(user) / "projects"


def get_user_analyst_dir(user: User) -> Path:
    """Get user's analyst directory for the Data Analyst app."""
    return get_user_data_dir(user) / "analyst"


def get_user_video_factory_dir(user: User) -> Path:
    """Get user's video factory directory."""
    return get_user_data_dir(user) / "video-factory"


def get_user_ccresearch_dir(user: User) -> Path:
    """Get user's ccresearch directory for CCResearch sessions."""
    return get_user_data_dir(user) / "ccresearch"


def get_user_research_dir(user: User) -> Path:
    """Get user's research directory for Research Assistant."""
    return get_user_data_dir(user) / "research"


def ensure_user_directories(user: User) -> Path:
    """
    Ensure all user directories exist.

    Returns the root user data directory.
    """
    user_dir = get_user_data_dir(user)
    user_dir.mkdir(parents=True, exist_ok=True)

    # Create user subdirectories
    # NOTE: "projects" is the unified directory for both Workspace and CCResearch
    for subdir in ["projects", "analyst", "video-factory", "ccresearch", "research"]:
        (user_dir / subdir).mkdir(exist_ok=True)

    return user_dir

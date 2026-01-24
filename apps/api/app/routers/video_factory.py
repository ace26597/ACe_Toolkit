"""
Video Factory API Router

Minimal project/channel management for AI video production.
Starting fresh - only channel creation for now.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional, List

from app.core.video_factory_manager import video_factory

router = APIRouter(prefix="/video-factory", tags=["video-factory"])


# ==================== Request/Response Models ====================

class CreateProjectRequest(BaseModel):
    email: EmailStr
    name: str
    niche: str


class ProjectResponse(BaseModel):
    id: str
    email: str
    name: str
    niche: str
    ideas_count: int
    created_at: str
    updated_at: str


# ==================== Auth ====================

@router.get("/auth/check")
async def check_auth(email: str):
    """Check if email is authorized."""
    allowed = video_factory.check_email_allowed(email)
    return {
        "authorized": allowed,
        "email": email
    }


# ==================== Projects/Channels ====================

@router.post("/projects", response_model=ProjectResponse)
async def create_project(request: CreateProjectRequest):
    """Create a new video channel/project."""
    try:
        project = video_factory.create_project(
            email=request.email,
            name=request.name,
            niche=request.niche
        )

        return ProjectResponse(
            id=project.id,
            email=project.email,
            name=project.name,
            niche=project.niche,
            ideas_count=len(project.ideas),
            created_at=project.created_at,
            updated_at=project.updated_at
        )
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/projects")
async def list_projects(email: Optional[str] = None):
    """List all projects, optionally filtered by email."""
    projects = video_factory.list_projects(email)
    return {
        "projects": [
            {
                "id": p.id,
                "email": p.email,
                "name": p.name,
                "niche": p.niche,
                "ideas_count": len(p.ideas),
                "created_at": p.created_at,
                "updated_at": p.updated_at
            }
            for p in projects
        ]
    }


@router.get("/projects/{project_id}")
async def get_project(project_id: str):
    """Get project details."""
    project = video_factory.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return {
        "id": project.id,
        "email": project.email,
        "name": project.name,
        "niche": project.niche,
        "ideas": [],  # Empty for now - will be populated when we add idea generation
        "created_at": project.created_at,
        "updated_at": project.updated_at
    }


@router.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    """Delete a project."""
    success = video_factory.delete_project(project_id)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"success": True}


# ==================== Status ====================

@router.get("/status")
async def get_status():
    """Get Video Factory status."""
    return {
        "status": "ok",
        "total_projects": len(video_factory.projects),
        "version": "2.0-fresh",
        "features": [
            "Project/channel management",
        ],
        "coming_soon": [
            "AI script generation",
            "Web research",
            "Voiceover generation",
            "TikTok-style captions",
            "Remotion video rendering",
        ],
    }

"""
Shorts Content Factory API Router

Endpoints for AI-powered short-form content generation.
FREE script generation using Claude Code.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any

from app.core.video_factory_manager import video_factory

router = APIRouter(prefix="/video-factory", tags=["content-factory"])


# ==================== Request/Response Models ====================

class CreateProjectRequest(BaseModel):
    email: EmailStr
    name: str
    niche: str


class GenerateIdeasRequest(BaseModel):
    topic: str
    count: int = 5


class GenerateScriptRequest(BaseModel):
    topic: str
    style: str = "educational"  # educational, storytime, controversial, tutorial, reaction, listicle


class UpdateIdeaRequest(BaseModel):
    title: Optional[str] = None
    hook: Optional[str] = None
    script: Optional[str] = None
    cta: Optional[str] = None
    hashtags: Optional[List[str]] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class MarkPostedRequest(BaseModel):
    platform: str  # youtube_shorts, tiktok, instagram_reels
    url: Optional[str] = None


class UpdateMetricsRequest(BaseModel):
    platform: str
    views: int = 0
    likes: int = 0
    comments: int = 0


class ProjectResponse(BaseModel):
    id: str
    email: str
    name: str
    niche: str
    ideas_count: int
    created_at: str
    updated_at: str


class IdeaResponse(BaseModel):
    id: str
    title: str
    topic: str
    hook: str
    script: str
    cta: str
    hashtags: List[str]
    status: str
    platforms: List[Dict[str, Any]]
    notes: str
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


# ==================== Projects ====================

@router.post("/projects", response_model=ProjectResponse)
async def create_project(request: CreateProjectRequest):
    """Create a new content project."""
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
    """Get project details including all ideas."""
    project = video_factory.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return {
        "id": project.id,
        "email": project.email,
        "name": project.name,
        "niche": project.niche,
        "ideas": [
            {
                "id": i.id,
                "title": i.title,
                "topic": i.topic,
                "hook": i.hook,
                "script": i.script,
                "cta": i.cta,
                "hashtags": i.hashtags,
                "status": i.status.value if hasattr(i.status, 'value') else i.status,
                "platforms": [
                    {
                        "platform": p.platform,
                        "posted": p.posted,
                        "posted_at": p.posted_at,
                        "url": p.url,
                        "views": p.views,
                        "likes": p.likes,
                        "comments": p.comments
                    }
                    for p in i.platforms
                ],
                "notes": i.notes,
                "created_at": i.created_at,
                "updated_at": i.updated_at
            }
            for i in project.ideas
        ],
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


@router.get("/projects/{project_id}/stats")
async def get_project_stats(project_id: str):
    """Get project statistics."""
    stats = video_factory.get_stats(project_id)
    if not stats:
        raise HTTPException(status_code=404, detail="Project not found")
    return stats


# ==================== Content Generation ====================

@router.post("/projects/{project_id}/generate-ideas")
async def generate_ideas(project_id: str, request: GenerateIdeasRequest):
    """Generate multiple content ideas for a topic."""
    project = video_factory.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        ideas = await video_factory.generate_content_ideas(
            project_id,
            topic=request.topic,
            count=request.count
        )

        return {
            "success": True,
            "count": len(ideas),
            "ideas": [
                {
                    "id": i.id,
                    "title": i.title,
                    "hook": i.hook,
                    "script": i.script,
                    "hashtags": i.hashtags
                }
                for i in ideas
            ]
        }
    except TimeoutError:
        raise HTTPException(status_code=504, detail="Content generation timed out")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/projects/{project_id}/generate-script")
async def generate_script(project_id: str, request: GenerateScriptRequest):
    """Generate a single detailed script."""
    project = video_factory.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        idea = await video_factory.generate_single_script(
            project_id,
            topic=request.topic,
            style=request.style
        )

        return {
            "success": True,
            "idea": {
                "id": idea.id,
                "title": idea.title,
                "hook": idea.hook,
                "script": idea.script,
                "cta": idea.cta,
                "hashtags": idea.hashtags,
                "notes": idea.notes
            }
        }
    except TimeoutError:
        raise HTTPException(status_code=504, detail="Script generation timed out")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/projects/{project_id}/ideas/{idea_id}/improve-hook")
async def improve_hook(project_id: str, idea_id: str):
    """Generate alternative hooks for an idea."""
    try:
        hooks_json = await video_factory.improve_hook(project_id, idea_id)
        import json
        hooks = json.loads(hooks_json)
        return {"success": True, "hooks": hooks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Content Management ====================

@router.put("/projects/{project_id}/ideas/{idea_id}")
async def update_idea(project_id: str, idea_id: str, request: UpdateIdeaRequest):
    """Update a content idea."""
    updates = {k: v for k, v in request.model_dump().items() if v is not None}

    idea = video_factory.update_idea(project_id, idea_id, updates)
    if not idea:
        raise HTTPException(status_code=404, detail="Project or idea not found")

    return {"success": True}


@router.post("/projects/{project_id}/ideas/{idea_id}/mark-posted")
async def mark_posted(project_id: str, idea_id: str, request: MarkPostedRequest):
    """Mark content as posted to a platform."""
    success = video_factory.mark_posted(
        project_id,
        idea_id,
        platform=request.platform,
        url=request.url
    )

    if not success:
        raise HTTPException(status_code=404, detail="Project or idea not found")

    return {"success": True}


@router.post("/projects/{project_id}/ideas/{idea_id}/metrics")
async def update_metrics(project_id: str, idea_id: str, request: UpdateMetricsRequest):
    """Update metrics for a posted video."""
    success = video_factory.update_metrics(
        project_id,
        idea_id,
        platform=request.platform,
        views=request.views,
        likes=request.likes,
        comments=request.comments
    )

    if not success:
        raise HTTPException(status_code=404, detail="Project or idea not found")

    return {"success": True}


@router.delete("/projects/{project_id}/ideas/{idea_id}")
async def delete_idea(project_id: str, idea_id: str):
    """Delete a content idea."""
    success = video_factory.delete_idea(project_id, idea_id)
    if not success:
        raise HTTPException(status_code=404, detail="Project or idea not found")
    return {"success": True}


# ==================== Status ====================

@router.get("/status")
async def get_status():
    """Get Content Factory status."""
    return {
        "status": "ok",
        "total_projects": len(video_factory.projects),
        "features": [
            "Free AI script generation",
            "YouTube Shorts support",
            "TikTok support",
            "Instagram Reels support",
            "Cross-posting tracking",
            "Metrics tracking"
        ]
    }

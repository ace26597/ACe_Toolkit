"""
Video Factory API Router - Video Studio

AI-powered video production with two-phase generation:
1. Plan Phase: Claude researches and creates outline
2. Script Phase: Claude generates full EnhancedVideoProps JSON

Features:
- Context management (images, files, notes, workspace refs)
- Plan creation and editing
- Script generation and scene editing
- Image upload and AI generation
- Remotion video rendering
"""

import json
import os
import re
import subprocess
from typing import Optional, List
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel, EmailStr

from app.core.video_factory_manager import video_factory
from app.core.video_studio_generator import video_studio

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


class ContextTextRequest(BaseModel):
    notes: str


class WorkspaceRefRequest(BaseModel):
    workspace_project: str
    user_id: str


class GeneratePlanRequest(BaseModel):
    idea: str


class UpdatePlanRequest(BaseModel):
    updates: dict


class UpdateScriptRequest(BaseModel):
    script: dict


class UpdateSceneRequest(BaseModel):
    updates: dict


class AddSceneRequest(BaseModel):
    scene: dict
    after_scene_id: Optional[str] = None


class RenderRequest(BaseModel):
    composition: str = "EnhancedVideo"


class GenerateImageRequest(BaseModel):
    prompt: str
    filename: Optional[str] = None


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
        "ideas": [],
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


# ==================== Context Management ====================

@router.post("/projects/{project_id}/context")
async def add_context(
    project_id: str,
    notes: Optional[str] = Form(None),
    files: List[UploadFile] = File([])
):
    """Add context (files, images, notes) to a project."""
    project = video_factory.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    results = []

    # Add text notes
    if notes:
        result = video_studio.add_context_text(project_id, notes)
        results.append(result)

    # Add files/images
    for file in files:
        content = await file.read()
        filename = file.filename or "unnamed"

        # Determine if image or file based on content type
        if file.content_type and file.content_type.startswith("image/"):
            result = video_studio.add_context_image(project_id, filename, content)
        else:
            result = video_studio.add_context_file(project_id, filename, content)

        results.append(result)

    return {"added": results}


@router.post("/projects/{project_id}/context/import")
async def import_workspace_context(project_id: str, request: WorkspaceRefRequest):
    """Import a workspace project as context reference."""
    project = video_factory.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    result = video_studio.add_workspace_reference(
        project_id,
        request.workspace_project,
        request.user_id
    )
    return {"reference": result}


@router.get("/projects/{project_id}/context")
async def get_context(project_id: str):
    """Get all context for a project."""
    project = video_factory.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    context = video_studio.get_context(project_id)
    return context


@router.delete("/projects/{project_id}/context/{item_type}/{item_name}")
async def delete_context_item(project_id: str, item_type: str, item_name: str):
    """Delete a context item."""
    project = video_factory.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    success = video_studio.delete_context_item(project_id, item_type, item_name)
    if not success:
        raise HTTPException(status_code=404, detail="Context item not found")

    return {"success": True}


# ==================== Plan Phase ====================

@router.post("/projects/{project_id}/plan")
async def generate_plan(project_id: str, request: GeneratePlanRequest):
    """
    Generate a video plan using Claude Code.

    Returns SSE stream with progress and final plan.
    """
    project = video_factory.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    async def event_stream():
        async for event in video_studio.generate_plan(
            project_id=project_id,
            project_name=project.name,
            niche=project.niche,
            idea=request.idea
        ):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.get("/projects/{project_id}/plans")
async def list_plans(project_id: str):
    """List all plans for a project."""
    project = video_factory.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    plans = video_studio.list_plans(project_id)
    return {"plans": plans}


@router.get("/projects/{project_id}/plans/{plan_id}")
async def get_plan(project_id: str, plan_id: str):
    """Get a specific plan."""
    project = video_factory.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    plan = video_studio.get_plan(project_id, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    return {"plan": plan, "id": plan_id}


@router.put("/projects/{project_id}/plans/{plan_id}")
async def update_plan(project_id: str, plan_id: str, request: UpdatePlanRequest):
    """Update a plan with user edits."""
    project = video_factory.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    plan = video_studio.update_plan(project_id, plan_id, request.updates)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    return {"plan": plan}


@router.post("/projects/{project_id}/plans/{plan_id}/generate")
async def generate_script_from_plan(project_id: str, plan_id: str):
    """
    Generate a full script from an approved plan.

    Returns SSE stream with progress and final script.
    """
    project = video_factory.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    async def event_stream():
        async for event in video_studio.generate_script_from_plan(
            project_id=project_id,
            project_name=project.name,
            niche=project.niche,
            plan_id=plan_id
        ):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


# ==================== Script Management ====================

@router.get("/projects/{project_id}/scripts")
async def list_scripts(project_id: str):
    """List all generated scripts for a project."""
    project = video_factory.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    scripts = video_studio.list_scripts(project_id)
    return {"scripts": scripts}


@router.get("/projects/{project_id}/scripts/{script_id}")
async def get_script(project_id: str, script_id: str):
    """Get a specific script."""
    project = video_factory.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    script = video_studio.get_script(project_id, script_id)
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")

    return {"script": script, "id": script_id}


@router.put("/projects/{project_id}/scripts/{script_id}")
async def update_script(project_id: str, script_id: str, request: UpdateScriptRequest):
    """Update a full script."""
    project = video_factory.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    script = video_studio.update_script(project_id, script_id, request.script)
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")

    return {"script": script}


@router.delete("/projects/{project_id}/scripts/{script_id}")
async def delete_script(project_id: str, script_id: str):
    """Delete a script."""
    project = video_factory.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    success = video_studio.delete_script(project_id, script_id)
    if not success:
        raise HTTPException(status_code=404, detail="Script not found")

    return {"success": True}


# ==================== Scene Editing ====================

@router.put("/projects/{project_id}/scripts/{script_id}/scenes/{scene_id}")
async def update_scene(
    project_id: str,
    script_id: str,
    scene_id: str,
    request: UpdateSceneRequest
):
    """Update a single scene in a script."""
    project = video_factory.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    script = video_studio.update_scene(project_id, script_id, scene_id, request.updates)
    if not script:
        raise HTTPException(status_code=404, detail="Script or scene not found")

    return {"script": script}


@router.post("/projects/{project_id}/scripts/{script_id}/scenes")
async def add_scene(project_id: str, script_id: str, request: AddSceneRequest):
    """Add a new scene to a script."""
    project = video_factory.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    script = video_studio.add_scene(
        project_id,
        script_id,
        request.scene,
        request.after_scene_id
    )
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")

    return {"script": script}


@router.delete("/projects/{project_id}/scripts/{script_id}/scenes/{scene_id}")
async def delete_scene(project_id: str, script_id: str, scene_id: str):
    """Delete a scene from a script."""
    project = video_factory.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    script = video_studio.delete_scene(project_id, script_id, scene_id)
    if not script:
        raise HTTPException(status_code=404, detail="Script or scene not found")

    return {"script": script}


# ==================== Image Management ====================

@router.get("/projects/{project_id}/images")
async def list_images(project_id: str):
    """List all images for a project."""
    project = video_factory.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    images = video_studio.list_images(project_id)
    return images


@router.post("/projects/{project_id}/images/upload")
async def upload_images(project_id: str, files: List[UploadFile] = File(...)):
    """Upload images for scene backgrounds."""
    project = video_factory.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    results = []
    for file in files:
        content = await file.read()
        filename = file.filename or f"image_{len(results)}.png"
        result = video_studio.upload_image(project_id, filename, content)
        results.append(result)

    return {"uploaded": results}


@router.delete("/projects/{project_id}/images/{image_type}/{filename}")
async def delete_image(project_id: str, image_type: str, filename: str):
    """Delete an image."""
    project = video_factory.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    success = video_studio.delete_image(project_id, image_type, filename)
    if not success:
        raise HTTPException(status_code=404, detail="Image not found")

    return {"success": True}


@router.get("/projects/{project_id}/images/{image_type}/{filename}")
async def get_image(project_id: str, image_type: str, filename: str):
    """Get/download an image."""
    project = video_factory.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Construct path
    image_path = f"/data/video-factory/project-data/{project_id}/images/{image_type}/{filename}"

    if not os.path.exists(image_path):
        raise HTTPException(status_code=404, detail="Image not found")

    return FileResponse(image_path)


# ==================== Video Rendering ====================

@router.post("/projects/{project_id}/scripts/{script_id}/render")
async def render_video(project_id: str, script_id: str, request: RenderRequest):
    """
    Render a video from a script using Remotion.

    Returns the render job status.
    """
    project = video_factory.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    script = video_studio.get_script(project_id, script_id)
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")

    # Prepare output paths
    renders_dir = f"/data/video-factory/project-data/{project_id}/renders"
    os.makedirs(renders_dir, exist_ok=True)

    # Sanitize title for filename
    script_title = script.get("title", script_id)
    safe_title = re.sub(r'[^\w\s-]', '', script_title)
    safe_title = re.sub(r'\s+', '-', safe_title.strip())
    safe_title = safe_title[:50] if len(safe_title) > 50 else safe_title
    safe_title = safe_title.lower() if safe_title else script_id

    output_path = os.path.join(renders_dir, f"{safe_title}_{request.composition}.mp4")

    # Get script path
    script_path = f"/data/video-factory/project-data/{project_id}/scripts/{script_id}.json"

    # Build Remotion render command
    remotion_dir = "/home/ace/dev/ACe_Toolkit/apps/remotion"

    cmd = [
        "npx", "remotion", "render",
        request.composition,
        output_path,
        "--props", script_path
    ]

    try:
        # Start render process
        process = subprocess.Popen(
            cmd,
            cwd=remotion_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )

        return {
            "status": "started",
            "job_id": f"{script_id}_{request.composition}",
            "output_path": output_path,
            "composition": request.composition,
            "pid": process.pid
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Render failed to start: {str(e)}")


@router.get("/projects/{project_id}/renders")
async def list_renders(project_id: str):
    """List all rendered videos for a project."""
    project = video_factory.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    renders_dir = f"/data/video-factory/project-data/{project_id}/renders"
    renders = []

    if os.path.exists(renders_dir):
        for filename in os.listdir(renders_dir):
            if filename.endswith('.mp4'):
                filepath = os.path.join(renders_dir, filename)
                renders.append({
                    "filename": filename,
                    "path": filepath,
                    "size": os.path.getsize(filepath),
                    "created_at": os.path.getmtime(filepath)
                })

    return {"renders": sorted(renders, key=lambda x: x["created_at"], reverse=True)}


@router.get("/projects/{project_id}/renders/{filename}")
async def download_render(project_id: str, filename: str):
    """Download a rendered video."""
    project = video_factory.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    filepath = f"/data/video-factory/project-data/{project_id}/renders/{filename}"
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Video not found")

    return FileResponse(
        filepath,
        media_type="video/mp4",
        filename=filename
    )


# ==================== Status ====================

@router.get("/status")
async def get_status():
    """Get Video Factory status."""
    return {
        "status": "ok",
        "total_projects": len(video_factory.projects),
        "version": "3.0",
        "features": [
            "Project/channel management",
            "Context management (images, files, notes)",
            "Two-phase generation (plan → script)",
            "Plan review and editing",
            "Script and scene editing",
            "Image upload and management",
            "Remotion video rendering",
        ],
    }

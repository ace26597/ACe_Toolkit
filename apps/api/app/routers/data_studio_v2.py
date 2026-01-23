"""
Data Studio V2 Router - Claude Code Powered AI Data Analyst.

Features:
- Standalone project system (separate from Workspace)
- Claude Code for smart data analysis
- Auto-generated dashboards with Plotly
- NLP-based editing of charts and dashboards
- Terminal or headless mode support
"""

import json
import logging
import os
import shutil
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.claude_runner import claude_runner
from app.core.user_access import require_valid_access
from app.models.models import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/data-studio/v2", tags=["data-studio-v2"])

# Base directory for Data Studio projects
DATA_STUDIO_BASE = "/data/users"


def get_user_projects_dir(user_id: str) -> str:
    """Get the Data Studio projects directory for a user."""
    return os.path.join(DATA_STUDIO_BASE, user_id, "data-studio-projects")


def get_project_dir(user_id: str, project_name: str) -> str:
    """Get a specific project directory."""
    return os.path.join(get_user_projects_dir(user_id), project_name)


# ==================== Schemas ====================

class CreateProjectRequest(BaseModel):
    name: str
    description: Optional[str] = None


class ProjectResponse(BaseModel):
    name: str
    description: Optional[str]
    created_at: str
    file_count: int
    has_analysis: bool
    has_dashboard: bool


class ImportFromWorkspaceRequest(BaseModel):
    workspace_project: str
    files: Optional[List[str]] = None  # If None, import all data files


class AnalyzeRequest(BaseModel):
    force: bool = False  # Force re-analysis even if cached
    mode: str = "headless"  # "headless" or "terminal"


class GenerateDashboardRequest(BaseModel):
    name: str = "default"
    mode: str = "headless"


class NLPEditRequest(BaseModel):
    request: str  # Natural language edit request
    target_widget_id: Optional[str] = None  # If editing a specific widget
    dashboard_id: str = "default"
    mode: str = "headless"


class DashboardSaveRequest(BaseModel):
    name: str
    widgets: List[dict] = []


class ChatMessage(BaseModel):
    content: str
    context_files: Optional[List[str]] = None
    mode: str = "headless"


# ==================== Project Management ====================

@router.get("/projects", response_model=List[ProjectResponse])
async def list_projects(user: User = Depends(require_valid_access)):
    """List all Data Studio projects for the current user."""
    projects_dir = get_user_projects_dir(str(user.id))

    if not os.path.exists(projects_dir):
        return []

    projects = []
    for name in os.listdir(projects_dir):
        project_path = os.path.join(projects_dir, name)
        if not os.path.isdir(project_path):
            continue

        # Load project metadata
        meta_path = os.path.join(project_path, ".project.json")
        metadata = {}
        if os.path.exists(meta_path):
            try:
                with open(meta_path, 'r') as f:
                    metadata = json.load(f)
            except:
                pass

        # Count data files
        file_count = 0
        data_dir = os.path.join(project_path, "data")
        if os.path.exists(data_dir):
            for root, dirs, files in os.walk(data_dir):
                file_count += len([f for f in files if not f.startswith('.')])

        # Check for analysis and dashboard
        analysis_exists = os.path.exists(os.path.join(project_path, ".analysis", "metadata.json"))
        dashboard_exists = os.path.exists(os.path.join(project_path, ".dashboards", "default.json"))

        projects.append(ProjectResponse(
            name=name,
            description=metadata.get('description'),
            created_at=metadata.get('created_at', datetime.utcnow().isoformat()),
            file_count=file_count,
            has_analysis=analysis_exists,
            has_dashboard=dashboard_exists
        ))

    return sorted(projects, key=lambda p: p.created_at, reverse=True)


@router.post("/projects", response_model=ProjectResponse)
async def create_project(
    request: CreateProjectRequest,
    user: User = Depends(require_valid_access)
):
    """Create a new Data Studio project."""
    user_id = str(user.id)

    # Sanitize project name
    safe_name = request.name.strip().replace(' ', '-').lower()
    safe_name = ''.join(c for c in safe_name if c.isalnum() or c in '-_')

    project_dir = get_project_dir(user_id, safe_name)

    if os.path.exists(project_dir):
        raise HTTPException(status_code=400, detail="Project already exists")

    # Create project structure
    os.makedirs(project_dir)
    os.makedirs(os.path.join(project_dir, "data"))
    os.makedirs(os.path.join(project_dir, ".analysis"))
    os.makedirs(os.path.join(project_dir, ".dashboards"))
    os.makedirs(os.path.join(project_dir, ".claude"))
    os.makedirs(os.path.join(project_dir, "output", "charts"))

    # Create project metadata
    metadata = {
        "name": request.name,
        "description": request.description,
        "created_at": datetime.utcnow().isoformat(),
        "user_id": user_id
    }
    with open(os.path.join(project_dir, ".project.json"), 'w') as f:
        json.dump(metadata, f, indent=2)

    return ProjectResponse(
        name=safe_name,
        description=request.description,
        created_at=metadata['created_at'],
        file_count=0,
        has_analysis=False,
        has_dashboard=False
    )


@router.delete("/projects/{project_name}")
async def delete_project(
    project_name: str,
    user: User = Depends(require_valid_access)
):
    """Delete a Data Studio project."""
    project_dir = get_project_dir(str(user.id), project_name)

    if not os.path.exists(project_dir):
        raise HTTPException(status_code=404, detail="Project not found")

    shutil.rmtree(project_dir)
    return {"status": "deleted", "name": project_name}


# ==================== File Management ====================

@router.get("/projects/{project_name}/files")
async def list_files(
    project_name: str,
    user: User = Depends(require_valid_access)
):
    """List all data files in a project."""
    project_dir = get_project_dir(str(user.id), project_name)

    if not os.path.exists(project_dir):
        raise HTTPException(status_code=404, detail="Project not found")

    files = []
    data_dir = os.path.join(project_dir, "data")
    supported_ext = {'.csv', '.tsv', '.json', '.jsonl', '.xlsx', '.xls', '.parquet', '.md'}

    if os.path.exists(data_dir):
        for root, dirs, filenames in os.walk(data_dir):
            # Skip hidden directories
            dirs[:] = [d for d in dirs if not d.startswith('.')]

            rel_root = os.path.relpath(root, data_dir)
            if rel_root == '.':
                rel_root = ''

            for filename in filenames:
                if filename.startswith('.'):
                    continue

                ext = os.path.splitext(filename)[1].lower()
                if ext in supported_ext:
                    full_path = os.path.join(root, filename)
                    stat = os.stat(full_path)

                    files.append({
                        "name": filename,
                        "path": os.path.join(rel_root, filename) if rel_root else filename,
                        "folder": rel_root.split('/')[0] if rel_root else "root",
                        "size": stat.st_size,
                        "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                        "type": ext[1:]
                    })

    return {"files": sorted(files, key=lambda f: (f['folder'], f['name']))}


@router.post("/projects/{project_name}/files")
async def upload_files(
    project_name: str,
    files: List[UploadFile] = File(...),
    folder: str = "",
    user: User = Depends(require_valid_access)
):
    """Upload data files to a project."""
    project_dir = get_project_dir(str(user.id), project_name)

    if not os.path.exists(project_dir):
        raise HTTPException(status_code=404, detail="Project not found")

    data_dir = os.path.join(project_dir, "data")
    if folder:
        data_dir = os.path.join(data_dir, folder)
    os.makedirs(data_dir, exist_ok=True)

    uploaded = []
    for file in files:
        # Check extension
        ext = os.path.splitext(file.filename)[1].lower()
        supported = {'.csv', '.tsv', '.json', '.jsonl', '.xlsx', '.xls', '.parquet', '.md', '.txt'}
        if ext not in supported:
            continue

        file_path = os.path.join(data_dir, file.filename)
        with open(file_path, 'wb') as f:
            content = await file.read()
            f.write(content)

        uploaded.append({
            "name": file.filename,
            "size": len(content),
            "path": os.path.join(folder, file.filename) if folder else file.filename
        })

    return {"uploaded": uploaded, "count": len(uploaded)}


@router.post("/projects/{project_name}/import")
async def import_from_workspace(
    project_name: str,
    request: ImportFromWorkspaceRequest,
    user: User = Depends(require_valid_access)
):
    """Import data files from a Workspace project."""
    user_id = str(user.id)
    project_dir = get_project_dir(user_id, project_name)

    if not os.path.exists(project_dir):
        raise HTTPException(status_code=404, detail="Data Studio project not found")

    # Source workspace project
    workspace_dir = os.path.join(DATA_STUDIO_BASE, user_id, "projects", request.workspace_project)
    if not os.path.exists(workspace_dir):
        raise HTTPException(status_code=404, detail="Workspace project not found")

    # Find data files in workspace
    source_data_dir = os.path.join(workspace_dir, "data")
    target_data_dir = os.path.join(project_dir, "data")
    os.makedirs(target_data_dir, exist_ok=True)

    supported_ext = {'.csv', '.tsv', '.json', '.jsonl', '.xlsx', '.xls', '.parquet'}
    imported = []

    if os.path.exists(source_data_dir):
        for root, dirs, files in os.walk(source_data_dir):
            dirs[:] = [d for d in dirs if not d.startswith('.')]

            for filename in files:
                if filename.startswith('.'):
                    continue

                ext = os.path.splitext(filename)[1].lower()
                if ext not in supported_ext:
                    continue

                # Check if specific files requested
                if request.files:
                    rel_path = os.path.relpath(os.path.join(root, filename), source_data_dir)
                    if rel_path not in request.files:
                        continue

                # Copy file
                src = os.path.join(root, filename)
                dst = os.path.join(target_data_dir, filename)
                shutil.copy2(src, dst)
                imported.append(filename)

    return {"imported": imported, "count": len(imported)}


@router.delete("/projects/{project_name}/files")
async def delete_file(
    project_name: str,
    path: str,
    user: User = Depends(require_valid_access)
):
    """Delete a file from a project."""
    project_dir = get_project_dir(str(user.id), project_name)

    if not os.path.exists(project_dir):
        raise HTTPException(status_code=404, detail="Project not found")

    file_path = os.path.join(project_dir, "data", path)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    if os.path.isdir(file_path):
        shutil.rmtree(file_path)
    else:
        os.remove(file_path)

    return {"status": "deleted", "path": path}


# ==================== Analysis (Claude Code) ====================

@router.post("/projects/{project_name}/analyze")
async def analyze_project(
    project_name: str,
    request: AnalyzeRequest = AnalyzeRequest(),
    user: User = Depends(require_valid_access)
):
    """
    Analyze all data files using Claude Code.

    Returns a streaming response with analysis progress.
    Mode: "headless" for clean output, "terminal" for full Claude view.
    """
    user_id = str(user.id)
    project_dir = get_project_dir(user_id, project_name)

    if not os.path.exists(project_dir):
        raise HTTPException(status_code=404, detail="Project not found")

    # Check for cached analysis if not forcing
    if not request.force:
        metadata_path = os.path.join(project_dir, ".analysis", "metadata.json")
        if os.path.exists(metadata_path):
            with open(metadata_path, 'r') as f:
                return {"status": "cached", "metadata": json.load(f)}

    async def stream_analysis():
        """Stream analysis events as SSE."""
        async for event in claude_runner.run_analysis(
            user_id=user_id,
            project_name=project_name,
            project_dir=project_dir,
            mode=request.mode
        ):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        stream_analysis(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        }
    )


@router.get("/projects/{project_name}/metadata")
async def get_metadata(
    project_name: str,
    user: User = Depends(require_valid_access)
):
    """Get cached analysis metadata for a project."""
    project_dir = get_project_dir(str(user.id), project_name)

    if not os.path.exists(project_dir):
        raise HTTPException(status_code=404, detail="Project not found")

    metadata_path = os.path.join(project_dir, ".analysis", "metadata.json")

    if not os.path.exists(metadata_path):
        raise HTTPException(status_code=404, detail="No analysis found. Run analyze first.")

    with open(metadata_path, 'r') as f:
        return json.load(f)


@router.get("/projects/{project_name}/insights")
async def get_insights(
    project_name: str,
    user: User = Depends(require_valid_access)
):
    """Get accumulated insights for a project."""
    project_dir = get_project_dir(str(user.id), project_name)

    if not os.path.exists(project_dir):
        raise HTTPException(status_code=404, detail="Project not found")

    insights_path = os.path.join(project_dir, ".analysis", "insights.md")

    if not os.path.exists(insights_path):
        return {"insights": ""}

    with open(insights_path, 'r') as f:
        return {"insights": f.read()}


# ==================== Dashboards ====================

@router.get("/projects/{project_name}/dashboards")
async def list_dashboards(
    project_name: str,
    user: User = Depends(require_valid_access)
):
    """List all dashboards for a project."""
    project_dir = get_project_dir(str(user.id), project_name)

    if not os.path.exists(project_dir):
        raise HTTPException(status_code=404, detail="Project not found")

    dashboards_dir = os.path.join(project_dir, ".dashboards")
    dashboards = []

    if os.path.exists(dashboards_dir):
        for filename in os.listdir(dashboards_dir):
            if filename.endswith('.json'):
                dashboard_id = filename[:-5]
                try:
                    with open(os.path.join(dashboards_dir, filename), 'r') as f:
                        data = json.load(f)
                        dashboards.append({
                            "id": dashboard_id,
                            "name": data.get("name", dashboard_id),
                            "widget_count": len(data.get("widgets", [])),
                            "updated_at": data.get("updated_at")
                        })
                except:
                    pass

    return {"dashboards": dashboards}


@router.get("/projects/{project_name}/dashboards/{dashboard_id}")
async def get_dashboard(
    project_name: str,
    dashboard_id: str,
    user: User = Depends(require_valid_access)
):
    """Get a specific dashboard."""
    project_dir = get_project_dir(str(user.id), project_name)

    if not os.path.exists(project_dir):
        raise HTTPException(status_code=404, detail="Project not found")

    dashboard_path = os.path.join(project_dir, ".dashboards", f"{dashboard_id}.json")

    if not os.path.exists(dashboard_path):
        raise HTTPException(status_code=404, detail="Dashboard not found")

    with open(dashboard_path, 'r') as f:
        return json.load(f)


@router.post("/projects/{project_name}/dashboards/generate")
async def generate_dashboard(
    project_name: str,
    request: GenerateDashboardRequest = GenerateDashboardRequest(),
    user: User = Depends(require_valid_access)
):
    """
    Generate a dashboard using Claude Code.

    Returns a streaming response with generation progress.
    """
    user_id = str(user.id)
    project_dir = get_project_dir(user_id, project_name)

    if not os.path.exists(project_dir):
        raise HTTPException(status_code=404, detail="Project not found")

    # Check if analysis exists
    metadata_path = os.path.join(project_dir, ".analysis", "metadata.json")
    if not os.path.exists(metadata_path):
        raise HTTPException(status_code=400, detail="No analysis found. Run analyze first.")

    async def stream_generation():
        """Stream dashboard generation events as SSE."""
        async for event in claude_runner.generate_dashboard(
            user_id=user_id,
            project_name=project_name,
            project_dir=project_dir,
            dashboard_name=request.name,
            mode=request.mode
        ):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        stream_generation(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        }
    )


@router.post("/projects/{project_name}/dashboards")
async def save_dashboard(
    project_name: str,
    request: DashboardSaveRequest,
    user: User = Depends(require_valid_access)
):
    """Save or update a dashboard manually."""
    project_dir = get_project_dir(str(user.id), project_name)

    if not os.path.exists(project_dir):
        raise HTTPException(status_code=404, detail="Project not found")

    dashboards_dir = os.path.join(project_dir, ".dashboards")
    os.makedirs(dashboards_dir, exist_ok=True)

    # Sanitize dashboard name for ID
    dashboard_id = request.name.strip().replace(' ', '-').lower()
    dashboard_id = ''.join(c for c in dashboard_id if c.isalnum() or c in '-_') or "dashboard"

    dashboard_data = {
        "id": dashboard_id,
        "name": request.name,
        "widgets": request.widgets,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }

    with open(os.path.join(dashboards_dir, f"{dashboard_id}.json"), 'w') as f:
        json.dump(dashboard_data, f, indent=2)

    return {"id": dashboard_id, "status": "saved"}


@router.delete("/projects/{project_name}/dashboards/{dashboard_id}")
async def delete_dashboard(
    project_name: str,
    dashboard_id: str,
    user: User = Depends(require_valid_access)
):
    """Delete a dashboard."""
    project_dir = get_project_dir(str(user.id), project_name)

    if not os.path.exists(project_dir):
        raise HTTPException(status_code=404, detail="Project not found")

    dashboard_path = os.path.join(project_dir, ".dashboards", f"{dashboard_id}.json")

    if not os.path.exists(dashboard_path):
        raise HTTPException(status_code=404, detail="Dashboard not found")

    os.remove(dashboard_path)
    return {"status": "deleted", "id": dashboard_id}


# ==================== NLP Editing (Claude Code) ====================

@router.post("/projects/{project_name}/edit")
async def nlp_edit(
    project_name: str,
    request: NLPEditRequest,
    user: User = Depends(require_valid_access)
):
    """
    Edit a dashboard using natural language via Claude Code.

    Returns a streaming response with edit progress.
    """
    user_id = str(user.id)
    project_dir = get_project_dir(user_id, project_name)

    if not os.path.exists(project_dir):
        raise HTTPException(status_code=404, detail="Project not found")

    # Check dashboard exists
    dashboard_path = os.path.join(project_dir, ".dashboards", f"{request.dashboard_id}.json")
    if not os.path.exists(dashboard_path):
        raise HTTPException(status_code=404, detail="Dashboard not found")

    async def stream_edit():
        """Stream NLP edit events as SSE."""
        async for event in claude_runner.nlp_edit(
            user_id=user_id,
            project_name=project_name,
            project_dir=project_dir,
            request=request.request,
            dashboard_id=request.dashboard_id,
            widget_id=request.target_widget_id,
            mode=request.mode
        ):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        stream_edit(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        }
    )


# ==================== Chat Interface ====================

@router.websocket("/projects/{project_name}/chat")
async def chat_websocket(
    websocket: WebSocket,
    project_name: str
):
    """
    WebSocket endpoint for chat-based data analysis.

    Client sends:
    - {"type": "auth", "token": "..."} - Authenticate first
    - {"type": "message", "content": "...", "mode": "headless|terminal"}
    - {"type": "ping"}

    Server sends:
    - {"type": "status", "content": "..."}
    - {"type": "text", "content": "..."}
    - {"type": "tool", "content": "..."}
    - {"type": "result", "content": "..."}
    - {"type": "error", "content": "..."}
    - {"type": "complete", "content": "..."}
    - {"type": "pong"}
    """
    await websocket.accept()

    user_id = None
    project_dir = None

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "ping":
                await websocket.send_json({"type": "pong"})
                continue

            if msg_type == "auth":
                # Simple auth - in production, verify JWT token
                token = data.get("token", "")
                # For now, extract user_id from token (simplified)
                # In production, decode and verify JWT
                user_id = data.get("user_id", "")
                if user_id:
                    project_dir = get_project_dir(user_id, project_name)
                    if os.path.exists(project_dir):
                        await websocket.send_json({"type": "status", "content": "Authenticated"})
                    else:
                        await websocket.send_json({"type": "error", "content": "Project not found"})
                        user_id = None
                else:
                    await websocket.send_json({"type": "error", "content": "Invalid authentication"})
                continue

            if msg_type == "message":
                if not user_id or not project_dir:
                    await websocket.send_json({"type": "error", "content": "Not authenticated"})
                    continue

                content = data.get("content", "")
                mode = data.get("mode", "headless")

                if not content:
                    await websocket.send_json({"type": "error", "content": "Empty message"})
                    continue

                # Stream Claude response
                async for event in claude_runner.chat(
                    user_id=user_id,
                    project_name=project_name,
                    project_dir=project_dir,
                    message=content,
                    mode=mode
                ):
                    await websocket.send_json(event)

    except WebSocketDisconnect:
        logger.info(f"Chat WebSocket disconnected for project {project_name}")
    except Exception as e:
        logger.error(f"Chat WebSocket error: {e}")
        try:
            await websocket.send_json({"type": "error", "content": str(e)})
        except:
            pass

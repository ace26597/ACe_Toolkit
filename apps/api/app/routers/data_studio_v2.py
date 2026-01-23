"""
Data Studio V2 Router - Redesigned AI Data Analyst Framework.

Features:
- Standalone project system (separate from Workspace)
- Smart metadata extraction for any data type
- Auto-generated dashboards
- NLP-based editing of charts and dashboards
"""

import asyncio
import json
import logging
import os
import shutil
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from app.core.data_analyzer import DataAnalyzer
from app.core.dashboard_generator import DashboardGenerator
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


class NLPEditRequest(BaseModel):
    request: str  # Natural language edit request
    target_widget_id: Optional[str] = None  # If editing a specific widget
    dashboard_id: str = "default"


class DashboardCreateRequest(BaseModel):
    name: str
    widgets: List[dict] = []


class ChatMessage(BaseModel):
    content: str
    context_files: Optional[List[str]] = None


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
        dashboard_exists = os.path.exists(os.path.join(project_path, ".data-studio", "dashboards", "default.json"))

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
    os.makedirs(os.path.join(project_dir, ".data-studio", "dashboards"))
    os.makedirs(os.path.join(project_dir, ".claude"))

    # Create project metadata
    metadata = {
        "name": request.name,
        "description": request.description,
        "created_at": datetime.utcnow().isoformat(),
        "user_id": user_id
    }
    with open(os.path.join(project_dir, ".project.json"), 'w') as f:
        json.dump(metadata, f, indent=2)

    # Create CLAUDE.md for headless Claude sessions
    claude_md_content = _create_claude_md(safe_name)
    with open(os.path.join(project_dir, ".claude", "CLAUDE.md"), 'w') as f:
        f.write(claude_md_content)

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


# ==================== Analysis ====================

@router.post("/projects/{project_name}/analyze")
async def analyze_project(
    project_name: str,
    request: AnalyzeRequest = AnalyzeRequest(),
    user: User = Depends(require_valid_access)
):
    """Analyze all data files in the project."""
    project_dir = get_project_dir(str(user.id), project_name)

    if not os.path.exists(project_dir):
        raise HTTPException(status_code=404, detail="Project not found")

    analyzer = DataAnalyzer(project_dir)

    # Check for cached analysis
    if not request.force:
        cached = analyzer.get_cached_metadata()
        if cached:
            return {"status": "cached", "metadata": cached}

    # Run analysis
    try:
        metadata = await analyzer.analyze_project()
        return {"status": "complete", "metadata": metadata.to_dict()}
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.get("/projects/{project_name}/metadata")
async def get_metadata(
    project_name: str,
    user: User = Depends(require_valid_access)
):
    """Get analysis metadata for a project."""
    project_dir = get_project_dir(str(user.id), project_name)

    if not os.path.exists(project_dir):
        raise HTTPException(status_code=404, detail="Project not found")

    analyzer = DataAnalyzer(project_dir)
    cached = analyzer.get_cached_metadata()

    if not cached:
        raise HTTPException(status_code=404, detail="No analysis found. Run analyze first.")

    return cached


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

    generator = DashboardGenerator(project_dir)
    return generator.list_dashboards()


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

    generator = DashboardGenerator(project_dir)
    dashboard = generator.get_dashboard(dashboard_id)

    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")

    return dashboard


@router.post("/projects/{project_name}/dashboards/generate")
async def generate_dashboard(
    project_name: str,
    name: str = "default",
    user: User = Depends(require_valid_access)
):
    """Generate an auto-dashboard from analysis metadata."""
    project_dir = get_project_dir(str(user.id), project_name)

    if not os.path.exists(project_dir):
        raise HTTPException(status_code=404, detail="Project not found")

    # Load metadata
    analyzer = DataAnalyzer(project_dir)
    metadata = analyzer.get_cached_metadata()

    if not metadata:
        raise HTTPException(status_code=400, detail="No analysis found. Run analyze first.")

    # Generate dashboard
    generator = DashboardGenerator(project_dir)
    dashboard = await generator.generate_dashboard(metadata, name)

    return dashboard.to_dict()


@router.post("/projects/{project_name}/dashboards")
async def save_dashboard(
    project_name: str,
    request: DashboardCreateRequest,
    user: User = Depends(require_valid_access)
):
    """Save or update a dashboard."""
    project_dir = get_project_dir(str(user.id), project_name)

    if not os.path.exists(project_dir):
        raise HTTPException(status_code=404, detail="Project not found")

    generator = DashboardGenerator(project_dir)
    dashboard_id = generator.save_dashboard({
        "name": request.name,
        "widgets": request.widgets
    })

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

    generator = DashboardGenerator(project_dir)
    if generator.delete_dashboard(dashboard_id):
        return {"status": "deleted", "id": dashboard_id}
    else:
        raise HTTPException(status_code=404, detail="Dashboard not found")


# ==================== NLP Editing ====================

@router.post("/projects/{project_name}/edit")
async def nlp_edit(
    project_name: str,
    request: NLPEditRequest,
    user: User = Depends(require_valid_access)
):
    """Edit a dashboard using natural language."""
    project_dir = get_project_dir(str(user.id), project_name)

    if not os.path.exists(project_dir):
        raise HTTPException(status_code=404, detail="Project not found")

    generator = DashboardGenerator(project_dir)
    dashboard = generator.get_dashboard(request.dashboard_id)

    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")

    # Build Claude prompt for editing
    edit_prompt = _build_edit_prompt(
        dashboard=dashboard,
        user_request=request.request,
        target_widget_id=request.target_widget_id
    )

    # Execute via headless Claude
    result = await _execute_claude_edit(
        project_dir=project_dir,
        prompt=edit_prompt,
        current_dashboard=dashboard
    )

    if result.get('error'):
        raise HTTPException(status_code=500, detail=result['error'])

    # Save updated dashboard
    if result.get('dashboard'):
        generator.save_dashboard(result['dashboard'])
        return result['dashboard']

    return dashboard


# ==================== Chat Interface ====================

@router.websocket("/projects/{project_name}/chat")
async def chat_websocket(
    websocket: WebSocket,
    project_name: str
):
    """
    WebSocket endpoint for chat-based data analysis.

    Client sends:
    - {"type": "message", "content": "...", "context_files": [...]}
    - {"type": "ping"}

    Server sends:
    - {"type": "thinking", "content": "..."}
    - {"type": "text_delta", "content": "..."}
    - {"type": "result", "content": "..."}
    - {"type": "chart", "data": {...}}
    - {"type": "error", "message": "..."}
    - {"type": "done"}
    """
    await websocket.accept()

    # Get user from cookie (simplified - in production would verify JWT)
    # For now, extract user_id from the project path
    # This is a simplified version - real implementation would verify auth

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "ping":
                await websocket.send_json({"type": "pong"})
                continue

            if msg_type == "message":
                content = data.get("content", "")
                context_files = data.get("context_files", [])

                if not content:
                    await websocket.send_json({"type": "error", "message": "Empty message"})
                    continue

                # Stream response via Claude
                await _stream_claude_response(
                    websocket=websocket,
                    project_name=project_name,
                    message=content,
                    context_files=context_files
                )

    except WebSocketDisconnect:
        logger.info(f"Chat WebSocket disconnected for project {project_name}")
    except Exception as e:
        logger.error(f"Chat WebSocket error: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except:
            pass


# ==================== Helper Functions ====================

def _create_claude_md(project_name: str) -> str:
    """Create CLAUDE.md content for Data Studio projects."""
    return f'''# Data Studio Project: {project_name}

You are a data analysis assistant for the C3 Data Studio.

## Your Role
- Analyze data files and provide insights
- Create visualizations using Plotly (JSON format)
- Answer questions about patterns, trends, and anomalies
- Suggest data transformations and cleaning steps

## Data Location
Data files are in the `data/` directory. Use the Read tool to examine them.

## Output Format
When creating charts, output Plotly JSON specifications in code blocks:

```plotly
{{
  "data": [...],
  "layout": {{...}}
}}
```

Always use `"template": "plotly_dark"` for dark theme compatibility.

## Guidelines
1. Read files before analyzing
2. Show sample data before transformations
3. Explain findings in plain language
4. Handle errors gracefully
5. Keep visualizations focused and clear
'''


def _build_edit_prompt(
    dashboard: dict,
    user_request: str,
    target_widget_id: Optional[str] = None
) -> str:
    """Build a prompt for Claude to edit a dashboard."""
    if target_widget_id:
        # Find the specific widget
        widgets = dashboard.get('widgets', [])
        target_widget = next((w for w in widgets if w.get('id') == target_widget_id), None)

        if target_widget:
            return f'''You are editing a dashboard widget.

Current widget:
```json
{json.dumps(target_widget, indent=2)}
```

User request: {user_request}

Return ONLY the updated widget JSON, nothing else.'''

    return f'''You are editing a data dashboard.

Current dashboard:
```json
{json.dumps(dashboard, indent=2)}
```

User request: {user_request}

Return ONLY the complete updated dashboard JSON, nothing else.'''


async def _execute_claude_edit(
    project_dir: str,
    prompt: str,
    current_dashboard: dict
) -> dict:
    """Execute a Claude edit request and parse the result."""
    # For now, return the current dashboard
    # In a full implementation, this would spawn Claude and parse the response
    logger.info(f"NLP edit request: {prompt[:100]}...")

    # TODO: Implement actual Claude execution
    # This is a placeholder that returns the current dashboard unchanged
    return {"dashboard": current_dashboard}


async def _stream_claude_response(
    websocket: WebSocket,
    project_name: str,
    message: str,
    context_files: List[str]
):
    """Stream a Claude response over WebSocket."""
    # This is a simplified placeholder
    # Full implementation would spawn headless Claude and stream output

    await websocket.send_json({"type": "thinking", "content": "Analyzing your request..."})

    # Placeholder response
    await websocket.send_json({
        "type": "text_delta",
        "content": f"I received your message about: {message[:50]}...\n\n"
    })

    await websocket.send_json({
        "type": "text_delta",
        "content": "This feature is being implemented. For now, use the analysis and dashboard generation endpoints."
    })

    await websocket.send_json({"type": "done"})

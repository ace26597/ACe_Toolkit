"""
Data Studio Router - API endpoints for C3 Data Studio.

Provides session management, WebSocket streaming, and dashboard persistence.
"""

import asyncio
import json
import logging
import os
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from app.core.data_studio_manager import data_studio_manager, DataStudioSession
from app.core.user_access import require_valid_access
from app.models.models import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/data-studio", tags=["data-studio"])


# ==================== Schemas ====================

class CreateSessionRequest(BaseModel):
    project_name: str


class CreateSessionResponse(BaseModel):
    session_id: str
    project_name: str
    data_files: List[dict]


class SessionInfo(BaseModel):
    id: str
    project_name: str
    created_at: str
    last_activity: str
    is_active: bool


class DashboardLayout(BaseModel):
    name: str
    widgets: List[dict]
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class SendMessageRequest(BaseModel):
    content: str


# ==================== Session Endpoints ====================

@router.post("/sessions", response_model=CreateSessionResponse)
async def create_session(
    request: CreateSessionRequest,
    user: User = Depends(require_valid_access)
):
    """
    Create a new Data Studio session for a project.

    Returns session ID and list of available data files.
    """
    try:
        session = await data_studio_manager.create_session(
            user_id=str(user.id),
            project_name=request.project_name
        )

        # Get list of data files
        data_files = data_studio_manager.list_data_files(session.project_dir)

        return CreateSessionResponse(
            session_id=session.id,
            project_name=session.project_name,
            data_files=data_files
        )

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating session: {e}")
        raise HTTPException(status_code=500, detail="Failed to create session")


@router.get("/sessions", response_model=List[SessionInfo])
async def list_sessions(user: User = Depends(require_valid_access)):
    """List all active Data Studio sessions for the current user."""
    sessions = data_studio_manager.list_sessions(str(user.id))
    return [SessionInfo(**s) for s in sessions]


@router.get("/sessions/{session_id}")
async def get_session(
    session_id: str,
    user: User = Depends(require_valid_access)
):
    """Get details of a specific session."""
    session = data_studio_manager.get_session(session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.user_id != str(user.id):
        raise HTTPException(status_code=403, detail="Access denied")

    data_files = data_studio_manager.list_data_files(session.project_dir)

    return {
        "id": session.id,
        "project_name": session.project_name,
        "project_dir": session.project_dir,
        "created_at": session.created_at.isoformat(),
        "last_activity": session.last_activity.isoformat(),
        "is_active": session.is_active,
        "data_files": data_files
    }


@router.delete("/sessions/{session_id}")
async def close_session(
    session_id: str,
    user: User = Depends(require_valid_access)
):
    """Close a Data Studio session."""
    session = data_studio_manager.get_session(session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.user_id != str(user.id):
        raise HTTPException(status_code=403, detail="Access denied")

    success = await data_studio_manager.close_session(session_id)

    if success:
        return {"status": "closed", "session_id": session_id}
    else:
        raise HTTPException(status_code=500, detail="Failed to close session")


# ==================== WebSocket Endpoint ====================

@router.websocket("/ws/{session_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    session_id: str
):
    """
    WebSocket endpoint for real-time communication with Claude.

    Client sends:
    - {"type": "message", "content": "..."}
    - {"type": "run_code", "code": "..."}

    Server sends:
    - {"type": "thinking", "content": "..."}
    - {"type": "tool_call", "tool": "...", "input": {...}}
    - {"type": "tool_result", "content": "..."}
    - {"type": "code", "language": "...", "content": "..."}
    - {"type": "text", "content": "..."}
    - {"type": "error", "message": "..."}
    - {"type": "done"}
    """
    await websocket.accept()

    session = data_studio_manager.get_session(session_id)
    if not session:
        await websocket.send_json({"type": "error", "message": "Session not found"})
        await websocket.close()
        return

    logger.info(f"WebSocket connected for session {session_id}")

    # Task for streaming output to client
    output_task: Optional[asyncio.Task] = None

    async def stream_output_to_client():
        """Stream Claude's output to the WebSocket client."""
        try:
            async for event in data_studio_manager.stream_output(session_id):
                await websocket.send_json(event)
                if event.get("type") == "done":
                    break
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Error streaming output: {e}")
            try:
                await websocket.send_json({"type": "error", "message": str(e)})
            except:
                pass

    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "message":
                # User message to Claude
                content = data.get("content", "")
                if not content:
                    await websocket.send_json({"type": "error", "message": "Empty message"})
                    continue

                # Send message to Claude
                await data_studio_manager.send_message(session_id, content)

                # Start streaming output
                if output_task:
                    output_task.cancel()
                output_task = asyncio.create_task(stream_output_to_client())

            elif msg_type == "run_code":
                # Execute code (send as message to Claude)
                code = data.get("code", "")
                if code:
                    prompt = f"Execute this code and show the result:\n```python\n{code}\n```"
                    await data_studio_manager.send_message(session_id, prompt)

                    if output_task:
                        output_task.cancel()
                    output_task = asyncio.create_task(stream_output_to_client())

            elif msg_type == "ping":
                # Keepalive
                await websocket.send_json({"type": "pong"})

            else:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Unknown message type: {msg_type}"
                })

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for session {session_id}")
    except Exception as e:
        logger.error(f"WebSocket error for session {session_id}: {e}")
    finally:
        if output_task:
            output_task.cancel()


# ==================== Dashboard Endpoints ====================

def _get_dashboards_dir(user_id: str, project_name: str) -> str:
    """Get the dashboards directory for a project."""
    return f"/data/users/{user_id}/projects/{project_name}/.data-studio/dashboards"


@router.get("/dashboards/{project_name}")
async def list_dashboards(
    project_name: str,
    user: User = Depends(require_valid_access)
):
    """List all saved dashboards for a project."""
    dashboards_dir = _get_dashboards_dir(str(user.id), project_name)

    if not os.path.exists(dashboards_dir):
        return []

    dashboards = []
    for filename in os.listdir(dashboards_dir):
        if filename.endswith(".json"):
            filepath = os.path.join(dashboards_dir, filename)
            try:
                with open(filepath, 'r') as f:
                    data = json.load(f)
                    dashboards.append({
                        "id": filename[:-5],  # Remove .json
                        "name": data.get("name", filename[:-5]),
                        "widget_count": len(data.get("widgets", [])),
                        "updated_at": data.get("updated_at")
                    })
            except Exception as e:
                logger.error(f"Error reading dashboard {filename}: {e}")

    return dashboards


@router.get("/dashboards/{project_name}/{dashboard_id}")
async def get_dashboard(
    project_name: str,
    dashboard_id: str,
    user: User = Depends(require_valid_access)
):
    """Get a specific dashboard."""
    dashboards_dir = _get_dashboards_dir(str(user.id), project_name)
    filepath = os.path.join(dashboards_dir, f"{dashboard_id}.json")

    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Dashboard not found")

    with open(filepath, 'r') as f:
        return json.load(f)


@router.post("/dashboards/{project_name}")
async def save_dashboard(
    project_name: str,
    dashboard: DashboardLayout,
    user: User = Depends(require_valid_access)
):
    """Save a dashboard layout."""
    dashboards_dir = _get_dashboards_dir(str(user.id), project_name)
    os.makedirs(dashboards_dir, exist_ok=True)

    # Generate ID from name if not exists
    dashboard_id = dashboard.name.lower().replace(" ", "-")
    filepath = os.path.join(dashboards_dir, f"{dashboard_id}.json")

    now = datetime.utcnow().isoformat()
    data = {
        "name": dashboard.name,
        "widgets": dashboard.widgets,
        "created_at": dashboard.created_at or now,
        "updated_at": now
    }

    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)

    return {"id": dashboard_id, "status": "saved"}


@router.delete("/dashboards/{project_name}/{dashboard_id}")
async def delete_dashboard(
    project_name: str,
    dashboard_id: str,
    user: User = Depends(require_valid_access)
):
    """Delete a dashboard."""
    dashboards_dir = _get_dashboards_dir(str(user.id), project_name)
    filepath = os.path.join(dashboards_dir, f"{dashboard_id}.json")

    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Dashboard not found")

    os.remove(filepath)
    return {"status": "deleted", "id": dashboard_id}


# ==================== Data Files Endpoint ====================

@router.get("/projects/{project_name}/files")
async def list_project_files(
    project_name: str,
    user: User = Depends(require_valid_access)
):
    """List data files in a project."""
    project_dir = f"/data/users/{user.id}/projects/{project_name}"

    if not os.path.exists(project_dir):
        raise HTTPException(status_code=404, detail="Project not found")

    files = data_studio_manager.list_data_files(project_dir)
    return {"files": files}

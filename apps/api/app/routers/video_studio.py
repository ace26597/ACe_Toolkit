"""
Video Studio Router - API endpoints for Remotion video generation.
Uses callback-based PTY reading (same pattern as CCResearch).
"""
import asyncio
import json
import logging
import uuid
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from jose import jwt, JWTError
from sqlalchemy.future import select

from app.core.user_access import require_valid_access
from app.core.video_studio_manager import video_studio_manager
from app.core.database import AsyncSessionLocal
from app.core.config import settings
from app.models.models import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/video-studio", tags=["Video Studio"])


# === Pydantic Models ===

class CreateProjectRequest(BaseModel):
    name: str


class StartSessionRequest(BaseModel):
    rows: int = 30
    cols: int = 120


class ResizeRequest(BaseModel):
    rows: int
    cols: int


# === Project Endpoints ===

@router.get("/projects")
async def list_projects(user: User = Depends(require_valid_access)):
    """List all video studio projects for the current user."""
    projects = await video_studio_manager.list_projects(str(user.id))
    return {"projects": projects}


@router.post("/projects")
async def create_project(
    request: CreateProjectRequest,
    user: User = Depends(require_valid_access)
):
    """Create a new video studio project."""
    try:
        project = await video_studio_manager.create_project(
            str(user.id),
            request.name
        )
        return project
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/projects/{project_name}")
async def get_project(
    project_name: str,
    user: User = Depends(require_valid_access)
):
    """Get project details."""
    project = await video_studio_manager.get_project(str(user.id), project_name)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.delete("/projects/{project_name}")
async def delete_project(
    project_name: str,
    user: User = Depends(require_valid_access)
):
    """Delete a project."""
    success = await video_studio_manager.delete_project(str(user.id), project_name)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"status": "deleted"}


@router.post("/projects/{project_name}/install")
async def install_dependencies(
    project_name: str,
    user: User = Depends(require_valid_access)
):
    """Install npm dependencies for a project."""
    success = await video_studio_manager.install_dependencies(str(user.id), project_name)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to install dependencies")
    return {"status": "installed"}


# === Session Endpoints ===

@router.post("/projects/{project_name}/session")
async def start_session(
    project_name: str,
    request: StartSessionRequest,
    user: User = Depends(require_valid_access)
):
    """
    Prepare for a Claude Code session.

    This just validates the project exists. The actual PTY process
    is spawned when the WebSocket connects (with output callback).
    """
    # Validate project exists
    project = await video_studio_manager.get_project(str(user.id), project_name)
    if not project:
        raise HTTPException(status_code=404, detail=f"Project '{project_name}' not found")

    session_key = f"{user.id}:{project_name}"
    return {"session_key": session_key, "status": "ready"}


@router.post("/projects/{project_name}/session/terminate")
async def terminate_session(
    project_name: str,
    user: User = Depends(require_valid_access)
):
    """Terminate the Claude Code session."""
    success = await video_studio_manager.terminate_session(str(user.id), project_name)
    return {"status": "terminated" if success else "not_running"}


@router.post("/projects/{project_name}/session/resize")
async def resize_terminal(
    project_name: str,
    request: ResizeRequest,
    user: User = Depends(require_valid_access)
):
    """Resize the terminal."""
    video_studio_manager.resize_terminal(
        str(user.id),
        project_name,
        request.rows,
        request.cols
    )
    return {"status": "resized"}


# === Video Endpoints ===

@router.get("/projects/{project_name}/videos")
async def list_videos(
    project_name: str,
    user: User = Depends(require_valid_access)
):
    """List all rendered videos in a project."""
    videos = await video_studio_manager.list_videos(str(user.id), project_name)
    return {"videos": videos}


@router.get("/projects/{project_name}/videos/{filename}")
async def get_video(
    project_name: str,
    filename: str,
    user: User = Depends(require_valid_access),
    download: bool = Query(False)
):
    """Stream or download a video file."""
    project_dir = video_studio_manager.get_project_dir(str(user.id), project_name)
    video_path = project_dir / "out" / filename

    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Video not found")

    # Security check - ensure path is within project
    try:
        video_path.resolve().relative_to(project_dir.resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")

    if download:
        return FileResponse(
            video_path,
            filename=filename,
            media_type="video/mp4"
        )

    # Stream the video
    def iterfile():
        with open(video_path, "rb") as f:
            while chunk := f.read(1024 * 1024):  # 1MB chunks
                yield chunk

    return StreamingResponse(
        iterfile(),
        media_type="video/mp4",
        headers={
            "Accept-Ranges": "bytes",
            "Content-Length": str(video_path.stat().st_size)
        }
    )


@router.delete("/projects/{project_name}/videos/{filename}")
async def delete_video(
    project_name: str,
    filename: str,
    user: User = Depends(require_valid_access)
):
    """Delete a video file."""
    project_dir = video_studio_manager.get_project_dir(str(user.id), project_name)
    video_path = project_dir / "out" / filename

    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Video not found")

    # Security check
    try:
        video_path.resolve().relative_to(project_dir.resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")

    video_path.unlink()
    return {"status": "deleted"}


# === WebSocket Terminal ===

async def get_user_from_websocket(websocket: WebSocket) -> Optional[User]:
    """Authenticate user from WebSocket cookies."""
    token = websocket.cookies.get("access_token")
    if not token:
        return None

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            return None
        user_id = uuid.UUID(user_id_str)
    except (JWTError, ValueError):
        return None

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalars().first()
        return user


@router.websocket("/terminal/{project_name}")
async def websocket_terminal(
    websocket: WebSocket,
    project_name: str
):
    """
    WebSocket endpoint for terminal I/O.

    Uses callback-based reading (same pattern as CCResearch):
    1. WebSocket connects
    2. Starts session with output_callback
    3. Manager's read loop calls callback with PTY output
    4. WebSocket loop handles input only
    """
    await websocket.accept()

    # Authenticate via cookie
    user = await get_user_from_websocket(websocket)
    if not user:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    user_id = str(user.id)
    logger.info(f"WebSocket connected for {user_id}:{project_name}")

    # Track WebSocket state to prevent sending to closed connections
    ws_closed = False

    # Define output callback to send data to WebSocket
    # Send raw bytes - frontend must use binaryType='arraybuffer' (like CCResearch)
    async def send_output(data: bytes):
        nonlocal ws_closed
        if ws_closed:
            return False  # Signal to stop the read loop
        try:
            await websocket.send_bytes(data)
            return True  # Continue the read loop
        except Exception as e:
            ws_closed = True  # Mark as closed so future sends are skipped
            logger.error(f"Failed to send output: {e}")
            return False  # Signal to stop the read loop

    # Start/reconnect session with callback
    try:
        session_key = await video_studio_manager.start_session(
            user_id,
            project_name,
            rows=30,
            cols=120,
            output_callback=send_output
        )
    except ValueError as e:
        await websocket.send_json({"type": "error", "error": str(e)})
        await websocket.close(code=4004, reason=str(e))
        return

    # Get the process for input handling
    process = video_studio_manager.get_process(user_id, project_name)
    if not process:
        await websocket.send_json({"type": "error", "error": "Failed to get process"})
        await websocket.close(code=4004, reason="No process")
        return

    # Send status message
    await websocket.send_json({
        "type": "status",
        "status": "connected",
        "pid": process.pid
    })

    # Main input loop
    try:
        while True:
            message = await websocket.receive()

            if message["type"] == "websocket.disconnect":
                break

            if "bytes" in message:
                # Raw binary input -> PTY stdin
                await video_studio_manager.write_input(user_id, project_name, message["bytes"])

            elif "text" in message:
                text = message["text"]

                # Check for JSON commands
                try:
                    cmd = json.loads(text)
                    if cmd.get("type") == "resize":
                        video_studio_manager.resize_terminal(
                            user_id,
                            project_name,
                            cmd.get("rows", 24),
                            cmd.get("cols", 80)
                        )
                        continue
                    elif cmd.get("type") == "ping":
                        await websocket.send_json({"type": "pong"})
                        continue
                except json.JSONDecodeError:
                    pass

                # Text input -> PTY stdin (encode to bytes)
                if process.isalive():
                    await video_studio_manager.write_input(
                        user_id,
                        project_name,
                        text.encode('utf-8')
                    )

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {user_id}:{project_name}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        ws_closed = True
        logger.info(f"WebSocket closed for {user_id}:{project_name}")
        # Don't terminate process on disconnect - allow reconnect

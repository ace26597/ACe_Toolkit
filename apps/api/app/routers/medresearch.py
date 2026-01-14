"""
MedResearch Router

WebSocket terminal interface for Claude Code medical research sessions.

Features:
- Spawn Claude Code CLI via pexpect with PTY
- Bidirectional WebSocket streaming (stdin/stdout)
- Session directory management with medical CLAUDE.md
- 24-hour session persistence with auto-cleanup
- File browser for session workspace files

Endpoints:
- POST /sessions: Create new session
- GET /sessions/{browser_session_id}: List sessions
- GET /sessions/detail/{medresearch_id}: Get session details
- DELETE /sessions/{medresearch_id}: Delete session
- POST /sessions/{medresearch_id}/resize: Resize terminal
- GET /sessions/{medresearch_id}/files: List workspace files
- GET /sessions/{medresearch_id}/files/download: Download file
- WS /terminal/{medresearch_id}: Bidirectional terminal I/O
"""

import json
import uuid
import logging
import mimetypes
import tempfile
import zipfile
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.medresearch_manager import medresearch_manager
from app.models.models import MedResearchSession

logger = logging.getLogger("medresearch")
router = APIRouter()


# ============ Pydantic Schemas ============

class CreateSessionRequest(BaseModel):
    session_id: str  # Browser session ID
    title: Optional[str] = None


class ResizeRequest(BaseModel):
    rows: int
    cols: int


class SessionResponse(BaseModel):
    id: str
    session_id: str
    title: str
    workspace_dir: str
    status: str
    terminal_rows: int
    terminal_cols: int
    commands_executed: int
    created_at: datetime
    last_activity_at: datetime
    expires_at: datetime

    class Config:
        from_attributes = True


class FileInfo(BaseModel):
    name: str
    path: str  # Relative path from workspace root
    is_dir: bool
    size: int
    modified_at: datetime


class FileListResponse(BaseModel):
    files: List[FileInfo]
    current_path: str


class SaveProjectRequest(BaseModel):
    project_name: str
    description: Optional[str] = ""


class SaveProjectResponse(BaseModel):
    name: str
    path: str
    saved_at: str


class ProjectInfo(BaseModel):
    name: str
    path: str
    description: Optional[str] = None
    saved_at: str
    files: Optional[List[str]] = None


class CreateFromProjectRequest(BaseModel):
    session_id: str  # Browser session ID
    project_name: str
    title: Optional[str] = None


# ============ REST Endpoints ============

@router.post("/sessions", response_model=SessionResponse)
async def create_session(
    request: CreateSessionRequest,
    db: AsyncSession = Depends(get_db)
):
    """Create a new MedResearch session with workspace directory"""
    medresearch_id = str(uuid.uuid4())

    # Create workspace directory with CLAUDE.md
    workspace_dir = medresearch_manager.create_workspace(medresearch_id)

    # Create database entry
    session = MedResearchSession(
        id=medresearch_id,
        session_id=request.session_id,
        title=request.title or f"Research Session {datetime.utcnow().strftime('%H:%M')}",
        workspace_dir=str(workspace_dir),
        status="created",
        expires_at=datetime.utcnow() + timedelta(hours=24)
    )

    db.add(session)
    await db.commit()
    await db.refresh(session)

    logger.info(f"Created session {medresearch_id} for browser session {request.session_id}")
    return session


@router.get("/sessions/{browser_session_id}", response_model=list[SessionResponse])
async def list_sessions(
    browser_session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """List all sessions for a browser session"""
    result = await db.execute(
        select(MedResearchSession)
        .where(MedResearchSession.session_id == browser_session_id)
        .where(MedResearchSession.expires_at > datetime.utcnow())
        .order_by(MedResearchSession.created_at.desc())
    )
    sessions = result.scalars().all()
    return sessions


@router.get("/sessions/detail/{medresearch_id}", response_model=SessionResponse)
async def get_session(
    medresearch_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get details for a specific session"""
    result = await db.execute(
        select(MedResearchSession)
        .where(MedResearchSession.id == medresearch_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Update status based on process state
    if medresearch_manager.is_process_alive(medresearch_id):
        session.status = "active"
    elif session.status == "active":
        session.status = "disconnected"

    await db.commit()
    return session


@router.delete("/sessions/{medresearch_id}")
async def delete_session(
    medresearch_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a session and cleanup resources"""
    result = await db.execute(
        select(MedResearchSession)
        .where(MedResearchSession.id == medresearch_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Terminate process if running
    await medresearch_manager.terminate_session(medresearch_id)

    # Delete workspace directory
    medresearch_manager.delete_workspace(Path(session.workspace_dir))

    # Delete from database
    await db.execute(
        delete(MedResearchSession)
        .where(MedResearchSession.id == medresearch_id)
    )
    await db.commit()

    logger.info(f"Deleted session {medresearch_id}")
    return {"status": "deleted", "id": medresearch_id}


@router.post("/sessions/{medresearch_id}/resize")
async def resize_terminal(
    medresearch_id: str,
    request: ResizeRequest,
    db: AsyncSession = Depends(get_db)
):
    """Resize terminal PTY dimensions"""
    result = await db.execute(
        select(MedResearchSession)
        .where(MedResearchSession.id == medresearch_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Update database
    session.terminal_rows = request.rows
    session.terminal_cols = request.cols
    await db.commit()

    # Resize PTY if process is running
    if medresearch_manager.is_process_alive(medresearch_id):
        success = await medresearch_manager.resize_terminal(
            medresearch_id, request.rows, request.cols
        )
        if not success:
            logger.warning(f"Failed to resize PTY for {medresearch_id}")

    return {"status": "resized", "rows": request.rows, "cols": request.cols}


# ============ File Browser Endpoints ============

@router.get("/sessions/{medresearch_id}/files", response_model=FileListResponse)
async def list_files(
    medresearch_id: str,
    path: str = "",
    db: AsyncSession = Depends(get_db)
):
    """List files in session workspace directory"""
    result = await db.execute(
        select(MedResearchSession)
        .where(MedResearchSession.id == medresearch_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    workspace = Path(session.workspace_dir)

    # Resolve requested path (prevent directory traversal)
    if path:
        target_path = (workspace / path).resolve()
        # Ensure target is within workspace
        if not str(target_path).startswith(str(workspace.resolve())):
            raise HTTPException(status_code=403, detail="Access denied")
    else:
        target_path = workspace

    if not target_path.exists():
        raise HTTPException(status_code=404, detail="Path not found")

    if not target_path.is_dir():
        raise HTTPException(status_code=400, detail="Path is not a directory")

    files = []
    for item in sorted(target_path.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower())):
        # Skip hidden files starting with . except CLAUDE.md
        if item.name.startswith('.') and item.name != '.claude':
            continue

        try:
            stat = item.stat()
            rel_path = str(item.relative_to(workspace))
            files.append(FileInfo(
                name=item.name,
                path=rel_path,
                is_dir=item.is_dir(),
                size=stat.st_size if item.is_file() else 0,
                modified_at=datetime.fromtimestamp(stat.st_mtime)
            ))
        except (OSError, ValueError) as e:
            logger.warning(f"Error reading file {item}: {e}")
            continue

    return FileListResponse(
        files=files,
        current_path=path or "/"
    )


@router.get("/sessions/{medresearch_id}/files/download")
async def download_file(
    medresearch_id: str,
    path: str,
    db: AsyncSession = Depends(get_db)
):
    """Download a file from session workspace"""
    result = await db.execute(
        select(MedResearchSession)
        .where(MedResearchSession.id == medresearch_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    workspace = Path(session.workspace_dir)

    # Resolve requested path (prevent directory traversal)
    target_path = (workspace / path).resolve()

    # Ensure target is within workspace
    if not str(target_path).startswith(str(workspace.resolve())):
        raise HTTPException(status_code=403, detail="Access denied")

    if not target_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    if not target_path.is_file():
        raise HTTPException(status_code=400, detail="Path is not a file")

    # Determine MIME type
    mime_type, _ = mimetypes.guess_type(str(target_path))
    if not mime_type:
        mime_type = "application/octet-stream"

    return FileResponse(
        path=target_path,
        filename=target_path.name,
        media_type=mime_type
    )


@router.get("/sessions/{medresearch_id}/files/content")
async def read_file_content(
    medresearch_id: str,
    path: str,
    db: AsyncSession = Depends(get_db)
):
    """Read text content of a file (for preview)"""
    result = await db.execute(
        select(MedResearchSession)
        .where(MedResearchSession.id == medresearch_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    workspace = Path(session.workspace_dir)

    # Resolve requested path (prevent directory traversal)
    target_path = (workspace / path).resolve()

    # Ensure target is within workspace
    if not str(target_path).startswith(str(workspace.resolve())):
        raise HTTPException(status_code=403, detail="Access denied")

    if not target_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    if not target_path.is_file():
        raise HTTPException(status_code=400, detail="Path is not a file")

    # Check file size (limit to 1MB for preview)
    if target_path.stat().st_size > 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large for preview")

    # Try to read as text
    try:
        content = target_path.read_text(encoding='utf-8')
        return {"content": content, "path": path, "name": target_path.name}
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File is not text (binary file)")


@router.get("/sessions/{medresearch_id}/download-zip")
async def download_workspace_zip(
    medresearch_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Download entire workspace directory as ZIP file"""
    result = await db.execute(
        select(MedResearchSession)
        .where(MedResearchSession.id == medresearch_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    workspace = Path(session.workspace_dir)

    if not workspace.exists():
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Create temporary ZIP file
    temp_dir = tempfile.mkdtemp()
    zip_filename = f"medresearch_{medresearch_id[:8]}.zip"
    zip_path = Path(temp_dir) / zip_filename

    try:
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for file_path in workspace.rglob('*'):
                if file_path.is_file():
                    # Get relative path from workspace root
                    rel_path = file_path.relative_to(workspace)
                    zipf.write(file_path, rel_path)

        # Return file and schedule cleanup
        def cleanup():
            try:
                shutil.rmtree(temp_dir)
            except Exception as e:
                logger.error(f"Failed to cleanup temp dir: {e}")

        return FileResponse(
            path=zip_path,
            filename=zip_filename,
            media_type="application/zip",
            background=cleanup
        )

    except Exception as e:
        # Cleanup on error
        shutil.rmtree(temp_dir, ignore_errors=True)
        logger.error(f"Failed to create ZIP: {e}")
        raise HTTPException(status_code=500, detail="Failed to create ZIP file")


# ============ Project Management Endpoints ============

@router.post("/sessions/{medresearch_id}/save-project", response_model=SaveProjectResponse)
async def save_session_as_project(
    medresearch_id: str,
    request: SaveProjectRequest,
    db: AsyncSession = Depends(get_db)
):
    """Save current session workspace as a persistent project on SSD"""
    result = await db.execute(
        select(MedResearchSession)
        .where(MedResearchSession.id == medresearch_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    workspace = Path(session.workspace_dir)
    if not workspace.exists():
        raise HTTPException(status_code=404, detail="Workspace not found")

    project_path = medresearch_manager.save_project(
        workspace,
        request.project_name,
        request.description or ""
    )

    if not project_path:
        raise HTTPException(status_code=500, detail="Failed to save project")

    logger.info(f"Saved session {medresearch_id} as project '{request.project_name}'")

    return SaveProjectResponse(
        name=request.project_name,
        path=str(project_path),
        saved_at=datetime.utcnow().isoformat()
    )


@router.get("/projects", response_model=List[ProjectInfo])
async def list_projects():
    """List all saved projects on SSD"""
    projects = medresearch_manager.list_saved_projects()
    return [ProjectInfo(**p) for p in projects]


@router.post("/sessions/from-project", response_model=SessionResponse)
async def create_session_from_project(
    request: CreateFromProjectRequest,
    db: AsyncSession = Depends(get_db)
):
    """Create a new session by restoring a saved project"""
    medresearch_id = str(uuid.uuid4())

    # Restore project files to new workspace
    workspace_dir = medresearch_manager.restore_project(
        request.project_name,
        medresearch_id
    )

    if not workspace_dir:
        raise HTTPException(
            status_code=404,
            detail=f"Project '{request.project_name}' not found"
        )

    # Create database entry
    session = MedResearchSession(
        id=medresearch_id,
        session_id=request.session_id,
        title=request.title or f"Restored: {request.project_name}",
        workspace_dir=str(workspace_dir),
        status="created",
        expires_at=datetime.utcnow() + timedelta(hours=24)
    )

    db.add(session)
    await db.commit()
    await db.refresh(session)

    logger.info(f"Created session {medresearch_id} from project '{request.project_name}'")
    return session


@router.delete("/projects/{project_name}")
async def delete_project(project_name: str):
    """Delete a saved project from SSD"""
    success = medresearch_manager.delete_project(project_name)

    if not success:
        raise HTTPException(status_code=404, detail="Project not found")

    logger.info(f"Deleted project '{project_name}'")
    return {"status": "deleted", "name": project_name}


# ============ WebSocket Endpoint ============

@router.websocket("/terminal/{medresearch_id}")
async def terminal_websocket(
    websocket: WebSocket,
    medresearch_id: str
):
    """Bidirectional terminal I/O via WebSocket"""
    await websocket.accept()

    # Log connection info
    origin = websocket.headers.get("origin", "unknown")
    logger.info(f"WebSocket connected for session {medresearch_id} from {origin}")

    # Get database session
    async for db in get_db():
        try:
            # Validate session exists
            result = await db.execute(
                select(MedResearchSession)
                .where(MedResearchSession.id == medresearch_id)
            )
            session = result.scalar_one_or_none()

            if not session:
                await websocket.send_json({
                    "type": "error",
                    "error": "Session not found"
                })
                await websocket.close()
                return

            # Check if expired
            if session.expires_at < datetime.utcnow():
                await websocket.send_json({
                    "type": "error",
                    "error": "Session expired"
                })
                await websocket.close()
                return

            # Define output callback to send data to WebSocket
            async def send_output(data: bytes):
                try:
                    await websocket.send_bytes(data)
                except Exception as e:
                    logger.error(f"Failed to send output: {e}")

            # Spawn or reconnect to Claude process
            success = await medresearch_manager.spawn_claude(
                medresearch_id,
                Path(session.workspace_dir),
                session.terminal_rows,
                session.terminal_cols,
                send_output
            )

            if not success:
                await websocket.send_json({
                    "type": "error",
                    "error": "Failed to start Claude Code. Ensure 'claude' CLI is installed."
                })
                await websocket.close()
                return

            # Update session status
            session.status = "active"
            session.last_activity_at = datetime.utcnow()
            await db.commit()

            # Send status message
            await websocket.send_json({
                "type": "status",
                "status": "connected",
                "pid": medresearch_manager.processes.get(medresearch_id).process.pid
                if medresearch_id in medresearch_manager.processes else None
            })

            # Main message loop
            try:
                while True:
                    message = await websocket.receive()

                    if "bytes" in message:
                        # Raw input -> Claude stdin
                        await medresearch_manager.write_input(
                            medresearch_id,
                            message["bytes"]
                        )
                        session.commands_executed += 1
                        session.last_activity_at = datetime.utcnow()

                    elif "text" in message:
                        # JSON command
                        try:
                            data = json.loads(message["text"])

                            if data.get("type") == "resize":
                                rows = data.get("rows", 24)
                                cols = data.get("cols", 80)
                                await medresearch_manager.resize_terminal(
                                    medresearch_id, rows, cols
                                )
                                session.terminal_rows = rows
                                session.terminal_cols = cols

                            elif data.get("type") == "ping":
                                await websocket.send_json({"type": "pong"})

                        except json.JSONDecodeError:
                            logger.warning(f"Invalid JSON received: {message['text'][:100]}")

                    await db.commit()

            except WebSocketDisconnect:
                logger.info(f"WebSocket disconnected: {medresearch_id}")
            except Exception as e:
                logger.error(f"WebSocket error: {e}")

            # Don't terminate process on disconnect - allow reconnect
            session.status = "disconnected"
            await db.commit()

        except Exception as e:
            logger.error(f"Session error: {e}")
            try:
                await websocket.send_json({
                    "type": "error",
                    "error": str(e)
                })
            except:
                pass
        finally:
            break  # Exit the generator


# ============ Cleanup Functions ============

async def cleanup_expired_sessions(db: AsyncSession) -> int:
    """Cleanup expired sessions from database and filesystem"""
    # Find expired sessions
    result = await db.execute(
        select(MedResearchSession)
        .where(MedResearchSession.expires_at < datetime.utcnow())
    )
    expired_sessions = result.scalars().all()

    deleted = 0
    for session in expired_sessions:
        try:
            # Terminate process if running
            await medresearch_manager.terminate_session(session.id)

            # Delete workspace
            medresearch_manager.delete_workspace(Path(session.workspace_dir))

            # Delete from database
            await db.execute(
                delete(MedResearchSession)
                .where(MedResearchSession.id == session.id)
            )
            deleted += 1
            logger.info(f"Cleaned up expired session: {session.id}")

        except Exception as e:
            logger.error(f"Failed to cleanup session {session.id}: {e}")

    await db.commit()
    return deleted

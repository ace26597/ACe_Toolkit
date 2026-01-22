"""
Research Assistant Router - Claude Code Headless QA Interface

Provides REST and WebSocket endpoints for the Research Assistant feature.
Uses Claude Code in headless mode with streaming JSON output.

Endpoints:
- POST /sessions: Create new session
- GET /sessions: List user sessions
- GET /sessions/{id}: Get session details
- POST /sessions/{id}/upload: Upload files
- POST /sessions/{id}/share: Create share link
- DELETE /sessions/{id}/share: Revoke share link
- GET /shared/{share_id}: Public session view
- DELETE /sessions/{id}: Delete session
- WS /sessions/{id}/stream: WebSocket for streaming queries
"""

import json
import uuid
import logging
import secrets
import aiofiles
from datetime import datetime
from pathlib import Path
from typing import Optional, List

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.user_access import require_valid_access
from app.core.research_assistant_manager import research_assistant_manager
from app.models.models import User, ResearchAssistantSession, ResearchAssistantMessage

logger = logging.getLogger("research_assistant")
router = APIRouter(prefix="/research-assistant", tags=["Research Assistant"])


# ============ Pydantic Schemas ============

class CreateSessionRequest(BaseModel):
    title: Optional[str] = "New Research"
    response_format: Optional[str] = "markdown"  # markdown, plain, json


class SessionResponse(BaseModel):
    id: str
    user_id: str
    claude_session_id: Optional[str]
    title: str
    workspace_dir: str
    response_format: str
    status: str
    turn_count: int
    share_id: Optional[str]
    shared_at: Optional[datetime]
    uploaded_files: Optional[List[str]]
    created_at: datetime
    last_activity: datetime

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    response_format: str
    tool_calls_json: Optional[str]
    thinking_json: Optional[str]
    input_tokens: int
    output_tokens: int
    created_at: datetime

    class Config:
        from_attributes = True


class UploadResponse(BaseModel):
    uploaded_files: List[str]
    data_dir: str


class ShareResponse(BaseModel):
    share_id: str
    share_url: str
    shared_at: datetime


class SharedSessionResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    shared_at: datetime
    message_count: int


# ============ Helper Functions ============

def generate_share_id() -> str:
    """Generate a random URL-safe share ID"""
    return secrets.token_urlsafe(9)  # 12 characters


# ============ REST Endpoints ============

@router.post("/sessions", response_model=SessionResponse)
async def create_session(
    title: str = Form("New Research"),
    response_format: str = Form("markdown"),
    files: List[UploadFile] = File(default=[]),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_valid_access)
):
    """Create a new Research Assistant session."""
    session_id = str(uuid.uuid4())
    user_id = str(current_user.id)

    # Process uploaded files
    uploaded_files_list = []

    # Create workspace
    workspace_dir = research_assistant_manager.create_workspace(
        user_id=user_id,
        session_id=session_id,
        uploaded_files=[]
    )

    # Save uploaded files
    data_dir = workspace_dir / "data"
    for file in files:
        if file.filename:
            safe_filename = Path(file.filename).name
            file_path = data_dir / safe_filename

            async with aiofiles.open(file_path, 'wb') as f:
                content = await file.read()
                await f.write(content)

            uploaded_files_list.append(safe_filename)
            logger.info(f"Uploaded file: {safe_filename}")

    # Update CLAUDE.md with file info
    if uploaded_files_list:
        research_assistant_manager.update_workspace_files(
            workspace_dir, session_id, uploaded_files_list
        )

    # Create database entry
    session = ResearchAssistantSession(
        id=session_id,
        user_id=current_user.id,
        title=title,
        workspace_dir=str(workspace_dir),
        response_format=response_format,
        status="ready",
        uploaded_files=json.dumps(uploaded_files_list) if uploaded_files_list else None
    )

    db.add(session)
    await db.commit()
    await db.refresh(session)

    logger.info(f"Created research session {session_id} for user {user_id}")

    return SessionResponse(
        id=session.id,
        user_id=str(session.user_id),
        claude_session_id=session.claude_session_id,
        title=session.title,
        workspace_dir=session.workspace_dir,
        response_format=session.response_format,
        status=session.status,
        turn_count=session.turn_count,
        share_id=session.share_id,
        shared_at=session.shared_at,
        uploaded_files=uploaded_files_list,
        created_at=session.created_at,
        last_activity=session.last_activity
    )


@router.get("/sessions", response_model=List[SessionResponse])
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_valid_access)
):
    """List all sessions for the current user."""
    result = await db.execute(
        select(ResearchAssistantSession)
        .where(ResearchAssistantSession.user_id == current_user.id)
        .order_by(ResearchAssistantSession.created_at.desc())
    )
    sessions = result.scalars().all()

    return [
        SessionResponse(
            id=s.id,
            user_id=str(s.user_id),
            claude_session_id=s.claude_session_id,
            title=s.title,
            workspace_dir=s.workspace_dir,
            response_format=s.response_format,
            status=s.status,
            turn_count=s.turn_count,
            share_id=s.share_id,
            shared_at=s.shared_at,
            uploaded_files=json.loads(s.uploaded_files) if s.uploaded_files else None,
            created_at=s.created_at,
            last_activity=s.last_activity
        )
        for s in sessions
    ]


@router.get("/sessions/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_valid_access)
):
    """Get details for a specific session."""
    result = await db.execute(
        select(ResearchAssistantSession)
        .where(ResearchAssistantSession.id == session_id)
        .where(ResearchAssistantSession.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return SessionResponse(
        id=session.id,
        user_id=str(session.user_id),
        claude_session_id=session.claude_session_id,
        title=session.title,
        workspace_dir=session.workspace_dir,
        response_format=session.response_format,
        status=session.status,
        turn_count=session.turn_count,
        share_id=session.share_id,
        shared_at=session.shared_at,
        uploaded_files=json.loads(session.uploaded_files) if session.uploaded_files else None,
        created_at=session.created_at,
        last_activity=session.last_activity
    )


@router.get("/sessions/{session_id}/messages", response_model=List[MessageResponse])
async def get_session_messages(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_valid_access)
):
    """Get all messages for a session."""
    # Verify session ownership
    result = await db.execute(
        select(ResearchAssistantSession)
        .where(ResearchAssistantSession.id == session_id)
        .where(ResearchAssistantSession.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Get messages
    result = await db.execute(
        select(ResearchAssistantMessage)
        .where(ResearchAssistantMessage.session_id == session_id)
        .order_by(ResearchAssistantMessage.created_at)
    )
    messages = result.scalars().all()

    return [
        MessageResponse(
            id=m.id,
            session_id=m.session_id,
            role=m.role,
            content=m.content,
            response_format=m.response_format,
            tool_calls_json=m.tool_calls_json,
            thinking_json=m.thinking_json,
            input_tokens=m.input_tokens,
            output_tokens=m.output_tokens,
            created_at=m.created_at
        )
        for m in messages
    ]


@router.post("/sessions/{session_id}/upload", response_model=UploadResponse)
async def upload_files(
    session_id: str,
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_valid_access)
):
    """Upload files to a session."""
    result = await db.execute(
        select(ResearchAssistantSession)
        .where(ResearchAssistantSession.id == session_id)
        .where(ResearchAssistantSession.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    workspace = Path(session.workspace_dir)
    data_dir = workspace / "data"
    data_dir.mkdir(exist_ok=True)

    uploaded_files_list = []
    existing_files = json.loads(session.uploaded_files) if session.uploaded_files else []

    for file in files:
        if file.filename:
            safe_filename = Path(file.filename).name
            file_path = data_dir / safe_filename

            async with aiofiles.open(file_path, 'wb') as f:
                content = await file.read()
                await f.write(content)

            uploaded_files_list.append(safe_filename)
            if safe_filename not in existing_files:
                existing_files.append(safe_filename)

    # Update database
    session.uploaded_files = json.dumps(existing_files)
    await db.commit()

    # Update CLAUDE.md
    research_assistant_manager.update_workspace_files(
        workspace, session_id, existing_files
    )

    logger.info(f"Uploaded {len(uploaded_files_list)} files to session {session_id}")

    return UploadResponse(
        uploaded_files=uploaded_files_list,
        data_dir=str(data_dir)
    )


@router.patch("/sessions/{session_id}")
async def update_session(
    session_id: str,
    title: Optional[str] = None,
    response_format: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_valid_access)
):
    """Update session title or response format."""
    result = await db.execute(
        select(ResearchAssistantSession)
        .where(ResearchAssistantSession.id == session_id)
        .where(ResearchAssistantSession.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if title:
        session.title = title
    if response_format:
        session.response_format = response_format

    await db.commit()

    return {"status": "updated", "id": session_id}


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_valid_access)
):
    """Delete a session and its workspace."""
    result = await db.execute(
        select(ResearchAssistantSession)
        .where(ResearchAssistantSession.id == session_id)
        .where(ResearchAssistantSession.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Delete workspace
    research_assistant_manager.delete_workspace(Path(session.workspace_dir))

    # Delete from database
    await db.execute(
        delete(ResearchAssistantSession)
        .where(ResearchAssistantSession.id == session_id)
    )
    await db.commit()

    logger.info(f"Deleted session {session_id}")
    return {"status": "deleted", "id": session_id}


# ============ Share Endpoints ============

@router.post("/sessions/{session_id}/share", response_model=ShareResponse)
async def create_share_link(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_valid_access)
):
    """Create a public share link for a session."""
    result = await db.execute(
        select(ResearchAssistantSession)
        .where(ResearchAssistantSession.id == session_id)
        .where(ResearchAssistantSession.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Return existing share if already shared
    if session.share_id:
        return ShareResponse(
            share_id=session.share_id,
            share_url=f"https://orpheuscore.uk/research/share/{session.share_id}",
            shared_at=session.shared_at or datetime.utcnow()
        )

    # Generate new share ID
    share_id = generate_share_id()
    session.share_id = share_id
    session.shared_at = datetime.utcnow()
    await db.commit()

    logger.info(f"Created share link for session {session_id}: {share_id}")

    return ShareResponse(
        share_id=share_id,
        share_url=f"https://orpheuscore.uk/research/share/{share_id}",
        shared_at=session.shared_at
    )


@router.delete("/sessions/{session_id}/share")
async def revoke_share_link(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_valid_access)
):
    """Revoke the share link for a session."""
    result = await db.execute(
        select(ResearchAssistantSession)
        .where(ResearchAssistantSession.id == session_id)
        .where(ResearchAssistantSession.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.share_id = None
    session.shared_at = None
    await db.commit()

    logger.info(f"Revoked share link for session {session_id}")
    return {"status": "revoked", "id": session_id}


@router.get("/shared/{share_id}", response_model=SharedSessionResponse)
async def get_shared_session(
    share_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get public info for a shared session (no auth required)."""
    result = await db.execute(
        select(ResearchAssistantSession)
        .where(ResearchAssistantSession.share_id == share_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Shared session not found")

    # Count messages
    result = await db.execute(
        select(ResearchAssistantMessage)
        .where(ResearchAssistantMessage.session_id == session.id)
    )
    messages = result.scalars().all()

    return SharedSessionResponse(
        id=session.id,
        title=session.title,
        created_at=session.created_at,
        shared_at=session.shared_at or session.created_at,
        message_count=len(messages)
    )


@router.get("/shared/{share_id}/messages", response_model=List[MessageResponse])
async def get_shared_messages(
    share_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get messages for a shared session (no auth required)."""
    result = await db.execute(
        select(ResearchAssistantSession)
        .where(ResearchAssistantSession.share_id == share_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Shared session not found")

    result = await db.execute(
        select(ResearchAssistantMessage)
        .where(ResearchAssistantMessage.session_id == session.id)
        .order_by(ResearchAssistantMessage.created_at)
    )
    messages = result.scalars().all()

    return [
        MessageResponse(
            id=m.id,
            session_id=m.session_id,
            role=m.role,
            content=m.content,
            response_format=m.response_format,
            tool_calls_json=m.tool_calls_json,
            thinking_json=m.thinking_json,
            input_tokens=m.input_tokens,
            output_tokens=m.output_tokens,
            created_at=m.created_at
        )
        for m in messages
    ]


# ============ File Endpoints ============

@router.get("/sessions/{session_id}/files")
async def list_files(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_valid_access)
):
    """List files in session workspace."""
    result = await db.execute(
        select(ResearchAssistantSession)
        .where(ResearchAssistantSession.id == session_id)
        .where(ResearchAssistantSession.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    files = research_assistant_manager.list_workspace_files(Path(session.workspace_dir))
    return {"files": files}


@router.get("/sessions/{session_id}/files/download")
async def download_file(
    session_id: str,
    path: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_valid_access)
):
    """Download a file from session workspace."""
    result = await db.execute(
        select(ResearchAssistantSession)
        .where(ResearchAssistantSession.id == session_id)
        .where(ResearchAssistantSession.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    workspace = Path(session.workspace_dir)
    file_path = (workspace / path).resolve()

    # Security check
    if not str(file_path).startswith(str(workspace.resolve())):
        raise HTTPException(status_code=403, detail="Access denied")

    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(path=file_path, filename=file_path.name)


# ============ WebSocket Endpoint ============

@router.websocket("/sessions/{session_id}/stream")
async def stream_query(
    websocket: WebSocket,
    session_id: str
):
    """
    WebSocket endpoint for streaming queries.

    Client sends:
    {"type": "query", "prompt": "...", "response_format": "markdown"}

    Server sends stream events:
    {"type": "thinking", "content": "..."}
    {"type": "tool_use", "name": "...", "input": {...}}
    {"type": "tool_result", "content": "...", "is_error": false}
    {"type": "text", "content": "..."}
    {"type": "complete", "response": "...", "usage": {...}}
    {"type": "error", "error": "..."}
    """
    await websocket.accept()

    # Get database session
    async for db in get_db():
        try:
            # Get session from database
            result = await db.execute(
                select(ResearchAssistantSession)
                .where(ResearchAssistantSession.id == session_id)
            )
            session = result.scalar_one_or_none()

            if not session:
                await websocket.send_json({"type": "error", "error": "Session not found"})
                await websocket.close()
                return

            await websocket.send_json({"type": "connected", "session_id": session_id})

            # Main message loop
            while True:
                try:
                    message = await websocket.receive_json()

                    if message.get("type") == "query":
                        prompt = message.get("prompt", "")
                        response_format = message.get("response_format", session.response_format)

                        if not prompt:
                            await websocket.send_json({"type": "error", "error": "Empty prompt"})
                            continue

                        # Update session status
                        session.status = "running"
                        session.last_activity = datetime.utcnow()
                        await db.commit()

                        # Save user message
                        user_message = ResearchAssistantMessage(
                            id=str(uuid.uuid4()),
                            session_id=session_id,
                            role="user",
                            content=prompt,
                            response_format=response_format
                        )
                        db.add(user_message)
                        await db.commit()

                        # Run query and stream results
                        full_response = ""
                        tool_calls = []
                        thinking_blocks = []
                        input_tokens = 0
                        output_tokens = 0
                        new_session_id = None

                        async for event in research_assistant_manager.run_query(
                            workspace_dir=Path(session.workspace_dir),
                            prompt=prompt,
                            claude_session_id=session.claude_session_id,
                            response_format=response_format
                        ):
                            # Send event to client
                            await websocket.send_json(event)

                            # Accumulate data
                            if event.get("type") == "text":
                                full_response += event.get("content", "")
                            elif event.get("type") == "tool_use":
                                tool_calls.append(event)
                            elif event.get("type") == "thinking":
                                thinking_blocks.append(event.get("content", ""))
                            elif event.get("type") == "complete":
                                new_session_id = event.get("session_id")
                                usage = event.get("usage", {})
                                input_tokens = usage.get("input_tokens", 0)
                                output_tokens = usage.get("output_tokens", 0)

                        # Save assistant message
                        assistant_message = ResearchAssistantMessage(
                            id=str(uuid.uuid4()),
                            session_id=session_id,
                            role="assistant",
                            content=full_response,
                            response_format=response_format,
                            tool_calls_json=json.dumps(tool_calls) if tool_calls else None,
                            thinking_json=json.dumps(thinking_blocks) if thinking_blocks else None,
                            input_tokens=input_tokens,
                            output_tokens=output_tokens
                        )
                        db.add(assistant_message)

                        # Update session
                        session.status = "ready"
                        session.turn_count += 1
                        if new_session_id:
                            session.claude_session_id = new_session_id
                        await db.commit()

                    elif message.get("type") == "ping":
                        await websocket.send_json({"type": "pong"})

                except WebSocketDisconnect:
                    logger.info(f"WebSocket disconnected: {session_id}")
                    break

        except Exception as e:
            logger.exception(f"WebSocket error: {e}")
            try:
                await websocket.send_json({"type": "error", "error": str(e)})
            except:
                pass
        finally:
            break  # Exit the generator

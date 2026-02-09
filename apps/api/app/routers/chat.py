"""
Chat Router - REST endpoints for the Chat UI in C3 Researcher Workspace.

Provides session management, listing, resume, rename, and SSE-streamed
message responses using the Claude Code SDK via ChatManager.
Sessions are persisted to DB (WorkspaceChatSession).
"""

import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.chat_manager import chat_manager
from app.core.database import get_db
from app.core.project_manager import ProjectManager
from app.core.user_access import require_valid_access
from app.models.models import User

logger = logging.getLogger(__name__)
router = APIRouter()


# ==================== Schemas ====================


class CreateSessionRequest(BaseModel):
    project_name: str


class CreateSessionResponse(BaseModel):
    session_id: str
    project_name: str
    title: str


class SendMessageRequest(BaseModel):
    message: str
    project_name: str  # Needed on first message to resolve project dir
    messages_snapshot: Optional[list] = None  # Current messages for persistence


class RenameSessionRequest(BaseModel):
    title: str


# ==================== Endpoints ====================


@router.get("/sessions")
async def list_chat_sessions(
    project_name: Optional[str] = Query(None),
    user: User = Depends(require_valid_access),
    db: AsyncSession = Depends(get_db),
):
    """List chat sessions for the current user, optionally filtered by project."""
    sessions = await chat_manager.list_sessions(db, str(user.id), project_name)
    return sessions


@router.get("/sessions/{session_id}")
async def get_chat_session(
    session_id: str,
    user: User = Depends(require_valid_access),
    db: AsyncSession = Depends(get_db),
):
    """Get full session details including messages."""
    detail = await chat_manager.get_session_detail(db, session_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Chat session not found")

    # Verify ownership
    if detail.get("user_id") and detail["user_id"] != str(user.id):
        raise HTTPException(status_code=403, detail="Not your session")

    return detail


@router.post("/sessions", response_model=CreateSessionResponse)
async def create_chat_session(
    body: CreateSessionRequest,
    user: User = Depends(require_valid_access),
    db: AsyncSession = Depends(get_db),
):
    """Create a new chat session for a workspace project."""
    pm = ProjectManager(str(user.id))
    project_path = await pm.get_project_path(body.project_name)

    if not project_path:
        raise HTTPException(status_code=404, detail="Project not found")

    session_id = await chat_manager.create_session(
        db=db,
        user_id=str(user.id),
        project_name=body.project_name,
        project_dir=str(project_path),
    )

    # Get the title from cache
    session = chat_manager.sessions.get(session_id)
    title = session.title if session else f"Chat - {body.project_name}"

    return CreateSessionResponse(
        session_id=session_id,
        project_name=body.project_name,
        title=title,
    )


@router.post("/sessions/{session_id}/message")
async def send_chat_message(
    session_id: str,
    body: SendMessageRequest,
    user: User = Depends(require_valid_access),
    db: AsyncSession = Depends(get_db),
):
    """Send a message and stream back the response via SSE.

    Returns a text/event-stream with JSON events:
        data: {"type": "text", "content": "..."}
        data: {"type": "tool_start", "tool": "Read", ...}
        data: {"type": "result", "content": "...", "cost_usd": 0.05}
    """
    # Ensure session is loaded into cache (supports resume after restart)
    session = await chat_manager.load_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    # Verify ownership
    if session.user_id != str(user.id):
        raise HTTPException(status_code=403, detail="Not your session")

    async def stream_response():
        got_result = False
        async for event in chat_manager.send_message(session_id, body.message):
            if event.get("type") == "result":
                got_result = True
            yield f"data: {json.dumps(event)}\n\n"

        # Persist session state after stream completes
        if got_result:
            try:
                from app.core.database import AsyncSessionLocal
                async with AsyncSessionLocal() as persist_db:
                    await chat_manager.persist_session(
                        persist_db,
                        session_id,
                        messages=body.messages_snapshot,
                    )
            except Exception as e:
                logger.error(f"Failed to persist chat session {session_id}: {e}")

    return StreamingResponse(
        stream_response(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@router.patch("/sessions/{session_id}/rename")
async def rename_chat_session(
    session_id: str,
    body: RenameSessionRequest,
    user: User = Depends(require_valid_access),
    db: AsyncSession = Depends(get_db),
):
    """Rename a chat session."""
    detail = await chat_manager.get_session_detail(db, session_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Chat session not found")

    success = await chat_manager.rename_session(db, session_id, body.title.strip())
    if not success:
        raise HTTPException(status_code=500, detail="Failed to rename session")

    return {"status": "renamed", "title": body.title.strip()}


class PersistMessagesRequest(BaseModel):
    messages_snapshot: list


@router.post("/sessions/{session_id}/persist")
async def persist_chat_messages(
    session_id: str,
    body: PersistMessagesRequest,
    user: User = Depends(require_valid_access),
    db: AsyncSession = Depends(get_db),
):
    """Persist the current messages snapshot to DB without triggering a Claude call."""
    session = await chat_manager.load_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    if session.user_id != str(user.id):
        raise HTTPException(status_code=403, detail="Not your session")

    await chat_manager.persist_session(db, session_id, messages=body.messages_snapshot)
    return {"status": "persisted"}


@router.delete("/sessions/{session_id}")
async def close_chat_session(
    session_id: str,
    user: User = Depends(require_valid_access),
    db: AsyncSession = Depends(get_db),
):
    """Close a chat session (soft close - marks as closed, preserves history)."""
    session = chat_manager.sessions.get(session_id)
    if session and session.user_id != str(user.id):
        raise HTTPException(status_code=403, detail="Not your session")

    await chat_manager.close_session(db, session_id)
    return {"status": "closed"}

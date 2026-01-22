"""
Research Router - API endpoints for web/GitHub import and Claude Code research sessions.

Endpoints:
- POST /research/sessions - Create new session
- GET /research/sessions - List sessions
- GET /research/sessions/{id} - Get session details
- POST /research/sessions/{id}/process - Process sources (crawl/clone)
- POST /research/sessions/{id}/run - Run Claude Code
- POST /research/sessions/{id}/continue - Continue conversation
- GET /research/sessions/{id}/history - Get conversation history
- WS /research/sessions/{id}/stream - Stream log output
- DELETE /research/sessions/{id} - Delete session
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum
import asyncio
import os

from app.core.research_manager import (
    research_manager,
    ResearchSession,
    SourceType,
    SessionStatus
)

router = APIRouter(prefix="/import-research", tags=["Import Research"])


class SourceTypeEnum(str, Enum):
    web = "web"
    github = "github"
    chat = "chat"  # Chat with existing project files (no external sources)


class CreateSessionRequest(BaseModel):
    project_name: str = Field(..., description="Workspace project name")
    urls: List[str] = Field(default=[], description="List of URLs to import (optional for chat)")
    prompt: str = Field(..., description="Research prompt/instructions")
    source_type: SourceTypeEnum = Field(default=SourceTypeEnum.chat, description="Type of source (web, github, or chat)")
    system_prompt: Optional[str] = Field(None, description="Custom system prompt")
    auto_process: bool = Field(True, description="Automatically start processing sources")
    auto_run: bool = Field(False, description="Automatically run Claude after processing")


class ContinueSessionRequest(BaseModel):
    prompt: str = Field(..., description="Follow-up prompt")


class RunClaudeRequest(BaseModel):
    prompt: Optional[str] = Field(None, description="Override prompt (uses initial if not provided)")


class SessionResponse(BaseModel):
    id: str
    project_name: str
    claude_session_id: Optional[str]
    source_type: str
    urls: List[str]
    initial_prompt: str
    system_prompt: Optional[str]
    workspace_dir: str
    status: str
    error_message: Optional[str]
    created_at: str
    last_activity: str
    conversation_turns: int
    last_response: Optional[str]

    @classmethod
    def from_session(cls, session: ResearchSession) -> "SessionResponse":
        return cls(
            id=session.id,
            project_name=session.project_name,
            claude_session_id=session.claude_session_id,
            source_type=session.source_type.value,
            urls=session.urls,
            initial_prompt=session.initial_prompt,
            system_prompt=session.system_prompt,
            workspace_dir=session.workspace_dir,
            status=session.status.value,
            error_message=session.error_message,
            created_at=session.created_at,
            last_activity=session.last_activity,
            conversation_turns=session.conversation_turns,
            last_response=session.last_response
        )


async def process_and_run_background(session_id: str, run_claude: bool):
    """Background task to process sources and optionally run Claude."""
    try:
        await research_manager.process_sources(session_id)

        if run_claude:
            session = research_manager.get_session(session_id)
            if session and session.status == SessionStatus.READY:
                await research_manager.run_claude(session_id)
    except Exception as e:
        import logging
        logging.error(f"Background processing failed: {e}")


@router.post("/sessions", response_model=SessionResponse)
async def create_session(
    request: CreateSessionRequest,
    background_tasks: BackgroundTasks
):
    """
    Create a new research session.

    This creates a session and optionally starts processing sources in the background.
    """
    # Convert source type
    source_type_map = {
        SourceTypeEnum.web: SourceType.WEB,
        SourceTypeEnum.github: SourceType.GITHUB,
        SourceTypeEnum.chat: SourceType.CHAT,
    }
    source_type = source_type_map.get(request.source_type, SourceType.CHAT)

    # Create session
    session = await research_manager.create_session(
        project_name=request.project_name,
        urls=request.urls,
        prompt=request.prompt,
        source_type=source_type,
        system_prompt=request.system_prompt
    )

    # Start background processing if requested
    if request.auto_process:
        background_tasks.add_task(
            process_and_run_background,
            session.id,
            request.auto_run
        )

    return SessionResponse.from_session(session)


@router.get("/sessions", response_model=List[SessionResponse])
async def list_sessions(project_name: Optional[str] = None):
    """List all research sessions, optionally filtered by project."""
    sessions = research_manager.list_sessions(project_name)
    return [SessionResponse.from_session(s) for s in sessions]


@router.get("/sessions/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str):
    """Get details of a specific session."""
    session = research_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return SessionResponse.from_session(session)


@router.post("/sessions/{session_id}/process", response_model=SessionResponse)
async def process_sources(session_id: str, background_tasks: BackgroundTasks):
    """
    Process sources (crawl websites or clone repos).

    This runs in the background and updates session status.
    """
    session = research_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.status not in [SessionStatus.PENDING, SessionStatus.ERROR]:
        raise HTTPException(
            status_code=400,
            detail=f"Session cannot be processed in current status: {session.status.value}"
        )

    # Start background processing
    background_tasks.add_task(research_manager.process_sources, session_id)

    session.status = SessionStatus.CRAWLING
    return SessionResponse.from_session(session)


@router.post("/sessions/{session_id}/run", response_model=SessionResponse)
async def run_claude(session_id: str, request: RunClaudeRequest = None):
    """
    Run Claude Code on the session sources.

    Sources must be processed first (status: ready).
    """
    session = research_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.status != SessionStatus.READY:
        raise HTTPException(
            status_code=400,
            detail=f"Session not ready for Claude. Current status: {session.status.value}"
        )

    prompt = request.prompt if request else None
    session = await research_manager.run_claude(session_id, prompt=prompt)

    return SessionResponse.from_session(session)


@router.post("/sessions/{session_id}/continue", response_model=SessionResponse)
async def continue_conversation(session_id: str, request: ContinueSessionRequest):
    """
    Continue the conversation with a follow-up prompt.

    Uses Claude's --resume flag to maintain context.
    """
    session = research_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if not session.claude_session_id:
        raise HTTPException(
            status_code=400,
            detail="No previous Claude session to continue. Run Claude first."
        )

    session = await research_manager.run_claude(
        session_id,
        prompt=request.prompt,
        is_continuation=True
    )

    return SessionResponse.from_session(session)


@router.get("/sessions/{session_id}/history")
async def get_conversation_history(session_id: str):
    """Get the full conversation history for a session."""
    session = research_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    history = research_manager.get_conversation_history(session_id)

    return {
        "session_id": session_id,
        "turns": len(history),
        "history": history
    }


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a session and all its files."""
    success = research_manager.delete_session(session_id)

    if not success:
        raise HTTPException(status_code=404, detail="Session not found")

    return {"message": "Session deleted", "session_id": session_id}


@router.post("/sessions/{session_id}/stop")
async def stop_session(session_id: str):
    """Stop a running research session."""
    success = await research_manager.stop_session(session_id)

    if not success:
        raise HTTPException(status_code=404, detail="Session not found")

    return {"message": "Session stopped", "session_id": session_id}


@router.get("/status")
async def get_research_status():
    """Get overall research system status."""
    all_sessions = research_manager.list_sessions()

    status_counts = {}
    for session in all_sessions:
        status = session.status.value
        status_counts[status] = status_counts.get(status, 0) + 1

    return {
        "total_sessions": len(all_sessions),
        "by_status": status_counts,
        "base_dir": str(research_manager.base_dir)
    }


@router.websocket("/sessions/{session_id}/stream")
async def stream_session_output(websocket: WebSocket, session_id: str):
    """
    Stream the session's output log via WebSocket.

    Sends log lines in real-time as Claude processes the request.
    Message format: {"type": "log", "content": "..."} or {"type": "complete"}
    """
    await websocket.accept()

    session = research_manager.get_session(session_id)
    if not session:
        await websocket.send_json({"type": "error", "message": "Session not found"})
        await websocket.close()
        return

    log_path = research_manager.get_log_path(session_id)
    if not log_path:
        await websocket.send_json({"type": "error", "message": "Log path not found"})
        await websocket.close()
        return

    try:
        last_position = 0
        no_update_count = 0

        while True:
            # Check if log file exists
            if log_path.exists():
                with open(log_path, 'r') as f:
                    f.seek(last_position)
                    new_content = f.read()

                    if new_content:
                        last_position = f.tell()
                        no_update_count = 0

                        # Send new content
                        await websocket.send_json({
                            "type": "log",
                            "content": new_content
                        })
                    else:
                        no_update_count += 1

            # Refresh session status
            session = research_manager.get_session(session_id)

            # Check if session is complete
            if session and session.status in [SessionStatus.READY, SessionStatus.ERROR]:
                # Wait a bit to ensure all logs are captured
                await asyncio.sleep(0.5)

                # Read any remaining content
                if log_path.exists():
                    with open(log_path, 'r') as f:
                        f.seek(last_position)
                        final_content = f.read()
                        if final_content:
                            await websocket.send_json({
                                "type": "log",
                                "content": final_content
                            })

                # Send completion message
                await websocket.send_json({
                    "type": "complete",
                    "status": session.status.value,
                    "response": session.last_response[:500] if session.last_response else None,
                    "error": session.error_message
                })
                break

            # Prevent infinite loops if no updates for too long
            if no_update_count > 600:  # 5 minutes with no updates
                await websocket.send_json({
                    "type": "timeout",
                    "message": "No updates for 5 minutes"
                })
                break

            await asyncio.sleep(0.5)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except:
            pass
    finally:
        try:
            await websocket.close()
        except:
            pass


@router.get("/sessions/{session_id}/log")
async def get_session_log(session_id: str, tail: int = 100):
    """Get the last N lines of the session log file."""
    session = research_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    log_path = research_manager.get_log_path(session_id)
    if not log_path or not log_path.exists():
        return {"content": "", "exists": False}

    try:
        with open(log_path, 'r') as f:
            lines = f.readlines()
            tail_lines = lines[-tail:] if len(lines) > tail else lines
            return {
                "content": "".join(tail_lines),
                "total_lines": len(lines),
                "exists": True
            }
    except Exception as e:
        return {"content": f"Error reading log: {e}", "exists": True}

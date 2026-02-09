"""
Chat Manager - Claude Code SDK wrapper for conversational chat UI.

Uses the claude-code-sdk Python package to get structured message objects
(text, tool calls, thinking, results) instead of raw ANSI terminal bytes.
This enables a rich ChatGPT-style UI in the C3 Researcher Workspace.

Sessions are persisted to DB (WorkspaceChatSession) so they survive
server restarts and can be listed/resumed from the frontend.
"""

import asyncio
import json
import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, AsyncGenerator, Dict, List, Optional

from claude_code_sdk import (
    AssistantMessage,
    ClaudeCodeOptions,
    ResultMessage,
    SystemMessage,
    TextBlock,
    ThinkingBlock,
    ToolResultBlock,
    ToolUseBlock,
    query,
)
from claude_code_sdk.types import StreamEvent
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class ChatSession:
    """Represents an active chat session in the in-memory cache."""

    session_id: str  # Our internal UUID (12-char)
    claude_session_id: Optional[str] = None  # SDK session ID (captured from ResultMessage)
    user_id: str = ""
    project_name: str = ""
    project_dir: str = ""
    title: str = ""
    model: str = ""
    total_cost_usd: float = 0.0
    total_turns: int = 0
    created_at: datetime = field(default_factory=datetime.utcnow)
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)


class ChatManager:
    """Manages chat sessions using the Claude Code SDK with DB persistence."""

    def __init__(self):
        # In-memory cache for active sessions (holds asyncio.Lock)
        self.sessions: Dict[str, ChatSession] = {}

    async def create_session(
        self,
        db: AsyncSession,
        user_id: str,
        project_name: str,
        project_dir: str,
    ) -> str:
        """Create a new chat session, persisted to DB.

        Returns:
            The session ID (our internal UUID).
        """
        from app.models.models import WorkspaceChatSession

        session_id = str(uuid.uuid4())[:12]

        # Determine session number for auto-naming
        count_result = await db.execute(
            select(func.count(WorkspaceChatSession.id))
            .where(WorkspaceChatSession.user_id == user_id)
            .where(WorkspaceChatSession.project_name == project_name)
        )
        existing_count = count_result.scalar() or 0
        session_number = existing_count + 1

        # Generate title like "Chat #1 - Feb 09"
        now = datetime.utcnow()
        title = f"Chat #{session_number} - {now.strftime('%b %d')}"

        # Create DB record
        db_session = WorkspaceChatSession(
            id=session_id,
            user_id=user_id,
            project_name=project_name,
            project_dir=project_dir,
            title=title,
            session_number=session_number,
            status="active",
        )
        db.add(db_session)
        await db.commit()

        # Add to in-memory cache
        self.sessions[session_id] = ChatSession(
            session_id=session_id,
            user_id=user_id,
            project_name=project_name,
            project_dir=project_dir,
            title=title,
        )

        logger.info(
            f"Chat session {session_id} created: '{title}' for user={user_id} project={project_name}"
        )
        return session_id

    async def load_session(self, db: AsyncSession, session_id: str) -> Optional[ChatSession]:
        """Load a session from DB into the in-memory cache for resume."""
        from app.models.models import WorkspaceChatSession

        # Already cached?
        if session_id in self.sessions:
            return self.sessions[session_id]

        result = await db.execute(
            select(WorkspaceChatSession).where(WorkspaceChatSession.id == session_id)
        )
        db_session = result.scalar_one_or_none()
        if not db_session:
            return None

        session = ChatSession(
            session_id=db_session.id,
            claude_session_id=db_session.claude_session_id,
            user_id=db_session.user_id,
            project_name=db_session.project_name,
            project_dir=db_session.project_dir,
            title=db_session.title,
            model=db_session.model or "",
            total_cost_usd=db_session.total_cost_usd or 0.0,
            total_turns=db_session.total_turns or 0,
            created_at=db_session.created_at,
        )
        self.sessions[session_id] = session
        return session

    async def persist_session(
        self,
        db: AsyncSession,
        session_id: str,
        messages: Optional[List[Dict]] = None,
    ):
        """Persist session state (cost, turns, claude_session_id, messages) to DB."""
        from app.models.models import WorkspaceChatSession

        session = self.sessions.get(session_id)
        if not session:
            return

        result = await db.execute(
            select(WorkspaceChatSession).where(WorkspaceChatSession.id == session_id)
        )
        db_session = result.scalar_one_or_none()
        if not db_session:
            return

        db_session.claude_session_id = session.claude_session_id
        db_session.model = session.model
        db_session.total_cost_usd = session.total_cost_usd
        db_session.total_turns = session.total_turns
        db_session.last_activity_at = datetime.utcnow()

        if messages is not None:
            db_session.messages_json = json.dumps(messages, default=str)

        await db.commit()

    async def list_sessions(
        self, db: AsyncSession, user_id: str, project_name: Optional[str] = None
    ) -> List[Dict]:
        """List chat sessions for a user, optionally filtered by project."""
        from app.models.models import WorkspaceChatSession

        query_stmt = (
            select(WorkspaceChatSession)
            .where(WorkspaceChatSession.user_id == user_id)
        )
        if project_name:
            query_stmt = query_stmt.where(WorkspaceChatSession.project_name == project_name)

        query_stmt = query_stmt.order_by(WorkspaceChatSession.last_activity_at.desc())

        result = await db.execute(query_stmt)
        sessions = result.scalars().all()

        return [
            {
                "session_id": s.id,
                "title": s.title,
                "project_name": s.project_name,
                "total_cost_usd": s.total_cost_usd or 0,
                "total_turns": s.total_turns or 0,
                "status": s.status,
                "created_at": s.created_at.isoformat() if s.created_at else None,
                "last_activity_at": s.last_activity_at.isoformat() if s.last_activity_at else None,
            }
            for s in sessions
        ]

    async def get_session_detail(self, db: AsyncSession, session_id: str) -> Optional[Dict]:
        """Get full session details including messages."""
        from app.models.models import WorkspaceChatSession

        result = await db.execute(
            select(WorkspaceChatSession).where(WorkspaceChatSession.id == session_id)
        )
        db_session = result.scalar_one_or_none()
        if not db_session:
            return None

        messages = []
        if db_session.messages_json:
            try:
                messages = json.loads(db_session.messages_json)
            except json.JSONDecodeError:
                pass

        return {
            "session_id": db_session.id,
            "user_id": db_session.user_id,
            "title": db_session.title,
            "project_name": db_session.project_name,
            "project_dir": db_session.project_dir,
            "total_cost_usd": db_session.total_cost_usd or 0,
            "total_turns": db_session.total_turns or 0,
            "status": db_session.status,
            "claude_session_id": db_session.claude_session_id,
            "model": db_session.model,
            "messages": messages,
            "created_at": db_session.created_at.isoformat() if db_session.created_at else None,
            "last_activity_at": db_session.last_activity_at.isoformat() if db_session.last_activity_at else None,
        }

    async def rename_session(self, db: AsyncSession, session_id: str, title: str) -> bool:
        """Rename a chat session."""
        from app.models.models import WorkspaceChatSession

        result = await db.execute(
            select(WorkspaceChatSession).where(WorkspaceChatSession.id == session_id)
        )
        db_session = result.scalar_one_or_none()
        if not db_session:
            return False

        db_session.title = title
        await db.commit()

        # Update cache if present
        if session_id in self.sessions:
            self.sessions[session_id].title = title

        return True

    async def send_message(
        self, session_id: str, message: str
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Send a message and yield SSE event dicts.

        Event types yielded:
            init        -> {session_id, model}
            text        -> {content: "partial or full text"}
            tool_start  -> {tool: name, tool_use_id, input: {...}}
            tool_result -> {tool_use_id, content, is_error}
            thinking    -> {content: "..."}
            result      -> {content, cost_usd, turns, total_cost_usd, session_id}
            error       -> {content: "error message"}
        """
        session = self.sessions.get(session_id)
        if not session:
            yield {"type": "error", "content": "Session not found"}
            return

        # Only one message at a time per session
        async with session.lock:
            yield {"type": "init", "session_id": session_id}

            try:
                options = ClaudeCodeOptions(
                    cwd=session.project_dir,
                    permission_mode="bypassPermissions",
                    include_partial_messages=True,
                )

                # If we have a previous claude session ID, resume the conversation
                if session.claude_session_id:
                    options.resume = session.claude_session_id

                async for msg in query(prompt=message, options=options):
                    async for event in self._process_message(msg, session):
                        yield event

            except Exception as e:
                logger.exception(f"Error in chat session {session_id}: {e}")
                yield {"type": "error", "content": str(e)}

    async def _process_message(
        self, msg: Any, session: ChatSession
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Process a single SDK message into SSE events."""

        if isinstance(msg, SystemMessage):
            # System messages carry metadata (init, tool list, etc.)
            if msg.subtype == "init":
                model = msg.data.get("model", "")
                tools = msg.data.get("tools", [])
                session.model = model
                yield {
                    "type": "init",
                    "session_id": session.session_id,
                    "model": model,
                    "tools": len(tools) if isinstance(tools, list) else 0,
                }

        elif isinstance(msg, AssistantMessage):
            for block in msg.content:
                if isinstance(block, TextBlock):
                    yield {"type": "text", "content": block.text}

                elif isinstance(block, ToolUseBlock):
                    yield {
                        "type": "tool_start",
                        "tool": block.name,
                        "tool_use_id": block.id,
                        "input": block.input,
                    }

                elif isinstance(block, ToolResultBlock):
                    # Stringify content for safe serialization
                    content = block.content
                    if isinstance(content, list):
                        # Extract text from content blocks
                        parts = []
                        for item in content:
                            if isinstance(item, dict) and "text" in item:
                                parts.append(item["text"])
                            else:
                                parts.append(str(item))
                        content = "\n".join(parts)
                    elif content is None:
                        content = ""

                    yield {
                        "type": "tool_result",
                        "tool_use_id": block.tool_use_id,
                        "content": str(content),
                        "is_error": block.is_error or False,
                    }

                elif isinstance(block, ThinkingBlock):
                    yield {"type": "thinking", "content": block.thinking}

        elif isinstance(msg, ResultMessage):
            # Capture session ID for conversation continuity
            session.claude_session_id = msg.session_id
            session.total_cost_usd += msg.total_cost_usd or 0
            session.total_turns += msg.num_turns

            yield {
                "type": "result",
                "content": msg.result or "",
                "cost_usd": msg.total_cost_usd or 0,
                "turns": msg.num_turns,
                "duration_ms": msg.duration_ms,
                "total_cost_usd": session.total_cost_usd,
                "total_turns": session.total_turns,
                "session_id": msg.session_id,
                "is_error": msg.is_error,
            }

        elif isinstance(msg, StreamEvent):
            # Partial streaming events - extract text deltas
            event_data = msg.event
            event_type = event_data.get("type", "")

            if event_type == "content_block_delta":
                delta = event_data.get("delta", {})
                delta_type = delta.get("type", "")

                if delta_type == "text_delta":
                    yield {"type": "text_delta", "content": delta.get("text", "")}
                elif delta_type == "thinking_delta":
                    yield {
                        "type": "thinking_delta",
                        "content": delta.get("thinking", ""),
                    }

    async def close_session(self, db: AsyncSession, session_id: str) -> bool:
        """Close a chat session (mark as closed in DB, remove from cache)."""
        from app.models.models import WorkspaceChatSession

        result = await db.execute(
            select(WorkspaceChatSession).where(WorkspaceChatSession.id == session_id)
        )
        db_session = result.scalar_one_or_none()
        if db_session:
            db_session.status = "closed"
            await db.commit()

        self.sessions.pop(session_id, None)
        logger.info(f"Chat session {session_id} closed")
        return True

    async def shutdown_all(self):
        """Shutdown all active chat sessions."""
        if not self.sessions:
            return
        count = len(self.sessions)
        self.sessions.clear()
        logger.info(f"Chat manager shutdown: cleared {count} session(s)")


# Singleton instance
chat_manager = ChatManager()

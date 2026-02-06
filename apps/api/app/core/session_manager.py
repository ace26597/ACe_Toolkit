"""
Unified Session Manager

Manages user sessions across all apps (CCResearch, Workspace, Analyst).
Each user has a single sessions directory with shared access across apps.

Directory Structure:
/data/users/{user-id}/sessions/
├── {session-id}/
│   ├── .session.json    # Metadata (title, created_by, tags, etc.)
│   ├── data/            # User files
│   ├── output/          # Generated outputs
│   ├── .claude/         # Claude Code config (permissions)
│   └── CLAUDE.md        # Session context for Claude
└── ...
"""

import json
import logging
import shutil
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any

from app.core.config import settings

logger = logging.getLogger("session_manager")


async def get_user_id_from_email(email: str) -> Optional[str]:
    """
    Look up user_id from email address.
    Returns None if user not found.
    """
    from app.core.database import AsyncSessionLocal
    from app.models.models import User
    from sqlalchemy import select

    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(User.id).where(User.email == email.lower())
            )
            user_id = result.scalar_one_or_none()
            if user_id:
                return str(user_id)
    except Exception as e:
        from app.core.security import mask_email
        logger.warning(f"Failed to look up user_id for {mask_email(email)}: {e}")
    return None


# Claude Code permissions for sessions
SESSION_PERMISSIONS = {
    "permissions": {
        "allow": [
            "Bash",
            "Read",
            "Write",
            "Edit",
            "WebFetch",
            "WebSearch",
            "Grep",
            "Glob"
        ],
        "deny": [
            # Block access to sensitive system files
            "Read(~/.ccresearch_allowed_emails.json)",
            "Read(~/.claude/CLAUDE.md)",
            "Read(~/dev/**)",
            "Write(~/dev/**)",
            "Edit(~/dev/**)",
            "Read(~/.bashrc)",
            "Read(~/.bash_history)",
            "Read(~/.ssh/**)",
            "Read(~/.gnupg/**)",
            "Read(~/.env)",
            "Read(~/.env.*)",
            "Read(~/.cloudflared/**)",
            "Read(/etc/cloudflared/**)",
            "Read(/etc/shadow)",
            "Read(/etc/passwd)",
            # Block dangerous commands
            "Bash(kill:*)",
            "Bash(pkill:*)",
            "Bash(systemctl:*)",
            "Bash(sudo:*)",
            "Bash(su:*)",
            "Bash(chmod:*)",
            "Bash(chown:*)",
            "Bash(dd:*)",
            "Bash(shutdown:*)",
            "Bash(reboot:*)",
            "Bash(docker:*)",
            "Bash(apt:*)",
            "Bash(dpkg:*)"
        ]
    },
    "hasClaudeMdExternalIncludesApproved": False,
    "hasClaudeMdExternalIncludesWarningShown": True
}


# Session metadata schema
class SessionMetadata:
    """Session metadata stored in .session.json"""

    def __init__(
        self,
        id: str,
        title: str,
        created_by: str,  # "ccresearch", "workspace", "analyst"
        created_at: str,
        last_accessed: Optional[str] = None,
        tags: Optional[List[str]] = None,
        terminal_enabled: bool = True,
        description: Optional[str] = None,
        # CCResearch specific
        email: Optional[str] = None,
        claude_session_id: Optional[str] = None,
        # Status
        status: str = "active",  # active, archived
    ):
        self.id = id
        self.title = title
        self.created_by = created_by
        self.created_at = created_at
        self.last_accessed = last_accessed or created_at
        self.tags = tags or []
        self.terminal_enabled = terminal_enabled
        self.description = description
        self.email = email
        self.claude_session_id = claude_session_id
        self.status = status

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "created_by": self.created_by,
            "created_at": self.created_at,
            "last_accessed": self.last_accessed,
            "tags": self.tags,
            "terminal_enabled": self.terminal_enabled,
            "description": self.description,
            "email": self.email,
            "claude_session_id": self.claude_session_id,
            "status": self.status,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SessionMetadata":
        return cls(**data)


class SessionManager:
    """Unified session manager for all apps"""

    def __init__(self):
        self.base_dir = Path(settings.USER_DATA_BASE_DIR)
        self.base_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"SessionManager initialized. Base: {self.base_dir}")

    def get_user_sessions_dir(self, user_id: str) -> Path:
        """Get the sessions directory for a user"""
        return self.base_dir / user_id / "sessions"

    def get_session_dir(self, user_id: str, session_id: str) -> Path:
        """Get directory for a specific session"""
        return self.get_user_sessions_dir(user_id) / session_id

    def create_session(
        self,
        user_id: str,
        title: str,
        created_by: str,
        email: Optional[str] = None,
        tags: Optional[List[str]] = None,
        description: Optional[str] = None,
        terminal_enabled: bool = True,
        session_id: Optional[str] = None,
    ) -> SessionMetadata:
        """
        Create a new session with workspace directory.

        Args:
            user_id: User UUID
            title: Session title
            created_by: App that created session ("ccresearch", "workspace", "analyst")
            email: User email (for CCResearch)
            tags: Optional tags
            description: Optional description
            terminal_enabled: Whether terminal access is enabled
            session_id: Optional specific session ID (otherwise generated)

        Returns:
            SessionMetadata object
        """
        session_id = session_id or str(uuid.uuid4())
        session_dir = self.get_session_dir(user_id, session_id)

        # Create directory structure
        session_dir.mkdir(parents=True, exist_ok=True)
        (session_dir / "data").mkdir(exist_ok=True)
        (session_dir / "output").mkdir(exist_ok=True)

        # Create .claude directory with permissions
        claude_dir = session_dir / ".claude"
        claude_dir.mkdir(exist_ok=True)
        (claude_dir / "settings.local.json").write_text(
            json.dumps(SESSION_PERMISSIONS, indent=2)
        )

        # Create metadata
        now = datetime.utcnow().isoformat()
        metadata = SessionMetadata(
            id=session_id,
            title=title,
            created_by=created_by,
            created_at=now,
            last_accessed=now,
            tags=tags,
            terminal_enabled=terminal_enabled,
            description=description,
            email=email,
        )

        # Write metadata
        self._write_metadata(session_dir, metadata)

        # Create CLAUDE.md
        self._write_claude_md(session_dir, metadata)

        logger.info(f"Created session {session_id} for user {user_id} via {created_by}")
        return metadata

    def get_session(self, user_id: str, session_id: str) -> Optional[SessionMetadata]:
        """Get session metadata"""
        session_dir = self.get_session_dir(user_id, session_id)
        if not session_dir.exists():
            return None
        return self._read_metadata(session_dir)

    def list_sessions(
        self,
        user_id: str,
        created_by: Optional[str] = None,
        status: Optional[str] = "active",
        tags: Optional[List[str]] = None,
    ) -> List[SessionMetadata]:
        """
        List all sessions for a user.

        Args:
            user_id: User UUID
            created_by: Filter by app (optional)
            status: Filter by status (default: "active")
            tags: Filter by tags (optional)

        Returns:
            List of SessionMetadata objects
        """
        sessions_dir = self.get_user_sessions_dir(user_id)
        if not sessions_dir.exists():
            return []

        sessions = []
        for item in sessions_dir.iterdir():
            if item.is_dir() and not item.name.startswith('.'):
                metadata = self._read_metadata(item)
                if metadata:
                    # Apply filters
                    if created_by and metadata.created_by != created_by:
                        continue
                    if status and metadata.status != status:
                        continue
                    if tags and not any(t in metadata.tags for t in tags):
                        continue
                    sessions.append(metadata)

        # Sort by last_accessed (most recent first)
        sessions.sort(key=lambda s: s.last_accessed or "", reverse=True)
        return sessions

    def update_session(
        self,
        user_id: str,
        session_id: str,
        title: Optional[str] = None,
        tags: Optional[List[str]] = None,
        description: Optional[str] = None,
        status: Optional[str] = None,
        claude_session_id: Optional[str] = None,
    ) -> Optional[SessionMetadata]:
        """Update session metadata"""
        session_dir = self.get_session_dir(user_id, session_id)
        metadata = self._read_metadata(session_dir)
        if not metadata:
            return None

        # Update fields
        if title is not None:
            metadata.title = title
        if tags is not None:
            metadata.tags = tags
        if description is not None:
            metadata.description = description
        if status is not None:
            metadata.status = status
        if claude_session_id is not None:
            metadata.claude_session_id = claude_session_id

        metadata.last_accessed = datetime.utcnow().isoformat()

        self._write_metadata(session_dir, metadata)
        logger.info(f"Updated session {session_id}")
        return metadata

    def touch_session(self, user_id: str, session_id: str):
        """Update last_accessed timestamp"""
        session_dir = self.get_session_dir(user_id, session_id)
        metadata = self._read_metadata(session_dir)
        if metadata:
            metadata.last_accessed = datetime.utcnow().isoformat()
            self._write_metadata(session_dir, metadata)

    def delete_session(self, user_id: str, session_id: str) -> bool:
        """Delete a session and its workspace"""
        session_dir = self.get_session_dir(user_id, session_id)
        if not session_dir.exists():
            return False

        try:
            shutil.rmtree(session_dir)
            logger.info(f"Deleted session {session_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete session {session_id}: {e}")
            return False

    def archive_session(self, user_id: str, session_id: str) -> bool:
        """Archive a session (soft delete)"""
        result = self.update_session(user_id, session_id, status="archived")
        return result is not None

    def list_files(
        self,
        user_id: str,
        session_id: str,
        path: str = "",
        include_hidden: bool = False,
    ) -> List[Dict[str, Any]]:
        """List files in session data directory"""
        session_dir = self.get_session_dir(user_id, session_id)
        data_dir = session_dir / "data"

        if path:
            target_dir = data_dir / path
        else:
            target_dir = data_dir

        if not target_dir.exists():
            return []

        files = []
        for item in target_dir.iterdir():
            if not include_hidden and item.name.startswith('.'):
                continue

            try:
                stat = item.stat()
                files.append({
                    "name": item.name,
                    "path": str(item.relative_to(data_dir)),
                    "is_dir": item.is_dir(),
                    "size": stat.st_size if item.is_file() else 0,
                    "modified_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                })
            except Exception as e:
                logger.warning(f"Error reading file {item}: {e}")

        # Sort: directories first, then by name
        files.sort(key=lambda x: (not x["is_dir"], x["name"].lower()))
        return files

    def get_file_path(self, user_id: str, session_id: str, path: str) -> Optional[Path]:
        """Get full path to a file in session data directory"""
        session_dir = self.get_session_dir(user_id, session_id)
        file_path = (session_dir / "data" / path).resolve()

        # Security check: ensure path is within session using relative_to
        try:
            file_path.relative_to(session_dir.resolve())
        except ValueError:
            return None
        # Reject symlinks pointing outside session
        if file_path.is_symlink():
            try:
                file_path.resolve().relative_to(session_dir.resolve())
            except ValueError:
                return None

        return file_path if file_path.exists() else None

    # Private methods

    def _read_metadata(self, session_dir: Path) -> Optional[SessionMetadata]:
        """Read metadata from .session.json"""
        metadata_path = session_dir / ".session.json"
        if not metadata_path.exists():
            # Try to create metadata from directory name (legacy support)
            return self._create_legacy_metadata(session_dir)

        try:
            data = json.loads(metadata_path.read_text())
            return SessionMetadata.from_dict(data)
        except Exception as e:
            logger.warning(f"Error reading metadata from {metadata_path}: {e}")
            return None

    def _write_metadata(self, session_dir: Path, metadata: SessionMetadata):
        """Write metadata to .session.json"""
        metadata_path = session_dir / ".session.json"
        metadata_path.write_text(json.dumps(metadata.to_dict(), indent=2))

    def _create_legacy_metadata(self, session_dir: Path) -> Optional[SessionMetadata]:
        """Create metadata for legacy sessions without .session.json"""
        try:
            stat = session_dir.stat()
            return SessionMetadata(
                id=session_dir.name,
                title=session_dir.name,
                created_by="unknown",
                created_at=datetime.fromtimestamp(stat.st_ctime).isoformat(),
                last_accessed=datetime.fromtimestamp(stat.st_mtime).isoformat(),
            )
        except Exception:
            return None

    def _write_claude_md(self, session_dir: Path, metadata: SessionMetadata):
        """Write CLAUDE.md for session context"""
        claude_md = f"""# Session: {metadata.title}

| Field | Value |
|-------|-------|
| Session ID | `{metadata.id}` |
| Created | {metadata.created_at} |
| Created By | {metadata.created_by} |
| Workspace | `{session_dir}` |

## Guidelines

1. **Be thorough** - Provide comprehensive answers with sources when possible
2. **Use tools** - Search the web, read files, and execute code to find accurate information
3. **Be concise** - Format responses clearly with headers, lists, and code blocks
4. **Cite sources** - When using web search, include relevant URLs

## Available Capabilities

- Web search and fetching
- File reading and analysis
- Code execution (Python, Bash)
- Scientific databases via MCP (PubMed, Clinical Trials, ChEMBL, etc.)

## Workspace Structure

```
{session_dir}/
├── .session.json      # Session metadata
├── data/              # User files
├── output/            # Generated outputs
├── .claude/           # Claude config
└── CLAUDE.md          # This file
```

---

*Unified Session - ACe Toolkit*
"""
        (session_dir / "CLAUDE.md").write_text(claude_md)


# Global instance
session_manager = SessionManager()

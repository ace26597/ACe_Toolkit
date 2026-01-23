"""
Data Studio Manager - Manages headless Claude Code sessions for data analysis.

Uses claude -p (print mode) with stream-json output for non-interactive analysis.
Each message spawns a new claude process but uses persistent session IDs.
"""

import asyncio
import hashlib
import json
import logging
import os
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import AsyncGenerator, Dict, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class DataStudioSession:
    """Represents a Data Studio session."""
    id: str
    user_id: str
    project_name: str
    project_dir: str
    claude_session_id: str  # Deterministic UUID for Claude --session-id
    created_at: datetime = field(default_factory=datetime.utcnow)
    last_activity: datetime = field(default_factory=datetime.utcnow)
    is_active: bool = True
    is_first_message: bool = True


class DataStudioManager:
    """
    Manages headless Claude Code sessions for Data Studio.

    Each message spawns a new claude -p process with --output-format stream-json.
    Session continuity is maintained via --session-id (same UUID per project).
    """

    def __init__(self):
        self.sessions: Dict[str, DataStudioSession] = {}

    def _get_project_dir(self, user_id: str, project_name: str) -> str:
        """Get the project directory path."""
        return f"/data/users/{user_id}/projects/{project_name}"

    def _generate_claude_session_id(self, user_id: str, project_name: str) -> str:
        """Generate a deterministic UUID for Claude session based on user+project."""
        # Create a deterministic UUID from user_id and project_name
        hash_input = f"data-studio:{user_id}:{project_name}"
        hash_bytes = hashlib.sha256(hash_input.encode()).digest()[:16]
        return str(uuid.UUID(bytes=hash_bytes))

    def _ensure_data_studio_structure(self, project_dir: str) -> None:
        """Create Data Studio directory structure if needed."""
        data_studio_dir = os.path.join(project_dir, ".data-studio")
        dirs = [
            data_studio_dir,
            os.path.join(data_studio_dir, "exports"),
        ]
        for d in dirs:
            os.makedirs(d, exist_ok=True)

        # Create CLAUDE.md in .data-studio/ (not project root to avoid conflicts)
        claude_md_path = os.path.join(data_studio_dir, "CLAUDE.md")
        if not os.path.exists(claude_md_path):
            self._create_claude_md(claude_md_path, project_dir)

    def _create_claude_md(self, path: str, project_dir: str) -> None:
        """Create CLAUDE.md with data analysis instructions."""
        content = '''# Data Studio Project

You are a data analysis assistant. Your role is to help analyze data files in this project.

## Available Data Files

Data files are located in the `data/` directory. Use the Read tool to examine them.

## Your Capabilities

- Read and analyze CSV, Excel, JSON, Parquet files
- Generate Python code for analysis using pandas, numpy, matplotlib, plotly
- Create visualizations and statistical summaries
- Clean, transform, and filter data
- Answer questions about patterns and anomalies

## Guidelines

1. **Always start by listing files**: Use `ls data/` to see available files
2. **Read before analyzing**: Use the Read tool to examine file contents
3. **Show your work**: Display sample data before transformations
4. **Be concise**: Summarize findings clearly
5. **Handle errors gracefully**: Report issues without failing

## Output Format

When creating visualizations, prefer Plotly for interactivity.
When showing tables, limit to 20 rows unless asked for more.
Always explain what the data shows in plain language.
'''
        with open(path, 'w') as f:
            f.write(content)
        logger.info(f"Created CLAUDE.md at {path}")

    def list_data_files(self, project_dir: str) -> List[Dict]:
        """
        List available data files in the entire project.

        Scans all directories except hidden ones (.claude, .data-studio, etc.)
        Returns only supported file types: csv, tsv, xlsx, xls, json, md
        """
        files = []

        if not os.path.exists(project_dir):
            return files

        # Only these extensions for Data Studio
        supported_extensions = {
            '.csv', '.tsv', '.xlsx', '.xls', '.json', '.jsonl', '.md'
        }

        # Directories to skip
        skip_dirs = {'.claude', '.data-studio', '.git', '__pycache__', 'node_modules', '.venv'}

        for root, dirs, filenames in os.walk(project_dir):
            # Skip hidden and system directories
            dirs[:] = [d for d in dirs if d not in skip_dirs and not d.startswith('.')]

            # Get relative path from project root
            rel_root = os.path.relpath(root, project_dir)
            if rel_root == '.':
                rel_root = ''

            for filename in filenames:
                # Skip hidden files
                if filename.startswith('.'):
                    continue

                ext = os.path.splitext(filename)[1].lower()
                if ext in supported_extensions:
                    full_path = os.path.join(root, filename)
                    rel_path = os.path.join(rel_root, filename) if rel_root else filename

                    try:
                        stat = os.stat(full_path)

                        # Determine folder for grouping
                        folder = rel_root.split('/')[0] if rel_root else 'root'

                        files.append({
                            "name": filename,
                            "path": rel_path,
                            "folder": folder,
                            "size": stat.st_size,
                            "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                            "type": ext[1:]  # Remove the dot
                        })
                    except OSError:
                        continue

        # Sort by folder then name
        return sorted(files, key=lambda x: (x['folder'], x['name']))

    async def create_session(
        self,
        user_id: str,
        project_name: str,
        session_id: Optional[str] = None
    ) -> DataStudioSession:
        """Create a new Data Studio session."""
        if session_id is None:
            session_id = f"ds-{uuid.uuid4().hex[:8]}"

        project_dir = self._get_project_dir(user_id, project_name)

        # Ensure project exists
        if not os.path.exists(project_dir):
            raise ValueError(f"Project not found: {project_name}")

        # Create Data Studio structure
        self._ensure_data_studio_structure(project_dir)

        # Generate deterministic Claude session ID for this user+project
        claude_session_id = self._generate_claude_session_id(user_id, project_name)

        session = DataStudioSession(
            id=session_id,
            user_id=user_id,
            project_name=project_name,
            project_dir=project_dir,
            claude_session_id=claude_session_id,
        )

        self.sessions[session_id] = session
        logger.info(f"Created Data Studio session {session_id} for project {project_name}")
        logger.info(f"Claude session ID: {claude_session_id}")

        return session

    async def send_message(self, session_id: str, message: str) -> None:
        """
        Prepare to send a message. Actual execution happens in stream_output.
        """
        session = self.sessions.get(session_id)
        if not session:
            raise ValueError(f"Session not found: {session_id}")

        session.last_activity = datetime.utcnow()
        # Store the pending message for stream_output to process
        session._pending_message = message

    async def stream_output(
        self,
        session_id: str
    ) -> AsyncGenerator[Dict, None]:
        """
        Execute Claude and stream the output.

        Spawns: claude -p "message" --output-format stream-json --session-id {uuid}
        Or for continuation: claude -p "message" --resume {uuid} --output-format stream-json
        """
        session = self.sessions.get(session_id)
        if not session:
            raise ValueError(f"Session not found: {session_id}")

        message = getattr(session, '_pending_message', None)
        if not message:
            yield {"type": "error", "message": "No message to process"}
            return

        # Build command
        cmd = ["claude", "-p", message, "--output-format", "stream-json"]

        if session.is_first_message:
            # First message: use --session-id to create new session
            cmd.extend(["--session-id", session.claude_session_id])
            session.is_first_message = False
        else:
            # Subsequent messages: use --resume to continue session
            cmd.extend(["--resume", session.claude_session_id])

        # Add permission mode
        cmd.extend(["--permission-mode", "bypassPermissions"])

        logger.info(f"Executing: {' '.join(cmd[:6])}...")  # Log truncated command
        logger.info(f"Working directory: {session.project_dir}")

        try:
            # Spawn process
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=session.project_dir,
            )

            # Stream stdout
            if process.stdout:
                async for line in process.stdout:
                    line_str = line.decode().strip()
                    if not line_str:
                        continue

                    event = self._parse_output_line(line_str)
                    if event:
                        yield event

            # Wait for process to complete
            await process.wait()

            # Check for errors
            if process.returncode != 0 and process.stderr:
                stderr = await process.stderr.read()
                if stderr:
                    error_msg = stderr.decode().strip()
                    logger.error(f"Claude error: {error_msg}")
                    yield {"type": "error", "message": error_msg[:500]}

            yield {"type": "done"}

        except asyncio.CancelledError:
            logger.info(f"Output streaming cancelled for session {session_id}")
            raise
        except Exception as e:
            logger.error(f"Error in stream_output for session {session_id}: {e}")
            yield {"type": "error", "message": str(e)}

    def _parse_output_line(self, line: str) -> Optional[Dict]:
        """Parse a line of Claude's stream-json output."""
        try:
            data = json.loads(line)
        except json.JSONDecodeError:
            # Plain text output
            return {"type": "text", "content": line}

        msg_type = data.get("type")

        # Handle different message types from Claude's stream-json output
        if msg_type == "assistant":
            message = data.get("message", {})
            content_blocks = message.get("content", [])

            for block in content_blocks:
                block_type = block.get("type")
                if block_type == "text":
                    return {"type": "text", "content": block.get("text", "")}
                elif block_type == "tool_use":
                    return {
                        "type": "tool_call",
                        "id": block.get("id"),
                        "tool": block.get("name"),
                        "input": block.get("input", {}),
                        "status": "running"
                    }

        elif msg_type == "content_block_start":
            block = data.get("content_block", {})
            if block.get("type") == "tool_use":
                return {
                    "type": "tool_call",
                    "id": block.get("id"),
                    "tool": block.get("name"),
                    "input": {},
                    "status": "starting"
                }
            elif block.get("type") == "text":
                return None  # Wait for delta

        elif msg_type == "content_block_delta":
            delta = data.get("delta", {})
            if delta.get("type") == "text_delta":
                return {"type": "text_delta", "content": delta.get("text", "")}
            elif delta.get("type") == "input_json_delta":
                return {"type": "input_delta", "content": delta.get("partial_json", "")}

        elif msg_type == "content_block_stop":
            return None  # Block finished

        elif msg_type == "message_start":
            return {"type": "thinking", "content": "Processing..."}

        elif msg_type == "message_delta":
            # Contains stop_reason, usage, etc.
            return None

        elif msg_type == "message_stop":
            return None  # Will send done after

        elif msg_type == "result":
            # Final result
            result = data.get("result", "")
            if result:
                return {"type": "text", "content": result}
            return None

        elif msg_type == "error":
            return {"type": "error", "message": data.get("error", {}).get("message", "Unknown error")}

        elif msg_type == "system":
            # System messages (e.g., session info)
            return {"type": "thinking", "content": data.get("message", "")}

        # Unknown type - log and skip
        logger.debug(f"Unknown message type: {msg_type}")
        return None

    async def close_session(self, session_id: str) -> bool:
        """Close a Data Studio session."""
        session = self.sessions.get(session_id)
        if not session:
            return False

        session.is_active = False
        del self.sessions[session_id]
        logger.info(f"Closed Data Studio session {session_id}")
        return True

    def get_session(self, session_id: str) -> Optional[DataStudioSession]:
        """Get a session by ID."""
        return self.sessions.get(session_id)

    def list_sessions(self, user_id: str) -> List[Dict]:
        """List all active sessions for a user."""
        return [
            {
                "id": s.id,
                "project_name": s.project_name,
                "created_at": s.created_at.isoformat(),
                "last_activity": s.last_activity.isoformat(),
                "is_active": s.is_active
            }
            for s in self.sessions.values()
            if s.user_id == user_id
        ]


# Global instance
data_studio_manager = DataStudioManager()

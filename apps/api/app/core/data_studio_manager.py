"""
Data Studio Manager - Manages headless Claude Code sessions for data analysis.

Uses claude -p (print mode) with stream-json for non-interactive analysis.
"""

import asyncio
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
    """Represents a Data Studio session with a Claude process."""
    id: str
    user_id: str
    project_name: str
    project_dir: str
    data_studio_dir: str
    process: Optional[asyncio.subprocess.Process] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    last_activity: datetime = field(default_factory=datetime.utcnow)
    is_active: bool = True
    message_queue: asyncio.Queue = field(default_factory=asyncio.Queue)


class DataStudioManager:
    """
    Manages headless Claude Code sessions for Data Studio.

    Each session spawns a claude -p process with streaming JSON I/O.
    """

    def __init__(self):
        self.sessions: Dict[str, DataStudioSession] = {}
        self._output_tasks: Dict[str, asyncio.Task] = {}

    def _get_project_dir(self, user_id: str, project_name: str) -> str:
        """Get the project directory path."""
        return f"/data/users/{user_id}/projects/{project_name}"

    def _get_data_studio_dir(self, project_dir: str) -> str:
        """Get the Data Studio subdirectory path."""
        return os.path.join(project_dir, ".data-studio")

    def _ensure_data_studio_structure(self, data_studio_dir: str) -> None:
        """Create Data Studio directory structure if it doesn't exist."""
        dirs = [
            data_studio_dir,
            os.path.join(data_studio_dir, "dashboards"),
            os.path.join(data_studio_dir, "exports"),
            os.path.join(data_studio_dir, ".claude"),
        ]
        for d in dirs:
            os.makedirs(d, exist_ok=True)

        # Create Data Studio CLAUDE.md if it doesn't exist
        claude_md_path = os.path.join(data_studio_dir, "CLAUDE.md")
        if not os.path.exists(claude_md_path):
            self._create_data_studio_claude_md(claude_md_path)

    def _create_data_studio_claude_md(self, path: str) -> None:
        """Create the Data Studio specific CLAUDE.md."""
        content = '''# Data Studio Assistant

You are a data analysis assistant in C3 Data Studio. Your role is to help users
explore, analyze, and visualize their data files.

## Your Capabilities

- Read and analyze CSV, Excel, JSON, Parquet, and other data files
- Generate Python code for data analysis using pandas, polars, numpy
- Create visualizations using matplotlib, plotly, seaborn
- Perform statistical analysis and generate insights
- Clean, transform, and filter data
- Answer questions about data patterns and anomalies

## Output Guidelines

### For Visualizations
When creating charts, prefer Plotly for interactivity. Output the chart and explain what it shows.

### For Tables
When showing data, limit to first 100 rows unless asked for more. Always show column types and null counts.

### For Analysis
1. First understand the data structure (shape, columns, types)
2. Check for missing values and data quality issues
3. Provide statistical summaries where relevant
4. Generate visualizations to support insights
5. Explain findings in plain language

## Working Directory

- User data files: `../data/` (relative to this directory)
- Your outputs: `./exports/`
- Project root: `../`

## Best Practices

1. Always start by reading and understanding the data
2. Handle missing data gracefully (don't fail, report and continue)
3. Use clear variable names in generated code
4. Show sample data before complex transformations
5. Ask clarifying questions if the request is ambiguous
6. Provide actionable insights, not just numbers

## Example Interactions

User: "Analyze this CSV"
You: Read the file, show shape/columns/types, basic stats, identify patterns, suggest visualizations.

User: "Show me trends over time"
You: Identify date columns, aggregate appropriately, create line chart, explain trends.

User: "Find outliers"
You: Use statistical methods (IQR, z-score), visualize with box plots, list specific outliers.
'''
        with open(path, 'w') as f:
            f.write(content)
        logger.info(f"Created Data Studio CLAUDE.md at {path}")

    def list_data_files(self, project_dir: str) -> List[Dict]:
        """List available data files in the project."""
        data_dir = os.path.join(project_dir, "data")
        files = []

        if not os.path.exists(data_dir):
            return files

        data_extensions = {
            '.csv', '.tsv', '.xlsx', '.xls', '.json', '.jsonl',
            '.parquet', '.feather', '.pickle', '.pkl', '.h5', '.hdf5'
        }

        for root, _, filenames in os.walk(data_dir):
            for filename in filenames:
                ext = os.path.splitext(filename)[1].lower()
                if ext in data_extensions:
                    full_path = os.path.join(root, filename)
                    rel_path = os.path.relpath(full_path, project_dir)
                    stat = os.stat(full_path)
                    files.append({
                        "name": filename,
                        "path": rel_path,
                        "size": stat.st_size,
                        "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                        "type": ext[1:]  # Remove the dot
                    })

        return sorted(files, key=lambda x: x['name'])

    async def create_session(
        self,
        user_id: str,
        project_name: str,
        session_id: Optional[str] = None
    ) -> DataStudioSession:
        """
        Create a new Data Studio session.

        Spawns a claude -p process with streaming JSON I/O.
        """
        if session_id is None:
            session_id = f"ds-{uuid.uuid4().hex[:8]}"

        project_dir = self._get_project_dir(user_id, project_name)
        data_studio_dir = self._get_data_studio_dir(project_dir)

        # Ensure project exists
        if not os.path.exists(project_dir):
            raise ValueError(f"Project not found: {project_name}")

        # Create Data Studio structure
        self._ensure_data_studio_structure(data_studio_dir)

        # Create session object first (process started on first message)
        session = DataStudioSession(
            id=session_id,
            user_id=user_id,
            project_name=project_name,
            project_dir=project_dir,
            data_studio_dir=data_studio_dir,
        )

        self.sessions[session_id] = session
        logger.info(f"Created Data Studio session {session_id} for project {project_name}")

        return session

    async def _start_claude_process(self, session: DataStudioSession) -> None:
        """Start the Claude process for a session."""
        if session.process is not None:
            return

        # Build command
        cmd = [
            "claude",
            "-p",  # Print mode (non-interactive)
            "--output-format", "stream-json",
            "--input-format", "stream-json",
            "--session-id", session.id,
            "--permission-mode", "bypassPermissions",
        ]

        logger.info(f"Starting Claude process: {' '.join(cmd)}")
        logger.info(f"Working directory: {session.data_studio_dir}")

        # Spawn process
        session.process = await asyncio.create_subprocess_exec(
            *cmd,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=session.data_studio_dir,
        )

        logger.info(f"Claude process started with PID {session.process.pid}")

    async def send_message(self, session_id: str, message: str) -> None:
        """
        Send a message to the Claude process.

        For stream-json input format, we send JSON objects.
        """
        session = self.sessions.get(session_id)
        if not session:
            raise ValueError(f"Session not found: {session_id}")

        # Start process if not running
        if session.process is None:
            await self._start_claude_process(session)

        if session.process.stdin is None:
            raise RuntimeError("Process stdin is not available")

        # Format message for stream-json input
        # The input format expects JSON with the user message
        input_data = {
            "type": "user",
            "message": message
        }

        line = json.dumps(input_data) + "\n"
        session.process.stdin.write(line.encode())
        await session.process.stdin.drain()

        session.last_activity = datetime.utcnow()
        logger.debug(f"Sent message to session {session_id}: {message[:100]}...")

    async def stream_output(
        self,
        session_id: str
    ) -> AsyncGenerator[Dict, None]:
        """
        Stream parsed output events from Claude.

        Yields structured events for the frontend.
        """
        session = self.sessions.get(session_id)
        if not session:
            raise ValueError(f"Session not found: {session_id}")

        if session.process is None:
            await self._start_claude_process(session)

        if session.process.stdout is None:
            raise RuntimeError("Process stdout is not available")

        try:
            async for line in session.process.stdout:
                line_str = line.decode().strip()
                if not line_str:
                    continue

                event = self._parse_output_line(line_str)
                if event:
                    yield event

                    # Check for completion
                    if event.get("type") == "result":
                        yield {"type": "done"}
                        break

        except asyncio.CancelledError:
            logger.info(f"Output streaming cancelled for session {session_id}")
            raise
        except Exception as e:
            logger.error(f"Error streaming output for session {session_id}: {e}")
            yield {"type": "error", "message": str(e)}

    def _parse_output_line(self, line: str) -> Optional[Dict]:
        """
        Parse a line of Claude's stream-json output.

        Transforms Claude's format into frontend-friendly events.
        """
        try:
            data = json.loads(line)
        except json.JSONDecodeError:
            # Plain text output
            return {"type": "text", "content": line}

        msg_type = data.get("type")

        if msg_type == "assistant":
            # Assistant message - may contain text, tool use, etc.
            message = data.get("message", {})
            content_blocks = message.get("content", [])

            events = []
            for block in content_blocks:
                block_type = block.get("type")

                if block_type == "text":
                    text = block.get("text", "")
                    # Check for code blocks
                    if "```" in text:
                        return self._parse_text_with_code(text)
                    return {"type": "text", "content": text}

                elif block_type == "tool_use":
                    return {
                        "type": "tool_call",
                        "id": block.get("id"),
                        "tool": block.get("name"),
                        "input": block.get("input", {}),
                        "status": "running"
                    }

            # Fallback
            return {"type": "assistant", "data": data}

        elif msg_type == "tool_use":
            return {
                "type": "tool_call",
                "id": data.get("id"),
                "tool": data.get("name"),
                "input": data.get("input", {}),
                "status": "running"
            }

        elif msg_type == "tool_result":
            content = data.get("content", "")
            return {
                "type": "tool_result",
                "tool_use_id": data.get("tool_use_id"),
                "content": content[:5000] if len(content) > 5000 else content,
                "truncated": len(content) > 5000
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
            return None

        elif msg_type == "content_block_delta":
            delta = data.get("delta", {})
            if delta.get("type") == "text_delta":
                return {"type": "text_delta", "content": delta.get("text", "")}
            elif delta.get("type") == "input_json_delta":
                return {"type": "input_delta", "content": delta.get("partial_json", "")}
            return None

        elif msg_type == "message_stop" or msg_type == "result":
            return {"type": "done"}

        elif msg_type == "error":
            return {"type": "error", "message": data.get("error", {}).get("message", "Unknown error")}

        # Unknown type - pass through
        return {"type": "raw", "data": data}

    def _parse_text_with_code(self, text: str) -> Dict:
        """Parse text that may contain code blocks."""
        import re

        # Find code blocks
        code_pattern = r'```(\w+)?\n(.*?)```'
        matches = list(re.finditer(code_pattern, text, re.DOTALL))

        if not matches:
            return {"type": "text", "content": text}

        # For now, return the first code block found
        match = matches[0]
        language = match.group(1) or "python"
        code = match.group(2).strip()

        # Get text before and after
        before = text[:match.start()].strip()
        after = text[match.end():].strip()

        return {
            "type": "code",
            "language": language,
            "content": code,
            "context_before": before,
            "context_after": after
        }

    async def close_session(self, session_id: str) -> bool:
        """Close a Data Studio session and cleanup."""
        session = self.sessions.get(session_id)
        if not session:
            return False

        session.is_active = False

        # Cancel output task if running
        if session_id in self._output_tasks:
            self._output_tasks[session_id].cancel()
            del self._output_tasks[session_id]

        # Terminate process
        if session.process:
            try:
                session.process.terminate()
                await asyncio.wait_for(session.process.wait(), timeout=5.0)
            except asyncio.TimeoutError:
                session.process.kill()
            except Exception as e:
                logger.error(f"Error closing session {session_id}: {e}")

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

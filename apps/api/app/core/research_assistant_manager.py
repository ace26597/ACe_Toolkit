"""
Research Assistant Manager - Claude Code Headless Mode

Manages Claude Code CLI in headless mode for QA-style research sessions.
Uses `claude -p` with --output-format stream-json for streaming output.

Key Features:
- Claude Code headless execution (no PTY)
- Streaming JSON output for real-time UI updates
- Session continuation via --resume
- File upload handling
- Per-user workspace isolation
"""

import asyncio
import json
import logging
import shutil
import uuid
from datetime import datetime
from pathlib import Path
from typing import AsyncGenerator, Optional, List, Dict, Any

from app.core.config import settings

logger = logging.getLogger("research_assistant_manager")

# Permissions template for Research Assistant sessions
# Similar to CCResearch but tailored for headless mode
RESEARCH_ASSISTANT_PERMISSIONS = {
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
            # Block access to sensitive files
            "Read(/home/ace/.ccresearch_allowed_emails.json)",
            "Read(/home/ace/.claude/CLAUDE.md)",
            "Read(/home/ace/dev/**)",
            "Write(/home/ace/dev/**)",
            "Edit(/home/ace/dev/**)",
            "Read(/home/ace/.bashrc)",
            "Read(/home/ace/.bash_history)",
            "Read(/home/ace/.ssh/**)",
            "Read(/home/ace/.gnupg/**)",
            "Read(/home/ace/.env)",
            "Read(/home/ace/.env.*)",
            "Read(/home/ace/.cloudflared/**)",
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

# CLAUDE.md template for Research Assistant workspaces
CLAUDE_MD_TEMPLATE = """# Research Assistant Session

You are a research assistant helping the user explore topics, analyze files, and answer questions.

## Session Info

| Field | Value |
|-------|-------|
| Session ID | `{session_id}` |
| Created | {created_at} |
| Workspace | `{workspace_dir}` |

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
{workspace_dir}/
├── CLAUDE.md          # This file
├── data/              # Uploaded files
└── output/            # Save results here
```

{uploaded_files_section}

---

*Research Assistant - Claude Code Headless Mode*
"""

UPLOADED_FILES_SECTION = """
## Uploaded Files

The user has uploaded the following files to `data/`:

{file_list}

**Read these files** to understand the available data before answering questions.
"""


class ResearchAssistantManager:
    """Manages Claude Code headless sessions for research"""

    def __init__(self):
        # Base directory for research workspaces
        self.BASE_DIR = Path(settings.USER_DATA_BASE_DIR)
        self.BASE_DIR.mkdir(parents=True, exist_ok=True)
        logger.info(f"ResearchAssistantManager initialized. Base: {self.BASE_DIR}")

    def get_workspace_dir(self, user_id: str, session_id: str) -> Path:
        """Get workspace directory for a session"""
        return self.BASE_DIR / user_id / "research" / session_id

    def create_workspace(
        self,
        user_id: str,
        session_id: str,
        uploaded_files: Optional[List[str]] = None
    ) -> Path:
        """
        Create workspace directory with isolated Claude config.

        Args:
            user_id: User UUID
            session_id: Session UUID
            uploaded_files: List of uploaded filenames

        Returns:
            Path to workspace directory
        """
        workspace = self.get_workspace_dir(user_id, session_id)
        workspace.mkdir(parents=True, exist_ok=True)

        # Create directory structure
        (workspace / "data").mkdir(exist_ok=True)
        (workspace / "output").mkdir(exist_ok=True)

        # Build uploaded files section
        uploaded_files_section = ""
        if uploaded_files:
            file_list = "\n".join([f"- `data/{f}`" for f in uploaded_files])
            uploaded_files_section = UPLOADED_FILES_SECTION.format(file_list=file_list)

        # Write CLAUDE.md
        claude_md = CLAUDE_MD_TEMPLATE.format(
            session_id=session_id,
            created_at=datetime.utcnow().isoformat(),
            workspace_dir=str(workspace),
            uploaded_files_section=uploaded_files_section
        )
        (workspace / "CLAUDE.md").write_text(claude_md)

        # Create .claude directory with permissions
        claude_dir = workspace / ".claude"
        claude_dir.mkdir(exist_ok=True)
        (claude_dir / "settings.local.json").write_text(
            json.dumps(RESEARCH_ASSISTANT_PERMISSIONS, indent=2)
        )

        logger.info(f"Created workspace: {workspace}")
        return workspace

    def update_workspace_files(
        self,
        workspace_dir: Path,
        session_id: str,
        uploaded_files: List[str]
    ):
        """Update CLAUDE.md with uploaded file information"""
        uploaded_files_section = ""
        if uploaded_files:
            file_list = "\n".join([f"- `data/{f}`" for f in uploaded_files])
            uploaded_files_section = UPLOADED_FILES_SECTION.format(file_list=file_list)

        claude_md = CLAUDE_MD_TEMPLATE.format(
            session_id=session_id,
            created_at=datetime.utcnow().isoformat(),
            workspace_dir=str(workspace_dir),
            uploaded_files_section=uploaded_files_section
        )
        (workspace_dir / "CLAUDE.md").write_text(claude_md)
        logger.info(f"Updated CLAUDE.md with {len(uploaded_files)} files")

    async def run_query(
        self,
        workspace_dir: Path,
        prompt: str,
        claude_session_id: Optional[str] = None,
        response_format: str = "markdown"
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Execute a query using Claude Code headless mode.

        Args:
            workspace_dir: Workspace directory
            prompt: User's question/prompt
            claude_session_id: Previous session ID for --resume
            response_format: markdown, plain, or json

        Yields:
            Stream events: thinking, tool_use, tool_result, text, complete, error
        """
        # Build command
        cmd = [
            "claude",
            "-p", prompt,
            "--verbose",
            "--output-format", "stream-json"
        ]

        # Resume previous session if available
        if claude_session_id:
            cmd.extend(["--resume", claude_session_id])

        # Add system prompt for response format
        format_instruction = {
            "markdown": "Format your response using Markdown with headers, lists, and code blocks where appropriate.",
            "plain": "Format your response as plain text without Markdown formatting.",
            "json": "Format your response as valid JSON."
        }.get(response_format, "")

        if format_instruction:
            cmd.extend(["--append-system-prompt", format_instruction])

        logger.info(f"Running claude command in {workspace_dir}")
        logger.debug(f"Command: {' '.join(cmd)}")

        try:
            # Start process
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(workspace_dir)
            )

            # Variables to accumulate response
            full_response = ""
            session_id = None
            tool_calls = []
            thinking_blocks = []
            input_tokens = 0
            output_tokens = 0

            # Read stdout line by line (stream-json outputs one JSON per line)
            async for line in process.stdout:
                line = line.decode('utf-8', errors='replace').strip()
                if not line:
                    continue

                try:
                    event = json.loads(line)
                    event_type = event.get("type", "")

                    # Handle different event types
                    if event_type == "system":
                        # System info with session_id
                        session_id = event.get("session_id")
                        yield {"type": "system", "session_id": session_id}

                    elif event_type == "assistant":
                        # Message content
                        message = event.get("message", {})
                        content = message.get("content", [])

                        for block in content:
                            block_type = block.get("type", "")

                            if block_type == "thinking":
                                thinking_text = block.get("thinking", "")
                                thinking_blocks.append(thinking_text)
                                yield {"type": "thinking", "content": thinking_text}

                            elif block_type == "text":
                                text = block.get("text", "")
                                full_response += text
                                yield {"type": "text", "content": text}

                            elif block_type == "tool_use":
                                tool_name = block.get("name", "")
                                tool_input = block.get("input", {})
                                tool_calls.append({
                                    "id": block.get("id"),
                                    "name": tool_name,
                                    "input": tool_input
                                })
                                yield {
                                    "type": "tool_use",
                                    "name": tool_name,
                                    "input": tool_input
                                }

                        # Extract usage info
                        usage = message.get("usage", {})
                        if usage:
                            input_tokens = usage.get("input_tokens", input_tokens)
                            output_tokens = usage.get("output_tokens", output_tokens)

                    elif event_type == "result":
                        # Tool result
                        yield {
                            "type": "tool_result",
                            "tool_use_id": event.get("tool_use_id"),
                            "content": event.get("content", ""),
                            "is_error": event.get("is_error", False)
                        }

                    elif event_type == "error":
                        yield {
                            "type": "error",
                            "error": event.get("error", {}).get("message", "Unknown error")
                        }

                except json.JSONDecodeError:
                    # Non-JSON output (shouldn't happen with stream-json)
                    logger.warning(f"Non-JSON output: {line[:100]}")
                    continue

            # Wait for process to complete
            await process.wait()

            # Read stderr for any errors
            stderr = await process.stderr.read()
            if stderr and process.returncode != 0:
                error_msg = stderr.decode('utf-8', errors='replace')
                logger.error(f"Claude process error: {error_msg}")
                yield {"type": "error", "error": error_msg}
            else:
                # Send complete event
                yield {
                    "type": "complete",
                    "response": full_response,
                    "session_id": session_id,
                    "tool_calls": tool_calls,
                    "thinking": thinking_blocks,
                    "usage": {
                        "input_tokens": input_tokens,
                        "output_tokens": output_tokens
                    }
                }

        except Exception as e:
            logger.exception(f"Error running query: {e}")
            yield {"type": "error", "error": str(e)}

    def delete_workspace(self, workspace_dir: Path) -> bool:
        """Delete workspace directory"""
        try:
            if workspace_dir.exists() and workspace_dir.is_dir():
                # Safety check
                if str(workspace_dir).startswith(str(self.BASE_DIR)):
                    shutil.rmtree(workspace_dir)
                    logger.info(f"Deleted workspace: {workspace_dir}")
                    return True
            return False
        except Exception as e:
            logger.error(f"Failed to delete workspace: {e}")
            return False

    def list_workspace_files(self, workspace_dir: Path) -> List[Dict[str, Any]]:
        """List files in workspace data directory"""
        data_dir = workspace_dir / "data"
        files = []

        if data_dir.exists():
            for item in data_dir.iterdir():
                try:
                    stat = item.stat()
                    files.append({
                        "name": item.name,
                        "path": str(item.relative_to(workspace_dir)),
                        "is_dir": item.is_dir(),
                        "size": stat.st_size if item.is_file() else 0,
                        "modified_at": datetime.fromtimestamp(stat.st_mtime).isoformat()
                    })
                except Exception as e:
                    logger.warning(f"Error reading file {item}: {e}")

        return sorted(files, key=lambda x: (not x["is_dir"], x["name"].lower()))


# Global instance
research_assistant_manager = ResearchAssistantManager()

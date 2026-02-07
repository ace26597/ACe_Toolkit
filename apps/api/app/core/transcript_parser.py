"""
Session Transcript Parser

Parses Claude Code JSONL session files and terminal logs into structured
markdown transcripts for viewing and sharing.

The JSONL format contains these message types:
- user: User messages (text prompts and tool_result blocks)
- assistant: Claude responses (text, thinking, tool_use blocks)
- system: System events (hook results, stop reasons)
- progress: Tool execution progress
- file-history-snapshot: File version tracking
- summary: Session summary
- queue-operation: Queue state changes

This parser extracts the conversational flow (user prompts, assistant
responses, tool calls and results) into readable markdown.
"""

import json
import logging
import re
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any

logger = logging.getLogger("transcript_parser")


def _extract_text_content(content: Any) -> str:
    """Extract text from a message content field.

    Content can be:
    - A string (plain text)
    - A list of content blocks (text, tool_use, tool_result, thinking)
    """
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        texts = []
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                texts.append(block.get("text", ""))
        return "\n".join(texts)
    return ""


def _extract_tool_uses(content: Any) -> List[Dict[str, Any]]:
    """Extract tool_use blocks from assistant message content."""
    tools = []
    if isinstance(content, list):
        for block in content:
            if isinstance(block, dict) and block.get("type") == "tool_use":
                tools.append({
                    "id": block.get("id", ""),
                    "name": block.get("name", ""),
                    "input": block.get("input", {}),
                })
    return tools


def _extract_tool_results(content: Any) -> List[Dict[str, Any]]:
    """Extract tool_result blocks from user message content."""
    results = []
    if isinstance(content, list):
        for block in content:
            if isinstance(block, dict) and block.get("type") == "tool_result":
                result_content = block.get("content", "")
                if isinstance(result_content, list):
                    # Extract text from content blocks
                    texts = []
                    for rc in result_content:
                        if isinstance(rc, dict) and rc.get("type") == "text":
                            texts.append(rc.get("text", ""))
                    result_content = "\n".join(texts)
                results.append({
                    "tool_use_id": block.get("tool_use_id", ""),
                    "content": result_content,
                    "is_error": block.get("is_error", False),
                })
    return results


def _format_tool_input(name: str, input_data: dict) -> str:
    """Format tool input for display based on tool type."""
    if name == "Bash":
        cmd = input_data.get("command", "")
        desc = input_data.get("description", "")
        result = f"```bash\n{cmd}\n```"
        if desc:
            result = f"*{desc}*\n{result}"
        return result
    elif name in ("Read", "Glob", "Grep"):
        return f"```json\n{json.dumps(input_data, indent=2)}\n```"
    elif name in ("Write", "Edit"):
        path = input_data.get("file_path", input_data.get("path", ""))
        if name == "Edit":
            old = input_data.get("old_string", "")
            new = input_data.get("new_string", "")
            return f"**File:** `{path}`\n```diff\n- {old[:200]}\n+ {new[:200]}\n```"
        else:
            content = input_data.get("content", "")
            return f"**File:** `{path}`\n```\n{content[:500]}{'...' if len(content) > 500 else ''}\n```"
    else:
        # Generic tool
        return f"```json\n{json.dumps(input_data, indent=2)[:500]}\n```"


def _truncate_output(text: str, max_lines: int = 30) -> str:
    """Truncate long output, keeping first and last lines."""
    lines = text.split("\n")
    if len(lines) <= max_lines:
        return text
    head = lines[:max_lines // 2]
    tail = lines[-(max_lines // 2):]
    omitted = len(lines) - len(head) - len(tail)
    return "\n".join(head) + f"\n\n... ({omitted} lines omitted) ...\n\n" + "\n".join(tail)


def parse_jsonl_to_transcript(jsonl_path: Path) -> str:
    """Parse a Claude Code JSONL session file into markdown transcript.

    Args:
        jsonl_path: Path to the .jsonl file

    Returns:
        Markdown-formatted transcript
    """
    if not jsonl_path.exists():
        return ""

    messages = []
    tool_results_map: Dict[str, Dict] = {}  # tool_use_id -> result
    session_summary = ""

    try:
        with open(jsonl_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    data = json.loads(line)
                except json.JSONDecodeError:
                    continue

                msg_type = data.get("type")
                timestamp = data.get("timestamp", "")

                if msg_type == "user":
                    msg = data.get("message", {})
                    content = msg.get("content", "")

                    # Check for tool results (these follow tool_use in conversation)
                    tool_results = _extract_tool_results(content)
                    if tool_results:
                        for tr in tool_results:
                            tool_results_map[tr["tool_use_id"]] = tr
                        continue  # Don't add as a separate user message

                    # Regular user message
                    text = _extract_text_content(content)
                    if text.strip():
                        messages.append({
                            "role": "user",
                            "text": text,
                            "timestamp": timestamp,
                            "tools": [],
                        })

                elif msg_type == "assistant":
                    msg = data.get("message", {})
                    content = msg.get("content", [])

                    text = _extract_text_content(content)
                    tool_uses = _extract_tool_uses(content)

                    if text.strip() or tool_uses:
                        messages.append({
                            "role": "assistant",
                            "text": text,
                            "timestamp": timestamp,
                            "tools": tool_uses,
                            "model": msg.get("model", ""),
                            "usage": msg.get("usage", {}),
                        })

                elif msg_type == "summary":
                    session_summary = data.get("summary", "")

    except Exception as e:
        logger.error(f"Error parsing JSONL file {jsonl_path}: {e}")
        return f"Error parsing session file: {e}"

    # Build markdown transcript
    md_parts = []
    md_parts.append("# Session Transcript\n")

    if session_summary:
        md_parts.append(f"**Summary:** {session_summary}\n")

    md_parts.append(f"**Messages:** {len(messages)}\n")
    md_parts.append("---\n")

    interaction_num = 0
    for msg in messages:
        ts = msg.get("timestamp", "")
        if ts:
            try:
                dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                ts_display = dt.strftime("%H:%M:%S")
            except (ValueError, TypeError):
                ts_display = ts[:19]
        else:
            ts_display = ""

        if msg["role"] == "user":
            interaction_num += 1
            md_parts.append(f"\n## [{interaction_num}] User ({ts_display})\n")
            md_parts.append(msg["text"])
            md_parts.append("")

        elif msg["role"] == "assistant":
            md_parts.append(f"\n### Claude ({ts_display})\n")
            if msg["text"]:
                md_parts.append(msg["text"])
                md_parts.append("")

            # Tool calls
            for tool in msg.get("tools", []):
                tool_name = tool["name"]
                tool_id = tool["id"]
                tool_input = tool.get("input", {})

                md_parts.append(f"\n<details><summary>Tool: {tool_name}</summary>\n")
                md_parts.append(_format_tool_input(tool_name, tool_input))

                # Add result if available
                result = tool_results_map.get(tool_id)
                if result:
                    status = "Error" if result.get("is_error") else "Result"
                    output = _truncate_output(result.get("content", ""))
                    md_parts.append(f"\n**{status}:**")
                    md_parts.append(f"```\n{output}\n```")

                md_parts.append("\n</details>\n")

    return "\n".join(md_parts)


def parse_terminal_log_to_transcript(log_path: Path) -> str:
    """Parse a terminal log file into a simplified markdown transcript.

    This is a fallback when JSONL session files are not available.
    Extracts user inputs and terminal output from the raw log.

    Args:
        log_path: Path to the .log file

    Returns:
        Markdown-formatted transcript
    """
    if not log_path.exists():
        return ""

    try:
        content = log_path.read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        logger.error(f"Error reading log file {log_path}: {e}")
        return f"Error reading log file: {e}"

    # Strip ANSI escape sequences
    ansi_pattern = re.compile(r'\x1b\[[0-9;]*[a-zA-Z]|\x1b\][^\x07]*\x07')
    content = ansi_pattern.sub('', content)

    # Remove carriage returns and null bytes
    content = content.replace('\r', '')
    content = re.compile(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]').sub('', content)

    # Split into sections by [INPUT] markers
    parts = content.split("[INPUT]")

    md_parts = []
    md_parts.append("# Terminal Log Transcript\n")
    md_parts.append(f"**Source:** `{log_path.name}`\n")
    md_parts.append("---\n")

    if len(parts) <= 1:
        # No INPUT markers - just show the raw log
        md_parts.append("```\n")
        md_parts.append(_truncate_output(content, max_lines=100))
        md_parts.append("\n```")
    else:
        for i, part in enumerate(parts):
            part = part.strip()
            if not part:
                continue

            if i == 0:
                # Header section (before first input)
                md_parts.append("### Session Start\n")
                md_parts.append(f"```\n{_truncate_output(part, 20)}\n```\n")
            else:
                # Input + output section
                lines = part.split("\n", 1)
                input_text = lines[0].strip()
                output_text = lines[1].strip() if len(lines) > 1 else ""

                md_parts.append(f"\n### Input\n")
                md_parts.append(f"`{input_text}`\n")

                if output_text:
                    md_parts.append(f"\n```\n{_truncate_output(output_text)}\n```\n")

    return "\n".join(md_parts)


def generate_transcript(
    ccresearch_id: str,
    workspace_dir: Path,
    logs_dir: Path,
) -> Optional[str]:
    """Generate a transcript for a session.

    Tries JSONL session files first (richer format), falls back to terminal logs.

    Args:
        ccresearch_id: Session ID
        workspace_dir: Session workspace directory
        logs_dir: Directory containing terminal logs

    Returns:
        Markdown transcript, or None if no data found
    """
    # Try to find JSONL session file from Claude's project directory
    # Claude stores projects at ~/.claude/projects/{workspace-path-with-dashes}/
    resolved_workspace = workspace_dir.resolve()
    project_dir_name = str(resolved_workspace).replace("/", "-")
    if not project_dir_name.startswith("-"):
        project_dir_name = "-" + project_dir_name

    claude_projects_dir = Path.home() / ".claude" / "projects" / project_dir_name
    jsonl_transcript = ""

    if claude_projects_dir.exists():
        # Find the most recent JSONL file
        jsonl_files = sorted(
            claude_projects_dir.glob("*.jsonl"),
            key=lambda f: f.stat().st_mtime,
            reverse=True,
        )
        if jsonl_files:
            logger.info(f"Parsing JSONL session from {jsonl_files[0]}")
            jsonl_transcript = parse_jsonl_to_transcript(jsonl_files[0])

    # Also try terminal log
    log_files = sorted(logs_dir.glob(f"{ccresearch_id}_*.log"))
    log_transcript = ""
    if log_files:
        log_transcript = parse_terminal_log_to_transcript(log_files[-1])

    # Combine if both exist, prefer JSONL
    if jsonl_transcript and log_transcript:
        return jsonl_transcript + "\n\n---\n\n" + log_transcript
    elif jsonl_transcript:
        return jsonl_transcript
    elif log_transcript:
        return log_transcript

    return None


def cache_transcript(transcript: str, workspace_dir: Path) -> Path:
    """Cache a transcript to the workspace output directory.

    Args:
        transcript: Markdown transcript content
        workspace_dir: Session workspace directory

    Returns:
        Path to cached transcript file
    """
    transcripts_dir = workspace_dir / "output" / "transcripts"
    transcripts_dir.mkdir(parents=True, exist_ok=True)

    transcript_path = transcripts_dir / "transcript.md"
    transcript_path.write_text(transcript, encoding="utf-8")
    logger.info(f"Cached transcript to {transcript_path}")
    return transcript_path

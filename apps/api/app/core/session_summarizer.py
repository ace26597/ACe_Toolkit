"""
Session Summary Generator

Generates AI-powered summaries of Claude Code research sessions.
Uses the transcript parser to get session content, then feeds it to
Claude CLI in headless mode to produce a structured JSON summary.

Falls back to basic metadata extraction when Claude is unavailable
or the transcript is too short.
"""

import asyncio
import json
import logging
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

from app.core.transcript_parser import generate_transcript

logger = logging.getLogger("session_summarizer")

SUMMARY_FILENAME = ".summary.json"
SUMMARY_TIMEOUT_SECONDS = 30
MIN_TRANSCRIPT_LENGTH = 1024  # 1KB minimum for AI summarization


def _build_fallback_summary(
    session_id: str,
    workspace_dir: Path,
    logs_dir: Path,
) -> Dict[str, Any]:
    """Build a minimal summary from file metadata when transcript is insufficient."""
    summary: Dict[str, Any] = {
        "title": f"Session {session_id[:8]}",
        "key_findings": [],
        "files_created": [],
        "files_modified": [],
        "tools_used": [],
        "duration_estimate": "unknown",
        "generated_at": datetime.utcnow().isoformat(),
        "method": "metadata_fallback",
    }

    # Scan workspace for created files
    if workspace_dir.exists():
        for f in workspace_dir.rglob("*"):
            if f.is_file() and not f.name.startswith("."):
                try:
                    rel = f.relative_to(workspace_dir)
                    summary["files_created"].append(str(rel))
                except ValueError:
                    pass

    # Scan log files for basic info
    log_files = sorted(logs_dir.glob(f"{session_id}_*.log"))
    if log_files:
        log_file = log_files[-1]
        try:
            stat = log_file.stat()
            size_kb = stat.st_size / 1024
            summary["key_findings"].append(
                f"Terminal log: {log_file.name} ({size_kb:.1f} KB)"
            )
        except OSError:
            pass

    return summary


def _parse_claude_json(raw: str) -> Optional[Dict[str, Any]]:
    """Parse JSON from Claude output, handling common malformed cases."""
    raw = raw.strip()
    if not raw:
        return None

    # Try direct parse
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    # Try extracting JSON from markdown code fences
    for marker in ("```json", "```"):
        if marker in raw:
            start = raw.index(marker) + len(marker)
            end = raw.find("```", start)
            if end != -1:
                try:
                    return json.loads(raw[start:end].strip())
                except json.JSONDecodeError:
                    pass

    # Try finding first { to last }
    first_brace = raw.find("{")
    last_brace = raw.rfind("}")
    if first_brace != -1 and last_brace > first_brace:
        try:
            return json.loads(raw[first_brace : last_brace + 1])
        except json.JSONDecodeError:
            pass

    return None


async def generate_summary(
    session_id: str,
    workspace_dir: Path,
    logs_dir: Path,
) -> Dict[str, Any]:
    """Generate a structured summary for a session.

    Calls generate_transcript() to get the markdown transcript, then
    uses Claude CLI in headless mode to produce a JSON summary.
    Falls back to metadata-based summary on failure.

    Args:
        session_id: CCResearch session ID
        workspace_dir: Session workspace directory
        logs_dir: Directory containing terminal logs

    Returns:
        Summary dict with title, key_findings, files, tools, etc.
    """
    # Get transcript
    transcript = generate_transcript(session_id, workspace_dir, logs_dir)

    if not transcript or len(transcript) < MIN_TRANSCRIPT_LENGTH:
        logger.info(
            f"Transcript too short for AI summary (session {session_id}), "
            "using metadata fallback"
        )
        summary = _build_fallback_summary(session_id, workspace_dir, logs_dir)
        _save_summary(summary, workspace_dir)
        return summary

    # Check Claude CLI is available
    if not shutil.which("claude"):
        logger.warning("Claude CLI not found, using metadata fallback")
        summary = _build_fallback_summary(session_id, workspace_dir, logs_dir)
        summary["key_findings"].insert(0, "AI summary unavailable (Claude CLI not installed)")
        _save_summary(summary, workspace_dir)
        return summary

    # Truncate transcript for the prompt
    truncated = transcript[:4000]
    if len(transcript) > 4000:
        truncated += "\n\n... (transcript truncated)"

    prompt = (
        "Summarize this terminal session. Return ONLY valid JSON: "
        '{"title": "concise title", '
        '"key_findings": ["finding1", ...], '
        '"files_created": ["file1", ...], '
        '"files_modified": ["file1", ...], '
        '"tools_used": ["tool1", ...], '
        '"duration_estimate": "X minutes"}\n\n'
        f"{truncated}"
    )

    try:
        process = await asyncio.create_subprocess_exec(
            "claude",
            "-p", prompt,
            "--output-format", "json",
            "--permission-mode", "bypassPermissions",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        try:
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=SUMMARY_TIMEOUT_SECONDS,
            )
        except asyncio.TimeoutError:
            logger.warning(
                f"Claude summary timed out after {SUMMARY_TIMEOUT_SECONDS}s "
                f"(session {session_id})"
            )
            try:
                process.terminate()
                await asyncio.sleep(0.5)
                if process.returncode is None:
                    process.kill()
            except ProcessLookupError:
                pass
            summary = _build_fallback_summary(session_id, workspace_dir, logs_dir)
            summary["key_findings"].insert(0, "AI summary timed out")
            _save_summary(summary, workspace_dir)
            return summary

        if process.returncode != 0:
            logger.warning(
                f"Claude exited with code {process.returncode} "
                f"(session {session_id}): {stderr.decode(errors='replace')[:200]}"
            )
            summary = _build_fallback_summary(session_id, workspace_dir, logs_dir)
            summary["key_findings"].insert(0, "AI summary failed (non-zero exit)")
            _save_summary(summary, workspace_dir)
            return summary

        raw_output = stdout.decode("utf-8", errors="replace")
        parsed = _parse_claude_json(raw_output)

        if not parsed or not isinstance(parsed, dict):
            logger.warning(
                f"Could not parse Claude JSON output (session {session_id}): "
                f"{raw_output[:200]}"
            )
            summary = _build_fallback_summary(session_id, workspace_dir, logs_dir)
            summary["key_findings"].insert(0, "AI summary returned invalid JSON")
            _save_summary(summary, workspace_dir)
            return summary

        # Normalize the response: ensure all expected keys exist
        summary = {
            "title": parsed.get("title", f"Session {session_id[:8]}"),
            "key_findings": parsed.get("key_findings", []),
            "files_created": parsed.get("files_created", []),
            "files_modified": parsed.get("files_modified", []),
            "tools_used": parsed.get("tools_used", []),
            "duration_estimate": parsed.get("duration_estimate", "unknown"),
            "generated_at": datetime.utcnow().isoformat(),
            "method": "claude_ai",
        }

        _save_summary(summary, workspace_dir)
        logger.info(f"Generated AI summary for session {session_id}")
        return summary

    except FileNotFoundError:
        logger.warning("Claude CLI not found during execution")
        summary = _build_fallback_summary(session_id, workspace_dir, logs_dir)
        _save_summary(summary, workspace_dir)
        return summary
    except Exception as e:
        logger.exception(f"Unexpected error generating summary for session {session_id}: {e}")
        summary = _build_fallback_summary(session_id, workspace_dir, logs_dir)
        summary["key_findings"].insert(0, f"AI summary error: {type(e).__name__}")
        _save_summary(summary, workspace_dir)
        return summary


def _save_summary(summary: Dict[str, Any], workspace_dir: Path) -> None:
    """Save summary JSON to workspace output directory."""
    output_dir = workspace_dir / "output"
    output_dir.mkdir(parents=True, exist_ok=True)
    summary_path = output_dir / SUMMARY_FILENAME
    try:
        summary_path.write_text(
            json.dumps(summary, indent=2, default=str),
            encoding="utf-8",
        )
        logger.info(f"Saved summary to {summary_path}")
    except OSError as e:
        logger.error(f"Failed to save summary: {e}")


async def get_cached_summary(workspace_dir: Path) -> Optional[Dict[str, Any]]:
    """Read a previously generated summary from the workspace.

    Args:
        workspace_dir: Session workspace directory

    Returns:
        Summary dict if cached file exists, None otherwise
    """
    summary_path = workspace_dir / "output" / SUMMARY_FILENAME
    if not summary_path.exists():
        return None

    try:
        content = summary_path.read_text(encoding="utf-8")
        return json.loads(content)
    except (json.JSONDecodeError, OSError) as e:
        logger.error(f"Error reading cached summary: {e}")
        return None

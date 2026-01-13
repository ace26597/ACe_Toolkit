"""
Logs Router - View application logs through API endpoints.

Provides endpoints to view:
- Backend logs (uvicorn, FastAPI)
- Frontend logs (Next.js)
- Cloudflare Tunnel logs
- Startup/shutdown logs
"""

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse, PlainTextResponse
from typing import Optional, List
from pathlib import Path
from datetime import datetime
import subprocess
import os
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# Log directory configuration
LOG_DIR = Path("/home/ace/dev/ACe_Toolkit/logs")


def get_log_files(pattern: str = "*") -> List[Path]:
    """Get list of log files matching pattern."""
    if not LOG_DIR.exists():
        return []

    log_files = sorted(LOG_DIR.glob(pattern), key=lambda p: p.stat().st_mtime, reverse=True)
    return log_files


def read_log_file(file_path: Path, lines: int = 100, follow: bool = False) -> str:
    """Read log file with optional tail behavior."""
    try:
        if not file_path.exists():
            return f"Log file not found: {file_path}"

        if follow:
            # Use tail -f for live following
            cmd = ["tail", "-f", "-n", str(lines), str(file_path)]
            process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            return process.stdout
        else:
            # Read last N lines
            cmd = ["tail", "-n", str(lines), str(file_path)]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
            return result.stdout

    except Exception as e:
        logger.error(f"Error reading log file {file_path}: {e}")
        return f"Error reading log file: {str(e)}"


@router.get("/list")
async def list_logs():
    """
    List all available log files with metadata.

    Returns:
        List of log files with name, size, and last modified time
    """
    try:
        log_files = get_log_files()

        files_info = []
        for log_file in log_files:
            stat = log_file.stat()
            files_info.append({
                "name": log_file.name,
                "path": str(log_file.relative_to(LOG_DIR)),
                "size_bytes": stat.st_size,
                "size_human": format_bytes(stat.st_size),
                "modified_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "type": categorize_log(log_file.name)
            })

        return {
            "log_directory": str(LOG_DIR),
            "total_files": len(files_info),
            "files": files_info
        }

    except Exception as e:
        logger.error(f"Error listing logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/backend")
async def get_backend_logs(
    lines: int = Query(100, ge=1, le=10000, description="Number of lines to return"),
    date: Optional[str] = Query(None, description="Date in YYYYMMDD format")
):
    """
    Get backend (uvicorn/FastAPI) logs.

    Args:
        lines: Number of lines to return (default: 100, max: 10000)
        date: Optional date filter in YYYYMMDD format

    Returns:
        Log content as plain text
    """
    try:
        # Determine which log file to read
        if date:
            log_pattern = f"backend-prod-{date}.log"
        else:
            # Get most recent backend log
            backend_logs = get_log_files("backend-*.log")
            if not backend_logs:
                return PlainTextResponse("No backend logs found")
            log_pattern = backend_logs[0].name

        log_file = LOG_DIR / log_pattern
        content = read_log_file(log_file, lines=lines)

        return PlainTextResponse(content)

    except Exception as e:
        logger.error(f"Error getting backend logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/frontend")
async def get_frontend_logs(
    lines: int = Query(100, ge=1, le=10000),
    date: Optional[str] = Query(None)
):
    """
    Get frontend (Next.js) logs.

    Args:
        lines: Number of lines to return
        date: Optional date filter in YYYYMMDD format

    Returns:
        Log content as plain text
    """
    try:
        if date:
            log_pattern = f"frontend-prod-{date}.log"
        else:
            frontend_logs = get_log_files("frontend-*.log")
            if not frontend_logs:
                return PlainTextResponse("No frontend logs found")
            log_pattern = frontend_logs[0].name

        log_file = LOG_DIR / log_pattern
        content = read_log_file(log_file, lines=lines)

        return PlainTextResponse(content)

    except Exception as e:
        logger.error(f"Error getting frontend logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cloudflare")
async def get_cloudflare_logs(
    lines: int = Query(100, ge=1, le=10000)
):
    """
    Get Cloudflare Tunnel logs from systemd journal.

    Args:
        lines: Number of lines to return

    Returns:
        Log content as plain text
    """
    try:
        # Get cloudflared logs from systemd
        cmd = ["journalctl", "-u", "cloudflared", "-n", str(lines), "--no-pager"]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)

        if result.returncode != 0:
            return PlainTextResponse(f"Error reading Cloudflare logs: {result.stderr}")

        return PlainTextResponse(result.stdout)

    except subprocess.TimeoutExpired:
        return PlainTextResponse("Timeout reading Cloudflare logs")
    except Exception as e:
        logger.error(f"Error getting Cloudflare logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/startup")
async def get_startup_logs(
    lines: int = Query(100, ge=1, le=10000)
):
    """
    Get application startup logs.

    Args:
        lines: Number of lines to return

    Returns:
        Log content as plain text
    """
    try:
        log_file = LOG_DIR / "startup.log"
        content = read_log_file(log_file, lines=lines)

        return PlainTextResponse(content)

    except Exception as e:
        logger.error(f"Error getting startup logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/shutdown")
async def get_shutdown_logs(
    lines: int = Query(100, ge=1, le=10000),
    date: Optional[str] = Query(None)
):
    """
    Get application shutdown logs.

    Args:
        lines: Number of lines to return
        date: Optional date filter in YYYYMMDD format

    Returns:
        Log content as plain text
    """
    try:
        if date:
            log_pattern = f"shutdown-{date}.log"
        else:
            shutdown_logs = get_log_files("shutdown-*.log")
            if not shutdown_logs:
                return PlainTextResponse("No shutdown logs found")
            log_pattern = shutdown_logs[0].name

        log_file = LOG_DIR / log_pattern
        content = read_log_file(log_file, lines=lines)

        return PlainTextResponse(content)

    except Exception as e:
        logger.error(f"Error getting shutdown logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search")
async def search_logs(
    query: str = Query(..., description="Search term"),
    log_type: Optional[str] = Query(None, description="Log type: backend, frontend, cloudflare, all"),
    lines: int = Query(100, ge=1, le=10000)
):
    """
    Search across log files for specific terms.

    Args:
        query: Search term or regex pattern
        log_type: Optional log type filter (backend, frontend, cloudflare, all)
        lines: Maximum number of matching lines to return

    Returns:
        Matching log lines as plain text
    """
    try:
        results = []

        # Determine which logs to search
        if log_type == "backend" or log_type is None:
            backend_logs = get_log_files("backend-*.log")
            for log_file in backend_logs[:3]:  # Search last 3 backend logs
                cmd = ["grep", "-i", query, str(log_file)]
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
                if result.stdout:
                    results.append(f"=== {log_file.name} ===\n{result.stdout}\n")

        if log_type == "frontend" or log_type is None:
            frontend_logs = get_log_files("frontend-*.log")
            for log_file in frontend_logs[:3]:  # Search last 3 frontend logs
                cmd = ["grep", "-i", query, str(log_file)]
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
                if result.stdout:
                    results.append(f"=== {log_file.name} ===\n{result.stdout}\n")

        if log_type == "cloudflare":
            cmd = ["journalctl", "-u", "cloudflared", "--no-pager", "|", "grep", "-i", query]
            # Note: This requires shell=True which is less safe
            result = subprocess.run(" ".join(cmd), shell=True, capture_output=True, text=True, timeout=10)
            if result.stdout:
                results.append(f"=== Cloudflare Tunnel ===\n{result.stdout}\n")

        if not results:
            return PlainTextResponse(f"No matches found for: {query}")

        # Combine results and limit lines
        combined = "\n".join(results)
        lines_list = combined.split("\n")[:lines]

        return PlainTextResponse("\n".join(lines_list))

    except Exception as e:
        logger.error(f"Error searching logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tail/{log_type}")
async def tail_logs(
    log_type: str,
    lines: int = Query(50, ge=1, le=1000)
):
    """
    Stream live log updates (tail -f behavior).

    Args:
        log_type: Type of log (backend, frontend, startup)
        lines: Number of initial lines to show

    Returns:
        Streaming response with live log updates
    """
    try:
        # Map log type to file
        log_mapping = {
            "backend": get_log_files("backend-*.log"),
            "frontend": get_log_files("frontend-*.log"),
            "startup": [LOG_DIR / "startup.log"]
        }

        if log_type not in log_mapping:
            raise HTTPException(status_code=400, detail=f"Invalid log type: {log_type}")

        log_files = log_mapping[log_type]
        if not log_files or not log_files[0].exists():
            raise HTTPException(status_code=404, detail=f"No {log_type} log found")

        log_file = log_files[0]

        # Stream log file
        async def log_generator():
            cmd = ["tail", "-f", "-n", str(lines), str(log_file)]
            process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

            try:
                for line in iter(process.stdout.readline, ''):
                    if line:
                        yield line
            finally:
                process.terminate()

        return StreamingResponse(log_generator(), media_type="text/plain")

    except Exception as e:
        logger.error(f"Error tailing logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Utility functions

def format_bytes(bytes_count: int) -> str:
    """Format bytes to human-readable size."""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if bytes_count < 1024.0:
            return f"{bytes_count:.2f} {unit}"
        bytes_count /= 1024.0
    return f"{bytes_count:.2f} TB"


def categorize_log(filename: str) -> str:
    """Categorize log file by name."""
    if "backend" in filename:
        return "backend"
    elif "frontend" in filename:
        return "frontend"
    elif "startup" in filename:
        return "startup"
    elif "shutdown" in filename:
        return "shutdown"
    else:
        return "other"

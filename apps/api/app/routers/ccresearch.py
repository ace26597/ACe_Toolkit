"""
CCResearch Router (Claude Code Research Platform)

WebSocket terminal interface for Claude Code research sessions.

Features:
- Spawn Claude Code CLI via pexpect with PTY
- Bidirectional WebSocket streaming (stdin/stdout)
- Session directory management with research CLAUDE.md
- 24-hour session persistence with auto-cleanup
- File browser for session workspace files
- File upload for initial session data

Endpoints:
- POST /sessions: Create new session with email and optional files
- POST /sessions/{id}/upload: Upload files to session
- GET /sessions/{browser_session_id}: List sessions
- GET /sessions/detail/{id}: Get session details
- DELETE /sessions/{id}: Delete session
- POST /sessions/{id}/resize: Resize terminal
- GET /sessions/{id}/files: List workspace files
- GET /sessions/{id}/files/download: Download file
- WS /terminal/{id}: Bidirectional terminal I/O
"""

import json
import uuid
import logging
import mimetypes
import tempfile
import zipfile
import shutil
import aiofiles
import asyncio
import re
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.config import settings
from app.core.ccresearch_manager import ccresearch_manager
from app.models.models import CCResearchSession
from collections import defaultdict
import time

# Simple in-memory rate limiter
class RateLimiter:
    """Simple rate limiter using token bucket algorithm"""
    def __init__(self, requests_per_minute: int = 60):
        self.requests_per_minute = requests_per_minute
        self.requests: dict = defaultdict(list)

    def is_allowed(self, key: str) -> bool:
        """Check if request is allowed for given key (e.g., session_id)"""
        now = time.time()
        minute_ago = now - 60

        # Clean old entries
        self.requests[key] = [t for t in self.requests[key] if t > minute_ago]

        if len(self.requests[key]) >= self.requests_per_minute:
            return False

        self.requests[key].append(now)
        return True

# Rate limiters for different endpoints
file_rate_limiter = RateLimiter(requests_per_minute=60)  # 60 file operations per minute
upload_rate_limiter = RateLimiter(requests_per_minute=10)  # 10 uploads per minute

logger = logging.getLogger("ccresearch")
router = APIRouter()

# Path to allowed emails whitelist (protected from Claude Code via deny rules)
ALLOWED_EMAILS_FILE = Path.home() / ".ccresearch_allowed_emails.json"


def load_allowed_emails() -> set:
    """Load allowed emails from whitelist file."""
    try:
        if ALLOWED_EMAILS_FILE.exists():
            with open(ALLOWED_EMAILS_FILE, 'r') as f:
                data = json.load(f)
                emails = set(e.lower() for e in data.get("allowed_emails", []))
                logger.debug(f"Loaded {len(emails)} allowed emails")
                return emails
    except Exception as e:
        logger.error(f"Failed to load allowed emails: {e}")
    return set()


def is_email_allowed(email: str) -> bool:
    """Check if email is in the whitelist."""
    if not email:
        return False
    allowed = load_allowed_emails()
    return email.lower() in allowed


# ============ Pydantic Schemas ============

class CreateSessionRequest(BaseModel):
    session_id: str  # Browser session ID
    email: EmailStr  # User's email address
    title: Optional[str] = None


class ResizeRequest(BaseModel):
    rows: int
    cols: int


class SessionResponse(BaseModel):
    id: str
    session_id: str
    email: str
    title: str
    workspace_dir: str
    status: str
    terminal_rows: int
    terminal_cols: int
    commands_executed: int
    created_at: datetime
    last_activity_at: datetime
    expires_at: datetime
    uploaded_files: Optional[List[str]] = None
    is_admin: bool = False  # Admin sessions are unsandboxed

    class Config:
        from_attributes = True


class FileInfo(BaseModel):
    name: str
    path: str  # Relative path from workspace root
    is_dir: bool
    size: int
    modified_at: datetime


class FileListResponse(BaseModel):
    files: List[FileInfo]
    current_path: str


class SaveProjectRequest(BaseModel):
    project_name: str
    description: Optional[str] = ""


class SaveProjectResponse(BaseModel):
    name: str
    path: str
    saved_at: str


class ProjectInfo(BaseModel):
    name: str
    path: str
    description: Optional[str] = None
    saved_at: str
    files: Optional[List[str]] = None


class CreateFromProjectRequest(BaseModel):
    session_id: str  # Browser session ID
    email: EmailStr
    project_name: str
    title: Optional[str] = None


class UploadResponse(BaseModel):
    uploaded_files: List[str]
    data_dir: str


class GitCloneRequest(BaseModel):
    repo_url: str  # GitHub URL (https://github.com/user/repo or git@github.com:user/repo)
    target_path: Optional[str] = None  # Relative path within workspace (default: data/)
    branch: Optional[str] = None  # Specific branch to clone


class GitCloneResponse(BaseModel):
    success: bool
    repo_name: str
    clone_path: str
    message: str


# ============ REST Endpoints ============

@router.post("/sessions", response_model=SessionResponse)
async def create_session(
    session_id: str = Form(...),
    email: str = Form(...),  # Email is now required for whitelist validation
    title: Optional[str] = Form(None),
    files: List[UploadFile] = File(default=[]),
    db: AsyncSession = Depends(get_db)
):
    """Create a new CCResearch session with workspace directory and optional file uploads.

    Starts Claude Code directly - users can use any skills, MCP servers, or plugins.
    Email must be in the allowed whitelist.
    """
    # Validate email against whitelist
    if not is_email_allowed(email):
        logger.warning(f"Access denied for email: {email}")
        raise HTTPException(
            status_code=403,
            detail="Access denied. Your email is not authorized to use CCResearch. Please contact the administrator."
        )

    ccresearch_id = str(uuid.uuid4())

    # Process uploaded files info
    uploaded_files_list = []

    # Create workspace directory with CLAUDE.md
    workspace_dir = ccresearch_manager.create_workspace(
        ccresearch_id,
        email=email,
        uploaded_files=uploaded_files_list  # Will be updated after saving files
    )

    # Save uploaded files to data/ directory in workspace
    data_dir = Path(workspace_dir) / "data"
    data_dir.mkdir(exist_ok=True)

    for file in files:
        if file.filename:
            # Sanitize filename
            safe_filename = Path(file.filename).name
            file_path = data_dir / safe_filename

            # Save file
            async with aiofiles.open(file_path, 'wb') as f:
                content = await file.read()
                await f.write(content)

            uploaded_files_list.append(safe_filename)
            logger.info(f"Uploaded file: {safe_filename} to session {ccresearch_id}")

    # Update CLAUDE.md with file info if files were uploaded
    if uploaded_files_list:
        ccresearch_manager.update_workspace_claude_md(
            ccresearch_id,
            workspace_dir,
            email=email,
            uploaded_files=uploaded_files_list
        )

    # Create database entry
    session = CCResearchSession(
        id=ccresearch_id,
        session_id=session_id,
        email=email,
        title=title or f"Research Session {datetime.utcnow().strftime('%H:%M')}",
        workspace_dir=str(workspace_dir),
        status="created",
        uploaded_files=json.dumps(uploaded_files_list) if uploaded_files_list else None,
        auth_mode="oauth",  # Keep for database compatibility
        is_admin=False,  # Keep for database compatibility
        expires_at=datetime.utcnow() + timedelta(hours=24)
    )

    db.add(session)
    await db.commit()
    await db.refresh(session)

    logger.info(f"Created session {ccresearch_id} for {email} with {len(uploaded_files_list)} files")

    # Convert for response
    response = SessionResponse(
        id=session.id,
        session_id=session.session_id,
        email=session.email,
        title=session.title,
        workspace_dir=session.workspace_dir,
        status=session.status,
        terminal_rows=session.terminal_rows,
        terminal_cols=session.terminal_cols,
        commands_executed=session.commands_executed,
        created_at=session.created_at,
        last_activity_at=session.last_activity_at,
        expires_at=session.expires_at,
        uploaded_files=uploaded_files_list,
        is_admin=session.is_admin
    )
    return response


@router.post("/sessions/{ccresearch_id}/upload", response_model=UploadResponse)
async def upload_files_to_session(
    ccresearch_id: str,
    files: List[UploadFile] = File(...),
    target_path: Optional[str] = Form(None),  # Relative path within workspace (e.g., "data" or "data/subdir")
    extract_zip: bool = Form(True),  # Auto-extract ZIP files
    db: AsyncSession = Depends(get_db)
):
    """Upload files to an existing session.

    Supports:
    - Individual files
    - Directory uploads (files with paths like "folder/file.txt")
    - ZIP files (auto-extracted if extract_zip=True)
    - Target directory selection
    """
    # Rate limiting
    if not upload_rate_limiter.is_allowed(ccresearch_id):
        raise HTTPException(status_code=429, detail="Too many upload requests. Please wait a moment.")

    result = await db.execute(
        select(CCResearchSession)
        .where(CCResearchSession.id == ccresearch_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    workspace = Path(session.workspace_dir)

    # Determine target directory
    if target_path:
        # Sanitize and validate target path (prevent directory traversal)
        target_dir = (workspace / target_path).resolve()
        if not str(target_dir).startswith(str(workspace.resolve())):
            raise HTTPException(status_code=403, detail="Invalid target path")
    else:
        target_dir = workspace / "data"

    target_dir.mkdir(parents=True, exist_ok=True)

    uploaded_files_list = []
    existing_files = json.loads(session.uploaded_files) if session.uploaded_files else []

    # File size limits
    MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB per file
    MAX_TOTAL_SIZE = 500 * 1024 * 1024  # 500MB total per upload request
    total_size = 0

    for file in files:
        if not file.filename:
            continue

        content = await file.read()

        # Check file size
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File '{file.filename}' exceeds {MAX_FILE_SIZE // (1024*1024)}MB limit"
            )
        total_size += len(content)
        if total_size > MAX_TOTAL_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"Total upload size exceeds {MAX_TOTAL_SIZE // (1024*1024)}MB limit"
            )

        # Check if it's a ZIP file and should be extracted
        if extract_zip and file.filename.lower().endswith('.zip'):
            try:
                # Extract ZIP contents with security checks
                import io
                MAX_ZIP_SIZE = 500 * 1024 * 1024  # 500MB max total extracted size
                MAX_ZIP_FILES = 1000  # Max files in ZIP
                MAX_COMPRESSION_RATIO = 100  # Detect zip bombs

                with zipfile.ZipFile(io.BytesIO(content), 'r') as zip_ref:
                    # Check for zip bomb (excessive compression ratio)
                    total_uncompressed = sum(info.file_size for info in zip_ref.infolist())
                    if len(content) > 0 and total_uncompressed / len(content) > MAX_COMPRESSION_RATIO:
                        raise HTTPException(status_code=400, detail="ZIP file rejected: suspicious compression ratio (possible zip bomb)")

                    if total_uncompressed > MAX_ZIP_SIZE:
                        raise HTTPException(status_code=400, detail=f"ZIP contents too large: {total_uncompressed // (1024*1024)}MB exceeds {MAX_ZIP_SIZE // (1024*1024)}MB limit")

                    if len(zip_ref.infolist()) > MAX_ZIP_FILES:
                        raise HTTPException(status_code=400, detail=f"ZIP has too many files: {len(zip_ref.infolist())} exceeds {MAX_ZIP_FILES} limit")

                    for zip_info in zip_ref.infolist():
                        if zip_info.is_dir():
                            continue

                        # Security: Check for path traversal attacks
                        if '..' in zip_info.filename or zip_info.filename.startswith('/'):
                            logger.warning(f"Skipping suspicious path in ZIP: {zip_info.filename}")
                            continue

                        # Sanitize and validate path
                        rel_path = Path(zip_info.filename)
                        extracted_path = (target_dir / rel_path).resolve()

                        # Ensure extracted path is within target directory
                        if not str(extracted_path).startswith(str(target_dir.resolve())):
                            logger.warning(f"Skipping path traversal attempt in ZIP: {zip_info.filename}")
                            continue

                        extracted_path.parent.mkdir(parents=True, exist_ok=True)

                        # Extract file
                        with zip_ref.open(zip_info) as src:
                            async with aiofiles.open(extracted_path, 'wb') as dst:
                                await dst.write(src.read())

                        uploaded_files_list.append(str(extracted_path.relative_to(workspace)))
                logger.info(f"Extracted ZIP {file.filename} to {target_dir}")
            except zipfile.BadZipFile:
                # Not a valid ZIP, save as-is
                safe_filename = Path(file.filename).name
                file_path = target_dir / safe_filename
                async with aiofiles.open(file_path, 'wb') as f:
                    await f.write(content)
                uploaded_files_list.append(safe_filename)
        else:
            # Handle regular files (including directory uploads with paths)
            # Browser sends directory files as "folder/subfolder/file.txt"
            if '/' in file.filename:
                # Preserve directory structure
                rel_path = Path(file.filename)
                file_path = target_dir / rel_path
                file_path.parent.mkdir(parents=True, exist_ok=True)
            else:
                safe_filename = Path(file.filename).name
                file_path = target_dir / safe_filename

            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(content)

            uploaded_files_list.append(str(file_path.relative_to(workspace)))

        # Track in existing files list
        for uf in uploaded_files_list:
            if uf not in existing_files:
                existing_files.append(uf)

    # Update database
    session.uploaded_files = json.dumps(existing_files)
    await db.commit()

    # Update CLAUDE.md
    ccresearch_manager.update_workspace_claude_md(
        ccresearch_id,
        session.workspace_dir,
        email=session.email,
        uploaded_files=existing_files
    )

    logger.info(f"Uploaded {len(uploaded_files_list)} files to session {ccresearch_id}")

    return UploadResponse(
        uploaded_files=uploaded_files_list,
        data_dir=str(data_dir)
    )


@router.post("/sessions/{ccresearch_id}/clone-repo", response_model=GitCloneResponse)
async def clone_github_repo(
    ccresearch_id: str,
    request: GitCloneRequest,
    db: AsyncSession = Depends(get_db)
):
    """Clone a GitHub repository into the session workspace.

    Supports HTTPS URLs like https://github.com/user/repo
    Clones into data/ directory by default, or specified target_path.
    """
    # Get session
    result = await db.execute(
        select(CCResearchSession)
        .where(CCResearchSession.id == ccresearch_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    workspace = Path(session.workspace_dir)

    # Validate and parse GitHub URL
    repo_url = request.repo_url.strip()

    # Extract repo name from URL
    # Supports: https://github.com/user/repo, https://github.com/user/repo.git, git@github.com:user/repo.git
    repo_name_match = re.search(r'[/:]([^/:]+/[^/.]+)(?:\.git)?$', repo_url)
    if not repo_name_match:
        raise HTTPException(status_code=400, detail="Invalid repository URL format")

    repo_full_name = repo_name_match.group(1)  # e.g., "user/repo"
    repo_name = repo_full_name.split('/')[-1]  # Just the repo name

    # Ensure HTTPS URL for cloning (more reliable without SSH keys)
    if repo_url.startswith('git@'):
        # Convert SSH to HTTPS
        repo_url = re.sub(r'^git@github\.com:', 'https://github.com/', repo_url)
    if not repo_url.endswith('.git'):
        repo_url = repo_url + '.git'

    # Determine target directory
    target_path = request.target_path or "data"
    target_dir = workspace / target_path
    target_dir.mkdir(parents=True, exist_ok=True)

    clone_dir = target_dir / repo_name

    # Check if directory already exists
    if clone_dir.exists():
        raise HTTPException(
            status_code=400,
            detail=f"Directory '{repo_name}' already exists in {target_path}/"
        )

    # Build git clone command
    cmd = ['git', 'clone', '--depth', '1']  # Shallow clone for speed
    if request.branch:
        # Validate branch name - only allow safe characters
        import re
        if not re.match(r'^[a-zA-Z0-9._/-]+$', request.branch):
            raise HTTPException(status_code=400, detail="Invalid branch name - only alphanumeric, dots, underscores, slashes and dashes allowed")
        if request.branch.startswith('-'):
            raise HTTPException(status_code=400, detail="Branch name cannot start with dash")
        cmd.extend(['--branch', request.branch])
    cmd.extend([repo_url, str(clone_dir)])

    try:
        # Run git clone
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=str(target_dir)
        )
        stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=120)

        if process.returncode != 0:
            error_msg = stderr.decode().strip() or "Unknown error"
            logger.error(f"Git clone failed for {repo_url}: {error_msg}")
            raise HTTPException(status_code=400, detail=f"Clone failed: {error_msg}")

        # Update uploaded_files in database
        existing_files = json.loads(session.uploaded_files) if session.uploaded_files else []
        clone_rel_path = f"{target_path}/{repo_name}"
        if clone_rel_path not in existing_files:
            existing_files.append(clone_rel_path)
        session.uploaded_files = json.dumps(existing_files)
        await db.commit()

        # Update CLAUDE.md
        ccresearch_manager.update_workspace_claude_md(
            ccresearch_id,
            session.workspace_dir,
            email=session.email,
            uploaded_files=existing_files
        )

        logger.info(f"Cloned {repo_url} to {clone_dir}")

        return GitCloneResponse(
            success=True,
            repo_name=repo_name,
            clone_path=clone_rel_path,
            message=f"Successfully cloned {repo_full_name}"
        )

    except asyncio.TimeoutError:
        # Clean up partial clone
        if clone_dir.exists():
            shutil.rmtree(clone_dir, ignore_errors=True)
        raise HTTPException(status_code=408, detail="Clone timed out (max 120s)")
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error cloning repo: {e}")
        if clone_dir.exists():
            shutil.rmtree(clone_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=f"Clone failed: {str(e)}")


@router.get("/sessions/{browser_session_id}", response_model=list[SessionResponse])
async def list_sessions(
    browser_session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """List all sessions for a browser session"""
    result = await db.execute(
        select(CCResearchSession)
        .where(CCResearchSession.session_id == browser_session_id)
        .where(CCResearchSession.expires_at > datetime.utcnow())
        .order_by(CCResearchSession.created_at.desc())
    )
    sessions = result.scalars().all()

    response_list = []
    for s in sessions:
        response_list.append(SessionResponse(
            id=s.id,
            session_id=s.session_id,
            email=s.email,
            title=s.title,
            workspace_dir=s.workspace_dir,
            status=s.status,
            terminal_rows=s.terminal_rows,
            terminal_cols=s.terminal_cols,
            commands_executed=s.commands_executed,
            created_at=s.created_at,
            last_activity_at=s.last_activity_at,
            expires_at=s.expires_at,
            uploaded_files=json.loads(s.uploaded_files) if s.uploaded_files else None,
            is_admin=s.is_admin
        ))
    return response_list


@router.get("/sessions/detail/{ccresearch_id}", response_model=SessionResponse)
async def get_session(
    ccresearch_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get details for a specific session"""
    result = await db.execute(
        select(CCResearchSession)
        .where(CCResearchSession.id == ccresearch_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Update status based on process state
    if ccresearch_manager.is_process_alive(ccresearch_id):
        session.status = "active"
    elif session.status == "active":
        session.status = "disconnected"

    await db.commit()

    return SessionResponse(
        id=session.id,
        session_id=session.session_id,
        email=session.email,
        title=session.title,
        workspace_dir=session.workspace_dir,
        status=session.status,
        terminal_rows=session.terminal_rows,
        terminal_cols=session.terminal_cols,
        commands_executed=session.commands_executed,
        created_at=session.created_at,
        last_activity_at=session.last_activity_at,
        expires_at=session.expires_at,
        uploaded_files=json.loads(session.uploaded_files) if session.uploaded_files else None,
        is_admin=session.is_admin
    )


@router.delete("/sessions/{ccresearch_id}")
async def delete_session(
    ccresearch_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a session and cleanup resources"""
    result = await db.execute(
        select(CCResearchSession)
        .where(CCResearchSession.id == ccresearch_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Terminate process if running
    await ccresearch_manager.terminate_session(ccresearch_id)

    # Delete workspace directory
    ccresearch_manager.delete_workspace(Path(session.workspace_dir))

    # Delete from database
    await db.execute(
        delete(CCResearchSession)
        .where(CCResearchSession.id == ccresearch_id)
    )
    await db.commit()

    logger.info(f"Deleted session {ccresearch_id}")
    return {"status": "deleted", "id": ccresearch_id}


@router.post("/sessions/{ccresearch_id}/terminate")
async def terminate_session(
    ccresearch_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Terminate a running session process (but keep the session record).

    Used for cleanup when user closes tab/browser - terminates the sandbox
    process without deleting workspace files.

    This endpoint is designed for navigator.sendBeacon() calls during page unload.
    """
    result = await db.execute(
        select(CCResearchSession)
        .where(CCResearchSession.id == ccresearch_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        # Still return 200 for sendBeacon compatibility (fire and forget)
        return {"status": "not_found", "id": ccresearch_id}

    # Terminate process if running
    terminated = await ccresearch_manager.terminate_session(ccresearch_id)

    # Update session status
    session.status = "terminated"
    await db.commit()

    logger.info(f"Terminated session {ccresearch_id} (process killed: {terminated})")
    return {"status": "terminated", "id": ccresearch_id, "process_killed": terminated}


@router.post("/sessions/{ccresearch_id}/resize")
async def resize_terminal(
    ccresearch_id: str,
    request: ResizeRequest,
    db: AsyncSession = Depends(get_db)
):
    """Resize terminal PTY dimensions"""
    result = await db.execute(
        select(CCResearchSession)
        .where(CCResearchSession.id == ccresearch_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Update database
    session.terminal_rows = request.rows
    session.terminal_cols = request.cols
    await db.commit()

    # Resize PTY if process is running
    if ccresearch_manager.is_process_alive(ccresearch_id):
        success = await ccresearch_manager.resize_terminal(
            ccresearch_id, request.rows, request.cols
        )
        if not success:
            logger.warning(f"Failed to resize PTY for {ccresearch_id}")

    return {"status": "resized", "rows": request.rows, "cols": request.cols}


# ============ File Browser Endpoints ============

@router.get("/sessions/{ccresearch_id}/files", response_model=FileListResponse)
async def list_files(
    ccresearch_id: str,
    path: str = "",
    db: AsyncSession = Depends(get_db)
):
    """List files in session workspace directory"""
    # Rate limiting
    if not file_rate_limiter.is_allowed(ccresearch_id):
        raise HTTPException(status_code=429, detail="Too many requests. Please wait a moment.")

    result = await db.execute(
        select(CCResearchSession)
        .where(CCResearchSession.id == ccresearch_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    workspace = Path(session.workspace_dir)

    # Resolve requested path (prevent directory traversal)
    if path:
        target_path = (workspace / path).resolve()
        # Ensure target is within workspace
        if not str(target_path).startswith(str(workspace.resolve())):
            raise HTTPException(status_code=403, detail="Access denied")
    else:
        target_path = workspace

    if not target_path.exists():
        raise HTTPException(status_code=404, detail="Path not found")

    if not target_path.is_dir():
        raise HTTPException(status_code=400, detail="Path is not a directory")

    files = []
    # Resolve workspace to handle symlinks (e.g., /data -> /media/ace/T7/dev)
    workspace_resolved = workspace.resolve()
    # Block sensitive files from listing
    BLOCKED_FILES = {'.credentials.json', 'credentials.json', '.env', '.secrets'}
    for item in sorted(target_path.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower())):
        # Skip hidden files starting with . except .claude directory
        if item.name.startswith('.') and item.name != '.claude':
            continue
        # Skip sensitive credential files
        if item.name in BLOCKED_FILES:
            continue

        try:
            stat = item.stat()
            rel_path = str(item.resolve().relative_to(workspace_resolved))
            files.append(FileInfo(
                name=item.name,
                path=rel_path,
                is_dir=item.is_dir(),
                size=stat.st_size if item.is_file() else 0,
                modified_at=datetime.fromtimestamp(stat.st_mtime)
            ))
        except (OSError, ValueError) as e:
            logger.warning(f"Error reading file {item}: {e}")
            continue

    return FileListResponse(
        files=files,
        current_path=path or "/"
    )


@router.get("/sessions/{ccresearch_id}/files/download")
async def download_file(
    ccresearch_id: str,
    path: str,
    db: AsyncSession = Depends(get_db)
):
    """Download a file from session workspace"""
    # Rate limiting
    if not file_rate_limiter.is_allowed(ccresearch_id):
        raise HTTPException(status_code=429, detail="Too many requests. Please wait a moment.")

    result = await db.execute(
        select(CCResearchSession)
        .where(CCResearchSession.id == ccresearch_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    workspace = Path(session.workspace_dir)

    # Resolve requested path (prevent directory traversal)
    target_path = (workspace / path).resolve()

    # Ensure target is within workspace
    if not str(target_path).startswith(str(workspace.resolve())):
        raise HTTPException(status_code=403, detail="Access denied")

    # Block access to sensitive credential files
    BLOCKED_FILES = {'.credentials.json', 'credentials.json', '.env', '.secrets'}
    if target_path.name in BLOCKED_FILES:
        raise HTTPException(status_code=403, detail="Access to credential files is not allowed")

    if not target_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    if not target_path.is_file():
        raise HTTPException(status_code=400, detail="Path is not a file")

    # Determine MIME type
    mime_type, _ = mimetypes.guess_type(str(target_path))
    if not mime_type:
        mime_type = "application/octet-stream"

    return FileResponse(
        path=target_path,
        filename=target_path.name,
        media_type=mime_type
    )


@router.get("/sessions/{ccresearch_id}/files/content")
async def read_file_content(
    ccresearch_id: str,
    path: str,
    db: AsyncSession = Depends(get_db)
):
    """Read text content of a file (for preview)"""
    # Rate limiting
    if not file_rate_limiter.is_allowed(ccresearch_id):
        raise HTTPException(status_code=429, detail="Too many requests. Please wait a moment.")

    result = await db.execute(
        select(CCResearchSession)
        .where(CCResearchSession.id == ccresearch_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    workspace = Path(session.workspace_dir)

    # Resolve requested path (prevent directory traversal)
    target_path = (workspace / path).resolve()

    # Ensure target is within workspace
    if not str(target_path).startswith(str(workspace.resolve())):
        raise HTTPException(status_code=403, detail="Access denied")

    # Block access to sensitive credential files
    BLOCKED_FILES = {'.credentials.json', 'credentials.json', '.env', '.secrets'}
    if target_path.name in BLOCKED_FILES:
        raise HTTPException(status_code=403, detail="Access to credential files is not allowed")

    if not target_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    if not target_path.is_file():
        raise HTTPException(status_code=400, detail="Path is not a file")

    # Check file size (limit to 1MB for preview)
    if target_path.stat().st_size > 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large for preview")

    # Try to read as text
    try:
        content = target_path.read_text(encoding='utf-8')
        return {"content": content, "path": path, "name": target_path.name}
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File is not text (binary file)")


@router.get("/sessions/{ccresearch_id}/download-zip")
async def download_workspace_zip(
    ccresearch_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Download entire workspace directory as ZIP file"""
    result = await db.execute(
        select(CCResearchSession)
        .where(CCResearchSession.id == ccresearch_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    workspace = Path(session.workspace_dir)

    if not workspace.exists():
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Create temporary ZIP file
    temp_dir = tempfile.mkdtemp()
    zip_filename = f"ccresearch_{ccresearch_id[:8]}.zip"
    zip_path = Path(temp_dir) / zip_filename

    try:
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for file_path in workspace.rglob('*'):
                if file_path.is_file():
                    # Get relative path from workspace root
                    rel_path = file_path.relative_to(workspace)
                    zipf.write(file_path, rel_path)

        # Return file and schedule cleanup
        def cleanup():
            try:
                shutil.rmtree(temp_dir)
            except Exception as e:
                logger.error(f"Failed to cleanup temp dir: {e}")

        return FileResponse(
            path=zip_path,
            filename=zip_filename,
            media_type="application/zip",
            background=cleanup
        )

    except Exception as e:
        # Cleanup on error
        shutil.rmtree(temp_dir, ignore_errors=True)
        logger.error(f"Failed to create ZIP: {e}")
        raise HTTPException(status_code=500, detail="Failed to create ZIP file")


# ============ Project Management Endpoints ============

@router.post("/sessions/{ccresearch_id}/save-project", response_model=SaveProjectResponse)
async def save_session_as_project(
    ccresearch_id: str,
    request: SaveProjectRequest,
    db: AsyncSession = Depends(get_db)
):
    """Save current session workspace as a persistent project on SSD"""
    result = await db.execute(
        select(CCResearchSession)
        .where(CCResearchSession.id == ccresearch_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    workspace = Path(session.workspace_dir)
    if not workspace.exists():
        raise HTTPException(status_code=404, detail="Workspace not found")

    project_path = ccresearch_manager.save_project(
        workspace,
        request.project_name,
        request.description or ""
    )

    if not project_path:
        raise HTTPException(status_code=500, detail="Failed to save project")

    logger.info(f"Saved session {ccresearch_id} as project '{request.project_name}'")

    return SaveProjectResponse(
        name=request.project_name,
        path=str(project_path),
        saved_at=datetime.utcnow().isoformat()
    )


@router.get("/projects", response_model=List[ProjectInfo])
async def list_projects():
    """List all saved projects on SSD"""
    projects = ccresearch_manager.list_saved_projects()
    return [ProjectInfo(**p) for p in projects]


@router.post("/sessions/from-project", response_model=SessionResponse)
async def create_session_from_project(
    request: CreateFromProjectRequest,
    db: AsyncSession = Depends(get_db)
):
    """Create a new session by restoring a saved project"""
    # Validate email against whitelist
    if not is_email_allowed(request.email):
        logger.warning(f"Access denied for email: {request.email}")
        raise HTTPException(
            status_code=403,
            detail="Access denied. Your email is not authorized to use CCResearch. Please contact the administrator."
        )

    ccresearch_id = str(uuid.uuid4())

    # Restore project files to new workspace
    workspace_dir = ccresearch_manager.restore_project(
        request.project_name,
        ccresearch_id
    )

    if not workspace_dir:
        raise HTTPException(
            status_code=404,
            detail=f"Project '{request.project_name}' not found"
        )

    # Create database entry
    session = CCResearchSession(
        id=ccresearch_id,
        session_id=request.session_id,
        email=request.email,
        title=request.title or f"Restored: {request.project_name}",
        workspace_dir=str(workspace_dir),
        status="created",
        expires_at=datetime.utcnow() + timedelta(hours=24)
    )

    db.add(session)
    await db.commit()
    await db.refresh(session)

    logger.info(f"Created session {ccresearch_id} from project '{request.project_name}'")

    return SessionResponse(
        id=session.id,
        session_id=session.session_id,
        email=session.email,
        title=session.title,
        workspace_dir=session.workspace_dir,
        status=session.status,
        terminal_rows=session.terminal_rows,
        terminal_cols=session.terminal_cols,
        commands_executed=session.commands_executed,
        created_at=session.created_at,
        last_activity_at=session.last_activity_at,
        expires_at=session.expires_at,
        uploaded_files=None,
        is_admin=session.is_admin
    )


@router.delete("/projects/{project_name}")
async def delete_project(project_name: str):
    """Delete a saved project from SSD"""
    success = ccresearch_manager.delete_project(project_name)

    if not success:
        raise HTTPException(status_code=404, detail="Project not found")

    logger.info(f"Deleted project '{project_name}'")
    return {"status": "deleted", "name": project_name}


# ============ Session Monitoring Endpoints ============

@router.get("/sessions/{ccresearch_id}/log")
async def get_session_log(
    ccresearch_id: str,
    lines: int = 200,
    db: AsyncSession = Depends(get_db)
):
    """
    Get the terminal log for a session.

    This returns the raw terminal output captured during the session,
    useful for debugging and monitoring what Claude is doing.

    Args:
        ccresearch_id: Session ID
        lines: Number of lines to return (default 200)

    Returns:
        Log content or error
    """
    # Verify session exists
    result = await db.execute(
        select(CCResearchSession)
        .where(CCResearchSession.id == ccresearch_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Get log content
    log_content = ccresearch_manager.read_session_log(ccresearch_id, lines)

    if log_content is None:
        # Try to find the log file path
        log_path = ccresearch_manager.get_session_log_path(ccresearch_id)
        if log_path:
            return {"log": f"Log file exists but couldn't be read: {log_path}", "lines": 0}
        return {"log": "No log file found for this session", "lines": 0}

    return {
        "log": log_content,
        "lines": len(log_content.splitlines()),
        "session_id": ccresearch_id
    }


@router.get("/sessions/{ccresearch_id}/buffer")
async def get_session_buffer(
    ccresearch_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get the current output buffer for a session (live monitoring).

    This returns the recent terminal output used for automation pattern matching.
    Only works for active sessions.

    Args:
        ccresearch_id: Session ID

    Returns:
        Current output buffer content
    """
    # Verify session exists
    result = await db.execute(
        select(CCResearchSession)
        .where(CCResearchSession.id == ccresearch_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Get buffer content
    buffer_content = ccresearch_manager.get_output_buffer(ccresearch_id)

    if buffer_content is None:
        return {
            "buffer": "",
            "active": False,
            "message": "Session not active or no buffer available"
        }

    return {
        "buffer": buffer_content,
        "active": True,
        "length": len(buffer_content),
        "session_id": ccresearch_id
    }


@router.get("/automation/rules")
async def get_automation_rules():
    """
    Get the current automation rules configuration.

    Returns the list of patterns that trigger automatic responses.
    """
    from app.core.ccresearch_manager import AUTOMATION_RULES

    return {
        "rules": AUTOMATION_RULES,
        "count": len(AUTOMATION_RULES)
    }


# ============ WebSocket Endpoint ============

@router.websocket("/terminal/{ccresearch_id}")
async def terminal_websocket(
    websocket: WebSocket,
    ccresearch_id: str
):
    """Bidirectional terminal I/O via WebSocket"""
    await websocket.accept()

    # Log connection info
    origin = websocket.headers.get("origin", "unknown")
    logger.info(f"WebSocket connected for session {ccresearch_id} from {origin}")

    # Get database session
    async for db in get_db():
        try:
            # Validate session exists
            result = await db.execute(
                select(CCResearchSession)
                .where(CCResearchSession.id == ccresearch_id)
            )
            session = result.scalar_one_or_none()

            if not session:
                await websocket.send_json({
                    "type": "error",
                    "error": "Session not found"
                })
                await websocket.close()
                return

            # Check if expired
            if session.expires_at < datetime.utcnow():
                await websocket.send_json({
                    "type": "error",
                    "error": "Session expired"
                })
                await websocket.close()
                return

            # Define output callback to send data to WebSocket
            async def send_output(data: bytes):
                try:
                    await websocket.send_bytes(data)
                except Exception as e:
                    logger.error(f"Failed to send output: {e}")

            # Define automation callback to notify client of triggered rules
            async def send_automation_notification(notification: dict):
                try:
                    await websocket.send_json(notification)
                    logger.info(f"Sent automation notification: {notification.get('description')}")
                except Exception as e:
                    logger.error(f"Failed to send automation notification: {e}")

            # OAuth mode - no API key needed, uses server's Claude subscription
            # NOTE: is_admin column exists for future use but currently all sessions use global sandbox setting
            # TODO: Enable admin bypass when ready: use_sandbox = settings.CCRESEARCH_SANDBOX_ENABLED and not session.is_admin

            # Spawn or reconnect to Claude process
            success = await ccresearch_manager.spawn_claude(
                ccresearch_id,
                Path(session.workspace_dir),
                session.terminal_rows,
                session.terminal_cols,
                send_output,
                sandboxed=settings.CCRESEARCH_SANDBOX_ENABLED,
                automation_callback=send_automation_notification
            )

            if not success:
                await websocket.send_json({
                    "type": "error",
                    "error": "Failed to start Claude Code. Ensure 'claude' CLI is installed."
                })
                await websocket.close()
                return

            # Update session status
            session.status = "active"
            session.last_activity_at = datetime.utcnow()
            await db.commit()

            # Send status message
            await websocket.send_json({
                "type": "status",
                "status": "connected",
                "pid": ccresearch_manager.processes.get(ccresearch_id).process.pid
                if ccresearch_id in ccresearch_manager.processes else None
            })

            # Main message loop
            try:
                while True:
                    message = await websocket.receive()

                    if "bytes" in message:
                        # Raw input -> Claude stdin
                        await ccresearch_manager.write_input(
                            ccresearch_id,
                            message["bytes"]
                        )
                        session.commands_executed += 1
                        session.last_activity_at = datetime.utcnow()

                    elif "text" in message:
                        # JSON command
                        try:
                            data = json.loads(message["text"])

                            if data.get("type") == "resize":
                                rows = data.get("rows", 24)
                                cols = data.get("cols", 80)
                                await ccresearch_manager.resize_terminal(
                                    ccresearch_id, rows, cols
                                )
                                session.terminal_rows = rows
                                session.terminal_cols = cols

                            elif data.get("type") == "ping":
                                await websocket.send_json({"type": "pong"})

                        except json.JSONDecodeError:
                            logger.warning(f"Invalid JSON received: {message['text'][:100]}")

                    await db.commit()

            except WebSocketDisconnect:
                logger.info(f"WebSocket disconnected: {ccresearch_id}")
            except Exception as e:
                logger.error(f"WebSocket error: {e}")

            # Don't terminate process on disconnect - allow reconnect
            session.status = "disconnected"
            await db.commit()

        except Exception as e:
            logger.error(f"Session error: {e}")
            try:
                await websocket.send_json({
                    "type": "error",
                    "error": str(e)
                })
            except:
                pass
        finally:
            break  # Exit the generator


# ============ Cleanup Functions ============

async def cleanup_expired_sessions(db: AsyncSession) -> int:
    """Cleanup expired sessions from database and filesystem"""
    # Find expired sessions
    result = await db.execute(
        select(CCResearchSession)
        .where(CCResearchSession.expires_at < datetime.utcnow())
    )
    expired_sessions = result.scalars().all()

    deleted = 0
    for session in expired_sessions:
        try:
            # Terminate process if running
            await ccresearch_manager.terminate_session(session.id)

            # Delete workspace
            ccresearch_manager.delete_workspace(Path(session.workspace_dir))

            # Delete from database
            await db.execute(
                delete(CCResearchSession)
                .where(CCResearchSession.id == session.id)
            )
            deleted += 1
            logger.info(f"Cleaned up expired session: {session.id}")

        except Exception as e:
            logger.error(f"Failed to cleanup session {session.id}: {e}")

    await db.commit()
    return deleted

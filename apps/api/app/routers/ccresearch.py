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
import secrets
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends, UploadFile, File, Form, Request
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.config import settings
from app.core.ccresearch_manager import ccresearch_manager
from app.core.session_manager import session_manager, get_user_id_from_email
from app.core.project_manager import get_project_manager
from app.core.notifications import notify_access_request, notify_plugin_skill_request
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


def load_access_config() -> dict:
    """Load access configuration (emails and access key) from file."""
    try:
        if ALLOWED_EMAILS_FILE.exists():
            with open(ALLOWED_EMAILS_FILE, 'r') as f:
                data = json.load(f)
                return data
    except Exception as e:
        logger.error(f"Failed to load access config: {e}")
    return {"allowed_emails": [], "access_key": None}


def load_allowed_emails() -> set:
    """Load allowed emails from whitelist file."""
    config = load_access_config()
    emails = set(e.lower() for e in config.get("allowed_emails", []))
    logger.debug(f"Loaded {len(emails)} allowed emails")
    return emails


def get_access_key() -> str:
    """Get the required access key for CCResearch."""
    config = load_access_config()
    return config.get("access_key", "")


def is_email_allowed(email: str) -> bool:
    """Check if email is in the whitelist."""
    if not email:
        return False
    allowed = load_allowed_emails()
    return email.lower() in allowed


def is_access_key_valid(access_key: str) -> bool:
    """Check if the provided access key matches the configured key."""
    if not access_key:
        return False
    stored_key = get_access_key()
    if not stored_key:
        # No access key configured - allow access (backwards compatibility)
        return True
    return access_key == stored_key


# ============ Pydantic Schemas ============

class CreateSessionRequest(BaseModel):
    session_id: str  # Browser session ID
    email: EmailStr  # User's email address
    title: Optional[str] = None


class ResizeRequest(BaseModel):
    rows: int
    cols: int


class RenameRequest(BaseModel):
    title: str


class SessionResponse(BaseModel):
    id: str
    session_id: str
    email: str
    session_number: int  # Per-user incremental number
    title: str
    workspace_dir: str
    workspace_project: Optional[str] = None  # Linked Workspace project name
    status: str
    session_mode: str = "claude"  # "claude" or "terminal" (direct Pi access)
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


class AccessRequestModel(BaseModel):
    email: EmailStr
    name: str
    reason: str


class PluginSkillRequestModel(BaseModel):
    email: EmailStr
    request_type: str  # "plugin" or "skill"
    name: str
    description: str
    use_case: str


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
    email: Optional[str] = None
    saved_at: str
    files: Optional[List[str]] = None


class CreateFromProjectRequest(BaseModel):
    session_id: str  # Browser session ID
    email: EmailStr
    access_key: Optional[str] = None  # Optional - if provided, grants direct terminal access
    project_name: str
    title: Optional[str] = None


class UploadResponse(BaseModel):
    uploaded_files: List[str]
    data_dir: str


class ShareResponse(BaseModel):
    share_token: str
    share_url: str
    shared_at: datetime
    expires_at: datetime  # When the share link expires


class SharedSessionResponse(BaseModel):
    """Public response for shared sessions (limited info)"""
    id: str
    title: str
    email: str  # Show who created it
    created_at: datetime
    shared_at: datetime
    expires_at: Optional[datetime] = None  # When the share link expires
    files_count: int
    has_log: bool


class GitCloneRequest(BaseModel):
    repo_url: str  # GitHub URL (https://github.com/user/repo or git@github.com:user/repo)
    target_path: Optional[str] = None  # Relative path within workspace (default: data/)
    branch: Optional[str] = None  # Specific branch to clone


class GitCloneResponse(BaseModel):
    success: bool
    repo_name: str
    clone_path: str
    message: str


# ============ Helper Functions ============

async def ensure_project_claude_setup(
    workspace_dir: Path,
    session_id: str,
    email: str,
    force: bool = False
) -> None:
    """Ensure CLAUDE.md and .claude/settings.local.json exist for a project.
    
    This is called when starting a terminal session to ensure proper 
    workspace boundaries and permissions are in place.
    
    Args:
        workspace_dir: Path to project directory
        session_id: CCResearch session ID
        email: User's email
        force: If True, overwrite existing CLAUDE.md (use for new projects)
    """
    from app.core.ccresearch_manager import CLAUDE_MD_TEMPLATE, CCRESEARCH_PERMISSIONS_TEMPLATE
    
    # Ensure .claude directory exists
    claude_dir = workspace_dir / ".claude"
    claude_dir.mkdir(parents=True, exist_ok=True)
    
    # Create/update CLAUDE.md
    claude_md_path = workspace_dir / "CLAUDE.md"
    should_write_claude_md = force or not claude_md_path.exists() or claude_md_path.stat().st_size == 0
    
    if should_write_claude_md:
        claude_md_content = CLAUDE_MD_TEMPLATE.format(
            session_id=session_id,
            email=email or "Not provided",
            created_at=datetime.utcnow().isoformat(),
            workspace_dir=str(workspace_dir),
            uploaded_files_section=""
        )
        claude_md_path.write_text(claude_md_content)
        logger.info(f"{'Overwrote' if force else 'Created'} CLAUDE.md for project at {workspace_dir}")
    
    # Always ensure settings.local.json exists with security rules
    settings_local_path = claude_dir / "settings.local.json"
    if force or not settings_local_path.exists():
        settings_local_path.write_text(json.dumps(CCRESEARCH_PERMISSIONS_TEMPLATE, indent=2))
        logger.info(f"{'Overwrote' if force else 'Created'} .claude/settings.local.json for project at {workspace_dir}")


# ============ REST Endpoints ============

@router.post("/sessions", response_model=SessionResponse)
async def create_session(
    session_id: str = Form(...),
    email: str = Form(...),  # Email from authenticated user
    access_key: Optional[str] = Form(None),  # Optional - if provided, grants direct terminal access
    title: Optional[str] = Form(None),
    project_name: Optional[str] = Form(None),  # New: Create/use unified project
    workspace_project: Optional[str] = Form(None),  # Legacy: link to old Workspace project
    files: List[UploadFile] = File(default=[]),
    db: AsyncSession = Depends(get_db)
):
    """Create a new CCResearch session with workspace directory and optional file uploads.

    Authentication is handled by the frontend (login required with 24h trial).

    Session modes:
    - No access key = Claude Code session (default)
    - Valid access key = Direct terminal access to Pi (SSD)
    - Wrong access key = Error

    Project handling (priority order):
    1. If project_name is provided: Create/use unified project at /data/users/{user-id}/projects/{name}/
    2. If workspace_project is provided: Link to legacy Workspace project
    3. Otherwise: Create session-specific directory
    """
    # Determine session mode based on access key
    session_mode = "claude"  # Default: Claude Code
    if access_key:
        # Access key provided - validate it
        if is_access_key_valid(access_key):
            session_mode = "terminal"  # Direct Pi terminal access
            logger.info(f"Terminal mode session for {email}")
        else:
            logger.warning(f"Invalid access key attempt from email: {email}")
            raise HTTPException(
                status_code=403,
                detail="wrong_access_key"  # Frontend will show "Wrong code - try again"
            )

    # Get next session number for this user
    result = await db.execute(
        select(func.coalesce(func.max(CCResearchSession.session_number), 0))
        .where(CCResearchSession.email == email.lower())
    )
    max_session_number = result.scalar() or 0
    next_session_number = max_session_number + 1

    ccresearch_id = str(uuid.uuid4())

    # Process uploaded files info
    uploaded_files_list = []

    # Look up user_id from email for unified session storage
    user_id = await get_user_id_from_email(email.lower())

    # Determine workspace location
    workspace_dir = None
    linked_project_name = None  # Track the project name for the response

    # Priority 1: Unified project (new architecture)
    if project_name and user_id:
        pm = get_project_manager(user_id)

        # Check if project already exists
        existing_project = await pm.get_project(project_name)
        if existing_project:
            # Use existing project
            workspace_dir = Path(existing_project["path"])
            linked_project_name = existing_project["name"]
            logger.info(f"Using existing project '{project_name}' at {workspace_dir}")

            # Ensure CLAUDE.md and permissions exist (fixes projects created without them)
            await ensure_project_claude_setup(workspace_dir, ccresearch_id, email)

            # Update terminal status
            await pm.update_terminal_status(project_name, ccresearch_id, "active")
        else:
            # Create new project
            project = await pm.create_project(
                name=project_name,
                created_by="ccresearch",
                owner_email=email.lower()
            )
            workspace_dir = await pm.get_project_path(project_name)
            linked_project_name = project["name"]

            # Override with CCResearch security template (more comprehensive than default)
            await ensure_project_claude_setup(workspace_dir, ccresearch_id, email, force=True)

            # Update terminal status
            await pm.update_terminal_status(project_name, ccresearch_id, "active")
            logger.info(f"Created unified project '{project_name}' at {workspace_dir}")

    # Priority 2: Legacy workspace project link
    elif workspace_project:
        # Create workspace in Workspace project's data/ directory
        from app.core.config import settings
        project_data_path = Path(settings.WORKSPACE_PROJECTS_DIR) / workspace_project / "data" / f"research-{ccresearch_id[:8]}"
        project_data_path.mkdir(parents=True, exist_ok=True)
        workspace_dir = project_data_path
        logger.info(f"Created workspace in project '{workspace_project}' at {workspace_dir}")

        # Write minimal CLAUDE.md for linked workspace
        claude_md_path = workspace_dir / "CLAUDE.md"
        claude_md_content = f"""# Research Session (Workspace: {workspace_project})

**Session ID:** {ccresearch_id}
**Email:** {email}
**Linked to:** Workspace project "{workspace_project}"

Files created here will appear in the Workspace Files tab.

---

*CCResearch - Claude Code Research Platform*
"""
        claude_md_path.write_text(claude_md_content)

    # Priority 3: Session-specific directory for authenticated users
    elif user_id:
        # Use unified session manager for registered users
        mode_label = "Terminal" if session_mode == "terminal" else "Claude"
        default_title = f"{mode_label} #{next_session_number} - {datetime.utcnow().strftime('%b %d')}"

        session_metadata = session_manager.create_session(
            user_id=user_id,
            title=title or default_title,
            created_by="ccresearch",
            email=email,
            tags=["ccresearch"],
            terminal_enabled=True,
            session_id=ccresearch_id,
        )
        workspace_dir = session_manager.get_session_dir(user_id, ccresearch_id)
        logger.info(f"Created unified session {ccresearch_id} for user {user_id} at {workspace_dir}")

        # Override with CCResearch-specific CLAUDE.md and permissions
        from app.core.ccresearch_manager import CLAUDE_MD_TEMPLATE, CCRESEARCH_PERMISSIONS_TEMPLATE
        claude_md_path = workspace_dir / "CLAUDE.md"
        claude_md_content = CLAUDE_MD_TEMPLATE.format(
            session_id=ccresearch_id,
            email=email or "Not provided",
            created_at=datetime.utcnow().isoformat(),
            workspace_dir=str(workspace_dir),
            uploaded_files_section=""
        )
        claude_md_path.write_text(claude_md_content)

        # Write CCResearch permissions with comprehensive deny rules
        settings_local_path = workspace_dir / ".claude" / "settings.local.json"
        settings_local_path.write_text(json.dumps(CCRESEARCH_PERMISSIONS_TEMPLATE, indent=2))

    # Fallback: Create workspace in default location (for users not in DB)
    else:
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

    # Generate default title with session number and date
    mode_label = "Terminal" if session_mode == "terminal" else "Claude"
    default_title = f"{mode_label} #{next_session_number} - {datetime.utcnow().strftime('%b %d')}"

    # Create database entry (store email lowercase for consistent matching)
    # Use project name as title if provided, otherwise use default
    mode_label = "Terminal" if session_mode == "terminal" else "Claude"
    default_title = f"{mode_label} #{next_session_number} - {datetime.utcnow().strftime('%b %d')}"

    session = CCResearchSession(
        id=ccresearch_id,
        session_id=session_id,
        email=email.lower(),
        session_number=next_session_number,
        title=title or linked_project_name or default_title,
        workspace_dir=str(workspace_dir),
        workspace_project=linked_project_name or workspace_project,  # Unified project or legacy
        status="created",
        session_mode=session_mode,  # "claude" or "terminal"
        uploaded_files=json.dumps(uploaded_files_list) if uploaded_files_list else None,
        auth_mode="oauth",  # Keep for database compatibility
        is_admin=session_mode == "terminal",  # Terminal mode = admin access
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
        session_number=session.session_number,
        title=session.title,
        workspace_dir=session.workspace_dir,
        workspace_project=session.workspace_project,
        status=session.status,
        session_mode=session.session_mode,
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


def is_local_network(client_ip: str) -> bool:
    """Check if the client IP is from a local/private network."""
    import ipaddress
    try:
        ip = ipaddress.ip_address(client_ip)
        # Check for private networks (RFC 1918) and loopback
        return ip.is_private or ip.is_loopback
    except ValueError:
        return False


@router.post("/sessions/{ccresearch_id}/upload-local", response_model=UploadResponse)
async def upload_files_local(
    ccresearch_id: str,
    request: Request,
    files: List[UploadFile] = File(...),
    target_path: Optional[str] = Form(None),
    extract_zip: bool = Form(True),
    db: AsyncSession = Depends(get_db)
):
    """Upload large files from local network (bypasses Cloudflare limits).

    This endpoint:
    - Only works from local/private IP addresses (192.168.x.x, 10.x.x.x, etc.)
    - Has no file size limit (streams to disk)
    - Supports files up to 2GB per file, 10GB total per request
    - Auto-extracts ZIP files if extract_zip=True

    Use this instead of /upload when uploading large files from the same network.
    """
    # Get client IP - check X-Forwarded-For for proxied requests, else use direct IP
    client_ip = request.headers.get("X-Real-IP") or \
                request.headers.get("X-Forwarded-For", "").split(",")[0].strip() or \
                request.client.host if request.client else "0.0.0.0"

    # Security: Only allow from local network
    if not is_local_network(client_ip):
        logger.warning(f"Local upload rejected from non-local IP: {client_ip}")
        raise HTTPException(
            status_code=403,
            detail=f"This endpoint is only accessible from local network. Your IP: {client_ip}"
        )

    logger.info(f"Local upload from {client_ip} for session {ccresearch_id}")

    # Get session
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
        target_dir = (workspace / target_path).resolve()
        if not str(target_dir).startswith(str(workspace.resolve())):
            raise HTTPException(status_code=403, detail="Invalid target path")
    else:
        target_dir = workspace / "data"

    target_dir.mkdir(parents=True, exist_ok=True)

    uploaded_files_list = []
    existing_files = json.loads(session.uploaded_files) if session.uploaded_files else []

    # Higher limits for local upload
    MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024  # 2GB per file
    MAX_TOTAL_SIZE = 10 * 1024 * 1024 * 1024  # 10GB total
    total_size = 0

    for file in files:
        if not file.filename:
            continue

        # Stream file to temp location first, then move
        safe_filename = Path(file.filename).name
        temp_path = target_dir / f".uploading_{safe_filename}"
        final_path = target_dir / safe_filename

        try:
            file_size = 0
            async with aiofiles.open(temp_path, 'wb') as out_file:
                # Stream in chunks to handle large files
                chunk_size = 1024 * 1024  # 1MB chunks
                while True:
                    chunk = await file.read(chunk_size)
                    if not chunk:
                        break
                    file_size += len(chunk)

                    # Check limits
                    if file_size > MAX_FILE_SIZE:
                        await out_file.close()
                        temp_path.unlink(missing_ok=True)
                        raise HTTPException(
                            status_code=413,
                            detail=f"File '{file.filename}' exceeds 2GB limit"
                        )

                    total_size += len(chunk)
                    if total_size > MAX_TOTAL_SIZE:
                        await out_file.close()
                        temp_path.unlink(missing_ok=True)
                        raise HTTPException(
                            status_code=413,
                            detail="Total upload size exceeds 10GB limit"
                        )

                    await out_file.write(chunk)

            # Handle ZIP extraction
            if extract_zip and safe_filename.lower().endswith('.zip'):
                try:
                    MAX_ZIP_SIZE = 10 * 1024 * 1024 * 1024  # 10GB for local
                    MAX_ZIP_FILES = 10000

                    with zipfile.ZipFile(temp_path, 'r') as zip_ref:
                        total_uncompressed = sum(info.file_size for info in zip_ref.infolist())

                        if total_uncompressed > MAX_ZIP_SIZE:
                            raise HTTPException(
                                status_code=400,
                                detail=f"ZIP contents too large: {total_uncompressed // (1024*1024)}MB"
                            )

                        if len(zip_ref.infolist()) > MAX_ZIP_FILES:
                            raise HTTPException(
                                status_code=400,
                                detail=f"ZIP has too many files: {len(zip_ref.infolist())}"
                            )

                        for zip_info in zip_ref.infolist():
                            if zip_info.is_dir():
                                continue
                            if '..' in zip_info.filename or zip_info.filename.startswith('/'):
                                continue

                            extracted_path = target_dir / zip_info.filename
                            extracted_path.parent.mkdir(parents=True, exist_ok=True)

                            with zip_ref.open(zip_info) as src:
                                async with aiofiles.open(extracted_path, 'wb') as dst:
                                    # Stream extraction
                                    while True:
                                        chunk = src.read(1024 * 1024)
                                        if not chunk:
                                            break
                                        await dst.write(chunk)

                            uploaded_files_list.append(str(extracted_path.relative_to(workspace)))

                    # Remove the ZIP after extraction
                    temp_path.unlink(missing_ok=True)
                    logger.info(f"Extracted ZIP {file.filename} ({file_size // (1024*1024)}MB)")

                except zipfile.BadZipFile:
                    # Not a valid ZIP, save as regular file
                    temp_path.rename(final_path)
                    uploaded_files_list.append(str(final_path.relative_to(workspace)))
            else:
                # Move temp file to final location
                temp_path.rename(final_path)
                uploaded_files_list.append(str(final_path.relative_to(workspace)))
                logger.info(f"Uploaded {file.filename} ({file_size // (1024*1024)}MB)")

        except Exception as e:
            # Cleanup on error
            temp_path.unlink(missing_ok=True)
            if not isinstance(e, HTTPException):
                logger.error(f"Upload error: {e}")
                raise HTTPException(status_code=500, detail=str(e))
            raise

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

    logger.info(f"Local upload complete: {len(uploaded_files_list)} files to {ccresearch_id}")

    return UploadResponse(
        uploaded_files=uploaded_files_list,
        data_dir=str(target_dir)
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


class WebFetchRequest(BaseModel):
    url: str


class WebFetchResponse(BaseModel):
    success: bool
    filename: str
    path: str
    message: str


@router.post("/sessions/{ccresearch_id}/fetch-url", response_model=WebFetchResponse)
async def fetch_web_url(
    ccresearch_id: str,
    request: WebFetchRequest,
    db: AsyncSession = Depends(get_db)
):
    """Fetch a web URL and save content as markdown file.

    Converts HTML to a clean markdown format and saves to data/ directory.
    """
    import httpx
    from bs4 import BeautifulSoup
    from urllib.parse import urlparse, urljoin

    # Get session
    result = await db.execute(
        select(CCResearchSession)
        .where(CCResearchSession.id == ccresearch_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    workspace = Path(session.workspace_dir)
    url = request.url.strip()

    # Validate URL
    try:
        parsed = urlparse(url)
        if not parsed.scheme or not parsed.netloc:
            raise ValueError("Invalid URL")
        if parsed.scheme not in ('http', 'https'):
            raise ValueError("Only HTTP/HTTPS URLs allowed")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid URL format")

    # Fetch the URL
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
            headers = {
                'User-Agent': 'Mozilla/5.0 (compatible; ACeToolkit/1.0; Research Bot)'
            }
            response = await client.get(url, headers=headers)
            response.raise_for_status()
    except httpx.TimeoutException:
        raise HTTPException(status_code=408, detail="Request timed out")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=400, detail=f"HTTP error: {e.response.status_code}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {str(e)}")

    content_type = response.headers.get('content-type', '')

    # Convert HTML to markdown
    if 'text/html' in content_type:
        soup = BeautifulSoup(response.text, 'html.parser')

        # Remove scripts, styles, and navigation
        for tag in soup.find_all(['script', 'style', 'nav', 'header', 'footer', 'aside', 'noscript']):
            tag.decompose()

        # Get title
        title = soup.title.string if soup.title else parsed.netloc
        title = title.strip() if title else 'Untitled'

        # Get main content (try various selectors)
        main_content = soup.find('main') or soup.find('article') or soup.find(class_='content') or soup.find('body')

        # Build markdown
        markdown_lines = [
            f"# {title}",
            "",
            f"> Source: {url}",
            f"> Fetched: {datetime.utcnow().isoformat()}Z",
            "",
            "---",
            "",
        ]

        if main_content:
            # Convert common HTML elements to markdown
            for elem in main_content.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'pre', 'code', 'blockquote', 'a', 'img']):
                if elem.name.startswith('h'):
                    level = int(elem.name[1])
                    text = elem.get_text(strip=True)
                    if text:
                        markdown_lines.append(f"{'#' * level} {text}")
                        markdown_lines.append("")
                elif elem.name == 'p':
                    text = elem.get_text(strip=True)
                    if text:
                        markdown_lines.append(text)
                        markdown_lines.append("")
                elif elem.name == 'li':
                    text = elem.get_text(strip=True)
                    if text:
                        markdown_lines.append(f"- {text}")
                elif elem.name == 'pre' or elem.name == 'code':
                    code = elem.get_text()
                    if code.strip():
                        markdown_lines.append("```")
                        markdown_lines.append(code)
                        markdown_lines.append("```")
                        markdown_lines.append("")
                elif elem.name == 'blockquote':
                    text = elem.get_text(strip=True)
                    if text:
                        markdown_lines.append(f"> {text}")
                        markdown_lines.append("")
                elif elem.name == 'a':
                    href = elem.get('href')
                    text = elem.get_text(strip=True)
                    if href and text:
                        # Make relative URLs absolute
                        if not href.startswith(('http://', 'https://')):
                            href = urljoin(url, href)
                        markdown_lines.append(f"[{text}]({href})")
                elif elem.name == 'img':
                    src = elem.get('src')
                    alt = elem.get('alt', 'image')
                    if src:
                        if not src.startswith(('http://', 'https://')):
                            src = urljoin(url, src)
                        markdown_lines.append(f"![{alt}]({src})")
                        markdown_lines.append("")

        markdown_content = '\n'.join(markdown_lines)
    else:
        # For non-HTML content, save as plain text with metadata
        markdown_content = f"""# Content from {parsed.netloc}

> Source: {url}
> Content-Type: {content_type}
> Fetched: {datetime.utcnow().isoformat()}Z

---

```
{response.text[:50000]}
```
"""

    # Generate filename from URL
    safe_title = re.sub(r'[^\w\s-]', '', parsed.netloc + '_' + (parsed.path or 'index'))
    safe_title = re.sub(r'[-\s]+', '-', safe_title).strip('-')[:50]
    filename = f"{safe_title}.md"

    # Save to data directory
    data_dir = workspace / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    file_path = data_dir / filename

    # Ensure unique filename
    counter = 1
    while file_path.exists():
        filename = f"{safe_title}_{counter}.md"
        file_path = data_dir / filename
        counter += 1

    async with aiofiles.open(file_path, 'w', encoding='utf-8') as f:
        await f.write(markdown_content)

    # Update uploaded_files in database
    existing_files = json.loads(session.uploaded_files) if session.uploaded_files else []
    rel_path = f"data/{filename}"
    if rel_path not in existing_files:
        existing_files.append(rel_path)
    session.uploaded_files = json.dumps(existing_files)
    await db.commit()

    # Update CLAUDE.md
    ccresearch_manager.update_workspace_claude_md(
        ccresearch_id,
        session.workspace_dir,
        email=session.email,
        uploaded_files=existing_files
    )

    logger.info(f"Fetched {url} and saved to {file_path}")

    return WebFetchResponse(
        success=True,
        filename=filename,
        path=rel_path,
        message=f"Saved content from {parsed.netloc}"
    )


@router.get("/sessions/by-email", response_model=list[SessionResponse])
async def list_sessions_by_email(
    email: str,
    db: AsyncSession = Depends(get_db)
):
    """List all sessions for a specific email address.

    This ensures users only see their own sessions across devices/browsers.
    """
    if not email:
        return []

    result = await db.execute(
        select(CCResearchSession)
        .where(CCResearchSession.email == email.lower())
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
            session_number=s.session_number,
            title=s.title,
            workspace_dir=s.workspace_dir,
            workspace_project=s.workspace_project,
            status=s.status,
            session_mode=s.session_mode or "claude",
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


@router.get("/sessions/{browser_session_id}", response_model=list[SessionResponse])
async def list_sessions(
    browser_session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """List all sessions for a browser session (legacy - prefer by-email endpoint)"""
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
            session_number=s.session_number,
            title=s.title,
            workspace_dir=s.workspace_dir,
            workspace_project=s.workspace_project,
            status=s.status,
            session_mode=s.session_mode or "claude",
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
        session_number=session.session_number,
        title=session.title,
        workspace_dir=session.workspace_dir,
        workspace_project=session.workspace_project,
        status=session.status,
        session_mode=session.session_mode or "claude",
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


@router.patch("/sessions/{ccresearch_id}/rename")
async def rename_session(
    ccresearch_id: str,
    request: RenameRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Rename a session (title only, does NOT change directory names).

    This allows users to rename their sessions for better organization
    without affecting the --continue flag in Claude Code.
    """
    result = await db.execute(
        select(CCResearchSession)
        .where(CCResearchSession.id == ccresearch_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Only update title in database, not filesystem
    old_title = session.title
    session.title = request.title.strip()
    await db.commit()

    logger.info(f"Renamed session {ccresearch_id}: '{old_title}' -> '{session.title}'")
    return {
        "status": "renamed",
        "id": ccresearch_id,
        "old_title": old_title,
        "new_title": session.title
    }


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
    """Save current session workspace as a persistent project on SSD.

    The project is associated with the session's email for ownership filtering.
    """
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

    # Pass session email for project ownership
    project_path = ccresearch_manager.save_project(
        workspace,
        request.project_name,
        request.description or "",
        email=session.email
    )

    if not project_path:
        raise HTTPException(status_code=500, detail="Failed to save project")

    logger.info(f"Saved session {ccresearch_id} as project '{request.project_name}' for {session.email}")

    return SaveProjectResponse(
        name=request.project_name,
        path=str(project_path),
        saved_at=datetime.utcnow().isoformat()
    )


@router.get("/projects", response_model=List[ProjectInfo])
async def list_projects(email: Optional[str] = None):
    """List saved projects on SSD, optionally filtered by email.

    If email is provided, only returns projects owned by that user.
    Legacy endpoint - prefer /unified-projects for authenticated users.
    """
    projects = ccresearch_manager.list_saved_projects(email=email or "")
    return [ProjectInfo(**p) for p in projects]


class UnifiedProjectResponse(BaseModel):
    """Response model for unified projects."""
    id: str
    name: str
    dir_name: str
    created_at: str
    updated_at: str
    created_by: str
    owner_email: str
    tags: List[str] = []
    terminal_enabled: bool = True
    terminal_status: str = "ready"
    last_session_id: Optional[str] = None
    path: Optional[str] = None


@router.get("/unified-projects", response_model=List[UnifiedProjectResponse])
async def list_unified_projects(email: str):
    """List all unified projects for an authenticated user.

    This is the preferred endpoint for listing projects in the new architecture.
    Projects are stored at /data/users/{user-id}/projects/
    """
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    # Get user ID from email
    user_id = await get_user_id_from_email(email.lower())
    if not user_id:
        return []

    pm = get_project_manager(user_id)
    projects = await pm.list_projects()

    result = []
    for p in projects:
        terminal_info = p.get("terminal", {})
        result.append(UnifiedProjectResponse(
            id=p.get("id", ""),
            name=p.get("name", ""),
            dir_name=p.get("dir_name", ""),
            created_at=p.get("created_at", ""),
            updated_at=p.get("updated_at", ""),
            created_by=p.get("created_by", "unknown"),
            owner_email=p.get("owner_email", ""),
            tags=p.get("tags", []),
            terminal_enabled=terminal_info.get("enabled", True),
            terminal_status=terminal_info.get("status", "ready"),
            last_session_id=terminal_info.get("last_session_id"),
            path=p.get("path")
        ))

    return result


@router.post("/unified-projects")
async def create_unified_project(
    email: str = Form(...),
    name: str = Form(...),
    tags: Optional[str] = Form(None)  # Comma-separated tags
):
    """Create a new unified project without starting a session.

    This is useful for creating projects from Workspace.
    """
    if not email or not name:
        raise HTTPException(status_code=400, detail="Email and name are required")

    # Get user ID from email
    user_id = await get_user_id_from_email(email.lower())
    if not user_id:
        raise HTTPException(status_code=404, detail="User not found")

    pm = get_project_manager(user_id)

    # Parse tags
    tag_list = [t.strip() for t in tags.split(",")] if tags else []

    try:
        project = await pm.create_project(
            name=name,
            created_by="workspace",
            owner_email=email.lower(),
            tags=tag_list
        )
        return project
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/unified-projects/{project_name}")
async def delete_unified_project(project_name: str, email: str):
    """Delete a unified project."""
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    user_id = await get_user_id_from_email(email.lower())
    if not user_id:
        raise HTTPException(status_code=404, detail="User not found")

    pm = get_project_manager(user_id)
    success = await pm.delete_project(project_name)

    if not success:
        raise HTTPException(status_code=404, detail="Project not found")

    return {"status": "deleted", "name": project_name}


@router.post("/sessions/from-project", response_model=SessionResponse)
async def create_session_from_project(
    request: CreateFromProjectRequest,
    db: AsyncSession = Depends(get_db)
):
    """Create a new session by restoring a saved project.

    Authentication is handled by the frontend (login required with 24h trial).
    """
    # Determine session mode based on access key
    session_mode = "claude"  # Default: Claude Code
    if request.access_key:
        if is_access_key_valid(request.access_key):
            session_mode = "terminal"
        else:
            raise HTTPException(
                status_code=403,
                detail="wrong_access_key"
            )

    ccresearch_id = str(uuid.uuid4())

    # Restore project files to new workspace
    workspace_dir = ccresearch_manager.restore_project(
        request.project_name,
        ccresearch_id,
        email=request.email
    )

    if not workspace_dir:
        raise HTTPException(
            status_code=404,
            detail=f"Project '{request.project_name}' not found"
        )

    # Create database entry (store email lowercase for consistent matching)
    mode_label = "Terminal" if session_mode == "terminal" else "Claude"
    session = CCResearchSession(
        id=ccresearch_id,
        session_id=request.session_id,
        email=request.email.lower(),
        title=request.title or f"{mode_label} Restored: {request.project_name}",
        workspace_dir=str(workspace_dir),
        status="created",
        session_mode=session_mode,
        is_admin=session_mode == "terminal",
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
        session_number=session.session_number or 1,
        title=session.title,
        workspace_dir=session.workspace_dir,
        workspace_project=session.workspace_project,
        status=session.status,
        session_mode=session.session_mode or "claude",
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


# ============ Share Endpoints ============

def generate_share_token() -> str:
    """Generate a random URL-safe share token (12 characters)."""
    return secrets.token_urlsafe(9)  # 12 characters


@router.post("/sessions/{ccresearch_id}/share", response_model=ShareResponse)
async def create_share_link(
    ccresearch_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a public share link for a session.

    Anyone with the link can view the session files and log (read-only).
    """
    result = await db.execute(
        select(CCResearchSession)
        .where(CCResearchSession.id == ccresearch_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Share link expiration (7 days from creation)
    SHARE_EXPIRY_DAYS = 7

    # Check if already shared
    if session.share_token:
        # Return existing share link (check if expired)
        share_url = f"https://orpheuscore.uk/ccresearch/share/{session.share_token}"
        expires_at = session.share_expires_at or (session.shared_at + timedelta(days=SHARE_EXPIRY_DAYS) if session.shared_at else datetime.utcnow() + timedelta(days=SHARE_EXPIRY_DAYS))
        return ShareResponse(
            share_token=session.share_token,
            share_url=share_url,
            shared_at=session.shared_at or datetime.utcnow(),
            expires_at=expires_at
        )

    # Generate new share token
    share_token = generate_share_token()

    # Ensure uniqueness (unlikely to collide but check anyway)
    existing = await db.execute(
        select(CCResearchSession)
        .where(CCResearchSession.share_token == share_token)
    )
    if existing.scalar_one_or_none():
        share_token = generate_share_token()  # Try once more

    # Update session with expiration
    now = datetime.utcnow()
    session.share_token = share_token
    session.shared_at = now
    session.share_expires_at = now + timedelta(days=SHARE_EXPIRY_DAYS)
    await db.commit()

    share_url = f"https://orpheuscore.uk/ccresearch/share/{share_token}"
    logger.info(f"Created share link for session {ccresearch_id}: {share_url} (expires: {session.share_expires_at})")

    return ShareResponse(
        share_token=share_token,
        share_url=share_url,
        shared_at=session.shared_at,
        expires_at=session.share_expires_at
    )


@router.delete("/sessions/{ccresearch_id}/share")
async def revoke_share_link(
    ccresearch_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Revoke the share link for a session."""
    result = await db.execute(
        select(CCResearchSession)
        .where(CCResearchSession.id == ccresearch_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if not session.share_token:
        raise HTTPException(status_code=400, detail="Session is not shared")

    # Clear share token
    session.share_token = None
    session.shared_at = None
    await db.commit()

    logger.info(f"Revoked share link for session {ccresearch_id}")
    return {"status": "revoked", "id": ccresearch_id}


@router.get("/sessions/{ccresearch_id}/share-status")
async def get_share_status(
    ccresearch_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Check if a session is shared and get share details."""
    result = await db.execute(
        select(CCResearchSession)
        .where(CCResearchSession.id == ccresearch_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.share_token:
        return {
            "is_shared": True,
            "share_token": session.share_token,
            "share_url": f"https://orpheuscore.uk/ccresearch/share/{session.share_token}",
            "shared_at": session.shared_at.isoformat() if session.shared_at else None
        }
    else:
        return {"is_shared": False}


# ============ Public Share View Endpoints (No Auth Required) ============

@router.get("/share/{share_token}", response_model=SharedSessionResponse)
async def get_shared_session(
    share_token: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get public info for a shared session (no auth required).

    Returns limited session info for display on the share page.
    Share links expire after 7 days.
    """
    result = await db.execute(
        select(CCResearchSession)
        .where(CCResearchSession.share_token == share_token)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Shared session not found or link expired")

    # Check if share link has expired
    if session.share_expires_at and datetime.utcnow() > session.share_expires_at:
        raise HTTPException(status_code=410, detail="Share link has expired")

    # Count files in workspace
    workspace = Path(session.workspace_dir)
    files_count = 0
    if workspace.exists():
        files_count = sum(1 for _ in workspace.rglob('*') if _.is_file())

    # Check if log exists
    log_path = ccresearch_manager.get_session_log_path(session.id)
    has_log = log_path is not None and Path(log_path).exists() if log_path else False

    return SharedSessionResponse(
        id=session.id,
        title=session.title,
        email=session.email,
        created_at=session.created_at,
        shared_at=session.shared_at or session.created_at,
        expires_at=session.share_expires_at,
        files_count=files_count,
        has_log=has_log
    )


async def _get_valid_shared_session(share_token: str, db: AsyncSession) -> CCResearchSession:
    """Helper to get a shared session and validate it hasn't expired."""
    result = await db.execute(
        select(CCResearchSession)
        .where(CCResearchSession.share_token == share_token)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Shared session not found or link expired")

    # Check if share link has expired
    if session.share_expires_at and datetime.utcnow() > session.share_expires_at:
        raise HTTPException(status_code=410, detail="Share link has expired")

    return session


@router.get("/share/{share_token}/files", response_model=FileListResponse)
async def list_shared_files(
    share_token: str,
    path: str = "",
    db: AsyncSession = Depends(get_db)
):
    """List files in a shared session workspace (no auth required)."""
    session = await _get_valid_shared_session(share_token, db)

    workspace = Path(session.workspace_dir)

    # Resolve requested path (prevent directory traversal)
    if path:
        target_path = (workspace / path).resolve()
        if not str(target_path).startswith(str(workspace.resolve())):
            raise HTTPException(status_code=403, detail="Access denied")
    else:
        target_path = workspace

    if not target_path.exists():
        raise HTTPException(status_code=404, detail="Path not found")

    if not target_path.is_dir():
        raise HTTPException(status_code=400, detail="Path is not a directory")

    files = []
    workspace_resolved = workspace.resolve()
    BLOCKED_FILES = {'.credentials.json', 'credentials.json', '.env', '.secrets'}

    for item in sorted(target_path.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower())):
        if item.name.startswith('.') and item.name != '.claude':
            continue
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


@router.get("/share/{share_token}/files/download")
async def download_shared_file(
    share_token: str,
    path: str,
    db: AsyncSession = Depends(get_db)
):
    """Download a file from a shared session (no auth required)."""
    session = await _get_valid_shared_session(share_token, db)

    workspace = Path(session.workspace_dir)
    target_path = (workspace / path).resolve()

    if not str(target_path).startswith(str(workspace.resolve())):
        raise HTTPException(status_code=403, detail="Access denied")

    BLOCKED_FILES = {'.credentials.json', 'credentials.json', '.env', '.secrets'}
    if target_path.name in BLOCKED_FILES:
        raise HTTPException(status_code=403, detail="Access denied")

    if not target_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    if not target_path.is_file():
        raise HTTPException(status_code=400, detail="Path is not a file")

    mime_type, _ = mimetypes.guess_type(str(target_path))
    if not mime_type:
        mime_type = "application/octet-stream"

    return FileResponse(
        path=target_path,
        filename=target_path.name,
        media_type=mime_type
    )


@router.get("/share/{share_token}/files/content")
async def read_shared_file_content(
    share_token: str,
    path: str,
    db: AsyncSession = Depends(get_db)
):
    """Read text content of a file in a shared session (no auth required)."""
    session = await _get_valid_shared_session(share_token, db)

    workspace = Path(session.workspace_dir)
    target_path = (workspace / path).resolve()

    if not str(target_path).startswith(str(workspace.resolve())):
        raise HTTPException(status_code=403, detail="Access denied")

    BLOCKED_FILES = {'.credentials.json', 'credentials.json', '.env', '.secrets'}
    if target_path.name in BLOCKED_FILES:
        raise HTTPException(status_code=403, detail="Access denied")

    if not target_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    if not target_path.is_file():
        raise HTTPException(status_code=400, detail="Path is not a file")

    if target_path.stat().st_size > 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large for preview")

    try:
        content = target_path.read_text(encoding='utf-8')
        return {"content": content, "path": path, "name": target_path.name}
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File is not text (binary file)")


@router.get("/share/{share_token}/log")
async def get_shared_session_log(
    share_token: str,
    max_lines: int = 2000,
    db: AsyncSession = Depends(get_db)
):
    """Get terminal log for a shared session (no auth required).

    Returns ALL logs for the session concatenated chronologically,
    with ANSI escape sequences removed for readability.
    Share links expire after 7 days.
    """
    session = await _get_valid_shared_session(share_token, db)

    # Use read_full_session_log to get ALL logs concatenated chronologically
    log_content = ccresearch_manager.read_full_session_log(session.id, max_lines, clean=True)

    if log_content is None:
        return {"log": "No log available for this session", "lines": 0}

    return {
        "log": log_content,
        "lines": len(log_content.splitlines())
    }


# ============ Access Request Endpoints ============

# Directory for storing requests
REQUESTS_DIR = Path("/data/ccresearch-requests")
REQUESTS_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/requests/access")
async def request_access(request: AccessRequestModel):
    """
    Submit a request to be added to the CCResearch whitelist.

    Stores the request in a JSON file for admin review.
    """
    requests_file = REQUESTS_DIR / "access_requests.json"

    # Load existing requests
    requests = []
    if requests_file.exists():
        try:
            requests = json.loads(requests_file.read_text())
        except Exception:
            requests = []

    # Check if email already requested
    existing = [r for r in requests if r.get("email", "").lower() == request.email.lower()]
    if existing:
        return {"status": "already_requested", "message": "Access request already submitted for this email."}

    # Add new request
    new_request = {
        "email": request.email.lower(),
        "name": request.name,
        "reason": request.reason,
        "submitted_at": datetime.utcnow().isoformat(),
        "status": "pending"
    }
    requests.append(new_request)

    # Save
    requests_file.write_text(json.dumps(requests, indent=2))
    logger.info(f"New access request from {request.email}")

    # Send admin notification (async, don't block response)
    try:
        await notify_access_request(request.email, request.name, request.reason)
    except Exception as e:
        logger.warning(f"Failed to send access request notification: {e}")

    return {"status": "submitted", "message": "Access request submitted. You will be notified when approved."}


@router.get("/requests/access")
async def list_access_requests():
    """List all access requests (admin only - no auth for now)."""
    requests_file = REQUESTS_DIR / "access_requests.json"
    if not requests_file.exists():
        return {"requests": []}
    try:
        requests = json.loads(requests_file.read_text())
        return {"requests": requests}
    except Exception:
        return {"requests": []}


@router.post("/requests/plugin-skill")
async def request_plugin_or_skill(request: PluginSkillRequestModel):
    """
    Submit a request for a new plugin or skill to be added.

    Stores the request in a JSON file for admin review.
    """
    requests_file = REQUESTS_DIR / "plugin_skill_requests.json"

    # Load existing requests
    requests = []
    if requests_file.exists():
        try:
            requests = json.loads(requests_file.read_text())
        except Exception:
            requests = []

    # Add new request
    new_request = {
        "email": request.email.lower(),
        "request_type": request.request_type,
        "name": request.name,
        "description": request.description,
        "use_case": request.use_case,
        "submitted_at": datetime.utcnow().isoformat(),
        "status": "pending"
    }
    requests.append(new_request)

    # Save
    requests_file.write_text(json.dumps(requests, indent=2))
    logger.info(f"New {request.request_type} request: {request.name} from {request.email}")

    # Send admin notification (async, don't block response)
    try:
        await notify_plugin_skill_request(
            request.email,
            request.request_type,
            request.name,
            request.description,
            request.use_case
        )
    except Exception as e:
        logger.warning(f"Failed to send plugin/skill request notification: {e}")

    return {"status": "submitted", "message": f"{request.request_type.capitalize()} request submitted. Thank you for the suggestion!"}


@router.get("/requests/plugin-skill")
async def list_plugin_skill_requests():
    """List all plugin/skill requests (admin only - no auth for now)."""
    requests_file = REQUESTS_DIR / "plugin_skill_requests.json"
    if not requests_file.exists():
        return {"requests": []}
    try:
        requests = json.loads(requests_file.read_text())
        return {"requests": requests}
    except Exception:
        return {"requests": []}


# ============ Session Monitoring Endpoints ============

@router.get("/sessions/{ccresearch_id}/log")
async def get_session_log(
    ccresearch_id: str,
    lines: int = 200,
    clean: bool = False,
    db: AsyncSession = Depends(get_db)
):
    """
    Get the terminal log for a session.

    This returns the terminal output captured during the session,
    useful for debugging and monitoring what Claude is doing.

    Args:
        ccresearch_id: Session ID
        lines: Number of lines to return (default 200)
        clean: If True, strip ANSI codes for readable display

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
    log_content = ccresearch_manager.read_session_log(ccresearch_id, lines, clean=clean)

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


@router.post("/sessions/{ccresearch_id}/export-log")
async def export_session_log(
    ccresearch_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Export the terminal log to the project's output directory as a markdown file.

    This saves a cleaned, human-readable version of the terminal session
    to the project for demo recreation and documentation purposes.

    Args:
        ccresearch_id: Session ID

    Returns:
        Path to the exported file and line count
    """
    # Verify session exists
    result = await db.execute(
        select(CCResearchSession)
        .where(CCResearchSession.id == ccresearch_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Get full cleaned log content
    log_content = ccresearch_manager.read_full_session_log(ccresearch_id, max_lines=10000, clean=True)

    if not log_content:
        raise HTTPException(status_code=404, detail="No log content found for this session")

    # Prepare export directory
    workspace_dir = Path(session.workspace_dir)
    output_dir = workspace_dir / "output" / "session-logs"
    output_dir.mkdir(parents=True, exist_ok=True)

    # Generate filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    session_title = session.title.replace(" ", "-").lower()[:30] if session.title else "session"
    filename = f"{session_title}_{timestamp}.md"
    filepath = output_dir / filename

    # Create markdown content with metadata header
    md_content = f"""# Terminal Session Log

**Session:** {session.title or 'Untitled'}
**Exported:** {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
**Session ID:** {ccresearch_id}

---

```
{log_content}
```
"""

    # Write the file
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(md_content)
    except Exception as e:
        logger.error(f"Failed to export session log: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to write export file: {str(e)}")

    # Get relative path for display
    relative_path = str(filepath.relative_to(workspace_dir))

    logger.info(f"Exported session log to {filepath}")

    return {
        "message": "Session log exported successfully",
        "path": relative_path,
        "filename": filename,
        "lines": len(log_content.splitlines())
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

            # Track WebSocket state to prevent sending to closed connections
            ws_closed = False

            # Define output callback to send data to WebSocket
            # Returns False to signal the read loop to stop when WebSocket is closed
            async def send_output(data: bytes):
                nonlocal ws_closed
                if ws_closed:
                    return False  # Signal to stop the read loop
                try:
                    await websocket.send_bytes(data)
                    return True  # Continue the read loop
                except Exception as e:
                    ws_closed = True  # Mark as closed so future sends are skipped
                    logger.error(f"Failed to send output: {e}")
                    return False  # Signal to stop the read loop

            # Define automation callback to notify client of triggered rules
            async def send_automation_notification(notification: dict):
                nonlocal ws_closed
                if ws_closed:
                    return  # Don't try to send to closed WebSocket
                try:
                    await websocket.send_json(notification)
                    logger.info(f"Sent automation notification: {notification.get('description')}")
                except Exception as e:
                    ws_closed = True
                    logger.error(f"Failed to send automation notification: {e}")

            # Check session mode and spawn appropriate process
            session_mode = session.session_mode or "claude"

            # Determine if we should continue previous session
            # Use --continue flag for:
            # - Reconnecting to existing sessions (status != 'created')
            # - Restored projects (title contains 'Restored')
            is_existing_session = session.status != "created"
            is_restored_project = "Restored:" in (session.title or "")
            should_continue = is_existing_session or is_restored_project

            if should_continue:
                logger.info(f"Resuming session {ccresearch_id} with --continue flag")

            if session_mode == "terminal":
                # Direct terminal access - spawn bash shell
                success = await ccresearch_manager.spawn_shell(
                    ccresearch_id,
                    Path(session.workspace_dir),
                    session.terminal_rows,
                    session.terminal_cols,
                    send_output
                )
                if not success:
                    await websocket.send_json({
                        "type": "error",
                        "error": "Failed to start terminal session."
                    })
                    await websocket.close()
                    return
            else:
                # Claude Code mode - spawn Claude CLI
                # Pass continue_session=True for existing sessions to retain conversation history
                success = await ccresearch_manager.spawn_claude(
                    ccresearch_id,
                    Path(session.workspace_dir),
                    session.terminal_rows,
                    session.terminal_cols,
                    send_output,
                    sandboxed=settings.CCRESEARCH_SANDBOX_ENABLED,
                    automation_callback=send_automation_notification,
                    continue_session=should_continue
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

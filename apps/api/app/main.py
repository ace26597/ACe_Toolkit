from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from contextlib import asynccontextmanager
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.core.config import settings
from app.routers import auth, ccresearch, workspace, public_api, data_studio, data_studio_v2, video_studio
from app.core.database import engine
from app.models.models import Base
import uuid
import time
import logging
import shutil
import psutil
from datetime import datetime, timedelta
from pathlib import Path
from sqlalchemy.future import select

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

# Configure logging with request ID support
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(name)s | %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("api")

# File size limit (from config, default 50MB)
MAX_UPLOAD_SIZE = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024

# Startup time for uptime calculation
STARTUP_TIME = None

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses"""
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        # Content Security Policy
        # Monaco editor and xterm.js require unsafe-inline/unsafe-eval for scripts
        # Dynamic styles require unsafe-inline for style-src
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: blob: https:; "
            "connect-src 'self' wss: https:; "
            "font-src 'self' data: https:; "
            "frame-ancestors 'none'"
        )
        # HSTS - only for HTTPS (Cloudflare handles this but belt-and-suspenders)
        if request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Add unique request ID to each request for tracing"""
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())[:8]
        request.state.request_id = request_id

        start_time = time.time()
        response = await call_next(request)
        duration = time.time() - start_time

        # Log request with ID and duration
        logger.info(
            f"[{request_id}] {request.method} {request.url.path} "
            f"-> {response.status_code} ({duration:.3f}s)"
        )

        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id
        return response


def is_local_network_request(request: Request) -> bool:
    """Check if request is from local/private network."""
    import ipaddress
    # Get client IP from headers or direct connection
    client_ip = request.headers.get("X-Real-IP") or \
                request.headers.get("X-Forwarded-For", "").split(",")[0].strip() or \
                (request.client.host if request.client else "0.0.0.0")
    try:
        ip = ipaddress.ip_address(client_ip)
        return ip.is_private or ip.is_loopback
    except ValueError:
        return False


# Paths exempt from CSRF header check (public endpoints, GET-like endpoints, OAuth callbacks)
CSRF_EXEMPT_PATHS = {
    "/auth/login",
    "/auth/register",
    "/auth/logout",
    "/auth/google",
    "/auth/google/callback",
    "/auth/refresh",
    "/health",
    "/health/detailed",
    "/metrics",
    "/",
}
# Path prefixes exempt from CSRF (public API, share endpoints, WebSocket upgrades)
CSRF_EXEMPT_PREFIXES = (
    "/ccresearch/share/",
    "/ccresearch/request-access",
    "/ccresearch/request-plugin-skill",
    "/public/",
)


class CSRFProtectionMiddleware(BaseHTTPMiddleware):
    """CSRF protection via custom header check for state-changing requests.

    Requires X-Requested-With: XMLHttpRequest header on POST/PUT/DELETE/PATCH requests.
    This is effective because:
    - Browsers don't allow custom headers in cross-origin requests without CORS preflight
    - SameSite=None cookies can be sent by cross-origin forms, but forms can't set custom headers
    - Only JavaScript fetch/XHR can set custom headers, and those respect CORS
    """
    async def dispatch(self, request: Request, call_next):
        method = request.method.upper()

        # Only check state-changing methods
        if method in ("POST", "PUT", "DELETE", "PATCH"):
            path = request.url.path

            # Skip exempt paths
            if path not in CSRF_EXEMPT_PATHS and not path.startswith(CSRF_EXEMPT_PREFIXES):
                # Skip WebSocket upgrade requests
                if request.headers.get("upgrade", "").lower() != "websocket":
                    # Skip multipart form uploads that include cookies (they set the header in JS)
                    requested_with = request.headers.get("x-requested-with", "")
                    if requested_with != "XMLHttpRequest":
                        return JSONResponse(
                            status_code=403,
                            content={"detail": "Missing CSRF header"}
                        )

        return await call_next(request)


class FileSizeLimitMiddleware(BaseHTTPMiddleware):
    """Limit upload file sizes to prevent OOM"""
    async def dispatch(self, request: Request, call_next):
        # Check content-length header for uploads
        content_length = request.headers.get("content-length")
        if content_length:
            content_length = int(content_length)

            # Allow larger uploads for local network requests
            if is_local_network_request(request):
                max_size = 2 * 1024 * 1024 * 1024  # 2GB for local network
            else:
                max_size = MAX_UPLOAD_SIZE  # 50MB for remote

            if content_length > max_size:
                return JSONResponse(
                    status_code=413,
                    content={
                        "detail": f"File too large. Maximum size is {max_size // (1024*1024)}MB",
                        "max_size_bytes": max_size,
                        "received_bytes": content_length
                    }
                )
        return await call_next(request)


async def create_initial_admin():
    """Create initial admin user if not exists."""
    from app.core.database import AsyncSessionLocal
    from app.models.models import User
    from app.core.security import get_password_hash, mask_email

    # Admin credentials from environment (set ADMIN_PASSWORD in .env)
    admin_email = settings.ADMIN_EMAIL
    admin_password = settings.ADMIN_PASSWORD
    admin_name = "ACe"

    if not admin_password:
        logger.warning("ADMIN_PASSWORD not set in .env - skipping admin creation")
        return

    # Warn if admin password is weak (same policy as user registration)
    if len(admin_password) < 12:
        logger.warning("ADMIN_PASSWORD is shorter than 12 characters - consider using a stronger password")

    async with AsyncSessionLocal() as db:
        # Check if admin exists
        result = await db.execute(select(User).where(User.email == admin_email))
        existing_admin = result.scalars().first()

        if not existing_admin:
            logger.info(f"Creating initial admin user: {mask_email(admin_email)}")
            admin = User(
                name=admin_name,
                email=admin_email,
                hashed_password=get_password_hash(admin_password),
                is_admin=True,
                is_approved=True,
                trial_expires_at=None  # Admins don't have trials
            )
            db.add(admin)
            await db.commit()
            await db.refresh(admin)

            # Create admin's data directory structure
            admin_dir = Path(settings.USER_DATA_BASE_DIR) / str(admin.id)
            admin_dir.mkdir(parents=True, exist_ok=True)
            # Create projects directory for unified project storage
            (admin_dir / "projects").mkdir(exist_ok=True)

            logger.info("Admin user created successfully")
        else:
            logger.info("Admin user already exists")


@asynccontextmanager
async def lifespan(app: FastAPI):
    global STARTUP_TIME
    STARTUP_TIME = datetime.utcnow()

    # Retrieve connection from engine and create tables if not exist (for dev mostly)
    # properly we use alembic, but this is a nice fallback for quick start
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Create initial admin user if not exists
    await create_initial_admin()

    import asyncio

    # Start periodic sandbox cleanup task
    from app.core.sandbox_manager import sandbox_manager

    async def periodic_sandbox_cleanup():
        """Cleanup old sandboxes every hour"""
        while True:
            try:
                await asyncio.sleep(3600)  # Wait 1 hour
                deleted = sandbox_manager.cleanup_old_sandboxes(max_age_hours=24)
                logger.info(f"Periodic cleanup: removed {deleted} old sandboxes")
            except Exception as e:
                logger.error(f"Error during periodic cleanup: {e}")

    asyncio.create_task(periodic_sandbox_cleanup())

    # Start periodic CCResearch session cleanup task
    from app.core.ccresearch_manager import ccresearch_manager
    from app.routers.ccresearch import cleanup_expired_sessions as ccresearch_cleanup
    from app.core.database import AsyncSessionLocal

    async def periodic_ccresearch_cleanup():
        """Cleanup expired and idle CCResearch sessions every hour"""
        while True:
            try:
                await asyncio.sleep(3600)  # Wait 1 hour
                # Cleanup idle sessions (2+ hours inactive)
                idle_terminated = await ccresearch_manager.cleanup_idle_sessions(max_idle_hours=2)
                # Cleanup process manager (filesystem - 24h old)
                deleted_fs = await ccresearch_manager.cleanup_old_sessions(max_age_hours=24)
                # Cleanup database entries
                async with AsyncSessionLocal() as db:
                    deleted_db = await ccresearch_cleanup(db)
                logger.info(f"CCResearch cleanup: {idle_terminated} idle, {deleted_fs} filesystem, {deleted_db} database entries")
            except Exception as e:
                logger.error(f"Error during CCResearch cleanup: {e}")

    asyncio.create_task(periodic_ccresearch_cleanup())

    # Start periodic OAuth state cleanup task (prevent memory leak)
    from app.routers.auth import _oauth_states

    async def periodic_oauth_state_cleanup():
        """Clean expired OAuth states every 5 minutes"""
        while True:
            try:
                await asyncio.sleep(300)  # 5 minutes
                cutoff = datetime.utcnow() - timedelta(minutes=10)
                expired = [k for k, v in _oauth_states.items() if v < cutoff]
                for k in expired:
                    _oauth_states.pop(k, None)
                if expired:
                    logger.info(f"OAuth state cleanup: removed {len(expired)} expired states")
            except Exception as e:
                logger.error(f"Error during OAuth state cleanup: {e}")

    asyncio.create_task(periodic_oauth_state_cleanup())

    yield

    # Cleanup: shutdown CCResearch processes
    try:
        logger.info("Shutting down CCResearch processes...")
        await ccresearch_manager.shutdown()
    except Exception as e:
        logger.error(f"Error shutting down CCResearch: {e}")

    # Cleanup: shutdown Claude runner processes (Data Studio)
    try:
        from app.core.claude_runner import claude_runner
        logger.info("Shutting down Claude runner processes...")
        await claude_runner.shutdown_all()
    except Exception as e:
        logger.error(f"Error shutting down Claude runner: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Rate limiter setup
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Configuration - Restrict to allowed origins
ALLOWED_ORIGINS = [
    "https://orpheuscore.uk",        # Primary domain
    "https://clawd.orpheuscore.uk",  # Clawd dashboard
    "https://api.orpheuscore.uk",    # Primary API
    "https://ai.ultronsolar.in",     # Legacy domain
    "https://api.ultronsolar.in",    # Legacy API
    "http://localhost:3000",         # Local development
    "http://127.0.0.1:3000",
    "http://192.168.1.190:3000",     # Local network
]

def get_cors_headers(request: Request) -> dict:
    """Get CORS headers for the request origin if allowed."""
    origin = request.headers.get("origin", "")
    if origin in ALLOWED_ORIGINS:
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    return {}

@app.exception_handler(HTTPException)
async def cors_http_exception_handler(request: Request, exc: HTTPException):
    """Custom HTTPException handler that includes CORS headers."""
    headers = get_cors_headers(request)
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=headers
    )

@app.exception_handler(Exception)
async def cors_general_exception_handler(request: Request, exc: Exception):
    """Custom general exception handler that includes CORS headers."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    headers = get_cors_headers(request)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
        headers=headers
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*", "X-Request-ID"]
)

# Add custom middleware (order matters - first added = last executed)
app.add_middleware(CSRFProtectionMiddleware)
app.add_middleware(FileSizeLimitMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestIDMiddleware)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(ccresearch.router, prefix="/ccresearch", tags=["CCResearch"])
app.include_router(workspace.router, prefix="/workspace", tags=["Workspace"])
app.include_router(public_api.router, tags=["Public API"])
app.include_router(data_studio.router, tags=["Data Studio"])
app.include_router(data_studio_v2.router, tags=["Data Studio V2"])
app.include_router(video_studio.router, tags=["Video Studio"])

@app.get("/")
def read_root():
    return {"message": "ACe Toolkit API is running"}


@app.get("/health", tags=["Health"])
async def health_check():
    """
    Public health check endpoint for monitoring systems.
    Returns only basic status (no system resource details).
    Includes checks for external dependencies (SSD, Claude CLI).
    """
    from app.core.database import AsyncSessionLocal
    from sqlalchemy import text
    import os

    # Database health check
    db_healthy = False
    try:
        async with AsyncSessionLocal() as db:
            await db.execute(text("SELECT 1"))
            db_healthy = True
    except Exception:
        pass

    # External dependency checks
    ssd_available = os.path.exists(settings.DATA_BASE_DIR)
    claude_cli_available = shutil.which('claude') is not None

    # Overall status: degraded if any critical dependency is down
    all_healthy = db_healthy and ssd_available
    status = "healthy" if all_healthy else "degraded"

    return {
        "status": status,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "ssd_mounted": ssd_available,
        "claude_cli": claude_cli_available,
    }


@app.get("/health/detailed", tags=["Health"])
async def health_check_detailed(request: Request):
    """
    Detailed health check endpoint (admin only).
    Returns system status, resource usage, and service health.
    Requires valid admin authentication cookie.
    """
    from app.core.ccresearch_manager import ccresearch_manager
    from app.core.database import AsyncSessionLocal
    from app.routers.auth import get_current_user
    from sqlalchemy import text

    # Verify admin access via JWT cookie
    try:
        async with AsyncSessionLocal() as db:
            user = await get_current_user(request, db)
            if not user.is_admin:
                raise HTTPException(status_code=403, detail="Admin access required")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=403, detail="Admin access required")

    # Calculate uptime
    uptime_seconds = 0
    if STARTUP_TIME:
        uptime_seconds = int((datetime.utcnow() - STARTUP_TIME).total_seconds())

    # System resources
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')

    # Database health check
    db_healthy = False
    try:
        async with AsyncSessionLocal() as db:
            await db.execute(text("SELECT 1"))
            db_healthy = True
    except Exception:
        pass

    # CCResearch active sessions (processes dict)
    active_sessions = len(ccresearch_manager.processes)

    return {
        "status": "healthy" if db_healthy else "degraded",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "uptime_seconds": uptime_seconds,
        "version": settings.PROJECT_NAME,
        "checks": {
            "database": "ok" if db_healthy else "error",
            "ccresearch_manager": "ok"
        },
        "resources": {
            "memory_percent": round(memory.percent, 1),
            "memory_available_mb": round(memory.available / (1024 * 1024), 1),
            "disk_percent": round(disk.percent, 1),
            "disk_free_gb": round(disk.free / (1024 * 1024 * 1024), 2),
            "cpu_percent": psutil.cpu_percent(interval=0.1)
        },
        "services": {
            "active_ccresearch_sessions": active_sessions
        }
    }


@app.get("/metrics", tags=["Metrics"])
async def get_metrics(request: Request):
    """
    Metrics endpoint for monitoring (admin only).
    Returns counts and statistics about the system.
    """
    from app.core.ccresearch_manager import ccresearch_manager
    from app.core.database import AsyncSessionLocal
    from app.models.models import CCResearchSession
    from app.routers.auth import get_current_user
    from sqlalchemy import select, func

    # Verify admin access via JWT cookie
    try:
        async with AsyncSessionLocal() as db:
            user = await get_current_user(request, db)
            if not user.is_admin:
                raise HTTPException(status_code=403, detail="Admin access required")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=403, detail="Admin access required")

    async with AsyncSessionLocal() as db:
        # CCResearch session counts
        total_sessions = await db.execute(
            select(func.count(CCResearchSession.id))
        )
        total_sessions = total_sessions.scalar() or 0

        active_sessions = await db.execute(
            select(func.count(CCResearchSession.id)).where(
                CCResearchSession.status.in_(["created", "active"])
            )
        )
        active_sessions = active_sessions.scalar() or 0

    return {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "ccresearch": {
            "total_sessions_all_time": total_sessions,
            "active_sessions_db": active_sessions,
            "active_sessions_memory": len(ccresearch_manager.processes)
        },
        "system": {
            "uptime_seconds": int((datetime.utcnow() - STARTUP_TIME).total_seconds()) if STARTUP_TIME else 0,
            "memory_percent": round(psutil.virtual_memory().percent, 1),
            "cpu_percent": psutil.cpu_percent(interval=0.1)
        }
    }

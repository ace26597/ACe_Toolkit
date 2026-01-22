from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.routers import auth, notes, projects, research_chat, logs, ccresearch, workspace, public_api, research, analyst, video_factory, research_assistant
from app.core.database import engine
from app.models.models import Base
import uuid
import time
import logging
import psutil
from datetime import datetime
from pathlib import Path
from sqlalchemy.future import select

# Configure logging with request ID support
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(name)s | %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("api")

# File size limit (50MB default)
MAX_UPLOAD_SIZE = 50 * 1024 * 1024  # 50MB

# Startup time for uptime calculation
STARTUP_TIME = None

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


class FileSizeLimitMiddleware(BaseHTTPMiddleware):
    """Limit upload file sizes to prevent OOM"""
    async def dispatch(self, request: Request, call_next):
        # Check content-length header for uploads
        content_length = request.headers.get("content-length")
        if content_length:
            content_length = int(content_length)
            if content_length > MAX_UPLOAD_SIZE:
                return JSONResponse(
                    status_code=413,
                    content={
                        "detail": f"File too large. Maximum size is {MAX_UPLOAD_SIZE // (1024*1024)}MB",
                        "max_size_bytes": MAX_UPLOAD_SIZE,
                        "received_bytes": content_length
                    }
                )
        return await call_next(request)


async def create_initial_admin():
    """Create initial admin user if not exists."""
    from app.core.database import AsyncSessionLocal
    from app.models.models import User
    from app.core.security import get_password_hash

    # Admin credentials from environment (set ADMIN_PASSWORD in .env)
    admin_email = settings.ADMIN_EMAIL
    admin_password = settings.ADMIN_PASSWORD
    admin_name = "ACe"

    if not admin_password:
        logger.warning("ADMIN_PASSWORD not set in .env - skipping admin creation")
        return

    async with AsyncSessionLocal() as db:
        # Check if admin exists
        result = await db.execute(select(User).where(User.email == admin_email))
        existing_admin = result.scalars().first()

        if not existing_admin:
            logger.info(f"Creating initial admin user: {admin_email}")
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
            for subdir in ["workspace", "analyst", "video-factory", "ccresearch", "research"]:
                (admin_dir / subdir).mkdir(exist_ok=True)

            logger.info(f"Admin user created with ID: {admin.id}")
        else:
            logger.info(f"Admin user already exists: {admin_email}")


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

    yield

    # Cleanup: shutdown CCResearch processes
    try:
        logger.info("Shutting down CCResearch processes...")
        await ccresearch_manager.shutdown()
    except Exception as e:
        logger.warning(f"Error shutting down CCResearch: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# CORS Configuration - Restrict to allowed origins
ALLOWED_ORIGINS = [
    "https://orpheuscore.uk",        # Primary domain
    "https://api.orpheuscore.uk",    # Primary API
    "https://ai.ultronsolar.in",     # Legacy domain
    "https://api.ultronsolar.in",    # Legacy API
    "http://localhost:3000",         # Local development
    "http://127.0.0.1:3000",
    "http://192.168.1.190:3000",     # Local network
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*", "X-Request-ID"]
)

# Add custom middleware (order matters - first added = last executed)
app.add_middleware(FileSizeLimitMiddleware)
app.add_middleware(RequestIDMiddleware)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(notes.router, prefix="/notes", tags=["notes"])
app.include_router(projects.router, prefix="/projects", tags=["projects"])
app.include_router(research_chat.router, prefix="/research", tags=["Research Assistant"])
app.include_router(logs.router, prefix="/logs", tags=["Logs"])
app.include_router(ccresearch.router, prefix="/ccresearch", tags=["CCResearch"])
app.include_router(workspace.router, prefix="/workspace", tags=["Workspace"])
app.include_router(public_api.router, tags=["Public API"])
app.include_router(research.router, tags=["Import Research"])
app.include_router(analyst.router, prefix="/analyst", tags=["Data Analyst"])
app.include_router(video_factory.router, tags=["Video Factory"])
app.include_router(research_assistant.router, tags=["Research Assistant (Headless)"])

@app.get("/")
def read_root():
    return {"message": "ACe Toolkit API is running"}


@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint for monitoring systems.
    Returns system status, resource usage, and service health.
    """
    from app.core.ccresearch_manager import ccresearch_manager
    from app.core.database import AsyncSessionLocal
    from sqlalchemy import text

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
async def get_metrics():
    """
    Simple metrics endpoint for monitoring.
    Returns counts and statistics about the system.
    """
    from app.core.ccresearch_manager import ccresearch_manager
    from app.core.database import AsyncSessionLocal
    from app.models.models import CCResearchSession, ResearchConversation
    from sqlalchemy import select, func

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

        # Research conversation counts
        total_conversations = await db.execute(
            select(func.count(ResearchConversation.id))
        )
        total_conversations = total_conversations.scalar() or 0

    return {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "ccresearch": {
            "total_sessions_all_time": total_sessions,
            "active_sessions_db": active_sessions,
            "active_sessions_memory": len(ccresearch_manager.processes)
        },
        "research_assistant": {
            "total_conversations": total_conversations
        },
        "system": {
            "uptime_seconds": int((datetime.utcnow() - STARTUP_TIME).total_seconds()) if STARTUP_TIME else 0,
            "memory_percent": round(psutil.virtual_memory().percent, 1),
            "cpu_percent": psutil.cpu_percent(interval=0.1)
        }
    }

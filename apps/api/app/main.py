from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.routers import auth, diagrams, export, notes, ai, projects, charts, research_chat, logs, medresearch, ccresearch
from app.core.database import engine
from app.models.models import Base

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Retrieve connection from engine and create tables if not exist (for dev mostly)
    # properly we use alembic, but this is a nice fallback for quick start
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    import logging
    import asyncio
    logger = logging.getLogger("main")

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
        """Cleanup expired CCResearch sessions every hour"""
        while True:
            try:
                await asyncio.sleep(3600)  # Wait 1 hour
                # Cleanup process manager (filesystem)
                deleted_fs = await ccresearch_manager.cleanup_old_sessions(max_age_hours=24)
                # Cleanup database entries
                async with AsyncSessionLocal() as db:
                    deleted_db = await ccresearch_cleanup(db)
                logger.info(f"CCResearch cleanup: {deleted_fs} filesystem, {deleted_db} database entries")
            except Exception as e:
                logger.error(f"Error during CCResearch cleanup: {e}")

    asyncio.create_task(periodic_ccresearch_cleanup())

    # Legacy: MedResearch cleanup (for backward compatibility)
    from app.core.medresearch_manager import medresearch_manager
    from app.routers.medresearch import cleanup_expired_sessions as medresearch_cleanup

    async def periodic_medresearch_cleanup():
        """Cleanup expired MedResearch sessions every hour (legacy)"""
        while True:
            try:
                await asyncio.sleep(3600)
                deleted_fs = await medresearch_manager.cleanup_old_sessions(max_age_hours=24)
                async with AsyncSessionLocal() as db:
                    deleted_db = await medresearch_cleanup(db)
                if deleted_fs > 0 or deleted_db > 0:
                    logger.info(f"MedResearch legacy cleanup: {deleted_fs} filesystem, {deleted_db} database entries")
            except Exception as e:
                logger.error(f"Error during MedResearch cleanup: {e}")

    asyncio.create_task(periodic_medresearch_cleanup())

    yield

    # Cleanup: shutdown CCResearch and MedResearch processes
    try:
        logger.info("Shutting down CCResearch processes...")
        await ccresearch_manager.shutdown()
    except Exception as e:
        logger.warning(f"Error shutting down CCResearch: {e}")

    try:
        logger.info("Shutting down MedResearch processes (legacy)...")
        await medresearch_manager.shutdown()
    except Exception as e:
        logger.warning(f"Error shutting down MedResearch: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# CORS Configuration - Allow all origins for development (includes WebSocket support)
# In production, restrict to specific domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=False,  # Must be False when allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(diagrams.router, prefix="/diagrams", tags=["diagrams"])
app.include_router(export.router, prefix="/export", tags=["export"])
app.include_router(notes.router, prefix="/notes", tags=["notes"])
app.include_router(ai.router, prefix="/ai", tags=["ai"])
app.include_router(projects.router, prefix="/projects", tags=["projects"])
app.include_router(charts.router, prefix="/charts", tags=["charts"])
app.include_router(research_chat.router, prefix="/research", tags=["Research Assistant"])
app.include_router(logs.router, prefix="/logs", tags=["Logs"])
app.include_router(ccresearch.router, prefix="/ccresearch", tags=["CCResearch"])
app.include_router(medresearch.router, prefix="/medresearch", tags=["MedResearch (Legacy)"])

@app.get("/")
def read_root():
    return {"message": "Mermaid API is running"}

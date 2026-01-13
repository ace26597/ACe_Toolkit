from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.routers import auth, diagrams, export, notes, ai, projects, charts, skills, scientific_chat, research_chat
from app.core.database import engine
from app.models.models import Base

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Retrieve connection from engine and create tables if not exist (for dev mostly)
    # properly we use alembic, but this is a nice fallback for quick start
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Start MCP server for scientific skills in background (non-blocking)
    from app.core.mcp_manager import mcp_manager
    import logging
    import asyncio
    logger = logging.getLogger("main")

    async def start_mcp_in_background():
        """Start MCP in background without blocking server startup"""
        logger.info("Starting MCP server for scientific skills in background...")
        try:
            started = await mcp_manager.start()
            if started:
                logger.info(f"✅ MCP server started successfully with {len(mcp_manager.available_skills)} skills")
            else:
                logger.warning("⚠️ MCP server failed to start - scientific skills may not work")
        except Exception as e:
            logger.warning(f"⚠️ MCP server startup failed: {e}")
            logger.info("Continuing without MCP - AI diagram features will still work")

    # Start MCP in background task (doesn't block startup)
    asyncio.create_task(start_mcp_in_background())

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

    yield

    # Cleanup: stop MCP server
    try:
        if mcp_manager.is_running():
            logger.info("Stopping MCP server...")
            await mcp_manager.stop()
    except Exception as e:
        logger.warning(f"Error stopping MCP server: {e}")

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
app.include_router(skills.router, prefix="/skills", tags=["skills"])
app.include_router(scientific_chat.router, prefix="/scientific-chat", tags=["Scientific Chat"])
app.include_router(research_chat.router, prefix="/research", tags=["Research Assistant"])

@app.get("/")
def read_root():
    return {"message": "Mermaid API is running"}

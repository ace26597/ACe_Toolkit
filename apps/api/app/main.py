from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.routers import auth, diagrams, export, notes
from app.core.database import engine
from app.models.models import Base

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Retrieve connection from engine and create tables if not exist (for dev mostly)
    # properly we use alembic, but this is a nice fallback for quick start
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True, # Important for cookies
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(diagrams.router, prefix="/diagrams", tags=["diagrams"])
app.include_router(notes.router, prefix="/notes", tags=["notes"])
app.include_router(export.router, prefix="/export", tags=["export"])

@app.get("/")
def read_root():
    return {"message": "Mermaid API is running"}

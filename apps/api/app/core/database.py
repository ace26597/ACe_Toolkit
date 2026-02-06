from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.core.config import settings

# Use DATABASE_URL from settings
DATABASE_URL = settings.DATABASE_URL

# SQLite with aiosqlite uses StaticPool for thread-safety in async context.
# pool_pre_ping ensures stale connections are detected and recycled.
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    future=True,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    pool_pre_ping=True,
)

AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

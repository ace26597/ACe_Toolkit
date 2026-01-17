from pydantic_settings import BaseSettings
from typing import List, Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Mermaid Monorepo API"
    API_V1_STR: str = "/api/v1"
    
    # Database (PostgreSQL for production, SQLite for development)
    POSTGRES_USER: str = "user"
    POSTGRES_PASSWORD: str = "password"
    POSTGRES_DB: str = "mermaid_db"
    DATABASE_URL: str = "sqlite+aiosqlite:///./app.db"
    
    # Security
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    
    # CORS - Support localhost, network IPs, and Cloudflare domains
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "https://ai.ultronsolar.in",
        "https://api.ultronsolar.in",
        "*"  # Allow all origins for development (required for WebSocket)
    ]

    # Export
    PLAYWRIGHT_BROWSERS_PATH: Optional[str] = None

    # AI - OpenAI GPT-4o API
    OPENAI_API_KEY: Optional[str] = None

    # AI - Anthropic Claude API
    ANTHROPIC_API_KEY: Optional[str] = None

    # AI - Tavily Search API (for web search in Research Assistant)
    TAVILY_API_KEY: Optional[str] = None

    # Storage Paths (SSD-backed for data persistence)
    DATA_BASE_DIR: str = "/data"
    MERMAID_DATA_DIR: str = "/data/mermaid-projects"
    CLAUDE_WORKSPACES_DIR: str = "/data/claude-workspaces"

    # CCResearch (Claude Code Research Platform) Settings
    CCRESEARCH_DATA_DIR: str = "/data/ccresearch-projects"
    CCRESEARCH_LOGS_DIR: str = "/data/ccresearch-logs"
    CCRESEARCH_SANDBOX_ENABLED: bool = True  # Set to False to disable bwrap sandbox (debugging only)
    CCRESEARCH_ACCESS_CODE: Optional[str] = None  # Magic access code to bypass email requirement

    # Legacy aliases (for backward compatibility during migration)
    MEDRESEARCH_DATA_DIR: str = "/data/ccresearch-projects"
    MEDRESEARCH_LOGS_DIR: str = "/data/ccresearch-logs"
    MEDRESEARCH_SANDBOX_ENABLED: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

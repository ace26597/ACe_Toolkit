"""
Configuration module with centralized secrets management.

Secrets are loaded from ~/.secrets/credentials.json (centralized credential manager).
This file is shared across all applications on this machine.

Usage:
    from app.core.config import settings

    # Access settings
    settings.SECRET_KEY
    settings.OPENAI_API_KEY
"""

from pydantic_settings import BaseSettings
from typing import List, Optional
import sys
import os

# Add centralized secrets manager to path
sys.path.insert(0, str(os.path.expanduser("~/.local/lib/python")))

try:
    from secrets_manager import get_secret, get_api_key, get_app_config
except ImportError:
    # Fallback if secrets_manager not installed
    def get_secret(path: str, default=None, **kwargs):
        return os.getenv(path.upper().replace(".", "_"), default)
    def get_api_key(service: str):
        return os.getenv(f"{service.upper()}_API_KEY")
    def get_app_config(app: str):
        return {}


class Settings(BaseSettings):
    PROJECT_NAME: str = "ACe_Toolkit API"
    API_V1_STR: str = "/api/v1"

    # Database (SQLite for this deployment)
    DATABASE_URL: str = "sqlite+aiosqlite:///./app.db"

    # Security - from centralized secrets
    SECRET_KEY: str = get_secret("apps.ace_toolkit.jwt_secret", default="INSECURE_DEFAULT_CHANGE_ME")
    ALGORITHM: str = get_secret("apps.ace_toolkit.jwt_algorithm", default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # CORS - NO WILDCARDS! Only allow specific origins
    ALLOWED_ORIGINS: List[str] = [
        # Production domains
        "https://orpheuscore.uk",
        "https://www.orpheuscore.uk",
        "https://api.orpheuscore.uk",
        # Legacy domains (if still needed)
        "https://ai.ultronsolar.in",
        "https://api.ultronsolar.in",
        # Local development only
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Export
    PLAYWRIGHT_BROWSERS_PATH: Optional[str] = None

    # AI API Keys - from centralized secrets
    OPENAI_API_KEY: Optional[str] = get_api_key("openai") or os.getenv("OPENAI_API_KEY")
    ANTHROPIC_API_KEY: Optional[str] = get_api_key("anthropic") or os.getenv("ANTHROPIC_API_KEY")
    TAVILY_API_KEY: Optional[str] = get_api_key("tavily") or os.getenv("TAVILY_API_KEY")

    # Storage Paths (SSD-backed for data persistence)
    DATA_BASE_DIR: str = "/data"
    MERMAID_DATA_DIR: str = "/data/mermaid-projects"
    CLAUDE_WORKSPACES_DIR: str = "/data/claude-workspaces"
    WORKSPACE_DATA_DIR: str = "/data/workspace"

    # Per-user data storage (auth system)
    USER_DATA_BASE_DIR: str = "/data/users"
    WORKSPACE_PROJECTS_DIR: str = "/data/workspace"

    # CCResearch (Claude Code Research Platform) Settings
    CCRESEARCH_DATA_DIR: str = "/data/ccresearch-projects"
    CCRESEARCH_LOGS_DIR: str = "/data/ccresearch-logs"
    CCRESEARCH_SANDBOX_ENABLED: bool = True
    CCRESEARCH_ACCESS_CODE: Optional[str] = None

    # Legacy aliases
    MEDRESEARCH_DATA_DIR: str = "/data/ccresearch-projects"
    MEDRESEARCH_LOGS_DIR: str = "/data/ccresearch-logs"
    MEDRESEARCH_SANDBOX_ENABLED: bool = True

    # AACT Clinical Trials Database - from centralized secrets
    AACT_DB_HOST: Optional[str] = get_secret("databases.aact.host") or os.getenv("AACT_DB_HOST")
    AACT_DB_PORT: Optional[str] = None
    AACT_DB_NAME: Optional[str] = get_secret("databases.aact.database") or os.getenv("AACT_DB_NAME")
    AACT_DB_USER: Optional[str] = get_secret("databases.aact.username") or os.getenv("AACT_DB_USER")
    AACT_DB_PASSWORD: Optional[str] = get_secret("databases.aact.password") or os.getenv("AACT_DB_PASSWORD")
    AACT_DB_URL: Optional[str] = get_secret("databases.aact.connection_string")

    # Notifications - from centralized secrets
    DISCORD_WEBHOOK_URL: Optional[str] = get_secret("services.discord.webhook_url") or os.getenv("DISCORD_WEBHOOK_URL")
    NTFY_TOPIC_URL: Optional[str] = os.getenv("NTFY_TOPIC_URL")

    # Admin account - from centralized secrets
    ADMIN_EMAIL: str = get_secret("apps.ace_toolkit.admin_email", default="admin@example.com")
    ADMIN_PASSWORD: Optional[str] = get_secret("apps.ace_toolkit.admin_password") or os.getenv("ADMIN_PASSWORD")

    # OAuth - Google
    GOOGLE_CLIENT_ID: Optional[str] = get_secret("oauth.google.client_id") or os.getenv("GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET: Optional[str] = get_secret("oauth.google.client_secret") or os.getenv("GOOGLE_CLIENT_SECRET")
    OAUTH_REDIRECT_BASE: str = "https://api.orpheuscore.uk"  # Production callback base URL
    FRONTEND_URL: str = "https://orpheuscore.uk"  # Where to redirect after OAuth

    class Config:
        env_file = ".env"
        case_sensitive = True

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Set AACT_DB_PORT from secrets (handle int -> str conversion)
        port = get_secret("databases.aact.port")
        if port:
            self.AACT_DB_PORT = str(port)
        elif os.getenv("AACT_DB_PORT"):
            self.AACT_DB_PORT = os.getenv("AACT_DB_PORT")


settings = Settings()

# Validate critical settings on startup
if settings.SECRET_KEY == "INSECURE_DEFAULT_CHANGE_ME":
    print("=" * 60)
    print("SECURITY WARNING: Using insecure default SECRET_KEY!")
    print("Set it in ~/.secrets/credentials.json at apps.ace_toolkit.jwt_secret")
    print("=" * 60)

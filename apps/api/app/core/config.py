"""
Configuration module with secure secrets management.

Secrets are loaded from ~/.secrets/ace_toolkit.json (not committed to git).
Non-sensitive config can be set via environment variables or .env file.
"""

from pydantic_settings import BaseSettings
from typing import List, Optional
import json
from pathlib import Path
import os

# Load secrets from secure file
SECRETS_FILE = Path.home() / ".secrets" / "ace_toolkit.json"
_secrets = {}

if SECRETS_FILE.exists():
    try:
        with open(SECRETS_FILE) as f:
            _secrets = json.load(f)
    except Exception as e:
        print(f"Warning: Could not load secrets file: {e}")


def get_secret(path: str, default: str = "") -> str:
    """Get a secret value by dot-notation path (e.g., 'jwt.secret_key')."""
    keys = path.split(".")
    value = _secrets
    for key in keys:
        if isinstance(value, dict):
            value = value.get(key, {})
        else:
            return default
    return value if isinstance(value, str) else default


class Settings(BaseSettings):
    PROJECT_NAME: str = "ACe_Toolkit API"
    API_V1_STR: str = "/api/v1"

    # Database (SQLite for this deployment)
    DATABASE_URL: str = "sqlite+aiosqlite:///./app.db"

    # Security - loaded from secrets file
    SECRET_KEY: str = get_secret("jwt.secret_key", "INSECURE_DEFAULT_CHANGE_ME")
    ALGORITHM: str = get_secret("jwt.algorithm", "HS256")
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

    # AI API Keys - loaded from secrets file
    OPENAI_API_KEY: Optional[str] = get_secret("api_keys.openai") or os.getenv("OPENAI_API_KEY")
    ANTHROPIC_API_KEY: Optional[str] = get_secret("api_keys.anthropic") or os.getenv("ANTHROPIC_API_KEY")
    TAVILY_API_KEY: Optional[str] = os.getenv("TAVILY_API_KEY")

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

    # AACT Clinical Trials Database - loaded from secrets file
    AACT_DB_HOST: Optional[str] = get_secret("databases.aact.host") or os.getenv("AACT_DB_HOST")
    AACT_DB_PORT: Optional[str] = str(get_secret("databases.aact.port", "5432")) if get_secret("databases.aact.port") else os.getenv("AACT_DB_PORT")
    AACT_DB_NAME: Optional[str] = get_secret("databases.aact.name") or os.getenv("AACT_DB_NAME")
    AACT_DB_USER: Optional[str] = get_secret("databases.aact.user") or os.getenv("AACT_DB_USER")
    AACT_DB_PASSWORD: Optional[str] = get_secret("databases.aact.password") or os.getenv("AACT_DB_PASSWORD")
    AACT_DB_URL: Optional[str] = None

    # Notifications - loaded from secrets file
    DISCORD_WEBHOOK_URL: Optional[str] = get_secret("notifications.discord_webhook") or os.getenv("DISCORD_WEBHOOK_URL")
    NTFY_TOPIC_URL: Optional[str] = os.getenv("NTFY_TOPIC_URL")

    # Admin account - loaded from secrets file
    ADMIN_EMAIL: str = get_secret("admin.email", "admin@example.com")
    ADMIN_PASSWORD: Optional[str] = get_secret("admin.password") or os.getenv("ADMIN_PASSWORD")

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

# Validate critical settings on startup
if settings.SECRET_KEY == "INSECURE_DEFAULT_CHANGE_ME":
    print("=" * 60)
    print("SECURITY WARNING: Using insecure default SECRET_KEY!")
    print("Create ~/.secrets/ace_toolkit.json with a secure key.")
    print("=" * 60)

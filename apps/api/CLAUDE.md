# CLAUDE.md - Backend API (FastAPI)

**Location:** `apps/api/` | **Port:** 8000 | **Framework:** FastAPI + SQLAlchemy

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | FastAPI 0.109.0 |
| Server | Uvicorn (ASGI) |
| ORM | SQLAlchemy 2.0 (async) |
| Database | SQLite (aiosqlite) |
| Auth | python-jose (JWT), passlib (Argon2) |
| AI | OpenAI SDK, Anthropic SDK, LangGraph |
| Terminal PTY | pexpect |
| File Processing | pypdf, openpyxl, pandas, pillow |

---

## Project Structure

```
apps/api/
├── app/
│   ├── main.py                    # FastAPI entry + lifespan
│   ├── schemas.py                 # Pydantic schemas
│   ├── models/
│   │   └── models.py              # SQLAlchemy models
│   ├── routers/
│   │   ├── auth.py                # Authentication
│   │   ├── ccresearch.py          # CCResearch Terminal + Unified Projects
│   │   ├── workspace.py           # Workspace API
│   │   ├── video_factory.py       # Video Factory
│   │   └── public_api.py          # Public endpoints
│   └── core/
│       ├── config.py              # Settings (Pydantic)
│       ├── database.py            # SQLAlchemy async setup
│       ├── security.py            # JWT, passwords
│       ├── ccresearch_manager.py  # CCResearch PTY manager
│       ├── project_manager.py     # Unified project manager (NEW)
│       ├── workspace_manager.py   # Workspace file manager
│       ├── session_manager.py     # Session management
│       ├── notifications.py       # Discord/ntfy alerts
│       └── user_access.py         # Per-user data access
├── requirements.txt
├── .env                           # Environment variables
└── app.db                         # SQLite database
```

---

## API Endpoints

### Authentication (`/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register with 24h trial |
| POST | `/login` | Login, returns JWT cookies |
| POST | `/logout` | Clear cookies |
| GET | `/me` | Get current user info |
| GET | `/me/status` | Get user + trial status |
| POST | `/refresh` | Refresh access token |
| GET | `/admin/users` | List all users (admin) |
| POST | `/admin/users/{id}/approve` | Approve user (admin) |
| POST | `/admin/users/{id}/revoke` | Revoke access (admin) |

### CCResearch Terminal (`/ccresearch`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/sessions` | Create session (FormData: email, title, files[]) |
| GET | `/sessions/{browser_id}` | List sessions |
| GET | `/sessions/detail/{id}` | Get session details |
| DELETE | `/sessions/{id}` | Delete session |
| PATCH | `/sessions/{id}/rename` | Rename session title (not directory) |
| POST | `/sessions/{id}/resize` | Resize terminal |
| GET | `/sessions/{id}/files` | List workspace files |
| GET | `/sessions/{id}/files/download` | Download file |
| GET | `/sessions/{id}/files/content` | Preview file content |
| GET | `/sessions/{id}/download-zip` | Download workspace as ZIP |
| WS | `/terminal/{id}` | Bidirectional terminal I/O |
| POST | `/sessions/{id}/share` | Create share link |
| DELETE | `/sessions/{id}/share` | Revoke share link |
| POST | `/sessions/{id}/clone-repo` | Clone GitHub repo to workspace |
| POST | `/sessions/{id}/fetch-url` | Fetch web URL and save as markdown |
| GET | `/share/{token}` | Public: Get shared session |
| GET | `/share/{token}/files` | Public: List files |
| GET | `/share/{token}/log` | Public: Get terminal log |

### Workspace (`/workspace`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects` | List all projects |
| POST | `/projects` | Create project |
| DELETE | `/projects/{name}` | Delete project |
| GET | `/projects/{name}/notes` | List notes |
| POST | `/projects/{name}/notes` | Create note |
| PUT | `/projects/{name}/notes/{id}` | Update note |
| DELETE | `/projects/{name}/notes/{id}` | Delete note |
| GET | `/projects/{name}/data` | List files |
| POST | `/projects/{name}/data/upload` | Upload files |
| POST | `/projects/{name}/data/folder` | Create folder |
| DELETE | `/projects/{name}/data` | Delete file/folder |
| GET | `/projects/{name}/data/download` | Download file |
| GET | `/projects/{name}/data/content` | Read file content |
| PUT | `/projects/{name}/data/content` | Save file content |

### Unified Projects (`/ccresearch/unified-projects`)

Cross-app project management for authenticated users.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/unified-projects` | List all user projects |
| POST | `/unified-projects` | Create project |
| DELETE | `/unified-projects/{name}` | Delete project |

---

## Database Schema

### User Authentication

```python
User
├── id: UUID (PK)
├── name: String
├── email: String (unique)
├── hashed_password: String
├── is_admin: Boolean
├── is_approved: Boolean
├── trial_expires_at: DateTime (nullable)
└── created_at: DateTime
```

### CCResearch Sessions

```python
CCResearchSession
├── id: String (PK)
├── session_id: String (browser)
├── email: String (indexed)
├── title: String
├── workspace_dir: String
├── uploaded_files: Text (JSON)
├── pid: Integer (nullable)
├── status: String (created|active|disconnected|terminated|error)
├── terminal_rows: Integer
├── terminal_cols: Integer
├── commands_executed: Integer
├── share_token: String (nullable, unique)
├── shared_at: DateTime (nullable)
├── created_at: DateTime
├── last_activity_at: DateTime
└── expires_at: DateTime
```

### Research Conversations

```python
ResearchConversation
├── id: String (PK)
├── session_id: String
├── title: String
├── sandbox_dir: String
├── provider: String
├── model_name: String
├── workflow_type: String
├── message_count: Integer
└── total_tokens_used: Integer

ResearchMessage
├── id: String (PK)
├── conversation_id: String (FK)
├── role: String
├── content: Text
├── workflow_steps: Text (JSON)
└── tokens_used: Integer
```

---

## CCResearch Security Model

### Email Whitelist Authentication

Location: `~/.ccresearch_allowed_emails.json`
```json
{
  "allowed_emails": ["user@example.com"],
  "access_key": "optional-direct-terminal-key",
  "updated_at": "2026-01-21"
}
```

### Session Modes

| Condition | Result |
|-----------|--------|
| Email only (no access key) | Claude Code session |
| Email + valid access key | Direct bash terminal |
| Non-whitelisted email | Error + Request Access form |

### File Access Deny Rules

Blocked via `.claude/settings.local.json`:
- `~/.ccresearch_allowed_emails.json`
- `~/.claude/CLAUDE.md`
- `~/dev/**` (all projects)
- `~/.ssh/**`, `~/.gnupg/**`
- `~/.aws/**`, `~/.config/gcloud/**`
- `/etc/shadow`, `/etc/passwd`

### Bash Command Deny Rules

- Process: `kill`, `pkill`, `killall`, `fuser`
- Service: `systemctl`, `service`, `journalctl`
- Privilege: `sudo`, `su`, `doas`
- System: `shutdown`, `reboot`, `crontab`
- Container: `docker`, `podman`
- Package: `apt`, `dpkg`, `yum`

---

## Environment Variables

**File:** `apps/api/.env`

```env
# Database
DATABASE_URL=sqlite+aiosqlite:///./app.db

# Security
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=30

# AI APIs
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
TAVILY_API_KEY=tvly-...

# AACT Database
AACT_DB_HOST=aact-db.ctti-clinicaltrials.org
AACT_DB_PORT=5432
AACT_DB_NAME=aact
AACT_DB_USER=your-user
AACT_DB_PASSWORD=your-password

# Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=set-in-env

# Notifications
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

---

## Centralized Credentials

**Location:** `~/.credentials/credentials.json`

```json
{
  "databases": {
    "aact": {
      "host": "aact-db.ctti-clinicaltrials.org",
      "port": 5432,
      "database": "aact",
      "username": "blest",
      "password": "***",
      "connection_string": "postgresql://..."
    }
  },
  "api_keys": {
    "openai": {"env_var": "OPENAI_API_KEY"},
    "anthropic": {"env_var": "ANTHROPIC_API_KEY"}
  }
}
```

CCResearch sessions have READ access to this file.

---

## Key Managers

### CCResearchManager (`core/ccresearch_manager.py`)

Manages PTY processes for Claude Code terminals:
- Process spawning/termination
- WebSocket I/O bridging
- Session cleanup (24h expiry, 2h idle)
- Workspace directory management

### WorkspaceManager (`core/workspace_manager.py`)

Manages user workspace files:
- Project CRUD
- File upload/download
- Note management
- Per-user data isolation

### ProjectManager (`core/project_manager.py`)

Unified project operations across apps:
- Project CRUD (create, list, get, delete)
- Terminal status tracking
- Project metadata (.project.json)
- Cross-app visibility (CCResearch + Workspace)

---

## Development

```bash
# Setup
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# API Docs
open http://localhost:8000/docs
```

---

## Notes

- All authenticated endpoints require `credentials: 'include'` in fetch
- Cookies are HTTP-only (not JS accessible)
- Access tokens expire in 15 minutes, refresh handles renewal
- AACT passwords with special chars need `quote_plus()` encoding
- Session rename updates DB only, not filesystem (preserves `--continue`)

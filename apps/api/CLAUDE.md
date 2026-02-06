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
| AI | OpenAI SDK, Anthropic SDK |
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
│   │   ├── data_studio.py         # C3 Data Studio (Legacy)
│   │   ├── data_studio_v2.py      # C3 Data Studio V2 (REDESIGNED)
│   │   ├── video_studio.py        # Remotion Video Studio
│   │   └── public_api.py          # Public endpoints
│   └── core/
│       ├── config.py              # Settings (Pydantic)
│       ├── database.py            # SQLAlchemy async setup
│       ├── security.py            # JWT, passwords
│       ├── ccresearch_manager.py  # CCResearch PTY manager
│       ├── claude_runner.py       # Headless Claude Code for Data Studio V2
│       ├── video_studio_manager.py # Video Studio PTY manager
│       ├── project_manager.py     # Unified project manager
│       ├── workspace_manager.py   # Workspace file manager
│       ├── session_manager.py     # Session management
│       ├── notifications.py       # Discord/ntfy alerts
│       ├── user_access.py         # Per-user data access
│       └── utils.py               # Shared utilities (sanitize_name)
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

**Note:** Frontend `/ccresearch` redirects to `/workspace?tab=terminal`. These endpoints are used by both.

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

### Data Studio (`/data-studio`) - Legacy

Legacy Data Studio API using headless Claude Code. See V2 for new implementation.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/sessions` | Create session for project |
| GET | `/sessions` | List active sessions |
| DELETE | `/sessions/{id}` | Close session |
| WS | `/ws/{session_id}` | Bidirectional Claude streaming |

### Data Studio V2 (`/data-studio/v2`) - REDESIGNED

**All-rounder AI data analyst framework** with standalone project system, smart metadata extraction, auto-generated dashboards, and NLP-based editing.

**Project Management:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects` | List Data Studio projects |
| POST | `/projects` | Create new project |
| DELETE | `/projects/{name}` | Delete project |

**File Management:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects/{name}/files` | List data files |
| POST | `/projects/{name}/files` | Upload files |
| POST | `/projects/{name}/import` | Import from Workspace |
| DELETE | `/projects/{name}/files` | Delete file |

**Analysis:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/projects/{name}/analyze` | Run data analysis |
| GET | `/projects/{name}/metadata` | Get analysis metadata |

**Dashboards:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects/{name}/dashboards` | List dashboards |
| GET | `/projects/{name}/dashboards/{id}` | Get dashboard |
| POST | `/projects/{name}/dashboards/generate` | Auto-generate dashboard |
| POST | `/projects/{name}/dashboards` | Save dashboard |
| DELETE | `/projects/{name}/dashboards/{id}` | Delete dashboard |

**NLP Editing:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/projects/{name}/edit` | NLP edit dashboard/widget |
| WS | `/projects/{name}/chat` | Chat with data |

**Project Structure:**
```
/data/users/{user-id}/data-studio-projects/{project}/
├── .project.json          # Project metadata
├── data/                  # Imported/uploaded files
├── .analysis/             # Generated analysis
│   ├── metadata.json      # Master metadata
│   └── file_analyses/     # Per-file analysis
├── .data-studio/          # Session state
│   └── dashboards/        # Saved dashboards
└── .claude/               # Claude config
```

**Analysis Metadata Schema:**
```json
{
  "project_name": "example",
  "analyzed_at": "2026-01-23T10:30:00Z",
  "summary": {
    "total_files": 3,
    "total_rows": 15420,
    "primary_data_type": "tabular_mixed",
    "themes": ["healthcare", "temporal"],
    "domain_detected": "healthcare/clinical"
  },
  "files": {"patients.csv": {...}},
  "cross_file_insights": [...],
  "recommended_charts": ["histogram", "bar", "line"]
}
```

### Video Studio (`/video-studio`)

AI-powered video creation using real Claude Code PTY terminal with Remotion.

**Projects:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects` | List user's video projects |
| POST | `/projects` | Create project (npm + Remotion setup) |
| GET | `/projects/{name}` | Get project details |
| DELETE | `/projects/{name}` | Delete project |
| POST | `/projects/{name}/install` | Install npm dependencies |

**Sessions:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/projects/{name}/session` | Start Claude session (with video idea) |
| POST | `/projects/{name}/session/terminate` | Terminate session |
| POST | `/projects/{name}/session/resize` | Resize terminal |

**Videos:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects/{name}/videos` | List rendered videos |
| GET | `/projects/{name}/videos/{filename}` | Stream/download video |
| DELETE | `/projects/{name}/videos/{filename}` | Delete video |

**WebSocket:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| WS | `/terminal/{name}` | Bidirectional terminal I/O |

**Project Structure:**
```
/data/users/{user-id}/video-studio/{project}/
├── .project.json          # Project metadata
├── package.json           # npm dependencies (Remotion)
├── remotion.config.ts     # Remotion configuration
├── tsconfig.json          # TypeScript config
├── src/                   # Video components
│   ├── index.ts           # Remotion entry
│   ├── Root.tsx           # Composition root
│   └── Video.tsx          # Main video component
├── public/                # Assets (images, audio)
├── out/                   # Rendered videos (MP4)
├── node_modules/          # npm packages
└── .claude/
    ├── CLAUDE.md          # Project instructions
    └── settings.local.json # Permissions
```

**Session Flow:**
1. Create project → Sets up npm + Remotion scaffolding
2. Install dependencies → `npm install`
3. Start session → Spawns Claude Code PTY with idea prompt
4. WebSocket terminal → Bidirectional I/O for user to see Claude working
5. Claude researches, plans, builds, renders video
6. Video appears in `/out` directory
7. User can view/download rendered videos

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

### API Security (2026-02-06 Audit)

| Feature | Details |
|---------|---------|
| **CSRF Protection** | `X-Requested-With` header required on all mutation requests. Exempt paths: login, register, OAuth, health, public API |
| **Account Lockout** | 5 failed login attempts triggers 15-minute lockout per account |
| **Path Traversal** | `pathlib.relative_to()` with symlink rejection on all file operations |
| **Magic Byte Validation** | File uploads validated by magic bytes (not just extension) |
| **Health Endpoints** | `/health` (public, minimal) and `/health/detailed` (admin-only with DB/disk checks) |
| **CSP Headers** | Content-Security-Policy and Permissions-Policy headers on all responses |
| **WebSocket Auth** | JWT expiry validated on WebSocket connections |
| **Error Sanitization** | Internal error details stripped from client-facing responses |

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

### ClaudeRunner (`core/claude_runner.py`) - Data Studio V2

Manages headless Claude Code execution for Data Studio analysis:
- Spawns Claude with `-p --output-format stream-json --verbose --permission-mode bypassPermissions`
- Does NOT use `--resume` (requires valid UUID session which doesn't exist for new analysis)
- Streams SSE events to frontend (status, text, tool, result, error, complete)
- Deterministic session IDs (user+project hash) for tracking
- Project-level CLAUDE.md auto-generated with data analyst context
- Context loading from `.analysis/context.md` for session continuity

**Key Methods:**
```python
async def run_analysis(user_id, project_name, project_dir, mode, analysis_mode) -> AsyncGenerator
async def generate_dashboard(user_id, project_name, project_dir, dashboard_name, mode) -> AsyncGenerator
async def nlp_edit(user_id, project_name, project_dir, request, dashboard_id, widget_id, mode) -> AsyncGenerator
async def chat(user_id, project_name, project_dir, message, mode) -> AsyncGenerator
```

**Analysis Modes:**
- `combined`: Unified cross-file analysis, looks for relationships and common columns
- `separate`: Detailed per-file insights, saves to `.analysis/file_analyses/`

**Prompt Design:**
- Mode-specific prompts for combined vs separate analysis
- Clear STEPS and REQUIRED OUTPUT FORMAT sections
- Claude writes and executes Python scripts autonomously
- Must save to `.analysis/metadata.json` and `.dashboards/{name}.json`

**Output Modes:**
- `headless`: Clean output - status, text, tool calls, results
- `terminal`: Full Claude output including raw JSON events

**Skill Integration:**
Uses `~/.claude/skills/data-studio-analyst/` skill for:
- File analysis with pandas (CSV, JSON, Excel, Parquet)
- Pattern detection and insight generation
- Plotly chart specification generation
- Dashboard layout design

**Python Environment:**
Central venv at `~/.local/share/data-studio-venv/` with:
- pandas 3.0.0, numpy 2.4.1, plotly 6.5.2
- kaleido, openpyxl, xlrd, pyarrow

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

## Removed Modules

The following modules were removed during cleanup:

| Module | Date | Reason |
|--------|------|--------|
| `_build_sandbox_command` (ccresearch_manager.py) | 2026-02-01 | Dead code - bwrap sandbox never called (Linux-only) |
| `CCRESEARCH_SANDBOX_ENABLED` (config.py) | 2026-02-01 | Unused config setting |
| `routers/video_factory.py` | 2026-01-28 | Video Factory app removed |
| `core/simple_video_generator.py` | 2026-01-28 | Video Factory app removed |
| `core/video_script_generator.py` | 2026-01-28 | Video Factory app removed |
| `core/video_research.py` | 2026-01-24 | Video Factory cleanup |
| `core/video_audio.py` | 2026-01-24 | Video Factory cleanup |
| `core/data_analyzer.py` | 2026-01-23 | Replaced by claude_runner.py (Claude Code First) |
| `core/dashboard_generator.py` | 2026-01-23 | Replaced by claude_runner.py (Claude Code First) |
| `core/data_studio_manager.py` | 2026-01-23 | Replaced by claude_runner.py |
| `core/ai_provider.py` | 2026-01-22 | Was used by Research Assistant (removed) |
| `core/file_processor.py` | 2026-01-22 | Was used by Research Assistant (removed) |
| `core/langgraph_workflows.py` | 2026-01-22 | Was used by Research Assistant (removed) |
| `core/report_generator.py` | 2026-01-22 | Was used by Research Assistant (removed) |
| `routers/analyst.py` | 2026-01-22 | Data Analyst app removed |
| `routers/research_chat.py` | 2026-01-22 | Research Assistant app removed |
| `routers/notes.py` | 2026-01-22 | Standalone notes removed (now in workspace) |
| `routers/logs.py` | 2026-01-22 | Logs viewer app removed |
| `routers/projects.py` | 2026-01-22 | Legacy projects removed |

---

## Notes

- All authenticated endpoints require `credentials: 'include'` in fetch
- Cookies are HTTP-only (not JS accessible)
- **Cookie Configuration (Production vs Development):**
  - Production: `secure=True`, `samesite=none`, `domain=.orpheuscore.uk` (required for cross-origin fetch)
  - Development: `secure=False`, `samesite=lax`, no domain
  - Cross-subdomain support: orpheuscore.uk ↔ api.orpheuscore.uk
  - Note: `SameSite=None` is required for `fetch()` with `credentials: 'include'` across subdomains
- Access tokens expire based on user type (30 days approved, 1 day trial)
- AACT passwords with special chars need `quote_plus()` encoding
- Session rename updates DB only, not filesystem (preserves `--continue`)
- Project names sanitized with hyphens (not spaces) for directory compatibility
- GitHub clone uses module-level `re` import (not inside conditionals - Python 3.13 scoping)

---

## Recent Changes

| Date | Change |
|------|--------|
| 2026-02-06 | **AUDIT: Security & Quality** - CSRF middleware, path traversal fix (relative_to), JWT fail-fast, account lockout, magic byte validation, health endpoint split, error message sanitization, DB session fix, file handle leak fix, subprocess cleanup, OAuth state cleanup, race condition fix, rate limiting, DB indexes, connection pool, shared utils, config centralization, logging levels |
| 2026-02-04 | **FIX: Mobile Cookies** - Changed `SameSite` from `lax` to `none` (required for cross-origin fetch) |
| 2026-02-04 | **FIX: Cookie Domain** - Changed to `.orpheuscore.uk` (leading dot) for proper subdomain sharing |
| 2026-02-04 | **FIX: Logout Cookie** - Logout now uses matching cookie domain for deletion |
| 2026-02-01 | **MIGRATION: Mac Mini** - Updated all paths from Raspberry Pi |
| 2026-01-29 | **SECURITY:** Rate limiting, password policy, CORS hardening |
| 2026-01-23 | **Data Studio V2:** claude_runner.py replaces data_analyzer.py + dashboard_generator.py |

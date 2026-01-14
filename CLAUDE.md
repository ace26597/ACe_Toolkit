# CLAUDE.md - AI Assistant Guide for ACe_Toolkit

**Last Updated:** January 14, 2026
**Repository:** ACe_Toolkit
**Status:** Active Development
**Deployment:** Raspberry Pi (Cloudflare Tunnel Active)

---

## Table of Contents

1. [Repository Overview](#repository-overview)
2. [Applications](#applications)
3. [Tech Stack](#tech-stack)
4. [Codebase Structure](#codebase-structure)
5. [API Reference](#api-reference)
6. [Database Schema](#database-schema)
7. [Development Workflows](#development-workflows)
8. [Key Conventions](#key-conventions)
9. [AI Assistant Guidelines](#ai-assistant-guidelines)
10. [Deployment](#deployment)

---

## Repository Overview

### Project Description

**ACe_Toolkit** is a full-stack productivity platform featuring AI-powered research tools, diagram creation, and web-based terminal interfaces. The platform runs on a Raspberry Pi and is accessible globally via Cloudflare Tunnel.

### Core Features

| Feature | Description |
|---------|-------------|
| **Mermaid Studio** | Document-based diagram editor with Monaco editor, AI assistance, and bidirectional markdown sync |
| **Research Assistant** | Multi-model AI research with GPT-4o/GPT-5.x, file upload, Tavily web search, LangGraph workflows, and report generation |
| **CCResearch Terminal** | Claude Code Research Platform - web-based terminal with email tracking, file upload, and 140+ scientific MCP tools |
| **Logs Viewer** | Real-time log monitoring for backend, frontend, Cloudflare, and CCResearch sessions |
| **Notes App** | Markdown-enabled note-taking with project organization |

### Quick Links

- **Production:** https://ai.ultronsolar.in
- **API:** https://api.ultronsolar.in
- **API Docs:** https://api.ultronsolar.in/docs
- **Local Dev:** http://localhost:3000 (frontend), http://localhost:8000 (backend)

---

## CRITICAL: Port Management

**THIS PROJECT'S PORTS - DO NOT CONFUSE WITH OTHER APPS:**

| Service | Port | Notes |
|---------|------|-------|
| **Frontend (Next.js)** | 3000 | ACe_Toolkit web app |
| **Backend (FastAPI)** | 8000 | ACe_Toolkit API |

**NEVER KILL OR INTERFERE WITH THESE PORTS:**

| Port | Owner |
|------|-------|
| 3001 | Other application (NOT this project) |
| 8001 | Other application (NOT this project) |

**Rules:**
1. When restarting services, ONLY kill ports 3000 and 8000
2. When checking status, ONLY check ports 3000 and 8000
3. NEVER run `pkill -f next` or `pkill -f uvicorn` without port specificity
4. Use `lsof -i :3000` or `fuser -k 3000/tcp` for targeted operations
5. Always verify the port before killing any process

**Safe Commands:**
```bash
# Kill frontend (port 3000 only)
fuser -k 3000/tcp

# Kill backend (port 8000 only)
fuser -k 8000/tcp

# Check what's on our ports
lsof -i :3000 -i :8000
```

---

## Applications

### 1. Mermaid Studio (`/mermaid`)

Full-featured diagram editor for creating and managing Mermaid diagrams.

**Features:**
- Monaco editor with Mermaid syntax highlighting
- Live diagram preview with ELK.js layout
- Document upload with automatic diagram extraction
- AI-powered diagram generation and repair (OpenAI)
- Version control via diagram editions
- Export to PNG/PDF via Playwright
- Multi-project organization
- **SSD Storage:** Export/import projects to external SSD for persistent backup

**Supported Diagram Types:**
- Flowcharts, Sequence, Class, State, ER
- Gantt, Pie, Journey, Git Graph
- Mindmap, Timeline, Quadrant, Requirement

---

### 2. Research Assistant (`/research`)

Multi-model AI research platform with LangGraph workflows.

**Features:**
- **Multi-Model Support:** OpenAI (gpt-4o, gpt-5.1, gpt-5.2)
- **File Upload:** Images (AI vision), PDFs (pypdf), CSV/Excel (pandas)
- **Web Search:** Tavily API integration for real-time research
- **LangGraph Workflows:** Router → Search → Analysis → Synthesis → Report
- **Report Generation:** Markdown, HTML, PDF, CSV formats
- **WebSocket Streaming:** Real-time response streaming with workflow progress

**Workflow Types:**
- `search` - Web research with Tavily
- `analysis` - File and data analysis
- `direct` - Direct conversation

---

### 3. CCResearch Terminal (`/ccresearch`)

Claude Code Research Platform - web-based terminal with email tracking and file upload support.

**Features:**
- **Full PTY Terminal:** xterm.js with WebSocket bidirectional I/O
- **Claude Code Integration:** Spawns Claude Code CLI via pexpect
- **Email Tracking:** Required email for each session (tracked in database)
- **File Upload:** Upload data files when creating session (stored in `workspace/data/`)
- **Scientific MCP Tools:** 140+ tools (PubMed, UniProt, RDKit, PyTorch, etc.)
- **Isolated Workspaces:** Each session has dedicated directory with auto-generated CLAUDE.md
- **24-Hour Sessions:** Auto-cleanup of expired sessions
- **Project Save/Restore:** Save sessions to SSD for permanent storage, restore anytime
- **File Browser:** Navigate and download workspace files
- **Session Management:** Create, list, delete research sessions

**Session Creation:**
1. User provides email address (required)
2. Optional: Upload data files (CSV, PDF, images, etc.)
3. Session created with isolated workspace
4. CLAUDE.md auto-generated with user email and uploaded files info

**Security (Bubblewrap Sandbox):**
- Sessions run in isolated bubblewrap (bwrap) sandbox
- Cannot access home directory (`/home/ace/dev/` blocked)
- Cannot access other sessions (only own workspace visible)
- Read-only access to system binaries and Claude installation
- Network access allowed for API calls
- Configurable via `CCRESEARCH_SANDBOX_ENABLED` env var

**Navbar Controls:**
- Back button (arrow) - return to session list
- New button (blue) - create new session (opens modal)
- End button (red) - delete current session

**Terminal Capabilities:**
- Full terminal emulation (bash, vim, etc.)
- Debounced resize handling (prevents flickering)
- File upload/download from workspace
- Auto-generated research CLAUDE.md per session

**Legacy:** MedResearch (`/medresearch`) remains available for backward compatibility

---

### 4. Logs Viewer (`/logs`)

Real-time log monitoring dashboard.

**Log Types:**
| Type | Source |
|------|--------|
| Backend | uvicorn/FastAPI logs |
| Frontend | Next.js logs |
| Cloudflare | systemd journal for cloudflared |
| Startup | Application startup logs |
| Shutdown | Graceful shutdown logs |
| CCResearch | Filtered terminal session logs |

**Features:**
- Real-time auto-refresh
- Search across log files
- Download logs
- Configurable line limits

---

### 5. Notes App (`/notes`)

Session-based note-taking application.

**Features:**
- Markdown editing with live preview
- Project-based organization
- Tags and pinning
- Auto-sync to backend

---

## Tech Stack

### Frontend (`apps/web`)

| Category | Technology | Version |
|----------|------------|---------|
| Framework | Next.js (App Router) | 16.1.1 |
| Runtime | React | 19.2.3 |
| Language | TypeScript | 5 |
| Styling | Tailwind CSS | 4 |
| Code Editor | Monaco Editor | 4.6.0 |
| Diagrams | Mermaid | 11.12.2 |
| Graph Layout | ELK.js | 0.11.0 |
| Terminal | xterm.js | 5.5.0 |
| HTTP Client | Axios | 1.6.7 |
| Icons | Lucide React | 0.469.0+ |

### Backend (`apps/api`)

| Category | Technology | Version |
|----------|------------|---------|
| Framework | FastAPI | 0.109.0 |
| Server | Uvicorn (ASGI) | 0.27.0 |
| Language | Python | 3.11+ |
| ORM | SQLAlchemy (async) | 2.0.36+ |
| Database | SQLite (aiosqlite) | - |
| Migrations | Alembic | 1.13.1 |
| Validation | Pydantic | 2.9.0+ |
| Auth | python-jose (JWT), passlib (Argon2) | - |
| Browser Automation | Playwright | 1.50.0+ |
| AI - OpenAI | OpenAI SDK | 1.12.0+ |
| AI - Anthropic | Anthropic SDK | 0.40.0+ |
| AI Workflows | LangGraph, LangChain | 0.2.0+, 0.1.0+ |
| Web Search | Tavily API | 0.5.0+ |
| MCP Integration | fastmcp, mcp | 0.4.0+, 0.9.0+ |
| Terminal PTY | pexpect | 4.9.0+ |
| File Processing | pypdf, openpyxl, pandas, pillow | latest |
| Reports | reportlab, markdown | latest |

### Infrastructure

| Component | Details |
|-----------|---------|
| Platform | Raspberry Pi 5 (Linux ARM64) |
| Tunnel | Cloudflare Tunnel (active) |
| Domains | ai.ultronsolar.in, api.ultronsolar.in |
| Auto-Start | crontab @reboot |
| Logs | /home/ace/dev/ACe_Toolkit/logs/ |
| Database | SQLite (apps/api/app.db) |
| **SSD Storage** | Samsung T7 1.8TB at `/data` → `/media/ace/T7/dev` |

**SSD Data Directories:**
```
/data/
├── mermaid-projects/      # Exported Mermaid diagrams
├── ccresearch-projects/   # Saved CCResearch sessions
├── ccresearch-logs/       # CCResearch session logs
└── claude-workspaces/     # Active Claude Code workspaces
```

---

## Codebase Structure

```
ACe_Toolkit/
├── apps/
│   ├── web/                           # Next.js Frontend
│   │   ├── app/                       # App Router pages
│   │   │   ├── page.tsx               # Home page
│   │   │   ├── layout.tsx             # Root layout
│   │   │   ├── mermaid/page.tsx       # Mermaid editor
│   │   │   ├── research/page.tsx      # Research Assistant
│   │   │   ├── ccresearch/page.tsx    # CCResearch Terminal (main)
│   │   │   ├── medresearch/page.tsx   # MedResearch Terminal (legacy)
│   │   │   ├── logs/page.tsx          # Logs viewer
│   │   │   └── notes/page.tsx         # Notes app
│   │   ├── components/
│   │   │   ├── mermaid/               # Diagram components
│   │   │   │   ├── MermaidPreview.tsx
│   │   │   │   └── MarkdownDocumentView.tsx
│   │   │   ├── research/              # Research Assistant UI
│   │   │   │   ├── ResearchChatInterface.tsx
│   │   │   │   ├── WorkflowVisualizer.tsx
│   │   │   │   ├── FileUploadZone.tsx
│   │   │   │   ├── ModelSelector.tsx
│   │   │   │   └── ReportViewer.tsx
│   │   │   ├── ccresearch/            # CCResearch components
│   │   │   │   ├── CCResearchTerminal.tsx
│   │   │   │   └── FileBrowser.tsx
│   │   │   ├── medresearch/           # MedResearch components (legacy)
│   │   │   │   ├── MedResearchTerminal.tsx
│   │   │   │   └── FileBrowser.tsx
│   │   │   └── ui/
│   │   │       └── ToastProvider.tsx
│   │   ├── lib/
│   │   │   ├── api.ts                 # API client
│   │   │   └── types.ts               # TypeScript types
│   │   ├── package.json
│   │   └── next.config.ts
│   │
│   └── api/                           # FastAPI Backend
│       ├── app/
│       │   ├── main.py                # FastAPI entry + lifespan
│       │   ├── schemas.py             # Pydantic schemas
│       │   ├── models/
│       │   │   └── models.py          # SQLAlchemy models
│       │   ├── routers/
│       │   │   ├── auth.py            # Authentication
│       │   │   ├── diagrams.py        # User diagrams
│       │   │   ├── projects.py        # Session projects
│       │   │   ├── charts.py          # Session charts
│       │   │   ├── session_notes.py   # Session notes
│       │   │   ├── notes.py           # User notes (auth)
│       │   │   ├── ai.py              # AI generation
│       │   │   ├── export.py          # Export to image/PDF
│       │   │   ├── research_chat.py   # Research Assistant
│       │   │   ├── ccresearch.py      # CCResearch Terminal (main)
│       │   │   ├── medresearch.py     # MedResearch Terminal (legacy)
│       │   │   └── logs.py            # Log viewer
│       │   └── core/
│       │       ├── config.py          # Settings
│       │       ├── database.py        # SQLAlchemy async setup
│       │       ├── security.py        # JWT, passwords
│       │       ├── sandbox_manager.py # Research sandboxes
│       │       ├── ccresearch_manager.py  # CCResearch manager (main)
│       │       ├── medresearch_manager.py # MedResearch manager (legacy)
│       │       ├── langgraph_workflows.py # LangGraph graphs
│       │       ├── report_generator.py    # Report formats
│       │       └── file_processor.py      # File extraction
│       ├── requirements.txt
│       └── .env.example
│
├── infra/scripts/                     # Deployment scripts
│   ├── start_all.sh                   # Start services
│   ├── stop_all.sh                    # Stop services
│   ├── status.sh                      # Check status
│   ├── restart_cloudflare.sh          # Restart tunnel
│   └── CURRENT_SETUP.md               # Setup docs
│
├── logs/                              # Application logs
├── CLAUDE.md                          # This file
└── README.md
```

---

## API Reference

### Authentication (`/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | User registration |
| POST | `/login` | Login, returns JWT |
| POST | `/refresh` | Refresh access token |
| POST | `/logout` | User logout |

### Diagrams (`/diagrams`) - Authenticated

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List user's diagrams |
| GET | `/{id}` | Get diagram |
| POST | `/` | Create diagram |
| PUT | `/{id}` | Update diagram |
| DELETE | `/{id}` | Delete diagram |

### Projects & Charts (`/projects`, `/charts`) - Session-based

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects/` | List projects |
| POST | `/projects/` | Create project |
| POST | `/projects/sync` | Bulk sync |
| GET | `/charts/project/{id}` | List charts in project |
| POST | `/charts/` | Create chart |
| PUT | `/charts/{id}` | Update chart |
| POST | `/projects/{id}/export-to-disk` | Export project to SSD |
| GET | `/projects/disk-projects` | List projects on SSD |
| POST | `/projects/import-from-disk/{name}` | Import project from SSD |
| DELETE | `/projects/disk-projects/{name}` | Delete project from SSD |

### AI (`/ai`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/generate` | Generate/repair diagrams using OpenAI |

### Export (`/export`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Export diagram to PNG/PDF |

### Research Assistant (`/research`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| WS | `/stream` | WebSocket streaming with LangGraph |
| POST | `/upload` | Upload files to conversation |
| GET | `/reports/{id}` | Download report (MD/HTML/PDF/CSV) |
| GET | `/conversations` | List conversations |
| POST | `/conversations` | Create conversation |
| DELETE | `/conversations/{id}` | Delete conversation |

**WebSocket Protocol:**
```json
// Client → Server
{
  "type": "message",
  "conversation_id": "uuid",
  "content": "Research CRISPR papers",
  "session_id": "session_xxx",
  "model_config": {"provider": "openai", "model_name": "gpt-5.2"}
}

// Server → Client
{"type": "workflow_step", "step": "router", "status": "in_progress"}
{"type": "content_delta", "delta": "Found 127 papers..."}
{"type": "message_complete", "conversation_id": "uuid", "tokens_used": 3421}
```

### CCResearch Terminal (`/ccresearch`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/sessions` | Create session (FormData: email, session_id, title?, files[]) |
| POST | `/sessions/{id}/upload` | Upload files to session |
| GET | `/sessions/{browser_id}` | List sessions |
| GET | `/sessions/detail/{id}` | Get session details |
| DELETE | `/sessions/{id}` | Delete session |
| POST | `/sessions/{id}/resize` | Resize terminal |
| GET | `/sessions/{id}/files` | List workspace files |
| GET | `/sessions/{id}/files/download` | Download file |
| GET | `/sessions/{id}/files/content` | Preview file content |
| GET | `/sessions/{id}/download-zip` | Download workspace as ZIP |
| WS | `/terminal/{id}` | Bidirectional terminal I/O |
| POST | `/sessions/{id}/save-project` | Save session to SSD |
| GET | `/projects` | List saved projects on SSD |
| POST | `/sessions/from-project` | Create session from saved project |
| DELETE | `/projects/{name}` | Delete saved project |

### MedResearch Terminal (`/medresearch`) - Legacy

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/sessions` | Create terminal session |
| GET | `/sessions/{browser_id}` | List sessions |
| DELETE | `/sessions/{id}` | Delete session |
| WS | `/terminal/{id}` | Bidirectional terminal I/O |

### Logs (`/logs`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/list` | List all log files |
| GET | `/backend` | Backend logs |
| GET | `/frontend` | Frontend logs |
| GET | `/cloudflare` | Cloudflare tunnel logs |
| GET | `/startup` | Startup logs |
| GET | `/shutdown` | Shutdown logs |
| GET | `/ccresearch` | CCResearch logs |
| GET | `/search` | Search across logs |
| GET | `/tail/{type}` | Stream live logs |

---

## Database Schema

### User-Authenticated Models

```
User
├── id: UUID (PK)
├── name: String
├── email: String (unique)
├── hashed_password: String
└── created_at: DateTime

Diagram
├── id: UUID (PK)
├── title: String
├── mermaid_code: Text
├── theme: String
├── user_id: UUID (FK → User)
├── created_at: DateTime
└── updated_at: DateTime
```

### Session-Based Models

```
SessionProject
├── id: String (PK)
├── name: String
├── documents_json: Text (JSON array)
└── charts: [SessionChart]

SessionChart
├── id: String (PK)
├── project_id: String (FK)
├── document_id: String (nullable)
├── name: String
├── code: Text
├── editions: Text (JSON array)
└── metadata_json: Text

SessionNoteProject / SessionNote
├── Similar structure for notes app
```

### Research Assistant Models

```
ResearchConversation
├── id: String (PK)
├── session_id: String
├── title: String
├── sandbox_dir: String
├── provider: String ("openai")
├── model_name: String ("gpt-5.2")
├── workflow_type: String
├── message_count: Integer
└── total_tokens_used: Integer

ResearchMessage
├── id: String (PK)
├── conversation_id: String (FK)
├── role: String ("user" | "assistant")
├── content: Text
├── workflow_steps: Text (JSON)
├── search_results: Text (JSON)
├── synthesis: Text
├── report: Text
└── tokens_used: Integer

UploadedFile
├── id: String (PK)
├── conversation_id: String (FK)
├── original_filename: String
├── file_path: String
├── file_type: String
├── extracted_content: Text
└── extraction_method: String
```

### CCResearch Terminal Models

```
CCResearchSession
├── id: String (PK)
├── session_id: String (browser)
├── email: String (required, indexed)
├── title: String
├── workspace_dir: String
├── uploaded_files: Text (JSON array of filenames)
├── pid: Integer (nullable)
├── status: String (created|active|disconnected|terminated|error)
├── terminal_rows: Integer
├── terminal_cols: Integer
├── commands_executed: Integer
├── created_at: DateTime
├── last_activity_at: DateTime
└── expires_at: DateTime (24h from creation)

MedResearchSession (Legacy)
├── id: String (PK)
├── session_id: String (browser)
├── title: String
├── workspace_dir: String
├── pid: Integer (nullable)
├── status: String
├── created_at: DateTime
└── expires_at: DateTime
```

---

## Development Workflows

### Quick Start

```bash
# Terminal 1: Backend
npm run dev:api

# Terminal 2: Frontend
npm run dev:web
```

**Development URLs:**
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Manual Setup

**Backend:**
```bash
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd apps/web
npm install
npm run dev
```

### Git Branching

Feature branches must follow: `claude/<description>-<SESSION_ID>`

Examples:
- `claude/add-medresearch-terminal-ABC12`
- `claude/fix-websocket-streaming-XYZ99`

### Commit Messages

```
<type>: <subject>

Types: feat, fix, docs, style, refactor, test, chore
```

---

## Key Conventions

### Code Style

**TypeScript:**
- Strict mode, ES modules
- Functional components with hooks
- Path alias: `@/*` → source root

**Python:**
- Type hints with Pydantic
- Async/await with FastAPI
- SQLAlchemy 2.0 async queries

### File Naming

| Type | Convention | Example |
|------|------------|---------|
| React Components | PascalCase | `CCResearchTerminal.tsx` |
| Utilities | camelCase | `api.ts` |
| Python Modules | snake_case | `ccresearch_manager.py` |
| Routes | kebab-case | `/ccresearch` |

---

## AI Assistant Guidelines

### Core Principles

1. **Read Before Modifying** - Always read files before changes
2. **Minimal Changes** - Only make requested changes
3. **Security First** - Avoid OWASP Top 10 vulnerabilities
4. **Use TodoWrite** - Track multi-step tasks

### Tool Usage

| Task | Tool |
|------|------|
| Explore codebase | Task (subagent_type=Explore) |
| Read files | Read |
| Edit files | Edit |
| Create files | Write |
| Search code | Grep |
| Find files | Glob |
| Git operations | Bash |

### What NOT to Do

- Commit without explicit request
- Skip git hooks
- Force push to main
- Create unnecessary files
- Add unrequested features
- Use emojis unless requested

---

## Deployment

### Production (Raspberry Pi + Cloudflare)

**Status:** Active

| Service | Local Port | Public URL |
|---------|------------|------------|
| Frontend | 3000 | https://ai.ultronsolar.in |
| Backend | 8000 | https://api.ultronsolar.in |

**Auto-Start (crontab):**
```cron
@reboot sleep 30 && /home/ace/dev/ACe_Toolkit/infra/scripts/start_all.sh
```

**Management:**
```bash
# Check status
./infra/scripts/status.sh

# Start/stop
./infra/scripts/start_all.sh
./infra/scripts/stop_all.sh

# Restart Cloudflare
./infra/scripts/restart_cloudflare.sh

# View logs
tail -f logs/backend-*.log
tail -f logs/frontend-*.log
journalctl -u cloudflared -f
```

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Internet                              │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                 Cloudflare Edge                              │
│         ai.ultronsolar.in  →  localhost:3000                │
│        api.ultronsolar.in  →  localhost:8000                │
└─────────────────────────┬───────────────────────────────────┘
                          │ Encrypted Tunnel
┌─────────────────────────▼───────────────────────────────────┐
│                   Raspberry Pi 5                             │
│  ┌──────────────────┐  ┌──────────────────────────────────┐ │
│  │ Frontend (Next)  │  │ Backend (FastAPI)                │ │
│  │ Port: 3000       │  │ Port: 8000                       │ │
│  └──────────────────┘  │                                  │ │
│                        │ ├── SQLite DB                    │ │
│                        │ ├── LangGraph Workflows          │ │
│                        │ ├── CCResearch PTY Manager       │ │
│                        │ └── Sandbox Manager              │ │
│                        └──────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Environment Variables

**Backend (`apps/api/.env`):**
```env
DATABASE_URL=sqlite:///./app.db
SECRET_KEY=your-secret-key
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
TAVILY_API_KEY=your-tavily-key
```

**Frontend (`apps/web/.env.local`):**
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
# Production: https://api.ultronsolar.in
```

---

## Recent Changes

| Date | Change |
|------|--------|
| 2026-01-14 | Rename to CCResearch (Claude Code Research Platform) at `/ccresearch` |
| 2026-01-14 | Add email tracking requirement for CCResearch sessions |
| 2026-01-14 | Add file upload on session creation (stored in `data/` directory) |
| 2026-01-14 | Add session creation modal with quick start guide |
| 2026-01-14 | Keep MedResearch at `/medresearch` as legacy |
| 2026-01-14 | Add bubblewrap sandbox security for sessions |
| 2026-01-14 | Add navbar controls (back, new, end session) |
| 2026-01-14 | Fix terminal flickering with debounced resize handling |
| 2026-01-14 | Add SSD storage integration (1.8TB Samsung T7) for persistent data |
| 2026-01-14 | Add project save/restore to terminal sessions |
| 2026-01-14 | Add disk export/import to Mermaid Studio |
| 2026-01-13 | Add MedResearch Terminal, remove Scientific Skills Terminal |
| 2026-01-13 | Add comprehensive logs viewing system with auto-scroll |
| 2026-01-12 | Add Research Assistant with LangGraph workflows |
| 2026-01-12 | Switch to OpenAI GPT-5.2 as default model |
| 2026-01-12 | Complete Cloudflare Tunnel deployment |

---

**Note to AI Assistants:** This document is your primary reference for the ACe_Toolkit repository. Always consult before making changes. Keep it updated as the project evolves.

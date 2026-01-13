# CLAUDE.md - AI Assistant Guide for ACe_Toolkit

**Last Updated:** January 12, 2026
**Repository:** ACe_Toolkit
**Status:** Active Development

---

## Table of Contents

1. [Repository Overview](#repository-overview)
2. [Tech Stack](#tech-stack)
3. [Codebase Structure](#codebase-structure)
4. [API Reference](#api-reference)
5. [Database Schema](#database-schema)
6. [Development Workflows](#development-workflows)
7. [Key Conventions](#key-conventions)
8. [AI Assistant Guidelines](#ai-assistant-guidelines)
9. [Common Tasks](#common-tasks)
10. [Deployment](#deployment)

---

## Repository Overview

### Project Description

**ACe_Toolkit** is a full-stack productivity toolkit for creating, editing, and managing Mermaid diagrams and notes. It features a document-based workflow where users can upload markdown files to automatically extract and organize diagrams, with bidirectional sync between diagram edits and source files.

> **Note:** Docker is currently not required for local development and is intended for future production/Raspberry Pi deployment.

### Core Features

- **Document-Based Workflow**: Upload markdown files to automatically extract and organize Mermaid charts
- **Bidirectional Sync**: Edits to diagrams automatically update the source markdown file
- **Multi-Project Hierarchy**: Organize charts within documents or as standalone diagrams
- **Diagram Editions**: Version control for diagram changes with descriptions
- **AI-Powered Generation**: Create, repair, and enhance diagrams using Claude (Anthropic)
- **Session-Based Storage**: No authentication required for basic usage
- **User Authentication**: Optional register/login for persistent storage
- **Notes Application**: Markdown-enabled note-taking with auto-sync
- **Export Functionality**: Export diagrams as images/PDF
- **Multiple Diagram Types**: Flowcharts, sequence, class, state, ER, Gantt, pie, journey, git graph, mindmap, timeline, quadrant, requirement diagrams

### Apps & Pages

| Route | Description |
|-------|-------------|
| `/` | Home page with navigation to Mermaid Editor and Notes |
| `/mermaid` | Full-featured diagram editor with live preview, Monaco editor, AI assistance |
| `/notes` | Session-based note-taking with project organization |

### Repository Information

- **Owner:** ace26597
- **Git Remote:** Local proxy configuration
- **Primary Branch:** main

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
| HTTP Client | Axios | 1.6.7 |
| Icons | Lucide React | >=0.469.0 |
| Linting | ESLint | 9 |

### Backend (`apps/api`)

| Category | Technology | Version |
|----------|------------|---------|
| Framework | FastAPI | 0.109.0 |
| Server | Uvicorn (ASGI) | 0.27.0 |
| Language | Python | 3.11+ |
| ORM | SQLAlchemy | >=2.0.36 |
| Database | SQLite (dev) / PostgreSQL (prod) | - |
| Migrations | Alembic | 1.13.1 |
| Validation | Pydantic | >=2.9.0 |
| Auth | python-jose (JWT), passlib (Argon2) | - |
| Browser Automation | Playwright | >=1.50.0 |
| AI Integration | Anthropic SDK (Claude) | >=0.40.0 |

### Infrastructure

- **Containerization:** Docker
- **Deployment:** Raspberry Pi with Cloudflare Tunnel
- **Networking:** UFW firewall, Cloudflare Tunnel for secure ingress

---

## Codebase Structure

```
ACe_Toolkit/
├── apps/
│   ├── web/                         # Next.js Frontend
│   │   ├── app/                     # App Router pages
│   │   │   ├── page.tsx             # Home page
│   │   │   ├── layout.tsx           # Root layout
│   │   │   ├── globals.css          # Global styles
│   │   │   ├── mermaid/page.tsx     # Mermaid editor
│   │   │   └── notes/page.tsx       # Notes app
│   │   ├── components/              # React components
│   │   │   ├── mermaid/             # Mermaid-specific components
│   │   │   │   ├── MermaidPreview.tsx
│   │   │   │   └── MarkdownDocumentView.tsx
│   │   │   └── ui/                  # UI utilities
│   │   │       └── ToastProvider.tsx
│   │   ├── lib/                     # Utilities
│   │   │   ├── api.ts               # API client layer
│   │   │   └── types.ts             # TypeScript definitions
│   │   ├── public/                  # Static assets
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   ├── tsconfig.json
│   │   ├── tailwind.config.ts
│   │   └── postcss.config.mjs
│   │
│   ├── api/                         # FastAPI Backend
│   │   ├── app/
│   │   │   ├── main.py              # FastAPI entry point
│   │   │   ├── schemas.py           # Pydantic request/response schemas
│   │   │   ├── models/
│   │   │   │   └── models.py        # SQLAlchemy models
│   │   │   ├── routers/             # API endpoints
│   │   │   │   ├── auth.py          # Authentication
│   │   │   │   ├── diagrams.py      # Diagram CRUD
│   │   │   │   ├── projects.py      # Project management
│   │   │   │   ├── charts.py        # Chart management
│   │   │   │   ├── session_notes.py # Session-based notes
│   │   │   │   ├── notes.py         # User notes (authenticated)
│   │   │   │   ├── ai.py            # AI-powered generation
│   │   │   │   └── export.py        # Export to image/PDF
│   │   │   ├── core/                # Core utilities
│   │   │   │   ├── config.py        # Configuration/settings
│   │   │   │   ├── database.py      # SQLAlchemy setup
│   │   │   │   └── security.py      # JWT, password hashing
│   │   │   └── wiki/                # Knowledge base integration
│   │   │       ├── openai_client.py
│   │   │       ├── bedrock_client.py
│   │   │       ├── openrouter_client.py
│   │   │       ├── azureai_client.py
│   │   │       ├── dashscope_client.py
│   │   │       ├── ollama_patch.py
│   │   │       ├── simple_chat.py
│   │   │       ├── rag.py
│   │   │       ├── websocket_wiki.py
│   │   │       └── tools/embedder.py
│   │   ├── .env.example             # Environment template
│   │   ├── requirements.txt         # Python dependencies
│   │   └── Dockerfile               # Container definition
│   │
│   └── deepwiki/                    # Placeholder (future use)
│
├── infra/                           # Infrastructure & Deployment
│   └── scripts/
│       ├── pi_setup.sh              # Raspberry Pi setup
│       └── run_tunnel.md            # Cloudflare Tunnel docs
│
├── packages/                        # Shared packages (future use)
├── .claude/                         # Claude Code metadata
├── package.json                     # Root monorepo config
├── package-lock.json
├── README.md
├── CLAUDE.md                        # This file
├── .gitignore
└── .env.web.example                 # Frontend env template
```

### Key Source Files

| File | Purpose | Lines |
|------|---------|-------|
| `apps/web/app/mermaid/page.tsx` | Main diagram editor with Monaco, AI panel, sidebar | 1000+ |
| `apps/web/app/notes/page.tsx` | Notes application with markdown editing | 800+ |
| `apps/web/lib/api.ts` | API client with all backend calls | 300+ |
| `apps/api/app/main.py` | FastAPI entry point, router mounting | 43 |
| `apps/api/app/routers/ai.py` | AI diagram generation (3-step process) | 100+ |
| `apps/api/app/models/models.py` | All SQLAlchemy database models | 100+ |

---

## API Reference

### Authentication (`/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | User registration | No |
| POST | `/login` | User login, returns JWT | No |
| POST | `/refresh` | Refresh access token | Yes (refresh token) |
| POST | `/logout` | User logout | Yes |

### Diagrams (`/diagrams`) - Authenticated

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List user's diagrams |
| GET | `/{id}` | Get specific diagram |
| POST | `/` | Create diagram |
| PUT | `/{id}` | Update diagram |
| DELETE | `/{id}` | Delete diagram |

### Projects (`/projects`) - Session-based

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all projects |
| GET | `/{id}` | Get specific project |
| POST | `/` | Create project |
| PUT | `/{id}` | Update project |
| DELETE | `/{id}` | Delete project |
| POST | `/sync` | Bulk sync projects |

### Charts (`/charts`) - Session-based

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/project/{project_id}` | List charts in project |
| GET | `/{id}` | Get specific chart |
| POST | `/` | Create chart |
| PUT | `/{id}` | Update chart |
| DELETE | `/{id}` | Delete chart |

### Session Notes (`/session-notes`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects` | List note projects |
| POST | `/projects` | Create note project |
| PUT | `/projects/{id}` | Update note project |
| DELETE | `/projects/{id}` | Delete note project |
| POST | `/note` | Create note |
| PUT | `/note/{id}` | Update note |
| DELETE | `/note/{id}` | Delete note |
| POST | `/sync` | Sync all note projects |

### AI (`/ai`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/generate` | Generate/repair diagrams using OpenAI | No |

AI generation uses a 3-step process:
1. Context analysis - Understands diagram type and user intent
2. Code generation - Creates valid Mermaid syntax
3. Summary creation - Provides changelog for the edition

### Export (`/export`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Export diagram to image/PDF (uses Playwright) |

---

## Database Schema

### User-Authenticated Models

```
User
├── id: Integer (PK)
├── name: String
├── email: String (unique)
├── hashed_password: String
├── created_at: DateTime
└── updated_at: DateTime

RefreshToken
├── id: Integer (PK)
├── token_hash: String
├── user_id: Integer (FK -> User)
├── expires_at: DateTime
└── created_at: DateTime

Diagram
├── id: Integer (PK)
├── title: String
├── code: Text
├── theme: String
├── owner_id: Integer (FK -> User)
├── created_at: DateTime
└── updated_at: DateTime

Note (authenticated)
├── id: Integer (PK)
├── title: String
├── content: Text
├── owner_id: Integer (FK -> User)
├── created_at: DateTime
└── updated_at: DateTime
```

### Session-Based Models (No Auth Required)

```
SessionProject
├── id: String (PK, UUID)
├── session_id: String
├── name: String
├── documents: JSON (array)
├── created_at: DateTime
└── updated_at: DateTime

SessionChart
├── id: String (PK, UUID)
├── project_id: String (FK -> SessionProject)
├── name: String
├── code: Text
├── editions: JSON (array of {code, description, timestamp})
├── document_id: String (nullable)
├── metadata: JSON
├── created_at: DateTime
└── updated_at: DateTime

SessionNoteProject
├── id: String (PK, UUID)
├── session_id: String
├── name: String
├── created_at: DateTime
└── updated_at: DateTime

SessionNote
├── id: String (PK, UUID)
├── project_id: String (FK -> SessionNoteProject)
├── title: String
├── content: Text
├── tags: JSON (array)
├── pinned: Boolean
├── created_at: DateTime
└── updated_at: DateTime
```

---

## Development Workflows

### Quick Start

```bash
# Terminal 1: Backend (from root)
npm run dev:api

# Terminal 2: Frontend (from root)
npm run dev:web
```

**Ports:**
- Frontend: http://localhost:3000
- Backend: http://localhost:8000

### Manual Backend Setup

```bash
cd apps/api
python3 -m venv .venv

# Activate virtual environment
source .venv/bin/activate      # Linux/macOS
.venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Manual Frontend Setup

```bash
cd apps/web
npm install
npm run dev
```

### Git Branching Strategy

All feature branches MUST follow this pattern:
```
claude/<description>-<SESSION_ID>
```

**Examples:**
- `claude/add-claude-documentation-MVWIy`
- `claude/implement-core-features-XYZ12`

**Important:** The `claude/` prefix and session ID suffix are REQUIRED for successful pushes.

### Commit Message Conventions

```
<type>: <subject>

<body (optional)>
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style/formatting
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

**Best Practices:**
- Use present tense ("add" not "added")
- Use imperative mood ("move" not "moves")
- Keep subject line under 50 characters

---

## Key Conventions

### Code Style

**TypeScript (Frontend):**
- Strict mode enabled
- ES modules (esModuleInterop)
- Path aliases: `@/*` maps to source root
- Functional components with hooks
- State management via React hooks (useState, useEffect, useCallback)

**Python (Backend):**
- Type hints with Pydantic models
- Async/await patterns with FastAPI
- SQLAlchemy 2.0 style queries
- Router-based endpoint organization

### File Naming

- **React Components:** PascalCase (`MermaidPreview.tsx`)
- **Utilities/Hooks:** camelCase (`api.ts`, `types.ts`)
- **Python Modules:** snake_case (`session_notes.py`)
- **Routes:** kebab-case in URLs (`/session-notes`)

### Testing

- **Frontend:** `npm run lint` for ESLint validation
- **Backend:** FastAPI Swagger UI at `/docs` for manual testing
- No automated test framework configured yet

---

## AI Assistant Guidelines

### Core Principles

1. **Read Before Modifying:**
   - ALWAYS read files before suggesting changes
   - Understand existing code structure
   - Maintain consistency with existing patterns

2. **Minimal Changes:**
   - Only make requested changes
   - Avoid over-engineering
   - Don't add unrequested features
   - Keep solutions simple and focused

3. **Security First:**
   - Watch for OWASP Top 10 vulnerabilities
   - Avoid command injection, XSS, SQL injection
   - Validate inputs at system boundaries
   - Use secure defaults

4. **Task Management:**
   - Use TodoWrite for multi-step tasks
   - Mark tasks in_progress when starting
   - Mark completed immediately when done
   - Keep only ONE task in_progress at a time

### Workflow for AI Assistants

**For New Features:**
1. Read CLAUDE.md to understand conventions
2. Create TodoWrite task list
3. Explore relevant existing code
4. Plan implementation
5. Implement incrementally
6. Test changes
7. Commit with clear message
8. Push to feature branch

**For Bug Fixes:**
1. Understand the bug (read related code)
2. Locate the issue
3. Fix with minimal changes
4. Verify fix works
5. Commit and push

### What NOT to Do

- Commit changes without explicit user request
- Skip git hooks (unless explicitly requested)
- Force push to main/master
- Create files unnecessarily
- Add features beyond requirements
- Use emojis unless requested
- Make time estimates
- Add backwards-compatibility hacks for unused code
- Create abstractions for one-time operations

### Tool Usage

- **Exploring codebase:** Use Task tool with subagent_type=Explore
- **File operations:** Use Read, Edit, Write (not bash cat/sed/echo)
- **Searching code:** Use Grep (not bash grep/rg)
- **Finding files:** Use Glob (not bash find/ls)
- **Git operations:** Use Bash for git commands
- **Multiple independent tasks:** Run tools in parallel
- **Dependent tasks:** Run tools sequentially

---

## Common Tasks

### Adding a New API Endpoint

1. Create or update router in `apps/api/app/routers/`
2. Add Pydantic schemas to `apps/api/app/schemas.py`
3. Register router in `apps/api/app/main.py`
4. Add API client function in `apps/web/lib/api.ts`
5. Add TypeScript types in `apps/web/lib/types.ts`

### Adding a New Frontend Page

1. Create page in `apps/web/app/<route>/page.tsx`
2. Add components in `apps/web/components/`
3. Update navigation in home page if needed

### Database Migrations

```bash
cd apps/api
alembic revision --autogenerate -m "description"
alembic upgrade head
```

### Environment Configuration

**Backend (`apps/api/.env`):**
```env
DATABASE_URL=sqlite:///./app.db
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=30
ALLOWED_ORIGINS=["http://localhost:3000","https://yourdomain.com"]
ANTHROPIC_API_KEY=your-anthropic-api-key
```

**Frontend (`apps/web/.env.local`):**
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

---

## Deployment

### Raspberry Pi Deployment

1. Copy `infra`, `apps/api` to the Pi
2. Run `infra/scripts/pi_setup.sh`
3. Run `docker-compose up -d --build` in `infra`
4. Setup Cloudflare Tunnel using `infra/scripts/run_tunnel.md`

### Security Configuration

- **JWT:** Tokens stored in HTTPOnly SameSite=Lax cookies
- **CORS:** Restricted to frontend domain only
- **Network:** Pi exposes no ports locally; use Cloudflare Tunnel
- **Firewall:** UFW configured to allow only SSH locally

### Vercel Frontend Deployment

Frontend can be deployed to Vercel with:
- Build command: `npm run build`
- Output directory: `.next`
- Environment variable: `NEXT_PUBLIC_API_BASE_URL`

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-01-12 | Complete rewrite with accurate codebase documentation | Claude |
| 2026-01-09 | Initial CLAUDE.md creation | Claude |

---

**Note to AI Assistants:** This document is your primary reference for understanding and working with the ACe_Toolkit repository. Always consult this file before making significant changes. Keep it updated as the project evolves.

# CLAUDE.md - ACe_Toolkit

**Last Updated:** January 22, 2026 | **Status:** Active | **Deployment:** Raspberry Pi + Cloudflare Tunnel

---

## Quick Reference

| Resource | URL |
|----------|-----|
| Production | https://orpheuscore.uk |
| API | https://api.orpheuscore.uk |
| API Docs | https://api.orpheuscore.uk/docs |
| Local Frontend | http://localhost:3000 |
| Local Backend | http://localhost:8000 |

---

## CRITICAL: Port Management

| Service | Port | Notes |
|---------|------|-------|
| Frontend (Next.js) | **3000** | ACe_Toolkit web app |
| Backend (FastAPI) | **8000** | ACe_Toolkit API |
| 3001, 8001 | **DO NOT TOUCH** | Other applications |

**Safe Commands:**
```bash
fuser -k 3000/tcp    # Kill frontend only
fuser -k 8000/tcp    # Kill backend only
lsof -i :3000 -i :8000  # Check our ports
```

---

## Applications Overview

| App | Route | Description |
|-----|-------|-------------|
| **CCResearch** | `/ccresearch` | Claude Code terminal with 140+ scientific MCP tools |
| **Workspace** | `/workspace` | Project-based file management with notes |
| **Data Analyst** | `/analyst` | AI data analysis with charts (AACT, CSV, Excel) |
| **Video Factory** | `/video-factory` | AI video production pipeline |
| **Import Research** | (Workspace AI tab) | Web crawling & GitHub analysis for projects |
| **Logs** | `/logs` | Real-time log viewer |
| **Notes** | `/notes` | Markdown note-taking |

**For detailed app documentation, see:**
- `apps/web/CLAUDE.md` - Frontend details
- `apps/api/CLAUDE.md` - Backend API reference

---

## Authentication

**System:** JWT tokens in HTTP-only cookies

| User Type | Access | Session |
|-----------|--------|---------|
| Admin | Full + user management | 30 days |
| Approved | Full access | 30 days |
| Trial | Full for 24h | 1 day |

**Protected Routes:** `/workspace`, `/analyst`, `/video-factory`, `/ccresearch`

**Per-User Data:** `/data/users/{user-uuid}/` (workspace, analyst, ccresearch, etc.)

---

## Codebase Structure

```
ACe_Toolkit/
├── apps/
│   ├── web/                    # Next.js Frontend (see apps/web/CLAUDE.md)
│   │   ├── app/                # App Router pages
│   │   ├── components/         # React components
│   │   └── lib/                # Utilities
│   │
│   └── api/                    # FastAPI Backend (see apps/api/CLAUDE.md)
│       ├── app/
│       │   ├── routers/        # API endpoints
│       │   ├── core/           # Managers, config, security
│       │   └── models/         # SQLAlchemy models
│       └── requirements.txt
│
├── infra/scripts/              # start_all.sh, stop_all.sh, status.sh
├── logs/                       # Application logs
└── CLAUDE.md                   # This file
```

---

## Development

**Quick Start:**
```bash
npm run dev:api   # Terminal 1: Backend
npm run dev:web   # Terminal 2: Frontend
```

**Manual:**
```bash
# Backend
cd apps/api && source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend
cd apps/web && npm run dev
```

**Git Branching:** `claude/<description>-<SESSION_ID>`

**Commit Format:** `<type>: <subject>` (feat, fix, docs, refactor, test, chore)

---

## Deployment (Raspberry Pi)

**Management:**
```bash
./infra/scripts/status.sh       # Check status
./infra/scripts/start_all.sh    # Start services
./infra/scripts/stop_all.sh     # Stop services
```

**Auto-Start:** `@reboot sleep 30 && /home/ace/dev/ACe_Toolkit/infra/scripts/start_all.sh`

**Logs:**
```bash
tail -f logs/backend-*.log
tail -f logs/frontend-*.log
journalctl -u cloudflared -f
```

---

## Key Conventions

**TypeScript:** Strict mode, functional components, path alias `@/*`

**Python:** Type hints, async/await, SQLAlchemy 2.0, Pydantic

**Naming:**
| Type | Convention | Example |
|------|------------|---------|
| React Components | PascalCase | `CCResearchTerminal.tsx` |
| Python Modules | snake_case | `ccresearch_manager.py` |
| Routes | kebab-case | `/ccresearch` |

---

## AI Assistant Guidelines

1. **Read Before Modifying** - Always read files first
2. **Minimal Changes** - Only make requested changes
3. **Security First** - Avoid OWASP Top 10 vulnerabilities
4. **Use TodoWrite** - Track multi-step tasks

**Don't:**
- Commit without explicit request
- Force push to main
- Create unnecessary files
- Add unrequested features

---

## Infrastructure

| Component | Details |
|-----------|---------|
| Platform | Raspberry Pi 5 (Linux ARM64) |
| Tunnel | Cloudflare Tunnel (active) |
| Database | SQLite (`apps/api/app.db`) |
| SSD | Samsung T7 1.8TB at `/data` |

**SSD Directories:**
```
/data/
├── users/              # Per-user data
├── ccresearch-projects/
├── ccresearch-logs/
└── claude-workspaces/
```

**Credentials:** `~/.credentials/credentials.json` (AACT, API keys)

---

## Recent Changes

| Date | Change |
|------|--------|
| 2026-01-22 | **SessionPicker:** CCResearch shows session list first (not New Session form) |
| 2026-01-22 | **RecentSessions:** Home page shows unified sessions from all apps |
| 2026-01-22 | **Workspace AI:** Collapsible files sidebar in AI tab |
| 2026-01-22 | **Session Manager:** Unified session management across apps |
| 2026-01-22 | Removed Research Assistant (to be integrated as Research Workspace later) |
| 2026-01-22 | **Import Research:** Web crawling & GitHub clone for Workspace projects |
| 2026-01-21 | Session rename without changing directories |
| 2026-01-21 | Remove saved session logic, add date grouping |
| 2026-01-21 | Fix AACT password handling (URL encoding) |
| 2026-01-21 | Add session sharing (public read-only links) |
| 2026-01-21 | Add "New Note" button to Workspace |
| 2026-01-20 | Unified Auth System with 24h trial |
| 2026-01-20 | Per-user data isolation |
| 2026-01-17 | AACT MCP server integration |
| 2026-01-16 | CCResearch security model (deny rules) |
| 2026-01-14 | CCResearch Terminal launch |

---

**For detailed documentation:**
- **Frontend:** `apps/web/CLAUDE.md`
- **Backend:** `apps/api/CLAUDE.md`

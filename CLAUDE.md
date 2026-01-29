# CLAUDE.md - ACe_Toolkit

**Last Updated:** January 29, 2026 | **Status:** Active | **Deployment:** Raspberry Pi + Cloudflare Tunnel

---

## Claude Code Extensions (User Scope)

All Claude Code extensions are configured at **user scope** (`~/.claude/`) for global availability across all sessions:

| Component | Count | Location |
|-----------|-------|----------|
| **MCP Servers** | 34 | `~/.claude.json` |
| **Skills** | 14 | `~/.claude/skills/` |
| **Agents** | 13 | `~/.claude/agents/` |
| **Plugins** | 15 | `~/.claude/settings.json` |

This means all C3 Researcher, Data Studio, and Video Studio sessions automatically have access to all extensions without per-project configuration.

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
| **C3 Researcher Workspace** | `/workspace` | Claude Code Custom Researcher - AI-powered research terminal |
| **C3 Data Studio** | `/data-studio` | AI-powered data analysis with headless Claude |
| **Remotion Video Studio** | `/video-studio` | AI video creation with Claude Code terminal + Remotion |

**C3 Researcher Workspace Features:**
- 145+ scientific skills, 34 MCP servers, 15 plugins (all user-scoped)
- Access to 30+ databases: PubMed, ChEMBL, AACT (566K+ trials), UniProt, etc.
- Claude Code terminal with SSH mode option
- Project-based workspace with notes and file management
- Welcome page shows all capabilities when no project selected
- `/ccresearch` redirects to `/workspace?tab=terminal`

**C3 Data Studio Features (V2 - Claude Code First):**
- **Claude Code Powered**: Uses `data-studio-analyst` skill for analysis
- **Standalone Projects**: Separate from Workspace at `/data/users/{user-id}/data-studio-projects/`
- **SSE Streaming**: Real-time analysis progress (headless or terminal mode)
- **Insight Caching**: Metadata and insights saved for faster re-analysis
- **Auto Dashboards**: 5-10 Plotly widgets generated from data insights
- **NLP Editing**: Natural language chart modifications via Claude
- **Python Venv**: Dedicated environment at `~/.local/share/data-studio-venv/`
- **File Support**: CSV, JSON, Excel (xlsx/xls), Parquet

**Data Studio Workflow:**
1. Create/select Data Studio project
2. Upload files or import from Workspace
3. Automatic data analysis (types, patterns, themes)
4. Auto-generated dashboard with editable widgets
5. NLP-based customization ("Add a pie chart for categories")

**Remotion Video Studio Features:**
- **Real PTY Terminal**: Full Claude Code terminal (like C3 Workspace, not headless)
- **Per-User Projects**: Each user gets isolated npm projects
- **`--dangerously-skip-permissions`**: Full access to all skills, MCP servers, plugins
- **Minimal CLAUDE.md**: Just paths and basics, Claude discovers capabilities dynamically
- **Workflow**: User inputs idea → Claude researches, plans, builds, renders → View video
- **Storage**: `/data/users/{user-id}/video-studio/{project-name}/`

**Unified Project Architecture:**
- Workspace projects: `/data/users/{user-id}/projects/{project-name}/`
- Data Studio projects: `/data/users/{user-id}/data-studio-projects/{project-name}/`
- Terminal uses Workspace project directory for `--continue` support
- Files, notes, and terminal share the same Workspace project context

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

**Protected Routes:** `/workspace`, `/data-studio`, `/video-studio`, `/ccresearch`

**Per-User Data:** `/data/users/{user-uuid}/projects/` (unified project storage)

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
│   └── {user-id}/
│       ├── projects/   # Unified project storage (CCResearch + Workspace)
│       │   └── {project-name}/
│       │       ├── .project.json  # Project metadata
│       │       ├── data/          # User files
│       │       ├── notes/         # Workspace notes
│       │       ├── output/        # Generated outputs
│       │       └── .claude/       # Workspace Claude config
│       ├── data-studio-projects/  # Data Studio projects
│       └── video-studio/          # Video Studio projects
│           └── {project-name}/
│               ├── .project.json  # Project metadata
│               ├── package.json   # npm project
│               ├── src/           # Remotion components
│               ├── public/        # Assets (images, audio)
│               ├── out/           # Rendered videos
│               └── .claude/       # Minimal CLAUDE.md
├── ccresearch-logs/    # Session logs
└── claude-workspaces/  # Legacy (deprecated)
```

**Credentials:** `~/.credentials/credentials.json` (AACT, API keys)

---

## Recent Changes

| Date | Change |
|------|--------|
| 2026-01-29 | **MIGRATION: User Scope Extensions** - All MCP, skills, agents, plugins moved to ~/.claude/ for global access |
| 2026-01-29 | **Cleanup:** Removed project-scope duplicates (.mcp.json, .claude/skills/, .claude/agents/) |
| 2026-01-28 | **NEW: Remotion Video Studio** - Real PTY terminal for video creation with full Claude access |
| 2026-01-28 | **Video Studio:** Per-user npm projects, --dangerously-skip-permissions, minimal CLAUDE.md |
| 2026-01-28 | **REMOVED: Video Factory** - Replaced by Video Studio |
| 2026-01-23 | **Data Studio:** Fix empty stat cards/charts - support alternate field names |
| 2026-01-23 | **Data Studio:** Fix [Object] display - properly stringify result objects |
| 2026-01-23 | **Data Studio:** Multi-file analysis mode selector (combined vs separate) |
| 2026-01-23 | **Data Studio:** NLP edit progress modal with live Claude output |
| 2026-01-23 | **Data Studio:** Retry logic for metadata/dashboard fetch with filesystem sync |
| 2026-01-23 | **Data Studio:** Fixed state transition issue (needed refresh to see dashboard) |
| 2026-01-23 | **Fix:** Claude runner prompts simplified, removed --resume flag (requires UUID) |
| 2026-01-23 | **Backend:** claude_runner.py replaces data_analyzer.py + dashboard_generator.py |
| 2026-01-23 | **Frontend:** Live terminal output during analysis with SSE streaming |
| 2026-01-23 | **MAJOR: Data Studio V2 Claude Code First** - Claude writes and executes analysis scripts |
| 2026-01-23 | **Frontend:** Complete rewrite with project selector, importer, analysis progress, dashboard view |
| 2026-01-22 | **Data Studio Fix:** Minimal MCP config, process tracking, memory optimization |
| 2026-01-22 | **C3 Data Studio** - File search, multi-select, folder grouping, --verbose fix |
| 2026-01-22 | **Code Cleanup:** Removed unused core modules (ai_provider, file_processor, langgraph_workflows, report_generator) |
| 2026-01-22 | **Frontend Cleanup:** Removed unused APIs (analystApi, researchApi, notesApi, projectsApi, chartsApi, mermaidDiskApi) |
| 2026-01-22 | **Fix:** GitHub clone `re` module error (Python 3.13 scoping issue) |
| 2026-01-22 | **Fix:** Project name sanitization - use hyphens instead of spaces for directory names |
| 2026-01-22 | **Terminal Default:** Terminal tab now default view when opening workspace |
| 2026-01-22 | **Import Data:** Multi-URL support, file upload tab, GitHub clone in workspace |
| 2026-01-22 | **RENAME: C3 Researcher Workspace** - Claude Code Custom Researcher |
| 2026-01-22 | **Welcome Page:** Comprehensive capabilities view when no project selected |
| 2026-01-22 | **No Auto-Select:** User must explicitly choose/create project to start |
| 2026-01-22 | **MAJOR: CCResearch merged into Workspace** - /ccresearch redirects to /workspace?tab=terminal |
| 2026-01-22 | **Terminal Tab:** Claude Code or SSH mode with stats bar (145+ skills, 26 MCP servers, etc.) |
| 2026-01-22 | **Unified Project Architecture** - Projects shared across all apps |
| 2026-01-22 | **Removed Apps:** Data Analyst, Logs Viewer, Notes, Import Research |
| 2026-01-22 | **Backend Cleanup:** Removed analyst, notes, logs, projects, research routers |
| 2026-01-22 | **Project Manager:** New unified `/data/users/{user-id}/projects/` storage |
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

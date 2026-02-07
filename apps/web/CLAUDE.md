# CLAUDE.md - Frontend (Next.js)

**Location:** `apps/web/` | **Port:** 3000 | **Framework:** Next.js 16 (App Router) | **Updated:** February 7, 2026

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16.1.1 (App Router) |
| Runtime | React 19.2.3 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| Code Editor | Monaco Editor 4.6.0 |
| Terminal | xterm.js 5.5.0 |
| Charts | Plotly.js, react-plotly.js |
| Dashboard | react-grid-layout |
| Icons | Lucide React |
| HTTP | Axios, fetch |

---

## Project Structure

```
apps/web/
├── app/                           # App Router pages
│   ├── page.tsx                   # Home page (Hero, Apps, Capabilities, Showcase, Experimental, WhatsNew)
│   ├── layout.tsx                 # Root layout (Header + Footer)
│   ├── api/                       # API routes (filesystem-backed)
│   │   ├── blog/                  # Blog API (reads from data/blog/)
│   │   └── diary/                 # Diary API (reads from data/diary/)
│   ├── blog/                      # Blog pages
│   │   ├── page.tsx               # Blog listing
│   │   ├── [slug]/page.tsx        # Blog post detail
│   │   └── drafts/                # Draft posts
│   ├── diary/                     # Agent Diary
│   │   └── page.tsx               # Calendar + entry view
│   ├── login/                     # Login page (standalone)
│   │   └── page.tsx
│   ├── ccresearch/
│   │   ├── page.tsx               # Redirects to /workspace?tab=terminal
│   │   └── share/[token]/page.tsx # Public share view
│   ├── workspace/page.tsx         # Workspace (Notes, Files, Terminal tabs)
│   ├── data-studio/               # C3 Data Studio V2 (REDESIGNED)
│   │   └── page.tsx               # Project selector, import, analysis, dashboard
│   └── video-studio/              # Remotion Video Studio
│       └── page.tsx               # Project selector, terminal, video gallery
├── components/
│   ├── auth/                      # Authentication
│   │   ├── AuthProvider.tsx       # React Context
│   │   ├── LoginModal.tsx         # Login/Signup modal
│   │   ├── ProtectedRoute.tsx     # Auth wrapper
│   │   └── ExperimentalBanner.tsx # Disclaimer
│   ├── blog/                      # Blog components
│   │   ├── BlogPost.tsx           # Blog post renderer
│   │   └── Comments.tsx           # Comment system
│   ├── ccresearch/                # CCResearch components
│   │   ├── SessionPicker.tsx      # Project list/create view (not sessions)
│   │   ├── CCResearchTerminal.tsx # Terminal component (serialize + search addons)
│   │   └── FileBrowser.tsx        # File browser panel
│   ├── workspace/                 # Workspace view components
│   │   ├── TerminalView.tsx       # Terminal container, session controls, recording UI
│   │   ├── NotesView.tsx          # Notes editor, file preview (25+ types)
│   │   ├── SessionPlayer.tsx      # Asciinema player wrapper (speed, fullscreen)
│   │   ├── RecordingsList.tsx     # Recording list with play/delete
│   │   ├── ProjectSidebar.tsx
│   │   ├── MobileTerminalInput.tsx
│   │   ├── NoteCard.tsx
│   │   ├── NoteEditor.tsx
│   │   └── DataBrowser.tsx
│   ├── diary/                     # Diary components
│   │   ├── DiaryCalendar.tsx      # Calendar navigation
│   │   └── DiaryEntry.tsx         # Entry renderer
│   ├── home/                      # Home page components
│   │   ├── HeroSection.tsx        # Hero with stats + CTA
│   │   ├── AppSection.tsx         # Application cards (Workspace, Data Studio, Video Studio)
│   │   ├── CapabilitiesGrid.tsx   # Scientific capabilities grid
│   │   ├── ShowcasePreview.tsx    # Showcase preview
│   │   ├── ExperimentalSection.tsx # OpenClaw Lab + Blog highlights
│   │   ├── WhatsNewSection.tsx    # Ship Log / recent updates
│   │   └── RecentSessions.tsx     # Unified project view
│   ├── layout/                    # Layout components
│   │   ├── Header.tsx             # Sticky nav (Workspace, Directory, Showcase, Blog)
│   │   └── Footer.tsx             # Footer (Applications + Content columns)
│   ├── workspace/                 # Workspace components
│   │   ├── ProjectSidebar.tsx
│   │   ├── MobileTerminalInput.tsx
│   │   ├── NoteCard.tsx
│   │   ├── NoteEditor.tsx
│   │   └── DataBrowser.tsx
│   ├── ui/
│   │   ├── MobileMenu.tsx         # Hamburger menu for mobile nav
│   │   └── ToastProvider.tsx
│   └── ErrorBoundary.tsx          # React error boundary with fallback UI
├── lib/
│   ├── api/                       # Modular API client (split from api.ts)
│   │   ├── client.ts              # Shared CSRF headers, getApiUrl()
│   │   ├── auth.ts                # authApi
│   │   ├── workspace.ts           # workspaceApi
│   │   ├── dataStudio.ts          # dataStudioApi, dataStudioV2Api
│   │   ├── types.ts               # Shared API types
│   │   └── index.ts               # Re-exports (backward compatible)
│   ├── blog.ts                    # Blog utilities (gray-matter frontmatter parsing)
│   └── types.ts                   # TypeScript types
├── data/
│   ├── blog/                      # Blog post markdown files (frontmatter + MDX)
│   ├── diary/                     # Diary entry markdown files
│   └── ccresearch/
│       ├── capabilities.json      # Plugins, MCP servers
│       └── use-cases.json         # Example prompts
├── public/
│   └── blog/images/               # Blog post images
├── package.json
└── next.config.ts
```

---

## Applications

### CCResearch (`/ccresearch`) - REDIRECTS TO WORKSPACE

**Status:** Merged into C3 Researcher Workspace. Route redirects to `/workspace?tab=terminal`.

The CCResearch terminal functionality has been fully integrated into the Workspace Terminal tab.
Legacy share links still work at `/ccresearch/share/[token]`.

### C3 Researcher Workspace (`/workspace`)

Claude Code Custom Researcher - AI-powered research terminal with comprehensive scientific capabilities.

**Features:**
- 145+ scientific skills, 34 MCP servers, 15 plugins
- Access to 30+ databases: PubMed, ChEMBL, AACT (566K+ trials), UniProt, etc.
- Project organization with unified storage
- **Project persistence**: Last opened project auto-restores on page refresh
- Markdown notes with live preview (GFM tables, Mermaid)
- File browser with sort by name/date/size
- File preview (markdown, images, CSV, Excel, DOCX, PDF, code files)
- Inline file editing
- Auto-refresh every 10s

**State Persistence (localStorage):**
| Key | Description |
|-----|-------------|
| `workspace_selected_project` | Last opened project name |
| `workspace_view_mode` | Active tab (terminal/notes/data) |
| `workspace_terminal_mode` | Terminal type (claude/ssh) |
| `workspace_file_browser_open` | File browser sidebar state |
| `workspace_sidebar_collapsed` | Project sidebar collapsed state |

URL params (`?project=name&tab=notes`) take priority over localStorage on load.

**Welcome Page (No Project Selected):**
When no project is selected, displays comprehensive capabilities overview:
- Stats grid (skills, MCP servers, plugins, databases)
- Getting Started guide
- Claude Commands & Keyboard Shortcuts
- Scientific Capabilities by category
- MCP Servers list with status
- Plugins list with descriptions
- Example prompts with copy functionality
- Links to Use Cases and Tips pages

**Views:**
- **Notes:** Markdown notes with "New Note" button for manual creation
- **Files:** Full file explorer with navigation, click to preview any file
- **Terminal:** Full Claude Code terminal (merged from CCResearch)
  - Terminal mode selection: Claude Code (default) or SSH mode
  - SSH mode requires access key
  - Stats bar: 145+ skills, 34 MCP servers, 15 plugins, 566K+ clinical trials
  - File browser sidebar with upload and refresh
  - Import Data modal (GitHub clone, Web URL fetch)
  - Session list with Resume option
  - Use Cases and Tips buttons
  - Real-time connection status indicator

**File Preview Support:**
| Type | Features |
|------|----------|
| Markdown | Full rendering with GFM, inline edit |
| Mermaid | Rendered diagrams + source code |
| Code (JS, TS, Python, etc.) | Syntax preview, inline edit |
| JSON, YAML, XML | Preview with editing |
| Images | PNG, JPG, GIF, WebP, SVG |
| Videos | MP4, WebM with controls |
| Audio | MP3, WAV, FLAC player |
| PDF | Embedded viewer |
| CSV | Table with headers (PapaParse) |
| Excel | XLSX/XLS table (SheetJS) |
| DOCX | HTML conversion (Mammoth.js) |
| JSON | Syntax highlighted |

### C3 Data Studio (`/data-studio`) - REDESIGNED

**All-rounder AI data analyst framework** with standalone project system, smart metadata extraction, auto-generated dashboards, and NLP-based editing.

**Architecture (V2):**
- **Standalone Projects**: Separate from Workspace projects at `/data/users/{user-id}/data-studio-projects/`
- **Smart Analysis**: Python-based metadata extraction with pandas, scipy
- **Auto Dashboards**: 5-10 widgets generated based on data characteristics
- **NLP Editing**: Natural language control of individual widgets or entire dashboards
- **Plotly.js Rendering**: Charts use Plotly specs with dark theme

**User Flow:**
1. **Project Selection**: Create new or select existing Data Studio project
2. **Data Import**: Upload files or import from Workspace projects
3. **Analysis Mode Selection**: Combined (unified) or Separate (per-file) for multiple files
4. **Analysis**: Automatic scanning with live terminal output
5. **Dashboard**: Auto-generated visualizations with NLP editing

**Analysis Modes (Multi-File):**
| Mode | Description |
|------|-------------|
| `combined` | Unified cross-file analysis, finds relationships and common columns |
| `separate` | Detailed per-file insights, saves to `.analysis/file_analyses/` |

When uploading multiple files, a modal asks user to choose the analysis mode.

**Components:**
- `ProjectSelector` - Create/select Data Studio projects
- `CreateProjectModal` - New project creation dialog
- `DataImporter` - File upload, Workspace import, analysis mode selector
- `AnalysisProgressView` - Live terminal output with phase indicators
- `DashboardView` - Main dashboard with sidebar, canvas, and NLP bar
- `WidgetCard` - Individual widget with edit/remove controls
- `PlotlyWidget` - Renders Plotly specifications
- `StatCard` - Metric display cards

**Analysis Progress Features:**
- Live terminal output showing Claude's work
- Phase indicators (Scan → Analyze → Generate → Done)
- Shows actual file names and counts
- Retry logic with filesystem sync delays
- Detailed error messages with troubleshooting tips

**Widget Types:**
| Type | Description |
|------|-------------|
| `stat_card` | Single metric with label |
| `histogram` | Distribution chart |
| `bar_chart` | Categorical comparison |
| `line_chart` | Time series |
| `pie_chart` | Proportions (donut style) |
| `scatter` | Correlation plot |
| `table` | Data table |
| `mermaid` | Diagrams (data overview) |

**NLP Edit Bar:**
- Dashboard-wide edits: "Add a pie chart for categories"
- Single widget edits: Click edit icon, then describe changes
- Progress modal with live Claude output
- Auto-closes on success

**API Integration:**
Uses `dataStudioV2Api` from `lib/api.ts`:
- `listProjects()`, `createProject()`, `deleteProject()`
- `listFiles()`, `uploadFiles()`, `importFromWorkspace()`
- `analyzeProject(name, { mode, analysisMode })`, `getMetadata()`
- `listDashboards()`, `getDashboard()`, `generateDashboard()`
- `nlpEdit(name, request, { mode: 'terminal' })`, `saveDashboard()`

**Storage:**
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

### Remotion Video Studio (`/video-studio`)

AI-powered video creation using a real Claude Code PTY terminal with full skill/MCP access.

**Features:**
- Real PTY terminal (not headless) - same as C3 Workspace terminal
- Per-user isolated npm projects with Remotion setup
- `--dangerously-skip-permissions` flag for full Claude access
- Minimal CLAUDE.md - Claude discovers capabilities dynamically
- Project selector with video gallery sidebar
- WebSocket terminal with xterm.js
- Video playback and download

**Architecture:**
```
┌─────────────────────────────────────────────────────────────┐
│  Views                                                       │
│  ┌──────────┐    ┌──────────────────┐    ┌───────────────┐ │
│  │ Project  │ -> │    Terminal      │ <- │ Video Gallery │ │
│  │ Selector │    │  (xterm.js)      │    │  (sidebar)    │ │
│  └──────────┘    └──────────────────┘    └───────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**User Flow:**
1. Create/select project (auto-creates npm + Remotion scaffolding)
2. Install dependencies (npm install - one-time per project)
3. Enter video idea and start session
4. Watch Claude work in real-time terminal
5. Claude researches, plans, builds video composition, renders
6. Videos appear in sidebar gallery
7. Play, download, or delete videos

**Components:**
- Project selector modal
- Video idea input with "Start Session" button
- xterm.js terminal (dynamically imported for SSR)
- Video gallery sidebar with thumbnails
- Video player modal

**Technical Details:**
- xterm.js loaded via dynamic import (avoid SSR "self is not defined")
- CSS loaded via CDN link element
- WebSocket authenticated via HTTP-only cookie
- Terminal resize events sent as JSON commands
- Process lifecycle managed by VideoStudioManager

**API Integration:**
- `GET /video-studio/projects` - List projects
- `POST /video-studio/projects` - Create project
- `POST /video-studio/projects/{name}/install` - npm install
- `POST /video-studio/projects/{name}/session` - Start Claude session
- `WS /video-studio/terminal/{name}` - Terminal WebSocket
- `GET /video-studio/projects/{name}/videos` - List videos
- `GET /video-studio/projects/{name}/videos/{filename}` - Stream video

**Storage:**
```
/data/users/{user-id}/video-studio/{project}/
├── .project.json          # Project metadata
├── package.json           # npm (Remotion dependencies)
├── src/                   # Video components
├── public/                # Assets
├── out/                   # Rendered MP4 videos
└── .claude/
    └── CLAUDE.md          # Minimal instructions
```

### Blog System (`/blog`)

Markdown-powered blog with frontmatter metadata, served via filesystem-backed API routes.

**Features:**
- Blog listing page with tag filtering
- Individual post pages at `/blog/[slug]`
- Comment system component
- Draft support at `/blog/drafts/`
- Images served from `public/blog/images/`

**Data Flow:**
1. Blog posts stored as markdown in `data/blog/` with gray-matter frontmatter
2. API route `/api/blog/posts` reads and parses the files
3. `lib/blog.ts` provides utilities for frontmatter parsing
4. Components in `components/blog/` render the posts

**Frontmatter Fields:** title, date, author, tags, excerpt, image, published

### Agent Diary (`/diary`)

Calendar-based diary showing AI agent activity logs and development notes.

**Features:**
- Calendar navigation (DiaryCalendar component)
- Entry renderer (DiaryEntry component)
- API route `/api/diary/entries` reads from `data/diary/`

### Login Page (`/login`)

Standalone login page (alternative to the modal-based login).

### Landing Page (`/`)

Home page composed of modular sections:

| Section | Component | Description |
|---------|-----------|-------------|
| Hero | `HeroSection.tsx` | Animated stats, tagline, CTA buttons |
| Applications | `AppSection.tsx` | Cards for Workspace, Data Studio, Video Studio |
| Capabilities | `CapabilitiesGrid.tsx` | Scientific tools and databases grid |
| Showcase | `ShowcasePreview.tsx` | Featured use cases |
| Experimental Lab | `ExperimentalSection.tsx` | OpenClaw multi-agent AI (Alfred + Pip), blog highlights |
| Ship Log | `WhatsNewSection.tsx` | Recent updates (Opus 4.6, agents, security, etc.) |

**Navigation:**
- **Header** (`layout/Header.tsx`): Sticky nav with Workspace, Directory, Showcase, Blog + mobile hamburger menu
- **Footer** (`layout/Footer.tsx`): Three-column layout (Logo, Applications, Content)

---

## Authentication

### Components

| Component | Description |
|-----------|-------------|
| `AuthProvider` | React Context for auth state |
| `LoginModal` | Login/Signup with trial info |
| `ProtectedRoute` | Wrapper for authenticated pages |
| `ExperimentalBanner` | Disclaimer banner |
| `ErrorBoundary` | React error boundary with fallback UI (catches render errors gracefully) |

### Usage

```tsx
// Wrap protected pages
<ProtectedRoute>
  <WorkspacePage />
</ProtectedRoute>

// Access auth state
const { user, isLoading, logout } = useAuth();
```

### API Calls

All authenticated API calls MUST include credentials:
```typescript
fetch(url, {
  credentials: 'include',  // Required for cookies
  // ...
});
```

---

## API Client (`lib/api/`)

Modular API client split into separate files (2026-02-06 audit). All existing `import { ... } from '@/lib/api'` imports still work via `index.ts` re-exports.

**Directory Structure:**
```
lib/api/
├── client.ts      # Shared CSRF_HEADERS, getApiUrl()
├── auth.ts        # authApi + auth types
├── workspace.ts   # workspaceApi + workspace types
├── dataStudio.ts  # dataStudioApi, dataStudioV2Api + types
├── types.ts       # Shared types (DashboardInfo, etc.)
└── index.ts       # Re-exports everything (backward compatible)
```

**Active Exports:**
- `authApi` - Authentication (login, register, logout, refresh)
- `workspaceApi` - Projects, notes, files, sessions
- `dataStudioApi` - Data Studio sessions, dashboards, WebSocket
- `dataStudioV2Api` - Data Studio V2 projects, analysis, dashboards, NLP
- `CSRF_HEADERS` - Shared `X-Requested-With` header for CSRF protection
- `getApiUrl()` - Centralized API base URL helper

**Removed Exports (2026-01-22):**
- `analystApi` - Data Analyst (app removed)
- `researchApi` - Research Assistant (app removed)
- `notesApi` - Standalone notes (now in workspace)
- `projectsApi` - Legacy projects (replaced by workspace)
- `chartsApi` - Mermaid charts (app removed)
- `mermaidDiskApi` - Disk export (app removed)
- `fetchWithAuth` - Legacy auth wrapper (unused)

```typescript
// Example usage (unchanged - backward compatible)
import { authApi, workspaceApi } from '@/lib/api';

// Authentication
await authApi.login(email, password);
await authApi.logout();

// Workspace
await workspaceApi.listProjects();
await workspaceApi.createNote(projectName, note);
```

---

## UI Patterns

### Date Grouping

Sessions grouped by: Today, Yesterday, This Week, or specific date.

```typescript
const getDateGroup = (dateStr: string) => {
  const date = new Date(dateStr);
  const today = new Date();
  // ... logic for Today, Yesterday, This Week, older
};
```

### Inline Editing

Pattern for inline edit with save/cancel:

```typescript
const [editingId, setEditingId] = useState<string | null>(null);
const [editingValue, setEditingValue] = useState('');

const startEdit = (id: string, currentValue: string) => {
  setEditingId(id);
  setEditingValue(currentValue);
};

const saveEdit = async () => {
  await api.update(editingId, editingValue);
  setEditingId(null);
};
```

### Modal Pattern

```tsx
{showModal && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
      {/* Modal content */}
    </div>
  </div>
)}
```

---

## CCResearch Documentation Maintenance

When updating Claude Code skills/plugins/MCP servers, update these files:

**Data Files:**
```
apps/web/data/ccresearch/
├── capabilities.json   # Plugins, MCP servers summary
└── use-cases.json      # Example prompts by category
```

**Update Checklist:**
- [ ] Add new tool to `capabilities.json`
- [ ] Add example prompt to `use-cases.json`
- [ ] Set `verified: true` if tested
- [ ] Update stats counts
- [ ] Rebuild frontend: `npm run build`

---

## Environment Variables

**File:** `apps/web/.env.local`

```env
# Production (deployed on Mac Mini via Cloudflare tunnel)
NEXT_PUBLIC_API_BASE_URL=https://api.orpheuscore.uk

# Development (local only - change when testing locally)
# NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

**IMPORTANT:** This URL is baked into the Next.js build. After changing, you must rebuild (`npm run build`).

---

## Development

```bash
# Install
npm install

# Dev mode
npm run dev

# Build
npm run build

# Start production
npm run start
```

---

## Key Conventions

**Components:**
- Functional components with hooks
- PascalCase naming
- Path alias: `@/*` for imports

**Styling:**
- Tailwind CSS classes
- Dark theme (gray-900 background)
- Consistent spacing (p-4, gap-4, etc.)

**State Management:**
- React useState/useEffect
- Context for global state (auth)
- localStorage for persistence

---

## File Naming

| Type | Convention | Example |
|------|------------|---------|
| Pages | `page.tsx` in route folder | `app/ccresearch/page.tsx` |
| Components | PascalCase | `CCResearchTerminal.tsx` |
| Utilities | camelCase | `api.ts` |
| Data files | kebab-case | `use-cases.json` |

---

## Removed Code

**2026-01-28:**
- `app/video-factory/page.tsx` - Video Factory (entire app removed)

**2026-01-22:**
- `components/analyst/` - Data Analyst UI (entire directory removed)
- `app/analyst/page.tsx` - Data Analyst page (removed)
- `app/notes/page.tsx` - Standalone notes (removed)
- `app/logs/page.tsx` - Logs viewer (removed)

**API Cleanup:**
- Reduced `lib/api.ts` from 823 to 510 lines
- Removed 6 unused API clients and related interfaces
- Removed `fetchWithAuth` and legacy `API_URL` constant

---

## Recent Updates

| Date | Change |
|------|--------|
| 2026-02-07 | **MAJOR: Session Recording & Replay** - SessionPlayer (asciinema-player wrapper with speed 0.5x-4x, fullscreen), RecordingsList, terminal search (Ctrl+F via @xterm/addon-search), terminal buffer serialize (@xterm/addon-serialize), red REC indicator + Recordings button in TerminalView, rich share pages (replay/transcript/files tabs with OG meta tags), workspace page.tsx split (2988→951 lines into TerminalView + NotesView), recordingsApi in workspace.ts |
| 2026-02-07 | **Landing Page:** ExperimentalSection (OpenClaw Lab + blog highlights) and WhatsNewSection (Ship Log) |
| 2026-02-07 | **NEW: Blog System** - Markdown blog with frontmatter, API routes, tag filtering, comments |
| 2026-02-07 | **NEW: Agent Diary** - Calendar-based diary with API routes |
| 2026-02-07 | **NEW: Login Page** - Standalone login at `/login` |
| 2026-02-07 | **Layout:** Shared Header (added Blog nav) and Footer (Applications + Content columns) |
| 2026-02-07 | **Home:** Modular sections (Hero, Apps, Capabilities, Showcase, Experimental, WhatsNew) |
| 2026-02-07 | **FIX: Mobile Terminal Font** - Reduced xterm.js fontSize from 16 to 12 on mobile (canvas doesn't trigger iOS auto-zoom) |
| 2026-02-07 | **.gitignore:** Added db backups, recordings symlink, blog generation artifacts |
| 2026-02-07 | **README:** Complete rewrite with OpenClaw, blog links, all 3 apps, security details |
| 2026-02-06 | **AUDIT: Quality & Security** - Split api.ts into modular lib/api/ directory, ErrorBoundary component, fixed 25 any-type violations, hardened DOMPurify config, fixed dynamic Tailwind classes, added ARIA labels, lazy loading for heavy deps, removed 24 console statements, next/image optimization, CSRF headers on all mutation requests |
| 2026-02-04 | **FIX: Mobile Viewport** - Added viewport meta tag for proper mobile device scaling |
| 2026-02-04 | **FIX: Auth Token Refresh** - AuthProvider now uses ref to track login state, avoiding stale closure |
| 2026-02-04 | **FIX: Refresh Interval** - Changed from 12 hours to 10 minutes to prevent token expiry issues |
| 2026-02-04 | **FIX: API Error Detection** - getStatus/getCurrentUser properly detect trial_expired errors |
| 2026-02-04 | **Cleanup:** Removed duplicate `refreshToken` function from api.ts (only `refresh` used) |
| 2026-02-03 | **Workspace:** Project persistence - last opened project auto-restores on refresh |
| 2026-02-03 | **Workspace:** State persisted to localStorage (project, view mode, terminal mode, sidebar) |
| 2026-02-03 | **Workspace:** URL params take priority over localStorage for deep linking |
| 2026-01-28 | **NEW: Remotion Video Studio** - Real PTY terminal + Remotion for video creation |
| 2026-01-28 | **REMOVED: Video Factory** - Old headless approach deleted |
| 2026-01-23 | **Data Studio:** Fix empty stat cards - support alternate field names (value/stat_value) |
| 2026-01-23 | **Data Studio:** Fix [Object] display - properly stringify result objects |
| 2026-01-23 | **Data Studio:** Remove redundant "Starting Claude Code session" message |
| 2026-01-23 | **Data Studio:** Multi-file analysis mode selector (combined vs separate) |
| 2026-01-23 | **Data Studio:** NLP edit progress modal with live Claude output |
| 2026-01-23 | **Data Studio:** Fixed file count display (passes actual count from DataImporter) |
| 2026-01-23 | **Data Studio:** Improved Claude output display (multi-line, result samples) |
| 2026-01-23 | **Data Studio:** Retry logic for metadata/dashboard fetch with filesystem sync |
| 2026-01-23 | **Data Studio V2:** Live terminal output during analysis with SSE streaming |
| 2026-01-23 | **Data Studio V2:** AnalysisProgressView shows Claude Code events in real-time |
| 2026-01-23 | **Fix:** TypeScript errors in analysis flow (metadata null check, nlpEdit options) |
| 2026-01-22 | **Data Studio Fix:** Added `result` event type, improved event handling |
| 2026-01-22 | **C3 Data Studio** - AI-powered data analysis with headless Claude |
| 2026-01-22 | Added react-grid-layout, Plotly.js for dashboard visualizations |
| 2026-01-22 | Terminal as default view when opening workspace |
| 2026-01-22 | Import Data modal with multi-URL support and file upload tab |
| 2026-01-22 | Code cleanup - removed unused APIs and components |
| 2026-01-22 | Project name sanitization uses hyphens instead of spaces |
| 2026-01-22 | Welcome page redesign with video, tabs, bento grid |
| 2026-01-22 | CCResearch merged into Workspace Terminal tab |

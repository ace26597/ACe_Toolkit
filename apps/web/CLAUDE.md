# CLAUDE.md - Frontend (Next.js)

**Location:** `apps/web/` | **Port:** 3000 | **Framework:** Next.js 16 (App Router)

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
│   ├── page.tsx                   # Home page
│   ├── layout.tsx                 # Root layout
│   ├── ccresearch/
│   │   ├── page.tsx               # CCResearch Terminal (Create Project flow)
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
│   ├── ccresearch/                # CCResearch components
│   │   ├── SessionPicker.tsx      # Project list/create view (not sessions)
│   │   ├── CCResearchTerminal.tsx # Terminal component
│   │   └── FileBrowser.tsx        # File browser panel
│   ├── home/                      # Home page components
│   │   └── RecentSessions.tsx     # Unified project view
│   ├── workspace/                 # Workspace components
│   │   ├── ProjectSidebar.tsx
│   │   ├── NoteCard.tsx
│   │   ├── NoteEditor.tsx
│   │   └── DataBrowser.tsx
│   └── ui/
│       └── ToastProvider.tsx
├── lib/
│   ├── api.ts                     # API client
│   └── types.ts                   # TypeScript types
├── data/
│   └── ccresearch/
│       ├── capabilities.json      # Plugins, MCP servers
│       └── use-cases.json         # Example prompts
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
- 145+ scientific skills, 26 MCP servers, 14 plugins
- Access to 30+ databases: PubMed, ChEMBL, AACT (566K+ trials), UniProt, etc.
- Project organization with unified storage
- Markdown notes with live preview (GFM tables, Mermaid)
- File browser with sort by name/date/size
- File preview (markdown, images, CSV, Excel, DOCX, PDF, code files)
- Inline file editing
- Auto-refresh every 10s

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
  - Stats bar: 145+ skills, 26 MCP servers, 14 plugins, 566K+ clinical trials
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

---

## Authentication

### Components

| Component | Description |
|-----------|-------------|
| `AuthProvider` | React Context for auth state |
| `LoginModal` | Login/Signup with trial info |
| `ProtectedRoute` | Wrapper for authenticated pages |
| `ExperimentalBanner` | Disclaimer banner |

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

## API Client (`lib/api.ts`)

Centralized API methods for all backends.

**Active Exports:**
- `authApi` - Authentication (login, register, logout, refresh)
- `workspaceApi` - Projects, notes, files, sessions
- `dataStudioApi` - Data Studio sessions, dashboards, WebSocket

**Removed Exports (2026-01-22):**
- `analystApi` - Data Analyst (app removed)
- `researchApi` - Research Assistant (app removed)
- `notesApi` - Standalone notes (now in workspace)
- `projectsApi` - Legacy projects (replaced by workspace)
- `chartsApi` - Mermaid charts (app removed)
- `mermaidDiskApi` - Disk export (app removed)
- `fetchWithAuth` - Legacy auth wrapper (unused)

```typescript
// Example usage
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
# Production (deployed on Raspberry Pi via Cloudflare tunnel)
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

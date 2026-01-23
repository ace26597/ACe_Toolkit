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
│   ├── data-studio/               # C3 Data Studio (NEW)
│   │   ├── page.tsx               # Main page with chat + dashboard
│   │   └── hooks/
│   │       └── useDataStudioSession.ts  # WebSocket session hook
│   └── video-factory/page.tsx     # Video Factory
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

### C3 Data Studio (`/data-studio`) - NEW

AI-powered data analysis and visualization using headless Claude Code.

**Architecture:**
- Runs Claude in headless mode (`-p --output-format stream-json`)
- No terminal UI - clean chat + dashboard interface
- Uses existing Workspace project data files
- Separate `.data-studio/` directory to avoid session conflicts
- Minimal MCP config (only filesystem) for reduced memory usage
- Process tracking with automatic cleanup on new message/session close

**Features:**
- Real-time streaming of Claude's thinking, tool calls, and outputs
- Interactive chat panel with message history
- Dashboard canvas for pinned visualizations (Plotly.js)
- Data file browser (CSV, JSON, Excel, Parquet)
- Code execution display with syntax highlighting
- 5-minute timeout for long-running operations

**Components:**
- `ProjectSelector` - Select existing workspace project
- `ChatPanel` - Send messages, view Claude's responses, quick actions
- `MessageBubble` - Renders text, tool calls, code blocks
- `DashboardCanvas` - Draggable widget grid (react-grid-layout)
- `DataFilesList` - File browser with search, multi-select, folder grouping

**Interactive Features:**
- File search by name
- Multi-select with checkboxes
- Folder grouping with collapsible sections
- File type icons: CSV (green), Excel (emerald), JSON (yellow), MD (blue)
- "Analyze Selected" button for multi-file analysis
- "Select All" / "Clear Selection" quick actions
- Quick actions: List all, Data overview, Find patterns, Create chart

**WebSocket Events:**
| Event Type | Description |
|------------|-------------|
| `thinking` | Claude's reasoning process |
| `tool_call` | Tool being invoked with input |
| `tool_result` | Tool execution result |
| `code` | Code block with language |
| `text` / `text_delta` | Response text (streaming) |
| `chart` | Plotly chart data for dashboard |
| `table` | Table data for display |
| `error` | Error message |
| `done` | Response complete |

**Storage:**
```
/data/users/{user-id}/projects/{project}/
├── data/              # User data files (shared with Workspace)
├── .data-studio/      # Data Studio specific
│   ├── sessions/      # Claude session state
│   └── dashboards/    # Saved dashboard layouts
└── .claude/           # Workspace Claude config
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
- `dataStudioApi` - Data Studio sessions, dashboards, WebSocket (NEW)

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
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
# Production: https://api.orpheuscore.uk
```

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

## Removed Code (2026-01-22)

**Components:**
- `components/analyst/` - Data Analyst UI (entire directory removed)

**Pages:**
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
| 2026-01-22 | **Data Studio Fix:** Added `result` event type, improved event handling |
| 2026-01-22 | **C3 Data Studio** - AI-powered data analysis with headless Claude |
| 2026-01-22 | Added react-grid-layout, Plotly.js for dashboard visualizations |
| 2026-01-22 | Terminal as default view when opening workspace |
| 2026-01-22 | Import Data modal with multi-URL support and file upload tab |
| 2026-01-22 | Code cleanup - removed unused APIs and components |
| 2026-01-22 | Project name sanitization uses hyphens instead of spaces |
| 2026-01-22 | Welcome page redesign with video, tabs, bento grid |
| 2026-01-22 | CCResearch merged into Workspace Terminal tab |

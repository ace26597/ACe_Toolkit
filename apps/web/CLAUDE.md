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

### CCResearch Terminal (`/ccresearch`)

Claude Code Research Platform with 140+ scientific MCP tools.

**Features:**
- Full PTY terminal (xterm.js + WebSocket)
- **SessionPicker:** Project list shown first (not form) - select existing or create new
- Email whitelist authentication
- File upload on session creation
- Session sharing (public read-only links)
- Date-grouped session list (Today, Yesterday, This Week)
- Inline session renaming
- Collapsible file browser panel

**Key Components:**
- `app/ccresearch/page.tsx` - Main terminal page
- `components/ccresearch/SessionPicker.tsx` - Session list/create view
- `components/ccresearch/FileBrowser.tsx` - File browser panel
- `app/ccresearch/share/[token]/page.tsx` - Public share view

**Session Lifecycle:**
1. See existing sessions OR create new (SessionPicker)
2. For new: Enter access key (optional), upload files (optional)
3. Session created with isolated workspace
4. Claude Code or bash terminal starts
5. Sessions persist until deleted (24h auto-cleanup)

**Plugins Available:** 13 plugins, 26 MCP servers, 140+ skills

### Workspace (`/workspace`)

Project-based file management with notes.

**Features:**
- Project organization
- Markdown notes with live preview (GFM tables, Mermaid)
- File browser with sort by name/date/size
- File preview (markdown, images, CSV, Excel, DOCX, PDF)
- Inline file editing
- Auto-refresh every 10s

**Views:**
- **Notes:** Markdown notes with "New Note" button for manual creation
- **Files:** Full file explorer with navigation, click to preview any file
- **Terminal:** Embedded Claude Code terminal with file sidebar
  - File browser sidebar (same as CCResearch)
  - Import Data button (GitHub clone, Web URL fetch)
  - Shows existing project sessions with Resume option
  - Start new session button
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

```typescript
// Example usage
import { ccresearchApi, workspaceApi } from '@/lib/api';

// CCResearch
await ccresearchApi.createSession(sessionId, email, title, files);
await ccresearchApi.renameSession(id, newTitle);
await ccresearchApi.shareSession(id);

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

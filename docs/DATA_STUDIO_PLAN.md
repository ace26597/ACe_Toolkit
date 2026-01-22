# C3 Data Studio - Implementation Plan

**Status:** Planning
**Created:** 2026-01-22

---

## Overview

C3 Data Studio is an AI-powered data analysis and visualization app that:
- Uses Claude Code in print mode (`-p`) for non-interactive analysis
- Shows Claude's thinking, tool calls, and code execution
- Renders charts/tables that can be pinned to a draggable dashboard
- Shares data files with Workspace projects
- Allows editing and re-running generated code

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     C3 Data Studio (/data-studio)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐        ┌────────────────────────────────┐ │
│  │   Chat Panel     │        │    Dashboard Canvas            │ │
│  │   (35% width)    │        │    (65% width)                 │ │
│  │                  │        │                                │ │
│  │ • User messages  │        │  ┌────────┐  ┌────────┐       │ │
│  │ • Claude output  │   PIN  │  │ Chart  │  │ Table  │       │ │
│  │ • Tool calls     │───────►│  │ Widget │  │ Widget │       │ │
│  │ • Code blocks    │        │  └────────┘  └────────┘       │ │
│  │ • Charts inline  │        │                                │ │
│  │                  │        │  ┌─────────────────────────┐   │ │
│  │ [Input box]      │        │  │ Code Editor (Monaco)    │   │ │
│  └──────────────────┘        │  │ Edit & Re-run           │   │ │
│                              │  └─────────────────────────┘   │ │
│                              └────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                         WebSocket
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Backend (FastAPI)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  DataStudioManager                                               │
│  ├── create_session(user_id, project_name) → session_id        │
│  ├── send_message(session_id, message)                          │
│  ├── stream_output(session_id) → async generator               │
│  └── close_session(session_id)                                  │
│                                                                  │
│  Spawns: claude -p --output-format stream-json                  │
│          --input-format stream-json --session-id {uuid}         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Storage Structure

```
/data/users/{user_id}/projects/{project_name}/
├── data/                    # User data files (CSV, Excel, JSON, etc.)
│                            # SHARED with Workspace
├── notes/                   # Workspace notes (markdown)
├── output/                  # Generated outputs (SHARED)
├── .claude/                 # Workspace terminal Claude config
├── .project.json            # Project metadata
│
└── .data-studio/            # Data Studio specific
    ├── dashboards/          # Saved dashboard layouts
    │   └── {dashboard_id}.json
    ├── exports/             # Exported charts, tables
    │   ├── chart_001.png
    │   └── filtered_data.csv
    ├── .claude/             # Data Studio Claude config (separate)
    │   └── settings.json
    └── CLAUDE.md            # Data Studio specific instructions
```

---

## Data Studio CLAUDE.md

Located at: `/data/users/{uid}/projects/{proj}/.data-studio/CLAUDE.md`

```markdown
# Data Studio Assistant

You are a data analysis assistant in C3 Data Studio. Your role is to help users
explore, analyze, and visualize their data.

## Your Capabilities

- Read and analyze CSV, Excel, JSON, Parquet files
- Generate Python code for data analysis (pandas, polars)
- Create visualizations (matplotlib, plotly, seaborn)
- Perform statistical analysis
- Clean and transform data
- Answer questions about data patterns

## Output Format

When generating visualizations, output Plotly JSON format:
```json
{"type": "plotly", "data": [...], "layout": {...}}
```

When showing tabular data, output table format:
```json
{"type": "table", "columns": [...], "rows": [...]}
```

## Guidelines

1. Always start by understanding the data structure
2. Show your reasoning before generating code
3. Use clear variable names in code
4. Handle missing data gracefully
5. Provide insights along with visualizations
6. Ask clarifying questions if the request is ambiguous

## Available Data

User's data files are in: ./data/
Generated outputs go to: ./output/
```

---

## Task Breakdown

### Phase 1: Backend Foundation
1. [ ] Create `data_studio_manager.py` - process management
2. [ ] Create `data_studio.py` router - API endpoints
3. [ ] WebSocket handler for streaming
4. [ ] Parse Claude output into structured events
5. [ ] Session management (create, resume, close)

### Phase 2: Frontend Core
6. [ ] Create `/data-studio` page scaffold
7. [ ] Project selector (use existing workspace projects)
8. [ ] WebSocket hook for connection management
9. [ ] Chat panel with message rendering
10. [ ] Tool call display component
11. [ ] Code block component with syntax highlighting

### Phase 3: Dashboard Canvas
12. [ ] Install react-grid-layout, plotly, ag-grid
13. [ ] Dashboard canvas with drag/drop
14. [ ] Chart widget (Plotly renderer)
15. [ ] Table widget (AG Grid)
16. [ ] Pin-to-dashboard functionality
17. [ ] Widget resize/remove

### Phase 4: Code Editing
18. [ ] Monaco editor integration
19. [ ] Edit generated code
20. [ ] Re-run code and update output
21. [ ] Code history/versions

### Phase 5: Persistence & Polish
22. [ ] Save dashboard layouts
23. [ ] Load saved dashboards
24. [ ] Export charts (PNG, SVG)
25. [ ] Export filtered data (CSV)
26. [ ] Update all CLAUDE.md files

---

## API Endpoints

### POST /data-studio/sessions
Create a new Data Studio session.

Request:
```json
{
  "project_name": "my-research"
}
```

Response:
```json
{
  "session_id": "ds-abc123",
  "project_name": "my-research",
  "data_files": ["trials.csv", "compounds.json"]
}
```

### WebSocket /data-studio/ws/{session_id}

Bidirectional communication:

Client → Server:
```json
{"type": "message", "content": "Analyze trials.csv"}
{"type": "run_code", "code": "df.describe()"}
```

Server → Client:
```json
{"type": "thinking", "content": "I'll load the CSV first..."}
{"type": "tool_call", "tool": "Read", "input": {"file_path": "..."}}
{"type": "tool_result", "output": "..."}
{"type": "code", "language": "python", "content": "import pandas..."}
{"type": "chart", "plotly": {...}, "id": "chart_001"}
{"type": "table", "columns": [...], "rows": [...], "id": "table_001"}
{"type": "text", "content": "Based on the analysis..."}
{"type": "done"}
```

### GET /data-studio/dashboards/{project_name}
List saved dashboards.

### POST /data-studio/dashboards/{project_name}
Save dashboard layout.

### DELETE /data-studio/sessions/{session_id}
Close session and cleanup.

---

## Frontend Components

```
apps/web/app/data-studio/
├── page.tsx                      # Main page
├── layout.tsx                    # Data Studio layout (no global nav?)
│
├── components/
│   ├── ProjectSelector.tsx       # Choose project to analyze
│   ├── ChatPanel.tsx             # Left panel conversation
│   ├── MessageList.tsx           # Scrollable message list
│   ├── MessageBubble.tsx         # Individual message
│   ├── ThinkingIndicator.tsx     # "Claude is thinking..."
│   ├── ToolCallCard.tsx          # Tool name, input, status, output
│   ├── CodeBlock.tsx             # Syntax highlighted code
│   ├── InlineChart.tsx           # Chart in chat (before pinning)
│   ├── InlineTable.tsx           # Table preview in chat
│   ├── InputBox.tsx              # Message input with send
│   │
│   ├── DashboardCanvas.tsx       # react-grid-layout wrapper
│   ├── WidgetContainer.tsx       # Draggable widget wrapper
│   ├── ChartWidget.tsx           # Plotly chart widget
│   ├── TableWidget.tsx           # AG Grid widget
│   ├── CodeEditorWidget.tsx      # Monaco editor widget
│   ├── WidgetToolbar.tsx         # Pin, expand, export, delete
│   │
│   ├── DashboardHeader.tsx       # Save, load, export dashboard
│   └── FileList.tsx              # Show available data files
│
├── hooks/
│   ├── useDataStudioSession.ts   # WebSocket + state management
│   ├── useDashboard.ts           # Dashboard layout state
│   └── useAutoScroll.ts          # Auto-scroll chat
│
└── lib/
    ├── parseClaudeOutput.ts      # Parse stream-json to events
    └── types.ts                  # TypeScript interfaces
```

---

## Dependencies

```json
{
  "dependencies": {
    "react-grid-layout": "^1.4.4",
    "plotly.js-dist-min": "^2.35.0",
    "react-plotly.js": "^2.6.0",
    "@ag-grid-community/react": "^32.0.0",
    "@ag-grid-community/styles": "^32.0.0",
    "@monaco-editor/react": "^4.6.0"
  }
}
```

---

## Claude Command

```bash
claude -p \
  --output-format stream-json \
  --input-format stream-json \
  --session-id {uuid} \
  --permission-mode bypassPermissions \
  --project /data/users/{uid}/projects/{proj}/.data-studio
```

Options:
- `-p` (--print): Non-interactive mode
- `--output-format stream-json`: Structured streaming output
- `--input-format stream-json`: Multi-turn conversation support
- `--session-id`: Our managed session ID
- `--permission-mode bypassPermissions`: Auto-approve tool use
- `--project`: Working directory

---

## Event Parsing

Claude's stream-json output format:

```json
{"type":"assistant","message":{"id":"...","content":[{"type":"text","text":"..."}]}}
{"type":"tool_use","id":"...","name":"Read","input":{"file_path":"..."}}
{"type":"tool_result","tool_use_id":"...","content":"..."}
```

We parse and transform to:

```typescript
interface DataStudioEvent {
  type: 'thinking' | 'tool_call' | 'tool_result' | 'code' | 'chart' | 'table' | 'text' | 'error' | 'done';
  // ... type-specific fields
}
```

---

## Security Considerations

1. **File Access**: Only allow access to project's data directory
2. **Code Execution**: Claude runs code, but in sandboxed project dir
3. **Session Isolation**: Each user's sessions are isolated
4. **No Shell Escape**: Use --permission-mode carefully

---

## Future Enhancements

- [ ] Collaborative dashboards (multi-user)
- [ ] Scheduled data refreshes
- [ ] Data source connectors (databases, APIs)
- [ ] Dashboard templates
- [ ] Export to PDF reports
- [ ] Natural language to SQL for database files

---

## References

- Claude Code CLI: `claude --help`
- react-grid-layout: https://github.com/react-grid-layout/react-grid-layout
- Plotly.js: https://plotly.com/javascript/
- AG Grid: https://www.ag-grid.com/
- Monaco Editor: https://microsoft.github.io/monaco-editor/

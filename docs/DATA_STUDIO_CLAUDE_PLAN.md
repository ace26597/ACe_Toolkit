# C3 Data Studio - Claude Code First Architecture

## Research Summary

Based on research from multiple sources:
- [Building Skills for Claude Code](https://claude.com/blog/building-skills-for-claude-code)
- [Claude Skills Guide 2026](https://www.gend.co/blog/claude-skills-claude-md-guide)
- [Automating EDA with Agentic AI](https://bh3r1th.medium.com/automating-eda-with-agentic-ai-from-raw-data-to-insightful-reports-6544598b5e9c)
- [AI Agents for Data Scientists](https://www.kdnuggets.com/how-i-use-ai-agents-as-a-data-scientist-in-2025)
- [Claude Code for Data Scientists](https://www.dataquest.io/blog/getting-started-with-claude-code-for-data-scientists/)
- [Plotly React Integration](https://plotly.com/javascript/react/)
- [CLAUDE.md Data Science Template](https://github.com/ruvnet/claude-flow/wiki/CLAUDE-MD-Data-Science)

---

## Current Assets We Already Have

| Asset | Location | Description |
|-------|----------|-------------|
| **EDA Skill** | `~/.claude/skills/exploratory-data-analysis/` | 200+ scientific file formats, auto-detection, report generation |
| **Plotly Skill** | `~/.claude/skills/plotly/` | 40+ chart types, styling, export guides |
| **Scientific Skills Plugin** | `scientific-skills@claude-scientific-skills` | 145+ domain-specific skills |
| **react-plotly.js** | `apps/web/package.json` | Already installed for chart rendering |

---

## Architecture Options

### Option A: Dedicated Data Studio Skill (Recommended)

Create a specialized skill that combines EDA + Dashboard generation + NLP editing.

**Pros:**
- Clean separation, reusable across projects
- Skill caching for repeated patterns
- Can leverage existing EDA and Plotly skills
- Maintains file-based notes for future reference

**Cons:**
- Need to create and maintain skill definition
- Skill coordination required

**Structure:**
```
~/.claude/skills/data-studio-analyst/
├── SKILL.md                    # Main skill definition
├── scripts/
│   ├── analyze_data.py         # File analysis + metadata extraction
│   ├── generate_dashboard.py   # Dashboard spec generation
│   └── chart_templates.py      # Plotly chart templates
├── references/
│   ├── data_patterns.md        # Common data patterns to detect
│   ├── chart_selection.md      # Which chart for which data type
│   └── insight_templates.md    # How to generate insights
└── assets/
    └── dashboard_schema.json   # Widget/dashboard JSON schema
```

---

### Option B: Project-Level CLAUDE.md Agent

Use a comprehensive CLAUDE.md in each Data Studio project that turns Claude Code into a specialized data analyst.

**Pros:**
- Self-contained per project
- Context stays with the data
- Notes accumulate in project directory
- No external skill dependencies

**Cons:**
- Repeated setup per project
- Less reusable across projects

**Structure:**
```
/data/users/{user}/data-studio-projects/{project}/
├── .claude/
│   ├── CLAUDE.md              # Data analyst agent instructions
│   └── settings.local.json    # Permissions
├── .analysis/
│   ├── metadata.json          # Cumulative file analysis cache
│   └── insights.md            # AI-generated insights (persistent)
├── .dashboards/
│   └── {dashboard-id}.json    # Dashboard specifications
├── data/                      # User's data files
└── output/
    └── charts/                # Generated HTML/PNG charts
```

---

### Option C: Hybrid - Skill + Project Context (Best of Both)

Use a central skill for capabilities, but each project has its own context and cache.

**Pros:**
- Reusable skill for analysis logic
- Project-specific context and memory
- Notes/insights persist and speed up future analysis
- Clean separation of concerns

**Cons:**
- Most complex to implement

**Flow:**
```
[User uploads data]
    → [Project CLAUDE.md loaded with context]
    → [data-studio-analyst skill invoked]
    → [Analysis runs, saves to .analysis/]
    → [Dashboard generated, saves to .dashboards/]
    → [Charts rendered in frontend via Plotly.js]
```

---

## Recommended Implementation: Option C (Hybrid)

### Component 1: Data Studio Analyst Skill

**File:** `~/.claude/skills/data-studio-analyst/SKILL.md`

```yaml
---
name: data-studio-analyst
description: AI-powered data analysis and dashboard generation. Analyzes any data file,
  extracts insights, generates Plotly chart specifications, and creates interactive dashboards.
  Use when user wants to analyze data, create visualizations, or build dashboards.
---
```

**Skill Capabilities:**
1. **File Analysis** - Detect types, extract metadata, generate insights
2. **Pattern Detection** - Find correlations, trends, anomalies
3. **Chart Selection** - Recommend best visualizations for data types
4. **Dashboard Planning** - Design 5-10 widget layouts based on data
5. **Plotly Spec Generation** - Output JSON specs for frontend rendering
6. **NLP Editing** - Interpret natural language chart modifications
7. **Insight Caching** - Save findings for faster future analysis

---

### Component 2: Central Python Environment

**Location:** `~/.local/share/data-studio-venv/`

```bash
# Create dedicated venv for Data Studio
python -m venv ~/.local/share/data-studio-venv
source ~/.local/share/data-studio-venv/bin/activate

# Core dependencies
pip install pandas numpy scipy plotly kaleido
pip install openpyxl xlrd  # Excel
pip install pyarrow        # Parquet
pip install python-dateutil  # Date parsing
pip install scikit-learn   # ML utilities (optional)
```

**Document in Skill:**
```markdown
## Python Environment

Use the dedicated Data Studio venv:
\`\`\`bash
source ~/.local/share/data-studio-venv/bin/activate
\`\`\`

Available libraries: pandas, numpy, scipy, plotly, kaleido, openpyxl, pyarrow
```

---

### Component 3: Project CLAUDE.md Template

**File:** `/data/users/{user}/data-studio-projects/{project}/.claude/CLAUDE.md`

```markdown
# Data Studio Project: {project-name}

## Context
This is a C3 Data Studio project for AI-powered data analysis.

## Data Files
{auto-populated list of files in data/}

## Previous Analysis
{reference to .analysis/metadata.json if exists}

## Insights Cache
{reference to .analysis/insights.md}

## Instructions
1. When analyzing data, ALWAYS save metadata to .analysis/metadata.json
2. When generating insights, APPEND to .analysis/insights.md
3. Dashboard specs go to .dashboards/{id}.json
4. Charts output to output/charts/ as HTML

## Output Format
All chart specifications must be valid Plotly JSON:
\`\`\`json
{
  "data": [...],
  "layout": {...}
}
\`\`\`
```

---

### Component 4: Backend Flow (Headless Claude)

**Modified Router:** `apps/api/app/routers/data_studio_v2.py`

```python
# Analysis Endpoint - Uses Claude Code headless
@router.post("/projects/{name}/analyze")
async def analyze_project(name: str, user: User):
    """
    1. Start headless Claude Code session
    2. Load project CLAUDE.md context
    3. Invoke data-studio-analyst skill
    4. Stream analysis progress to frontend
    5. Save results to .analysis/
    """

    prompt = f"""
    Analyze all data files in this project.

    For each file:
    1. Detect file type and structure
    2. Extract column types and statistics
    3. Identify patterns and anomalies
    4. Generate insights
    5. Recommend visualizations

    Save analysis to .analysis/metadata.json
    Append insights to .analysis/insights.md

    Output format: JSON with analysis results
    """

    # Run headless Claude with streaming
    await run_claude_headless(project_dir, prompt, stream=True)


# Dashboard Generation - Uses Claude Code headless
@router.post("/projects/{name}/dashboards/generate")
async def generate_dashboard(name: str, user: User):
    """
    1. Load cached analysis from .analysis/
    2. Have Claude design optimal dashboard
    3. Generate Plotly specs for each widget
    4. Save to .dashboards/
    """

    prompt = f"""
    Based on the analysis in .analysis/metadata.json:

    1. Design a dashboard with 5-10 widgets showing key insights
    2. For each widget, generate a Plotly JSON specification
    3. Include: stat cards, distributions, comparisons, correlations
    4. Use dark theme (template: plotly_dark)

    Save dashboard to .dashboards/default.json
    Output the dashboard JSON
    """


# NLP Edit - Uses Claude Code headless
@router.post("/projects/{name}/edit")
async def nlp_edit(name: str, request: NLPEditRequest, user: User):
    """
    Natural language dashboard editing.
    """

    prompt = f"""
    Current dashboard: .dashboards/{request.dashboard_id}.json

    User request: "{request.request}"
    {"Target widget: " + request.target_widget_id if request.target_widget_id else "Edit entire dashboard"}

    Modify the dashboard according to the request.
    Output the updated Plotly specification only.
    """
```

---

### Component 5: Frontend Chart Rendering

**File:** `apps/web/app/data-studio/page.tsx`

```tsx
import Plot from 'react-plotly.js';

// Widget types
type WidgetType = 'stat_card' | 'chart' | 'table' | 'mermaid';

interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  plotly?: PlotlySpec;  // For charts
  value?: string;       // For stat cards
  data?: any[];         // For tables
}

// Render Plotly chart from JSON spec
const PlotlyChart = ({ spec }: { spec: PlotlySpec }) => (
  <Plot
    data={spec.data}
    layout={{
      ...spec.layout,
      template: 'plotly_dark',
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      autosize: true,
    }}
    config={{ responsive: true, displayModeBar: false }}
    style={{ width: '100%', height: '100%' }}
  />
);
```

---

### Component 6: Insight Caching System

**Purpose:** Speed up repeated analysis and maintain context.

**Files:**
```
.analysis/
├── metadata.json       # Structured file analysis (JSON)
│   {
│     "files": {...},
│     "cross_file_insights": [...],
│     "recommended_charts": [...],
│     "analyzed_at": "2026-01-23T..."
│   }
│
├── insights.md         # Human-readable insights (append-only)
│   ## Analysis Session: 2026-01-23
│   - Found strong correlation between age and outcome
│   - 15% of records have missing values in 'dose' column
│   - Time series shows weekly seasonality
│
└── file_hashes.json    # Track which files changed
    {
      "patients.csv": "abc123...",
      "outcomes.xlsx": "def456..."
    }
```

**Re-analysis Logic:**
```python
# Only re-analyze changed files
def should_reanalyze(file_path: str, cache_dir: str) -> bool:
    hashes_file = os.path.join(cache_dir, "file_hashes.json")
    if not os.path.exists(hashes_file):
        return True

    with open(hashes_file) as f:
        hashes = json.load(f)

    current_hash = hashlib.md5(open(file_path, 'rb').read()).hexdigest()
    return hashes.get(os.path.basename(file_path)) != current_hash
```

---

## Implementation Sequence

### Phase 1: Create Data Studio Analyst Skill (Day 1)

1. Create skill directory structure
2. Write SKILL.md with comprehensive instructions
3. Create chart selection reference
4. Create insight generation templates
5. Test skill manually with Claude Code

### Phase 2: Setup Central Venv (Day 1)

1. Create venv at `~/.local/share/data-studio-venv/`
2. Install all dependencies
3. Document in skill and CLAUDE.md files
4. Test with sample data files

### Phase 3: Modify Backend (Day 2)

1. Update `data_studio_v2.py` to use headless Claude
2. Implement analysis endpoint with skill invocation
3. Implement dashboard generation endpoint
4. Implement NLP edit endpoint
5. Add insight caching logic

### Phase 4: Update Frontend (Day 2)

1. Connect to new API endpoints
2. Display analysis progress (streaming)
3. Render Plotly charts from JSON specs
4. Implement NLP edit bar
5. Add dashboard saving/loading

### Phase 5: Project Template (Day 3)

1. Create project CLAUDE.md template
2. Auto-generate on project creation
3. Include file listing and context
4. Test end-to-end flow

### Phase 6: Testing & Polish (Day 3)

1. Test with various data types (CSV, JSON, Excel)
2. Test NLP editing scenarios
3. Performance optimization
4. Documentation update

---

## Key Design Decisions

### 1. Why Headless Claude Code?

- **Context awareness**: Reads project files, CLAUDE.md, cached insights
- **Skill integration**: Can use EDA, Plotly, and custom skills
- **NLP natural**: Understands complex editing requests
- **Persistent memory**: Via .analysis/ directory

### 2. Why Plotly JSON Specs?

- **Portable**: Same spec works in Python and JavaScript
- **Declarative**: Easy for LLM to generate/modify
- **Full-featured**: 40+ chart types, animations, interactivity
- **Dark theme**: Native `plotly_dark` template

### 3. Why Insight Caching?

- **Speed**: Don't re-analyze unchanged files
- **Context**: Claude remembers previous findings
- **Accumulation**: Insights build over time
- **Explainability**: Users can see what Claude found

### 4. Why Central Venv?

- **Consistency**: Same libraries across all projects
- **Efficiency**: One install, many uses
- **Maintainability**: Easy to update dependencies
- **Documented**: Skill knows what's available

---

## Example User Flow

```
1. User creates project "sales-analysis"
   → Project directory created with .claude/CLAUDE.md template

2. User uploads sales.csv, products.xlsx
   → Files saved to data/

3. User clicks "Analyze"
   → Backend starts headless Claude session
   → Claude loads project CLAUDE.md
   → Invokes data-studio-analyst skill
   → Streams progress: "Analyzing sales.csv..."
   → Saves to .analysis/metadata.json, .analysis/insights.md
   → Returns analysis summary

4. User clicks "Generate Dashboard"
   → Claude reads .analysis/metadata.json
   → Designs 8 widgets based on data characteristics
   → Generates Plotly specs for each
   → Saves to .dashboards/default.json
   → Frontend renders charts

5. User types "Make the bar chart horizontal and add trend line"
   → Backend sends to Claude with current dashboard
   → Claude modifies relevant widget spec
   → Frontend re-renders updated chart

6. User uploads new file customers.csv
   → File hash differs from cache
   → Only new file analyzed (incremental)
   → Dashboard updated with new insights
```

---

## Files to Create/Modify

### New Files
- `~/.claude/skills/data-studio-analyst/SKILL.md`
- `~/.claude/skills/data-studio-analyst/references/chart_selection.md`
- `~/.claude/skills/data-studio-analyst/references/insight_templates.md`
- `~/.claude/skills/data-studio-analyst/assets/dashboard_schema.json`
- `apps/api/app/core/claude_runner.py` (headless Claude execution)

### Modified Files
- `apps/api/app/routers/data_studio_v2.py` - Use headless Claude
- `apps/web/app/data-studio/page.tsx` - Connect to new flow
- `apps/api/CLAUDE.md` - Document new architecture
- `apps/web/CLAUDE.md` - Document new architecture

### Removed Files
- `apps/api/app/core/data_analyzer.py` - Replaced by Claude skill
- `apps/api/app/core/dashboard_generator.py` - Replaced by Claude skill

---

## Summary

| Approach | Description |
|----------|-------------|
| **Analysis** | Headless Claude Code + data-studio-analyst skill |
| **Charts** | Plotly JSON specs → react-plotly.js rendering |
| **Memory** | .analysis/ directory with metadata.json + insights.md |
| **NLP** | Direct Claude interpretation of natural language |
| **Venv** | Central `~/.local/share/data-studio-venv/` |
| **Skills** | Leverage existing EDA + Plotly skills |

This architecture puts Claude Code at the center while maintaining:
- Fast rendering (Plotly.js in browser)
- Persistent context (cached insights)
- Flexible editing (NLP commands)
- High-quality output (40+ chart types)

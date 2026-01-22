"""
Analyst Manager - Handles Claude Code sessions for data analysis.

Similar to ResearchManager but specialized for:
- Data exploration and analysis
- Chart generation (returns Plotly JSON)
- SQL-like queries on dataframes
- Natural language data questions
"""

import os
import json
import asyncio
import subprocess
import shutil
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any
from dataclasses import dataclass, asdict
from enum import Enum
import uuid
import logging
import re

import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)

# ============================================================================
# ANALYST SESSION PERMISSIONS - Same security model as CCResearch
# ============================================================================
ANALYST_PERMISSIONS_TEMPLATE = {
    "permissions": {
        "allow": [
            "Bash",
            "Read",
            "Write",
            "Edit"
        ],
        "deny": [
            # File access restrictions
            "Read(/home/ace/.ccresearch_allowed_emails.json)",
            "Read(/home/ace/.claude/CLAUDE.md)",
            "Read(/home/ace/dev/**)",
            "Write(/home/ace/dev/**)",
            "Edit(/home/ace/dev/**)",
            "Read(/home/ace/.bashrc)",
            "Read(/home/ace/.bash_history)",
            "Read(/home/ace/.ssh/**)",
            "Read(/home/ace/.gnupg/**)",
            "Read(/home/ace/.env)",
            "Read(/home/ace/.env.*)",
            "Read(/home/ace/.aws/**)",
            "Read(/home/ace/.cloudflared/**)",
            "Read(/etc/cloudflared/**)",
            "Read(/etc/shadow)",
            "Read(/etc/passwd)",
            "Read(/etc/sudoers)",
            # Process management
            "Bash(kill:*)",
            "Bash(pkill:*)",
            "Bash(killall:*)",
            "Bash(fuser:*)",
            # Service management
            "Bash(systemctl:*)",
            "Bash(service:*)",
            "Bash(journalctl:*)",
            # Privilege escalation
            "Bash(sudo:*)",
            "Bash(su:*)",
            "Bash(doas:*)",
            # File permissions
            "Bash(chmod:*)",
            "Bash(chown:*)",
            "Bash(chgrp:*)",
            # Dangerous commands
            "Bash(dd:*)",
            "Bash(fdisk:*)",
            "Bash(mkfs:*)",
            "Bash(mount:*)",
            "Bash(shutdown:*)",
            "Bash(reboot:*)",
            "Bash(crontab:*)",
            # Network
            "Bash(iptables:*)",
            "Bash(ufw:*)",
            "Bash(nc:-l:*)",
            # Containers
            "Bash(docker:*)",
            "Bash(podman:*)",
            # Package managers (pip in venv OK)
            "Bash(apt:*)",
            "Bash(dpkg:*)",
            "Bash(yum:*)"
        ]
    },
    "hasClaudeMdExternalIncludesApproved": False,
    "hasClaudeMdExternalIncludesWarningShown": True
}

# ============================================================================
# ANALYST SESSION CLAUDE.MD TEMPLATE - Data Analysis Focus
# ============================================================================
ANALYST_CLAUDE_MD_TEMPLATE = """# Data Analyst Project: {project_name}

Welcome to your Claude Code data analysis workspace.

---

## CRITICAL: WORKSPACE BOUNDARIES (IMMUTABLE - DO NOT MODIFY)

**YOU MUST ONLY WORK WITHIN THIS PROJECT DIRECTORY: `{workspace_dir}`**

### STRICT RULES:
1. **DO NOT** read, write, or access ANY files outside this project directory
2. **DO NOT** access `/home/ace/dev/`, `/home/ace/.claude/CLAUDE.md`, or any parent directories
3. **DO NOT** use `cd` to navigate outside this workspace
4. All your work MUST stay within: `{workspace_dir}`

### BLOCKED COMMANDS (System Protected):
- Process management: kill, pkill, killall, fuser
- Service management: systemctl, service, journalctl
- Privilege escalation: sudo, su, doas
- File permissions: chmod, chown, chgrp
- Disk operations: dd, fdisk, mount, mkfs
- System control: shutdown, reboot, crontab
- Container/Docker: docker, podman, lxc
- Package managers: apt, dpkg, yum (pip in workspace venv is allowed)

---

## Project Info

| Field | Value |
|-------|-------|
| Project | **{project_name}** |
| Session ID | `{session_id}` |
| Created | {created_at} |
| Workspace | `{workspace_dir}` |

---

## Data Sources

{data_sources_section}

---

## YOUR ROLE: Data Analyst

You are a data analyst assistant. When answering questions:

### For Analysis Questions:
1. Load the data using pandas
2. Perform the requested analysis
3. Provide clear, concise answers with relevant statistics

### For Chart/Visualization Requests:
When the user asks for a chart or visualization, you MUST respond with a JSON code block containing Plotly configuration:

```json
{{
  "chart_type": "bar|line|scatter|pie|histogram|box|heatmap",
  "x_column": "column_name",
  "y_column": "column_name",
  "color_column": "optional_column",
  "title": "Chart Title",
  "description": "What this chart shows"
}}
```

The system will automatically render this as an interactive Plotly chart.

### For Code Execution:
When you need to compute something, write Python code in a code block:

```python
import pandas as pd
df = pd.read_csv("{data_file_path}")
# Your analysis code here
result = df.describe()
print(result)
```

### Available Python Libraries:
- pandas (pd) - Data manipulation
- numpy (np) - Numerical operations
- Standard library (json, datetime, etc.)

---

## Important Notes

- Always load data fresh from the data file when needed
- Be concise but informative in responses
- Include relevant statistics and insights
- Suggest visualizations when they would be helpful

---

*Data Analyst - Claude Code Research Platform*
"""


class AnalystSessionStatus(str, Enum):
    PENDING = "pending"
    READY = "ready"
    PROCESSING = "processing"
    ERROR = "error"


@dataclass
class AnalystSession:
    """Analyst session for Claude Code data analysis."""
    id: str
    project_id: str
    project_name: str
    data_source_id: str
    data_source_name: str
    data_file_path: str
    claude_session_id: Optional[str]  # Claude's session ID for --resume
    workspace_dir: str
    status: AnalystSessionStatus
    error_message: Optional[str]
    created_at: str
    last_activity: str
    conversation_turns: int
    last_response: Optional[str]

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'AnalystSession':
        data['status'] = AnalystSessionStatus(data['status'])
        return cls(**data)


class AnalystManager:
    """Manage Claude Code sessions for data analysis.

    Each analyst project can have a Claude Code session attached.
    The session provides natural language interaction with the data.
    """

    def __init__(self, base_dir: str = "/data/analyst-projects"):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)
        self.sessions: Dict[str, AnalystSession] = {}
        self.running_processes: Dict[str, asyncio.subprocess.Process] = {}
        self._load_sessions()

    def _get_project_dir(self, project_id: str) -> Path:
        """Get the project directory."""
        return self.base_dir / project_id

    def _get_session_workspace(self, project_id: str, data_source_id: str) -> Path:
        """Get the workspace directory for a session."""
        return self._get_project_dir(project_id) / "sessions" / data_source_id

    def _load_sessions(self):
        """Load all existing sessions from disk."""
        for project_dir in self.base_dir.iterdir():
            if not project_dir.is_dir():
                continue

            sessions_dir = project_dir / "sessions"
            if not sessions_dir.exists():
                continue

            for session_dir in sessions_dir.iterdir():
                if not session_dir.is_dir():
                    continue

                session_file = session_dir / ".analyst_session.json"
                if session_file.exists():
                    try:
                        data = json.loads(session_file.read_text())
                        session = AnalystSession.from_dict(data)
                        self.sessions[session.id] = session
                    except Exception as e:
                        logger.error(f"Failed to load session from {session_dir}: {e}")

    def _save_session(self, session: AnalystSession):
        """Save session to disk."""
        workspace_dir = Path(session.workspace_dir)
        workspace_dir.mkdir(parents=True, exist_ok=True)

        session_file = workspace_dir / ".analyst_session.json"
        session_file.write_text(json.dumps(session.to_dict(), indent=2))

        self.sessions[session.id] = session

    def get_or_create_session(
        self,
        project_id: str,
        project_name: str,
        data_source_id: str,
        data_source_name: str,
        data_file_path: str,
        data_schema: Dict[str, Any],
        base_dir: Optional[Path] = None  # Allow per-user base directory
    ) -> AnalystSession:
        """Get existing session or create a new one for a data source.

        Args:
            base_dir: Optional per-user base directory. If provided, overrides self.base_dir.
        """
        # Check for existing session for this data source
        for session in self.sessions.values():
            if session.project_id == project_id and session.data_source_id == data_source_id:
                return session

        # Create new session
        session_id = f"analyst_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"

        # Use provided base_dir or default
        effective_base = base_dir if base_dir else self.base_dir
        workspace_dir = effective_base / project_id / "sessions" / data_source_id
        workspace_dir.mkdir(parents=True, exist_ok=True)

        # Create .claude directory with permissions
        claude_dir = workspace_dir / ".claude"
        claude_dir.mkdir(parents=True, exist_ok=True)
        settings_local_path = claude_dir / "settings.local.json"
        settings_local_path.write_text(json.dumps(ANALYST_PERMISSIONS_TEMPLATE, indent=2))

        # Build data sources section for CLAUDE.md
        data_sources_section = f"""### {data_source_name}

**File:** `{data_file_path}`

**Schema:**
| Column | Type | Sample Values |
|--------|------|---------------|
"""
        if data_schema and "columns" in data_schema:
            for col in data_schema["columns"][:20]:  # Limit to 20 columns
                samples = ", ".join(str(v)[:20] for v in col.get("sample_values", [])[:3])
                data_sources_section += f"| {col['name']} | {col['type']} | {samples} |\n"

        data_sources_section += f"\n**Row Count:** {data_schema.get('row_count', 'Unknown')}"

        # Create CLAUDE.md
        claude_md_path = workspace_dir / "CLAUDE.md"
        claude_md_content = ANALYST_CLAUDE_MD_TEMPLATE.format(
            session_id=session_id,
            project_name=project_name,
            created_at=datetime.now().isoformat(),
            workspace_dir=str(workspace_dir),
            data_sources_section=data_sources_section,
            data_file_path=data_file_path
        )
        claude_md_path.write_text(claude_md_content)

        session = AnalystSession(
            id=session_id,
            project_id=project_id,
            project_name=project_name,
            data_source_id=data_source_id,
            data_source_name=data_source_name,
            data_file_path=data_file_path,
            claude_session_id=None,
            workspace_dir=str(workspace_dir),
            status=AnalystSessionStatus.READY,
            error_message=None,
            created_at=datetime.now().isoformat(),
            last_activity=datetime.now().isoformat(),
            conversation_turns=0,
            last_response=None
        )

        self._save_session(session)
        logger.info(f"Created analyst session: {session_id} for data source {data_source_name}")

        return session

    async def ask_question(
        self,
        session_id: str,
        question: str,
        include_chart: bool = True
    ) -> Dict[str, Any]:
        """Ask a question about the data using Claude Code.

        Returns:
            Dict with response, code, chart_config, query_result, chart (Plotly JSON)
        """
        session = self.sessions.get(session_id)
        if not session:
            raise ValueError(f"Session not found: {session_id}")

        session.status = AnalystSessionStatus.PROCESSING
        self._save_session(session)

        workspace_dir = Path(session.workspace_dir)
        log_path = workspace_dir / ".analyst_output.log"

        result = {
            "response": "",
            "code": None,
            "chart_config": None,
            "query_result": None,
            "chart": None
        }

        try:
            # Load data schema for context
            df = self._load_dataframe(session.data_file_path)
            columns_info = []
            for col in df.columns[:20]:  # Limit to 20 columns
                dtype = str(df[col].dtype)
                nunique = df[col].nunique()
                samples = df[col].dropna().head(3).tolist()
                columns_info.append(f"  - {col} ({dtype}, {nunique} unique): {samples}")
            schema_str = "\n".join(columns_info)

            # Build comprehensive prompt
            full_prompt = f"""# DATA ANALYST TASK

You are a data analyst AI assistant. Your job is to analyze the provided dataset and answer the user's question.

## YOUR DATASET

**File:** `{session.data_file_path}`
**Rows:** {len(df)}
**Columns:** {len(df.columns)}

### Column Schema:
{schema_str}

---

## USER'S QUESTION

{question}

---

## YOUR TASK

1. **ANALYZE** the data to answer the user's question
2. **GENERATE CHARTS** if visualization would help (ALWAYS include charts for data questions)
3. **PROVIDE INSIGHTS** with relevant statistics

---

## CRITICAL: CHART OUTPUT FORMAT

When you want to create a visualization, you MUST include a JSON code block with this EXACT format:

```json
{{
  "chart_type": "bar",
  "x_column": "column_name",
  "y_column": "column_name",
  "color_column": null,
  "title": "Descriptive Chart Title",
  "description": "What this chart shows"
}}
```

### Supported chart_type values:
- **bar** - Compare values across categories (requires x_column, y_column)
- **line** - Show trends over time/sequence (requires x_column, y_column)
- **scatter** - Show relationship between two numeric variables (requires x_column, y_column)
- **pie** - Show proportions of a whole (requires x_column only, y_column=null)
- **histogram** - Show distribution of a single numeric column (requires x_column only, y_column=null)
- **box** - Show statistical distribution across categories (requires x_column, y_column)
- **heatmap** - Show correlation or pivot data (requires x_column, y_column)

### IMPORTANT RULES:
1. ALWAYS use actual column names from the schema above
2. For pie/histogram, set y_column to null
3. color_column is optional - use for grouping/segmentation
4. Generate 1-3 charts that best answer the question
5. Each chart needs its own separate ```json block

---

## EXAMPLE OUTPUTS

### Example 1: Sales by Category Question
```json
{{
  "chart_type": "bar",
  "x_column": "category",
  "y_column": "sales",
  "color_column": null,
  "title": "Total Sales by Category",
  "description": "Comparing total sales across product categories"
}}
```

### Example 2: Distribution Question
```json
{{
  "chart_type": "histogram",
  "x_column": "price",
  "y_column": null,
  "color_column": null,
  "title": "Price Distribution",
  "description": "Shows how prices are distributed across the dataset"
}}
```

---

## NOW ANALYZE AND RESPOND

Analyze the data and provide:
1. A brief text explanation answering the question
2. One or more JSON chart configurations (REQUIRED for data questions)
3. Key statistics or insights

Remember: The chart JSON blocks will be automatically rendered as interactive Plotly charts in the UI."""

            # Build Claude command
            cmd = ['claude', '-p', full_prompt, '--verbose', '--output-format', 'stream-json']

            # Continue conversation if we have a session ID
            if session.claude_session_id:
                cmd.extend(['--resume', session.claude_session_id])

            logger.info(f"Running Claude for analyst session {session_id}")

            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=workspace_dir
            )

            self.running_processes[session_id] = process

            full_response = ""
            final_result = None

            with open(log_path, 'a') as log_file:
                log_file.write(f"\n{'=' * 60}\n")
                log_file.write(f"Question: {question}\n")
                log_file.write(f"Time: {datetime.now().isoformat()}\n")
                log_file.write(f"{'=' * 60}\n\n")
                log_file.flush()

                # Read stdout line by line
                while True:
                    try:
                        line = await process.stdout.readline()
                    except Exception as e:
                        log_file.write(f"Stream error: {e}\n")
                        break

                    if not line:
                        break

                    line_str = line.decode().strip()
                    if not line_str:
                        continue

                    try:
                        data = json.loads(line_str)
                        msg_type = data.get('type', '')

                        if msg_type == 'assistant':
                            content = data.get('message', {}).get('content', [])
                            for block in content:
                                if block.get('type') == 'text':
                                    text = block.get('text', '')
                                    full_response += text
                                    log_file.write(f"{text}\n")
                                    log_file.flush()

                        elif msg_type == 'content_block_delta':
                            delta = data.get('delta', {})
                            if delta.get('type') == 'text_delta':
                                text = delta.get('text', '')
                                full_response += text
                                log_file.write(text)
                                log_file.flush()

                        elif msg_type == 'result':
                            final_result = data
                            log_file.write(f"\n\nTokens used: {data.get('usage', {})}\n")
                            log_file.flush()

                    except json.JSONDecodeError:
                        log_file.write(f"{line_str}\n")
                        log_file.flush()

                await process.wait()

            # Update session
            if final_result:
                session.claude_session_id = final_result.get('session_id')

            session.conversation_turns += 1
            session.status = AnalystSessionStatus.READY
            session.last_activity = datetime.now().isoformat()
            session.last_response = full_response

            # Parse response for code blocks and chart configs
            result["response"] = full_response

            # Extract Python code blocks
            python_match = re.search(r'```python\n(.*?)\n```', full_response, re.DOTALL)
            if python_match:
                result["code"] = python_match.group(1)
                # Try to execute the code
                try:
                    df = self._load_dataframe(session.data_file_path)
                    local_vars = {"df": df, "pd": pd, "np": np}
                    exec(result["code"], {"pd": pd, "np": np, "__builtins__": {}}, local_vars)
                    if "result" in local_vars:
                        res = local_vars["result"]
                        if isinstance(res, pd.DataFrame):
                            result["query_result"] = {
                                "columns": list(res.columns),
                                "data": res.head(100).to_dict(orient="records"),
                                "row_count": len(res)
                            }
                        elif isinstance(res, pd.Series):
                            result["query_result"] = {"data": res.to_dict(), "row_count": len(res)}
                        else:
                            result["query_result"] = {"value": str(res)}
                except Exception as e:
                    result["code_error"] = str(e)

            # Extract ALL JSON chart configs (support multiple charts)
            json_matches = re.findall(r'```json\n(.*?)\n```', full_response, re.DOTALL)
            if json_matches and include_chart:
                charts = []
                chart_configs = []
                df = self._load_dataframe(session.data_file_path)

                for json_str in json_matches:
                    try:
                        chart_config = json.loads(json_str)
                        # Only process if it looks like a chart config
                        if chart_config.get("chart_type"):
                            chart_configs.append(chart_config)
                            try:
                                chart_json = self._generate_plotly_chart(df, chart_config)
                                if chart_json:
                                    charts.append({
                                        "config": chart_config,
                                        "plotly": chart_json
                                    })
                            except Exception as e:
                                logger.error(f"Failed to generate chart: {e}")
                    except json.JSONDecodeError:
                        continue

                # Store all charts - backward compatible (first chart in chart/chart_config)
                if chart_configs:
                    result["chart_config"] = chart_configs[0]
                if charts:
                    result["chart"] = charts[0]["plotly"]
                    result["charts"] = charts  # All charts array

        except Exception as e:
            session.status = AnalystSessionStatus.ERROR
            session.error_message = str(e)
            logger.error(f"Analyst question failed for {session_id}: {e}")
            result["error"] = str(e)

        finally:
            if session_id in self.running_processes:
                del self.running_processes[session_id]

        self._save_session(session)
        return result

    def _load_dataframe(self, file_path: str) -> pd.DataFrame:
        """Load a dataframe from file."""
        path = Path(file_path)
        if path.suffix.lower() == '.csv':
            return pd.read_csv(path)
        elif path.suffix.lower() in ('.xlsx', '.xls'):
            return pd.read_excel(path)
        elif path.suffix.lower() == '.json':
            with open(path, 'r') as f:
                data = json.load(f)
            if isinstance(data, list):
                return pd.DataFrame(data)
            elif isinstance(data, dict):
                for key in ['data', 'records', 'items', 'results', 'rows']:
                    if key in data and isinstance(data[key], list):
                        return pd.DataFrame(data[key])
                return pd.json_normalize(data)
            raise ValueError("JSON structure not supported")
        else:
            raise ValueError(f"Unsupported file type: {path.suffix}")

    def _generate_plotly_chart(self, df: pd.DataFrame, config: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a Plotly chart from config."""
        try:
            import plotly.express as px
            import plotly.graph_objects as go
        except ImportError:
            raise RuntimeError("Plotly not available")

        chart_type = config.get("chart_type", "bar")
        x_col = config.get("x_column")
        y_col = config.get("y_column")
        color_col = config.get("color_column")
        title = config.get("title", "Chart")

        fig = None

        if chart_type == "bar":
            if x_col and y_col:
                fig = px.bar(df, x=x_col, y=y_col, color=color_col, title=title)
            elif x_col:
                fig = px.bar(df[x_col].value_counts().reset_index(), x='index', y=x_col, title=title)

        elif chart_type == "line":
            if x_col and y_col:
                fig = px.line(df, x=x_col, y=y_col, color=color_col, title=title)

        elif chart_type == "scatter":
            if x_col and y_col:
                fig = px.scatter(df, x=x_col, y=y_col, color=color_col, title=title)

        elif chart_type == "pie":
            if x_col:
                counts = df[x_col].value_counts()
                fig = px.pie(values=counts.values, names=counts.index, title=title)

        elif chart_type == "histogram":
            if x_col:
                fig = px.histogram(df, x=x_col, color=color_col, title=title)

        elif chart_type == "box":
            if y_col:
                fig = px.box(df, x=x_col, y=y_col, color=color_col, title=title)

        elif chart_type == "heatmap":
            if x_col and y_col:
                pivot = df.pivot_table(index=y_col, columns=x_col, aggfunc='size', fill_value=0)
                fig = px.imshow(pivot, title=title)

        if fig:
            return json.loads(fig.to_json())

        return None

    def get_session(self, session_id: str) -> Optional[AnalystSession]:
        """Get a session by ID."""
        return self.sessions.get(session_id)

    def get_session_for_datasource(self, project_id: str, data_source_id: str) -> Optional[AnalystSession]:
        """Get session for a specific data source."""
        for session in self.sessions.values():
            if session.project_id == project_id and session.data_source_id == data_source_id:
                return session
        return None

    def delete_session(self, session_id: str) -> bool:
        """Delete a session."""
        session = self.sessions.get(session_id)
        if not session:
            return False

        workspace_dir = Path(session.workspace_dir)
        if workspace_dir.exists():
            shutil.rmtree(workspace_dir)

        del self.sessions[session_id]
        return True


# Global instance
analyst_manager = AnalystManager()

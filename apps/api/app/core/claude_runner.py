"""
Claude Runner - Headless Claude Code execution for Data Studio.

Executes Claude Code in headless mode (-p) with streaming JSON output.
Supports both terminal view and clean headless modes.
"""

import asyncio
import hashlib
import json
import logging
import os
import signal
import subprocess
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, AsyncGenerator, Dict, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class ClaudeSession:
    """Represents a Claude Code session."""
    session_id: str
    project_dir: str
    user_id: str
    process: Optional[subprocess.Popen] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    mode: str = "headless"  # "headless" or "terminal"


class ClaudeRunner:
    """
    Manages headless Claude Code execution for Data Studio.

    Supports two modes:
    - headless: Clean streaming output (progress + results)
    - terminal: Full terminal view showing Claude's thinking
    """

    def __init__(self):
        self.sessions: Dict[str, ClaudeSession] = {}
        self.venv_path = os.path.expanduser("~/.local/share/data-studio-venv")

    def get_session_id(self, user_id: str, project_name: str) -> str:
        """Generate deterministic session ID from user and project."""
        combined = f"{user_id}:{project_name}"
        return hashlib.md5(combined.encode()).hexdigest()[:16]

    def _get_project_claude_md(self, project_dir: str, project_name: str) -> str:
        """Generate CLAUDE.md content for the project."""
        return f"""# Data Studio Project: {project_name}

## Context
This is a C3 Data Studio project for AI-powered data analysis.
Your role is to analyze data files and generate high-quality visualizations.

## Python Environment
ALWAYS activate the Data Studio venv before running Python:
```bash
source ~/.local/share/data-studio-venv/bin/activate
```

Available: pandas, numpy, plotly, kaleido, openpyxl, xlrd, pyarrow

## Project Structure
- `data/` - User's data files (CSV, JSON, Excel, Parquet)
- `.analysis/` - Save analysis results here
  - `metadata.json` - Structured file analysis
  - `insights.md` - Human-readable insights (append-only)
  - `file_hashes.json` - Track file changes
- `.dashboards/` - Dashboard specifications
- `output/charts/` - Generated chart images

## Output Requirements
1. All chart specs must be valid Plotly JSON
2. Use dark theme: template='plotly_dark', transparent backgrounds
3. Save metadata to .analysis/metadata.json after analysis
4. Append insights to .analysis/insights.md

## Skills Available
- data-studio-analyst: Main analysis and dashboard skill
- exploratory-data-analysis: Deep file format analysis
- plotly: Chart customization reference
"""

    def _ensure_project_structure(self, project_dir: str, project_name: str):
        """Ensure project has required directories and CLAUDE.md."""
        # Create directories
        for subdir in ['data', '.analysis', '.dashboards', 'output/charts', '.claude']:
            os.makedirs(os.path.join(project_dir, subdir), exist_ok=True)

        # Create/update CLAUDE.md
        claude_md_path = os.path.join(project_dir, '.claude', 'CLAUDE.md')
        with open(claude_md_path, 'w') as f:
            f.write(self._get_project_claude_md(project_dir, project_name))

        # Create settings.local.json for permissions
        settings_path = os.path.join(project_dir, '.claude', 'settings.local.json')
        settings = {
            "permissions": {
                "allow": [
                    "Bash(source ~/.local/share/data-studio-venv/bin/activate*)",
                    "Bash(python*)",
                    "Bash(pip*)",
                    "Read(*)",
                    "Write(.analysis/*)",
                    "Write(.dashboards/*)",
                    "Write(output/*)"
                ]
            }
        }
        with open(settings_path, 'w') as f:
            json.dump(settings, f, indent=2)

    async def run_analysis(
        self,
        user_id: str,
        project_name: str,
        project_dir: str,
        mode: str = "headless",
        analysis_mode: str = "combined"
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Run data analysis on a project.

        Args:
            user_id: User identifier
            project_name: Project name
            project_dir: Full path to project directory
            mode: "headless" for clean output, "terminal" for full view
            analysis_mode: "combined" for unified analysis, "separate" for per-file detailed analysis

        Yields:
            Dict with event type and data
        """
        session_id = self.get_session_id(user_id, project_name)

        # Ensure project structure
        self._ensure_project_structure(project_dir, project_name)

        # Kill any existing session
        await self.close_session(session_id)

        # Check for previous analysis context
        context_file = os.path.join(project_dir, '.analysis', 'context.md')
        context = ""
        if os.path.exists(context_file):
            with open(context_file, 'r') as f:
                context = f"\n\nPREVIOUS ANALYSIS CONTEXT:\n{f.read()}\n\n"

        # Build prompt based on analysis mode
        if analysis_mode == "separate":
            prompt = f"""Analyze all data files in this project with DETAILED PER-FILE ANALYSIS.{context}

ANALYSIS MODE: Separate (detailed per-file insights)

STEPS:
1. Activate the Python venv: source ~/.local/share/data-studio-venv/bin/activate
2. Write a Python script to analyze EACH file in data/ directory SEPARATELY
3. For EACH file, the script must:
   - Load the file (CSV, JSON, Excel, Parquet) using pandas
   - Extract: row count, column count, column names, data types
   - Calculate statistics for each column (min, max, mean, unique counts, nulls)
   - Detect patterns and anomalies in each column
   - Generate specific chart recommendations for this file
   - Save detailed per-file analysis to .analysis/file_analyses/{{filename}}_analysis.json
4. After all files, create a summary in .analysis/metadata.json
5. Run the script
6. Output a detailed summary for each file

REQUIRED OUTPUT FORMAT for .analysis/metadata.json:
{{
  "project_name": "string",
  "analyzed_at": "ISO timestamp",
  "analysis_mode": "separate",
  "summary": {{
    "total_files": int,
    "total_rows": int,
    "files_analyzed": ["file1.csv", "file2.xlsx"]
  }},
  "files": {{
    "filename.csv": {{
      "rows": int,
      "columns": int,
      "column_details": [
        {{"name": "col1", "type": "int64", "unique": 100, "nulls": 0, "min": 0, "max": 100}}
      ],
      "quality_score": 0.95,
      "insights": ["Column X has outliers", "Strong correlation with Y"],
      "recommended_charts": ["histogram", "scatter"]
    }}
  }}
}}

ALSO create per-file analysis files at .analysis/file_analyses/{{filename}}_analysis.json with:
- Full column statistics
- Sample data (first 5 rows)
- Data quality metrics
- Specific visualizations for this file

ALSO save a context file at .analysis/context.md with:
- Detailed summary of each file
- Per-file insights and findings
- File-specific chart recommendations

IMPORTANT: You MUST create the .analysis/metadata.json file. The dashboard generation depends on it."""
        else:
            # Combined mode (default)
            prompt = f"""Analyze all data files in this project with COMBINED ANALYSIS.{context}

ANALYSIS MODE: Combined (unified cross-file analysis)

STEPS:
1. Activate the Python venv: source ~/.local/share/data-studio-venv/bin/activate
2. Write a Python script to analyze all files in data/ directory
3. The script must:
   - Load each file (CSV, JSON, Excel, Parquet) using pandas
   - Extract: row count, column count, column names, data types
   - Look for common columns across files (potential joins)
   - Identify relationships and patterns between files
   - Save results to .analysis/metadata.json
4. Run the script
5. Output a summary of what you found

REQUIRED OUTPUT FORMAT for .analysis/metadata.json:
{{
  "project_name": "string",
  "analyzed_at": "ISO timestamp",
  "analysis_mode": "combined",
  "summary": {{
    "total_files": int,
    "total_rows": int,
    "common_columns": ["col1", "col2"],
    "potential_joins": [{{"files": ["a.csv", "b.csv"], "on": "id"}}]
  }},
  "files": {{"filename.csv": {{"rows": int, "columns": int, "column_details": [...]}}}},
  "cross_file_insights": [
    {{"type": "joinable", "files": ["a.csv", "b.csv"], "on": "patient_id"}},
    {{"type": "correlation", "description": "Column X in file A correlates with Y in file B"}}
  ]
}}

ALSO save a context file for future prompts at .analysis/context.md with:
- Brief summary of each file analyzed
- Cross-file relationships discovered
- Recommended unified dashboard structure
- Any data quality issues found

IMPORTANT: You MUST create the .analysis/metadata.json file. The dashboard generation depends on it."""

        async for event in self._run_claude(session_id, project_dir, prompt, mode):
            yield event

    async def generate_dashboard(
        self,
        user_id: str,
        project_name: str,
        project_dir: str,
        dashboard_name: str = "default",
        mode: str = "headless"
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Generate a dashboard based on analysis.

        Yields:
            Dict with event type and data
        """
        session_id = self.get_session_id(user_id, project_name)

        prompt = f"""Generate a dashboard named '{dashboard_name}' for this project.

STEPS:
1. Read .analysis/metadata.json to understand the data
2. Activate venv: source ~/.local/share/data-studio-venv/bin/activate
3. Write a Python script that:
   - Loads the metadata AND the actual data files from data/
   - Creates 5-10 dashboard widgets based on the data:
     * Stat cards for totals (rows, files, key metrics)
     * Bar/pie charts for categorical columns (with actual data)
     * Histograms for numerical columns (with actual data)
   - Saves to .dashboards/{dashboard_name}.json
4. Run the script

REQUIRED OUTPUT FORMAT for .dashboards/{dashboard_name}.json:
{{
  "id": "{dashboard_name}",
  "name": "{dashboard_name}",
  "description": "string",
  "created_at": "ISO timestamp",
  "widgets": [
    {{
      "id": "w1",
      "type": "stat_card",
      "title": "Total Rows",
      "value": "1,234",
      "subtitle": "Across all files"
    }},
    {{
      "id": "w2",
      "type": "histogram",
      "title": "Age Distribution",
      "plotly": {{
        "data": [{{"type": "histogram", "x": [actual, data, values, here]}}],
        "layout": {{"template": "plotly_dark", "paper_bgcolor": "rgba(0,0,0,0)", "plot_bgcolor": "rgba(0,0,0,0)"}}
      }}
    }}
  ],
  "layout_cols": 12,
  "theme": "dark"
}}

IMPORTANT:
- For stat_card widgets: use "value" (the number/text) and "subtitle" (description)
- For chart widgets: use "plotly" with actual data arrays from the files, NOT placeholders
- Load the actual CSV/Excel data to populate chart arrays
- You MUST create the .dashboards/{dashboard_name}.json file."""

        async for event in self._run_claude(session_id, project_dir, prompt, mode):
            yield event

    async def nlp_edit(
        self,
        user_id: str,
        project_name: str,
        project_dir: str,
        request: str,
        dashboard_id: str = "default",
        widget_id: Optional[str] = None,
        mode: str = "headless"
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Edit dashboard using natural language.

        Yields:
            Dict with event type and data
        """
        session_id = self.get_session_id(user_id, project_name)

        target = f"widget '{widget_id}'" if widget_id else "the entire dashboard"

        prompt = f"""Edit {target} in dashboard '{dashboard_id}'.

Read current dashboard from .dashboards/{dashboard_id}.json

User request: "{request}"

Modify the Plotly specification according to the request. Common modifications:
- Chart type: change trace type (bar, line, scatter, pie, etc.)
- Orientation: swap x/y axes, set orientation='h'
- Colors: update marker.color or colorscale
- Titles: update layout.title or axis titles
- Add elements: add traces, annotations, shapes
- Style: margins, fonts, legends

Save the updated dashboard to .dashboards/{dashboard_id}.json

Output only the modified widget specification (or full dashboard if editing multiple widgets)."""

        async for event in self._run_claude(session_id, project_dir, prompt, mode):
            yield event

    async def chat(
        self,
        user_id: str,
        project_name: str,
        project_dir: str,
        message: str,
        mode: str = "headless"
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Chat with Claude about the data.

        Yields:
            Dict with event type and data
        """
        session_id = self.get_session_id(user_id, project_name)

        prompt = f"""User question about the data: "{message}"

You have access to:
- Data files in data/
- Analysis in .analysis/metadata.json
- Insights in .analysis/insights.md
- Dashboards in .dashboards/

Answer the question. If needed, run additional analysis.
If asked to create a visualization, output a Plotly JSON specification."""

        async for event in self._run_claude(session_id, project_dir, prompt, mode):
            yield event

    async def _run_claude(
        self,
        session_id: str,
        project_dir: str,
        prompt: str,
        mode: str = "headless"
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Execute Claude Code and stream output.

        Args:
            session_id: Session identifier
            project_dir: Working directory
            prompt: The prompt to send
            mode: "headless" or "terminal"

        Yields:
            Dict with type and content
        """
        # Build command - don't use --resume with -p mode as it requires existing UUID session
        cmd = [
            "claude",
            "-p", prompt,
            "--output-format", "stream-json",
            "--verbose",
            "--permission-mode", "bypassPermissions"
        ]

        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                cwd=project_dir,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env={**os.environ, "TERM": "dumb"}
            )

            # Store session
            self.sessions[session_id] = ClaudeSession(
                session_id=session_id,
                project_dir=project_dir,
                user_id="",
                process=process,
                mode=mode
            )

            yield {"type": "status", "content": "Session started, processing..."}

            # Stream stdout
            buffer = ""
            while True:
                chunk = await process.stdout.read(4096)
                if not chunk:
                    break

                buffer += chunk.decode('utf-8', errors='replace')

                # Process complete JSON lines
                while '\n' in buffer:
                    line, buffer = buffer.split('\n', 1)
                    line = line.strip()
                    if not line:
                        continue

                    try:
                        event = json.loads(line)
                        event_type = event.get('type', 'unknown')

                        if mode == "terminal":
                            # Terminal mode: yield everything
                            yield {"type": event_type, "content": event}
                        else:
                            # Headless mode: filter to important events
                            if event_type == 'assistant':
                                # Claude's response
                                message = event.get('message', {})
                                content = message.get('content', [])
                                for block in content:
                                    if block.get('type') == 'text':
                                        yield {"type": "text", "content": block.get('text', '')}
                                    elif block.get('type') == 'tool_use':
                                        tool_name = block.get('name', '')
                                        yield {"type": "tool", "content": f"Using: {tool_name}"}

                            elif event_type == 'result':
                                # Final result
                                yield {"type": "result", "content": event.get('result', '')}

                            elif event_type == 'error':
                                yield {"type": "error", "content": event.get('error', {}).get('message', 'Unknown error')}

                    except json.JSONDecodeError:
                        # Not JSON, might be raw output
                        if mode == "terminal":
                            yield {"type": "raw", "content": line}

            # Wait for process to complete
            await process.wait()

            if process.returncode != 0:
                stderr = await process.stderr.read()
                yield {"type": "error", "content": f"Process exited with code {process.returncode}: {stderr.decode()}"}
            else:
                yield {"type": "complete", "content": "Analysis complete"}

        except Exception as e:
            logger.exception(f"Error running Claude: {e}")
            yield {"type": "error", "content": str(e)}

        finally:
            # Cleanup
            if session_id in self.sessions:
                del self.sessions[session_id]

    async def close_session(self, session_id: str) -> bool:
        """Close an active session."""
        session = self.sessions.get(session_id)
        if session:
            if session.process and session.process.returncode is None:
                try:
                    session.process.terminate()
                    await asyncio.sleep(0.5)
                    if session.process.returncode is None:
                        session.process.kill()
                except Exception as e:
                    logger.warning(f"Error killing process: {e}")
            # Use pop to avoid KeyError if already deleted
            self.sessions.pop(session_id, None)
            return True
        return False


# Singleton instance
claude_runner = ClaudeRunner()

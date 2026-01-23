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
        mode: str = "headless"
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Run data analysis on a project.

        Args:
            user_id: User identifier
            project_name: Project name
            project_dir: Full path to project directory
            mode: "headless" for clean output, "terminal" for full view

        Yields:
            Dict with event type and data
        """
        session_id = self.get_session_id(user_id, project_name)

        # Ensure project structure
        self._ensure_project_structure(project_dir, project_name)

        # Kill any existing session
        await self.close_session(session_id)

        prompt = """Analyze all data files in this project.

Use the data-studio-analyst skill. For each file in data/:
1. Detect file type and load with pandas
2. Extract column types, statistics, patterns
3. Generate insights about the data
4. Recommend visualizations

Save results:
- .analysis/metadata.json - Structured analysis
- .analysis/insights.md - Append human-readable insights
- .analysis/file_hashes.json - Track file hashes

Output a summary of what you found."""

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

Read the analysis from .analysis/metadata.json.

Design 5-10 widgets that best represent the data:
1. Start with stat cards for key metrics (row counts, averages)
2. Add distributions for numerical columns (histograms)
3. Add breakdowns for categorical columns (bar/pie charts)
4. Add time series if temporal data exists
5. Add correlation plots if multiple numerical columns

For each widget, generate a complete Plotly JSON specification with:
- Dark theme (template: 'plotly_dark')
- Transparent backgrounds
- Proper titles and labels

Save the dashboard to .dashboards/{dashboard_name}.json

Output the complete dashboard JSON."""

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
        # Build command
        cmd = [
            "claude",
            "-p", prompt,
            "--output-format", "stream-json",
            "--verbose",
            "--resume", session_id,
            "--permission-mode", "bypassPermissions"
        ]

        yield {"type": "status", "content": "Starting Claude Code session..."}

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
        if session_id in self.sessions:
            session = self.sessions[session_id]
            if session.process and session.process.returncode is None:
                try:
                    session.process.terminate()
                    await asyncio.sleep(0.5)
                    if session.process.returncode is None:
                        session.process.kill()
                except Exception as e:
                    logger.warning(f"Error killing process: {e}")
            del self.sessions[session_id]
            return True
        return False


# Singleton instance
claude_runner = ClaudeRunner()

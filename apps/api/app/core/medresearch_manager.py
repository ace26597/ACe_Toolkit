"""
MedResearch Process Manager

Manages Claude Code CLI processes using pexpect with PTY support for
web-based medical research QA sessions.

Key Features:
- PTY allocation for interactive terminal
- ANSI escape sequence passthrough
- Async read/write operations
- Process lifecycle management
- Multiple concurrent sessions support
"""

import asyncio
import os
import uuid
import shutil
import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Optional, Callable, Any
from dataclasses import dataclass, field

try:
    import pexpect
except ImportError:
    pexpect = None  # Will be caught at runtime

logger = logging.getLogger("medresearch_manager")

# Claude settings for scientific-skills MCP plugin
CLAUDE_SETTINGS_TEMPLATE = {
    "enabledPlugins": {
        "scientific-skills@claude-scientific-skills": True,
        "context7@claude-plugins-official": True
    },
    "permissions": {
        "allow": [
            "Bash(run scientific tools)",
            "Bash(run data analysis)",
            "Bash(run visualization)",
            "Read(*)",
            "Write(*)",
            "Edit(*)"
        ]
    }
}

# CLAUDE.md template for medical research sessions
CLAUDE_MD_TEMPLATE = """# CLAUDE.md - Medical Research QA Session

**Session Type:** Medical Research Assistant with Scientific Skills
**Environment:** Sandboxed workspace with scientific-skills MCP enabled
**Session ID:** {session_id}
**Created:** {created_at}

---

## IMPORTANT: Scientific Skills Plugin

This session has the **scientific-skills** MCP plugin enabled with 140+ scientific tools.

**ALWAYS USE THESE TOOLS for research tasks:**

### Literature & Databases
- `pubmed` - Search PubMed for medical literature
- `biorxiv` / `medrxiv` - Search preprint servers
- `uniprot` - Protein sequence and function data
- `chembl` - Bioactive molecules and drug data
- `drugbank` - Drug and target information
- `kegg` - Pathway and disease databases
- `reactome` - Biological pathway analysis

### Molecular Analysis
- `rdkit` - Molecular structure analysis, SMILES parsing
- `biopython` - Sequence analysis, alignments
- `openbabel` - Chemical format conversion

### Data Science
- `pandas` - Data manipulation and analysis
- `numpy` - Numerical computing
- `scipy` - Scientific computing
- `scikit-learn` - Machine learning

### Visualization
- `matplotlib` - Create plots and figures
- `seaborn` - Statistical visualizations
- `plotly` - Interactive charts

---

## Role & Context

You are a specialized medical research assistant. Your primary function is to assist with medical and healthcare research questions using the scientific tools available.

**PROACTIVELY USE SCIENTIFIC SKILLS** - Don't just explain concepts, use the tools to:
- Search PubMed for relevant papers
- Query protein/drug databases
- Analyze molecular structures
- Generate visualizations
- Process research data

## Core Capabilities

### 1. Literature Research (USE: pubmed, biorxiv, medrxiv)
- Search and analyze medical literature
- Summarize research papers and clinical studies
- Identify key findings and methodologies

### 2. Database Queries (USE: uniprot, chembl, drugbank, kegg)
- Query protein and drug databases
- Find molecular targets and pathways
- Retrieve compound information

### 3. Molecular Analysis (USE: rdkit, biopython)
- Analyze chemical structures
- Process sequence data
- Calculate molecular properties

### 4. Data Processing (USE: pandas, numpy, scipy)
- Analyze medical datasets
- Generate statistical summaries
- Machine learning analysis

### 5. Visualization (USE: matplotlib, seaborn, plotly)
- Create publication-ready figures
- Generate data visualizations
- Plot analysis results

## Guidelines

1. **Use scientific skills actively** - Query databases, don't just describe them
2. **Always cite sources** - Reference specific studies (DOI, PMID)
3. **Show your work** - Display tool outputs and analysis steps
4. **Save outputs** - Write results to files in this workspace
5. **No clinical advice** - Educational information only

## Workspace

- Isolated workspace at {workspace_dir}
- Files are saved here and cleaned up after 24 hours
- Save research outputs, analyses, and reports

---

**Remember:** USE THE SCIENTIFIC SKILLS! Don't just explain - demonstrate with actual tool calls.
"""


@dataclass
class ClaudeProcess:
    """Container for Claude Code process state"""
    process: Any  # pexpect.spawn
    workspace_dir: Path
    medresearch_id: str
    created_at: datetime
    read_task: Optional[asyncio.Task] = None
    is_alive: bool = True


class MedResearchManager:
    """Manages Claude Code CLI processes for medical research sessions"""

    BASE_DIR = Path("/home/ace/medresearch_sessions")

    def __init__(self):
        self.processes: Dict[str, ClaudeProcess] = {}
        # Ensure base directory exists
        self.BASE_DIR.mkdir(parents=True, exist_ok=True)
        logger.info(f"MedResearchManager initialized. Base dir: {self.BASE_DIR}")

    def create_workspace(self, medresearch_id: str) -> Path:
        """
        Create workspace directory with CLAUDE.md and .claude/settings.local.json

        Args:
            medresearch_id: UUID for the session

        Returns:
            Path to workspace directory
        """
        workspace = self.BASE_DIR / medresearch_id
        workspace.mkdir(parents=True, exist_ok=True)

        # Write CLAUDE.md template
        claude_md_path = workspace / "CLAUDE.md"
        claude_md_content = CLAUDE_MD_TEMPLATE.format(
            session_id=medresearch_id,
            created_at=datetime.utcnow().isoformat(),
            workspace_dir=str(workspace)
        )
        claude_md_path.write_text(claude_md_content)

        # Create .claude directory with settings for scientific-skills plugin
        claude_dir = workspace / ".claude"
        claude_dir.mkdir(parents=True, exist_ok=True)

        # Write settings.local.json with scientific-skills enabled
        settings_path = claude_dir / "settings.local.json"
        settings_path.write_text(json.dumps(CLAUDE_SETTINGS_TEMPLATE, indent=2))

        logger.info(f"Created workspace with scientific-skills: {workspace}")
        return workspace

    async def spawn_claude(
        self,
        medresearch_id: str,
        workspace_dir: Path,
        rows: int = 24,
        cols: int = 80,
        output_callback: Optional[Callable[[bytes], Any]] = None
    ) -> bool:
        """
        Spawn Claude Code CLI process in workspace directory

        Args:
            medresearch_id: Session ID
            workspace_dir: Working directory for Claude
            rows: Terminal height
            cols: Terminal width
            output_callback: Async callback for output data

        Returns:
            True if spawn successful
        """
        if pexpect is None:
            logger.error("pexpect not installed. Install with: pip install pexpect")
            return False

        if medresearch_id in self.processes:
            proc = self.processes[medresearch_id]
            if proc.process.isalive():
                logger.warning(f"Process already exists and alive for {medresearch_id}")
                return True
            else:
                # Clean up dead process
                await self.terminate_session(medresearch_id)

        try:
            env = os.environ.copy()
            env['TERM'] = 'xterm-256color'
            env['FORCE_COLOR'] = '1'
            env['COLORTERM'] = 'truecolor'
            # Ensure Claude Code uses the workspace directory
            env['PWD'] = str(workspace_dir)
            # DO NOT override CLAUDE_CONFIG_DIR - let Claude use global ~/.claude
            # for plugins. Project-specific settings.local.json in workspace/.claude
            # will still be read automatically by Claude Code.

            # Spawn Claude Code - user will interact with permission prompts
            # Scientific-skills plugin is enabled globally in ~/.claude/settings.json
            process = pexpect.spawn(
                'claude',
                args=[],  # No args - let user interact with prompts
                cwd=str(workspace_dir),
                env=env,
                encoding=None,  # Raw bytes for ANSI passthrough
                dimensions=(rows, cols),
                timeout=None  # No timeout for interactive sessions
            )

            # Store process info
            self.processes[medresearch_id] = ClaudeProcess(
                process=process,
                workspace_dir=workspace_dir,
                medresearch_id=medresearch_id,
                created_at=datetime.utcnow()
            )

            # Start async read task if callback provided
            if output_callback:
                self.processes[medresearch_id].read_task = asyncio.create_task(
                    self._async_read_loop(medresearch_id, output_callback)
                )

            logger.info(f"Spawned Claude Code for {medresearch_id}, PID: {process.pid}")
            return True

        except FileNotFoundError:
            logger.error("Claude Code CLI not found. Ensure 'claude' is in PATH")
            return False
        except Exception as e:
            logger.error(f"Failed to spawn Claude Code: {e}")
            return False

    async def _async_read_loop(
        self,
        medresearch_id: str,
        callback: Callable[[bytes], Any]
    ):
        """Async loop reading from pexpect process and calling callback with output"""
        process_info = self.processes.get(medresearch_id)
        if not process_info:
            return

        process = process_info.process

        while process_info.is_alive:
            try:
                if process.isalive():
                    # Use asyncio.to_thread for blocking read
                    data = await asyncio.to_thread(
                        self._read_nonblocking,
                        process
                    )
                    if data:
                        # Call callback (might be async or sync)
                        result = callback(data)
                        if asyncio.iscoroutine(result):
                            await result
                else:
                    # Process terminated
                    process_info.is_alive = False
                    result = callback(b'\r\n\x1b[1;33m[Session ended]\x1b[0m\r\n')
                    if asyncio.iscoroutine(result):
                        await result
                    break

                # Small delay to prevent busy loop
                await asyncio.sleep(0.01)

            except pexpect.EOF:
                process_info.is_alive = False
                result = callback(b'\r\n\x1b[1;33m[Session ended - EOF]\x1b[0m\r\n')
                if asyncio.iscoroutine(result):
                    await result
                break
            except asyncio.CancelledError:
                logger.info(f"Read task cancelled for {medresearch_id}")
                break
            except Exception as e:
                logger.error(f"Read error for {medresearch_id}: {e}")
                await asyncio.sleep(0.1)  # Prevent tight loop on error

    def _read_nonblocking(self, process: Any, size: int = 4096) -> bytes:
        """Non-blocking read from pexpect process"""
        try:
            return process.read_nonblocking(size, timeout=0.1)
        except pexpect.TIMEOUT:
            return b''
        except pexpect.EOF:
            raise

    async def write_input(self, medresearch_id: str, data: bytes) -> bool:
        """
        Write user input to Claude process

        Args:
            medresearch_id: Session ID
            data: Raw bytes to send to process stdin

        Returns:
            True if write successful
        """
        process_info = self.processes.get(medresearch_id)
        if not process_info:
            logger.warning(f"No process found for {medresearch_id}")
            return False

        if not process_info.process.isalive():
            logger.warning(f"Process not alive for {medresearch_id}")
            return False

        try:
            process_info.process.send(data)
            return True
        except Exception as e:
            logger.error(f"Write error for {medresearch_id}: {e}")
            return False

    async def resize_terminal(self, medresearch_id: str, rows: int, cols: int) -> bool:
        """
        Resize PTY dimensions

        Args:
            medresearch_id: Session ID
            rows: New terminal height
            cols: New terminal width

        Returns:
            True if resize successful
        """
        process_info = self.processes.get(medresearch_id)
        if not process_info:
            return False

        if not process_info.process.isalive():
            return False

        try:
            process_info.process.setwinsize(rows, cols)
            logger.debug(f"Resized terminal for {medresearch_id}: {rows}x{cols}")
            return True
        except Exception as e:
            logger.error(f"Resize error for {medresearch_id}: {e}")
            return False

    def is_process_alive(self, medresearch_id: str) -> bool:
        """Check if process is still running"""
        process_info = self.processes.get(medresearch_id)
        if not process_info:
            return False
        return process_info.process.isalive()

    async def terminate_session(self, medresearch_id: str) -> bool:
        """
        Terminate Claude process and cleanup

        Args:
            medresearch_id: Session ID

        Returns:
            True if termination successful
        """
        process_info = self.processes.pop(medresearch_id, None)
        if not process_info:
            return False

        try:
            # Cancel read task
            if process_info.read_task:
                process_info.read_task.cancel()
                try:
                    await process_info.read_task
                except asyncio.CancelledError:
                    pass

            # Mark as not alive
            process_info.is_alive = False

            # Terminate process
            if process_info.process.isalive():
                process_info.process.terminate(force=True)

            logger.info(f"Terminated session {medresearch_id}")
            return True

        except Exception as e:
            logger.error(f"Termination error for {medresearch_id}: {e}")
            return False

    def delete_workspace(self, workspace_dir: Path) -> bool:
        """
        Delete workspace directory

        Args:
            workspace_dir: Path to workspace

        Returns:
            True if deletion successful
        """
        try:
            if workspace_dir.exists() and workspace_dir.is_dir():
                # Safety check: ensure it's under BASE_DIR
                if str(workspace_dir).startswith(str(self.BASE_DIR)):
                    shutil.rmtree(workspace_dir)
                    logger.info(f"Deleted workspace: {workspace_dir}")
                    return True
            return False
        except Exception as e:
            logger.error(f"Failed to delete workspace {workspace_dir}: {e}")
            return False

    async def cleanup_old_sessions(self, max_age_hours: int = 24) -> int:
        """
        Cleanup sessions older than max_age_hours

        Args:
            max_age_hours: Maximum age before cleanup

        Returns:
            Number of sessions cleaned up
        """
        deleted = 0
        cutoff = datetime.utcnow() - timedelta(hours=max_age_hours)

        for session_dir in self.BASE_DIR.iterdir():
            if not session_dir.is_dir():
                continue

            try:
                mtime = datetime.fromtimestamp(session_dir.stat().st_mtime)
                if mtime < cutoff:
                    session_id = session_dir.name

                    # Terminate if running
                    if session_id in self.processes:
                        await self.terminate_session(session_id)

                    # Remove directory
                    shutil.rmtree(session_dir)
                    deleted += 1
                    logger.info(f"Cleaned up old session: {session_id}")

            except Exception as e:
                logger.error(f"Cleanup error for {session_dir}: {e}")

        return deleted

    async def shutdown(self):
        """Shutdown all processes gracefully"""
        logger.info("Shutting down MedResearchManager...")
        for session_id in list(self.processes.keys()):
            await self.terminate_session(session_id)
        logger.info("MedResearchManager shutdown complete")


# Global instance
medresearch_manager = MedResearchManager()

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

from app.core.config import settings

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

    def __init__(self):
        self.processes: Dict[str, ClaudeProcess] = {}
        # Use config paths for SSD storage
        self.BASE_DIR = Path(settings.CLAUDE_WORKSPACES_DIR)
        self.PROJECTS_DIR = Path(settings.MEDRESEARCH_DATA_DIR)
        # Ensure directories exist
        self.BASE_DIR.mkdir(parents=True, exist_ok=True)
        self.PROJECTS_DIR.mkdir(parents=True, exist_ok=True)
        logger.info(f"MedResearchManager initialized. Workspaces: {self.BASE_DIR}, Projects: {self.PROJECTS_DIR}")

    def create_workspace(self, medresearch_id: str) -> Path:
        """
        Create workspace directory with isolated Claude config.

        Creates:
        - CLAUDE.md with session instructions
        - .claude/ directory with:
          - settings.json (copied from global ~/.claude/)
          - settings.local.json (session-specific permissions)
          - plugins/ (symlinked to global ~/.claude/plugins/)

        This isolation allows multiple Claude Code instances to run
        simultaneously without conflicts.

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

        # Create isolated .claude directory for this session
        claude_dir = workspace / ".claude"
        claude_dir.mkdir(parents=True, exist_ok=True)

        global_claude = Path.home() / ".claude"

        # 1. Copy settings.json from global (main config with enabled plugins)
        global_settings = global_claude / "settings.json"
        if global_settings.exists():
            shutil.copy(global_settings, claude_dir / "settings.json")
            logger.debug(f"Copied global settings.json to {claude_dir}")

        # 2. Symlink plugins directory (shared across sessions - contains installed plugins)
        global_plugins = global_claude / "plugins"
        session_plugins = claude_dir / "plugins"
        if global_plugins.exists() and not session_plugins.exists():
            try:
                session_plugins.symlink_to(global_plugins)
                logger.debug(f"Symlinked plugins: {session_plugins} -> {global_plugins}")
            except OSError as e:
                logger.warning(f"Failed to symlink plugins: {e}")

        # 3. Copy/symlink skills directory (custom user skills)
        global_skills = global_claude / "skills"
        session_skills = claude_dir / "skills"
        if global_skills.exists() and not session_skills.exists():
            try:
                session_skills.symlink_to(global_skills)
                logger.debug(f"Symlinked skills: {session_skills} -> {global_skills}")
            except OSError as e:
                logger.warning(f"Failed to symlink skills: {e}")

        # 4. Copy credentials (hidden file with API keys)
        global_credentials = global_claude / ".credentials.json"
        if global_credentials.exists():
            shutil.copy(global_credentials, claude_dir / ".credentials.json")
            logger.debug(f"Copied .credentials.json to {claude_dir}")

        # 5. Symlink statsig directory (for feature flags/config)
        global_statsig = global_claude / "statsig"
        session_statsig = claude_dir / "statsig"
        if global_statsig.exists() and not session_statsig.exists():
            try:
                session_statsig.symlink_to(global_statsig)
                logger.debug(f"Symlinked statsig: {session_statsig} -> {global_statsig}")
            except OSError as e:
                logger.warning(f"Failed to symlink statsig: {e}")

        # 6. Symlink cache directory (for plugin/marketplace caches)
        global_cache = global_claude / "cache"
        session_cache = claude_dir / "cache"
        if global_cache.exists() and not session_cache.exists():
            try:
                session_cache.symlink_to(global_cache)
                logger.debug(f"Symlinked cache: {session_cache} -> {global_cache}")
            except OSError as e:
                logger.warning(f"Failed to symlink cache: {e}")

        # 7. Write settings.local.json with session-specific permissions
        settings_local_path = claude_dir / "settings.local.json"
        settings_local_path.write_text(json.dumps(CLAUDE_SETTINGS_TEMPLATE, indent=2))

        logger.info(f"Created isolated workspace: {workspace}")
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

            # IMPORTANT: Set CLAUDE_CONFIG_DIR to session-specific .claude directory
            # This isolates each session's config, state, and locks, allowing
            # multiple Claude Code instances to run simultaneously without conflicts.
            # Plugins are symlinked from global ~/.claude/plugins/ so they still work.
            session_claude_dir = workspace_dir / ".claude"
            env['CLAUDE_CONFIG_DIR'] = str(session_claude_dir)

            logger.info(f"Using isolated config: CLAUDE_CONFIG_DIR={session_claude_dir}")

            # Spawn Claude Code - user will interact with permission prompts
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

    def save_project(
        self,
        workspace_dir: Path,
        project_name: str,
        description: str = ""
    ) -> Optional[Path]:
        """
        Save workspace as a persistent project on SSD.

        Copies workspace contents to projects directory, excluding
        temporary files and .claude config directory.

        Args:
            workspace_dir: Source workspace path
            project_name: Name for the saved project (sanitized)
            description: Optional description

        Returns:
            Path to saved project, or None on failure
        """
        # Sanitize project name
        safe_name = "".join(c for c in project_name if c.isalnum() or c in "-_ ").strip()
        if not safe_name:
            safe_name = f"project_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"

        project_path = self.PROJECTS_DIR / safe_name

        try:
            # Copy workspace to project directory
            if project_path.exists():
                # Overwrite existing project
                shutil.rmtree(project_path)

            shutil.copytree(
                workspace_dir,
                project_path,
                ignore=shutil.ignore_patterns('.claude', '__pycache__', '*.pyc', '.git')
            )

            # Write metadata file
            metadata = {
                "name": safe_name,
                "description": description,
                "source_workspace": str(workspace_dir),
                "saved_at": datetime.utcnow().isoformat(),
                "files": [str(f.relative_to(project_path)) for f in project_path.rglob("*") if f.is_file()]
            }
            metadata_path = project_path / ".project_metadata.json"
            metadata_path.write_text(json.dumps(metadata, indent=2))

            logger.info(f"Saved project '{safe_name}' to {project_path}")
            return project_path

        except Exception as e:
            logger.error(f"Failed to save project '{project_name}': {e}")
            return None

    def list_saved_projects(self) -> list:
        """
        List all saved projects.

        Returns:
            List of project metadata dicts
        """
        projects = []

        for project_dir in self.PROJECTS_DIR.iterdir():
            if not project_dir.is_dir():
                continue

            metadata_path = project_dir / ".project_metadata.json"
            if metadata_path.exists():
                try:
                    metadata = json.loads(metadata_path.read_text())
                    metadata["path"] = str(project_dir)
                    projects.append(metadata)
                except Exception as e:
                    logger.warning(f"Failed to read metadata for {project_dir}: {e}")
                    # Still include project with basic info
                    projects.append({
                        "name": project_dir.name,
                        "path": str(project_dir),
                        "saved_at": datetime.fromtimestamp(project_dir.stat().st_mtime).isoformat()
                    })
            else:
                # Project without metadata file
                projects.append({
                    "name": project_dir.name,
                    "path": str(project_dir),
                    "saved_at": datetime.fromtimestamp(project_dir.stat().st_mtime).isoformat()
                })

        # Sort by saved_at descending
        projects.sort(key=lambda p: p.get("saved_at", ""), reverse=True)
        return projects

    def restore_project(self, project_name: str, medresearch_id: str) -> Optional[Path]:
        """
        Restore a saved project to a new workspace.

        Args:
            project_name: Name of saved project
            medresearch_id: New session ID

        Returns:
            Path to new workspace, or None on failure
        """
        project_path = self.PROJECTS_DIR / project_name

        if not project_path.exists():
            logger.error(f"Project '{project_name}' not found")
            return None

        try:
            # Create new workspace
            workspace = self.BASE_DIR / medresearch_id

            # Copy project files to workspace
            shutil.copytree(
                project_path,
                workspace,
                ignore=shutil.ignore_patterns('.project_metadata.json')
            )

            # Update CLAUDE.md with new session info
            claude_md_path = workspace / "CLAUDE.md"
            if claude_md_path.exists():
                claude_md_content = CLAUDE_MD_TEMPLATE.format(
                    session_id=medresearch_id,
                    created_at=datetime.utcnow().isoformat(),
                    workspace_dir=str(workspace)
                )
                claude_md_path.write_text(claude_md_content)

            # Create isolated .claude directory
            self._setup_claude_config(workspace)

            logger.info(f"Restored project '{project_name}' to workspace {workspace}")
            return workspace

        except Exception as e:
            logger.error(f"Failed to restore project '{project_name}': {e}")
            return None

    def _setup_claude_config(self, workspace: Path):
        """Set up isolated .claude config for a workspace with full plugin/skill support"""
        claude_dir = workspace / ".claude"
        claude_dir.mkdir(parents=True, exist_ok=True)

        global_claude = Path.home() / ".claude"

        # 1. Copy settings.json (main config with enabled plugins)
        global_settings = global_claude / "settings.json"
        if global_settings.exists():
            shutil.copy(global_settings, claude_dir / "settings.json")

        # 2. Symlink plugins directory (contains installed plugins and marketplaces)
        global_plugins = global_claude / "plugins"
        session_plugins = claude_dir / "plugins"
        if global_plugins.exists() and not session_plugins.exists():
            try:
                session_plugins.symlink_to(global_plugins)
            except OSError:
                pass

        # 3. Symlink skills directory (custom user skills)
        global_skills = global_claude / "skills"
        session_skills = claude_dir / "skills"
        if global_skills.exists() and not session_skills.exists():
            try:
                session_skills.symlink_to(global_skills)
            except OSError:
                pass

        # 4. Copy credentials (hidden file with API keys)
        global_credentials = global_claude / ".credentials.json"
        if global_credentials.exists():
            shutil.copy(global_credentials, claude_dir / ".credentials.json")

        # 5. Symlink statsig directory (feature flags)
        global_statsig = global_claude / "statsig"
        session_statsig = claude_dir / "statsig"
        if global_statsig.exists() and not session_statsig.exists():
            try:
                session_statsig.symlink_to(global_statsig)
            except OSError:
                pass

        # 6. Symlink cache directory (plugin caches)
        global_cache = global_claude / "cache"
        session_cache = claude_dir / "cache"
        if global_cache.exists() and not session_cache.exists():
            try:
                session_cache.symlink_to(global_cache)
            except OSError:
                pass

        # 7. Write settings.local.json with session-specific permissions
        settings_local_path = claude_dir / "settings.local.json"
        settings_local_path.write_text(json.dumps(CLAUDE_SETTINGS_TEMPLATE, indent=2))

    def delete_project(self, project_name: str) -> bool:
        """
        Delete a saved project.

        Args:
            project_name: Name of project to delete

        Returns:
            True if deletion successful
        """
        project_path = self.PROJECTS_DIR / project_name

        try:
            if project_path.exists() and project_path.is_dir():
                # Safety check
                if str(project_path).startswith(str(self.PROJECTS_DIR)):
                    shutil.rmtree(project_path)
                    logger.info(f"Deleted project: {project_name}")
                    return True
            return False
        except Exception as e:
            logger.error(f"Failed to delete project '{project_name}': {e}")
            return False


# Global instance
medresearch_manager = MedResearchManager()

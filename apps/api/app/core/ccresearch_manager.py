"""
CCResearch Process Manager (Claude Code Research Platform)

Manages Claude Code CLI processes using pexpect with PTY support for
web-based research sessions.

Key Features:
- PTY allocation for interactive terminal
- ANSI escape sequence passthrough
- Async read/write operations
- Process lifecycle management
- Multiple concurrent sessions support
- File upload handling with CLAUDE.md updates
"""

import asyncio
import os
import uuid
import shutil
import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Optional, Callable, Any, List
from dataclasses import dataclass, field

try:
    import pexpect
except ImportError:
    pexpect = None  # Will be caught at runtime

from app.core.config import settings

logger = logging.getLogger("ccresearch_manager")

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

# CLAUDE.md template for research sessions
CLAUDE_MD_TEMPLATE = """# CLAUDE.md - Claude Code Research Session

**Session Type:** Research Assistant with Scientific Skills
**Environment:** Sandboxed workspace with scientific-skills MCP enabled
**Session ID:** {session_id}
**User Email:** {email}
**Created:** {created_at}

---
{uploaded_files_section}
## IMPORTANT: Scientific Skills Plugin

This session has the **scientific-skills** MCP plugin enabled with 140+ scientific tools.

**ALWAYS USE THESE TOOLS for research tasks:**

### Literature & Databases
- `pubmed` - Search PubMed for literature
- `biorxiv` / `medrxiv` - Search preprint servers
- `uniprot` - Protein sequence and function data
- `chembl` - Bioactive molecules and drug data
- `drugbank` - Drug and target information
- `kegg` - Pathway and disease databases
- `reactome` - Biological pathway analysis

### Molecular Analysis
- `rdkit` - Molecular structure analysis, SMILES parsing
- `biopython` - Sequence analysis, alignments

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

You are a specialized research assistant. Your primary function is to assist with research questions using the scientific tools available.

**PROACTIVELY USE SCIENTIFIC SKILLS** - Don't just explain concepts, use the tools to:
- Search PubMed for relevant papers
- Query protein/drug databases
- Analyze molecular structures
- Generate visualizations
- Process research data

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

# Template section for uploaded files
UPLOADED_FILES_SECTION = """
## UPLOADED DATA FILES

The user has uploaded the following files for this research session.
**These files are located in the `data/` directory.**

{file_list}

**IMPORTANT:** When the user asks questions related to these files, READ THEM FIRST
using the Read tool before answering. Analyze the data they contain.

---
"""


@dataclass
class ClaudeProcess:
    """Container for Claude Code process state"""
    process: Any  # pexpect.spawn
    workspace_dir: Path
    ccresearch_id: str
    created_at: datetime
    read_task: Optional[asyncio.Task] = None
    is_alive: bool = True
    log_file: Optional[Any] = None  # File handle for terminal logging


class CCResearchManager:
    """Manages Claude Code CLI processes for research sessions"""

    def __init__(self):
        self.processes: Dict[str, ClaudeProcess] = {}
        # Use config paths for SSD storage
        self.BASE_DIR = Path(settings.CLAUDE_WORKSPACES_DIR)
        self.PROJECTS_DIR = Path(settings.CCRESEARCH_DATA_DIR)
        self.LOGS_DIR = Path(settings.CCRESEARCH_LOGS_DIR)
        # Ensure directories exist
        self.BASE_DIR.mkdir(parents=True, exist_ok=True)
        self.PROJECTS_DIR.mkdir(parents=True, exist_ok=True)
        self.LOGS_DIR.mkdir(parents=True, exist_ok=True)
        logger.info(f"CCResearchManager initialized. Workspaces: {self.BASE_DIR}, Projects: {self.PROJECTS_DIR}, Logs: {self.LOGS_DIR}")

    def create_workspace(
        self,
        ccresearch_id: str,
        email: str = "",
        uploaded_files: List[str] = None
    ) -> Path:
        """
        Create workspace directory with isolated Claude config.

        Creates:
        - CLAUDE.md with session instructions and uploaded file info
        - data/ directory for uploaded files
        - .claude/ directory with session-specific config

        Args:
            ccresearch_id: UUID for the session
            email: User's email address
            uploaded_files: List of uploaded filenames

        Returns:
            Path to workspace directory
        """
        workspace = self.BASE_DIR / ccresearch_id
        workspace.mkdir(parents=True, exist_ok=True)

        # Create data directory for uploaded files
        data_dir = workspace / "data"
        data_dir.mkdir(exist_ok=True)

        # Build uploaded files section if files exist
        uploaded_files_section = ""
        if uploaded_files:
            file_list = "\n".join([f"- `data/{f}`" for f in uploaded_files])
            uploaded_files_section = UPLOADED_FILES_SECTION.format(file_list=file_list)

        # Write CLAUDE.md template
        claude_md_path = workspace / "CLAUDE.md"
        claude_md_content = CLAUDE_MD_TEMPLATE.format(
            session_id=ccresearch_id,
            email=email or "Not provided",
            created_at=datetime.utcnow().isoformat(),
            workspace_dir=str(workspace),
            uploaded_files_section=uploaded_files_section
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

        # 2. Copy plugins config (exFAT doesn't support symlinks)
        # The installed_plugins.json uses absolute paths to ~/.claude/plugins/cache/
        # so we only need to copy the config files, not the actual plugin code
        global_plugins = global_claude / "plugins"
        session_plugins = claude_dir / "plugins"
        if global_plugins.exists() and not session_plugins.exists():
            session_plugins.mkdir(parents=True, exist_ok=True)
            # Copy plugin config files
            for config_file in ["installed_plugins.json", "known_marketplaces.json", "install-counts-cache.json"]:
                src = global_plugins / config_file
                if src.exists():
                    shutil.copy(src, session_plugins / config_file)
                    logger.debug(f"Copied {config_file} to session plugins")
            # Copy marketplaces directory structure (contains marketplace metadata)
            global_marketplaces = global_plugins / "marketplaces"
            if global_marketplaces.exists():
                shutil.copytree(global_marketplaces, session_plugins / "marketplaces")
                logger.debug(f"Copied marketplaces directory to session plugins")
            logger.info(f"Copied plugins config to {session_plugins}")

        # 3. Copy skills directory (full copy - typically small config files)
        global_skills = global_claude / "skills"
        session_skills = claude_dir / "skills"
        if global_skills.exists() and not session_skills.exists():
            shutil.copytree(global_skills, session_skills)
            logger.debug(f"Copied skills directory to {session_skills}")

        # 4. Copy credentials (hidden file with API keys)
        global_credentials = global_claude / ".credentials.json"
        if global_credentials.exists():
            shutil.copy(global_credentials, claude_dir / ".credentials.json")
            logger.debug(f"Copied .credentials.json to {claude_dir}")

        # 5. Copy statsig directory (feature flags/config - small files)
        global_statsig = global_claude / "statsig"
        session_statsig = claude_dir / "statsig"
        if global_statsig.exists() and not session_statsig.exists():
            shutil.copytree(global_statsig, session_statsig)
            logger.debug(f"Copied statsig directory to {session_statsig}")

        # 6. Copy cache directory if it exists and is small
        # (contains marketplace cache, usually small JSON files)
        global_cache = global_claude / "cache"
        session_cache = claude_dir / "cache"
        if global_cache.exists() and not session_cache.exists():
            shutil.copytree(global_cache, session_cache)
            logger.debug(f"Copied cache directory to {session_cache}")

        # 7. Write settings.local.json with session-specific permissions
        settings_local_path = claude_dir / "settings.local.json"
        settings_local_path.write_text(json.dumps(CLAUDE_SETTINGS_TEMPLATE, indent=2))

        logger.info(f"Created isolated workspace: {workspace}")
        return workspace

    def update_workspace_claude_md(
        self,
        ccresearch_id: str,
        workspace_dir: str,
        email: str = "",
        uploaded_files: List[str] = None
    ):
        """
        Update CLAUDE.md with file upload information.

        Called after files are uploaded to update the session's CLAUDE.md
        so Claude knows about the available data.

        Args:
            ccresearch_id: Session ID
            workspace_dir: Workspace path
            email: User's email
            uploaded_files: List of uploaded filenames
        """
        workspace = Path(workspace_dir)
        claude_md_path = workspace / "CLAUDE.md"

        # Build uploaded files section
        uploaded_files_section = ""
        if uploaded_files:
            file_list = "\n".join([f"- `data/{f}`" for f in uploaded_files])
            uploaded_files_section = UPLOADED_FILES_SECTION.format(file_list=file_list)

        # Write updated CLAUDE.md
        claude_md_content = CLAUDE_MD_TEMPLATE.format(
            session_id=ccresearch_id,
            email=email or "Not provided",
            created_at=datetime.utcnow().isoformat(),
            workspace_dir=str(workspace),
            uploaded_files_section=uploaded_files_section
        )
        claude_md_path.write_text(claude_md_content)
        logger.info(f"Updated CLAUDE.md with {len(uploaded_files or [])} files for session {ccresearch_id}")

    def _build_sandbox_command(self, workspace_dir: Path) -> list:
        """
        Build bubblewrap (bwrap) command for sandboxed execution.

        Creates a restricted filesystem view that only allows:
        - System directories (read-only): /usr, /lib, /bin, /etc
        - Claude Code installation (read-only)
        - Plugin cache (read-only)
        - The workspace directory (read-write)
        - Network access for API calls

        Blocks access to:
        - Home directory (except necessary Claude files)
        - Other workspaces (hidden via tmpfs on /data)
        - The ACe_Toolkit codebase
        - Root filesystem

        Security guarantees:
        - Cannot read ~/dev/ACe_Toolkit or any other code
        - Cannot see or access other MedResearch sessions
        - Cannot write anywhere except the workspace
        - Cannot access SD card data (only SSD workspace)
        """
        home = Path.home()
        claude_install = home / ".local/share/claude"
        claude_bin = home / ".local/bin"
        plugin_cache = home / ".claude/plugins/cache"
        session_claude_dir = workspace_dir / ".claude"

        # Build bwrap command
        cmd = [
            "bwrap",
            # System directories (read-only)
            "--ro-bind", "/usr", "/usr",
            "--ro-bind", "/bin", "/bin",
            "--ro-bind", "/sbin", "/sbin",
            "--ro-bind", "/etc", "/etc",
            "--ro-bind", "/lib", "/lib",
        ]

        # Add /lib64 if it exists (some ARM systems don't have it)
        if Path("/lib64").exists():
            cmd.extend(["--ro-bind", "/lib64", "/lib64"])

        cmd.extend([
            # Process/device filesystems
            "--proc", "/proc",
            "--dev", "/dev",
            # Isolated temp directory
            "--tmpfs", "/tmp",
            # Block home directory - create empty tmpfs
            "--tmpfs", "/home",
            "--tmpfs", str(home),
            # Block /data - hide other workspaces with tmpfs
            "--tmpfs", "/data",
            # Claude Code installation (read-only)
            "--ro-bind", str(claude_install), str(claude_install),
            "--ro-bind", str(claude_bin), str(claude_bin),
            # Plugin cache (read-only - actual plugin code lives here)
            "--ro-bind", str(plugin_cache), str(plugin_cache),
            # Workspace directory (read-write) - ONLY writable area
            # This is bound AFTER tmpfs /data, so it appears inside the sandbox
            "--bind", str(workspace_dir), str(workspace_dir),
            # Set environment variables
            "--setenv", "HOME", str(home),
            "--setenv", "CLAUDE_CONFIG_DIR", str(session_claude_dir),
            "--setenv", "PWD", str(workspace_dir),
            # Set working directory
            "--chdir", str(workspace_dir),
            # Security: isolate namespaces but keep network for API calls
            "--unshare-pid",      # Isolate process IDs
            "--unshare-uts",      # Isolate hostname
            "--unshare-cgroup",   # Isolate cgroups
            # Keep network shared (needed for Claude API calls)
            # Process management
            "--die-with-parent",  # Kill sandbox when parent dies
            # NOTE: --new-session removed as it conflicts with pexpect PTY handling
            # Run claude binary
            str(claude_bin / "claude"),
        ])

        return cmd

    def _create_session_log(self, ccresearch_id: str, workspace_dir: Path) -> Any:
        """
        Create log file for terminal session.

        Logs are stored in LOGS_DIR with format:
        {session_id}_{timestamp}.log

        Each log starts with metadata header containing session info,
        then logs all terminal I/O (both input and output) with timestamps.

        Args:
            ccresearch_id: Session ID
            workspace_dir: Workspace path (for metadata)

        Returns:
            File handle for writing log entries
        """
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        log_filename = f"{ccresearch_id}_{timestamp}.log"
        log_path = self.LOGS_DIR / log_filename

        # Open log file in append mode
        log_file = open(log_path, "a", encoding="utf-8", errors="replace")

        # Write session metadata header
        header = f"""================================================================================
CCRESEARCH TERMINAL LOG
================================================================================
Session ID:     {ccresearch_id}
Started:        {datetime.utcnow().isoformat()}
Workspace:      {workspace_dir}
Log File:       {log_path}
================================================================================

"""
        log_file.write(header)
        log_file.flush()

        logger.info(f"Created session log: {log_path}")
        return log_file

    def _log_output(self, process_info: ClaudeProcess, data: bytes):
        """Log terminal output to session log file"""
        if process_info.log_file:
            try:
                # Decode bytes to string, replacing non-decodable chars
                text = data.decode("utf-8", errors="replace")
                # Write output without timestamp prefix (raw terminal output)
                process_info.log_file.write(text)
                process_info.log_file.flush()
            except Exception as e:
                logger.debug(f"Log write error: {e}")

    def _log_input(self, process_info: ClaudeProcess, data: bytes):
        """Log terminal input to session log file"""
        if process_info.log_file:
            try:
                # Decode bytes to string
                text = data.decode("utf-8", errors="replace")
                # Input is typically just keystrokes, no need for special formatting
                # They'll be echoed in output anyway for visibility
                # But we can add a marker for clarity if it's a substantial input
                if len(text) > 1 and text.strip():
                    # Mark multi-char input (like pasted text) distinctly
                    process_info.log_file.write(f"[INPUT] {text}")
                    process_info.log_file.flush()
            except Exception as e:
                logger.debug(f"Log input error: {e}")

    def _close_session_log(self, process_info: ClaudeProcess):
        """Close session log file with footer"""
        if process_info.log_file:
            try:
                footer = f"""

================================================================================
SESSION ENDED: {datetime.utcnow().isoformat()}
================================================================================
"""
                process_info.log_file.write(footer)
                process_info.log_file.close()
                logger.info(f"Closed session log for {process_info.ccresearch_id}")
            except Exception as e:
                logger.error(f"Error closing log file: {e}")

    async def spawn_claude(
        self,
        ccresearch_id: str,
        workspace_dir: Path,
        rows: int = 24,
        cols: int = 80,
        output_callback: Optional[Callable[[bytes], Any]] = None,
        sandboxed: bool = True
    ) -> bool:
        """
        Spawn Claude Code CLI process in sandboxed workspace directory.

        Uses bubblewrap (bwrap) to create a secure sandbox that:
        - Allows read-only access to system binaries and Claude installation
        - Allows read-write access ONLY to the workspace directory
        - Blocks access to home directory, other workspaces, and codebase
        - Maintains network access for API calls

        Args:
            ccresearch_id: Session ID
            workspace_dir: Working directory for Claude
            rows: Terminal height
            cols: Terminal width
            output_callback: Async callback for output data
            sandboxed: If True, use bubblewrap sandbox (default: True)

        Returns:
            True if spawn successful
        """
        if pexpect is None:
            logger.error("pexpect not installed. Install with: pip install pexpect")
            return False

        if ccresearch_id in self.processes:
            proc = self.processes[ccresearch_id]
            if proc.process.isalive():
                logger.warning(f"Process already exists and alive for {ccresearch_id}")
                return True
            else:
                # Clean up dead process
                await self.terminate_session(ccresearch_id)

        try:
            env = os.environ.copy()
            env['TERM'] = 'xterm-256color'
            env['FORCE_COLOR'] = '1'
            env['COLORTERM'] = 'truecolor'
            # Ensure Claude Code uses the workspace directory
            env['PWD'] = str(workspace_dir)
            env['HOME'] = str(Path.home())  # Needed for Claude to find config

            # IMPORTANT: Set CLAUDE_CONFIG_DIR to session-specific .claude directory
            # This isolates each session's config, state, and locks
            session_claude_dir = workspace_dir / ".claude"
            env['CLAUDE_CONFIG_DIR'] = str(session_claude_dir)

            logger.info(f"Using isolated config: CLAUDE_CONFIG_DIR={session_claude_dir}")

            if sandboxed:
                # Use bubblewrap for secure sandboxing
                sandbox_cmd = self._build_sandbox_command(workspace_dir)
                logger.info(f"Spawning sandboxed Claude Code for {ccresearch_id}")
                logger.debug(f"Sandbox command: {' '.join(sandbox_cmd)}")

                process = pexpect.spawn(
                    sandbox_cmd[0],
                    args=sandbox_cmd[1:],
                    cwd=str(workspace_dir),
                    env=env,
                    encoding=None,
                    dimensions=(rows, cols),
                    timeout=None
                )
            else:
                # Non-sandboxed mode (for debugging only)
                logger.warning(f"Spawning UNSANDBOXED Claude Code for {ccresearch_id}")
                process = pexpect.spawn(
                    'claude',
                    args=[],
                    cwd=str(workspace_dir),
                    env=env,
                    encoding=None,
                    dimensions=(rows, cols),
                    timeout=None
                )

            # Create session log file
            log_file = self._create_session_log(ccresearch_id, workspace_dir)

            # Store process info
            self.processes[ccresearch_id] = ClaudeProcess(
                process=process,
                workspace_dir=workspace_dir,
                ccresearch_id=ccresearch_id,
                created_at=datetime.utcnow(),
                log_file=log_file
            )

            # Start async read task if callback provided
            if output_callback:
                self.processes[ccresearch_id].read_task = asyncio.create_task(
                    self._async_read_loop(ccresearch_id, output_callback)
                )

            logger.info(f"Spawned Claude Code for {ccresearch_id}, PID: {process.pid}, Sandboxed: {sandboxed}")
            return True

        except FileNotFoundError as e:
            logger.error(f"Required binary not found: {e}. Ensure 'claude' and 'bwrap' are in PATH")
            return False
        except Exception as e:
            logger.error(f"Failed to spawn Claude Code: {e}")
            return False

    async def _async_read_loop(
        self,
        ccresearch_id: str,
        callback: Callable[[bytes], Any]
    ):
        """Async loop reading from pexpect process and calling callback with output"""
        process_info = self.processes.get(ccresearch_id)
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
                        # Log terminal output
                        self._log_output(process_info, data)
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
                logger.info(f"Read task cancelled for {ccresearch_id}")
                break
            except Exception as e:
                logger.error(f"Read error for {ccresearch_id}: {e}")
                await asyncio.sleep(0.1)  # Prevent tight loop on error

    def _read_nonblocking(self, process: Any, size: int = 4096) -> bytes:
        """Non-blocking read from pexpect process"""
        try:
            return process.read_nonblocking(size, timeout=0.1)
        except pexpect.TIMEOUT:
            return b''
        except pexpect.EOF:
            raise

    async def write_input(self, ccresearch_id: str, data: bytes) -> bool:
        """
        Write user input to Claude process

        Args:
            ccresearch_id: Session ID
            data: Raw bytes to send to process stdin

        Returns:
            True if write successful
        """
        process_info = self.processes.get(ccresearch_id)
        if not process_info:
            logger.warning(f"No process found for {ccresearch_id}")
            return False

        if not process_info.process.isalive():
            logger.warning(f"Process not alive for {ccresearch_id}")
            return False

        try:
            # Log input before sending
            self._log_input(process_info, data)
            process_info.process.send(data)
            return True
        except Exception as e:
            logger.error(f"Write error for {ccresearch_id}: {e}")
            return False

    async def resize_terminal(self, ccresearch_id: str, rows: int, cols: int) -> bool:
        """
        Resize PTY dimensions

        Args:
            ccresearch_id: Session ID
            rows: New terminal height
            cols: New terminal width

        Returns:
            True if resize successful
        """
        process_info = self.processes.get(ccresearch_id)
        if not process_info:
            return False

        if not process_info.process.isalive():
            return False

        try:
            process_info.process.setwinsize(rows, cols)
            logger.debug(f"Resized terminal for {ccresearch_id}: {rows}x{cols}")
            return True
        except Exception as e:
            logger.error(f"Resize error for {ccresearch_id}: {e}")
            return False

    def is_process_alive(self, ccresearch_id: str) -> bool:
        """Check if process is still running"""
        process_info = self.processes.get(ccresearch_id)
        if not process_info:
            return False
        return process_info.process.isalive()

    async def terminate_session(self, ccresearch_id: str) -> bool:
        """
        Terminate Claude process and cleanup

        Args:
            ccresearch_id: Session ID

        Returns:
            True if termination successful
        """
        process_info = self.processes.pop(ccresearch_id, None)
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

            # Close session log file (log is preserved in LOGS_DIR)
            self._close_session_log(process_info)

            # Terminate process
            if process_info.process.isalive():
                process_info.process.terminate(force=True)

            logger.info(f"Terminated session {ccresearch_id}")
            return True

        except Exception as e:
            logger.error(f"Termination error for {ccresearch_id}: {e}")
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

        Before copying, updates CLAUDE.md with session context so Claude
        can resume work when the project is restored later.

        Args:
            workspace_dir: Source workspace path
            project_name: Name for the saved project (sanitized)
            description: Session context/notes from user

        Returns:
            Path to saved project, or None on failure
        """
        # Sanitize project name
        safe_name = "".join(c for c in project_name if c.isalnum() or c in "-_ ").strip()
        if not safe_name:
            safe_name = f"project_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"

        project_path = self.PROJECTS_DIR / safe_name

        try:
            # Update CLAUDE.md with session context BEFORE copying
            if description:
                self._update_claude_md_with_context(workspace_dir, safe_name, description)

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

    def _update_claude_md_with_context(
        self,
        workspace_dir: Path,
        project_name: str,
        context: str
    ):
        """
        Update CLAUDE.md with session context for project resumption.

        Appends a "Session Context" section to CLAUDE.md so Claude knows
        what the user was working on when the project is restored.

        Args:
            workspace_dir: Workspace directory
            project_name: Name of the saved project
            context: User-provided session context/notes
        """
        claude_md_path = workspace_dir / "CLAUDE.md"

        session_context_section = f"""

---

## 📋 SAVED SESSION CONTEXT

**Project Name:** {project_name}
**Saved At:** {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}

### User Notes (IMPORTANT - Read this first!)

{context}

---

**RESUME INSTRUCTIONS:** When this project is restored, read the user notes above
to understand what was being worked on. Continue from where the user left off,
following their stated goals and next steps.
"""

        try:
            if claude_md_path.exists():
                # Append to existing CLAUDE.md
                existing_content = claude_md_path.read_text()

                # Remove any previous session context section (to avoid duplicates)
                marker = "## 📋 SAVED SESSION CONTEXT"
                if marker in existing_content:
                    # Find and remove old context section
                    idx = existing_content.find(marker)
                    # Find the separator before the section
                    sep_idx = existing_content.rfind("---", 0, idx)
                    if sep_idx > 0:
                        existing_content = existing_content[:sep_idx].rstrip()

                # Append new context
                claude_md_path.write_text(existing_content + session_context_section)
            else:
                # Create new CLAUDE.md with just the context
                claude_md_path.write_text(f"# Project: {project_name}\n" + session_context_section)

            logger.info(f"Updated CLAUDE.md with session context for {project_name}")

        except Exception as e:
            logger.warning(f"Failed to update CLAUDE.md: {e}")

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

    def restore_project(self, project_name: str, ccresearch_id: str) -> Optional[Path]:
        """
        Restore a saved project to a new workspace.

        Args:
            project_name: Name of saved project
            ccresearch_id: New session ID

        Returns:
            Path to new workspace, or None on failure
        """
        project_path = self.PROJECTS_DIR / project_name

        if not project_path.exists():
            logger.error(f"Project '{project_name}' not found")
            return None

        try:
            # Create new workspace
            workspace = self.BASE_DIR / ccresearch_id

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
                    session_id=ccresearch_id,
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
ccresearch_manager = CCResearchManager()

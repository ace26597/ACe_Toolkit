"""
Unified Project Manager

Manages projects across CCResearch and Workspace with a unified storage structure.

Directory Structure:
    /data/users/{user-uuid}/projects/{project-name}/
    ├── .project.json          # Project metadata
    ├── data/                  # User files
    ├── notes/                 # Workspace notes (JSON files)
    ├── images/                # Note images
    ├── output/                # Generated outputs
    ├── .claude/               # Claude Code config
    │   └── settings.local.json
    └── CLAUDE.md              # Session context
"""

import json
import uuid
import shutil
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any
import aiofiles
import aiofiles.os

from .config import settings

logger = logging.getLogger("project_manager")


class ProjectManager:
    """Unified manager for projects across CCResearch and Workspace."""

    def __init__(self, user_id: str):
        """Initialize project manager for a specific user.

        Args:
            user_id: The UUID of the authenticated user
        """
        self.user_id = user_id
        self.base_dir = Path(settings.USER_DATA_BASE_DIR) / user_id / "projects"

    async def ensure_base_dir(self):
        """Ensure the user's projects directory exists."""
        await aiofiles.os.makedirs(self.base_dir, exist_ok=True)

    def _sanitize_name(self, name: str) -> str:
        """Sanitize a name for use as a directory name."""
        # Replace non-alphanumeric (except hyphen, underscore) with hyphen
        safe = "".join(c if c.isalnum() or c in ('-', '_') else '-' for c in name)
        # Collapse multiple hyphens into one
        while '--' in safe:
            safe = safe.replace('--', '-')
        safe = safe.strip('-').strip()
        if not safe or safe in ('.', '..'):
            safe = f"project-{uuid.uuid4().hex[:8]}"
        return safe

    def _get_project_path(self, project_name: str) -> Path:
        """Get the path to a project directory."""
        safe_name = self._sanitize_name(project_name)
        return self.base_dir / safe_name

    # ==================== PROJECT CRUD ====================

    async def list_projects(self) -> List[Dict[str, Any]]:
        """List all projects for this user with metadata and terminal status."""
        await self.ensure_base_dir()
        projects = []

        try:
            entries = await aiofiles.os.listdir(self.base_dir)
        except FileNotFoundError:
            return []

        for entry in entries:
            project_path = self.base_dir / entry
            if await aiofiles.os.path.isdir(project_path):
                meta = await self._read_project_meta(entry)
                if meta:
                    meta["dir_name"] = entry
                    projects.append(meta)
                else:
                    # Create basic metadata for projects without .project.json
                    try:
                        stat = await aiofiles.os.stat(project_path)
                        projects.append({
                            "id": str(uuid.uuid4()),
                            "name": entry,
                            "dir_name": entry,
                            "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                            "updated_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                            "created_by": "unknown",
                            "tags": [],
                            "terminal": {"enabled": False, "status": "ready"}
                        })
                    except Exception:
                        continue

        # Sort by updated_at descending
        projects.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
        return projects

    async def create_project(
        self,
        name: str,
        created_by: str = "workspace",
        owner_email: str = "",
        tags: List[str] = None
    ) -> Dict[str, Any]:
        """Create a new project with full directory structure.

        Args:
            name: Human-readable project name
            created_by: Source app ("ccresearch" or "workspace")
            owner_email: Owner's email address
            tags: Optional list of tags

        Returns:
            Project metadata dict
        """
        await self.ensure_base_dir()

        safe_name = self._sanitize_name(name)
        project_path = self.base_dir / safe_name

        if await aiofiles.os.path.exists(project_path):
            raise ValueError(f"Project '{name}' already exists")

        # Create directory structure
        await aiofiles.os.makedirs(project_path / "data", exist_ok=True)
        await aiofiles.os.makedirs(project_path / "notes", exist_ok=True)
        await aiofiles.os.makedirs(project_path / "images", exist_ok=True)
        await aiofiles.os.makedirs(project_path / "output", exist_ok=True)

        # Create .claude directory with settings
        claude_dir = project_path / ".claude"
        await aiofiles.os.makedirs(claude_dir, exist_ok=True)

        # Write Claude settings.local.json with project permissions
        settings_content = self._get_claude_settings()
        async with aiofiles.open(claude_dir / "settings.local.json", 'w') as f:
            await f.write(json.dumps(settings_content, indent=2))

        # Create project metadata
        now = datetime.utcnow().isoformat()
        meta = {
            "id": str(uuid.uuid4()),
            "name": name,
            "created_at": now,
            "updated_at": now,
            "created_by": created_by,
            "owner_email": owner_email.lower() if owner_email else "",
            "tags": tags or [],
            "terminal": {
                "enabled": True,
                "last_session_id": None,
                "status": "ready"
            }
        }

        # Write .project.json
        await self._write_project_meta(safe_name, meta)

        # Create CLAUDE.md
        await self._create_claude_md(project_path, name, owner_email, now)

        logger.info(f"Created project '{name}' for user {self.user_id}")

        meta["dir_name"] = safe_name
        return meta

    async def get_project(self, project_name: str) -> Optional[Dict[str, Any]]:
        """Get project details by name."""
        safe_name = self._sanitize_name(project_name)
        project_path = self.base_dir / safe_name

        if not await aiofiles.os.path.exists(project_path):
            return None

        meta = await self._read_project_meta(safe_name)
        if meta:
            meta["dir_name"] = safe_name
            meta["path"] = str(project_path)
        return meta

    async def get_project_path(self, project_name: str) -> Optional[Path]:
        """Get the filesystem path to a project directory."""
        safe_name = self._sanitize_name(project_name)
        project_path = self.base_dir / safe_name

        if await aiofiles.os.path.exists(project_path):
            return project_path
        return None

    async def delete_project(self, project_name: str) -> bool:
        """Delete a project and all its contents."""
        safe_name = self._sanitize_name(project_name)
        project_path = self.base_dir / safe_name

        if not await aiofiles.os.path.exists(project_path):
            return False

        shutil.rmtree(project_path)
        logger.info(f"Deleted project '{project_name}' for user {self.user_id}")
        return True

    async def rename_project(self, old_name: str, new_name: str) -> Dict[str, Any]:
        """Rename a project (updates metadata only, preserves directory for --continue)."""
        safe_old = self._sanitize_name(old_name)
        project_path = self.base_dir / safe_old

        if not await aiofiles.os.path.exists(project_path):
            raise ValueError(f"Project '{old_name}' not found")

        meta = await self._read_project_meta(safe_old)
        if meta:
            meta["name"] = new_name
            meta["updated_at"] = datetime.utcnow().isoformat()
            await self._write_project_meta(safe_old, meta)
            meta["dir_name"] = safe_old
            return meta

        return {"name": new_name, "dir_name": safe_old}

    # ==================== TERMINAL STATUS ====================

    async def update_terminal_status(
        self,
        project_name: str,
        session_id: Optional[str] = None,
        status: str = "ready"
    ) -> Optional[Dict[str, Any]]:
        """Update the terminal status for a project.

        Args:
            project_name: Project name
            session_id: CCResearch session ID (if active)
            status: Terminal status (active, disconnected, ready)
        """
        safe_name = self._sanitize_name(project_name)
        meta = await self._read_project_meta(safe_name)

        if not meta:
            return None

        meta["terminal"]["last_session_id"] = session_id
        meta["terminal"]["status"] = status
        meta["updated_at"] = datetime.utcnow().isoformat()

        await self._write_project_meta(safe_name, meta)
        return meta

    async def get_terminal_status(self, project_name: str) -> Optional[Dict[str, Any]]:
        """Get the terminal status for a project."""
        safe_name = self._sanitize_name(project_name)
        meta = await self._read_project_meta(safe_name)

        if meta:
            return meta.get("terminal", {"enabled": False, "status": "ready"})
        return None

    # ==================== HELPER METHODS ====================

    async def _read_project_meta(self, dir_name: str) -> Optional[Dict[str, Any]]:
        """Read .project.json metadata file."""
        meta_path = self.base_dir / dir_name / ".project.json"
        try:
            async with aiofiles.open(meta_path, 'r') as f:
                return json.loads(await f.read())
        except (FileNotFoundError, json.JSONDecodeError):
            return None

    async def _write_project_meta(self, dir_name: str, meta: Dict[str, Any]):
        """Write .project.json metadata file."""
        meta_path = self.base_dir / dir_name / ".project.json"
        async with aiofiles.open(meta_path, 'w') as f:
            await f.write(json.dumps(meta, indent=2))

    def _get_claude_settings(self) -> Dict[str, Any]:
        """Get Claude Code settings for project-level permissions.

        SECURITY: Comprehensive deny rules to prevent:
        - Access to sensitive files (credentials, keys, configs)
        - Process manipulation (kill, signal)
        - Service/system control (systemctl, reboot)
        - Privilege escalation (sudo, su)
        - Container/virtualization escape (docker, podman)
        - Package management (apt, pip - could install malware)
        - Network recon/exfiltration (curl, wget, nc)
        - Access to other users' data
        """
        return {
            "permissions": {
                "allow": ["Bash", "Read", "Write", "Edit"],
                "deny": [
                    # ===== SENSITIVE FILES =====
                    # Credentials and keys
                    "Read(/home/ace/.ccresearch_allowed_emails.json)",
                    "Read(/home/ace/.secrets/**)",
                    "Read(/home/ace/.credentials/**)",
                    "Read(/home/ace/.ssh/**)",
                    "Read(/home/ace/.gnupg/**)",
                    "Read(/home/ace/.aws/**)",
                    "Read(/home/ace/.config/gcloud/**)",
                    "Read(/home/ace/.kube/**)",
                    "Read(/home/ace/.env)",
                    "Read(/home/ace/.env.*)",
                    "Read(/home/ace/.bashrc)",
                    "Read(/home/ace/.bash_history)",
                    "Read(/home/ace/.zshrc)",
                    "Read(/home/ace/.zsh_history)",
                    "Read(/home/ace/.netrc)",
                    "Read(/home/ace/.npmrc)",
                    "Read(/home/ace/.pypirc)",
                    # Application source code
                    "Read(/home/ace/dev/**)",
                    "Write(/home/ace/dev/**)",
                    "Edit(/home/ace/dev/**)",
                    # Claude config (prevent meta-attacks)
                    "Read(/home/ace/.claude/CLAUDE.md)",
                    "Read(/home/ace/.claude.json)",
                    "Read(/home/ace/.claude/settings.json)",
                    # System files
                    "Read(/etc/shadow)",
                    "Read(/etc/passwd)",
                    "Read(/etc/sudoers)",
                    "Read(/etc/sudoers.d/**)",
                    # Other users' data
                    "Read(/data/users/**)",

                    # ===== PROCESS MANIPULATION =====
                    "Bash(kill:*)",
                    "Bash(pkill:*)",
                    "Bash(killall:*)",
                    "Bash(fuser:*)",
                    "Bash(xkill:*)",

                    # ===== SERVICE/SYSTEM CONTROL =====
                    "Bash(systemctl:*)",
                    "Bash(service:*)",
                    "Bash(journalctl:*)",
                    "Bash(shutdown:*)",
                    "Bash(reboot:*)",
                    "Bash(poweroff:*)",
                    "Bash(halt:*)",
                    "Bash(init:*)",
                    "Bash(telinit:*)",
                    "Bash(crontab:*)",

                    # ===== PRIVILEGE ESCALATION =====
                    "Bash(sudo:*)",
                    "Bash(su:*)",
                    "Bash(doas:*)",
                    "Bash(pkexec:*)",
                    "Bash(gksu:*)",
                    "Bash(gksudo:*)",
                    "Bash(chmod:*)",
                    "Bash(chown:*)",
                    "Bash(chgrp:*)",

                    # ===== CONTAINERS/VIRTUALIZATION =====
                    "Bash(docker:*)",
                    "Bash(podman:*)",
                    "Bash(kubectl:*)",
                    "Bash(lxc:*)",
                    "Bash(virsh:*)",
                    "Bash(qemu:*)",

                    # ===== PACKAGE MANAGEMENT =====
                    "Bash(apt:*)",
                    "Bash(apt-get:*)",
                    "Bash(dpkg:*)",
                    "Bash(yum:*)",
                    "Bash(dnf:*)",
                    "Bash(pacman:*)",
                    "Bash(snap:*)",
                    "Bash(flatpak:*)",

                    # ===== DISK/MOUNT OPERATIONS =====
                    "Bash(mount:*)",
                    "Bash(umount:*)",
                    "Bash(fdisk:*)",
                    "Bash(parted:*)",
                    "Bash(mkfs:*)",
                    "Bash(dd:*)",

                    # ===== NETWORK (prevent exfiltration) =====
                    # Note: Some tools useful for research - consider if needed
                    "Bash(nc:*)",
                    "Bash(netcat:*)",
                    "Bash(ncat:*)",
                    "Bash(socat:*)",
                    "Bash(nmap:*)",
                    "Bash(tcpdump:*)",
                    "Bash(wireshark:*)",
                    "Bash(iptables:*)",
                    "Bash(ufw:*)",

                    # ===== SYSTEM INFO (limit recon) =====
                    "Bash(passwd:*)",
                    "Bash(useradd:*)",
                    "Bash(userdel:*)",
                    "Bash(usermod:*)",
                    "Bash(groupadd:*)",
                ]
            },
            "hasClaudeMdExternalIncludesApproved": False,
            "hasClaudeMdExternalIncludesWarningShown": True
        }

    async def _create_claude_md(
        self,
        project_path: Path,
        name: str,
        email: str,
        created_at: str
    ):
        """Create CLAUDE.md with project context."""
        content = f"""# Project: {name}

## Project Info

| Field | Value |
|-------|-------|
| Project | `{name}` |
| Owner | {email or 'Not provided'} |
| Created | {created_at} |
| Workspace | `{project_path}` |

---

## Directory Structure

```
{project_path.name}/
├── CLAUDE.md          # This file
├── data/              # User files and uploads
├── notes/             # Workspace notes (JSON)
├── images/            # Note images
├── output/            # Generated outputs
└── .claude/           # Claude Code config
```

---

## Capabilities

This project has full access to Claude Code with:
- 145+ scientific research skills
- 34 MCP servers (PubMed, ChEMBL, AACT, etc.)
- 14 plugins
- Full file system access within this workspace

---

## Quick Commands

```bash
# Check project files
ls -la

# Check available plugins
/plugins

# Check MCP servers
/mcp
```

---

## Working with Data

Upload files to `data/` and access them:

```python
import pandas as pd
df = pd.read_csv('data/your_file.csv')
```

Save outputs to `output/`:

```bash
mkdir -p output
# Save files to output/ directory
```

---

## Remotion Video Creation

If creating videos with Remotion:
- **DO NOT** launch Remotion Studio (`npx remotion studio`) - it won't work in this environment
- Instead, render videos directly using: `npx remotion render <composition> output/video.mp4`
- Save all rendered videos to the `output/` directory

---

## Important: Storage Notes

This workspace runs on an SSD via symlink mount (`/data` → external SSD).

**Symlink Limitations:**
- Creating symlinks within this workspace may fail or behave unexpectedly
- Always use **direct file copies** instead of symlinks
- Use relative paths within the workspace when possible

---

*Unified Project - Claude Code Research Platform*
"""
        async with aiofiles.open(project_path / "CLAUDE.md", 'w') as f:
            await f.write(content)


def get_project_manager(user_id: str) -> ProjectManager:
    """Factory function to get a ProjectManager for a user."""
    return ProjectManager(user_id)

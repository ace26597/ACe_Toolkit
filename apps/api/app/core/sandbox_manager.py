"""
Sandbox Manager for Scientific Chat

Manages isolated working directories for each conversation with security controls:
- Creates /tmp/ace_sessions/{conversation_id}/ per conversation
- Path traversal prevention
- File size limits
- Auto-cleanup after 24 hours
"""

import logging
import shutil
import time
from pathlib import Path
from typing import Optional, List, Dict
from datetime import datetime

logger = logging.getLogger("sandbox_manager")


class SandboxManager:
    """Manages sandboxed directories for chat conversations"""

    def __init__(self, base_dir: str = "/tmp/ace_sessions"):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

        # Security limits
        self.max_file_size_mb = 100  # 100MB per file
        self.max_sandbox_size_mb = 500  # 500MB per sandbox
        self.max_age_hours = 24  # Auto-cleanup after 24 hours

        logger.info(f"SandboxManager initialized at {self.base_dir}")

    def create_sandbox(self, conversation_id: str) -> Path:
        """
        Create isolated directory for conversation

        Args:
            conversation_id: Unique conversation ID

        Returns:
            Path to created sandbox directory
        """
        sandbox = self.base_dir / conversation_id
        sandbox.mkdir(parents=True, exist_ok=True)
        logger.info(f"Created sandbox: {sandbox}")
        return sandbox

    def get_sandbox_path(self, conversation_id: str) -> Path:
        """
        Get path to conversation sandbox

        Args:
            conversation_id: Unique conversation ID

        Returns:
            Path to sandbox directory
        """
        return self.base_dir / conversation_id

    def get_file_path(self, conversation_id: str, file_path: str) -> Optional[Path]:
        """
        Get file path with security validation

        CRITICAL: Prevents path traversal attacks (../../etc/passwd)

        Args:
            conversation_id: Unique conversation ID
            file_path: Relative path within sandbox

        Returns:
            Resolved file path if valid and exists, None otherwise
        """
        sandbox = self.base_dir / conversation_id
        target = (sandbox / file_path).resolve()

        # CRITICAL: Ensure target is inside sandbox
        try:
            sandbox_resolved = sandbox.resolve()
            if not str(target).startswith(str(sandbox_resolved)):
                logger.error(f"Path traversal attempt blocked: {file_path} (target: {target})")
                return None

            if not target.exists():
                logger.warning(f"File not found: {target}")
                return None

            return target

        except Exception as e:
            logger.error(f"Path resolution error: {e}")
            return None

    def list_files(self, conversation_id: str, subpath: str = "") -> List[Dict]:
        """
        List files in sandbox directory

        Args:
            conversation_id: Unique conversation ID
            subpath: Subdirectory within sandbox (default: root)

        Returns:
            List of file info dictionaries
        """
        sandbox = self.get_sandbox_path(conversation_id)

        if not sandbox.exists():
            return []

        # Get target directory (with path traversal protection)
        if subpath:
            target_dir = self.get_file_path(conversation_id, subpath)
            if not target_dir or not target_dir.is_dir():
                return []
        else:
            target_dir = sandbox

        files = []
        try:
            for item in target_dir.iterdir():
                stat = item.stat()
                files.append({
                    "name": item.name,
                    "path": str(item.relative_to(sandbox)),
                    "size": stat.st_size,
                    "is_dir": item.is_dir(),
                    "modified_at": datetime.fromtimestamp(stat.st_mtime).isoformat()
                })

            # Sort: directories first, then by name
            files.sort(key=lambda x: (not x["is_dir"], x["name"]))

        except Exception as e:
            logger.error(f"Error listing files: {e}")
            return []

        return files

    def get_sandbox_size(self, conversation_id: str) -> int:
        """
        Calculate total size of sandbox in bytes

        Args:
            conversation_id: Unique conversation ID

        Returns:
            Total size in bytes
        """
        sandbox = self.get_sandbox_path(conversation_id)

        if not sandbox.exists():
            return 0

        total_size = 0
        try:
            for item in sandbox.rglob("*"):
                if item.is_file():
                    total_size += item.stat().st_size
        except Exception as e:
            logger.error(f"Error calculating sandbox size: {e}")

        return total_size

    def check_file_size(self, file_path: Path) -> bool:
        """
        Check if file size is within limits

        Args:
            file_path: Path to file

        Returns:
            True if within limits, False otherwise
        """
        if not file_path.exists():
            return True

        size_mb = file_path.stat().st_size / (1024 * 1024)
        return size_mb <= self.max_file_size_mb

    def check_sandbox_size(self, conversation_id: str) -> bool:
        """
        Check if sandbox size is within limits

        Args:
            conversation_id: Unique conversation ID

        Returns:
            True if within limits, False otherwise
        """
        size_mb = self.get_sandbox_size(conversation_id) / (1024 * 1024)
        return size_mb <= self.max_sandbox_size_mb

    def delete_sandbox(self, conversation_id: str) -> bool:
        """
        Delete conversation sandbox and all contents

        Args:
            conversation_id: Unique conversation ID

        Returns:
            True if deleted successfully, False otherwise
        """
        sandbox = self.get_sandbox_path(conversation_id)

        if not sandbox.exists():
            logger.warning(f"Sandbox not found: {sandbox}")
            return False

        try:
            shutil.rmtree(sandbox)
            logger.info(f"Deleted sandbox: {sandbox}")
            return True
        except Exception as e:
            logger.error(f"Error deleting sandbox: {e}")
            return False

    def cleanup_old_sandboxes(self, max_age_hours: Optional[int] = None) -> int:
        """
        Delete sandboxes older than max_age_hours

        Args:
            max_age_hours: Maximum age in hours (default: use instance setting)

        Returns:
            Number of sandboxes deleted
        """
        if max_age_hours is None:
            max_age_hours = self.max_age_hours

        max_age_seconds = max_age_hours * 3600
        current_time = time.time()
        deleted_count = 0

        try:
            for sandbox_dir in self.base_dir.iterdir():
                if not sandbox_dir.is_dir():
                    continue

                # Check modification time
                mtime = sandbox_dir.stat().st_mtime
                age_seconds = current_time - mtime

                if age_seconds > max_age_seconds:
                    try:
                        shutil.rmtree(sandbox_dir)
                        logger.info(f"Cleaned up old sandbox: {sandbox_dir.name} (age: {age_seconds/3600:.1f}h)")
                        deleted_count += 1
                    except Exception as e:
                        logger.error(f"Error cleaning sandbox {sandbox_dir.name}: {e}")

        except Exception as e:
            logger.error(f"Error during cleanup: {e}")

        return deleted_count

    def write_file(self, conversation_id: str, file_path: str, content: str) -> bool:
        """
        Write content to file in sandbox (with size checks)

        Args:
            conversation_id: Unique conversation ID
            file_path: Relative path within sandbox
            content: File content

        Returns:
            True if written successfully, False otherwise
        """
        # Get sandbox path
        sandbox = self.get_sandbox_path(conversation_id)
        if not sandbox.exists():
            self.create_sandbox(conversation_id)

        # Build target path (with security validation)
        target = (sandbox / file_path).resolve()

        # Security check: ensure target is inside sandbox
        try:
            if not str(target).startswith(str(sandbox.resolve())):
                logger.error(f"Path traversal attempt blocked: {file_path}")
                return False
        except Exception as e:
            logger.error(f"Path resolution error: {e}")
            return False

        # Check sandbox size limit
        if not self.check_sandbox_size(conversation_id):
            logger.error(f"Sandbox size limit exceeded: {conversation_id}")
            return False

        try:
            # Create parent directories
            target.parent.mkdir(parents=True, exist_ok=True)

            # Write file
            target.write_text(content)

            # Check file size after writing
            if not self.check_file_size(target):
                target.unlink()  # Delete if too large
                logger.error(f"File size limit exceeded: {file_path}")
                return False

            logger.info(f"Wrote file: {target}")
            return True

        except Exception as e:
            logger.error(f"Error writing file: {e}")
            return False


# Global instance
sandbox_manager = SandboxManager()

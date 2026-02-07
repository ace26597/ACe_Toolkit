"""
File Watcher for Workspace Directories

Uses watchdog to monitor workspace directories for file changes and
pushes events through WebSocket connections for real-time UI updates.

Events are sent as JSON messages:
{
    "type": "file_change",
    "event": "created" | "modified" | "deleted" | "moved",
    "path": "relative/path/from/workspace",
    "is_directory": true | false
}

Features:
- Debounces rapid events (many writes in quick succession -> single event)
- Ignores hidden files (. prefix), caches, and system directories
- Graceful fallback if watchdog is not installed
"""

import asyncio
import logging
import time
import threading
from pathlib import Path
from typing import Optional, Callable, Any, Dict

try:
    from watchdog.observers import Observer
    from watchdog.events import (
        FileSystemEventHandler,
        FileCreatedEvent,
        FileModifiedEvent,
        FileDeletedEvent,
        FileMovedEvent,
        DirCreatedEvent,
        DirDeletedEvent,
        DirMovedEvent,
    )
    HAS_WATCHDOG = True
except ImportError:
    HAS_WATCHDOG = False

logger = logging.getLogger("file_watcher")

# Directory names to always ignore
IGNORE_DIRS = {
    ".claude",
    ".git",
    ".pip-cache",
    "__pycache__",
    "node_modules",
    ".venv",
}

# File names to always ignore
IGNORE_FILES = {
    ".DS_Store",
    ".terminal-history",
    "Thumbs.db",
}

# Debounce window in seconds - rapid events for the same path within
# this window are collapsed into a single event
DEBOUNCE_SECONDS = 0.5


class WorkspaceEventHandler(FileSystemEventHandler):
    """Handle filesystem events with debouncing and forward to async callback.

    Watchdog fires events from a background thread. This handler collects
    events with debouncing, then dispatches them to the async event loop
    via run_coroutine_threadsafe.
    """

    def __init__(
        self,
        workspace_dir: Path,
        callback: Callable[[dict], Any],
        loop: asyncio.AbstractEventLoop,
    ):
        super().__init__()
        self.workspace_dir = workspace_dir
        self.callback = callback
        self.loop = loop
        # Debounce state: path -> (event_type, is_directory, timestamp)
        self._pending: Dict[str, tuple] = {}
        self._lock = threading.Lock()
        self._debounce_timer: Optional[threading.Timer] = None

    def _should_ignore(self, path: str) -> bool:
        """Check if this path should be ignored.

        Ignores:
        - Hidden files/dirs (starting with .)
        - Known noisy directories (.git, __pycache__, node_modules)
        - Known noisy files (.DS_Store)
        """
        p = Path(path)
        for part in p.parts:
            # Ignore hidden files/directories (dot prefix)
            if part.startswith(".") and part not in (".", ".."):
                # Allow data/ and output/ inside hidden dirs? No - ignore all dot-prefixed
                if part in IGNORE_DIRS or part.startswith("."):
                    return True
            if part in IGNORE_DIRS:
                return True
        # Check filename specifically
        if p.name in IGNORE_FILES:
            return True
        return False

    def _make_relative(self, path: str) -> str:
        """Convert absolute path to relative from workspace."""
        try:
            return str(Path(path).relative_to(self.workspace_dir))
        except ValueError:
            return path

    def _queue_event(self, event_type: str, path: str, is_directory: bool):
        """Queue an event with debouncing.

        If the same path has a pending event, it's replaced (debounced).
        A timer fires after DEBOUNCE_SECONDS to flush all pending events.
        """
        rel_path = self._make_relative(path)
        if self._should_ignore(rel_path):
            return

        with self._lock:
            self._pending[rel_path] = (event_type, is_directory, time.time())

            # Reset debounce timer
            if self._debounce_timer is not None:
                self._debounce_timer.cancel()
            self._debounce_timer = threading.Timer(DEBOUNCE_SECONDS, self._flush_events)
            self._debounce_timer.daemon = True
            self._debounce_timer.start()

    def _flush_events(self):
        """Flush all pending debounced events to the async callback."""
        with self._lock:
            events = list(self._pending.items())
            self._pending.clear()
            self._debounce_timer = None

        for rel_path, (event_type, is_directory, _ts) in events:
            event_data = {
                "type": "file_change",
                "event": event_type,
                "path": rel_path,
                "is_directory": is_directory,
            }
            try:
                asyncio.run_coroutine_threadsafe(
                    self._async_callback(event_data), self.loop
                )
            except Exception as e:
                logger.debug(f"Failed to send file event: {e}")

    async def _async_callback(self, event_data: dict):
        """Wrapper to call the async callback."""
        try:
            result = self.callback(event_data)
            if asyncio.iscoroutine(result):
                await result
        except Exception as e:
            logger.debug(f"File watcher callback error: {e}")

    def on_created(self, event):
        is_dir = isinstance(event, DirCreatedEvent)
        self._queue_event("created", event.src_path, is_dir)

    def on_modified(self, event):
        # Skip directory modifications (too noisy)
        if isinstance(event, FileModifiedEvent):
            self._queue_event("modified", event.src_path, False)

    def on_deleted(self, event):
        is_dir = isinstance(event, DirDeletedEvent)
        self._queue_event("deleted", event.src_path, is_dir)

    def on_moved(self, event):
        is_dir = isinstance(event, DirMovedEvent)
        self._queue_event("moved", event.dest_path, is_dir)

    def cancel_timer(self):
        """Cancel any pending debounce timer (for cleanup)."""
        with self._lock:
            if self._debounce_timer is not None:
                self._debounce_timer.cancel()
                self._debounce_timer = None


class FileWatcher:
    """Manages file watching for workspace directories.

    Each active session can have one watcher. Watchers are started
    when a WebSocket connects and stopped on disconnect.
    """

    def __init__(self):
        self._watchers: Dict[str, tuple] = {}  # session_id -> (observer, handler)

    def start(
        self,
        session_id: str,
        workspace_dir: Path,
        callback: Callable[[dict], Any],
        loop: Optional[asyncio.AbstractEventLoop] = None,
    ) -> bool:
        """Start watching a workspace directory.

        Args:
            session_id: Session ID (used as watcher key)
            workspace_dir: Directory to watch
            callback: Async callback for file change events
            loop: Event loop (defaults to running loop)

        Returns:
            True if watcher started successfully
        """
        if not HAS_WATCHDOG:
            logger.warning("watchdog not installed, file watching disabled")
            return False

        # Stop existing watcher for this session
        self.stop(session_id)

        if loop is None:
            try:
                loop = asyncio.get_running_loop()
            except RuntimeError:
                logger.error("No running event loop for file watcher")
                return False

        try:
            handler = WorkspaceEventHandler(workspace_dir, callback, loop)
            observer = Observer()
            observer.schedule(handler, str(workspace_dir), recursive=True)
            observer.daemon = True
            observer.start()

            self._watchers[session_id] = (observer, handler)
            logger.info(f"File watcher started for session {session_id}: {workspace_dir}")
            return True
        except Exception as e:
            logger.error(f"Failed to start file watcher: {e}")
            return False

    def stop(self, session_id: str):
        """Stop watching for a session.

        Args:
            session_id: Session ID
        """
        entry = self._watchers.pop(session_id, None)
        if entry:
            observer, handler = entry
            try:
                handler.cancel_timer()
                observer.stop()
                observer.join(timeout=2)
                logger.info(f"File watcher stopped for session {session_id}")
            except Exception as e:
                logger.error(f"Error stopping file watcher: {e}")

    def stop_all(self):
        """Stop all watchers."""
        for session_id in list(self._watchers.keys()):
            self.stop(session_id)

    def is_watching(self, session_id: str) -> bool:
        """Check if a session has an active watcher."""
        entry = self._watchers.get(session_id)
        if entry:
            observer, _ = entry
            return observer.is_alive()
        return False


# Global instance
file_watcher = FileWatcher()

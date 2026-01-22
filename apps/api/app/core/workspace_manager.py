"""
Workspace Manager - Handles SSD directory operations for the Workspace app.

Manages:
- Project directories under /data/workspace/{project-name}/
- Notes stored as JSON files in notes/
- Images embedded in notes stored in images/
- User data files (NAS) stored in data/
"""

import os
import json
import shutil
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any
from .config import settings
import aiofiles
import aiofiles.os


class WorkspaceManager:
    """Manager for workspace projects, notes, images, and data files."""

    def __init__(self, base_dir: Path = None):
        """Initialize workspace manager.

        Args:
            base_dir: Base directory for workspace projects.
                      If None, uses the global WORKSPACE_DATA_DIR setting.
                      Pass a user-specific directory for per-user isolation.
        """
        self.base_dir = base_dir or Path(settings.WORKSPACE_DATA_DIR)

    async def ensure_base_dir(self):
        """Ensure the base workspace directory exists."""
        await aiofiles.os.makedirs(self.base_dir, exist_ok=True)

    def _get_project_path(self, project_name: str) -> Path:
        """Get the path to a project directory."""
        # Sanitize project name to prevent path traversal
        safe_name = self._sanitize_name(project_name)
        return self.base_dir / safe_name

    def _sanitize_name(self, name: str) -> str:
        """Sanitize a name for use as a directory/file name."""
        # Remove dangerous characters
        safe = "".join(c for c in name if c.isalnum() or c in (' ', '-', '_', '.'))
        safe = safe.strip()
        # Prevent empty or dot-only names
        if not safe or safe in ('.', '..'):
            safe = f"project-{uuid.uuid4().hex[:8]}"
        return safe

    # ==================== PROJECT OPERATIONS ====================

    async def list_projects(self) -> List[Dict[str, Any]]:
        """List all projects with their metadata."""
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
                    # Calculate current counts and size dynamically
                    meta["noteCount"] = await self._count_notes(entry)
                    meta["dataSize"] = await self._calculate_data_size(entry)
                    projects.append(meta)
                else:
                    # Create meta for projects without it
                    projects.append({
                        "name": entry,
                        "createdAt": datetime.now().isoformat(),
                        "updatedAt": datetime.now().isoformat(),
                        "noteCount": await self._count_notes(entry),
                        "dataSize": await self._calculate_data_size(entry)
                    })

        # Sort by updatedAt descending
        projects.sort(key=lambda x: x.get("updatedAt", ""), reverse=True)
        return projects

    async def create_project(self, name: str) -> Dict[str, Any]:
        """Create a new project with directory structure."""
        await self.ensure_base_dir()
        project_path = self._get_project_path(name)

        if await aiofiles.os.path.exists(project_path):
            raise ValueError(f"Project '{name}' already exists")

        # Create directory structure
        await aiofiles.os.makedirs(project_path / "notes", exist_ok=True)
        await aiofiles.os.makedirs(project_path / "images", exist_ok=True)
        await aiofiles.os.makedirs(project_path / "data", exist_ok=True)

        # Create metadata
        now = datetime.now().isoformat()
        meta = {
            "name": self._sanitize_name(name),
            "createdAt": now,
            "updatedAt": now,
            "noteCount": 0,
            "dataSize": "0 B"
        }

        await self._write_project_meta(meta["name"], meta)
        return meta

    async def get_project(self, name: str) -> Optional[Dict[str, Any]]:
        """Get project details."""
        project_path = self._get_project_path(name)

        if not await aiofiles.os.path.exists(project_path):
            return None

        meta = await self._read_project_meta(name)
        if meta:
            # Update counts
            meta["noteCount"] = await self._count_notes(name)
            meta["dataSize"] = await self._calculate_data_size(name)
        return meta

    async def rename_project(self, old_name: str, new_name: str) -> Dict[str, Any]:
        """Rename a project."""
        old_path = self._get_project_path(old_name)
        new_path = self._get_project_path(new_name)

        if not await aiofiles.os.path.exists(old_path):
            raise ValueError(f"Project '{old_name}' not found")

        if await aiofiles.os.path.exists(new_path):
            raise ValueError(f"Project '{new_name}' already exists")

        # Rename directory
        await aiofiles.os.rename(old_path, new_path)

        # Update metadata
        meta = await self._read_project_meta(self._sanitize_name(new_name))
        if meta:
            meta["name"] = self._sanitize_name(new_name)
            meta["updatedAt"] = datetime.now().isoformat()
            await self._write_project_meta(self._sanitize_name(new_name), meta)

        return meta or {"name": self._sanitize_name(new_name)}

    async def delete_project(self, name: str) -> bool:
        """Delete a project and all its contents."""
        project_path = self._get_project_path(name)

        if not await aiofiles.os.path.exists(project_path):
            return False

        # Use sync shutil.rmtree (aiofiles doesn't have rmtree)
        shutil.rmtree(project_path)
        return True

    async def _read_project_meta(self, name: str) -> Optional[Dict[str, Any]]:
        """Read project metadata file."""
        meta_path = self._get_project_path(name) / ".meta.json"
        try:
            async with aiofiles.open(meta_path, 'r') as f:
                return json.loads(await f.read())
        except (FileNotFoundError, json.JSONDecodeError):
            return None

    async def _write_project_meta(self, name: str, meta: Dict[str, Any]):
        """Write project metadata file."""
        meta_path = self._get_project_path(name) / ".meta.json"
        async with aiofiles.open(meta_path, 'w') as f:
            await f.write(json.dumps(meta, indent=2))

    async def _count_notes(self, project_name: str) -> int:
        """Count all viewable files in a project (text, media, etc.).

        This counts files that appear in the Notes/Files view.
        """
        project_path = self._get_project_path(project_name)

        if not os.path.exists(project_path):
            return 0

        # Viewable file extensions (same as list_text_files)
        viewable_extensions = {
            '.md', '.mmd', '.txt', '.log', '.markdown', '.json', '.yaml', '.yml',
            '.csv', '.xml', '.html', '.css', '.js', '.ts', '.py', '.sh',
            '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.bmp',
            '.mp4', '.webm', '.ogg', '.mov', '.avi',
            '.mp3', '.wav', '.flac', '.aac',
            '.pdf'
        }

        # Folders to skip
        skip_folders = {'.git', '__pycache__', 'node_modules', '.venv', 'venv', 'notes', 'images'}

        count = 0
        for dirpath, dirnames, filenames in os.walk(project_path):
            # Skip system folders
            dirnames[:] = [d for d in dirnames if d not in skip_folders and not d.startswith('.')]

            for filename in filenames:
                # Skip hidden files
                if filename.startswith('.'):
                    continue
                ext = os.path.splitext(filename)[1].lower()
                if ext in viewable_extensions:
                    count += 1

        return count

    async def _calculate_data_size(self, project_name: str) -> str:
        """Calculate total size of all user files in the project.

        Includes all files except system folders (.git, node_modules, etc.).
        """
        project_path = self._get_project_path(project_name)

        if not os.path.exists(project_path):
            return "0 B"

        # Folders to skip in size calculation
        skip_folders = {'.git', '__pycache__', 'node_modules', '.venv', 'venv'}

        total_size = 0
        for dirpath, dirnames, filenames in os.walk(project_path):
            # Skip system folders
            dirnames[:] = [d for d in dirnames if d not in skip_folders]

            for filename in filenames:
                filepath = os.path.join(dirpath, filename)
                try:
                    total_size += os.path.getsize(filepath)
                except OSError:
                    pass

        return self._format_size(total_size)

    def _format_size(self, size_bytes: int) -> str:
        """Format bytes to human readable string."""
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size_bytes < 1024:
                return f"{size_bytes:.1f} {unit}" if size_bytes >= 10 else f"{size_bytes} {unit}"
            size_bytes /= 1024
        return f"{size_bytes:.1f} PB"

    # ==================== NOTE OPERATIONS ====================

    async def list_notes(self, project_name: str) -> List[Dict[str, Any]]:
        """List all notes in a project."""
        notes_path = self._get_project_path(project_name) / "notes"

        if not await aiofiles.os.path.exists(notes_path):
            return []

        notes = []
        entries = await aiofiles.os.listdir(notes_path)

        for entry in entries:
            if entry.endswith('.json'):
                note = await self._read_note(project_name, entry[:-5])  # Remove .json
                if note:
                    notes.append(note)

        # Sort by pinned first, then by updatedAt
        notes.sort(key=lambda x: (not x.get("pinned", False), x.get("updatedAt", "")), reverse=True)
        return notes

    async def create_note(self, project_name: str, title: str = "", content: str = "",
                          tags: List[str] = None, pinned: bool = False) -> Dict[str, Any]:
        """Create a new note."""
        notes_path = self._get_project_path(project_name) / "notes"
        await aiofiles.os.makedirs(notes_path, exist_ok=True)

        note_id = uuid.uuid4().hex
        now = datetime.now().isoformat()

        note = {
            "id": note_id,
            "title": title or "Untitled",
            "content": content,
            "pinned": pinned,
            "tags": tags or [],
            "createdAt": now,
            "updatedAt": now
        }

        await self._write_note(project_name, note_id, note)
        await self._update_project_timestamp(project_name)
        return note

    async def get_note(self, project_name: str, note_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific note."""
        return await self._read_note(project_name, note_id)

    async def update_note(self, project_name: str, note_id: str,
                          title: str = None, content: str = None,
                          tags: List[str] = None, pinned: bool = None) -> Optional[Dict[str, Any]]:
        """Update an existing note."""
        note = await self._read_note(project_name, note_id)

        if not note:
            return None

        if title is not None:
            note["title"] = title
        if content is not None:
            note["content"] = content
        if tags is not None:
            note["tags"] = tags
        if pinned is not None:
            note["pinned"] = pinned

        note["updatedAt"] = datetime.now().isoformat()

        await self._write_note(project_name, note_id, note)
        await self._update_project_timestamp(project_name)
        return note

    async def delete_note(self, project_name: str, note_id: str) -> bool:
        """Delete a note."""
        note_path = self._get_project_path(project_name) / "notes" / f"{note_id}.json"

        if not await aiofiles.os.path.exists(note_path):
            return False

        await aiofiles.os.remove(note_path)
        await self._update_project_timestamp(project_name)
        return True

    async def _read_note(self, project_name: str, note_id: str) -> Optional[Dict[str, Any]]:
        """Read a note from disk."""
        note_path = self._get_project_path(project_name) / "notes" / f"{note_id}.json"
        try:
            async with aiofiles.open(note_path, 'r') as f:
                return json.loads(await f.read())
        except (FileNotFoundError, json.JSONDecodeError):
            return None

    async def _write_note(self, project_name: str, note_id: str, note: Dict[str, Any]):
        """Write a note to disk."""
        note_path = self._get_project_path(project_name) / "notes" / f"{note_id}.json"
        async with aiofiles.open(note_path, 'w') as f:
            await f.write(json.dumps(note, indent=2))

    async def _update_project_timestamp(self, project_name: str):
        """Update project's updatedAt timestamp."""
        meta = await self._read_project_meta(project_name)
        if meta:
            meta["updatedAt"] = datetime.now().isoformat()
            meta["noteCount"] = await self._count_notes(project_name)
            await self._write_project_meta(project_name, meta)

    # ==================== IMAGE OPERATIONS ====================

    async def upload_image(self, project_name: str, file_content: bytes,
                           original_filename: str) -> Dict[str, str]:
        """Upload an image for notes."""
        images_path = self._get_project_path(project_name) / "images"
        await aiofiles.os.makedirs(images_path, exist_ok=True)

        # Generate unique filename with extension
        ext = Path(original_filename).suffix.lower() or '.png'
        if ext not in ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']:
            ext = '.png'
        image_id = uuid.uuid4().hex
        filename = f"{image_id}{ext}"

        image_path = images_path / filename
        async with aiofiles.open(image_path, 'wb') as f:
            await f.write(file_content)

        return {
            "filename": filename,
            "url": f"/workspace/projects/{project_name}/images/{filename}",
            "markdown": f"![{original_filename}](/workspace/projects/{project_name}/images/{filename})"
        }

    async def get_image_path(self, project_name: str, filename: str) -> Optional[Path]:
        """Get the filesystem path to an image."""
        # Sanitize filename to prevent path traversal
        safe_filename = Path(filename).name
        image_path = self._get_project_path(project_name) / "images" / safe_filename

        if await aiofiles.os.path.exists(image_path):
            return image_path
        return None

    async def delete_image(self, project_name: str, filename: str) -> bool:
        """Delete an image."""
        image_path = await self.get_image_path(project_name, filename)

        if image_path:
            await aiofiles.os.remove(image_path)
            return True
        return False

    # ==================== DATA (NAS) OPERATIONS ====================

    async def list_data(self, project_name: str, subpath: str = "") -> List[Dict[str, Any]]:
        """List files and folders in the project directory.

        Shows all project contents including data/, research/, etc.
        Hides system files (.meta.json) and internal folders (notes/, images/).
        """
        # Start from project root, not just data/
        project_path = self._get_project_path(project_name)

        if subpath:
            # Sanitize subpath to prevent path traversal
            safe_subpath = self._sanitize_path(subpath)
            browse_path = project_path / safe_subpath
        else:
            browse_path = project_path

        if not await aiofiles.os.path.exists(browse_path):
            return []

        if not await aiofiles.os.path.isdir(browse_path):
            return []

        # Files/folders to hide at the project root level
        hidden_at_root = {'.meta.json', 'notes', 'images'}

        entries = []
        for entry in await aiofiles.os.listdir(browse_path):
            # Skip hidden/system entries at root level
            if not subpath and entry in hidden_at_root:
                continue

            # Skip hidden files (starting with .)
            if entry.startswith('.'):
                continue

            entry_path = browse_path / entry
            try:
                stat = await aiofiles.os.stat(entry_path)
            except (FileNotFoundError, PermissionError):
                continue

            is_dir = await aiofiles.os.path.isdir(entry_path)

            entries.append({
                "name": entry,
                "path": str(Path(subpath) / entry) if subpath else entry,
                "type": "folder" if is_dir else "file",
                "size": stat.st_size if not is_dir else None,
                "sizeFormatted": self._format_size(stat.st_size) if not is_dir else None,
                "modifiedAt": datetime.fromtimestamp(stat.st_mtime).isoformat()
            })

        # Sort: folders first, then by name
        entries.sort(key=lambda x: (x["type"] != "folder", x["name"].lower()))
        return entries

    async def list_text_files(self, project_name: str) -> List[Dict[str, Any]]:
        """Recursively scan project for all viewable files (for Notes view).

        Returns text files (.md, .mmd, .txt, .log, .json, .yaml, .yml, etc.)
        and media files (.png, .jpg, .mp4, .webm, etc.)
        sorted by modified time (most recent first).
        """
        project_path = self._get_project_path(project_name)

        if not await aiofiles.os.path.exists(project_path):
            return []

        # Text file extensions
        text_extensions = {'.md', '.mmd', '.txt', '.log', '.markdown', '.json', '.yaml', '.yml', '.csv', '.xml', '.html', '.css', '.js', '.ts', '.py', '.sh'}

        # Image extensions
        image_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.bmp'}

        # Video extensions
        video_extensions = {'.mp4', '.webm', '.ogg', '.mov', '.avi'}

        # Audio extensions
        audio_extensions = {'.mp3', '.wav', '.ogg', '.flac', '.aac'}

        # PDF
        pdf_extensions = {'.pdf'}

        # All viewable extensions
        viewable_extensions = text_extensions | image_extensions | video_extensions | audio_extensions | pdf_extensions

        # Folders to skip (internal system folders)
        skip_folders = {'.git', '__pycache__', 'node_modules', '.venv', 'venv'}

        entries = []

        async def scan_dir(dir_path: Path, rel_prefix: str = ""):
            """Recursively scan directory for text files."""
            try:
                items = await aiofiles.os.listdir(dir_path)
            except (PermissionError, FileNotFoundError):
                return

            for item in items:
                # Skip hidden files and system folders
                if item.startswith('.'):
                    continue

                item_path = dir_path / item
                rel_path = f"{rel_prefix}/{item}" if rel_prefix else item

                try:
                    is_dir = await aiofiles.os.path.isdir(item_path)
                except (PermissionError, FileNotFoundError):
                    continue

                if is_dir:
                    # Skip system folders but recurse into others
                    if item not in skip_folders:
                        await scan_dir(item_path, rel_path)
                else:
                    # Check if it's a viewable file (text, image, video, audio, pdf)
                    ext = Path(item).suffix.lower()
                    if ext in viewable_extensions:
                        try:
                            stat = await aiofiles.os.stat(item_path)
                            entries.append({
                                "name": item,
                                "path": rel_path,
                                "type": "file",
                                "size": stat.st_size,
                                "sizeFormatted": self._format_size(stat.st_size),
                                "modifiedAt": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                                "extension": ext
                            })
                        except (PermissionError, FileNotFoundError):
                            continue

        await scan_dir(project_path)

        # Sort by modified time descending (most recent first)
        entries.sort(key=lambda x: x["modifiedAt"], reverse=True)
        return entries

    def _sanitize_path(self, path: str) -> str:
        """Sanitize a path to prevent path traversal attacks."""
        # Normalize and remove any attempts to go up directories
        parts = Path(path).parts
        safe_parts = [p for p in parts if p not in ('.', '..')]
        return str(Path(*safe_parts)) if safe_parts else ""

    async def upload_data(self, project_name: str, file_content: bytes,
                          filename: str, subpath: str = "") -> Dict[str, Any]:
        """Upload a file to the data directory.

        If the file is .md or .mmd, automatically creates a note from its content.
        """
        data_path = self._get_project_path(project_name) / "data"

        if subpath:
            safe_subpath = self._sanitize_path(subpath)
            data_path = data_path / safe_subpath

        await aiofiles.os.makedirs(data_path, exist_ok=True)

        # Sanitize filename
        safe_filename = Path(filename).name
        file_path = data_path / safe_filename

        # Handle name conflicts
        counter = 1
        while await aiofiles.os.path.exists(file_path):
            stem = Path(safe_filename).stem
            suffix = Path(safe_filename).suffix
            safe_filename = f"{stem}_{counter}{suffix}"
            file_path = data_path / safe_filename
            counter += 1

        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(file_content)

        result = {
            "name": safe_filename,
            "path": str(Path(subpath) / safe_filename) if subpath else safe_filename,
            "size": len(file_content),
            "sizeFormatted": self._format_size(len(file_content))
        }

        # Auto-create note from .md or .mmd files
        ext = Path(safe_filename).suffix.lower()
        if ext in ['.md', '.mmd']:
            note = await self.create_note_from_file(project_name, file_content, safe_filename)
            if note:
                result["noteCreated"] = True
                result["noteId"] = note["id"]
                result["noteTitle"] = note["title"]

        return result

    async def create_note_from_file(self, project_name: str, file_content: bytes,
                                     filename: str) -> Optional[Dict[str, Any]]:
        """Create a note from an uploaded markdown/mmd file.

        Args:
            project_name: The project to add the note to
            file_content: The file content as bytes
            filename: Original filename (used to derive title)

        Returns:
            The created note, or None if creation failed
        """
        try:
            # Decode content (try UTF-8, fallback to latin-1)
            try:
                content = file_content.decode('utf-8')
            except UnicodeDecodeError:
                content = file_content.decode('latin-1')

            # Derive title from filename (remove extension)
            title = Path(filename).stem

            # Clean up title (replace underscores/dashes with spaces, title case)
            title = title.replace('_', ' ').replace('-', ' ')
            title = ' '.join(word.capitalize() for word in title.split())

            # Check if a note with this title already exists to avoid duplicates
            existing_notes = await self.list_notes(project_name)
            for note in existing_notes:
                if note.get("title", "").lower() == title.lower():
                    # Update existing note instead of creating duplicate
                    return await self.update_note(
                        project_name,
                        note["id"],
                        content=content
                    )

            # Create new note with tag indicating source
            return await self.create_note(
                project_name=project_name,
                title=title,
                content=content,
                tags=["imported", Path(filename).suffix.lower().lstrip('.')],
                pinned=False
            )

        except Exception as e:
            # Log but don't fail the upload
            import logging
            logging.getLogger("workspace").warning(f"Failed to create note from {filename}: {e}")
            return None

    async def create_folder(self, project_name: str, folder_path: str) -> Dict[str, Any]:
        """Create a new folder in the data directory (for uploads)."""
        # New folders are created in data/ subdirectory
        project_path = self._get_project_path(project_name)
        safe_path = self._sanitize_path(folder_path)

        # If path starts with data/, use it directly; otherwise prepend data/
        if not safe_path.startswith('data'):
            new_folder_path = project_path / "data" / safe_path
        else:
            new_folder_path = project_path / safe_path

        if await aiofiles.os.path.exists(new_folder_path):
            raise ValueError(f"Folder '{folder_path}' already exists")

        await aiofiles.os.makedirs(new_folder_path, exist_ok=True)

        return {
            "name": Path(safe_path).name,
            "path": safe_path,
            "type": "folder"
        }

    async def get_data_path(self, project_name: str, file_path: str) -> Optional[Path]:
        """Get the filesystem path to a file in the project."""
        project_path = self._get_project_path(project_name)
        safe_path = self._sanitize_path(file_path)
        full_path = project_path / safe_path

        if await aiofiles.os.path.exists(full_path):
            return full_path
        return None

    async def delete_data(self, project_name: str, file_path: str) -> bool:
        """Delete a file or folder from the project.

        Protects system folders (notes/, images/) from deletion.
        """
        # Protected folders that cannot be deleted
        protected_roots = {'notes', 'images', '.meta.json'}

        safe_path = self._sanitize_path(file_path)

        # Check if trying to delete a protected folder at root
        path_parts = Path(safe_path).parts
        if path_parts and path_parts[0] in protected_roots:
            return False  # Don't allow deleting protected folders

        project_path = self._get_project_path(project_name)
        full_path = project_path / safe_path

        if not await aiofiles.os.path.exists(full_path):
            return False

        if await aiofiles.os.path.isdir(full_path):
            shutil.rmtree(full_path)
        else:
            await aiofiles.os.remove(full_path)

        return True

    async def create_zip(self, project_name: str, folder_path: str = "") -> Path:
        """Create a zip file from a folder in the project."""
        import zipfile
        import tempfile

        project_path = self._get_project_path(project_name)

        if folder_path:
            safe_path = self._sanitize_path(folder_path)
            source_path = project_path / safe_path
            zip_name = Path(safe_path).name
        else:
            source_path = project_path / "data"
            zip_name = f"{project_name}-data"

        if not await aiofiles.os.path.exists(source_path):
            raise ValueError(f"Path '{folder_path}' not found")

        # Create zip in temp directory
        temp_dir = tempfile.mkdtemp()
        zip_path = Path(temp_dir) / f"{zip_name}.zip"

        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            if await aiofiles.os.path.isdir(source_path):
                for root, _, files in os.walk(source_path):
                    for file in files:
                        file_path = Path(root) / file
                        arcname = file_path.relative_to(source_path)
                        zipf.write(file_path, arcname)
            else:
                zipf.write(source_path, Path(source_path).name)

        return zip_path


# Global instance
workspace_manager = WorkspaceManager()

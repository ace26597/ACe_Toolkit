"""
Workspace Router - API endpoints for the Workspace app.

Handles:
- Project CRUD (directories on SSD)
- Notes CRUD (JSON files)
- Image upload/serve (for notes)
- Data file operations (NAS-style file browser)

All endpoints require user authentication and use per-user data isolation.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Query, Form, Request, Depends
from fastapi.responses import FileResponse, StreamingResponse, PlainTextResponse
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import mimetypes
import logging

from app.core.workspace_manager import WorkspaceManager
from app.core.user_access import require_valid_access, get_user_workspace_dir
from app.models.models import User

logger = logging.getLogger("workspace")

router = APIRouter()


# ==================== HELPER ====================

def get_user_workspace_manager(user: User) -> WorkspaceManager:
    """Get a workspace manager configured for the user's data directory."""
    user_workspace_dir = get_user_workspace_dir(user)
    return WorkspaceManager(base_dir=user_workspace_dir)


# ==================== SCHEMAS ====================

class ProjectCreate(BaseModel):
    name: str


class ProjectRename(BaseModel):
    newName: str


class ProjectResponse(BaseModel):
    name: str
    createdAt: str
    updatedAt: str
    noteCount: int
    dataSize: str


class NoteCreate(BaseModel):
    title: Optional[str] = ""
    content: Optional[str] = ""
    tags: Optional[List[str]] = []
    pinned: Optional[bool] = False


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None
    pinned: Optional[bool] = None


class NoteResponse(BaseModel):
    id: str
    title: str
    content: str
    pinned: bool
    tags: List[str]
    createdAt: str
    updatedAt: str


class ImageUploadResponse(BaseModel):
    filename: str
    url: str
    markdown: str


class FolderCreate(BaseModel):
    path: str


class DataItemResponse(BaseModel):
    name: str
    path: str
    type: str  # "file" or "folder"
    size: Optional[int] = None
    sizeFormatted: Optional[str] = None
    modifiedAt: str


class DataUploadResponse(BaseModel):
    name: str
    path: str
    size: int
    sizeFormatted: str
    # Optional - only present when .md/.mmd file auto-creates a note
    noteCreated: Optional[bool] = None
    noteId: Optional[str] = None
    noteTitle: Optional[str] = None


# ==================== PROJECT ENDPOINTS ====================

@router.get("/projects", response_model=List[ProjectResponse])
async def list_projects(user: User = Depends(require_valid_access)):
    """List all workspace projects for the current user."""
    manager = get_user_workspace_manager(user)
    projects = await manager.list_projects()
    return [ProjectResponse(**p) for p in projects]


@router.post("/projects", response_model=ProjectResponse)
async def create_project(project: ProjectCreate, user: User = Depends(require_valid_access)):
    """Create a new project with directory structure on SSD."""
    manager = get_user_workspace_manager(user)
    try:
        result = await manager.create_project(project.name)
        return ProjectResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/projects/{name}", response_model=ProjectResponse)
async def get_project(name: str, user: User = Depends(require_valid_access)):
    """Get project details."""
    manager = get_user_workspace_manager(user)
    project = await manager.get_project(name)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectResponse(**project)


@router.put("/projects/{name}", response_model=ProjectResponse)
async def rename_project(name: str, data: ProjectRename, user: User = Depends(require_valid_access)):
    """Rename a project."""
    manager = get_user_workspace_manager(user)
    try:
        result = await manager.rename_project(name, data.newName)
        # Get full details after rename
        project = await manager.get_project(result["name"])
        if project:
            return ProjectResponse(**project)
        return ProjectResponse(
            name=result["name"],
            createdAt=datetime.now().isoformat(),
            updatedAt=datetime.now().isoformat(),
            noteCount=0,
            dataSize="0 B"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/projects/{name}")
async def delete_project(name: str, user: User = Depends(require_valid_access)):
    """Delete a project and all its contents."""
    manager = get_user_workspace_manager(user)
    deleted = await manager.delete_project(name)
    if not deleted:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"status": "deleted", "name": name}


# ==================== NOTE ENDPOINTS ====================

@router.get("/projects/{name}/notes", response_model=List[NoteResponse])
async def list_notes(name: str, user: User = Depends(require_valid_access)):
    """List all notes in a project."""
    manager = get_user_workspace_manager(user)
    # Check project exists
    project = await manager.get_project(name)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    notes = await manager.list_notes(name)
    return [NoteResponse(**n) for n in notes]


@router.post("/projects/{name}/notes", response_model=NoteResponse)
async def create_note(name: str, note: NoteCreate, user: User = Depends(require_valid_access)):
    """Create a new note."""
    manager = get_user_workspace_manager(user)
    # Check project exists
    project = await manager.get_project(name)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    result = await manager.create_note(
        project_name=name,
        title=note.title or "",
        content=note.content or "",
        tags=note.tags or [],
        pinned=note.pinned or False
    )
    return NoteResponse(**result)


@router.get("/projects/{name}/notes/{note_id}", response_model=NoteResponse)
async def get_note(name: str, note_id: str, user: User = Depends(require_valid_access)):
    """Get a specific note."""
    manager = get_user_workspace_manager(user)
    note = await manager.get_note(name, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return NoteResponse(**note)


@router.put("/projects/{name}/notes/{note_id}", response_model=NoteResponse)
async def update_note(name: str, note_id: str, note: NoteUpdate, user: User = Depends(require_valid_access)):
    """Update a note."""
    manager = get_user_workspace_manager(user)
    result = await manager.update_note(
        project_name=name,
        note_id=note_id,
        title=note.title,
        content=note.content,
        tags=note.tags,
        pinned=note.pinned
    )
    if not result:
        raise HTTPException(status_code=404, detail="Note not found")
    return NoteResponse(**result)


@router.delete("/projects/{name}/notes/{note_id}")
async def delete_note(name: str, note_id: str, user: User = Depends(require_valid_access)):
    """Delete a note."""
    manager = get_user_workspace_manager(user)
    deleted = await manager.delete_note(name, note_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Note not found")
    return {"status": "deleted", "id": note_id}


# ==================== IMAGE ENDPOINTS ====================

@router.post("/projects/{name}/images", response_model=ImageUploadResponse)
async def upload_image(name: str, file: UploadFile = File(...), user: User = Depends(require_valid_access)):
    """Upload an image for use in notes."""
    manager = get_user_workspace_manager(user)
    # Check project exists
    project = await manager.get_project(name)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Validate file type
    content_type = file.content_type or ""
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Read file content
    content = await file.read()

    # Max 10MB
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large (max 10MB)")

    result = await manager.upload_image(
        project_name=name,
        file_content=content,
        original_filename=file.filename or "image.png"
    )
    return ImageUploadResponse(**result)


@router.get("/projects/{name}/images/{filename}")
async def get_image(name: str, filename: str, user: User = Depends(require_valid_access)):
    """Serve an image file."""
    manager = get_user_workspace_manager(user)
    image_path = await manager.get_image_path(name, filename)
    if not image_path:
        raise HTTPException(status_code=404, detail="Image not found")

    # Determine MIME type
    mime_type, _ = mimetypes.guess_type(str(image_path))
    if not mime_type:
        mime_type = "application/octet-stream"

    return FileResponse(image_path, media_type=mime_type)


@router.delete("/projects/{name}/images/{filename}")
async def delete_image(name: str, filename: str, user: User = Depends(require_valid_access)):
    """Delete an image."""
    manager = get_user_workspace_manager(user)
    deleted = await manager.delete_image(name, filename)
    if not deleted:
        raise HTTPException(status_code=404, detail="Image not found")
    return {"status": "deleted", "filename": filename}


# ==================== DATA (NAS) ENDPOINTS ====================

@router.get("/projects/{name}/data", response_model=List[DataItemResponse])
async def list_data(name: str, path: str = Query(default=""), user: User = Depends(require_valid_access)):
    """List files and folders in the project directory."""
    manager = get_user_workspace_manager(user)
    # Check project exists
    project = await manager.get_project(name)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    items = await manager.list_data(name, path)
    return [DataItemResponse(**item) for item in items]


@router.get("/projects/{name}/text-files", response_model=List[DataItemResponse])
async def list_text_files(name: str, user: User = Depends(require_valid_access)):
    """List all readable text files in the project (for Notes view).

    Recursively scans project directory for .md, .mmd, .txt, .log, etc.
    Returns files sorted by modified time (most recent first).
    """
    manager = get_user_workspace_manager(user)
    project = await manager.get_project(name)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    items = await manager.list_text_files(name)
    return [DataItemResponse(**item) for item in items]


@router.post("/projects/{name}/data/upload", response_model=DataUploadResponse)
async def upload_data(
    name: str,
    file: UploadFile = File(...),
    path: str = Form(default=""),
    user: User = Depends(require_valid_access)
):
    """Upload a file to the data directory."""
    manager = get_user_workspace_manager(user)
    # Check project exists
    project = await manager.get_project(name)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    content = await file.read()

    # Max 100MB per file
    if len(content) > 100 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 100MB)")

    result = await manager.upload_data(
        project_name=name,
        file_content=content,
        filename=file.filename or "file",
        subpath=path
    )
    return DataUploadResponse(**result)


@router.post("/projects/{name}/data/folder")
async def create_data_folder(name: str, folder: FolderCreate, user: User = Depends(require_valid_access)):
    """Create a new folder in the data directory."""
    manager = get_user_workspace_manager(user)
    # Check project exists
    project = await manager.get_project(name)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        result = await manager.create_folder(name, folder.path)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/projects/{name}/data/download")
async def download_data(name: str, path: str = Query(...), user: User = Depends(require_valid_access)):
    """Download a file or folder (as zip)."""
    manager = get_user_workspace_manager(user)
    # Check project exists
    project = await manager.get_project(name)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    file_path = await manager.get_data_path(name, path)
    if not file_path:
        raise HTTPException(status_code=404, detail="File not found")

    import aiofiles.os
    if await aiofiles.os.path.isdir(file_path):
        # Create zip for folder download
        try:
            zip_path = await manager.create_zip(name, path)
            return FileResponse(
                zip_path,
                media_type="application/zip",
                filename=f"{file_path.name}.zip"
            )
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e))
    else:
        # Direct file download
        mime_type, _ = mimetypes.guess_type(str(file_path))
        if not mime_type:
            mime_type = "application/octet-stream"

        return FileResponse(
            file_path,
            media_type=mime_type,
            filename=file_path.name
        )


@router.get("/projects/{name}/data/content")
async def get_file_content(name: str, path: str = Query(...), user: User = Depends(require_valid_access)):
    """Read file content as text (for preview/edit)."""
    manager = get_user_workspace_manager(user)
    # Check project exists
    project = await manager.get_project(name)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    file_path = await manager.get_data_path(name, path)
    if not file_path:
        raise HTTPException(status_code=404, detail="File not found")

    import aiofiles.os
    if await aiofiles.os.path.isdir(file_path):
        raise HTTPException(status_code=400, detail="Cannot read content of a directory")

    # Check file size (max 5MB for text preview)
    stat = await aiofiles.os.stat(file_path)
    if stat.st_size > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large for preview (max 5MB)")

    try:
        import aiofiles
        async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
            content = await f.read()
        return PlainTextResponse(content)
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File is not a text file")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read file: {str(e)}")


@router.put("/projects/{name}/data/content")
async def save_file_content(
    name: str,
    request: Request,
    path: str = Query(...),
    create: bool = Query(default=False, description="Create file if it doesn't exist"),
    user: User = Depends(require_valid_access)
):
    """Save file content (for editing text files or creating new ones).

    Set create=true to create a new file if it doesn't exist.
    """
    manager = get_user_workspace_manager(user)

    # Check project exists
    project = await manager.get_project(name)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    import aiofiles.os
    import aiofiles
    from pathlib import Path

    file_path = await manager.get_data_path(name, path)

    if not file_path:
        if not create:
            raise HTTPException(status_code=404, detail="File not found")
        # Create new file - construct path from project root
        project_path = manager._get_project_path(name)
        safe_path = manager._sanitize_path(path)
        file_path = project_path / safe_path

        # Validate file extension for new files
        valid_extensions = ['.md', '.txt', '.mmd', '.markdown', '.log', '.json', '.yaml', '.yml', '.csv']
        if not any(str(file_path).lower().endswith(ext) for ext in valid_extensions):
            raise HTTPException(status_code=400, detail="Only text files can be created (.md, .txt, .mmd, etc.)")

        # Ensure parent directory exists
        await aiofiles.os.makedirs(file_path.parent, exist_ok=True)

    if await aiofiles.os.path.isdir(file_path):
        raise HTTPException(status_code=400, detail="Cannot write to a directory")

    try:
        # Read raw body content
        body = await request.body()
        content = body.decode('utf-8')

        async with aiofiles.open(file_path, 'w', encoding='utf-8') as f:
            await f.write(content)
        return {"status": "saved", "path": path, "created": not await aiofiles.os.path.exists(file_path) if not create else create}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")


@router.delete("/projects/{name}/data")
async def delete_data(name: str, path: str = Query(...), user: User = Depends(require_valid_access)):
    """Delete a file or folder from the data directory."""
    manager = get_user_workspace_manager(user)
    # Check project exists
    project = await manager.get_project(name)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    deleted = await manager.delete_data(name, path)
    if not deleted:
        raise HTTPException(status_code=404, detail="File not found")
    return {"status": "deleted", "path": path}

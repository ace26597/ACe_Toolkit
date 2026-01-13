"""
Session-based Notes Router
Handles CRUD operations for notes within projects without authentication
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
import json
from datetime import datetime

from app.core.database import get_db
from app.models.models import SessionNote, SessionNoteProject
from app.schemas import (
    SessionNoteCreate,
    SessionNoteUpdate,
    SessionNoteResponse,
    SessionNoteMetadataSchema,
    NoteBulkSyncRequest,
    SessionNoteProjectCreate,
    SessionNoteProjectUpdate,
    SessionNoteProjectResponse
)

router = APIRouter()


def note_to_response(note: SessionNote) -> SessionNoteResponse:
    """Convert a SessionNote model to SessionNoteResponse schema"""
    metadata = json.loads(note.metadata_json) if note.metadata_json else None
    
    return SessionNoteResponse(
        id=note.id,
        projectId=note.project_id,
        title=note.title,
        content=note.content,
        metadata=SessionNoteMetadataSchema(**metadata) if metadata else None,
        createdAt=note.created_at.isoformat() if note.created_at else "",
        updatedAt=note.updated_at.isoformat() if note.updated_at else ""
    )


def project_to_response(project: SessionNoteProject) -> SessionNoteProjectResponse:
    """Convert a SessionNoteProject model to SessionNoteProjectResponse schema"""
    return SessionNoteProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        notes=[note_to_response(n) for n in project.notes],
        createdAt=project.created_at.isoformat() if project.created_at else "",
        updatedAt=project.updated_at.isoformat() if project.updated_at else ""
    )


@router.get("/projects", response_model=List[SessionNoteProjectResponse])
async def list_projects(db: AsyncSession = Depends(get_db)):
    """List all note projects with their notes"""
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(SessionNoteProject)
        .options(selectinload(SessionNoteProject.notes))
        .order_by(SessionNoteProject.created_at)
    )
    projects = result.scalars().all()
    return [project_to_response(p) for p in projects]


@router.post("/projects", response_model=SessionNoteProjectResponse)
async def create_project(
    project_in: SessionNoteProjectCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new note project"""
    # Check if project already exists
    existing = await db.execute(
        select(SessionNoteProject).where(SessionNoteProject.id == project_in.id)
    )
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Project with this ID already exists")
    
    new_project = SessionNoteProject(
        id=project_in.id,
        name=project_in.name,
        description=project_in.description
    )
    db.add(new_project)
    
    # Create notes if provided
    for note_in in project_in.notes:
        metadata_json = json.dumps(note_in.metadata.model_dump()) if note_in.metadata else None
        new_note = SessionNote(
            id=note_in.id,
            project_id=project_in.id,
            title=note_in.title,
            content=note_in.content,
            metadata_json=metadata_json
        )
        db.add(new_note)
    
    await db.commit()
    
    # Reload with notes
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(SessionNoteProject)
        .options(selectinload(SessionNoteProject.notes))
        .where(SessionNoteProject.id == project_in.id)
    )
    project = result.scalars().first()
    return project_to_response(project)


@router.put("/projects/{project_id}", response_model=SessionNoteProjectResponse)
async def update_project(
    project_id: str,
    project_in: SessionNoteProjectUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a note project"""
    result = await db.execute(
        select(SessionNoteProject).where(SessionNoteProject.id == project_id)
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project_in.name is not None:
        project.name = project_in.name
    if project_in.description is not None:
        project.description = project_in.description
    project.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(project, ['notes'])
    return project_to_response(project)


@router.delete("/projects/{project_id}")
async def delete_project(project_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a note project and all its notes"""
    result = await db.execute(
        select(SessionNoteProject).where(SessionNoteProject.id == project_id)
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    await db.delete(project)
    await db.commit()
    return {"message": "Project deleted"}


@router.post("/note", response_model=SessionNoteResponse)
async def create_note(
    note_in: SessionNoteCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new note within a project"""
    # Verify project exists
    proj_result = await db.execute(
        select(SessionNoteProject).where(SessionNoteProject.id == note_in.projectId)
    )
    if not proj_result.scalars().first():
        raise HTTPException(status_code=404, detail="Project not found")

    new_note = SessionNote(
        id=note_in.id,
        project_id=note_in.projectId,
        title=note_in.title,
        content=note_in.content,
        metadata_json=json.dumps(note_in.metadata.model_dump()) if note_in.metadata else None
    )
    db.add(new_note)
    await db.commit()
    await db.refresh(new_note)
    return note_to_response(new_note)


@router.put("/note/{note_id}", response_model=SessionNoteResponse)
async def update_note(
    note_id: str,
    note_in: SessionNoteUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update an existing note"""
    result = await db.execute(
        select(SessionNote).where(SessionNote.id == note_id)
    )
    note = result.scalars().first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    if note_in.title is not None:
        note.title = note_in.title
    if note_in.content is not None:
        note.content = note_in.content
    if note_in.metadata is not None:
        note.metadata_json = json.dumps(note_in.metadata.model_dump())
    
    note.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(note)
    return note_to_response(note)


@router.delete("/note/{note_id}")
async def delete_note(note_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a note"""
    result = await db.execute(
        select(SessionNote).where(SessionNote.id == note_id)
    )
    note = result.scalars().first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    await db.delete(note)
    await db.commit()
    return {"message": "Note deleted"}


@router.post("/sync", response_model=List[SessionNoteProjectResponse])
async def sync_notes(
    sync_data: NoteBulkSyncRequest,
    db: AsyncSession = Depends(get_db)
):
    """Bulk sync note projects and notes from frontend"""
    # Delete all existing note projects (cascades to notes)
    result = await db.execute(select(SessionNoteProject))
    existing_projects = result.scalars().all()
    for project in existing_projects:
        await db.delete(project)
    
    # Create all new projects and notes
    for project_in in sync_data.projects:
        new_project = SessionNoteProject(
            id=project_in.id,
            name=project_in.name,
            description=project_in.description
        )
        db.add(new_project)
        
        for note_in in project_in.notes:
            new_note = SessionNote(
                id=note_in.id,
                project_id=project_in.id,
                title=note_in.title,
                content=note_in.content,
                metadata_json=json.dumps(note_in.metadata.model_dump()) if note_in.metadata else None
            )
            db.add(new_note)
    
    await db.commit()
    
    # Return all projects
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(SessionNoteProject)
        .options(selectinload(SessionNoteProject.notes))
        .order_by(SessionNoteProject.created_at)
    )
    projects = result.scalars().all()
    return [project_to_response(p) for p in projects]

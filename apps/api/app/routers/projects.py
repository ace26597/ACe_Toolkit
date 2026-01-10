"""
Session-based Projects Router
Handles CRUD operations for projects without authentication
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List
import json
from datetime import datetime

from app.core.database import get_db
from app.models.models import SessionProject, SessionChart
from app.schemas import (
    SessionProjectCreate, 
    SessionProjectUpdate, 
    SessionProjectResponse,
    SessionChartResponse,
    EditionSchema,
    ChartMetadataSchema,
    BulkSyncRequest
)

router = APIRouter()


def chart_to_response(chart: SessionChart) -> SessionChartResponse:
    """Convert a SessionChart model to SessionChartResponse schema"""
    editions = json.loads(chart.editions) if chart.editions else []
    metadata = json.loads(chart.metadata_json) if chart.metadata_json else None
    
    return SessionChartResponse(
        id=chart.id,
        projectId=chart.project_id,
        name=chart.name,
        code=chart.code,
        editions=[EditionSchema(**e) for e in editions],
        currentEditionId=chart.current_edition_id,
        metadata=ChartMetadataSchema(**metadata) if metadata else None,
        createdAt=chart.created_at.isoformat() if chart.created_at else "",
        updatedAt=chart.updated_at.isoformat() if chart.updated_at else ""
    )


def project_to_response(project: SessionProject) -> SessionProjectResponse:
    """Convert a SessionProject model to SessionProjectResponse schema"""
    return SessionProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        charts=[chart_to_response(c) for c in project.charts],
        createdAt=project.created_at.isoformat() if project.created_at else "",
        updatedAt=project.updated_at.isoformat() if project.updated_at else ""
    )


@router.get("/", response_model=List[SessionProjectResponse])
async def list_projects(db: AsyncSession = Depends(get_db)):
    """List all projects with their charts"""
    result = await db.execute(
        select(SessionProject)
        .options(selectinload(SessionProject.charts))
        .order_by(SessionProject.created_at)
    )
    projects = result.scalars().all()
    return [project_to_response(p) for p in projects]


@router.post("/", response_model=SessionProjectResponse)
async def create_project(
    project_in: SessionProjectCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new project with optional charts"""
    # Check if project already exists
    existing = await db.execute(
        select(SessionProject).where(SessionProject.id == project_in.id)
    )
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Project with this ID already exists")
    
    new_project = SessionProject(
        id=project_in.id,
        name=project_in.name,
        description=project_in.description
    )
    db.add(new_project)
    
    # Create charts if provided
    for chart_in in project_in.charts:
        new_chart = SessionChart(
            id=chart_in.id,
            project_id=project_in.id,
            name=chart_in.name,
            code=chart_in.code,
            editions=json.dumps([e.model_dump() for e in chart_in.editions]),
            current_edition_id=chart_in.currentEditionId,
            metadata_json=json.dumps(chart_in.metadata.model_dump()) if chart_in.metadata else None
        )
        db.add(new_chart)
    
    await db.commit()
    
    # Reload with charts
    result = await db.execute(
        select(SessionProject)
        .options(selectinload(SessionProject.charts))
        .where(SessionProject.id == project_in.id)
    )
    project = result.scalars().first()
    return project_to_response(project)


@router.get("/{project_id}", response_model=SessionProjectResponse)
async def get_project(project_id: str, db: AsyncSession = Depends(get_db)):
    """Get a single project by ID"""
    result = await db.execute(
        select(SessionProject)
        .options(selectinload(SessionProject.charts))
        .where(SessionProject.id == project_id)
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project_to_response(project)


@router.put("/{project_id}", response_model=SessionProjectResponse)
async def update_project(
    project_id: str,
    project_in: SessionProjectUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a project (rename, description)"""
    result = await db.execute(
        select(SessionProject)
        .options(selectinload(SessionProject.charts))
        .where(SessionProject.id == project_id)
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
    await db.refresh(project)
    
    # Reload with charts
    result = await db.execute(
        select(SessionProject)
        .options(selectinload(SessionProject.charts))
        .where(SessionProject.id == project_id)
    )
    project = result.scalars().first()
    return project_to_response(project)


@router.delete("/{project_id}")
async def delete_project(project_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a project and all its charts"""
    result = await db.execute(
        select(SessionProject).where(SessionProject.id == project_id)
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    await db.delete(project)
    await db.commit()
    return {"message": "Project deleted"}


@router.post("/sync", response_model=List[SessionProjectResponse])
async def sync_projects(
    sync_data: BulkSyncRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Bulk sync projects from frontend.
    This replaces all existing data with the provided data.
    Used for initial sync from localStorage.
    """
    # Delete all existing projects
    result = await db.execute(select(SessionProject))
    existing_projects = result.scalars().all()
    for project in existing_projects:
        await db.delete(project)
    
    # Create all new projects
    for project_in in sync_data.projects:
        new_project = SessionProject(
            id=project_in.id,
            name=project_in.name,
            description=project_in.description
        )
        db.add(new_project)
        
        for chart_in in project_in.charts:
            new_chart = SessionChart(
                id=chart_in.id,
                project_id=project_in.id,
                name=chart_in.name,
                code=chart_in.code,
                editions=json.dumps([e.model_dump() for e in chart_in.editions]),
                current_edition_id=chart_in.currentEditionId,
                metadata_json=json.dumps(chart_in.metadata.model_dump()) if chart_in.metadata else None
            )
            db.add(new_chart)
    
    await db.commit()
    
    # Return all projects
    result = await db.execute(
        select(SessionProject)
        .options(selectinload(SessionProject.charts))
        .order_by(SessionProject.created_at)
    )
    projects = result.scalars().all()
    return [project_to_response(p) for p in projects]

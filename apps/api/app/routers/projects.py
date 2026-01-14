"""
Session-based Projects Router
Handles CRUD operations for projects without authentication
Includes disk export/import for SSD storage
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from pathlib import Path
import json
import logging
from datetime import datetime

from app.core.database import get_db
from app.core.config import settings
from app.models.models import SessionProject, SessionChart

logger = logging.getLogger("projects")
from app.schemas import (
    SessionProjectCreate, 
    SessionProjectUpdate, 
    SessionProjectResponse,
    SessionChartResponse,
    EditionSchema,
    ChartMetadataSchema,
    DocumentSchema,
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
        documentId=chart.document_id,
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
    documents = json.loads(project.documents_json) if project.documents_json else []
    
    return SessionProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        charts=[chart_to_response(c) for c in project.charts],
        documents=[DocumentSchema(**d) for d in documents],
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
        description=project_in.description,
        documents_json=json.dumps([d.model_dump() for d in project_in.documents])
    )
    db.add(new_project)
    
    # Create charts if provided
    for chart_in in project_in.charts:
        new_chart = SessionChart(
            id=chart_in.id,
            project_id=project_in.id,
            document_id=chart_in.documentId,
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
    if project_in.documents is not None:
        project.documents_json = json.dumps([d.model_dump() for d in project_in.documents])
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
            description=project_in.description,
            documents_json=json.dumps([d.model_dump() for d in project_in.documents])
        )
        db.add(new_project)
        
        for chart_in in project_in.charts:
            new_chart = SessionChart(
                id=chart_in.id,
                project_id=project_in.id,
                document_id=chart_in.documentId,
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


# ============ Disk Export/Import Endpoints (SSD Storage) ============

from pydantic import BaseModel

class DiskProjectInfo(BaseModel):
    name: str
    path: str
    chart_count: int
    document_count: int
    exported_at: str


class ExportToDiskRequest(BaseModel):
    folder_name: Optional[str] = None  # Optional custom folder name


class ExportToDiskResponse(BaseModel):
    name: str
    path: str
    chart_files: List[str]
    document_files: List[str]
    exported_at: str


def _get_mermaid_data_dir() -> Path:
    """Get the Mermaid data directory on SSD"""
    data_dir = Path(settings.MERMAID_DATA_DIR)
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir


@router.post("/{project_id}/export-to-disk", response_model=ExportToDiskResponse)
async def export_project_to_disk(
    project_id: str,
    request: ExportToDiskRequest = ExportToDiskRequest(),
    db: AsyncSession = Depends(get_db)
):
    """
    Export project to SSD as files.

    Creates directory structure:
    /data/mermaid-projects/{project_name}/
    ├── project.json (metadata)
    ├── charts/
    │   ├── chart1.mmd
    │   └── chart2.mmd
    └── documents/
        └── doc1.md (with embedded mermaid blocks)
    """
    result = await db.execute(
        select(SessionProject)
        .options(selectinload(SessionProject.charts))
        .where(SessionProject.id == project_id)
    )
    project = result.scalars().first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Determine folder name
    folder_name = request.folder_name or project.name
    safe_name = "".join(c for c in folder_name if c.isalnum() or c in "-_ ").strip()
    if not safe_name:
        safe_name = f"project_{project.id[:8]}"

    # Create project directory
    data_dir = _get_mermaid_data_dir()
    project_dir = data_dir / safe_name
    charts_dir = project_dir / "charts"
    docs_dir = project_dir / "documents"

    # Remove existing if overwriting
    if project_dir.exists():
        import shutil
        shutil.rmtree(project_dir)

    project_dir.mkdir(parents=True)
    charts_dir.mkdir()
    docs_dir.mkdir()

    chart_files = []
    document_files = []

    # Parse documents
    documents = json.loads(project.documents_json) if project.documents_json else []

    # Export charts as .mmd files
    for chart in project.charts:
        # Sanitize chart name for filename
        chart_filename = "".join(c for c in chart.name if c.isalnum() or c in "-_ ").strip()
        if not chart_filename:
            chart_filename = f"chart_{chart.id[:8]}"
        chart_filename += ".mmd"

        chart_path = charts_dir / chart_filename
        chart_path.write_text(chart.code)
        chart_files.append(f"charts/{chart_filename}")

    # Export documents as .md files with embedded mermaid
    for doc in documents:
        doc_name = doc.get("name", "untitled")
        doc_filename = "".join(c for c in doc_name if c.isalnum() or c in "-_ ").strip()
        if not doc_filename:
            doc_filename = f"doc_{doc.get('id', 'unknown')[:8]}"
        doc_filename += ".md"

        # Build markdown content with embedded mermaid blocks
        md_content = f"# {doc_name}\n\n"

        source_md = doc.get("sourceMarkdown", "")
        if source_md:
            md_content = source_md
        else:
            # Build from chart references
            chart_ids = doc.get("chartIds", [])
            for chart in project.charts:
                if chart.id in chart_ids:
                    md_content += f"## {chart.name}\n\n```mermaid\n{chart.code}\n```\n\n"

        doc_path = docs_dir / doc_filename
        doc_path.write_text(md_content)
        document_files.append(f"documents/{doc_filename}")

    # Write project metadata
    metadata = {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "exported_at": datetime.utcnow().isoformat(),
        "chart_count": len(project.charts),
        "document_count": len(documents),
        "documents": documents
    }
    metadata_path = project_dir / "project.json"
    metadata_path.write_text(json.dumps(metadata, indent=2))

    logger.info(f"Exported project '{project.name}' to {project_dir}")

    return ExportToDiskResponse(
        name=safe_name,
        path=str(project_dir),
        chart_files=chart_files,
        document_files=document_files,
        exported_at=datetime.utcnow().isoformat()
    )


@router.get("/disk-projects", response_model=List[DiskProjectInfo])
async def list_disk_projects():
    """List all projects exported to SSD"""
    data_dir = _get_mermaid_data_dir()
    projects = []

    for project_dir in data_dir.iterdir():
        if not project_dir.is_dir():
            continue

        metadata_path = project_dir / "project.json"
        charts_dir = project_dir / "charts"
        docs_dir = project_dir / "documents"

        chart_count = len(list(charts_dir.glob("*.mmd"))) if charts_dir.exists() else 0
        doc_count = len(list(docs_dir.glob("*.md"))) if docs_dir.exists() else 0

        if metadata_path.exists():
            try:
                metadata = json.loads(metadata_path.read_text())
                projects.append(DiskProjectInfo(
                    name=project_dir.name,
                    path=str(project_dir),
                    chart_count=metadata.get("chart_count", chart_count),
                    document_count=metadata.get("document_count", doc_count),
                    exported_at=metadata.get("exported_at", "")
                ))
            except Exception as e:
                logger.warning(f"Failed to read metadata for {project_dir}: {e}")
                projects.append(DiskProjectInfo(
                    name=project_dir.name,
                    path=str(project_dir),
                    chart_count=chart_count,
                    document_count=doc_count,
                    exported_at=datetime.fromtimestamp(project_dir.stat().st_mtime).isoformat()
                ))
        else:
            projects.append(DiskProjectInfo(
                name=project_dir.name,
                path=str(project_dir),
                chart_count=chart_count,
                document_count=doc_count,
                exported_at=datetime.fromtimestamp(project_dir.stat().st_mtime).isoformat()
            ))

    # Sort by exported_at descending
    projects.sort(key=lambda p: p.exported_at, reverse=True)
    return projects


@router.post("/import-from-disk/{folder_name}", response_model=SessionProjectResponse)
async def import_project_from_disk(
    folder_name: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Import project from SSD disk storage.

    Reads project.json metadata and .mmd chart files,
    creates new project in database.
    """
    data_dir = _get_mermaid_data_dir()
    project_dir = data_dir / folder_name

    if not project_dir.exists():
        raise HTTPException(status_code=404, detail=f"Project folder '{folder_name}' not found")

    metadata_path = project_dir / "project.json"
    charts_dir = project_dir / "charts"

    # Read metadata
    if metadata_path.exists():
        metadata = json.loads(metadata_path.read_text())
    else:
        metadata = {
            "name": folder_name,
            "description": f"Imported from {folder_name}"
        }

    # Generate new project ID
    import uuid
    new_project_id = str(uuid.uuid4())[:8] + "-" + str(int(datetime.utcnow().timestamp() * 1000))

    # Check if project with same name exists, append suffix if so
    result = await db.execute(
        select(SessionProject).where(SessionProject.name == metadata.get("name", folder_name))
    )
    if result.scalars().first():
        metadata["name"] = f"{metadata.get('name', folder_name)} (imported)"

    # Create project
    new_project = SessionProject(
        id=new_project_id,
        name=metadata.get("name", folder_name),
        description=metadata.get("description", ""),
        documents_json=json.dumps(metadata.get("documents", []))
    )
    db.add(new_project)

    # Import charts from .mmd files
    if charts_dir.exists():
        for chart_file in charts_dir.glob("*.mmd"):
            chart_name = chart_file.stem
            chart_code = chart_file.read_text()
            chart_id = str(uuid.uuid4())[:8] + "-" + str(int(datetime.utcnow().timestamp() * 1000))

            new_chart = SessionChart(
                id=chart_id,
                project_id=new_project_id,
                name=chart_name,
                code=chart_code,
                editions=json.dumps([{
                    "id": chart_id + "-v1",
                    "code": chart_code,
                    "timestamp": datetime.utcnow().isoformat(),
                    "label": "Imported"
                }]),
                current_edition_id=chart_id + "-v1"
            )
            db.add(new_chart)

    await db.commit()

    # Reload with charts
    result = await db.execute(
        select(SessionProject)
        .options(selectinload(SessionProject.charts))
        .where(SessionProject.id == new_project_id)
    )
    project = result.scalars().first()

    logger.info(f"Imported project '{folder_name}' from disk as '{project.name}'")
    return project_to_response(project)


@router.delete("/disk-projects/{folder_name}")
async def delete_disk_project(folder_name: str):
    """Delete an exported project from SSD"""
    data_dir = _get_mermaid_data_dir()
    project_dir = data_dir / folder_name

    if not project_dir.exists():
        raise HTTPException(status_code=404, detail=f"Project folder '{folder_name}' not found")

    # Safety check - ensure it's under the data directory
    if not str(project_dir.resolve()).startswith(str(data_dir.resolve())):
        raise HTTPException(status_code=403, detail="Access denied")

    import shutil
    shutil.rmtree(project_dir)

    logger.info(f"Deleted disk project: {folder_name}")
    return {"status": "deleted", "name": folder_name}

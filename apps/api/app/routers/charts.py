"""
Session-based Charts Router
Handles CRUD operations for charts without authentication
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
import json
from datetime import datetime

from app.core.database import get_db
from app.models.models import SessionChart, SessionProject
from app.schemas import (
    SessionChartCreate, 
    SessionChartUpdate, 
    SessionChartResponse,
    EditionSchema,
    ChartMetadataSchema
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


@router.get("/project/{project_id}", response_model=List[SessionChartResponse])
async def list_charts(project_id: str, db: AsyncSession = Depends(get_db)):
    """List all charts for a project"""
    result = await db.execute(
        select(SessionChart)
        .where(SessionChart.project_id == project_id)
        .order_by(SessionChart.created_at)
    )
    charts = result.scalars().all()
    return [chart_to_response(c) for c in charts]


@router.post("/", response_model=SessionChartResponse)
async def create_chart(
    chart_in: SessionChartCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new chart"""
    # Verify project exists
    result = await db.execute(
        select(SessionProject).where(SessionProject.id == chart_in.projectId)
    )
    if not result.scalars().first():
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check if chart already exists
    existing = await db.execute(
        select(SessionChart).where(SessionChart.id == chart_in.id)
    )
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Chart with this ID already exists")
    
    new_chart = SessionChart(
        id=chart_in.id,
        project_id=chart_in.projectId,
        document_id=chart_in.documentId,
        name=chart_in.name,
        code=chart_in.code,
        editions=json.dumps([e.model_dump() for e in chart_in.editions]),
        current_edition_id=chart_in.currentEditionId,
        metadata_json=json.dumps(chart_in.metadata.model_dump()) if chart_in.metadata else None
    )
    db.add(new_chart)
    await db.commit()
    await db.refresh(new_chart)
    
    return chart_to_response(new_chart)


@router.get("/{chart_id}", response_model=SessionChartResponse)
async def get_chart(chart_id: str, db: AsyncSession = Depends(get_db)):
    """Get a single chart by ID"""
    result = await db.execute(
        select(SessionChart).where(SessionChart.id == chart_id)
    )
    chart = result.scalars().first()
    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")
    return chart_to_response(chart)


@router.put("/{chart_id}", response_model=SessionChartResponse)
async def update_chart(
    chart_id: str,
    chart_in: SessionChartUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a chart (name, code, editions, metadata)"""
    result = await db.execute(
        select(SessionChart).where(SessionChart.id == chart_id)
    )
    chart = result.scalars().first()
    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")
    
    if chart_in.name is not None:
        chart.name = chart_in.name
    if chart_in.code is not None:
        chart.code = chart_in.code
    if chart_in.editions is not None:
        chart.editions = json.dumps([e.model_dump() for e in chart_in.editions])
    if chart_in.currentEditionId is not None:
        chart.current_edition_id = chart_in.currentEditionId
    if chart_in.documentId is not None:
        chart.document_id = chart_in.documentId
    if chart_in.metadata is not None:
        chart.metadata_json = json.dumps(chart_in.metadata.model_dump())
    
    chart.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(chart)
    
    return chart_to_response(chart)


@router.delete("/{chart_id}")
async def delete_chart(chart_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a chart"""
    result = await db.execute(
        select(SessionChart).where(SessionChart.id == chart_id)
    )
    chart = result.scalars().first()
    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")
    
    await db.delete(chart)
    await db.commit()
    return {"message": "Chart deleted"}

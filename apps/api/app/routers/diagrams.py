from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
import uuid

from app.core.database import get_db
from app.models.models import User, Diagram
from app.schemas import DiagramCreate, DiagramUpdate, DiagramResponse
from app.routers.auth import get_current_user

router = APIRouter()

@router.get("/", response_model=List[DiagramResponse])
async def read_diagrams(
    skip: int = 0, 
    limit: int = 100, 
    current_user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Diagram)
        .where(Diagram.user_id == current_user.id)
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()

@router.post("/", response_model=DiagramResponse)
async def create_diagram(
    diagram_in: DiagramCreate, 
    current_user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    new_diagram = Diagram(
        **diagram_in.model_dump(),
        user_id=current_user.id
    )
    db.add(new_diagram)
    await db.commit()
    await db.refresh(new_diagram)
    return new_diagram

@router.get("/{diagram_id}", response_model=DiagramResponse)
async def read_diagram(
    diagram_id: uuid.UUID,
    current_user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Diagram).where(Diagram.id == diagram_id, Diagram.user_id == current_user.id)
    )
    diagram = result.scalars().first()
    if not diagram:
        raise HTTPException(status_code=404, detail="Diagram not found")
    return diagram

@router.put("/{diagram_id}", response_model=DiagramResponse)
async def update_diagram(
    diagram_id: uuid.UUID,
    diagram_in: DiagramUpdate,
    current_user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Diagram).where(Diagram.id == diagram_id, Diagram.user_id == current_user.id)
    )
    diagram = result.scalars().first()
    if not diagram:
        raise HTTPException(status_code=404, detail="Diagram not found")
    
    update_data = diagram_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(diagram, key, value)
    
    db.add(diagram)
    await db.commit()
    await db.refresh(diagram)
    return diagram

@router.delete("/{diagram_id}")
async def delete_diagram(
    diagram_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Diagram).where(Diagram.id == diagram_id, Diagram.user_id == current_user.id)
    )
    diagram = result.scalars().first()
    if not diagram:
        raise HTTPException(status_code=404, detail="Diagram not found")

    # Correct way to delete in async SQLAlchemy
    await db.delete(diagram)
    await db.commit()
    return {"message": "Diagram deleted"}

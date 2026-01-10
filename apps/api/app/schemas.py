from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
import uuid

# Auth Schemas
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: EmailStr
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

# Diagram Schemas
class DiagramBase(BaseModel):
    title: str
    mermaid_code: str
    theme: Optional[str] = "default"

class DiagramCreate(DiagramBase):
    pass

class DiagramUpdate(BaseModel):
    title: Optional[str] = None
    mermaid_code: Optional[str] = None
    theme: Optional[str] = None

class DiagramResponse(DiagramBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Export Schema
class ExportRequest(BaseModel):
    mermaid_code: str
    theme: Optional[str] = "default"

# Note Schemas
class NoteBase(BaseModel):
    title: str
    content: str

class NoteCreate(NoteBase):
    pass

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None

class NoteResponse(NoteBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    
# AI Schemas
class AiRequest(BaseModel):
    prompt: str
    current_code: Optional[str] = None


# Session-based Schemas (no auth required)
class EditionSchema(BaseModel):
    id: str
    code: str
    description: str
    updatedAt: str


class ChartMetadataSchema(BaseModel):
    description: Optional[str] = None
    source: Optional[str] = None  # 'manual' | 'markdown' | 'ai'
    sourceFile: Optional[str] = None


class SessionChartCreate(BaseModel):
    id: str
    projectId: str
    name: str
    code: str
    editions: List[EditionSchema] = []
    currentEditionId: Optional[str] = None
    metadata: Optional[ChartMetadataSchema] = None


class SessionChartUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    editions: Optional[List[EditionSchema]] = None
    currentEditionId: Optional[str] = None
    metadata: Optional[ChartMetadataSchema] = None


class SessionChartResponse(BaseModel):
    id: str
    projectId: str
    name: str
    code: str
    editions: List[EditionSchema]
    currentEditionId: Optional[str]
    metadata: Optional[ChartMetadataSchema]
    createdAt: str
    updatedAt: str

    class Config:
        from_attributes = True


class SessionProjectCreate(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    charts: List[SessionChartCreate] = []


class SessionProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class SessionProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    charts: List[SessionChartResponse]
    createdAt: str
    updatedAt: str

    class Config:
        from_attributes = True


# Bulk sync schema for frontend
class BulkSyncRequest(BaseModel):
    projects: List[SessionProjectCreate]


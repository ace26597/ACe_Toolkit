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
    is_admin: bool
    is_approved: bool
    trial_expires_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserAdminResponse(BaseModel):
    """Admin view of user with more details"""
    id: uuid.UUID
    name: str
    email: EmailStr
    is_admin: bool
    is_approved: bool
    approved_at: Optional[datetime] = None
    trial_expires_at: Optional[datetime] = None
    last_login_at: Optional[datetime] = None
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


class DocumentSchema(BaseModel):
    id: str
    name: str
    sourceMarkdown: Optional[str] = None
    chartIds: List[str] = []
    createdAt: str


class SessionChartCreate(BaseModel):
    id: str
    projectId: str
    documentId: Optional[str] = None
    name: str
    code: str
    editions: List[EditionSchema] = []
    currentEditionId: Optional[str] = None
    metadata: Optional[ChartMetadataSchema] = None


class SessionChartUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    documentId: Optional[str] = None
    editions: Optional[List[EditionSchema]] = None
    currentEditionId: Optional[str] = None
    metadata: Optional[ChartMetadataSchema] = None


class SessionChartResponse(BaseModel):
    id: str
    projectId: str
    documentId: Optional[str] = None
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
    documents: List[DocumentSchema] = []


class SessionProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    documents: Optional[List[DocumentSchema]] = None


class SessionProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    charts: List[SessionChartResponse]
    documents: List[DocumentSchema]
    createdAt: str
    updatedAt: str

    class Config:
        from_attributes = True


# Bulk sync schema for frontend
class BulkSyncRequest(BaseModel):
    projects: List[SessionProjectCreate]


# Session-based Note Schemas
class SessionNoteMetadataSchema(BaseModel):
    tags: List[str] = []
    pinned: bool = False
    source: Optional[str] = None  # 'manual' | 'upload'


class SessionNoteCreate(BaseModel):
    id: str
    projectId: str
    title: str
    content: str
    metadata: Optional[SessionNoteMetadataSchema] = None


class SessionNoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    metadata: Optional[SessionNoteMetadataSchema] = None


class SessionNoteResponse(BaseModel):
    id: str
    projectId: str
    title: str
    content: str
    metadata: Optional[SessionNoteMetadataSchema]
    createdAt: str
    updatedAt: str

    class Config:
        from_attributes = True


class SessionNoteProjectCreate(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    notes: List[SessionNoteCreate] = []


class SessionNoteProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class SessionNoteProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    notes: List[SessionNoteResponse]
    createdAt: str
    updatedAt: str

    class Config:
        from_attributes = True


class NoteBulkSyncRequest(BaseModel):
    projects: List[SessionNoteProjectCreate]


# Scientific Chat Schemas
class ToolCallSchema(BaseModel):
    id: str
    name: str
    input: dict


class ToolResultSchema(BaseModel):
    tool_call_id: str
    success: bool
    output: Optional[str] = None
    error: Optional[str] = None
    execution_time_ms: int


class ChatMessageCreate(BaseModel):
    content: str
    conversation_id: Optional[str] = None
    session_id: str


class ChatMessageResponse(BaseModel):
    id: str
    role: str
    content: str
    thinking: Optional[str] = None
    tool_calls: Optional[List[ToolCallSchema]] = None
    tool_results: Optional[List[ToolResultSchema]] = None
    created_at: str

    class Config:
        from_attributes = True


class ChatConversationResponse(BaseModel):
    id: str
    session_id: str
    title: str
    message_count: int
    sandbox_dir: str
    model_name: str
    total_tokens_used: int
    created_at: str
    last_message_at: str

    class Config:
        from_attributes = True


class SandboxFileSchema(BaseModel):
    name: str
    path: str
    size: int
    is_dir: bool
    modified_at: str

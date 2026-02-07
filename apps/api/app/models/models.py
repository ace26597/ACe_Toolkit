import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Uuid, Integer, Boolean
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)  # Nullable for OAuth-only users

    # OAuth fields
    oauth_provider = Column(String, nullable=True)  # 'google', 'github', etc.
    oauth_id = Column(String, nullable=True, index=True)  # Provider's user ID
    avatar_url = Column(String, nullable=True)  # Profile picture from OAuth

    # Auth system fields
    is_admin = Column(Boolean, default=False, nullable=False)
    is_approved = Column(Boolean, default=False, nullable=False)
    approved_at = Column(DateTime, nullable=True)
    trial_expires_at = Column(DateTime, nullable=True, index=True)  # 24h from signup for non-approved users
    last_login_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    diagrams = relationship("Diagram", back_populates="owner")
    notes = relationship("Note", back_populates="owner")
    refresh_tokens = relationship("RefreshToken", back_populates="user")

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    token_hash = Column(String, unique=True, index=True, nullable=False)
    user_id = Column(Uuid, ForeignKey("users.id"), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="refresh_tokens")

class Diagram(Base):
    __tablename__ = "diagrams"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    mermaid_code = Column(Text, nullable=False)
    theme = Column(String, default="default")
    user_id = Column(Uuid, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="diagrams")

class Note(Base):
    __tablename__ = "notes"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    user_id = Column(Uuid, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="notes")


# Session-based models (no authentication required)
class SessionProject(Base):
    """Project model for session-based storage (shared across all users)"""
    __tablename__ = "session_projects"

    id = Column(String, primary_key=True)  # Using client-generated string IDs
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    documents_json = Column(Text, nullable=False, default="[]")  # JSON array of documents
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    charts = relationship("SessionChart", back_populates="project", cascade="all, delete-orphan")


class SessionChart(Base):
    """Chart model for session-based storage"""
    __tablename__ = "session_charts"

    id = Column(String, primary_key=True)  # Using client-generated string IDs
    project_id = Column(String, ForeignKey("session_projects.id"), nullable=False)
    document_id = Column(String, nullable=True)  # Reference to parent document
    name = Column(String, nullable=False)
    code = Column(Text, nullable=False)
    editions = Column(Text, nullable=False, default="[]")  # JSON array of editions
    current_edition_id = Column(String, nullable=True)
    metadata_json = Column(Text, nullable=True)  # JSON for chart metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("SessionProject", back_populates="charts")


class SessionNoteProject(Base):
    """Note Project model for session-based storage"""
    __tablename__ = "session_note_projects"

    id = Column(String, primary_key=True)  # Using client-generated string IDs
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    notes = relationship("SessionNote", back_populates="project", cascade="all, delete-orphan")


class SessionNote(Base):
    """Note model for session-based storage"""
    __tablename__ = "session_notes"

    id = Column(String, primary_key=True)  # Using client-generated string IDs
    project_id = Column(String, ForeignKey("session_note_projects.id"), nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    metadata_json = Column(Text, nullable=True)  # JSON for note metadata (e.g. pinned, tags)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("SessionNoteProject", back_populates="notes")


class SkillSession(Base):
    """Terminal session for scientific skills (session-based)"""
    __tablename__ = "skill_sessions"

    id = Column(String, primary_key=True)  # UUID from frontend
    session_id = Column(String, nullable=False, index=True)  # Browser session ID
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    executions = relationship("SkillExecution", back_populates="session", cascade="all, delete-orphan")


class SkillExecution(Base):
    """Track individual skill executions for history/debugging"""
    __tablename__ = "skill_executions"

    id = Column(String, primary_key=True)  # UUID
    session_id = Column(String, ForeignKey("skill_sessions.id"), nullable=False)
    skill_name = Column(String, nullable=False)
    command = Column(Text, nullable=False)
    input_params = Column(Text, nullable=True)  # JSON
    output = Column(Text, nullable=True)
    error = Column(Text, nullable=True)
    status = Column(String, nullable=False)  # "running", "success", "failed"
    execution_time_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("SkillSession", back_populates="executions")


class ChatConversation(Base):
    """Scientific chat conversation with Claude AI"""
    __tablename__ = "chat_conversations"

    id = Column(String, primary_key=True)  # UUID
    session_id = Column(String, nullable=False, index=True)  # Browser session
    title = Column(String, nullable=False)  # Auto-generated from first message
    sandbox_dir = Column(String, nullable=False)  # /tmp/ace_sessions/{id}/
    model_name = Column(String, nullable=False, default="gpt-5.2")
    message_count = Column(Integer, default=0)
    total_tokens_used = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_message_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    messages = relationship("ChatMessage", back_populates="conversation", cascade="all, delete-orphan")


class ChatMessage(Base):
    """Individual message in a chat conversation"""
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True)
    conversation_id = Column(String, ForeignKey("chat_conversations.id"), nullable=False)
    role = Column(String, nullable=False)  # "user" | "assistant"
    content = Column(Text, nullable=False)
    thinking = Column(Text, nullable=True)  # Claude's thinking process
    tool_calls_json = Column(Text, nullable=True)  # JSON array
    tool_results_json = Column(Text, nullable=True)  # JSON array
    streaming_complete = Column(Integer, default=1)  # 0=interrupted, 1=complete
    tokens_used = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("ChatConversation", back_populates="messages")


# Research Assistant models with multi-model support
class ResearchConversation(Base):
    """Research assistant conversation with multi-model support (OpenAI + Anthropic)"""
    __tablename__ = "research_conversations"

    id = Column(String, primary_key=True)  # UUID
    session_id = Column(String, nullable=False, index=True)  # Browser session
    title = Column(String, nullable=False)  # Auto-generated from first message
    sandbox_dir = Column(String, nullable=False)  # /tmp/ace_sessions/{id}/

    # Multi-model configuration
    provider = Column(String, nullable=False, default="openai")  # openai only
    model_name = Column(String, nullable=False, default="gpt-5.2")

    # Workflow metadata
    workflow_type = Column(String, nullable=True)  # "search" | "analysis" | "direct"

    # Usage tracking
    message_count = Column(Integer, default=0)
    total_tokens_used = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)
    last_message_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    messages = relationship("ResearchMessage", back_populates="conversation", cascade="all, delete-orphan")
    files = relationship("UploadedFile", back_populates="conversation", cascade="all, delete-orphan")


class ResearchMessage(Base):
    """Individual message in research conversation with LangGraph workflow state"""
    __tablename__ = "research_messages"

    id = Column(String, primary_key=True)
    conversation_id = Column(String, ForeignKey("research_conversations.id"), nullable=False)
    role = Column(String, nullable=False)  # "user" | "assistant"
    content = Column(Text, nullable=False)

    # Workflow state snapshots
    workflow_steps = Column(Text, nullable=True)  # JSON: [{step, status, timestamp}]
    search_results = Column(Text, nullable=True)  # JSON: Tavily results
    synthesis = Column(Text, nullable=True)  # Final synthesis text
    report = Column(Text, nullable=True)  # Generated report (Markdown)

    # Tool execution
    tool_calls_json = Column(Text, nullable=True)  # MCP tool calls
    tool_results_json = Column(Text, nullable=True)  # MCP tool results

    # Metadata
    streaming_complete = Column(Integer, default=1)  # 0=interrupted, 1=complete
    tokens_used = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("ResearchConversation", back_populates="messages")


class UploadedFile(Base):
    """Files uploaded to research conversation for multi-modal processing"""
    __tablename__ = "uploaded_files"

    id = Column(String, primary_key=True)
    conversation_id = Column(String, ForeignKey("research_conversations.id"), nullable=False)

    # File metadata
    original_filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)  # Path in sandbox
    file_type = Column(String, nullable=False)  # image | pdf | csv | excel | text
    file_size_bytes = Column(Integer, nullable=False)
    mime_type = Column(String, nullable=False)

    # Extracted content
    extracted_content = Column(Text, nullable=True)  # Parsed text/data
    extraction_method = Column(String, nullable=True)  # vision | pypdf | pandas

    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("ResearchConversation", back_populates="files")


# CCResearch - Claude Code Research Platform (Web-based Terminal)
class CCResearchSession(Base):
    """Claude Code terminal session for research"""
    __tablename__ = "ccresearch_sessions"

    id = Column(String, primary_key=True)  # UUID
    session_id = Column(String, nullable=False, index=True)  # Browser session
    email = Column(String, nullable=False, index=True)  # User's email address
    session_number = Column(Integer, nullable=False, default=1)  # Auto-incremented per user
    title = Column(String, nullable=False, default="New Research Session")

    # Optional link to Workspace project (files sync to Workspace)
    workspace_project = Column(String, nullable=True, index=True)

    # Session workspace: /data/claude-workspaces/{id}/ OR project's data/ directory
    workspace_dir = Column(String, nullable=False)

    # Uploaded files (JSON array of filenames in data/ directory)
    uploaded_files = Column(Text, nullable=True)

    # Process state
    pid = Column(Integer, nullable=True)  # pexpect process ID
    status = Column(String, nullable=False, default="created")  # created|active|disconnected|terminated|error
    session_mode = Column(String, nullable=False, default="claude")  # "claude" or "terminal" (direct Pi access)
    custom_working_dir = Column(String, nullable=True)  # Optional: custom working directory for SSH terminal mode

    # Terminal dimensions (for PTY)
    terminal_rows = Column(Integer, default=24)
    terminal_cols = Column(Integer, default=80)

    # Usage tracking
    commands_executed = Column(Integer, default=0)

    # Authentication mode: "oauth" (browser login, uses subscription) or "api_key" (headless, uses API credits)
    auth_mode = Column(String, default="oauth")

    # Admin mode: if True, session runs UNSANDBOXED (full system access)
    # Only set when valid access code is provided
    is_admin = Column(Boolean, default=False)

    # Sharing - public read-only access via token
    share_token = Column(String, nullable=True, unique=True, index=True)  # Random token for public sharing
    shared_at = Column(DateTime, nullable=True)  # When sharing was enabled
    share_expires_at = Column(DateTime, nullable=True, index=True)  # When share link expires (default: 7 days from shared_at)

    # Recording - asciinema .cast v2 format
    recording_path = Column(String, nullable=True)  # Path to .cast file
    has_recording = Column(Boolean, default=False)  # Quick check if recording exists

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    last_activity_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)  # 24 hours from creation


# Legacy: MedResearch - Web-based Claude Code Terminal (kept for backward compatibility)
class MedResearchSession(Base):
    """Claude Code terminal session for medical research QA (LEGACY - use CCResearchSession)"""
    __tablename__ = "medresearch_sessions"

    id = Column(String, primary_key=True)  # UUID
    session_id = Column(String, nullable=False, index=True)  # Browser session
    email = Column(String, nullable=True, index=True)  # User email for tracking
    title = Column(String, nullable=False, default="New Research Session")

    # Session workspace: {DATA_BASE_DIR}/users/{user_id}/projects/{project_name}/
    workspace_dir = Column(String, nullable=False)

    # Optional link to Workspace project (for integrated research)
    workspace_project = Column(String, nullable=True, index=True)  # Project name in Workspace app

    # Process state
    pid = Column(Integer, nullable=True)  # pexpect process ID
    status = Column(String, nullable=False, default="created")  # created|active|disconnected|terminated|error

    # Terminal dimensions (for PTY)
    terminal_rows = Column(Integer, default=24)
    terminal_cols = Column(Integer, default=80)

    # Usage tracking
    commands_executed = Column(Integer, default=0)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    last_activity_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)  # 24 hours from creation


# Research Assistant - Claude Code Headless QA Interface
class ResearchAssistantSession(Base):
    """Research Assistant session using Claude Code headless mode"""
    __tablename__ = "research_assistant_sessions"

    id = Column(String, primary_key=True)  # UUID
    user_id = Column(Uuid, ForeignKey("users.id"), nullable=False, index=True)
    claude_session_id = Column(String, nullable=True)  # Claude's session ID for --resume
    title = Column(String, nullable=False, default="New Research")
    workspace_dir = Column(String, nullable=False)  # /data/users/{user-uuid}/research/{id}
    response_format = Column(String, default="markdown")  # markdown, plain, json
    status = Column(String, default="ready")  # ready, running, error
    turn_count = Column(Integer, default=0)  # Number of conversation turns

    # Public sharing
    share_id = Column(String, nullable=True, unique=True, index=True)  # Random share token
    shared_at = Column(DateTime, nullable=True)

    # Uploaded files (JSON array of filenames)
    uploaded_files = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    last_activity = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User")
    messages = relationship("ResearchAssistantMessage", back_populates="session", cascade="all, delete-orphan")


class ResearchAssistantMessage(Base):
    """Individual message in Research Assistant conversation"""
    __tablename__ = "research_assistant_messages"

    id = Column(String, primary_key=True)  # UUID
    session_id = Column(String, ForeignKey("research_assistant_sessions.id"), nullable=False)
    role = Column(String, nullable=False)  # user, assistant
    content = Column(Text, nullable=False)
    response_format = Column(String, default="markdown")

    # Tool usage tracking (for terminal display)
    tool_calls_json = Column(Text, nullable=True)  # JSON array of tool calls
    thinking_json = Column(Text, nullable=True)  # JSON array of thinking blocks

    # Token usage
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("ResearchAssistantSession", back_populates="messages")

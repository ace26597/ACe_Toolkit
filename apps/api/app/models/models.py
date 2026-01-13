import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Uuid
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
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

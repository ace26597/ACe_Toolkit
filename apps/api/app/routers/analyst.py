"""
Data Analyst API Router
Handles data connections, file uploads, queries, and chart generation
"""
import os
import json
import uuid
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any
from io import BytesIO

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.analyst_manager import analyst_manager, AnalystManager
from app.core.user_access import require_valid_access, get_user_analyst_dir
from app.models.models import User

import pandas as pd
import numpy as np

# Optional imports - gracefully handle missing dependencies
try:
    import plotly.express as px
    import plotly.graph_objects as go
    PLOTLY_AVAILABLE = True
except ImportError:
    PLOTLY_AVAILABLE = False

try:
    from sqlalchemy import create_engine, text, inspect
    from sqlalchemy.engine import Engine
    SQLALCHEMY_AVAILABLE = True
except ImportError:
    SQLALCHEMY_AVAILABLE = False

try:
    import openpyxl
    EXCEL_AVAILABLE = True
except ImportError:
    EXCEL_AVAILABLE = False

try:
    from pdf2image import convert_from_path, convert_from_bytes
    PDF2IMAGE_AVAILABLE = True
except ImportError:
    PDF2IMAGE_AVAILABLE = False

try:
    import pypdf
    PYPDF_AVAILABLE = True
except ImportError:
    PYPDF_AVAILABLE = False

try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False

router = APIRouter()

# AACT Clinical Trials Database - loaded from environment via settings
# Credentials stored in .env file (gitignored) - never hardcode here!


# ============== User-Scoped Helpers ==============

def get_user_analyst_dir_path(user: User) -> Path:
    """Get analyst directory for this user."""
    user_dir = get_user_analyst_dir(user)
    user_dir.mkdir(parents=True, exist_ok=True)
    return user_dir


def _load_project(project_dir: Path) -> dict | None:
    """Load project from disk."""
    project_file = project_dir / "project.json"
    if not project_file.exists():
        return None
    with open(project_file) as f:
        return json.load(f)


def _save_project(project_dir: Path, project: dict):
    """Save project to disk."""
    with open(project_dir / "project.json", "w") as f:
        json.dump(project, f, indent=2, default=str)


def _load_data_source(project_dir: Path, ds_id: str) -> dict | None:
    """Load data source metadata from disk."""
    meta_file = project_dir / "data" / f"{ds_id}.meta.json"
    if not meta_file.exists():
        return None
    with open(meta_file) as f:
        return json.load(f)


def _save_data_source(project_dir: Path, ds: dict):
    """Save data source metadata to disk."""
    data_dir = project_dir / "data"
    data_dir.mkdir(exist_ok=True)
    with open(data_dir / f"{ds['id']}.meta.json", "w") as f:
        json.dump(ds, f, indent=2, default=str)


def _load_all_data_sources(project_dir: Path) -> List[dict]:
    """Load all data sources for a project from disk."""
    data_dir = project_dir / "data"
    if not data_dir.exists():
        return []
    sources = []
    for meta_file in data_dir.glob("*.meta.json"):
        try:
            with open(meta_file) as f:
                sources.append(json.load(f))
        except Exception:
            pass
    return sources


def _get_data_source(user: User, project_id: str, ds_id: str) -> dict | None:
    """Get a data source by ID for a user's project."""
    user_dir = get_user_analyst_dir_path(user)
    project_dir = user_dir / project_id
    return _load_data_source(project_dir, ds_id)


def _load_conversation(project_dir: Path, ds_id: str) -> list:
    """Load conversation history for a data source."""
    conv_file = project_dir / "conversations" / f"{ds_id}.json"
    if not conv_file.exists():
        return []
    with open(conv_file) as f:
        return json.load(f)


def _save_conversation(project_dir: Path, ds_id: str, messages: list):
    """Save conversation history."""
    conv_dir = project_dir / "conversations"
    conv_dir.mkdir(exist_ok=True)
    with open(conv_dir / f"{ds_id}.json", "w") as f:
        json.dump(messages, f, indent=2, default=str)


# ============== Pydantic Models ==============

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    data_sources: List[str]
    dashboards: List[str]
    created_at: str
    updated_at: str


class DataSourceInfo(BaseModel):
    id: str
    project_id: str
    name: str
    type: str  # csv, excel, sqlite, postgresql, pdf, aact
    status: str  # connected, disconnected, error
    file_path: Optional[str] = None
    connection_string: Optional[str] = None
    tables: Optional[List[str]] = None
    columns: Optional[List[Dict[str, str]]] = None
    row_count: Optional[int] = None
    created_at: str


class DatabaseConnection(BaseModel):
    project_id: str
    name: str
    db_type: str  # postgresql, sqlite, mysql
    connection_string: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = None
    database: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None


class QueryRequest(BaseModel):
    project_id: str
    data_source_id: str
    query: str  # Natural language or SQL
    query_type: str = "natural"  # natural, sql, pandas


class ChartRequest(BaseModel):
    project_id: str
    data_source_id: str
    chart_type: str  # bar, line, scatter, pie, heatmap, histogram, box, table
    x_column: Optional[str] = None
    y_column: Optional[str] = None
    color_column: Optional[str] = None
    title: Optional[str] = None
    query: Optional[str] = None  # Optional filter query


class SchemaInfo(BaseModel):
    columns: List[Dict[str, Any]]
    row_count: int
    sample_data: List[Dict[str, Any]]
    statistics: Optional[Dict[str, Any]] = None


class NLAnalysisRequest(BaseModel):
    project_id: str
    data_source_id: str
    question: str  # Natural language question
    include_chart: bool = True  # Whether to suggest/generate charts


class ConversationMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class NLConversationRequest(BaseModel):
    project_id: str
    data_source_id: str
    messages: List[ConversationMessage]  # Full conversation history
    include_chart: bool = True


# ============== Helper Functions ==============

def get_project_dir(user: User, project_id: str) -> Path:
    """Get the directory for a user's project"""
    user_dir = get_user_analyst_dir_path(user)
    project_dir = user_dir / project_id
    project_dir.mkdir(parents=True, exist_ok=True)
    return project_dir


def ensure_dashboard_loaded(user: User, dashboard_id: str) -> Dict:
    """Load a dashboard from disk. Returns the dashboard or raises 404."""
    user_dir = get_user_analyst_dir_path(user)

    # Search through user's projects for this dashboard
    for project_dir in user_dir.iterdir():
        if not project_dir.is_dir():
            continue
        dashboard_file = project_dir / "dashboards" / f"{dashboard_id}.json"
        if dashboard_file.exists():
            with open(dashboard_file) as f:
                return json.load(f)

    raise HTTPException(status_code=404, detail="Dashboard not found")


def load_dataframe(data_source: Dict) -> pd.DataFrame:
    """Load data from a data source into a pandas DataFrame"""
    ds_type = data_source.get("type")
    file_path = data_source.get("file_path")

    if ds_type == "csv" and file_path:
        return pd.read_csv(file_path)
    elif ds_type == "excel" and file_path:
        return pd.read_excel(file_path)
    elif ds_type == "json" and file_path:
        # Handle various JSON structures
        with open(file_path, 'r') as f:
            data = json.load(f)
        # If it's a list of objects, convert directly
        if isinstance(data, list):
            return pd.DataFrame(data)
        # If it's an object with a data key, use that
        elif isinstance(data, dict):
            # Try common keys for data arrays
            for key in ['data', 'records', 'items', 'results', 'rows']:
                if key in data and isinstance(data[key], list):
                    return pd.DataFrame(data[key])
            # Otherwise, try to normalize the entire object
            return pd.json_normalize(data)
        else:
            raise ValueError("JSON structure not supported - expected array or object")
    elif ds_type in ("sqlite", "postgresql", "mysql"):
        conn_str = data_source.get("connection_string")
        if conn_str and SQLALCHEMY_AVAILABLE:
            engine = create_engine(conn_str)
            # For now, return empty - need table selection
            return pd.DataFrame()

    raise ValueError(f"Cannot load data from source type: {ds_type}")


def get_dataframe_schema(df: pd.DataFrame) -> Dict[str, Any]:
    """Extract schema information from a DataFrame"""
    columns = []
    for col in df.columns:
        dtype = str(df[col].dtype)
        columns.append({
            "name": col,
            "type": dtype,
            "nullable": bool(df[col].isnull().any()),
            "unique_count": int(df[col].nunique()),
            "sample_values": df[col].dropna().head(3).tolist()
        })

    # Basic statistics for numeric columns
    stats = {}
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    if len(numeric_cols) > 0:
        stats = df[numeric_cols].describe().to_dict()

    return {
        "columns": columns,
        "row_count": len(df),
        "sample_data": df.head(5).to_dict(orient="records"),
        "statistics": stats
    }


def generate_plotly_chart(df: pd.DataFrame, chart_config: Dict) -> Dict:
    """Generate a Plotly chart configuration"""
    if not PLOTLY_AVAILABLE:
        raise HTTPException(status_code=500, detail="Plotly not installed")

    chart_type = chart_config.get("chart_type", "bar")
    x_col = chart_config.get("x_column")
    y_col = chart_config.get("y_column")
    color_col = chart_config.get("color_column")
    title = chart_config.get("title", "Chart")

    fig = None

    if chart_type == "bar":
        fig = px.bar(df, x=x_col, y=y_col, color=color_col, title=title)
    elif chart_type == "line":
        fig = px.line(df, x=x_col, y=y_col, color=color_col, title=title)
    elif chart_type == "scatter":
        fig = px.scatter(df, x=x_col, y=y_col, color=color_col, title=title)
    elif chart_type == "pie":
        fig = px.pie(df, names=x_col, values=y_col, title=title)
    elif chart_type == "histogram":
        fig = px.histogram(df, x=x_col, color=color_col, title=title)
    elif chart_type == "box":
        fig = px.box(df, x=x_col, y=y_col, color=color_col, title=title)
    elif chart_type == "heatmap":
        # For heatmap, compute correlation matrix
        numeric_df = df.select_dtypes(include=[np.number])
        corr = numeric_df.corr()
        fig = px.imshow(corr, title=title or "Correlation Heatmap", text_auto=True)
    else:
        raise ValueError(f"Unsupported chart type: {chart_type}")

    # Return the figure as JSON
    return json.loads(fig.to_json())


# ============== API Endpoints ==============

@router.get("/status")
async def get_status():
    """Check analyst API status and available features"""
    return {
        "status": "ok",
        "features": {
            "plotly": PLOTLY_AVAILABLE,
            "sqlalchemy": SQLALCHEMY_AVAILABLE,
            "excel": EXCEL_AVAILABLE,
            "pdf_to_image": PDF2IMAGE_AVAILABLE,
            "pypdf": PYPDF_AVAILABLE,
            "aact_preset": True,
        },
    }


# ============== Project Management ==============

@router.post("/projects", response_model=ProjectResponse)
async def create_project(
    project: ProjectCreate,
    user: User = Depends(require_valid_access)
):
    """Create a new analysis project"""
    project_id = str(uuid.uuid4())[:8]
    now = datetime.now().isoformat()

    project_data = {
        "id": project_id,
        "name": project.name,
        "description": project.description,
        "data_sources": [],
        "dashboards": [],
        "created_at": now,
        "updated_at": now,
    }

    # Create project directory under user's analyst folder
    project_dir = get_project_dir(user, project_id)
    (project_dir / "data").mkdir(exist_ok=True)
    (project_dir / "charts").mkdir(exist_ok=True)
    (project_dir / "dashboards").mkdir(exist_ok=True)
    (project_dir / "conversations").mkdir(exist_ok=True)

    # Save project metadata
    _save_project(project_dir, project_data)

    return ProjectResponse(**project_data)


@router.get("/projects")
async def list_projects(user: User = Depends(require_valid_access)):
    """List all analysis projects for the current user"""
    user_dir = get_user_analyst_dir_path(user)
    results = []

    for project_dir in user_dir.iterdir():
        if not project_dir.is_dir():
            continue
        project_data = _load_project(project_dir)
        if project_data:
            # Count actual data sources from disk
            data_sources = _load_all_data_sources(project_dir)
            project_data["data_sources"] = [ds["id"] for ds in data_sources]
            results.append(project_data)

    return results


@router.get("/projects/{project_id}")
async def get_project(project_id: str, user: User = Depends(require_valid_access)):
    """Get a specific project"""
    user_dir = get_user_analyst_dir_path(user)
    project_dir = user_dir / project_id
    project_data = _load_project(project_dir)

    if not project_data:
        raise HTTPException(status_code=404, detail="Project not found")

    # Load actual data sources
    data_sources = _load_all_data_sources(project_dir)
    project_data["data_sources"] = [ds["id"] for ds in data_sources]

    return project_data


@router.delete("/projects/{project_id}")
async def delete_project(project_id: str, user: User = Depends(require_valid_access)):
    """Delete a project and all its data"""
    import shutil

    user_dir = get_user_analyst_dir_path(user)
    project_dir = user_dir / project_id

    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project not found")

    shutil.rmtree(project_dir)

    return {"status": "deleted", "project_id": project_id}


# ============== Data Source Management ==============

@router.post("/projects/{project_id}/upload")
async def upload_file(
    project_id: str,
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
    user: User = Depends(require_valid_access)
):
    """Upload a file (CSV, Excel, JSON, PDF) to a project"""
    user_dir = get_user_analyst_dir_path(user)
    project_dir = user_dir / project_id

    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project not found")

    # Determine file type
    filename = file.filename or "uploaded_file"
    ext = filename.split(".")[-1].lower()

    if ext not in ("csv", "xlsx", "xls", "pdf", "json"):
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}. Supported: csv, xlsx, xls, json, pdf")

    # Save file
    data_dir = project_dir / "data"
    data_dir.mkdir(exist_ok=True)
    file_path = data_dir / filename

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # Create data source entry
    ds_id = str(uuid.uuid4())[:8]
    ds_type = "csv" if ext == "csv" else "excel" if ext in ("xlsx", "xls") else "json" if ext == "json" else "pdf"

    # Extract schema for tabular data
    schema_info = None
    if ds_type in ("csv", "excel", "json"):
        try:
            if ds_type == "csv":
                df = pd.read_csv(file_path)
            elif ds_type == "excel":
                df = pd.read_excel(file_path)
            elif ds_type == "json":
                # Handle various JSON structures
                with open(file_path, 'r') as jf:
                    data = json.load(jf)
                if isinstance(data, list):
                    df = pd.DataFrame(data)
                elif isinstance(data, dict):
                    for key in ['data', 'records', 'items', 'results', 'rows']:
                        if key in data and isinstance(data[key], list):
                            df = pd.DataFrame(data[key])
                            break
                    else:
                        df = pd.json_normalize(data)
                else:
                    raise ValueError("JSON structure not supported")
            schema_info = get_dataframe_schema(df)
        except Exception as e:
            schema_info = {"error": str(e)}

    data_source = {
        "id": ds_id,
        "project_id": project_id,
        "name": name or filename,
        "type": ds_type,
        "status": "connected",
        "file_path": str(file_path),
        "columns": schema_info.get("columns") if schema_info else None,
        "row_count": schema_info.get("row_count") if schema_info else None,
        "created_at": datetime.now().isoformat(),
    }

    # Save data source metadata
    _save_data_source(project_dir, data_source)

    # Update project timestamp
    project_data = _load_project(project_dir)
    if project_data:
        project_data["updated_at"] = datetime.now().isoformat()
        _save_project(project_dir, project_data)

    return {
        "data_source": data_source,
        "schema": schema_info
    }


@router.post("/projects/{project_id}/data-sources/{ds_id}/extract-pdf")
async def extract_pdf_content(
    project_id: str,
    ds_id: str,
    page_numbers: Optional[List[int]] = None,
    user: User = Depends(require_valid_access)
):
    """
    Extract content from a PDF using Claude's vision API.
    Can extract text, tables, and structured data from scanned documents.
    """
    ds = _get_data_source(user, project_id, ds_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Data source not found")

    if ds["type"] != "pdf":
        raise HTTPException(status_code=400, detail="Not a PDF data source")

    if not ANTHROPIC_AVAILABLE:
        raise HTTPException(status_code=500, detail="Anthropic SDK not installed")

    file_path = Path(ds["file_path"])
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="PDF file not found")

    # Try to extract text with pypdf first (for text-based PDFs)
    extracted_text = ""
    if PYPDF_AVAILABLE:
        try:
            reader = pypdf.PdfReader(str(file_path))
            for i, page in enumerate(reader.pages):
                if page_numbers is None or i in page_numbers:
                    text = page.extract_text()
                    if text:
                        extracted_text += f"\n--- Page {i+1} ---\n{text}"
        except Exception as e:
            extracted_text = f"Error extracting text: {e}"

    # For scanned PDFs or when we need table extraction, use Claude Vision
    images_extracted = []
    if PDF2IMAGE_AVAILABLE:
        try:
            # Convert PDF pages to images
            images = convert_from_path(str(file_path), dpi=150)
            target_pages = page_numbers if page_numbers else range(min(5, len(images)))  # Max 5 pages

            for i in target_pages:
                if i < len(images):
                    # Save image temporarily
                    img_path = file_path.parent / f"page_{i+1}.png"
                    images[i].save(str(img_path), "PNG")
                    images_extracted.append({"page": i+1, "path": str(img_path)})
        except Exception as e:
            return {
                "text_content": extracted_text,
                "ocr_available": False,
                "error": f"Could not convert PDF to images: {e}"
            }

    # Use Claude Vision for OCR if we have images
    ocr_results = []
    if images_extracted and ANTHROPIC_AVAILABLE:
        import base64

        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        for img_info in images_extracted[:5]:  # Max 5 pages for cost control
            try:
                with open(img_info["path"], "rb") as f:
                    image_data = base64.standard_b64encode(f.read()).decode("utf-8")

                response = client.messages.create(
                    model="claude-sonnet-4-20250514",
                    max_tokens=4000,
                    messages=[{
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": "image/png",
                                    "data": image_data
                                }
                            },
                            {
                                "type": "text",
                                "text": """Extract all text, tables, and data from this document image.

If there are tables, format them as markdown tables.
If there are forms with fields, list each field and its value.
Preserve the document structure as much as possible.

Return the extracted content in a clear, organized format."""
                            }
                        ]
                    }]
                )

                ocr_results.append({
                    "page": img_info["page"],
                    "content": response.content[0].text
                })

                # Clean up temp image
                try:
                    Path(img_info["path"]).unlink()
                except:
                    pass

            except Exception as e:
                ocr_results.append({
                    "page": img_info["page"],
                    "error": str(e)
                })

    # Try to parse tables from OCR results
    tables_found = []
    for result in ocr_results:
        if "content" in result:
            # Look for markdown tables
            import re
            table_pattern = r'\|[^\n]+\|[\s\S]*?\n(?:\|[-:]+\|)+\n(?:\|[^\n]+\|\n?)+'
            tables = re.findall(table_pattern, result["content"])
            for table in tables:
                tables_found.append({
                    "page": result["page"],
                    "markdown": table
                })

    return {
        "text_content": extracted_text if extracted_text else None,
        "ocr_results": ocr_results if ocr_results else None,
        "tables_found": tables_found if tables_found else None,
        "pages_processed": len(ocr_results),
        "pdf_info": {
            "file_name": file_path.name,
            "file_size": file_path.stat().st_size
        }
    }


@router.post("/projects/{project_id}/data-sources/{ds_id}/pdf-to-table")
async def convert_pdf_table_to_dataframe(
    project_id: str,
    ds_id: str,
    table_markdown: str,
    table_name: Optional[str] = None,
    user: User = Depends(require_valid_access)
):
    """
    Convert a markdown table extracted from PDF to a CSV data source.
    """
    ds = _get_data_source(user, project_id, ds_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Data source not found")

    # Parse markdown table
    lines = [line.strip() for line in table_markdown.strip().split('\n') if line.strip()]

    if len(lines) < 2:
        raise HTTPException(status_code=400, detail="Invalid table format")

    # Extract headers
    headers = [h.strip() for h in lines[0].split('|') if h.strip()]

    # Skip separator line
    data_rows = []
    for line in lines[2:]:  # Skip header and separator
        if line.startswith('|'):
            cells = [c.strip() for c in line.split('|') if c.strip()]
            if len(cells) == len(headers):
                data_rows.append(cells)

    if not data_rows:
        raise HTTPException(status_code=400, detail="No data rows found in table")

    # Create DataFrame
    df = pd.DataFrame(data_rows, columns=headers)

    # Save as CSV
    new_ds_id = str(uuid.uuid4())[:8]
    project_dir = get_project_dir(user, project_id)
    csv_filename = f"{table_name or 'extracted_table'}_{new_ds_id}.csv"
    csv_path = project_dir / "data" / csv_filename

    df.to_csv(csv_path, index=False)

    # Create new data source
    schema_info = get_dataframe_schema(df)

    new_data_source = {
        "id": new_ds_id,
        "project_id": project_id,
        "name": table_name or f"Table from {ds['name']}",
        "type": "csv",
        "status": "connected",
        "file_path": str(csv_path),
        "columns": schema_info.get("columns"),
        "row_count": len(df),
        "created_at": datetime.now().isoformat(),
        "source_pdf": ds_id
    }

    # Save new data source
    _save_data_source(project_dir, new_data_source)

    return {
        "data_source": new_data_source,
        "schema": schema_info,
        "preview": df.head(10).to_dict(orient="records")
    }


@router.post("/projects/{project_id}/connect-database")
async def connect_database(
    project_id: str,
    connection: DatabaseConnection,
    user: User = Depends(require_valid_access)
):
    """Connect to a database"""
    user_dir = get_user_analyst_dir_path(user)
    project_dir = user_dir / project_id

    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project not found")

    if not SQLALCHEMY_AVAILABLE:
        raise HTTPException(status_code=500, detail="SQLAlchemy not installed")

    # Build connection string
    if connection.connection_string:
        conn_str = connection.connection_string
    else:
        if connection.db_type == "postgresql":
            conn_str = f"postgresql://{connection.username}:{connection.password}@{connection.host}:{connection.port or 5432}/{connection.database}"
        elif connection.db_type == "sqlite":
            conn_str = f"sqlite:///{connection.database}"
        elif connection.db_type == "mysql":
            conn_str = f"mysql+pymysql://{connection.username}:{connection.password}@{connection.host}:{connection.port or 3306}/{connection.database}"
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported database type: {connection.db_type}")

    # Test connection and get tables
    try:
        engine = create_engine(conn_str)
        inspector = inspect(engine)
        tables = inspector.get_table_names()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Connection failed: {str(e)}")

    # Create data source entry
    ds_id = str(uuid.uuid4())[:8]

    data_source = {
        "id": ds_id,
        "project_id": project_id,
        "name": connection.name,
        "type": connection.db_type,
        "status": "connected",
        "connection_string": conn_str,
        "tables": tables,
        "created_at": datetime.now().isoformat(),
    }

    # Save data source
    _save_data_source(project_dir, data_source)

    # Update project timestamp
    project_data = _load_project(project_dir)
    if project_data:
        project_data["updated_at"] = datetime.now().isoformat()
        _save_project(project_dir, project_data)

    return data_source


@router.post("/projects/{project_id}/connect-aact")
async def connect_aact(
    project_id: str,
    user: User = Depends(require_valid_access)
):
    """Connect to the AACT Clinical Trials database (preset connection)"""
    from urllib.parse import quote_plus

    user_dir = get_user_analyst_dir_path(user)
    project_dir = user_dir / project_id

    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project not found")

    if not SQLALCHEMY_AVAILABLE:
        raise HTTPException(status_code=500, detail="SQLAlchemy not installed")

    # Check if AACT credentials are configured
    if not settings.AACT_DB_HOST or not settings.AACT_DB_USER or not settings.AACT_DB_PASSWORD:
        raise HTTPException(
            status_code=500,
            detail="AACT database credentials not configured. Set AACT_DB_* in .env file."
        )

    # Build AACT connection string with URL-encoded password (handles special chars like !)
    encoded_password = quote_plus(settings.AACT_DB_PASSWORD)
    conn_str = f"postgresql://{settings.AACT_DB_USER}:{encoded_password}@{settings.AACT_DB_HOST}:{settings.AACT_DB_PORT or 5432}/{settings.AACT_DB_NAME or 'aact'}"

    # Test connection and get tables
    try:
        engine = create_engine(conn_str)
        inspector = inspect(engine)
        # Get only ctgov schema tables (main clinical trials data)
        tables = inspector.get_table_names(schema='ctgov')
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Connection to AACT failed: {str(e)}")

    # Create data source entry
    ds_id = str(uuid.uuid4())[:8]

    data_source = {
        "id": ds_id,
        "project_id": project_id,
        "name": "AACT Clinical Trials",
        "type": "postgresql",
        "status": "connected",
        "connection_string": conn_str,
        "tables": tables,
        "schema": "ctgov",
        "is_aact": True,
        "created_at": datetime.now().isoformat(),
    }

    # Save data source
    _save_data_source(project_dir, data_source)

    # Update project timestamp
    project_data = _load_project(project_dir)
    if project_data:
        project_data["updated_at"] = datetime.now().isoformat()
        _save_project(project_dir, project_data)

    return {
        "data_source": data_source,
        "message": f"Connected to AACT. Found {len(tables)} tables in ctgov schema.",
        "popular_tables": ["studies", "sponsors", "facilities", "interventions", "conditions", "outcomes", "eligibilities"]
    }


@router.get("/projects/{project_id}/data-sources")
async def list_data_sources(project_id: str, user: User = Depends(require_valid_access)):
    """List all data sources for a project"""
    user_dir = get_user_analyst_dir_path(user)
    project_dir = user_dir / project_id

    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project not found")

    return _load_all_data_sources(project_dir)


@router.get("/projects/{project_id}/data-sources/{ds_id}/schema")
async def get_data_source_schema(
    project_id: str,
    ds_id: str,
    user: User = Depends(require_valid_access)
):
    """Get schema information for a data source"""
    ds = _get_data_source(user, project_id, ds_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Data source not found")

    if ds["type"] in ("csv", "excel", "json"):
        df = load_dataframe(ds)
        return get_dataframe_schema(df)
    elif ds["type"] in ("sqlite", "postgresql", "mysql"):
        # Return table list and allow drilling down
        return {
            "type": "database",
            "tables": ds.get("tables", []),
            "schema": ds.get("schema"),
            "is_aact": ds.get("is_aact", False),
            "message": "Use /projects/{project_id}/data-sources/{ds_id}/tables/{table_name}/schema for table schema"
        }

    return {"error": "Cannot get schema for this data source type"}


@router.get("/projects/{project_id}/data-sources/{ds_id}/preview")
async def preview_data(
    project_id: str,
    ds_id: str,
    limit: int = 100,
    table_name: Optional[str] = None,
    user: User = Depends(require_valid_access)
):
    """Preview data from a data source"""
    ds = _get_data_source(user, project_id, ds_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Data source not found")

    if ds["type"] in ("csv", "excel", "json"):
        df = load_dataframe(ds)
        return {
            "columns": list(df.columns),
            "data": df.head(limit).to_dict(orient="records"),
            "total_rows": len(df)
        }
    elif ds["type"] in ("postgresql", "mysql", "sqlite") and table_name:
        # Preview data from a database table
        try:
            engine = create_engine(ds["connection_string"])
            schema = ds.get("schema")
            qualified_table = f"{schema}.{table_name}" if schema else table_name
            df = pd.read_sql(f"SELECT * FROM {qualified_table} LIMIT {limit}", engine)
            return {
                "columns": list(df.columns),
                "data": df.to_dict(orient="records"),
                "total_rows": len(df),
                "table_name": table_name
            }
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Query failed: {str(e)}")

    return {"error": "Preview not available for this data source type. For databases, provide table_name parameter."}


# ============== Query & Analysis ==============

@router.post("/projects/{project_id}/query")
async def execute_query(
    project_id: str,
    request: QueryRequest,
    user: User = Depends(require_valid_access)
):
    """Execute a query on a data source"""
    ds = _get_data_source(user, project_id, request.data_source_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Data source not found")

    # For now, only handle SQL queries on tabular data
    if ds["type"] in ("csv", "excel"):
        df = load_dataframe(ds)

        if request.query_type == "sql":
            # Use pandasql or similar
            try:
                import pandasql as psql
                result = psql.sqldf(request.query, {"data": df})
                return {
                    "columns": list(result.columns),
                    "data": result.to_dict(orient="records"),
                    "row_count": len(result)
                }
            except ImportError:
                raise HTTPException(status_code=500, detail="pandasql not installed")
        else:
            # Natural language query - will be handled by Claude Code integration
            return {
                "message": "Natural language queries require Claude Code integration",
                "hint": "Use the /analyst/chat endpoint"
            }

    elif ds["type"] in ("sqlite", "postgresql", "mysql"):
        if request.query_type == "sql":
            try:
                engine = create_engine(ds["connection_string"])
                # For AACT, prepend schema if needed
                query = request.query
                schema = ds.get("schema")
                with engine.connect() as conn:
                    result = pd.read_sql(query, conn)
                    return {
                        "columns": list(result.columns),
                        "data": result.to_dict(orient="records"),
                        "row_count": len(result)
                    }
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Query failed: {str(e)}")

    return {"error": "Query not supported for this data source"}


# ============== Chart Generation ==============

@router.post("/projects/{project_id}/chart")
async def generate_chart(
    project_id: str,
    request: ChartRequest,
    user: User = Depends(require_valid_access)
):
    """Generate a chart from data"""
    ds = _get_data_source(user, project_id, request.data_source_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Data source not found")

    # Load data
    if ds["type"] in ("csv", "excel"):
        df = load_dataframe(ds)
    else:
        raise HTTPException(status_code=400, detail="Charts only supported for CSV/Excel currently")

    # Apply optional query filter
    if request.query:
        try:
            df = df.query(request.query)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid query: {str(e)}")

    # Generate chart
    chart_config = {
        "chart_type": request.chart_type,
        "x_column": request.x_column,
        "y_column": request.y_column,
        "color_column": request.color_column,
        "title": request.title,
    }

    chart_json = generate_plotly_chart(df, chart_config)

    return {
        "chart": chart_json,
        "data_points": len(df)
    }


# ============== Natural Language Analysis ==============

def build_data_context(df: pd.DataFrame, max_rows: int = 10) -> str:
    """Build context string for Claude with schema and sample data"""
    schema_info = get_dataframe_schema(df)

    # Build column descriptions
    columns_desc = []
    for col in schema_info["columns"]:
        sample_vals = ", ".join(str(v) for v in col.get("sample_values", [])[:3])
        columns_desc.append(
            f"  - {col['name']} ({col['type']}): {col['unique_count']} unique values. Examples: {sample_vals}"
        )

    # Sample data as markdown table
    sample_df = df.head(max_rows)
    sample_table = sample_df.to_markdown(index=False)

    # Statistics summary for numeric columns
    stats_summary = ""
    if schema_info.get("statistics"):
        stats_lines = []
        for col, stats in schema_info["statistics"].items():
            if "mean" in stats:
                stats_lines.append(f"  - {col}: mean={stats['mean']:.2f}, min={stats['min']:.2f}, max={stats['max']:.2f}")
        if stats_lines:
            stats_summary = "\n\nNumeric Column Statistics:\n" + "\n".join(stats_lines)

    context = f"""Dataset Information:
- Total rows: {len(df)}
- Total columns: {len(df.columns)}

Columns:
{chr(10).join(columns_desc)}
{stats_summary}

Sample Data (first {min(max_rows, len(df))} rows):
{sample_table}
"""
    return context


@router.post("/projects/{project_id}/analyze")
async def analyze_with_nl(
    project_id: str,
    request: NLAnalysisRequest,
    user: User = Depends(require_valid_access)
):
    """
    Analyze data using natural language with Claude.
    Returns insights, optionally with SQL/pandas code and chart suggestions.
    """
    if not ANTHROPIC_AVAILABLE:
        raise HTTPException(status_code=500, detail="Anthropic SDK not installed")

    ds = _get_data_source(user, project_id, request.data_source_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Data source not found")

    # Load data
    if ds["type"] not in ("csv", "excel"):
        raise HTTPException(status_code=400, detail="NL analysis only supports CSV/Excel currently")

    df = load_dataframe(ds)
    data_context = build_data_context(df)

    # Build Claude prompt
    system_prompt = """You are a data analyst assistant. You help users understand and analyze their data.

When responding:
1. First, provide a clear, conversational answer to the user's question
2. If helpful, include relevant statistics or insights from the data
3. If the question requires computation, provide the pandas code in a ```python block
4. If a visualization would help, suggest a chart configuration in JSON format in a ```json block with this structure:
   {"chart_type": "bar|line|scatter|pie|histogram|box|heatmap", "x_column": "...", "y_column": "...", "color_column": "...", "title": "..."}

The dataset is available as a pandas DataFrame called 'df'.
Always reference actual column names from the schema provided."""

    user_prompt = f"""Here is the dataset I'm working with:

{data_context}

My question: {request.question}"""

    # Call Claude
    try:
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}]
        )

        assistant_response = response.content[0].text

        # Parse response for code blocks
        result = {
            "answer": assistant_response,
            "code": None,
            "chart_config": None,
            "query_result": None,
            "chart": None
        }

        # Extract Python code if present
        import re
        python_match = re.search(r'```python\n(.*?)\n```', assistant_response, re.DOTALL)
        if python_match:
            result["code"] = python_match.group(1)

            # Try to execute the code safely
            try:
                local_vars = {"df": df, "pd": pd, "np": np}
                exec(result["code"], {"pd": pd, "np": np, "__builtins__": {}}, local_vars)

                # Check if result was computed
                if "result" in local_vars:
                    res = local_vars["result"]
                    if isinstance(res, pd.DataFrame):
                        result["query_result"] = {
                            "columns": list(res.columns),
                            "data": res.head(100).to_dict(orient="records"),
                            "row_count": len(res)
                        }
                    elif isinstance(res, pd.Series):
                        result["query_result"] = {
                            "data": res.to_dict(),
                            "row_count": len(res)
                        }
                    else:
                        result["query_result"] = {"value": str(res)}
            except Exception as e:
                result["code_error"] = str(e)

        # Extract chart config if present
        json_match = re.search(r'```json\n(.*?)\n```', assistant_response, re.DOTALL)
        if json_match and request.include_chart:
            try:
                chart_config = json.loads(json_match.group(1))
                result["chart_config"] = chart_config

                # Generate the chart
                if PLOTLY_AVAILABLE and chart_config.get("chart_type"):
                    try:
                        chart_json = generate_plotly_chart(df, chart_config)
                        result["chart"] = chart_json
                    except Exception as e:
                        result["chart_error"] = str(e)
            except json.JSONDecodeError:
                pass

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Claude API error: {str(e)}")


@router.post("/projects/{project_id}/chat")
async def chat_with_data(
    project_id: str,
    request: NLConversationRequest,
    user: User = Depends(require_valid_access)
):
    """
    Multi-turn conversation about data using Claude Code instance.
    Maintains conversation context via Claude Code's --resume flag.
    Saves conversation history to disk.
    """
    import logging
    logger = logging.getLogger("analyst.chat")

    user_dir = get_user_analyst_dir_path(user)
    project_dir = user_dir / project_id
    project_data = _load_project(project_dir)

    if not project_data:
        raise HTTPException(status_code=404, detail="Project not found")

    ds = _get_data_source(user, project_id, request.data_source_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Data source not found")

    if ds["type"] not in ("csv", "excel", "postgresql", "mysql", "sqlite"):
        raise HTTPException(status_code=400, detail="Chat only supports CSV/Excel/Database sources")

    # Get the last user message (the current question)
    if not request.messages:
        raise HTTPException(status_code=400, detail="No messages provided")

    last_message = request.messages[-1]
    if last_message.role != "user":
        raise HTTPException(status_code=400, detail="Last message must be from user")

    question = last_message.content

    # Load existing conversation history
    history = _load_conversation(project_dir, request.data_source_id)

    # Add user message to history
    history.append({
        "role": "user",
        "content": question,
        "timestamp": datetime.now().isoformat()
    })

    try:
        # Get or create analyst session with user-scoped base_dir
        schema_info = get_dataframe_schema(load_dataframe(ds)) if ds["type"] in ("csv", "excel") else {"tables": ds.get("tables", [])}

        session = analyst_manager.get_or_create_session(
            project_id=project_id,
            project_name=project_data.get("name", "Untitled"),
            data_source_id=request.data_source_id,
            data_source_name=ds.get("name", "data"),
            data_file_path=ds.get("file_path", ""),
            data_schema=schema_info,
            base_dir=user_dir  # Use user's analyst directory
        )

        # Ask the question using Claude Code
        result = await analyst_manager.ask_question(
            session_id=session.id,
            question=question,
            include_chart=request.include_chart
        )

        # Add assistant response to history
        history.append({
            "role": "assistant",
            "content": result.get("response", ""),
            "charts": result.get("charts", []),
            "timestamp": datetime.now().isoformat()
        })

        # Save updated conversation
        _save_conversation(project_dir, request.data_source_id, history)

        return result

    except Exception as e:
        logger.error(f"Chat endpoint error: {type(e).__name__}: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")


@router.get("/projects/{project_id}/data-sources/{ds_id}/conversation")
async def get_conversation_history(
    project_id: str,
    ds_id: str,
    user: User = Depends(require_valid_access)
):
    """Get conversation history for a data source"""
    user_dir = get_user_analyst_dir_path(user)
    project_dir = user_dir / project_id

    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project not found")

    history = _load_conversation(project_dir, ds_id)
    return {"messages": history}


@router.delete("/projects/{project_id}/data-sources/{ds_id}/conversation")
async def clear_conversation_history(
    project_id: str,
    ds_id: str,
    user: User = Depends(require_valid_access)
):
    """Clear conversation history for a data source"""
    user_dir = get_user_analyst_dir_path(user)
    project_dir = user_dir / project_id

    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project not found")

    # Clear the conversation file
    _save_conversation(project_dir, ds_id, [])

    return {"status": "cleared"}


# ============== Dashboard Management ==============

class DashboardWidget(BaseModel):
    id: str
    type: str  # chart, table, metric, text
    title: str
    data_source_id: Optional[str] = None
    chart_config: Optional[Dict] = None
    query: Optional[str] = None
    position: Dict  # {x, y, w, h}


class DashboardCreate(BaseModel):
    project_id: str
    name: str
    description: Optional[str] = None


class DashboardUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    widgets: Optional[List[Dict]] = None
    layout: Optional[Dict] = None


def _load_dashboard(project_dir: Path, dashboard_id: str) -> dict | None:
    """Load a dashboard from disk."""
    dashboard_file = project_dir / "dashboards" / f"{dashboard_id}.json"
    if not dashboard_file.exists():
        return None
    with open(dashboard_file) as f:
        return json.load(f)


def _save_dashboard(project_dir: Path, dashboard: dict):
    """Save a dashboard to disk."""
    dashboard_dir = project_dir / "dashboards"
    dashboard_dir.mkdir(exist_ok=True)
    with open(dashboard_dir / f"{dashboard['id']}.json", "w") as f:
        json.dump(dashboard, f, indent=2, default=str)


def _load_all_dashboards(project_dir: Path) -> List[dict]:
    """Load all dashboards for a project."""
    dashboard_dir = project_dir / "dashboards"
    if not dashboard_dir.exists():
        return []
    dashboards = []
    for f in dashboard_dir.glob("*.json"):
        try:
            with open(f) as file:
                dashboards.append(json.load(file))
        except Exception:
            pass
    return dashboards


@router.post("/projects/{project_id}/dashboards")
async def create_dashboard(
    project_id: str,
    request: DashboardCreate,
    user: User = Depends(require_valid_access)
):
    """Create a new dashboard"""
    user_dir = get_user_analyst_dir_path(user)
    project_dir = user_dir / project_id

    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project not found")

    dashboard_id = str(uuid.uuid4())[:8]
    now = datetime.now().isoformat()

    dashboard = {
        "id": dashboard_id,
        "project_id": project_id,
        "name": request.name,
        "description": request.description,
        "widgets": [],
        "layout": {"columns": 12, "rowHeight": 100},
        "created_at": now,
        "updated_at": now
    }

    _save_dashboard(project_dir, dashboard)

    return dashboard


@router.get("/projects/{project_id}/dashboards")
async def list_dashboards(project_id: str, user: User = Depends(require_valid_access)):
    """List all dashboards for a project"""
    user_dir = get_user_analyst_dir_path(user)
    project_dir = user_dir / project_id

    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project not found")

    return _load_all_dashboards(project_dir)


@router.get("/projects/{project_id}/dashboards/{dashboard_id}")
async def get_dashboard(
    project_id: str,
    dashboard_id: str,
    user: User = Depends(require_valid_access)
):
    """Get a specific dashboard"""
    user_dir = get_user_analyst_dir_path(user)
    project_dir = user_dir / project_id

    dashboard = _load_dashboard(project_dir, dashboard_id)
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")

    return dashboard


@router.put("/projects/{project_id}/dashboards/{dashboard_id}")
async def update_dashboard(
    project_id: str,
    dashboard_id: str,
    update: DashboardUpdate,
    user: User = Depends(require_valid_access)
):
    """Update a dashboard"""
    user_dir = get_user_analyst_dir_path(user)
    project_dir = user_dir / project_id

    dashboard = _load_dashboard(project_dir, dashboard_id)
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")

    if update.name is not None:
        dashboard["name"] = update.name
    if update.description is not None:
        dashboard["description"] = update.description
    if update.widgets is not None:
        dashboard["widgets"] = update.widgets
    if update.layout is not None:
        dashboard["layout"] = update.layout

    dashboard["updated_at"] = datetime.now().isoformat()

    _save_dashboard(project_dir, dashboard)

    return dashboard


@router.post("/projects/{project_id}/dashboards/{dashboard_id}/widgets")
async def add_widget(
    project_id: str,
    dashboard_id: str,
    widget: Dict[str, Any],
    user: User = Depends(require_valid_access)
):
    """Add a widget to a dashboard"""
    user_dir = get_user_analyst_dir_path(user)
    project_dir = user_dir / project_id

    dashboard = _load_dashboard(project_dir, dashboard_id)
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")

    # Generate widget ID if not provided
    if "id" not in widget:
        widget["id"] = str(uuid.uuid4())[:8]

    # Default position if not provided
    if "position" not in widget:
        # Find next available position
        max_y = 0
        for w in dashboard["widgets"]:
            pos = w.get("position", {})
            max_y = max(max_y, pos.get("y", 0) + pos.get("h", 4))
        widget["position"] = {"x": 0, "y": max_y, "w": 6, "h": 4}

    dashboard["widgets"].append(widget)
    dashboard["updated_at"] = datetime.now().isoformat()

    _save_dashboard(project_dir, dashboard)

    return widget


@router.delete("/projects/{project_id}/dashboards/{dashboard_id}/widgets/{widget_id}")
async def remove_widget(
    project_id: str,
    dashboard_id: str,
    widget_id: str,
    user: User = Depends(require_valid_access)
):
    """Remove a widget from a dashboard"""
    user_dir = get_user_analyst_dir_path(user)
    project_dir = user_dir / project_id

    dashboard = _load_dashboard(project_dir, dashboard_id)
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")

    dashboard["widgets"] = [w for w in dashboard["widgets"] if w.get("id") != widget_id]
    dashboard["updated_at"] = datetime.now().isoformat()

    _save_dashboard(project_dir, dashboard)

    return {"status": "deleted", "widget_id": widget_id}


@router.delete("/projects/{project_id}/dashboards/{dashboard_id}")
async def delete_dashboard(
    project_id: str,
    dashboard_id: str,
    user: User = Depends(require_valid_access)
):
    """Delete a dashboard"""
    user_dir = get_user_analyst_dir_path(user)
    project_dir = user_dir / project_id

    dashboard_file = project_dir / "dashboards" / f"{dashboard_id}.json"
    if not dashboard_file.exists():
        raise HTTPException(status_code=404, detail="Dashboard not found")

    dashboard_file.unlink()

    return {"status": "deleted", "dashboard_id": dashboard_id}


@router.post("/projects/{project_id}/dashboards/{dashboard_id}/generate-chart")
async def generate_chart_for_dashboard(
    project_id: str,
    dashboard_id: str,
    data_source_id: str,
    chart_config: Dict[str, Any],
    user: User = Depends(require_valid_access)
):
    """Generate a chart and add it to the dashboard"""
    user_dir = get_user_analyst_dir_path(user)
    project_dir = user_dir / project_id

    dashboard = _load_dashboard(project_dir, dashboard_id)
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")

    ds = _get_data_source(user, project_id, data_source_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Data source not found")

    df = load_dataframe(ds)

    # Generate the chart
    chart_json = generate_plotly_chart(df, chart_config)

    # Create widget
    widget = {
        "id": str(uuid.uuid4())[:8],
        "type": "chart",
        "title": chart_config.get("title", "Chart"),
        "data_source_id": data_source_id,
        "chart_config": chart_config,
        "chart_data": chart_json,
        "position": {"x": 0, "y": 0, "w": 6, "h": 4}
    }

    # Add to dashboard
    max_y = 0
    for w in dashboard["widgets"]:
        pos = w.get("position", {})
        max_y = max(max_y, pos.get("y", 0) + pos.get("h", 4))
    widget["position"]["y"] = max_y

    dashboard["widgets"].append(widget)
    dashboard["updated_at"] = datetime.now().isoformat()

    _save_dashboard(project_dir, dashboard)

    return {"widget": widget, "chart": chart_json}


class AutoDashboardRequest(BaseModel):
    project_id: str
    data_source_id: str
    dashboard_id: Optional[str] = None  # If provided, append to existing dashboard
    dashboard_name: Optional[str] = None
    min_charts: int = 5
    max_charts: int = 8


def analyze_data_for_charts(df: pd.DataFrame) -> Dict[str, Any]:
    """Analyze DataFrame to determine optimal chart configurations"""
    analysis = {
        "numeric_cols": [],
        "categorical_cols": [],
        "datetime_cols": [],
        "boolean_cols": [],
        "id_cols": [],
        "text_cols": [],
        "row_count": len(df),
        "col_count": len(df.columns),
        "suggested_charts": []
    }

    for col in df.columns:
        dtype = df[col].dtype
        col_lower = col.lower()

        # Try to get nunique - may fail on columns with unhashable types (lists, dicts)
        try:
            nunique = df[col].nunique()
        except TypeError:
            # Column contains unhashable types, treat as text/skip
            analysis["text_cols"].append(col)
            continue

        # Detect ID columns (high cardinality, sequential patterns)
        if nunique == len(df) or 'id' in col_lower or '_id' in col_lower:
            analysis["id_cols"].append(col)
        elif pd.api.types.is_numeric_dtype(dtype):
            try:
                analysis["numeric_cols"].append({
                    "name": col,
                    "min": float(df[col].min()) if not pd.isna(df[col].min()) else None,
                    "max": float(df[col].max()) if not pd.isna(df[col].max()) else None,
                    "mean": float(df[col].mean()) if not pd.isna(df[col].mean()) else None,
                    "std": float(df[col].std()) if not pd.isna(df[col].std()) else None,
                    "nunique": nunique
                })
            except (TypeError, ValueError):
                analysis["text_cols"].append(col)
        elif pd.api.types.is_datetime64_any_dtype(dtype):
            analysis["datetime_cols"].append(col)
        elif pd.api.types.is_bool_dtype(dtype):
            analysis["boolean_cols"].append(col)
        elif nunique <= 20:  # Categorical threshold
            try:
                analysis["categorical_cols"].append({
                    "name": col,
                    "nunique": nunique,
                    "top_values": df[col].value_counts().head(5).to_dict()
                })
            except TypeError:
                analysis["text_cols"].append(col)
        else:
            # Try to parse as datetime
            try:
                pd.to_datetime(df[col], errors='raise')
                analysis["datetime_cols"].append(col)
            except:
                analysis["text_cols"].append(col)

    return analysis


def generate_chart_suggestions(analysis: Dict[str, Any], df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Generate intelligent chart suggestions based on data analysis"""
    charts = []
    numeric_cols = [c["name"] for c in analysis["numeric_cols"]]
    categorical_cols = [c["name"] for c in analysis["categorical_cols"]]
    datetime_cols = analysis["datetime_cols"]

    # 1. Overview: Distribution of key numeric column (histogram)
    if numeric_cols:
        main_numeric = numeric_cols[0]
        charts.append({
            "chart_type": "histogram",
            "x_column": main_numeric,
            "title": f"Distribution of {main_numeric}",
            "overview": f"This histogram shows the frequency distribution of {main_numeric}. "
                       f"Use this to identify patterns, outliers, and the overall spread of values.",
            "theme": "distribution"
        })

    # 2. Category breakdown (bar chart)
    if categorical_cols and numeric_cols:
        cat_col = categorical_cols[0]
        num_col = numeric_cols[0]
        charts.append({
            "chart_type": "bar",
            "x_column": cat_col,
            "y_column": num_col,
            "title": f"{num_col} by {cat_col}",
            "overview": f"This bar chart compares {num_col} across different {cat_col} categories. "
                       f"Useful for identifying which categories have the highest/lowest values.",
            "theme": "comparison"
        })

    # 3. Time series (if datetime present)
    if datetime_cols and numeric_cols:
        date_col = datetime_cols[0]
        num_col = numeric_cols[0]
        charts.append({
            "chart_type": "line",
            "x_column": date_col,
            "y_column": num_col,
            "title": f"{num_col} Over Time",
            "overview": f"This line chart shows how {num_col} changes over time. "
                       f"Look for trends, seasonality, and anomalies in the temporal pattern.",
            "theme": "trend"
        })

    # 4. Pie chart for proportions (if categorical)
    if categorical_cols:
        cat_col = categorical_cols[0]
        try:
            value_counts = df[cat_col].value_counts()
            if len(value_counts) <= 8:  # Pie charts work best with few categories
                charts.append({
                    "chart_type": "pie",
                    "x_column": cat_col,
                    "y_column": None,
                    "title": f"Proportion of {cat_col}",
                    "overview": f"This pie chart shows the relative proportions of each {cat_col} category. "
                               f"Quickly see which categories dominate the dataset.",
                    "theme": "composition"
                })
        except TypeError:
            pass  # Skip if column contains unhashable types

    # 5. Scatter plot for relationships (if 2+ numeric)
    if len(numeric_cols) >= 2:
        col1, col2 = numeric_cols[0], numeric_cols[1]
        color_col = categorical_cols[0] if categorical_cols else None
        charts.append({
            "chart_type": "scatter",
            "x_column": col1,
            "y_column": col2,
            "color_column": color_col,
            "title": f"Relationship: {col1} vs {col2}",
            "overview": f"This scatter plot reveals the relationship between {col1} and {col2}. "
                       f"Look for correlations, clusters, and outliers.",
            "theme": "relationship"
        })

    # 6. Box plot for statistical distribution (if categorical + numeric)
    if categorical_cols and numeric_cols:
        cat_col = categorical_cols[0]
        num_col = numeric_cols[0]
        charts.append({
            "chart_type": "box",
            "x_column": cat_col,
            "y_column": num_col,
            "title": f"Statistical Distribution of {num_col} by {cat_col}",
            "overview": f"This box plot shows the statistical spread of {num_col} across {cat_col} categories. "
                       f"Compare medians, quartiles, and identify outliers across groups.",
            "theme": "statistics"
        })

    # 7. Correlation heatmap (if multiple numeric columns)
    if len(numeric_cols) >= 3:
        charts.append({
            "chart_type": "heatmap",
            "title": "Correlation Matrix",
            "overview": "This heatmap shows correlations between all numeric variables. "
                       "Values close to 1 or -1 indicate strong relationships. "
                       "Use this to identify which variables are related.",
            "theme": "correlation"
        })

    # 8. Second categorical comparison (if multiple categories)
    if len(categorical_cols) >= 2 and numeric_cols:
        cat_col = categorical_cols[1]
        num_col = numeric_cols[0]
        charts.append({
            "chart_type": "bar",
            "x_column": cat_col,
            "y_column": num_col,
            "title": f"{num_col} by {cat_col}",
            "overview": f"Additional breakdown of {num_col} by {cat_col}. "
                       f"Compare this with other categorical views for deeper insights.",
            "theme": "comparison"
        })

    # 9. Second numeric distribution
    if len(numeric_cols) >= 2:
        second_numeric = numeric_cols[1]
        charts.append({
            "chart_type": "histogram",
            "x_column": second_numeric,
            "title": f"Distribution of {second_numeric}",
            "overview": f"Distribution analysis of {second_numeric}. "
                       f"Compare with other distributions to understand data patterns.",
            "theme": "distribution"
        })

    # 10. Stacked/grouped view (if multiple categoricals)
    if len(categorical_cols) >= 2 and len(numeric_cols) >= 1:
        cat1 = categorical_cols[0]
        cat2 = categorical_cols[1]
        num_col = numeric_cols[0]
        charts.append({
            "chart_type": "bar",
            "x_column": cat1,
            "y_column": num_col,
            "color_column": cat2,
            "title": f"{num_col} by {cat1} (colored by {cat2})",
            "overview": f"Multi-dimensional view showing {num_col} broken down by {cat1} "
                       f"with {cat2} as a secondary dimension. Reveals interaction patterns.",
            "theme": "multi-dimensional"
        })

    return charts


@router.post("/projects/{project_id}/auto-generate-dashboard")
async def auto_generate_dashboard(
    project_id: str,
    request: AutoDashboardRequest,
    user: User = Depends(require_valid_access)
):
    """
    Automatically generate charts and add them to a dashboard.
    If dashboard_id is provided, adds charts to the existing dashboard.
    Otherwise, creates a new dashboard.
    Analyzes data structure to create the most informative visualizations.
    Each chart includes an overview explaining its purpose and insights.
    """
    user_dir = get_user_analyst_dir_path(user)
    project_dir = user_dir / project_id

    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project not found")

    ds = _get_data_source(user, project_id, request.data_source_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Data source not found")

    # Load data
    try:
        df = load_dataframe(ds)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to load data: {str(e)}")

    if df.empty:
        raise HTTPException(status_code=400, detail="Data source is empty")

    # Analyze data
    analysis = analyze_data_for_charts(df)

    # Generate chart suggestions
    suggested_charts = generate_chart_suggestions(analysis, df)

    # Limit to requested range
    num_charts = min(max(request.min_charts, len(suggested_charts)), request.max_charts)
    selected_charts = suggested_charts[:num_charts]

    now = datetime.now().isoformat()
    is_new_dashboard = False

    # Check if we should use an existing dashboard
    if request.dashboard_id:
        dashboard = _load_dashboard(project_dir, request.dashboard_id)
        if not dashboard:
            raise HTTPException(status_code=404, detail="Dashboard not found")
        dashboard_id = request.dashboard_id
    else:
        # Create new dashboard
        is_new_dashboard = True
        dashboard_id = str(uuid.uuid4())[:8]
        dashboard_name = request.dashboard_name or f"Auto-Dashboard: {ds['name']}"
        dashboard = {
            "id": dashboard_id,
            "project_id": project_id,
            "name": dashboard_name,
            "description": f"Auto-generated dashboard analyzing {ds['name']}",
            "widgets": [],
            "layout": {"columns": 12, "rowHeight": 100},
            "data_analysis": analysis,
            "created_at": now,
            "updated_at": now
        }

    # Calculate starting row based on existing widgets
    existing_widgets = dashboard.get("widgets", [])
    start_row = 0
    for w in existing_widgets:
        pos = w.get("position", {})
        start_row = max(start_row, pos.get("y", 0) + pos.get("h", 4))

    # Generate charts and create widgets
    new_widgets = []
    row = start_row
    for i, chart_config in enumerate(selected_charts):
        try:
            # Generate the Plotly chart
            chart_json = generate_plotly_chart(df, chart_config)

            # Calculate position (2 per row)
            col = (i % 2) * 6
            if i % 2 == 0 and i > 0:
                row += 4

            widget = {
                "id": str(uuid.uuid4())[:8],
                "type": "chart",
                "title": chart_config.get("title", f"Chart {i+1}"),
                "overview": chart_config.get("overview", ""),
                "theme": chart_config.get("theme", "general"),
                "data_source_id": request.data_source_id,
                "chart_config": {k: v for k, v in chart_config.items() if k not in ("overview", "theme")},
                "chart_data": chart_json,
                "position": {"x": col, "y": row, "w": 6, "h": 4}
            }
            new_widgets.append(widget)
        except Exception as e:
            # Skip charts that fail to generate
            continue

    if not new_widgets:
        raise HTTPException(status_code=400, detail="Could not generate any charts from this data")

    # Add new widgets to dashboard
    dashboard["widgets"] = existing_widgets + new_widgets
    dashboard["updated_at"] = now
    dashboard["data_analysis"] = analysis

    # Save dashboard
    _save_dashboard(project_dir, dashboard)

    return {
        "dashboard": dashboard,
        "charts_generated": len(new_widgets),
        "is_new_dashboard": is_new_dashboard,
        "data_summary": {
            "row_count": analysis["row_count"],
            "col_count": analysis["col_count"],
            "numeric_columns": len(analysis["numeric_cols"]),
            "categorical_columns": len(analysis["categorical_cols"]),
            "datetime_columns": len(analysis["datetime_cols"])
        }
    }


@router.post("/projects/{project_id}/generate-single-chart")
async def generate_single_chart(
    project_id: str,
    data_source_id: str,
    chart_type: str,
    x_column: Optional[str] = None,
    y_column: Optional[str] = None,
    color_column: Optional[str] = None,
    title: Optional[str] = None,
    user: User = Depends(require_valid_access)
):
    """
    Generate a single chart from a data source.
    Returns the Plotly chart JSON along with an auto-generated overview.
    """
    user_dir = get_user_analyst_dir_path(user)
    project_dir = user_dir / project_id

    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project not found")

    ds = _get_data_source(user, project_id, data_source_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Data source not found")

    df = load_dataframe(ds)

    chart_config = {
        "chart_type": chart_type,
        "x_column": x_column,
        "y_column": y_column,
        "color_column": color_column,
        "title": title or f"{chart_type.title()} Chart"
    }

    try:
        chart_json = generate_plotly_chart(df, chart_config)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to generate chart: {str(e)}")

    # Generate overview based on chart type
    overview = ""
    if chart_type == "bar":
        overview = f"Bar chart comparing {y_column or 'values'} across {x_column or 'categories'}."
    elif chart_type == "line":
        overview = f"Line chart showing trend of {y_column or 'values'} over {x_column or 'sequence'}."
    elif chart_type == "scatter":
        overview = f"Scatter plot showing relationship between {x_column} and {y_column}."
    elif chart_type == "pie":
        overview = f"Pie chart showing proportional breakdown of {x_column}."
    elif chart_type == "histogram":
        overview = f"Histogram showing distribution of {x_column}."
    elif chart_type == "box":
        overview = f"Box plot showing statistical distribution of {y_column} by {x_column}."
    elif chart_type == "heatmap":
        overview = "Heatmap showing correlations between numeric variables."

    return {
        "chart": chart_json,
        "config": chart_config,
        "overview": overview
    }


# ============== Data Editing ==============

@router.put("/data-sources/{ds_id}/data")
async def update_data(ds_id: str, updates: Dict[str, Any]):
    """Update data in a CSV/Excel file"""
    if ds_id not in data_sources:
        raise HTTPException(status_code=404, detail="Data source not found")

    ds = data_sources[ds_id]

    if ds["type"] not in ("csv", "excel"):
        raise HTTPException(status_code=400, detail="Only CSV/Excel files can be edited")

    # Load current data
    df = load_dataframe(ds)

    # Apply updates (expecting format: {"row_index": {column: value, ...}, ...})
    for row_idx, row_updates in updates.items():
        row_idx = int(row_idx)
        for col, value in row_updates.items():
            if col in df.columns and row_idx < len(df):
                df.at[row_idx, col] = value

    # Save back
    file_path = ds["file_path"]
    if ds["type"] == "csv":
        df.to_csv(file_path, index=False)
    else:
        df.to_excel(file_path, index=False)

    # Update schema
    ds["row_count"] = len(df)
    ds["columns"] = get_dataframe_schema(df)["columns"]

    return {"status": "updated", "row_count": len(df)}


@router.post("/data-sources/{ds_id}/add-row")
async def add_row(ds_id: str, row_data: Dict[str, Any]):
    """Add a new row to a CSV/Excel file"""
    if ds_id not in data_sources:
        raise HTTPException(status_code=404, detail="Data source not found")

    ds = data_sources[ds_id]

    if ds["type"] not in ("csv", "excel"):
        raise HTTPException(status_code=400, detail="Only CSV/Excel files can be edited")

    df = load_dataframe(ds)
    new_row = pd.DataFrame([row_data])
    df = pd.concat([df, new_row], ignore_index=True)

    # Save back
    file_path = ds["file_path"]
    if ds["type"] == "csv":
        df.to_csv(file_path, index=False)
    else:
        df.to_excel(file_path, index=False)

    ds["row_count"] = len(df)

    return {"status": "added", "row_count": len(df)}


@router.delete("/data-sources/{ds_id}/rows/{row_index}")
async def delete_row(ds_id: str, row_index: int):
    """Delete a row from a CSV/Excel file"""
    if ds_id not in data_sources:
        raise HTTPException(status_code=404, detail="Data source not found")

    ds = data_sources[ds_id]

    if ds["type"] not in ("csv", "excel"):
        raise HTTPException(status_code=400, detail="Only CSV/Excel files can be edited")

    df = load_dataframe(ds)

    if row_index < 0 or row_index >= len(df):
        raise HTTPException(status_code=400, detail="Invalid row index")

    df = df.drop(row_index).reset_index(drop=True)

    # Save back
    file_path = ds["file_path"]
    if ds["type"] == "csv":
        df.to_csv(file_path, index=False)
    else:
        df.to_excel(file_path, index=False)

    ds["row_count"] = len(df)

    return {"status": "deleted", "row_count": len(df)}


# ============== Export ==============

@router.get("/data-sources/{ds_id}/export")
async def export_data(ds_id: str, format: str = "csv"):
    """Export data source to a file"""
    if ds_id not in data_sources:
        raise HTTPException(status_code=404, detail="Data source not found")

    ds = data_sources[ds_id]

    if ds["type"] in ("csv", "excel"):
        df = load_dataframe(ds)

        # Create export file
        export_dir = DATA_DIR / "exports"
        export_dir.mkdir(exist_ok=True)

        if format == "csv":
            export_path = export_dir / f"{ds_id}_export.csv"
            df.to_csv(export_path, index=False)
        elif format == "excel":
            export_path = export_dir / f"{ds_id}_export.xlsx"
            df.to_excel(export_path, index=False)
        elif format == "json":
            export_path = export_dir / f"{ds_id}_export.json"
            df.to_json(export_path, orient="records", indent=2)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported export format: {format}")

        return FileResponse(
            export_path,
            filename=export_path.name,
            media_type="application/octet-stream"
        )

    raise HTTPException(status_code=400, detail="Export not available for this data source type")

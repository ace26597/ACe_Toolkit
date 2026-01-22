"""
Public API Router - Revenue-generating endpoints using Claude

These endpoints can be called without authentication for public API access.
Rate limiting and usage tracking should be added for production.

Skills implemented:
- /diagram - Text to Mermaid diagram (PNG/SVG)
- /document-qa - Upload document and ask questions
- /summarize - Summarize text, URLs, or documents
- /code-review - Analyze code quality
- /content - Generate marketing content
- /analyze-data - CSV/Excel analysis
"""

import os
import uuid
import json
import base64
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Literal
from pydantic import BaseModel, Field

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse

# Load environment from settings
from app.core.config import settings

# AI providers (lazy initialization)
from anthropic import AsyncAnthropic
from openai import AsyncOpenAI

# File processing
import aiofiles

router = APIRouter(prefix="/api/public", tags=["Public API"])

# Initialize AI clients lazily
_anthropic_client = None
_openai_client = None


def get_anthropic_client():
    global _anthropic_client
    if _anthropic_client is None:
        api_key = settings.ANTHROPIC_API_KEY
        if not api_key:
            raise HTTPException(status_code=500, detail="Anthropic API key not configured")
        _anthropic_client = AsyncAnthropic(api_key=api_key)
    return _anthropic_client


def get_openai_client():
    global _openai_client
    if _openai_client is None:
        api_key = settings.OPENAI_API_KEY
        if not api_key:
            raise HTTPException(status_code=500, detail="OpenAI API key not configured")
        _openai_client = AsyncOpenAI(api_key=api_key)
    return _openai_client

# Output directory for generated files
OUTPUT_DIR = Path("/data/api-outputs")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# ============ Schemas ============

class DiagramRequest(BaseModel):
    description: str = Field(..., description="Natural language description of the diagram")
    diagram_type: Literal["flowchart", "sequence", "class", "er", "gantt", "mindmap", "state", "auto"] = "auto"
    style: Literal["default", "dark", "forest", "neutral"] = "default"


class DiagramResponse(BaseModel):
    mermaid_code: str
    diagram_id: str
    preview_url: str
    message: str


class DocumentQARequest(BaseModel):
    question: str = Field(..., description="Question to ask about the document")
    context_mode: Literal["full", "summary", "relevant"] = "full"


class DocumentQAResponse(BaseModel):
    answer: str
    confidence: float
    sources: List[dict]
    follow_up_questions: List[str]


class SummarizeRequest(BaseModel):
    content: str = Field(..., description="Text content, URL, or base64 document")
    content_type: Literal["text", "url"] = "text"
    length: Literal["brief", "standard", "detailed"] = "standard"
    format: Literal["paragraph", "bullets", "executive"] = "paragraph"
    focus: Literal["general", "technical", "business", "academic"] = "general"


class SummarizeResponse(BaseModel):
    summary: str
    key_points: List[str]
    word_count: dict
    topics: List[str]


class CodeReviewRequest(BaseModel):
    code: str = Field(..., description="Code to review")
    language: Literal["python", "javascript", "typescript", "go", "rust", "java", "auto"] = "auto"
    focus: List[Literal["security", "performance", "style", "bugs"]] = ["security", "bugs", "style"]
    context: Optional[str] = None


class CodeReviewIssue(BaseModel):
    severity: Literal["critical", "high", "medium", "low"]
    category: str
    line: Optional[int]
    message: str
    suggestion: str
    code_fix: Optional[str]


class CodeReviewResponse(BaseModel):
    score: int
    grade: str
    issues: List[CodeReviewIssue]
    summary: str
    positive: List[str]


class ContentRequest(BaseModel):
    content_type: Literal["blog", "email", "social", "product", "ad"] = "blog"
    topic: str = Field(..., description="Topic or subject for the content")
    tone: Literal["professional", "casual", "friendly", "urgent"] = "professional"
    length: Literal["short", "medium", "long"] = "medium"
    audience: Literal["developers", "marketers", "executives", "general"] = "general"
    keywords: List[str] = []
    platform: Optional[Literal["twitter", "linkedin", "instagram"]] = None


class ContentResponse(BaseModel):
    content: str
    title: Optional[str]
    meta_description: Optional[str]
    hashtags: List[str]
    word_count: int


class DataAnalysisRequest(BaseModel):
    question: Optional[str] = Field(None, description="Specific question about the data")
    analysis_type: Literal["overview", "trends", "correlations", "anomalies", "custom"] = "overview"


class DataAnalysisResponse(BaseModel):
    summary: dict
    insights: List[dict]
    recommendations: List[str]
    follow_up_questions: List[str]


# ============ Helper Functions ============

async def call_claude(prompt: str, system: str = "", max_tokens: int = 4096) -> str:
    """Call Claude API for text generation."""
    try:
        client = get_anthropic_client()
        response = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=max_tokens,
            system=system if system else "You are a helpful AI assistant.",
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")


async def extract_text_from_file(file: UploadFile) -> str:
    """Extract text content from uploaded file."""
    content = await file.read()
    filename = file.filename.lower()

    if filename.endswith('.txt') or filename.endswith('.md'):
        return content.decode('utf-8')
    elif filename.endswith('.pdf'):
        try:
            import pypdf
            import io
            reader = pypdf.PdfReader(io.BytesIO(content))
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            return text
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse PDF: {str(e)}")
    elif filename.endswith('.csv'):
        return content.decode('utf-8')
    else:
        # Try as text
        try:
            return content.decode('utf-8')
        except:
            raise HTTPException(status_code=400, detail="Unsupported file format")


# ============ Endpoints ============

@router.post("/diagram", response_model=DiagramResponse)
async def generate_diagram(request: DiagramRequest):
    """
    Generate a Mermaid diagram from natural language description.

    Returns Mermaid code and a preview URL.
    """
    # Determine diagram type
    type_hint = ""
    if request.diagram_type != "auto":
        type_hint = f"Create a {request.diagram_type} diagram."

    system_prompt = """You are a Mermaid diagram expert. Generate valid Mermaid diagram code based on user descriptions.

Rules:
1. Output ONLY the Mermaid code, no explanations
2. Use proper Mermaid syntax
3. Keep diagrams clear and readable
4. Use appropriate node shapes and connections
5. Add meaningful labels"""

    user_prompt = f"""{type_hint}

Description: {request.description}

Generate the Mermaid diagram code:"""

    mermaid_code = await call_claude(user_prompt, system_prompt, max_tokens=2000)

    # Clean up response (remove markdown code blocks if present)
    mermaid_code = mermaid_code.strip()
    if mermaid_code.startswith("```"):
        lines = mermaid_code.split("\n")
        mermaid_code = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])

    # Generate unique ID
    diagram_id = str(uuid.uuid4())[:8]

    # Save mermaid code
    output_path = OUTPUT_DIR / f"{diagram_id}.mmd"
    async with aiofiles.open(output_path, 'w') as f:
        await f.write(mermaid_code)

    return DiagramResponse(
        mermaid_code=mermaid_code,
        diagram_id=diagram_id,
        preview_url=f"/api/public/diagram/{diagram_id}/preview",
        message="Diagram generated successfully. Use the preview URL to view or export."
    )


@router.get("/diagram/{diagram_id}/preview")
async def preview_diagram(diagram_id: str):
    """Get diagram preview as HTML with rendered Mermaid."""
    mmd_path = OUTPUT_DIR / f"{diagram_id}.mmd"

    if not mmd_path.exists():
        raise HTTPException(status_code=404, detail="Diagram not found")

    async with aiofiles.open(mmd_path, 'r') as f:
        mermaid_code = await f.read()

    # Return HTML page with Mermaid rendering
    html = f"""<!DOCTYPE html>
<html>
<head>
    <title>Diagram Preview</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <style>
        body {{
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: #1a1a2e;
            color: white;
            font-family: system-ui;
        }}
        .mermaid {{
            background: white;
            padding: 20px;
            border-radius: 8px;
            max-width: 90vw;
            overflow: auto;
        }}
    </style>
</head>
<body>
    <div class="mermaid">
{mermaid_code}
    </div>
    <script>mermaid.initialize({{ startOnLoad: true, theme: 'default' }});</script>
</body>
</html>"""

    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=html)


@router.get("/diagram/{diagram_id}/code")
async def get_diagram_code(diagram_id: str):
    """Get raw Mermaid code for a diagram."""
    mmd_path = OUTPUT_DIR / f"{diagram_id}.mmd"

    if not mmd_path.exists():
        raise HTTPException(status_code=404, detail="Diagram not found")

    async with aiofiles.open(mmd_path, 'r') as f:
        mermaid_code = await f.read()

    return {"diagram_id": diagram_id, "mermaid_code": mermaid_code}


@router.post("/document-qa", response_model=DocumentQAResponse)
async def document_qa(
    question: str = Form(...),
    file: UploadFile = File(...)
):
    """
    Upload a document and ask questions about it.

    Supports: PDF, TXT, MD, CSV
    """
    # Extract text from document
    document_text = await extract_text_from_file(file)

    # Truncate if too long (keep first 50k chars for context)
    if len(document_text) > 50000:
        document_text = document_text[:50000] + "\n\n[Document truncated...]"

    system_prompt = """You are a document analysis expert. Answer questions about the provided document accurately and cite specific sections when possible.

Always respond in this JSON format:
{
    "answer": "Your detailed answer here",
    "confidence": 0.0-1.0,
    "sources": [{"section": "where found", "text": "relevant excerpt"}],
    "follow_up_questions": ["question 1", "question 2"]
}"""

    user_prompt = f"""Document content:
---
{document_text}
---

Question: {question}

Analyze the document and answer the question. Respond in JSON format."""

    response = await call_claude(user_prompt, system_prompt, max_tokens=2000)

    # Parse JSON response
    try:
        # Clean up response
        response = response.strip()
        if response.startswith("```"):
            lines = response.split("\n")
            response = "\n".join(lines[1:-1] if lines[-1].startswith("```") else lines[1:])

        result = json.loads(response)
        return DocumentQAResponse(
            answer=result.get("answer", response),
            confidence=result.get("confidence", 0.8),
            sources=result.get("sources", []),
            follow_up_questions=result.get("follow_up_questions", [])
        )
    except json.JSONDecodeError:
        # Return as plain answer if JSON parsing fails
        return DocumentQAResponse(
            answer=response,
            confidence=0.7,
            sources=[],
            follow_up_questions=[]
        )


@router.post("/summarize", response_model=SummarizeResponse)
async def summarize(request: SummarizeRequest):
    """
    Summarize text content or URL.
    """
    content = request.content

    # If URL, fetch content
    if request.content_type == "url":
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                resp = await client.get(content, follow_redirects=True, timeout=30)
                content = resp.text
                # Basic HTML to text (simple extraction)
                import re
                content = re.sub(r'<script[^>]*>.*?</script>', '', content, flags=re.DOTALL)
                content = re.sub(r'<style[^>]*>.*?</style>', '', content, flags=re.DOTALL)
                content = re.sub(r'<[^>]+>', ' ', content)
                content = re.sub(r'\s+', ' ', content).strip()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {str(e)}")

    # Length guidelines
    length_guide = {
        "brief": "1-2 sentences, approximately 50 words",
        "standard": "1-2 paragraphs, approximately 150 words",
        "detailed": "Comprehensive summary with sections, approximately 500 words"
    }

    format_guide = {
        "paragraph": "flowing prose paragraphs",
        "bullets": "bullet point list of key points",
        "executive": "TL;DR followed by key points and recommendations"
    }

    system_prompt = f"""You are a summarization expert. Create {request.focus}-focused summaries.

Respond in this JSON format:
{{
    "summary": "The summary text",
    "key_points": ["point 1", "point 2", "point 3"],
    "topics": ["topic1", "topic2"],
    "original_words": 1234,
    "summary_words": 123
}}"""

    user_prompt = f"""Summarize the following content.

Length: {length_guide[request.length]}
Format: {format_guide[request.format]}
Focus: {request.focus}

Content:
---
{content[:30000]}
---

Provide a {request.length} summary in {request.format} format."""

    response = await call_claude(user_prompt, system_prompt, max_tokens=2000)

    try:
        response = response.strip()
        if response.startswith("```"):
            lines = response.split("\n")
            response = "\n".join(lines[1:-1] if lines[-1].startswith("```") else lines[1:])

        result = json.loads(response)
        return SummarizeResponse(
            summary=result.get("summary", response),
            key_points=result.get("key_points", []),
            word_count={
                "original": result.get("original_words", len(content.split())),
                "summary": result.get("summary_words", len(result.get("summary", "").split()))
            },
            topics=result.get("topics", [])
        )
    except json.JSONDecodeError:
        return SummarizeResponse(
            summary=response,
            key_points=[],
            word_count={"original": len(content.split()), "summary": len(response.split())},
            topics=[]
        )


@router.post("/code-review", response_model=CodeReviewResponse)
async def review_code(request: CodeReviewRequest):
    """
    Analyze code for quality, security, and style issues.
    """
    focus_str = ", ".join(request.focus)

    system_prompt = """You are a senior code reviewer. Analyze code for issues and provide actionable feedback.

Respond in this exact JSON format:
{
    "score": 0-100,
    "grade": "A/B/C/D/F",
    "issues": [
        {
            "severity": "critical|high|medium|low",
            "category": "security|performance|bugs|style",
            "line": null or line number,
            "message": "Description of the issue",
            "suggestion": "How to fix it",
            "code_fix": "Fixed code snippet or null"
        }
    ],
    "summary": "Overall assessment",
    "positive": ["Good thing 1", "Good thing 2"]
}"""

    context_hint = f"\nContext: {request.context}" if request.context else ""

    user_prompt = f"""Review this {request.language} code for: {focus_str}
{context_hint}

Code:
```{request.language}
{request.code}
```

Provide detailed review in JSON format."""

    response = await call_claude(user_prompt, system_prompt, max_tokens=3000)

    try:
        response = response.strip()
        if response.startswith("```"):
            lines = response.split("\n")
            response = "\n".join(lines[1:-1] if lines[-1].startswith("```") else lines[1:])

        result = json.loads(response)

        issues = []
        for issue in result.get("issues", []):
            issues.append(CodeReviewIssue(
                severity=issue.get("severity", "medium"),
                category=issue.get("category", "style"),
                line=issue.get("line"),
                message=issue.get("message", ""),
                suggestion=issue.get("suggestion", ""),
                code_fix=issue.get("code_fix")
            ))

        return CodeReviewResponse(
            score=result.get("score", 70),
            grade=result.get("grade", "C"),
            issues=issues,
            summary=result.get("summary", "Review complete."),
            positive=result.get("positive", [])
        )
    except json.JSONDecodeError:
        return CodeReviewResponse(
            score=50,
            grade="C",
            issues=[],
            summary=response,
            positive=[]
        )


@router.post("/content", response_model=ContentResponse)
async def generate_content(request: ContentRequest):
    """
    Generate marketing content: blog posts, emails, social media, etc.
    """
    # Length guidelines
    length_guide = {
        "short": "100-200 words",
        "medium": "300-500 words",
        "long": "800-1200 words"
    }

    type_guide = {
        "blog": "SEO-optimized blog post with headers, introduction, body, and conclusion",
        "email": "Marketing email with subject line, preview text, body, and CTA",
        "social": f"Social media post optimized for {request.platform or 'general platforms'}",
        "product": "Product description highlighting features, benefits, and use cases",
        "ad": "Advertisement copy with headline, description, and CTA"
    }

    keywords_str = ", ".join(request.keywords) if request.keywords else "none specified"

    system_prompt = f"""You are an expert {request.content_type} content writer.
Write in a {request.tone} tone for a {request.audience} audience.

Respond in JSON format:
{{
    "content": "The main content",
    "title": "Suggested title (for blogs/emails)",
    "meta_description": "SEO meta description (for blogs)",
    "hashtags": ["#tag1", "#tag2"]
}}"""

    user_prompt = f"""Create {request.content_type} content about: {request.topic}

Type: {type_guide[request.content_type]}
Length: {length_guide[request.length]}
Tone: {request.tone}
Audience: {request.audience}
Keywords to include: {keywords_str}

Generate the content in JSON format."""

    response = await call_claude(user_prompt, system_prompt, max_tokens=2500)

    try:
        response = response.strip()
        if response.startswith("```"):
            lines = response.split("\n")
            response = "\n".join(lines[1:-1] if lines[-1].startswith("```") else lines[1:])

        result = json.loads(response)
        content = result.get("content", response)

        return ContentResponse(
            content=content,
            title=result.get("title"),
            meta_description=result.get("meta_description"),
            hashtags=result.get("hashtags", []),
            word_count=len(content.split())
        )
    except json.JSONDecodeError:
        return ContentResponse(
            content=response,
            title=None,
            meta_description=None,
            hashtags=[],
            word_count=len(response.split())
        )


@router.post("/analyze-data", response_model=DataAnalysisResponse)
async def analyze_data(
    file: UploadFile = File(...),
    question: Optional[str] = Form(None),
    analysis_type: str = Form("overview")
):
    """
    Upload CSV/Excel data and get AI-powered analysis.
    """
    # Read file content
    content = await file.read()
    filename = file.filename.lower()

    # Parse data
    try:
        import pandas as pd
        import io

        if filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(content))
        elif filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(content))
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Use CSV or Excel.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")

    # Generate data summary
    data_summary = f"""Dataset Overview:
- Rows: {len(df)}
- Columns: {len(df.columns)}
- Column names: {', '.join(df.columns.tolist())}
- Data types: {df.dtypes.to_dict()}

First 10 rows:
{df.head(10).to_string()}

Statistical summary:
{df.describe().to_string()}
"""

    question_prompt = f"\n\nSpecific question: {question}" if question else ""

    system_prompt = """You are a data analyst expert. Analyze datasets and provide actionable insights.

Respond in JSON format:
{
    "summary": {
        "rows": number,
        "columns": number,
        "key_metrics": {"metric": value}
    },
    "insights": [
        {
            "type": "trend|anomaly|correlation|observation",
            "finding": "Description",
            "confidence": 0.0-1.0,
            "supporting_data": "Evidence"
        }
    ],
    "recommendations": ["Action 1", "Action 2"],
    "follow_up_questions": ["Question 1", "Question 2"]
}"""

    user_prompt = f"""Analyze this dataset:

{data_summary}

Analysis type: {analysis_type}
{question_prompt}

Provide insights in JSON format."""

    response = await call_claude(user_prompt, system_prompt, max_tokens=3000)

    try:
        response = response.strip()
        if response.startswith("```"):
            lines = response.split("\n")
            response = "\n".join(lines[1:-1] if lines[-1].startswith("```") else lines[1:])

        result = json.loads(response)

        return DataAnalysisResponse(
            summary=result.get("summary", {"rows": len(df), "columns": len(df.columns)}),
            insights=result.get("insights", []),
            recommendations=result.get("recommendations", []),
            follow_up_questions=result.get("follow_up_questions", [])
        )
    except json.JSONDecodeError:
        return DataAnalysisResponse(
            summary={"rows": len(df), "columns": len(df.columns), "raw_analysis": response},
            insights=[],
            recommendations=[],
            follow_up_questions=[]
        )


# ============ Health & Info ============

@router.get("/")
async def public_api_info():
    """Public API information and available endpoints."""
    return {
        "name": "ACe Toolkit Public API",
        "version": "1.0.0",
        "endpoints": {
            "/diagram": "Generate Mermaid diagrams from text",
            "/document-qa": "Ask questions about uploaded documents",
            "/summarize": "Summarize text or URLs",
            "/code-review": "Review code for quality issues",
            "/content": "Generate marketing content",
            "/analyze-data": "Analyze CSV/Excel data"
        },
        "documentation": "/docs#/Public%20API",
        "pricing": "Contact for API access"
    }

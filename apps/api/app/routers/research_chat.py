"""
Research Chat Router - WebSocket streaming and file upload for Research Assistant.

Endpoints:
- WebSocket /stream: Streaming research with LangGraph workflows
- POST /upload: File upload to conversation sandbox
- GET /reports/{conversation_id}: Download reports in various formats
- GET /conversations: List conversations
- POST /conversations: Create new conversation
- DELETE /conversations/{conversation_id}: Delete conversation
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, UploadFile, File, Form, Query, HTTPException
from fastapi.responses import StreamingResponse, FileResponse
from typing import List, Optional
import uuid
import asyncio
import json
import logging
from pathlib import Path
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..core.database import get_db
from ..models.models import ResearchConversation, ResearchMessage, UploadedFile
from ..core.langgraph_workflows import create_research_graph, ResearchState
from ..core.sandbox_manager import sandbox_manager
from ..core.report_generator import generate_html_report, generate_pdf_report, generate_csv_export
from ..core.file_processor import determine_file_type

logger = logging.getLogger(__name__)
router = APIRouter()


@router.websocket("/stream")
async def research_websocket(websocket: WebSocket):
    """
    Streaming research chat with LangGraph workflow execution.

    Client → Server:
    {
        "type": "message",
        "conversation_id": "uuid-or-null",
        "content": "Search for CRISPR papers in 2024",
        "session_id": "session_xxx",
        "model_config": {"provider": "openai", "model_name": "gpt-4o"}
    }

    Server → Client:
    {"type": "workflow_step", "step": "router", "status": "in_progress"}
    {"type": "workflow_step", "step": "search", "status": "complete"}
    {"type": "content_delta", "delta": "I found 127 papers..."}
    {"type": "message_complete", "conversation_id": "uuid", "tokens_used": 3421}
    """
    # Log incoming WebSocket request headers for debugging
    origin = websocket.headers.get("origin", "unknown")
    host = websocket.headers.get("host", "unknown")
    cf_ray = websocket.headers.get("cf-ray", "not-cloudflare")

    logger.info(f"WebSocket connection attempt from origin={origin}, host={host}, cf-ray={cf_ray}")

    # Accept WebSocket connection (CORS is handled by middleware)
    await websocket.accept()
    logger.info(f"WebSocket connection established successfully from {origin}")

    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            logger.info(f"Received message: {data.get('content', '')[:100]}")

            conversation_id = data.get("conversation_id")

            # TODO: Get or create conversation in database
            if not conversation_id:
                conversation_id = str(uuid.uuid4())
                logger.info(f"Created new conversation: {conversation_id}")
                # In production, create ResearchConversation record here

            # Build initial state for LangGraph
            initial_state = {
                "user_query": data["content"],
                "uploaded_files": data.get("uploaded_files", []),
                "model_config": data["model_config"],
                "conversation_id": conversation_id,
                "session_id": data["session_id"],
                "workflow_type": "",
                "current_step": "",
                "needs_feedback": False,
                "feedback": None,
                "search_results": [],
                "extracted_content": [],
                "analysis_results": [],
                "synthesis": "",
                "report": "",
                "mcp_tool_calls": [],
                "mcp_tool_results": [],
                "messages": [],
                "tokens_used": 0,
                "steps_completed": []
            }

            # Create LangGraph workflow
            app = create_research_graph()

            # Execute workflow and stream updates
            try:
                async for event in app.astream(initial_state):
                    # Send workflow progress updates
                    node_name = list(event.keys())[0] if event else "unknown"
                    node_state = event.get(node_name, {})

                    await websocket.send_json({
                        "type": "workflow_step",
                        "step": node_name,
                        "status": "in_progress" if node_name != "__end__" else "complete"
                    })

                    # If we have a synthesis, stream it
                    if node_state.get("synthesis"):
                        synthesis = node_state["synthesis"]
                        # Stream in chunks for better UX
                        for i in range(0, len(synthesis), 50):
                            await websocket.send_json({
                                "type": "content_delta",
                                "delta": synthesis[i:i+50]
                            })
                            await asyncio.sleep(0.05)

                # Get final state
                final_state = initial_state  # In production, get from workflow

                # Send completion message
                await websocket.send_json({
                    "type": "message_complete",
                    "conversation_id": conversation_id,
                    "tokens_used": final_state.get("tokens_used", 0),
                    "synthesis": final_state.get("synthesis", ""),
                    "report_available": bool(final_state.get("report"))
                })

                logger.info(f"Workflow completed for conversation {conversation_id}")

            except Exception as e:
                logger.error(f"Workflow execution error: {e}")
                await websocket.send_json({
                    "type": "error",
                    "error": str(e)
                })

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.send_json({
                "type": "error",
                "error": str(e)
            })
        except:
            pass


@router.post("/upload")
async def upload_files(
    conversation_id: str = Form(...),
    files: List[UploadFile] = File(...)
):
    """
    Upload files to conversation sandbox.

    Args:
        conversation_id: ID of the conversation
        files: List of files to upload

    Returns:
        List of uploaded file metadata
    """
    try:
        logger.info(f"Uploading {len(files)} files for conversation {conversation_id}")

        # Create sandbox directory if needed
        sandbox_dir = sandbox_manager.create_sandbox(conversation_id)

        uploaded = []

        for file in files:
            # Determine file type
            file_type = determine_file_type(file.content_type, file.filename)

            # Read file content
            content = await file.read()

            # Save to sandbox
            file_path = sandbox_dir / file.filename
            file_path.write_bytes(content)

            logger.info(f"Saved file: {file.filename} ({len(content)} bytes, type: {file_type})")

            # Create metadata
            file_meta = {
                "id": str(uuid.uuid4()),
                "conversation_id": conversation_id,
                "original_filename": file.filename,
                "file_path": str(file_path),
                "file_type": file_type,
                "file_size_bytes": len(content),
                "mime_type": file.content_type
            }

            uploaded.append(file_meta)

            # TODO: Save UploadedFile record to database

        return {"uploaded": uploaded}

    except Exception as e:
        logger.error(f"File upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reports/{conversation_id}")
async def download_report(
    conversation_id: str,
    format: str = Query("md", regex="^(md|html|pdf|csv)$")
):
    """
    Download research report in specified format.

    Args:
        conversation_id: ID of the conversation
        format: Report format (md, html, pdf, csv)

    Returns:
        Report file in requested format
    """
    try:
        logger.info(f"Generating {format} report for conversation {conversation_id}")

        # TODO: Retrieve report from database
        # For now, create a sample report
        report_markdown = f"""# Research Report

**Conversation ID**: {conversation_id}
**Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Summary

This is a sample report. In production, this would contain the full research findings.

## Next Steps

1. Query the database for ResearchMessage with report field
2. Return the actual report content
"""

        if format == "md":
            return StreamingResponse(
                iter([report_markdown]),
                media_type="text/markdown",
                headers={"Content-Disposition": f"attachment; filename=report_{conversation_id}.md"}
            )

        elif format == "html":
            html_content = generate_html_report(report_markdown)
            return StreamingResponse(
                iter([html_content]),
                media_type="text/html",
                headers={"Content-Disposition": f"attachment; filename=report_{conversation_id}.html"}
            )

        elif format == "pdf":
            output_path = f"/tmp/report_{conversation_id}.pdf"
            await generate_pdf_report(report_markdown, output_path)
            return FileResponse(
                output_path,
                media_type="application/pdf",
                filename=f"report_{conversation_id}.pdf"
            )

        elif format == "csv":
            # Generate CSV from state (would need actual state data)
            output_path = f"/tmp/report_{conversation_id}.csv"
            # TODO: Generate CSV from actual conversation data
            return FileResponse(
                output_path,
                media_type="text/csv",
                filename=f"report_{conversation_id}.csv"
            )

    except Exception as e:
        logger.error(f"Report download error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conversations")
async def list_conversations(
    session_id: str = Query(...),
    limit: int = Query(50, ge=1, le=100)
):
    """
    List conversations for a session.

    Args:
        session_id: Browser session ID
        limit: Maximum number of conversations to return

    Returns:
        List of conversation summaries
    """
    try:
        # TODO: Query database for ResearchConversation records
        # For now, return empty list
        return {"conversations": []}

    except Exception as e:
        logger.error(f"List conversations error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/conversations")
async def create_conversation(
    session_id: str = Form(...),
    title: str = Form(...),
    provider: str = Form("openai"),
    model_name: str = Form("gpt-4o")
):
    """
    Create a new conversation.

    Args:
        session_id: Browser session ID
        title: Conversation title
        provider: AI provider (openai | anthropic)
        model_name: Model name

    Returns:
        Created conversation metadata
    """
    try:
        conversation_id = str(uuid.uuid4())

        # Create sandbox
        sandbox_dir = sandbox_manager.create_sandbox(conversation_id)

        # TODO: Create ResearchConversation record in database

        logger.info(f"Created conversation {conversation_id} with {provider}/{model_name}")

        return {
            "id": conversation_id,
            "session_id": session_id,
            "title": title,
            "provider": provider,
            "model_name": model_name,
            "sandbox_dir": str(sandbox_dir),
            "created_at": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"Create conversation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """
    Delete a conversation and its sandbox.

    Args:
        conversation_id: ID of the conversation to delete

    Returns:
        Deletion confirmation
    """
    try:
        # TODO: Delete ResearchConversation from database
        # This will cascade delete ResearchMessage and UploadedFile records

        # Delete sandbox directory
        sandbox_dir = sandbox_manager.base_dir / conversation_id
        if sandbox_dir.exists():
            import shutil
            shutil.rmtree(sandbox_dir)
            logger.info(f"Deleted sandbox for conversation {conversation_id}")

        return {"deleted": True, "conversation_id": conversation_id}

    except Exception as e:
        logger.error(f"Delete conversation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

"""
Scientific Chat Router

WebSocket and REST API for GPT-powered scientific chatbot with MCP tool integration.

Features:
- Real-time streaming responses from OpenAI GPT-5.2
- Tool calling with MCP scientific skills (140+ tools)
- Session-based conversations with sandboxed file storage
- Conversation history and persistence
- File management in isolated directories
"""

import asyncio
import json
import logging
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from openai import AsyncOpenAI

from app.core.database import get_db
from app.core.config import settings
from app.core.mcp_manager import mcp_manager
from app.core.sandbox_manager import sandbox_manager
from app.models.models import ChatConversation, ChatMessage

logger = logging.getLogger("scientific_chat")
router = APIRouter()

# Initialize OpenAI client
openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
DEFAULT_MODEL = "gpt-5.2"

# Rate limiting (30 messages per minute per session)
rate_limit_tracker: Dict[str, List[float]] = {}
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX = 30  # messages


def check_rate_limit(session_id: str) -> bool:
    """Check if session is within rate limit"""
    now = time.time()

    if session_id not in rate_limit_tracker:
        rate_limit_tracker[session_id] = []

    # Remove timestamps older than window
    rate_limit_tracker[session_id] = [
        ts for ts in rate_limit_tracker[session_id]
        if now - ts < RATE_LIMIT_WINDOW
    ]

    # Check limit
    if len(rate_limit_tracker[session_id]) >= RATE_LIMIT_MAX:
        return False

    # Add current timestamp
    rate_limit_tracker[session_id].append(now)
    return True


async def get_or_create_conversation(
    conversation_id: Optional[str],
    session_id: str,
    db: AsyncSession
) -> ChatConversation:
    """Get existing conversation or create new one"""

    if conversation_id:
        # Load existing conversation
        result = await db.execute(
            select(ChatConversation).where(ChatConversation.id == conversation_id)
        )
        conversation = result.scalar_one_or_none()

        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        return conversation
    else:
        # Create new conversation
        new_id = str(uuid.uuid4())
        sandbox_dir = str(sandbox_manager.create_sandbox(new_id))

        conversation = ChatConversation(
            id=new_id,
            session_id=session_id,
            title="New Conversation",
            sandbox_dir=sandbox_dir,
            model_name="claude-sonnet-4-20250514",
            message_count=0,
            total_tokens_used=0
        )

        db.add(conversation)
        await db.commit()
        await db.refresh(conversation)

        logger.info(f"Created new conversation: {new_id}")
        return conversation


async def build_claude_messages(
    conversation: ChatConversation,
    db: AsyncSession
) -> List[Dict[str, Any]]:
    """Build message history for Claude API from database"""

    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.conversation_id == conversation.id)
        .order_by(ChatMessage.created_at)
    )
    messages_db = result.scalars().all()

    claude_messages = []

    for msg in messages_db:
        content = []

        # Add text content
        if msg.content:
            content.append({"type": "text", "text": msg.content})

        # Add tool calls if present
        if msg.tool_calls_json:
            tool_calls = json.loads(msg.tool_calls_json)
            for tool_call in tool_calls:
                content.append({
                    "type": "tool_use",
                    "id": tool_call["id"],
                    "name": tool_call["name"],
                    "input": tool_call["input"]
                })

        # Add tool results if present
        if msg.tool_results_json:
            tool_results = json.loads(msg.tool_results_json)
            for result_item in tool_results:
                content.append({
                    "type": "tool_result",
                    "tool_use_id": result_item["tool_use_id"],
                    "content": result_item["content"]
                })

        if content:
            claude_messages.append({
                "role": msg.role,
                "content": content if len(content) > 1 else content[0]
            })

    return claude_messages


async def save_message(
    conversation: ChatConversation,
    role: str,
    content: str,
    thinking: Optional[str] = None,
    tool_calls: Optional[List[Dict]] = None,
    tool_results: Optional[List[Dict]] = None,
    tokens_used: int = 0,
    db: AsyncSession = None
) -> ChatMessage:
    """Save message to database"""

    message = ChatMessage(
        id=str(uuid.uuid4()),
        conversation_id=conversation.id,
        role=role,
        content=content,
        thinking=thinking,
        tool_calls_json=json.dumps(tool_calls) if tool_calls else None,
        tool_results_json=json.dumps(tool_results) if tool_results else None,
        tokens_used=tokens_used
    )

    db.add(message)

    # Update conversation stats
    conversation.message_count += 1
    conversation.total_tokens_used += tokens_used
    conversation.last_message_at = datetime.utcnow()

    # Auto-generate title from first user message
    if conversation.message_count == 1 and role == "user":
        conversation.title = content[:50] + ("..." if len(content) > 50 else "")

    await db.commit()
    await db.refresh(message)

    return message


@router.websocket("/stream")
async def websocket_stream(websocket: WebSocket):
    """
    WebSocket endpoint for streaming chat with Claude

    Protocol:
    Client -> Server:
        {
            "type": "message",
            "conversation_id": "uuid-or-null",
            "content": "user message",
            "session_id": "session_xxx"
        }

    Server -> Client:
        {"type": "content_delta", "delta": "text chunk"}
        {"type": "thinking", "thinking": "Claude's thinking"}
        {"type": "tool_call", "tool": {...}}
        {"type": "tool_result", "result": {...}}
        {"type": "message_complete", "message_id": "uuid", "tokens_used": 123}
        {"type": "error", "error": "error message"}
    """
    await websocket.accept()

    try:
        async for db in get_db():
            while True:
                # Receive message from client
                data = await websocket.receive_json()

                if data.get("type") != "message":
                    await websocket.send_json({
                        "type": "error",
                        "error": "Invalid message type"
                    })
                    continue

                session_id = data.get("session_id")
                if not session_id:
                    await websocket.send_json({
                        "type": "error",
                        "error": "session_id is required"
                    })
                    continue

                # Rate limiting
                if not check_rate_limit(session_id):
                    await websocket.send_json({
                        "type": "error",
                        "error": "Rate limit exceeded (30 messages per minute)"
                    })
                    continue

                try:
                    # Get or create conversation
                    conversation = await get_or_create_conversation(
                        data.get("conversation_id"),
                        session_id,
                        db
                    )

                    # Send conversation ID to client if new
                    if not data.get("conversation_id"):
                        await websocket.send_json({
                            "type": "conversation_created",
                            "conversation_id": conversation.id
                        })

                    # Save user message
                    user_content = data.get("content", "")
                    await save_message(
                        conversation,
                        role="user",
                        content=user_content,
                        db=db
                    )

                    # Build message history
                    messages = await build_claude_messages(conversation, db)
                    messages.append({
                        "role": "user",
                        "content": user_content
                    })

                    # Get MCP tools as Claude schema
                    tools = mcp_manager.get_claude_tools_schema()

                    # System prompt with sandbox context
                    system_prompt = f"""You are a scientific research assistant with access to 140+ computational tools via MCP (Model Context Protocol).

Your workspace is an isolated sandbox directory at: {conversation.sandbox_dir}

Available tool categories:
- Databases: PubMed, UniProt, ChEMBL, DrugBank, COSMIC, ClinVar, Ensembl, PDB
- Python Packages: RDKit, Scanpy, PyTorch, Scikit-learn, NumPy, Pandas, SciPy, BioPython
- Visualization: Matplotlib, Seaborn, plotly
- Bioinformatics: Sequence analysis, alignment, protein/DNA tools, BLAST
- Chemistry: Molecular modeling, SMILES/InChI conversion, reaction analysis
- Machine Learning: Training, prediction, classification, clustering

When using tools:
1. Explain your reasoning before calling tools
2. Use tools to answer scientific questions
3. Save data files to the sandbox directory
4. Provide clear summaries of results

Be concise, accurate, and helpful."""

                    # Tool calling loop (max 10 iterations)
                    max_iterations = 10
                    assistant_content_parts = []
                    assistant_thinking = None
                    all_tool_calls = []
                    all_tool_results = []
                    total_tokens = 0

                    for iteration in range(max_iterations):
                        # Stream from Claude
                        async with anthropic_client.messages.stream(
                            model=conversation.model_name,
                            max_tokens=4096,
                            system=system_prompt,
                            messages=messages,
                            tools=tools if tools else None
                        ) as stream:
                            # Stream text deltas
                            async for event in stream:
                                if hasattr(event, 'type'):
                                    if event.type == "content_block_delta":
                                        if hasattr(event.delta, 'text'):
                                            await websocket.send_json({
                                                "type": "content_delta",
                                                "delta": event.delta.text
                                            })
                                    elif event.type == "message_start":
                                        # Capture thinking if present
                                        if hasattr(event, 'message') and hasattr(event.message, 'thinking'):
                                            thinking_text = event.message.thinking
                                            assistant_thinking = thinking_text
                                            await websocket.send_json({
                                                "type": "thinking",
                                                "thinking": thinking_text
                                            })

                            # Get final message
                            final_message = await stream.get_final_message()
                            total_tokens += final_message.usage.input_tokens + final_message.usage.output_tokens

                            # Extract content
                            text_content = ""
                            tool_calls = []

                            for block in final_message.content:
                                if block.type == "text":
                                    text_content += block.text
                                elif block.type == "tool_use":
                                    tool_calls.append({
                                        "id": block.id,
                                        "name": block.name,
                                        "input": block.input
                                    })

                            assistant_content_parts.append(text_content)

                            # Check if Claude wants to use tools
                            if final_message.stop_reason == "tool_use" and tool_calls:
                                # Send tool call info to frontend
                                for tool_call in tool_calls:
                                    await websocket.send_json({
                                        "type": "tool_call",
                                        "tool": tool_call
                                    })
                                    all_tool_calls.append(tool_call)

                                # Execute tools via MCP
                                tool_results = []
                                for tool_call in tool_calls:
                                    result = await mcp_manager.execute_skill(
                                        skill_name=tool_call["name"],
                                        params=tool_call["input"],
                                        timeout=60
                                    )

                                    tool_result = {
                                        "type": "tool_result",
                                        "tool_use_id": tool_call["id"],
                                        "content": result["output"] if result["success"]
                                                  else f"Error: {result['error']}"
                                    }
                                    tool_results.append(tool_result)
                                    all_tool_results.append(tool_result)

                                    # Send result to frontend
                                    await websocket.send_json({
                                        "type": "tool_result",
                                        "result": result
                                    })

                                # Add assistant message + tool results to history
                                messages.append({
                                    "role": "assistant",
                                    "content": final_message.content
                                })
                                messages.append({
                                    "role": "user",
                                    "content": tool_results
                                })

                                # Continue to next iteration
                                continue
                            else:
                                # Done - no more tool calls
                                break

                    # Save assistant message
                    final_content = " ".join(assistant_content_parts)
                    message = await save_message(
                        conversation,
                        role="assistant",
                        content=final_content,
                        thinking=assistant_thinking,
                        tool_calls=all_tool_calls if all_tool_calls else None,
                        tool_results=all_tool_results if all_tool_results else None,
                        tokens_used=total_tokens,
                        db=db
                    )

                    await websocket.send_json({
                        "type": "message_complete",
                        "message_id": message.id,
                        "conversation_id": conversation.id,
                        "tokens_used": total_tokens
                    })

                except Exception as e:
                    logger.error(f"Error processing message: {e}", exc_info=True)
                    await websocket.send_json({
                        "type": "error",
                        "error": str(e)
                    })

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)


@router.post("/conversations")
async def create_conversation(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Create a new conversation"""

    conversation = await get_or_create_conversation(None, session_id, db)

    return {
        "id": conversation.id,
        "session_id": conversation.session_id,
        "title": conversation.title,
        "sandbox_dir": conversation.sandbox_dir,
        "created_at": conversation.created_at.isoformat()
    }


@router.get("/conversations/{session_id}")
async def list_conversations(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """List all conversations for a session"""

    result = await db.execute(
        select(ChatConversation)
        .where(ChatConversation.session_id == session_id)
        .order_by(ChatConversation.last_message_at.desc())
    )
    conversations = result.scalars().all()

    return [{
        "id": conv.id,
        "title": conv.title,
        "message_count": conv.message_count,
        "sandbox_dir": conv.sandbox_dir,
        "created_at": conv.created_at.isoformat(),
        "last_message_at": conv.last_message_at.isoformat()
    } for conv in conversations]


@router.get("/conversations/{conversation_id}/messages")
async def get_messages(
    conversation_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get all messages in a conversation"""

    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.conversation_id == conversation_id)
        .order_by(ChatMessage.created_at)
    )
    messages = result.scalars().all()

    return [{
        "id": msg.id,
        "role": msg.role,
        "content": msg.content,
        "thinking": msg.thinking,
        "tool_calls": json.loads(msg.tool_calls_json) if msg.tool_calls_json else None,
        "tool_results": json.loads(msg.tool_results_json) if msg.tool_results_json else None,
        "created_at": msg.created_at.isoformat()
    } for msg in messages]


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a conversation and its sandbox"""

    # Get conversation
    result = await db.execute(
        select(ChatConversation).where(ChatConversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Delete sandbox
    sandbox_manager.delete_sandbox(conversation_id)

    # Delete from database (cascade deletes messages)
    await db.execute(
        delete(ChatConversation).where(ChatConversation.id == conversation_id)
    )
    await db.commit()

    return {"success": True}


@router.get("/sandbox/{conversation_id}/files")
async def list_sandbox_files(
    conversation_id: str,
    subpath: str = "",
    db: AsyncSession = Depends(get_db)
):
    """List files in conversation sandbox"""

    # Verify conversation exists
    result = await db.execute(
        select(ChatConversation).where(ChatConversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    files = sandbox_manager.list_files(conversation_id, subpath)
    return {"files": files}


@router.get("/sandbox/{conversation_id}/download/{file_path:path}")
async def download_sandbox_file(
    conversation_id: str,
    file_path: str,
    db: AsyncSession = Depends(get_db)
):
    """Download file from conversation sandbox"""

    # Verify conversation exists
    result = await db.execute(
        select(ChatConversation).where(ChatConversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Get file path with security validation
    target_path = sandbox_manager.get_file_path(conversation_id, file_path)

    if not target_path:
        raise HTTPException(status_code=404, detail="File not found or access denied")

    return FileResponse(
        path=target_path,
        filename=target_path.name,
        media_type="application/octet-stream"
    )

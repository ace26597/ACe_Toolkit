"""
Scientific Skills Router

Provides API endpoints and WebSocket terminal for accessing 140+ scientific computing skills.
"""

import uuid
import json
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.mcp_manager import mcp_manager
from app.models.models import SkillSession, SkillExecution

logger = logging.getLogger("skills_router")

router = APIRouter()


# Pydantic models for requests/responses
class ExecuteSkillRequest(BaseModel):
    skill_name: str
    params: Optional[Dict[str, Any]] = None
    session_id: str


class ExecuteSkillResponse(BaseModel):
    id: str
    success: bool
    output: Optional[str]
    error: Optional[str]
    execution_time_ms: int
    skill_name: str


class SkillInfo(BaseModel):
    name: str
    category: str
    description: str
    parameters: Dict[str, str]


class MCPStatusResponse(BaseModel):
    running: bool
    pid: Optional[int]
    uptime_seconds: int
    skills_count: int
    execution_count: int
    memory_mb: float


# Welcome message for terminal
WELCOME_MESSAGE = """
╔════════════════════════════════════════════════════════════════════╗
║                                                                    ║
║              🧪 Scientific Skills Terminal v1.0                    ║
║                                                                    ║
║  Access 140+ scientific computing tools from your browser          ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝

Available Commands:
  help               Show this help message
  list               List all available skills (140+)
  status             Show MCP server status
  <skill> [args]     Execute a skill with optional arguments
  exit               Close terminal connection

Examples:
  pubmed_search --query "CRISPR" --max_results 10
  protein_lookup --protein_id "P04637"
  calculate_similarity --smiles1 "CCO" --smiles2 "CC"

Type 'list' to see all available skills, or 'help' for more information.

"""

HELP_TEXT = """
═════════════════════════════════════════════════════════════════════
                         SKILLS TERMINAL HELP
═════════════════════════════════════════════════════════════════════

BASIC COMMANDS:
  help        - Show this help message
  list        - List all 140+ available scientific skills
  status      - Show MCP server status (uptime, memory, executions)
  exit        - Close the terminal connection

EXECUTING SKILLS:
  <skill_name> --param1 value1 --param2 value2

  Example:
    pubmed_search --query "machine learning" --max_results 5

SKILL CATEGORIES:
  • Databases (28)   - PubMed, UniProt, ChEMBL, DrugBank, etc.
  • Chemistry (20+)  - RDKit, molecular similarity, descriptors
  • Biology (15+)    - Sequence analysis, protein structures
  • ML/AI (25+)      - PyTorch, scikit-learn, TensorFlow
  • Data Science     - Pandas, NumPy, visualization

TIPS:
  • Use quotes for multi-word values: --query "deep learning"
  • Check 'list' output for exact skill names and parameters
  • All executions are saved in your session history
  • Skills timeout after 60 seconds

═════════════════════════════════════════════════════════════════════
"""


@router.get("/status", response_model=MCPStatusResponse)
async def get_mcp_status():
    """Get current MCP server status"""
    status = mcp_manager.get_status()
    return MCPStatusResponse(**status)


@router.get("/list", response_model=List[SkillInfo])
async def list_skills():
    """List all available scientific skills"""
    skills = mcp_manager.get_skills_list()
    return [SkillInfo(**skill) for skill in skills]


@router.post("/execute", response_model=ExecuteSkillResponse)
async def execute_skill(
    request: ExecuteSkillRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Execute a scientific skill and save execution to database

    Args:
        request: Skill execution request with skill_name, params, and session_id

    Returns:
        Execution result with output or error
    """
    execution_id = str(uuid.uuid4())

    logger.info(f"Executing skill: {request.skill_name} (session: {request.session_id})")

    # Ensure MCP server is running
    if not mcp_manager.is_running():
        logger.warning("MCP server not running, attempting to start...")
        started = await mcp_manager.start()
        if not started:
            raise HTTPException(
                status_code=503,
                detail="MCP server is not available. Please try again later."
            )

    # Execute skill via MCP manager
    result = await mcp_manager.execute_skill(
        skill_name=request.skill_name,
        params=request.params
    )

    # Save execution to database
    try:
        # Get or create skill session
        stmt = select(SkillSession).where(SkillSession.session_id == request.session_id)
        result_db = await db.execute(stmt)
        skill_session = result_db.scalar_one_or_none()

        if not skill_session:
            skill_session = SkillSession(
                id=str(uuid.uuid4()),
                session_id=request.session_id,
                name=f"Session {datetime.now().strftime('%Y-%m-%d %H:%M')}",
                description="Scientific skills terminal session"
            )
            db.add(skill_session)
            await db.flush()

        # Create execution record
        execution = SkillExecution(
            id=execution_id,
            session_id=skill_session.id,
            skill_name=request.skill_name,
            command=f"{request.skill_name} {json.dumps(request.params or {})}",
            input_params=json.dumps(request.params) if request.params else None,
            output=result.get("output"),
            error=result.get("error"),
            status="success" if result.get("success") else "failed",
            execution_time_ms=result.get("execution_time_ms", 0)
        )
        db.add(execution)
        await db.commit()

    except Exception as e:
        logger.error(f"Failed to save execution to database: {e}")
        await db.rollback()

    # Check memory after execution
    await mcp_manager.check_memory()

    return ExecuteSkillResponse(
        id=execution_id,
        success=result.get("success", False),
        output=result.get("output"),
        error=result.get("error"),
        execution_time_ms=result.get("execution_time_ms", 0),
        skill_name=request.skill_name
    )


@router.get("/history/{session_id}")
async def get_execution_history(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get execution history for a session

    Args:
        session_id: Browser session ID

    Returns:
        List of skill executions
    """
    # Get skill sessions for this browser session
    stmt = select(SkillSession).where(SkillSession.session_id == session_id)
    result = await db.execute(stmt)
    skill_sessions = result.scalars().all()

    if not skill_sessions:
        return []

    # Get all executions for these sessions
    all_executions = []
    for session in skill_sessions:
        stmt = select(SkillExecution).where(
            SkillExecution.session_id == session.id
        ).order_by(SkillExecution.created_at.desc())
        result = await db.execute(stmt)
        executions = result.scalars().all()

        for execution in executions:
            all_executions.append({
                "id": execution.id,
                "skill_name": execution.skill_name,
                "command": execution.command,
                "output": execution.output,
                "error": execution.error,
                "status": execution.status,
                "execution_time_ms": execution.execution_time_ms,
                "created_at": execution.created_at.isoformat()
            })

    return all_executions


@router.websocket("/terminal")
async def websocket_terminal(websocket: WebSocket):
    """
    WebSocket endpoint for terminal emulator

    Accepts commands and executes skills, returning results in real-time.
    """
    await websocket.accept()
    logger.info("WebSocket terminal connected")

    # Send welcome message
    await websocket.send_text(WELCOME_MESSAGE)

    # Generate session ID for this connection
    session_id = str(uuid.uuid4())

    # Ensure MCP server is running
    if not mcp_manager.is_running():
        logger.info("MCP server not running, starting...")
        started = await mcp_manager.start()
        if started:
            await websocket.send_text("\n✓ MCP server started successfully\n\n")
        else:
            await websocket.send_text("\n✗ Failed to start MCP server. Some skills may not work.\n\n")

    try:
        while True:
            # Receive command from terminal
            command = await websocket.receive_text()
            command = command.strip()

            if not command:
                continue

            # Handle built-in commands
            if command.lower() == "help":
                await websocket.send_text(HELP_TEXT)
                continue

            elif command.lower() == "list":
                skills = mcp_manager.get_skills_list()
                output = "\n═════════ AVAILABLE SKILLS ═════════\n\n"

                # Group by category
                categories: Dict[str, List[Dict]] = {}
                for skill in skills:
                    cat = skill["category"]
                    if cat not in categories:
                        categories[cat] = []
                    categories[cat].append(skill)

                for category, cat_skills in categories.items():
                    output += f"📦 {category} ({len(cat_skills)} skills)\n"
                    for skill in cat_skills:
                        output += f"   • {skill['name']:<30} - {skill['description']}\n"
                    output += "\n"

                output += f"Total: {len(skills)} skills available\n"
                output += "═══════════════════════════════════\n"
                await websocket.send_text(output)
                continue

            elif command.lower() == "status":
                status = mcp_manager.get_status()
                output = "\n═════════ MCP SERVER STATUS ═════════\n"
                output += f"Running:        {'Yes' if status['running'] else 'No'}\n"
                output += f"PID:            {status['pid']}\n"
                output += f"Uptime:         {status['uptime_seconds']} seconds\n"
                output += f"Memory:         {status['memory_mb']} MB\n"
                output += f"Skills loaded:  {status['skills_count']}\n"
                output += f"Executions:     {status['execution_count']}\n"
                output += "═════════════════════════════════════\n"
                await websocket.send_text(output)
                continue

            elif command.lower() == "exit":
                await websocket.send_text("\nGoodbye! 👋\n")
                await websocket.close()
                break

            # Parse and execute skill command
            # Format: skill_name --param1 value1 --param2 value2
            parts = command.split()
            if len(parts) == 0:
                continue

            skill_name = parts[0]
            params = {}

            # Parse parameters
            i = 1
            while i < len(parts):
                if parts[i].startswith("--"):
                    param_name = parts[i][2:]  # Remove --
                    if i + 1 < len(parts) and not parts[i + 1].startswith("--"):
                        param_value = parts[i + 1]
                        params[param_name] = param_value
                        i += 2
                    else:
                        i += 1
                else:
                    i += 1

            # Execute skill
            await websocket.send_text(f"\nExecuting: {skill_name}...\n")

            result = await mcp_manager.execute_skill(
                skill_name=skill_name,
                params=params if params else None
            )

            # Format and send result
            if result.get("success"):
                await websocket.send_text(f"\n✓ Success ({result['execution_time_ms']}ms)\n")
                await websocket.send_text(f"{result['output']}\n\n")
            else:
                await websocket.send_text(f"\n✗ Error ({result['execution_time_ms']}ms)\n")
                await websocket.send_text(f"{result['error']}\n\n")

    except WebSocketDisconnect:
        logger.info("WebSocket terminal disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.send_text(f"\nError: {str(e)}\n")
        except:
            pass

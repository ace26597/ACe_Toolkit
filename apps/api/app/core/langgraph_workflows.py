"""
LangGraph Research Workflows for multi-step research orchestration.

Implements a StateGraph with nodes for:
- Routing: Determine workflow type
- Search: Tavily web search
- File Processing: Extract content from uploads
- Analysis: AI + MCP tools analysis
- Synthesis: Combine findings
- Report Generation: Create formatted reports
- Quality Check: Validate completeness
"""

from typing import TypedDict, List, Dict, Optional, Annotated
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
import operator
import logging
from datetime import datetime

# Import internal modules
from .ai_provider import get_ai_provider, ModelConfig, AIResponse
from .file_processor import process_uploaded_file
from .report_generator import generate_markdown_report

logger = logging.getLogger(__name__)

# Tavily client will be initialized when settings are available
tavily_client = None


class ResearchState(TypedDict):
    """State maintained throughout research workflow"""

    # Input
    user_query: str
    uploaded_files: List[Dict]  # File metadata
    model_config: Dict  # {provider, model_name}
    conversation_id: str
    session_id: str

    # Workflow control
    workflow_type: str  # "search" | "analysis" | "direct"
    current_step: str
    needs_feedback: bool
    feedback: Optional[str]

    # Search results
    search_results: Annotated[List[Dict], operator.add]  # Tavily results

    # File processing
    extracted_content: Annotated[List[Dict], operator.add]  # From files

    # Analysis
    analysis_results: Annotated[List[str], operator.add]  # AI insights

    # Synthesis
    synthesis: str  # Combined findings

    # Report
    report: str  # Final formatted report

    # MCP Tools
    mcp_tool_calls: Annotated[List[Dict], operator.add]
    mcp_tool_results: Annotated[List[Dict], operator.add]

    # Message history for AI
    messages: List[Dict]

    # Metadata
    tokens_used: int
    steps_completed: Annotated[List[str], operator.add]


async def router_node(state: ResearchState) -> ResearchState:
    """
    Determine workflow type based on query and files.

    Routes to:
    - "search": Web/database search needed
    - "analysis": Focus on analyzing files
    - "direct": Direct question answering
    """
    logger.info(f"Router node: analyzing query - {state['user_query'][:100]}")

    has_files = len(state["uploaded_files"]) > 0
    query_lower = state["user_query"].lower()

    # Check for search keywords
    search_keywords = ["search", "find", "recent", "news", "papers", "research on", "latest"]
    needs_search = any(kw in query_lower for kw in search_keywords)

    # Check for database-specific searches
    database_keywords = ["pubmed", "arxiv", "uniprot", "chembl"]
    needs_db_search = any(kw in query_lower for kw in database_keywords)

    if has_files and not needs_search:
        state["workflow_type"] = "analysis"  # Focus on analyzing files
        logger.info("Workflow type: ANALYSIS (file-focused)")
    elif needs_search or needs_db_search:
        state["workflow_type"] = "search"  # Web/database search
        logger.info("Workflow type: SEARCH (web/database)")
    else:
        state["workflow_type"] = "direct"  # Direct question answering
        logger.info("Workflow type: DIRECT (Q&A)")

    state["steps_completed"].append("routing")
    return state


async def search_node(state: ResearchState) -> ResearchState:
    """Execute Tavily web search if workflow type is search"""

    if state["workflow_type"] not in ["search"]:
        logger.info("Skipping search node (not a search workflow)")
        return state  # Skip if not search workflow

    try:
        logger.info(f"Executing Tavily search for: {state['user_query']}")

        # Initialize Tavily client if not already done
        global tavily_client
        if tavily_client is None:
            from tavily import TavilyClient
            from ..core.config import settings
            tavily_client = TavilyClient(api_key=settings.TAVILY_API_KEY)

        # Perform Tavily search
        search_response = tavily_client.search(
            query=state["user_query"],
            search_depth="advanced",
            max_results=10
        )

        # Extract results
        results = []
        for result in search_response.get("results", []):
            results.append({
                "title": result["title"],
                "url": result["url"],
                "content": result["content"],
                "score": result.get("score", 0)
            })

        state["search_results"].extend(results)
        state["steps_completed"].append("search")
        logger.info(f"Found {len(results)} search results")

    except Exception as e:
        logger.error(f"Search node error: {e}")
        # Continue workflow even if search fails
        state["steps_completed"].append("search_failed")

    return state


async def file_processing_node(state: ResearchState) -> ResearchState:
    """Process uploaded files using appropriate parsers"""

    if not state["uploaded_files"]:
        logger.info("Skipping file processing (no files uploaded)")
        return state  # Skip if no files

    try:
        logger.info(f"Processing {len(state['uploaded_files'])} uploaded files")

        # Get API keys from settings
        from ..core.config import settings
        api_keys = {
            "openai": settings.OPENAI_API_KEY,
            "anthropic": settings.ANTHROPIC_API_KEY
        }

        model_config = ModelConfig(**state["model_config"])

        for file_meta in state["uploaded_files"]:
            result = await process_uploaded_file(
                file_path=file_meta["file_path"],
                file_type=file_meta["file_type"],
                model_config=model_config,
                api_keys=api_keys
            )

            if result["success"]:
                state["extracted_content"].append({
                    "filename": file_meta["original_filename"],
                    "content": result["content"],
                    "method": result["method"]
                })
                logger.info(f"Extracted content from {file_meta['original_filename']} using {result['method']}")
            else:
                logger.error(f"Failed to extract from {file_meta['original_filename']}: {result.get('error')}")

        state["steps_completed"].append("file_processing")

    except Exception as e:
        logger.error(f"File processing node error: {e}")
        state["steps_completed"].append("file_processing_failed")

    return state


async def analysis_node(state: ResearchState) -> ResearchState:
    """Analyze search results and file content using AI + MCP tools"""

    logger.info("Analysis node: synthesizing information")

    try:
        # Build context for AI
        context_parts = []

        if state["search_results"]:
            context_parts.append("## Web Search Results\n")
            for i, result in enumerate(state["search_results"][:5], 1):  # Limit to top 5
                context_parts.append(f"### {i}. {result['title']}\n{result['content'][:500]}...\nSource: {result['url']}\n")

        if state["extracted_content"]:
            context_parts.append("\n## Uploaded Files Analysis\n")
            for file_content in state["extracted_content"]:
                content_preview = file_content['content'][:1000]  # Limit to 1000 chars
                context_parts.append(f"### {file_content['filename']}\n{content_preview}...\n")

        context = "\n".join(context_parts) if context_parts else "No additional context available."

        # Get AI provider
        from ..core.config import settings
        api_keys = {
            "openai": settings.OPENAI_API_KEY,
            "anthropic": settings.ANTHROPIC_API_KEY
        }

        model_config = ModelConfig(**state["model_config"])
        provider = get_ai_provider(model_config.provider, model_config.model_name, api_keys)

        # Analysis prompt
        analysis_messages = [
            {
                "role": "user",
                "content": f"""You are a research assistant. Analyze the following information to answer this query:

Query: {state["user_query"]}

Context:
{context}

Provide a detailed analysis focusing on:
1. Key findings and insights that directly answer the query
2. Supporting evidence from the sources
3. Relevant data points and statistics
4. Scientific validation and methodology (if applicable)
5. Practical implications or recommendations

Be thorough but concise."""
            }
        ]

        # Call AI (without MCP tools for now - can be added later)
        response = await provider.chat(
            messages=analysis_messages,
            tools=None,  # MCP tools integration can be added
            max_tokens=2048
        )

        state["analysis_results"].append(response.content)
        state["tokens_used"] += response.tokens_used
        state["steps_completed"].append("analysis")

        logger.info(f"Analysis completed, used {response.tokens_used} tokens")

    except Exception as e:
        logger.error(f"Analysis node error: {e}")
        state["analysis_results"].append(f"Analysis failed: {str(e)}")
        state["steps_completed"].append("analysis_failed")

    return state


async def synthesis_node(state: ResearchState) -> ResearchState:
    """Synthesize findings into coherent response"""

    logger.info("Synthesis node: combining findings")

    try:
        # Combine all analysis results
        combined_analysis = "\n\n".join(state["analysis_results"])

        # Get AI provider
        from ..core.config import settings
        api_keys = {
            "openai": settings.OPENAI_API_KEY,
            "anthropic": settings.ANTHROPIC_API_KEY
        }

        model_config = ModelConfig(**state["model_config"])
        provider = get_ai_provider(model_config.provider, model_config.model_name, api_keys)

        synthesis_messages = [
            {
                "role": "user",
                "content": f"""Synthesize the following research findings into a clear, comprehensive response:

Original Query: {state["user_query"]}

Analysis Results:
{combined_analysis}

Create a synthesis that:
1. Directly answers the user's query
2. Highlights key findings
3. Cites sources and data
4. Provides actionable insights
5. Maintains scientific accuracy

Be concise but thorough."""
            }
        ]

        response = await provider.chat(
            messages=synthesis_messages,
            max_tokens=1024
        )

        state["synthesis"] = response.content
        state["tokens_used"] += response.tokens_used
        state["steps_completed"].append("synthesis")

        logger.info(f"Synthesis completed: {len(response.content)} chars")

    except Exception as e:
        logger.error(f"Synthesis node error: {e}")
        state["synthesis"] = f"Synthesis failed: {str(e)}"
        state["steps_completed"].append("synthesis_failed")

    return state


async def report_generation_node(state: ResearchState) -> ResearchState:
    """Generate formatted Markdown report"""

    logger.info("Report generation node: creating report")

    try:
        report = generate_markdown_report(state)
        state["report"] = report
        state["steps_completed"].append("report_generation")
        logger.info(f"Report generated: {len(report)} chars")

    except Exception as e:
        logger.error(f"Report generation error: {e}")
        state["report"] = f"# Report Generation Failed\n\n{str(e)}"
        state["steps_completed"].append("report_generation_failed")

    return state


async def quality_check_node(state: ResearchState) -> ResearchState:
    """Validate completeness and quality"""

    logger.info("Quality check node: validating output")

    # Check if synthesis addresses the query
    if not state["synthesis"] or len(state["synthesis"]) < 50:
        logger.warning("Synthesis too short or missing")
        state["needs_feedback"] = True
        return state

    # All checks passed
    state["steps_completed"].append("quality_check")
    logger.info("Quality check passed")
    return state


def finalize_node(state: ResearchState) -> ResearchState:
    """Final cleanup and state update"""

    state["steps_completed"].append("finalized")
    logger.info(f"Workflow finalized. Steps: {' → '.join(state['steps_completed'])}")
    return state


def should_continue(state: ResearchState) -> str:
    """Conditional edge - check if workflow should continue"""

    if state["needs_feedback"] and not state["feedback"]:
        return "finalize"  # Skip human-in-loop for now
    else:
        return "finalize"


def create_research_graph() -> StateGraph:
    """
    Create the research workflow graph.

    Returns:
        Compiled LangGraph workflow
    """
    logger.info("Creating research workflow graph")

    workflow = StateGraph(ResearchState)

    # Add nodes
    workflow.add_node("router", router_node)
    workflow.add_node("search", search_node)
    workflow.add_node("file_processing", file_processing_node)
    workflow.add_node("analysis", analysis_node)
    workflow.add_node("synthesis", synthesis_node)
    workflow.add_node("report_generation", report_generation_node)
    workflow.add_node("quality_check", quality_check_node)
    workflow.add_node("finalize", finalize_node)

    # Define edges (workflow path)
    workflow.set_entry_point("router")

    # Router branches to search and file_processing (parallel)
    workflow.add_edge("router", "search")
    workflow.add_edge("router", "file_processing")

    # Both converge to analysis
    workflow.add_edge("search", "analysis")
    workflow.add_edge("file_processing", "analysis")

    # Linear flow after analysis
    workflow.add_edge("analysis", "synthesis")
    workflow.add_edge("synthesis", "report_generation")
    workflow.add_edge("report_generation", "quality_check")

    # Conditional edge from quality_check
    workflow.add_conditional_edges(
        "quality_check",
        should_continue,
        {
            "finalize": "finalize"
        }
    )

    workflow.add_edge("finalize", END)

    # Compile with in-memory checkpointer
    memory = MemorySaver()
    app = workflow.compile(checkpointer=memory)

    logger.info("Research workflow graph compiled successfully")
    return app

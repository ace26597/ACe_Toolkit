from fastapi import APIRouter, HTTPException
from openai import AsyncOpenAI, APIError, APIStatusError, RateLimitError, APIConnectionError
from app.core.config import settings
from app.schemas import AiRequest
import json
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai_agent")

router = APIRouter()

# Lazy initialization - only create client when API key is available
client = None
if settings.OPENAI_API_KEY:
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

# Model to use - GPT-4o for fast, high-quality responses
OPENAI_MODEL = "gpt-4o"

# Step 1: Context Analysis Prompt
ANALYSIS_PROMPT = """You are a Mermaid.js expert and diagram analyst. Your task is to analyze the current diagram and understand the user's request.

Analyze the following:
1. **Diagram Type**: What type of Mermaid diagram is this? (flowchart, sequence, gantt, classDiagram, stateDiagram, erDiagram, journey, pie, quadrantChart, requirementDiagram, gitGraph, mindmap, timeline, etc.)
2. **Structure**: What are the main nodes/entities and their relationships?
3. **User Intent**: What does the user want to achieve with their request?
4. **Preservation**: What elements from the current diagram should be preserved or enhanced?

Return your analysis as a structured JSON object with these keys:
- diagram_type: string
- diagram_context: string (1-2 sentence description of what this diagram represents)
- main_entities: list of strings
- relationships: list of strings describing connections
- user_intent: string summarizing what the user wants
- preservation_notes: string describing what to keep or enhance
- suggestions: list of improvement ideas
- thinking: string (your internal reasoning about this diagram and how to approach the task)

Be thorough but concise. This analysis will be used to generate the final diagram."""

# Step 2: Generation Prompt
GENERATION_PROMPT = """You are a Mermaid.js expert and diagram designer. Your task is to generate or modify Mermaid diagram code based on the provided analysis and user request.

CRITICAL RULES:
1. Return ONLY the Mermaid code - no explanations, no markdown formatting, no backticks.
2. Ensure the syntax is valid for the latest Mermaid version (11+).
3. Use meaningful labels and clean connections.
4. If using configuration blocks (---), they MUST be at the very top.
5. Preserve the essence and structure identified in the analysis.
6. Make the diagram professional, readable, and visually appealing.
7. Use appropriate styling and classes when beneficial.

BEST PRACTICES BY DIAGRAM TYPE:
- Flowcharts: Use clear direction (TD/LR), group related nodes, use subgraphs for organization.
- Sequence Diagrams: Keep actors minimal, use activation boxes, add notes for clarity.
- Class Diagrams: Show proper relationships (inheritance, composition), include key methods/attributes.
- State Diagrams: Show all transitions clearly, use [*] for start/end states.
- ER Diagrams: Define proper cardinality, use meaningful relationship labels.

Generate the diagram now, incorporating the analysis insights."""

# Step 3: Summary Prompt
SUMMARY_PROMPT = """Based on the changes made to the diagram, provide a concise summary.

Return a JSON object with:
- edition_title: string (short 3-5 word title for this version, e.g., "Added User Authentication Flow")
- changes_made: list of strings (bullet points of specific changes)
- diagram_description: string (1-2 sentence description of what the diagram now represents)

Be concise and specific."""


async def analyze_context(current_code: str, user_prompt: str) -> dict:
    """Step 1: Analyze the current diagram and user intent."""
    logger.info("=" * 60)
    logger.info("STEP 1: CONTEXT ANALYSIS")
    logger.info("=" * 60)
    logger.info(f"User Prompt: {user_prompt}")
    logger.info(f"Current Code Length: {len(current_code)} chars")

    user_message = f"""CURRENT DIAGRAM CODE:
```
{current_code if current_code else "No existing diagram - this is a new diagram request."}
```

USER REQUEST: {user_prompt}

Provide your analysis as a JSON object."""

    logger.info(f"Sending analysis request to OpenAI {OPENAI_MODEL}...")
    start_time = datetime.now()

    response = await client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": ANALYSIS_PROMPT},
            {"role": "user", "content": user_message}
        ],
        max_tokens=2048,
        temperature=0.7
    )

    elapsed = (datetime.now() - start_time).total_seconds()
    logger.info(f"Analysis completed in {elapsed:.2f}s")

    raw_content = response.choices[0].message.content
    logger.info(f"Raw Analysis Response:\n{raw_content}")

    try:
        # Extract JSON from response (handle potential markdown wrapping)
        json_str = raw_content.strip()
        if json_str.startswith("```"):
            lines = json_str.split("\n")
            if lines[0].startswith("```"):
                lines.pop(0)
            if lines and lines[-1].startswith("```"):
                lines.pop()
            json_str = "\n".join(lines).strip()

        analysis = json.loads(json_str)
        logger.info(f"Parsed Analysis:")
        logger.info(f"   - Diagram Type: {analysis.get('diagram_type', 'unknown')}")
        logger.info(f"   - Context: {analysis.get('diagram_context', 'N/A')}")
        logger.info(f"   - User Intent: {analysis.get('user_intent', 'N/A')}")
        logger.info(f"   - Thinking: {analysis.get('thinking', 'N/A')}")
        return analysis
    except json.JSONDecodeError:
        logger.error(f"Failed to parse analysis JSON")
        return {"error": "Failed to parse analysis", "raw": raw_content}


async def generate_diagram(analysis: dict, current_code: str, user_prompt: str) -> str:
    """Step 2: Generate the diagram using the analysis context."""
    logger.info("=" * 60)
    logger.info("STEP 2: DIAGRAM GENERATION")
    logger.info("=" * 60)

    user_message = f"""CONTEXT ANALYSIS:
{json.dumps(analysis, indent=2)}

CURRENT CODE (if any):
{current_code if current_code else "None - creating new diagram"}

USER REQUEST: {user_prompt}

Generate the Mermaid diagram code now."""

    logger.info(f"Sending generation request to OpenAI {OPENAI_MODEL}...")
    start_time = datetime.now()

    response = await client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": GENERATION_PROMPT},
            {"role": "user", "content": user_message}
        ],
        max_tokens=4096,
        temperature=0.7
    )

    elapsed = (datetime.now() - start_time).total_seconds()
    logger.info(f"Generation completed in {elapsed:.2f}s")

    generated_code = response.choices[0].message.content.strip()
    logger.info(f"Generated Code:\n{generated_code[:500]}{'...' if len(generated_code) > 500 else ''}")

    return generated_code


async def generate_summary(current_code: str, new_code: str, user_prompt: str) -> dict:
    """Step 3: Generate a summary of changes for the edition."""
    logger.info("=" * 60)
    logger.info("STEP 3: CHANGE SUMMARY")
    logger.info("=" * 60)

    user_message = f"""ORIGINAL CODE:
{current_code if current_code else "No original diagram"}

NEW CODE:
{new_code}

USER REQUEST: {user_prompt}

Provide a summary of the changes as a JSON object."""

    logger.info(f"Sending summary request to OpenAI {OPENAI_MODEL}...")
    start_time = datetime.now()

    response = await client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": SUMMARY_PROMPT},
            {"role": "user", "content": user_message}
        ],
        max_tokens=1024,
        temperature=0.7
    )

    elapsed = (datetime.now() - start_time).total_seconds()
    logger.info(f"Summary completed in {elapsed:.2f}s")

    raw_content = response.choices[0].message.content
    logger.info(f"Raw Summary Response:\n{raw_content}")

    try:
        # Extract JSON from response (handle potential markdown wrapping)
        json_str = raw_content.strip()
        if json_str.startswith("```"):
            lines = json_str.split("\n")
            if lines[0].startswith("```"):
                lines.pop(0)
            if lines and lines[-1].startswith("```"):
                lines.pop()
            json_str = "\n".join(lines).strip()

        summary = json.loads(json_str)
        logger.info(f"Edition Title: {summary.get('edition_title', 'AI Update')}")
        return summary
    except json.JSONDecodeError:
        logger.error(f"Failed to parse summary JSON")
        return {"edition_title": "AI Update", "changes_made": [], "diagram_description": ""}


def clean_mermaid_code(code: str) -> str:
    """Clean any markdown formatting from the generated code."""
    cleaned = code.strip()

    # Remove markdown code blocks if present
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        if lines[0].startswith("```"):
            lines.pop(0)
        if lines and lines[-1].startswith("```"):
            lines.pop()
        cleaned = "\n".join(lines).strip()

    # Remove 'mermaid' language identifier if it remained at the start
    if cleaned.lower().startswith("mermaid"):
        cleaned = cleaned[7:].strip()

    return cleaned


@router.post("/generate")
async def generate_diagram_endpoint(req: AiRequest):
    logger.info("=" * 80)
    logger.info("AI DIAGRAM GENERATION PIPELINE STARTED (OpenAI GPT-4o)")
    logger.info(f"Timestamp: {datetime.now().isoformat()}")
    logger.info("=" * 80)

    if not settings.OPENAI_API_KEY:
        logger.error("OpenAI API key not configured")
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")

    if not client:
        raise HTTPException(status_code=500, detail="AI client not initialized")

    try:
        # Step 1: Analyze context
        analysis = await analyze_context(req.current_code or "", req.prompt)

        # Step 2: Generate diagram with context
        mermaid_code = await generate_diagram(analysis, req.current_code or "", req.prompt)

        # Clean up any markdown formatting
        mermaid_code = clean_mermaid_code(mermaid_code)

        # Step 3: Generate summary for edition
        summary = await generate_summary(req.current_code or "", mermaid_code, req.prompt)

        logger.info("=" * 80)
        logger.info("AI PIPELINE COMPLETED SUCCESSFULLY")
        logger.info("=" * 80)

        return {
            "mermaid_code": mermaid_code,
            "analysis": analysis,
            "summary": summary,
            "edition_title": summary.get("edition_title", "AI Update"),
            "changes_made": summary.get("changes_made", []),
            "diagram_description": summary.get("diagram_description", analysis.get("diagram_context", "")),
            "thinking": analysis.get("thinking", "")
        }

    except APIStatusError as e:
        logger.error(f"OpenAI API Error: {e}")
        # Check for specific error types
        error_message = str(e)

        if "insufficient_quota" in error_message.lower() or "quota" in error_message.lower():
            raise HTTPException(
                status_code=402,  # Payment Required
                detail="AI feature requires API credits. Please contact the administrator to add credits to the OpenAI account."
            )
        elif "invalid" in error_message.lower() and "api" in error_message.lower() and "key" in error_message.lower():
            raise HTTPException(
                status_code=401,
                detail="AI API key is invalid. Please contact the administrator."
            )
        elif "rate limit" in error_message.lower():
            raise HTTPException(
                status_code=429,
                detail="AI service is temporarily rate-limited. Please try again in a few moments."
            )
        else:
            raise HTTPException(status_code=500, detail=f"AI service error: {error_message}")

    except RateLimitError as e:
        logger.error(f"Rate Limit Error: {e}")
        raise HTTPException(
            status_code=429,
            detail="Too many AI requests. Please wait a moment and try again."
        )

    except APIConnectionError as e:
        logger.error(f"API Connection Error: {e}")
        raise HTTPException(
            status_code=503,
            detail="Cannot connect to AI service. Please check your internet connection and try again."
        )

    except APIError as e:
        logger.error(f"General API Error: {e}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

    except Exception as e:
        logger.error(f"Unexpected Error: {e}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

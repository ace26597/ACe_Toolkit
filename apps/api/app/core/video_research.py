"""
Video Factory Research Module

Provides web search and research capabilities for generating
fact-backed video scripts. Uses Claude Code with web search - NO external APIs needed.
"""

import asyncio
import json
import re
import subprocess
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
from pathlib import Path
from app.core.config import settings


@dataclass
class ResearchFinding:
    """A single research finding."""
    type: str  # "statistic", "fact", "quote", "trend"
    content: str
    source: Optional[str] = None
    confidence: float = 0.8


@dataclass
class ResearchResult:
    """Complete research results for a topic."""
    topic: str
    statistics: List[str]
    facts: List[str]
    quotes: List[str]
    trends: List[str]
    key_points: List[str]
    suggested_hook: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    def to_context_string(self) -> str:
        """Convert to a string for use in prompts."""
        parts = [f"Research on: {self.topic}\n"]

        if self.statistics:
            parts.append("**Statistics:**")
            for stat in self.statistics[:5]:
                parts.append(f"- {stat}")
            parts.append("")

        if self.facts:
            parts.append("**Key Facts:**")
            for fact in self.facts[:5]:
                parts.append(f"- {fact}")
            parts.append("")

        if self.quotes:
            parts.append("**Notable Quotes:**")
            for quote in self.quotes[:3]:
                parts.append(f"- \"{quote}\"")
            parts.append("")

        if self.trends:
            parts.append("**Current Trends:**")
            for trend in self.trends[:3]:
                parts.append(f"- {trend}")
            parts.append("")

        if self.key_points:
            parts.append("**Key Points:**")
            for point in self.key_points[:5]:
                parts.append(f"- {point}")

        return "\n".join(parts)


async def research_with_claude_code(topic: str, style: str = "educational") -> Dict[str, Any]:
    """
    Research a topic using Claude Code with web search.

    NO external APIs needed - Claude Code has built-in web search.
    """
    # Build the research prompt
    prompt = f"""Research the topic "{topic}" for a {style} short video.

Use web search to find:
1. 3-5 specific statistics with numbers (percentages, dollar amounts, growth rates)
2. 3-5 interesting facts that would surprise viewers
3. 1-3 notable quotes from experts
4. Current trends related to this topic
5. Key points that would make engaging video content

IMPORTANT: Output your findings as a JSON object with this exact structure:
{{
    "statistics": ["stat1 with number", "stat2 with number", ...],
    "facts": ["interesting fact 1", "interesting fact 2", ...],
    "quotes": ["quote from expert", ...],
    "trends": ["current trend 1", ...],
    "key_points": ["key point 1", "key point 2", ...],
    "suggested_hook": "A hook using the most surprising finding"
}}

Output ONLY the JSON, no other text."""

    try:
        # Run Claude Code with web search enabled
        result = await asyncio.to_thread(
            subprocess.run,
            [
                "claude",
                "-p", prompt,
                "--output-format", "text",
                "--max-turns", "3",
            ],
            capture_output=True,
            text=True,
            timeout=120,  # 2 minute timeout
            cwd=str(Path.home()),
        )

        output = result.stdout.strip()

        # Try to extract JSON from output
        json_match = re.search(r'\{[\s\S]*\}', output)
        if json_match:
            try:
                data = json.loads(json_match.group())
                return {
                    "success": True,
                    "data": data,
                }
            except json.JSONDecodeError:
                pass

        # If JSON parsing failed, extract what we can
        return {
            "success": True,
            "data": {
                "statistics": extract_statistics(output),
                "facts": extract_facts(output),
                "quotes": extract_quotes(output),
                "trends": [],
                "key_points": extract_key_points(output),
                "suggested_hook": None,
            }
        }

    except subprocess.TimeoutExpired:
        return {"success": False, "error": "Research timed out"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def extract_statistics(text: str) -> List[str]:
    """Extract statistics and numbers from text."""
    patterns = [
        r'\d+(?:\.\d+)?%',  # percentages
        r'\$\d+(?:\.\d+)?(?:\s*(?:million|billion|trillion|M|B|T))?',  # money
        r'\d+(?:\.\d+)?(?:\s*(?:million|billion|trillion|M|B|K))',  # large numbers
        r'(?:increased|decreased|grew|dropped|rose|fell)\s+(?:by\s+)?\d+(?:\.\d+)?%?',  # changes
    ]

    stats = []
    for pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            # Get surrounding context
            idx = text.lower().find(match.lower())
            if idx >= 0:
                start = max(0, idx - 50)
                end = min(len(text), idx + len(match) + 50)
                context = text[start:end].strip()
                # Clean up
                context = re.sub(r'\s+', ' ', context)
                if len(context) > 20:
                    stats.append(context)

    return list(set(stats))[:5]


def extract_facts(text: str) -> List[str]:
    """Extract facts from text - sentences that state information."""
    sentences = re.split(r'[.!?]\s+', text)
    facts = []

    for sentence in sentences:
        sentence = sentence.strip()
        # Look for factual statements
        if len(sentence) > 30 and len(sentence) < 200:
            # Skip questions and commands
            if not sentence.endswith('?') and not sentence.startswith(('Use', 'Search', 'Find', 'Output')):
                facts.append(sentence + '.')

    return list(set(facts))[:5]


def extract_quotes(text: str) -> List[str]:
    """Extract quotes from text."""
    quote_patterns = [
        r'"([^"]{20,200})"',
        r"'([^']{20,200})'",
        r"\"([^\"]{20,200})\"",
    ]

    quotes = []
    for pattern in quote_patterns:
        matches = re.findall(pattern, text)
        quotes.extend(matches)

    return list(set(quotes))[:3]


def extract_key_points(text: str) -> List[str]:
    """Extract key points from bullet points or numbered lists."""
    # Look for bullet points or numbered items
    patterns = [
        r'[-•]\s*(.{20,150})',
        r'\d+[.)]\s*(.{20,150})',
    ]

    points = []
    for pattern in patterns:
        matches = re.findall(pattern, text)
        points.extend(matches)

    return list(set(points))[:5]


async def research_topic(
    topic: str,
    style: str = "educational",
    depth: str = "basic"
) -> ResearchResult:
    """
    Research a topic for video content creation using Claude Code.

    Args:
        topic: The topic to research
        style: Video style (educational, controversial, tutorial, etc.)
        depth: Research depth (basic, deep) - affects timeout

    Returns:
        ResearchResult with categorized findings
    """
    # Use Claude Code for research
    result = await research_with_claude_code(topic, style)

    if result.get("success") and result.get("data"):
        data = result["data"]
        return ResearchResult(
            topic=topic,
            statistics=data.get("statistics", [])[:5],
            facts=data.get("facts", [])[:5],
            quotes=data.get("quotes", [])[:3],
            trends=data.get("trends", [])[:3],
            key_points=data.get("key_points", [])[:5],
            suggested_hook=data.get("suggested_hook"),
        )

    # Return empty result if research failed
    return ResearchResult(
        topic=topic,
        statistics=[],
        facts=[],
        quotes=[],
        trends=[],
        key_points=[f"Research on {topic} - please try again or search manually."],
        suggested_hook=None,
    )


async def generate_script_with_research(
    topic: str,
    style: str,
    duration: int,
    research: ResearchResult,
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generate a video script using research findings.
    Uses Claude Code for generation - no external API needed.

    Returns script with timing markers.
    """
    context = research.to_context_string()

    prompt = f"""Generate a {duration}-second {style} video script about "{topic}".

{context}

Requirements:
1. Start with a HOOK (0-3s) using a surprising statistic or question from the research
2. Include SETUP (3-{duration//4}s) with context and problem statement
3. MAIN CONTENT ({duration//4}-{duration*3//4}s) with key points backed by facts
4. CONCLUSION ({duration*3//4}-{duration-5}s) with takeaway
5. CTA ({duration-5}-{duration}s) call to action

Format each section with timing markers like:
[0-3s] HOOK: "Your hook text here..."
[3-15s] SETUP: "Setup text..."

Include emphasis markers for important words: *emphasized word*
Mark voice pauses with "..."

Output ONLY the script, no explanations."""

    try:
        # Use Claude Code for script generation
        result = await asyncio.to_thread(
            subprocess.run,
            [
                "claude",
                "-p", prompt,
                "--output-format", "text",
                "--max-turns", "1",
            ],
            capture_output=True,
            text=True,
            timeout=60,
            cwd=str(Path.home()),
        )

        script_text = result.stdout.strip()

        # Parse timing markers
        sections = parse_script_sections(script_text)

        return {
            "success": True,
            "script": script_text,
            "sections": sections,
            "research_used": {
                "statistics": research.statistics[:3],
                "facts": research.facts[:3],
            }
        }
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "error": "Script generation timed out",
            "script": None,
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "script": None,
        }


def parse_script_sections(script: str) -> List[Dict[str, Any]]:
    """Parse timing markers from script."""
    pattern = r'\[(\d+)-(\d+)s\]\s*(?:(\w+):)?\s*(.+?)(?=\[\d+-\d+s\]|$)'
    matches = re.findall(pattern, script, re.DOTALL)

    sections = []
    for start, end, section_type, content in matches:
        # Extract emphasis words
        emphasis = re.findall(r'\*([^*]+)\*', content)
        # Clean content
        clean_content = re.sub(r'\*([^*]+)\*', r'\1', content).strip()
        clean_content = clean_content.strip('"\'')

        sections.append({
            "start_seconds": int(start),
            "end_seconds": int(end),
            "type": section_type.lower() if section_type else "content",
            "text": clean_content,
            "emphasis": emphasis,
        })

    return sections

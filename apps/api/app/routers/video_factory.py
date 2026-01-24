"""
Video Factory API Router

AI-powered short-form video content generation.
Uses Claude Code CLI for research and script generation (no external APIs).
Remotion integration for professional video rendering.

Enhanced Pipeline:
1. Idea Input → 2. Research (Claude Code web search) → 3. Script Generation →
4. Enhancement (Spring physics, transitions) → 5. Voiceover (OpenAI TTS) →
6. Captions (Whisper, TikTok-style) → 7. Render (Remotion)

Features:
- Web research with Claude Code built-in search
- TikTok-style word-by-word captions
- Spring physics animations
- Professional transitions (fade, slide, wipe, flip)
- Multiple format support (9:16, 1:1, 16:9)
"""

import asyncio
import json
import os
import subprocess
from pathlib import Path
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any

from app.core.video_factory_manager import video_factory
from app.core.video_research import research_topic, generate_script_with_research, ResearchResult
from app.core.video_audio import (
    generate_voiceover_and_captions,
    AVAILABLE_VOICES,
    caption_pages_to_remotion_format,
)

# Remotion paths
REMOTION_DIR = Path(__file__).parent.parent.parent.parent.parent / "apps" / "remotion"
RENDERS_DIR = Path("/data/video-factory/renders")

router = APIRouter(prefix="/video-factory", tags=["content-factory"])


# ==================== Request/Response Models ====================

class CreateProjectRequest(BaseModel):
    email: EmailStr
    name: str
    niche: str


class GenerateIdeasRequest(BaseModel):
    topic: str
    count: int = 5


class GenerateScriptRequest(BaseModel):
    topic: str
    style: str = "educational"  # educational, storytime, controversial, tutorial, reaction, listicle


class UpdateIdeaRequest(BaseModel):
    title: Optional[str] = None
    hook: Optional[str] = None
    script: Optional[str] = None
    cta: Optional[str] = None
    hashtags: Optional[List[str]] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class MarkPostedRequest(BaseModel):
    platform: str  # youtube_shorts, tiktok, instagram_reels
    url: Optional[str] = None


class UpdateMetricsRequest(BaseModel):
    platform: str
    views: int = 0
    likes: int = 0
    comments: int = 0


class ResearchTopicRequest(BaseModel):
    """Request for researching a topic for video content."""
    style: str = "educational"  # educational, controversial, tutorial, listicle
    depth: str = "basic"  # basic, deep


class GenerateScriptWithResearchRequest(BaseModel):
    """Request for generating a script with research context."""
    duration: int = 60  # Target duration in seconds
    style: str = "educational"
    use_research: bool = True  # Include web research


class VoiceoverRequest(BaseModel):
    """Request for generating voiceover with captions."""
    voice: str = "alloy"  # OpenAI TTS voice
    speed: float = 1.0  # Speech speed (0.25-4.0)


class RenderVideoRequest(BaseModel):
    composition: str = "ShortVideo"  # ShortVideo, ShortVideo30, ShortVideo15, SquareVideo, HorizontalVideo
    background_color: str = "#000000"
    text_color: str = "#ffffff"
    accent_color: str = "#3b82f6"
    background_image: Optional[str] = None
    background_video: Optional[str] = None
    music_url: Optional[str] = None
    voiceover_url: Optional[str] = None
    caption_pages: Optional[List[Dict[str, Any]]] = None  # TikTok-style captions
    caption_style: Optional[Dict[str, Any]] = None  # Caption styling
    enhanced: bool = False  # Use enhanced video with transitions
    enhanced_props: Optional[Dict[str, Any]] = None  # Pre-enhanced props (from /enhance endpoint)


class ProjectResponse(BaseModel):
    id: str
    email: str
    name: str
    niche: str
    ideas_count: int
    created_at: str
    updated_at: str


class IdeaResponse(BaseModel):
    id: str
    title: str
    topic: str
    hook: str
    script: str
    cta: str
    hashtags: List[str]
    status: str
    platforms: List[Dict[str, Any]]
    notes: str
    created_at: str
    updated_at: str


# ==================== Auth ====================

@router.get("/auth/check")
async def check_auth(email: str):
    """Check if email is authorized."""
    allowed = video_factory.check_email_allowed(email)
    return {
        "authorized": allowed,
        "email": email
    }


# ==================== Projects ====================

@router.post("/projects", response_model=ProjectResponse)
async def create_project(request: CreateProjectRequest):
    """Create a new content project."""
    try:
        project = video_factory.create_project(
            email=request.email,
            name=request.name,
            niche=request.niche
        )

        return ProjectResponse(
            id=project.id,
            email=project.email,
            name=project.name,
            niche=project.niche,
            ideas_count=len(project.ideas),
            created_at=project.created_at,
            updated_at=project.updated_at
        )
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/projects")
async def list_projects(email: Optional[str] = None):
    """List all projects, optionally filtered by email."""
    projects = video_factory.list_projects(email)
    return {
        "projects": [
            {
                "id": p.id,
                "email": p.email,
                "name": p.name,
                "niche": p.niche,
                "ideas_count": len(p.ideas),
                "created_at": p.created_at,
                "updated_at": p.updated_at
            }
            for p in projects
        ]
    }


@router.get("/projects/{project_id}")
async def get_project(project_id: str):
    """Get project details including all ideas."""
    project = video_factory.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return {
        "id": project.id,
        "email": project.email,
        "name": project.name,
        "niche": project.niche,
        "ideas": [
            {
                "id": i.id,
                "title": i.title,
                "topic": i.topic,
                "hook": i.hook,
                "script": i.script,
                "cta": i.cta,
                "hashtags": i.hashtags,
                "status": i.status.value if hasattr(i.status, 'value') else i.status,
                "platforms": [
                    {
                        "platform": p.platform,
                        "posted": p.posted,
                        "posted_at": p.posted_at,
                        "url": p.url,
                        "views": p.views,
                        "likes": p.likes,
                        "comments": p.comments
                    }
                    for p in i.platforms
                ],
                "notes": i.notes,
                "created_at": i.created_at,
                "updated_at": i.updated_at
            }
            for i in project.ideas
        ],
        "created_at": project.created_at,
        "updated_at": project.updated_at
    }


@router.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    """Delete a project."""
    success = video_factory.delete_project(project_id)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"success": True}


@router.get("/projects/{project_id}/stats")
async def get_project_stats(project_id: str):
    """Get project statistics."""
    stats = video_factory.get_stats(project_id)
    if not stats:
        raise HTTPException(status_code=404, detail="Project not found")
    return stats


# ==================== Content Generation ====================

@router.post("/projects/{project_id}/generate-ideas")
async def generate_ideas(project_id: str, request: GenerateIdeasRequest):
    """Generate multiple content ideas for a topic."""
    project = video_factory.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        ideas = await video_factory.generate_content_ideas(
            project_id,
            topic=request.topic,
            count=request.count
        )

        return {
            "success": True,
            "count": len(ideas),
            "ideas": [
                {
                    "id": i.id,
                    "title": i.title,
                    "hook": i.hook,
                    "script": i.script,
                    "hashtags": i.hashtags
                }
                for i in ideas
            ]
        }
    except TimeoutError:
        raise HTTPException(status_code=504, detail="Content generation timed out")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/projects/{project_id}/generate-script")
async def generate_script(project_id: str, request: GenerateScriptRequest):
    """Generate a single detailed script."""
    project = video_factory.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        idea = await video_factory.generate_single_script(
            project_id,
            topic=request.topic,
            style=request.style
        )

        return {
            "success": True,
            "idea": {
                "id": idea.id,
                "title": idea.title,
                "hook": idea.hook,
                "script": idea.script,
                "cta": idea.cta,
                "hashtags": idea.hashtags,
                "notes": idea.notes
            }
        }
    except TimeoutError:
        raise HTTPException(status_code=504, detail="Script generation timed out")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/projects/{project_id}/ideas/{idea_id}/improve-hook")
async def improve_hook(project_id: str, idea_id: str):
    """Generate alternative hooks for an idea."""
    try:
        hooks_json = await video_factory.improve_hook(project_id, idea_id)
        import json
        hooks = json.loads(hooks_json)
        return {"success": True, "hooks": hooks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Research & Enhanced Pipeline ====================

@router.post("/projects/{project_id}/ideas/{idea_id}/research")
async def research_idea_topic(
    project_id: str,
    idea_id: str,
    request: ResearchTopicRequest
):
    """Research a topic to gather statistics, facts, and quotes for video content.

    Uses Claude Code with built-in web search (no external API needed).

    Returns research findings that can be used to enhance script generation.
    """
    project = video_factory.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    idea = next((i for i in project.ideas if i.id == idea_id), None)
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")

    try:
        research = await research_topic(
            topic=idea.topic or idea.title,
            style=request.style,
            depth=request.depth,
        )

        return {
            "success": True,
            "research": research.to_dict(),
            "context_string": research.to_context_string(),
            "suggested_hook": research.suggested_hook,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/projects/{project_id}/ideas/{idea_id}/generate-enhanced-script")
async def generate_enhanced_script(
    project_id: str,
    idea_id: str,
    request: GenerateScriptWithResearchRequest
):
    """Generate an enhanced script using research context.

    Uses Claude Code CLI for both research and script generation (no API keys needed).

    This endpoint:
    1. Optionally researches the topic via Claude Code web search
    2. Generates a detailed, timed script with research-backed content
    3. Updates the idea with the new script

    Returns the enhanced script with timing markers and research citations.
    """
    project = video_factory.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    idea = next((i for i in project.ideas if i.id == idea_id), None)
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")

    try:
        # Step 1: Research if requested
        research = None
        if request.use_research:
            research = await research_topic(
                topic=idea.topic or idea.title,
                style=request.style,
                depth="basic",
            )

        if not research:
            # Create empty research result
            research = ResearchResult(
                topic=idea.topic or idea.title,
                statistics=[],
                facts=[],
                quotes=[],
                trends=[],
                key_points=[],
            )

        # Step 2: Generate script with research
        result = await generate_script_with_research(
            topic=idea.topic or idea.title,
            style=request.style,
            duration=request.duration,
            research=research,
        )

        if not result.get("success"):
            raise HTTPException(
                status_code=500,
                detail=result.get("error", "Script generation failed")
            )

        # Step 3: Update idea with new script
        new_script = result.get("script", "")
        video_factory.update_idea(project_id, idea_id, {"script": new_script})

        return {
            "success": True,
            "script": new_script,
            "sections": result.get("sections", []),
            "research_used": result.get("research_used", {}),
            "duration_seconds": request.duration,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/projects/{project_id}/ideas/{idea_id}/voiceover")
async def generate_voiceover(
    project_id: str,
    idea_id: str,
    request: VoiceoverRequest
):
    """Generate voiceover audio with word-level captions.

    Pi-compatible: Uses OpenAI TTS and Whisper API (cloud-based).

    This endpoint:
    1. Generates voiceover audio using OpenAI TTS
    2. Transcribes the audio with word-level timestamps using Whisper
    3. Creates TikTok-style caption pages

    Returns audio URL and caption pages for Remotion rendering.
    """
    project = video_factory.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    idea = next((i for i in project.ideas if i.id == idea_id), None)
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")

    if not idea.script:
        raise HTTPException(status_code=400, detail="Idea has no script to convert")

    try:
        result = await generate_voiceover_and_captions(
            script_text=idea.script,
            voice=request.voice,
            project_id=project_id,
            idea_id=idea_id,
        )

        if not result.get("success"):
            raise HTTPException(
                status_code=500,
                detail=result.get("error", "Voiceover generation failed")
            )

        return {
            "success": True,
            "voiceover_url": result.get("voiceover_url"),
            "voiceover_duration_ms": result.get("voiceover_duration_ms"),
            "caption_pages": result.get("caption_pages", []),
            "word_count": result.get("word_count", 0),
            "warning": result.get("warning"),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/voices")
async def list_voices():
    """List available voiceover voices.

    Returns OpenAI TTS voice options with descriptions.
    """
    return {
        "voices": AVAILABLE_VOICES,
        "default": "alloy",
    }


# ==================== Content Management ====================

@router.put("/projects/{project_id}/ideas/{idea_id}")
async def update_idea(project_id: str, idea_id: str, request: UpdateIdeaRequest):
    """Update a content idea."""
    updates = {k: v for k, v in request.model_dump().items() if v is not None}

    idea = video_factory.update_idea(project_id, idea_id, updates)
    if not idea:
        raise HTTPException(status_code=404, detail="Project or idea not found")

    return {"success": True}


@router.post("/projects/{project_id}/ideas/{idea_id}/mark-posted")
async def mark_posted(project_id: str, idea_id: str, request: MarkPostedRequest):
    """Mark content as posted to a platform."""
    success = video_factory.mark_posted(
        project_id,
        idea_id,
        platform=request.platform,
        url=request.url
    )

    if not success:
        raise HTTPException(status_code=404, detail="Project or idea not found")

    return {"success": True}


@router.post("/projects/{project_id}/ideas/{idea_id}/metrics")
async def update_metrics(project_id: str, idea_id: str, request: UpdateMetricsRequest):
    """Update metrics for a posted video."""
    success = video_factory.update_metrics(
        project_id,
        idea_id,
        platform=request.platform,
        views=request.views,
        likes=request.likes,
        comments=request.comments
    )

    if not success:
        raise HTTPException(status_code=404, detail="Project or idea not found")

    return {"success": True}


@router.delete("/projects/{project_id}/ideas/{idea_id}")
async def delete_idea(project_id: str, idea_id: str):
    """Delete a content idea."""
    success = video_factory.delete_idea(project_id, idea_id)
    if not success:
        raise HTTPException(status_code=404, detail="Project or idea not found")
    return {"success": True}


# ==================== Status ====================

@router.get("/status")
async def get_status():
    """Get Content Factory status."""
    return {
        "status": "ok",
        "total_projects": len(video_factory.projects),
        "features": [
            "Free AI script generation (Claude Code)",
            "Web research via Claude Code (no API keys)",
            "Research-backed script generation",
            "OpenAI TTS voiceover generation",
            "Word-level caption extraction (Whisper)",
            "TikTok-style animated captions",
            "Spring physics animations",
            "Professional transitions (fade, slide, wipe)",
            "Enhanced video with TransitionSeries",
            "YouTube Shorts support",
            "TikTok support",
            "Instagram Reels support",
            "Cross-posting tracking",
            "Metrics tracking",
            "Remotion video rendering",
        ],
        "voices": [v["id"] for v in AVAILABLE_VOICES],
    }


# ==================== Video Enhancement ====================

async def enhance_script_with_claude(idea, options: RenderVideoRequest, total_duration: int = 60) -> Dict[str, Any]:
    """Use Claude to enhance a script into professional Remotion props.

    This runs Claude Code with the video-enhancer skill to analyze the script
    and generate enhanced props with transitions, animations, and emphasis.
    """
    import uuid

    fps = 30
    total_frames = total_duration * fps

    # Build the enhancement prompt
    prompt = f"""You are enhancing a video script for Remotion rendering.

**Script Title:** {idea.title}
**Hook:** {idea.hook}
**Full Script:**
{idea.script}

**CTA:** {idea.cta}
**Hashtags:** {', '.join(idea.hashtags) if idea.hashtags else 'None'}

**Target Duration:** {total_duration} seconds ({total_frames} frames at 30fps)
**Colors:**
- Background: {options.background_color}
- Text: {options.text_color}
- Accent: {options.accent_color}

**Your Task:**
Analyze this script and create an enhanced video specification with:
1. Identify key phrases to emphasize (highlight with accent color)
2. Choose appropriate scene types (hook, content, bullet-list, quote, cta)
3. Select animations that match the content energy
4. Add smooth transitions between scenes
5. Ensure total duration matches target

**IMPORTANT:** Output ONLY valid JSON matching the EnhancedVideoProps schema.
Do not include any explanation or markdown - just the JSON object.

Remember:
- Hook should be bouncy/attention-grabbing (spring damping: 8)
- Content should be smooth (spring damping: 200)
- CTA should be snappy (spring damping: 20, stiffness: 200)
- Use slide transitions for energy, fade for calm moments
- Stagger bullet points with 15-25 frame delays
"""

    # For now, generate enhanced props programmatically
    # TODO: Integrate with Claude Code when available
    return generate_enhanced_props(idea, options, total_duration)


def generate_enhanced_props(idea, options: RenderVideoRequest, total_duration: int = 60) -> Dict[str, Any]:
    """Generate enhanced Remotion props from a script.

    This is a programmatic fallback that creates professional-looking
    enhanced props without needing Claude API calls.
    """
    import re
    import uuid

    fps = 30
    scenes = []

    # Parse script timing markers
    script_text = idea.script
    pattern = r'\[(\d+)-(\d+)s\]\s*([^\[]+)'
    matches = re.findall(pattern, script_text) if script_text else []

    # Scale factor for duration
    scale = total_duration / 60.0

    def scaled(seconds: float) -> int:
        return max(int(seconds * scale * fps), fps)

    # Find emphasis words in text
    def find_emphasis(text: str) -> List[str]:
        emphasis = []
        # Numbers and stats
        numbers = re.findall(r'\d+(?:\.\d+)?(?:\s*(?:million|billion|k|%|x|\+))?', text, re.I)
        emphasis.extend(numbers[:2])
        # Key action words
        action_words = ['save', 'boost', 'transform', 'change', 'amazing', 'free', 'easy', 'fast', 'new', 'first']
        for word in action_words:
            if word.lower() in text.lower():
                # Find the actual word with proper case
                match = re.search(rf'\b{word}\w*\b', text, re.I)
                if match:
                    emphasis.append(match.group())
        return emphasis[:3]  # Max 3 emphasis words

    if matches:
        for i, (start, end, content) in enumerate(matches):
            start_s, end_s = int(start), int(end)
            content = content.strip()
            duration = scaled(end_s - start_s)

            # Determine scene type and styling
            if start_s == 0 and end_s <= 5:
                scene_type = "hook"
                animation = "scale"
                timing = {"type": "spring", "damping": 8}
                transition_out = {"type": "slide", "direction": "from-bottom", "duration": 20}
            elif start_s >= 50 or "follow" in content.lower():
                scene_type = "cta"
                animation = "bounce"
                timing = {"type": "spring", "damping": 20, "stiffness": 200}
                transition_out = None
            elif "first" in content.lower() or "second" in content.lower() or "third" in content.lower():
                # Bullet list content
                scene_type = "bullet-list"
                animation = "slideUp"
                timing = {"type": "spring", "damping": 150}
                transition_out = {"type": "fade", "duration": 15}
                # Extract bullet points
                bullets = re.split(r'(?:First|Second|Third|Fourth|Fifth|\d+\.|\-)\s*[-:]?\s*', content, flags=re.I)
                bullets = [b.strip().rstrip('.') for b in bullets if b.strip()]
            else:
                scene_type = "content"
                animation = "slideUp" if i < 3 else "fadeIn"
                timing = {"type": "spring", "damping": 200}
                transition_out = {"type": "fade", "duration": 15} if i < len(matches) - 1 else {"type": "wipe", "duration": 20}

            scene = {
                "id": f"scene-{uuid.uuid4().hex[:6]}",
                "type": scene_type,
                "duration": duration,
                "text": content[:300],
                "emphasis": find_emphasis(content),
                "animation": animation,
                "timing": timing,
            }

            # Add bullets for bullet-list type
            if scene_type == "bullet-list" and 'bullets' in dir():
                scene["bullets"] = bullets[:4]  # Max 4 bullets
                scene["staggerDelay"] = 20
                del scene["text"]  # Remove text, use bullets instead

            # Add title for content scenes
            if scene_type == "content" and start_s > 5:
                if start_s < 20:
                    scene["title"] = "The Setup"
                elif start_s < 45:
                    scene["title"] = "Key Insights"
                else:
                    scene["title"] = "The Takeaway"

            # Add transitions
            if i > 0:
                prev_out = scenes[-1].get("transitionOut")
                if prev_out:
                    scene["transitionIn"] = {"type": "fade", "duration": prev_out["duration"]}
            if transition_out:
                scene["transitionOut"] = transition_out

            scenes.append(scene)
    else:
        # No timing markers - create default structure
        scenes = [
            {
                "id": f"hook-{uuid.uuid4().hex[:6]}",
                "type": "hook",
                "duration": scaled(5),
                "text": idea.hook,
                "emphasis": find_emphasis(idea.hook),
                "animation": "scale",
                "timing": {"type": "spring", "damping": 8},
                "transitionOut": {"type": "slide", "direction": "from-bottom", "duration": 20}
            },
            {
                "id": f"content-{uuid.uuid4().hex[:6]}",
                "type": "content",
                "duration": scaled(total_duration - 12),
                "title": idea.title,
                "text": idea.script[:400] if idea.script else "Main content here...",
                "emphasis": find_emphasis(idea.script or ""),
                "animation": "slideUp",
                "timing": {"type": "spring", "damping": 200},
                "transitionIn": {"type": "fade", "duration": 15},
                "transitionOut": {"type": "wipe", "duration": 20}
            },
            {
                "id": f"cta-{uuid.uuid4().hex[:6]}",
                "type": "cta",
                "duration": scaled(7),
                "text": idea.cta,
                "animation": "bounce",
                "timing": {"type": "spring", "damping": 20, "stiffness": 200},
                "transitionIn": {"type": "slide", "direction": "from-bottom", "duration": 15}
            }
        ]

    result = {
        "scenes": scenes,
        "backgroundColor": options.background_color,
        "textColor": options.text_color,
        "accentColor": options.accent_color,
        "backgroundImage": options.background_image,
        "backgroundVideo": options.background_video,
        "musicUrl": options.music_url,
        "musicVolume": 0.2,
        "voiceoverUrl": options.voiceover_url,
    }

    # Include captions if provided
    if options.caption_pages:
        result["captionPages"] = options.caption_pages
    if options.caption_style:
        result["captionStyle"] = options.caption_style

    return result


@router.post("/projects/{project_id}/ideas/{idea_id}/enhance")
async def enhance_idea_for_video(
    project_id: str,
    idea_id: str,
    request: RenderVideoRequest
):
    """Enhance a script into professional Remotion props with transitions and animations.

    This analyzes the script content and generates an EnhancedVideoProps object with:
    - Scene types (hook, content, bullet-list, quote, cta)
    - Spring animations with appropriate timing
    - Smooth transitions between scenes
    - Emphasis on key phrases

    Returns enhanced props that can be passed to the render endpoint.
    """
    project = video_factory.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    idea = next((i for i in project.ideas if i.id == idea_id), None)
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")

    # Determine duration from composition
    duration_map = {
        "EnhancedVideo": 60,
        "EnhancedVideo30": 30,
        "EnhancedVideo15": 15,
        "EnhancedSquare": 60,
        "EnhancedHorizontal": 60,
        "ShortVideo": 60,
        "ShortVideo30": 30,
        "ShortVideo15": 15,
    }
    total_duration = duration_map.get(request.composition, 60)

    # Generate enhanced props
    enhanced_props = generate_enhanced_props(idea, request, total_duration)

    return {
        "success": True,
        "enhanced_props": enhanced_props,
        "composition": request.composition.replace("Short", "Enhanced") if "Short" in request.composition else request.composition,
        "duration_seconds": total_duration,
    }


# ==================== Video Rendering (Remotion) ====================

def script_to_remotion_props(idea, options: RenderVideoRequest, total_duration: int = 60) -> Dict[str, Any]:
    """Convert a content idea script to Remotion props.

    Args:
        idea: The content idea with script
        options: Render options (colors, media, etc.)
        total_duration: Target video duration in seconds (60, 30, or 15)
    """
    import re

    script_text = idea.script
    sections = []
    fps = 30

    # Scale factor for shorter videos
    scale = total_duration / 60.0

    def scaled_frames(seconds: float) -> int:
        """Scale timing to target duration."""
        return int(seconds * scale * fps)

    # Parse script timing markers if present
    # Expected format: [0-3s] Hook text\n[3-15s] Setup...
    if "[" in script_text and "]" in script_text:
        pattern = r'\[(\d+)-(\d+)s\]\s*([^\[]+)'
        matches = re.findall(pattern, script_text)

        if matches:
            for start, end, content in matches:
                start_s, end_s = int(start), int(end)
                content = content.strip()

                # Scale timings to target duration
                scaled_start = scaled_frames(start_s)
                scaled_duration = scaled_frames(end_s - start_s)

                # Ensure minimum duration
                scaled_duration = max(scaled_duration, fps)  # At least 1 second

                # Determine section type based on timing
                if start_s == 0 and end_s <= 5:
                    # Only the very first section (0-3s or 0-5s) is the hook
                    section_type = "hook"
                    title = None
                elif start_s >= 50 or "follow" in content.lower():
                    # CTA is at the end
                    section_type = "cta"
                    title = None
                elif start_s < 20:
                    section_type = "content"
                    title = "Setup"
                elif start_s < 50:
                    section_type = "content"
                    title = "Key Points"
                else:
                    section_type = "content"
                    title = "Takeaway"

                sections.append({
                    "type": section_type,
                    "startFrame": scaled_start,
                    "durationFrames": scaled_duration,
                    "text": content[:300],  # Truncate long text
                    "title": title,
                })
        else:
            # Has brackets but no valid timing format - treat as plain text
            sections = []

    # If no sections parsed, create default layout
    if not sections:
        # Hook
        sections.append({
            "type": "hook",
            "startFrame": 0,
            "durationFrames": scaled_frames(3),
            "text": idea.hook,
        })
        # Main content
        sections.append({
            "type": "content",
            "startFrame": scaled_frames(3),
            "durationFrames": scaled_frames(total_duration - 8),  # Leave 5s for CTA
            "text": idea.script[:400] if idea.script else "Content here...",
            "title": idea.title,
        })
        # CTA
        sections.append({
            "type": "cta",
            "startFrame": scaled_frames(total_duration - 5),
            "durationFrames": scaled_frames(5),
            "text": idea.cta,
            "subtext": " ".join(idea.hashtags[:3]) if idea.hashtags else None,
        })

    return {
        "title": idea.title,
        "hook": idea.hook,
        "sections": sections,
        "cta": idea.cta,
        "ctaSubtext": " ".join(idea.hashtags[:3]) if idea.hashtags else None,
        "backgroundColor": options.background_color,
        "textColor": options.text_color,
        "accentColor": options.accent_color,
        "backgroundImage": options.background_image,
        "backgroundVideo": options.background_video,
        "musicUrl": options.music_url,
        "voiceoverUrl": options.voiceover_url,
    }


async def run_remotion_render(
    props: Dict[str, Any],
    output_path: Path,
    composition: str = "ShortVideo"
) -> Dict[str, Any]:
    """Run Remotion render in subprocess."""
    # Ensure output directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Create props JSON file
    props_file = output_path.with_suffix(".json")
    with open(props_file, "w") as f:
        json.dump(props, f)

    # Run render using npx remotion directly
    cmd = [
        "npx", "remotion", "render",
        composition,
        "--output", str(output_path),
        "--props", str(props_file),
    ]

    try:
        result = await asyncio.to_thread(
            subprocess.run,
            cmd,
            capture_output=True,
            text=True,
            timeout=600,  # 10 minute timeout
            cwd=str(REMOTION_DIR),
        )

        if result.returncode != 0:
            return {
                "success": False,
                "error": result.stderr or result.stdout or "Render failed",
            }

        # Check if output file exists
        if output_path.exists():
            return {
                "success": True,
                "output": str(output_path),
            }
        else:
            return {
                "success": False,
                "error": "Output file not created",
            }

    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "error": "Render timed out after 10 minutes",
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
        }
    finally:
        # Cleanup props file
        if props_file.exists():
            props_file.unlink()


# Track render jobs
render_jobs: Dict[str, Dict[str, Any]] = {}


@router.post("/projects/{project_id}/ideas/{idea_id}/render")
async def render_video(
    project_id: str,
    idea_id: str,
    request: RenderVideoRequest,
    background_tasks: BackgroundTasks
):
    """Start rendering a video from a content idea."""
    project = video_factory.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    idea = next((i for i in project.ideas if i.id == idea_id), None)
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")

    # Check if Remotion is available
    if not REMOTION_DIR.exists():
        raise HTTPException(
            status_code=503,
            detail="Remotion not configured. Run setup first."
        )

    # Generate job ID and output path
    import uuid
    job_id = f"render_{uuid.uuid4().hex[:8]}"
    # Include 'enhanced' in filename if using enhanced mode
    suffix = "_enhanced" if request.enhanced else ""
    output_filename = f"{idea_id}_{request.composition}{suffix}.mp4"
    output_path = RENDERS_DIR / project_id / output_filename

    # Determine video duration based on composition
    duration_map = {
        "ShortVideo": 60,
        "ShortVideo30": 30,
        "ShortVideo15": 15,
        "SquareVideo": 60,
        "HorizontalVideo": 60,
        "EnhancedVideo": 60,
        "EnhancedVideo30": 30,
        "EnhancedVideo15": 15,
        "EnhancedSquare": 60,
        "EnhancedHorizontal": 60,
    }
    total_duration = duration_map.get(request.composition, 60)

    # Choose composition and props based on enhanced flag
    composition = request.composition
    if request.enhanced:
        # Use enhanced composition with transitions
        if request.enhanced_props:
            # Use pre-enhanced props from /enhance endpoint
            props = request.enhanced_props
        else:
            # Generate enhanced props on the fly
            props = generate_enhanced_props(idea, request, total_duration)

        # Map to enhanced composition if using basic composition name
        enhanced_map = {
            "ShortVideo": "EnhancedVideo",
            "ShortVideo30": "EnhancedVideo30",
            "ShortVideo15": "EnhancedVideo15",
            "SquareVideo": "EnhancedSquare",
            "HorizontalVideo": "EnhancedHorizontal",
        }
        composition = enhanced_map.get(composition, composition)
    else:
        # Use basic composition
        props = script_to_remotion_props(idea, request, total_duration)

    # Track job
    render_jobs[job_id] = {
        "status": "pending",
        "project_id": project_id,
        "idea_id": idea_id,
        "composition": composition,
        "enhanced": request.enhanced,
        "output_path": str(output_path),
        "started_at": None,
        "completed_at": None,
        "error": None,
    }

    # Start render in background
    async def do_render():
        from datetime import datetime
        render_jobs[job_id]["status"] = "rendering"
        render_jobs[job_id]["started_at"] = datetime.now().isoformat()

        result = await run_remotion_render(props, output_path, composition)

        render_jobs[job_id]["completed_at"] = datetime.now().isoformat()
        if result.get("success"):
            render_jobs[job_id]["status"] = "completed"
            render_jobs[job_id]["output_path"] = result.get("output", str(output_path))
        else:
            render_jobs[job_id]["status"] = "failed"
            render_jobs[job_id]["error"] = result.get("error")

    background_tasks.add_task(do_render)

    return {
        "job_id": job_id,
        "status": "pending",
        "message": "Render job started",
    }


@router.get("/render-jobs/{job_id}")
async def get_render_job(job_id: str):
    """Get render job status."""
    if job_id not in render_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return render_jobs[job_id]


@router.get("/render-jobs/{job_id}/download")
async def download_render(job_id: str):
    """Download rendered video."""
    if job_id not in render_jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = render_jobs[job_id]
    if job["status"] != "completed":
        raise HTTPException(
            status_code=400,
            detail=f"Job not ready. Status: {job['status']}"
        )

    output_path = Path(job["output_path"])
    if not output_path.exists():
        raise HTTPException(status_code=404, detail="Video file not found")

    return FileResponse(
        path=str(output_path),
        filename=output_path.name,
        media_type="video/mp4"
    )


@router.get("/renders/{project_id}")
async def list_renders(project_id: str):
    """List all rendered videos for a project."""
    project_renders = RENDERS_DIR / project_id
    if not project_renders.exists():
        return {"renders": []}

    renders = []
    for f in project_renders.glob("*.mp4"):
        # Extract idea_id and composition from filename
        # Format: {idea_id}_{composition}.mp4
        parts = f.stem.rsplit("_", 1)
        idea_id = parts[0] if len(parts) > 1 else f.stem
        composition = parts[1] if len(parts) > 1 else "unknown"

        renders.append({
            "filename": f.name,
            "idea_id": idea_id,
            "composition": composition,
            "size_mb": round(f.stat().st_size / (1024 * 1024), 2),
            "created_at": f.stat().st_mtime,
            "download_url": f"/video-factory/renders/{project_id}/{f.name}/download",
        })

    return {"renders": sorted(renders, key=lambda x: x["created_at"], reverse=True)}


@router.get("/renders/{project_id}/{filename}/download")
async def download_render_file(project_id: str, filename: str):
    """Download a rendered video file directly."""
    file_path = RENDERS_DIR / project_id / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Video file not found")

    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type="video/mp4"
    )


@router.get("/projects/{project_id}/ideas/{idea_id}/renders")
async def list_idea_renders(project_id: str, idea_id: str):
    """List all rendered videos for a specific idea."""
    project_renders = RENDERS_DIR / project_id
    if not project_renders.exists():
        return {"renders": []}

    renders = []
    for f in project_renders.glob(f"{idea_id}_*.mp4"):
        composition = f.stem.replace(f"{idea_id}_", "")
        renders.append({
            "filename": f.name,
            "composition": composition,
            "size_mb": round(f.stat().st_size / (1024 * 1024), 2),
            "created_at": f.stat().st_mtime,
            "download_url": f"/video-factory/renders/{project_id}/{f.name}/download",
        })

    return {"renders": sorted(renders, key=lambda x: x["created_at"], reverse=True)}

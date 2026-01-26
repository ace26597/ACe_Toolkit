"""
Video Studio Generator - Two-phase video script generation with Claude Code.

Phase 1: Plan - Claude researches the topic and creates an outline
Phase 2: Generate - Claude generates the full EnhancedVideoProps JSON from the plan

This replaces video_script_generator.py with a more controlled workflow.
"""

import asyncio
import json
import logging
import os
import shutil
import uuid
from datetime import datetime
from pathlib import Path
from typing import AsyncGenerator, Dict, List, Optional, Any

logger = logging.getLogger(__name__)


class VideoStudioGenerator:
    """
    Multi-phase video script generation with context management and session continuity.

    Features:
    - Context management (images, files, notes, workspace refs)
    - Recommendations phase: Claude suggests options for the video
    - Plan phase: Claude researches and outlines the video with image suggestions
    - Generate phase: Claude creates full script from approved plan
    - Session continuity via --continue flag
    - Script editing support
    """

    def __init__(self):
        self.base_dir = Path("/data/video-factory/project-data")
        self.base_dir.mkdir(parents=True, exist_ok=True)

    # ==================== Session Management ====================

    def _get_session_id(self, project_dir: Path) -> Optional[str]:
        """Read session ID from file if exists."""
        session_file = project_dir / ".claude" / "session_id.txt"
        if session_file.exists():
            session_id = session_file.read_text().strip()
            if session_id:
                return session_id
        return None

    def _save_session_id(self, project_dir: Path, session_id: str) -> None:
        """Save session ID for --continue."""
        session_file = project_dir / ".claude" / "session_id.txt"
        session_file.write_text(session_id)
        logger.info(f"Saved session ID: {session_id} to {session_file}")

    def _clear_session(self, project_dir: Path) -> None:
        """Clear session ID to start fresh."""
        session_file = project_dir / ".claude" / "session_id.txt"
        if session_file.exists():
            session_file.unlink()
            logger.info(f"Cleared session ID at {session_file}")

    def get_session(self, project_id: str) -> Optional[Dict]:
        """Get current session info for a project."""
        project_dir = self._get_project_dir(project_id)
        session_id = self._get_session_id(project_dir)
        if session_id:
            return {
                "session_id": session_id,
                "project_id": project_id
            }
        return None

    def reset_session(self, project_id: str) -> bool:
        """Reset session to start fresh."""
        project_dir = self._get_project_dir(project_id)
        self._clear_session(project_dir)
        return True

    async def _spawn_claude(
        self,
        project_dir: Path,
        prompt: str,
        use_continue: bool = False
    ) -> asyncio.subprocess.Process:
        """
        Spawn Claude Code with optional --continue for session continuity.

        Args:
            project_dir: Working directory for Claude
            prompt: The prompt to send
            use_continue: Whether to continue from previous session
        """
        cmd = ["claude"]

        if use_continue:
            session_id = self._get_session_id(project_dir)
            if session_id:
                cmd.extend(["--continue", session_id])
                logger.info(f"Continuing session: {session_id}")

        cmd.extend([
            "-p", prompt,
            "--output-format", "stream-json",
            "--verbose",
            "--permission-mode", "bypassPermissions"
        ])

        logger.info(f"Spawning Claude: {' '.join(cmd[:6])}...")

        return await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=str(project_dir)
        )

    def _extract_session_id_from_output(self, output_line: str) -> Optional[str]:
        """Extract session ID from Claude's stream-json output."""
        try:
            event = json.loads(output_line)
            # Session ID is typically in the 'session' or 'result' event
            if event.get("type") == "system" and event.get("subtype") == "init":
                return event.get("session_id")
            # Also check for session info in result events
            if "session_id" in event:
                return event.get("session_id")
        except json.JSONDecodeError:
            pass
        return None

    def _get_project_dir(self, project_id: str) -> Path:
        """Get or create project data directory."""
        project_dir = self.base_dir / project_id

        # Create subdirectories
        (project_dir / ".claude").mkdir(parents=True, exist_ok=True)
        (project_dir / "context" / "images").mkdir(parents=True, exist_ok=True)
        (project_dir / "context" / "files").mkdir(parents=True, exist_ok=True)
        (project_dir / ".recommendations").mkdir(parents=True, exist_ok=True)
        (project_dir / ".plans").mkdir(parents=True, exist_ok=True)
        (project_dir / "scripts").mkdir(parents=True, exist_ok=True)
        (project_dir / "images" / "uploaded").mkdir(parents=True, exist_ok=True)
        (project_dir / "images" / "generated").mkdir(parents=True, exist_ok=True)
        (project_dir / "images" / "thumbnails").mkdir(parents=True, exist_ok=True)
        (project_dir / "renders").mkdir(parents=True, exist_ok=True)

        return project_dir

    # ==================== Context Management ====================

    def add_context_text(self, project_id: str, notes: str) -> Dict:
        """Add or update text notes as context."""
        project_dir = self._get_project_dir(project_id)
        notes_path = project_dir / "context" / "notes.md"

        with open(notes_path, "w") as f:
            f.write(notes)

        return {"type": "notes", "path": str(notes_path)}

    def add_context_image(self, project_id: str, filename: str, content: bytes) -> Dict:
        """Add an image to context."""
        project_dir = self._get_project_dir(project_id)
        image_path = project_dir / "context" / "images" / filename

        with open(image_path, "wb") as f:
            f.write(content)

        return {
            "type": "image",
            "filename": filename,
            "path": str(image_path),
            "size": len(content)
        }

    def add_context_file(self, project_id: str, filename: str, content: bytes) -> Dict:
        """Add a data file to context."""
        project_dir = self._get_project_dir(project_id)
        file_path = project_dir / "context" / "files" / filename

        with open(file_path, "wb") as f:
            f.write(content)

        return {
            "type": "file",
            "filename": filename,
            "path": str(file_path),
            "size": len(content)
        }

    def add_workspace_reference(self, project_id: str, workspace_project: str, user_id: str) -> Dict:
        """Add a reference to a workspace project."""
        project_dir = self._get_project_dir(project_id)
        refs_path = project_dir / "context" / "references.json"

        references = []
        if refs_path.exists():
            with open(refs_path) as f:
                references = json.load(f)

        workspace_path = f"/data/users/{user_id}/projects/{workspace_project}"

        ref = {
            "type": "workspace",
            "project": workspace_project,
            "path": workspace_path,
            "added_at": datetime.now().isoformat()
        }

        # Avoid duplicates
        if not any(r.get("project") == workspace_project for r in references):
            references.append(ref)
            with open(refs_path, "w") as f:
                json.dump(references, f, indent=2)

        return ref

    def get_context(self, project_id: str) -> Dict:
        """Get all context for a project."""
        project_dir = self._get_project_dir(project_id)
        context = {
            "notes": None,
            "images": [],
            "files": [],
            "references": []
        }

        # Notes
        notes_path = project_dir / "context" / "notes.md"
        if notes_path.exists():
            with open(notes_path) as f:
                context["notes"] = f.read()

        # Images
        images_dir = project_dir / "context" / "images"
        if images_dir.exists():
            for img in images_dir.iterdir():
                if img.is_file():
                    context["images"].append({
                        "filename": img.name,
                        "path": str(img),
                        "size": img.stat().st_size
                    })

        # Files
        files_dir = project_dir / "context" / "files"
        if files_dir.exists():
            for f in files_dir.iterdir():
                if f.is_file():
                    context["files"].append({
                        "filename": f.name,
                        "path": str(f),
                        "size": f.stat().st_size
                    })

        # References
        refs_path = project_dir / "context" / "references.json"
        if refs_path.exists():
            with open(refs_path) as f:
                context["references"] = json.load(f)

        return context

    def delete_context_item(self, project_id: str, item_type: str, item_name: str) -> bool:
        """Delete a context item."""
        project_dir = self._get_project_dir(project_id)

        if item_type == "notes":
            notes_path = project_dir / "context" / "notes.md"
            if notes_path.exists():
                notes_path.unlink()
                return True
        elif item_type == "image":
            img_path = project_dir / "context" / "images" / item_name
            if img_path.exists():
                img_path.unlink()
                return True
        elif item_type == "file":
            file_path = project_dir / "context" / "files" / item_name
            if file_path.exists():
                file_path.unlink()
                return True
        elif item_type == "reference":
            refs_path = project_dir / "context" / "references.json"
            if refs_path.exists():
                with open(refs_path) as f:
                    refs = json.load(f)
                refs = [r for r in refs if r.get("project") != item_name]
                with open(refs_path, "w") as f:
                    json.dump(refs, f, indent=2)
                return True

        return False

    # ==================== CLAUDE.md Generation ====================

    def _write_recommendations_claude_md(
        self,
        project_dir: Path,
        project_name: str,
        niche: str,
        idea: str,
        rec_id: str
    ) -> None:
        """Write CLAUDE.md for recommendations phase."""
        context_section = self._build_context_section(project_dir.name)

        claude_md = f"""# Video Studio - Recommendations Phase

## Project
- **Name:** {project_name}
- **Niche:** {niche}
- **Recommendations ID:** {rec_id}

## Video Idea
{idea}

{context_section}

## CRITICAL: Use Available Skills and Tools

**BEFORE generating recommendations, run these commands:**

1. **Load Remotion Skill** (required for understanding video capabilities):
   ```
   /remotion-best-practices
   ```
   This skill contains the complete EnhancedVideoProps schema, scene types, animations, and best practices.

2. **For Research** (use agent-browser for web research):
   Use the `agent-browser` skill or MCP tools to search for:
   - Current trends related to the topic
   - Statistics and facts
   - Expert opinions

## Your Task: Generate Video Recommendations

Analyze the video idea and suggest options for the user to choose from. DO NOT create a full plan yet.

### What to Recommend

1. **Genre/Style** - Suggest 3 genre options that would work for this topic:
   - educational: Clear explanations with examples
   - entertaining: Hook-heavy with humor/surprise
   - motivational: Inspirational tone, success stories
   - storytelling: Narrative arc, character-driven
   - listicle: Numbered points, rapid-fire facts

2. **Visual Style** - Suggest 3 visual styles with gradient presets:
   - minimalist: Clean text, subtle animations (gradient: midnight)
   - vibrant: Bold colors, energetic transitions (gradient: neonPink)
   - professional: Corporate feel, clean data viz (gradient: deepOcean)
   - cinematic: Image-heavy, moody overlays (gradient: purpleNight)
   - playful: Colorful, animated icons (gradient: sunset)

3. **Animation Presets** - Suggest 2-3 animation combinations:
   - smooth: fadeIn, slideUp (timing: spring) - Subtle, professional
   - dynamic: scale, bounce (timing: spring) - Energetic, attention-grabbing
   - typewriter: typewriter, draw (timing: linear) - Text-focused, documentary
   - cinematic: blur, fade (timing: easing) - Film-like transitions

4. **Research Sources** - Identify 2-3 web searches that would find useful facts:
   - What statistics or facts would strengthen this video?
   - What expert opinions or quotes would add credibility?
   - What images would enhance the visual appeal?

5. **Hook Suggestions** - Provide 2-3 hook ideas:
   - question: "What if you could...?"
   - statistic: "87% of people..."
   - bold-claim: "This changed everything..."
   - curiosity-gap: "The one thing that..."
   - controversy: "Everyone gets this wrong..."

6. **Scene Structure** - Outline a typical scene flow (don't write content yet):
   - How many scenes? (typically 5-8 for 45-60s video)
   - What scene types in what order?
   - Rough duration per section

### Output Format
Save your recommendations as JSON to: `.recommendations/{rec_id}.json`

```json
{{
  "rec_id": "{rec_id}",
  "idea": "{idea}",
  "generated_at": "ISO timestamp",

  "genres": [
    {{"id": "educational", "label": "Educational", "description": "Clear explanations with examples", "selected": false}},
    {{"id": "entertaining", "label": "Entertaining", "description": "Hook-heavy with humor/surprise", "selected": false}},
    {{"id": "motivational", "label": "Motivational", "description": "Inspirational tone, success stories", "selected": false}}
  ],

  "styles": [
    {{"id": "minimalist", "label": "Minimalist", "description": "Clean text, subtle animations", "gradient": "midnight"}},
    {{"id": "vibrant", "label": "Vibrant", "description": "Bold colors, energetic transitions", "gradient": "neonPink"}},
    {{"id": "professional", "label": "Professional", "description": "Corporate feel, clean data viz", "gradient": "deepOcean"}}
  ],

  "animation_presets": [
    {{"id": "smooth", "animations": ["fadeIn", "slideUp"], "timing": "spring", "description": "Subtle, professional"}},
    {{"id": "dynamic", "animations": ["scale", "bounce"], "timing": "spring", "description": "Energetic, attention-grabbing"}}
  ],

  "research_sources": [
    {{"type": "web", "query": "topic statistics 2026", "reason": "Find recent stats"}},
    {{"type": "web", "query": "topic expert quotes", "reason": "Expert credibility"}},
    {{"type": "images", "query": "topic visual aesthetic", "reason": "Background images"}}
  ],

  "hook_suggestions": [
    {{"type": "question", "text": "What if you could...?"}},
    {{"type": "statistic", "text": "87% of professionals..."}},
    {{"type": "bold-claim", "text": "These 5 tips changed everything..."}}
  ],

  "scene_structure": [
    {{"type": "hook", "concept": "Attention-grabbing opening", "duration": "3-5s"}},
    {{"type": "content", "concept": "Main point 1", "duration": "8-12s"}},
    {{"type": "content", "concept": "Main point 2", "duration": "8-12s"}},
    {{"type": "bullet-list", "concept": "Quick summary", "duration": "6-8s"}},
    {{"type": "cta", "concept": "Subscribe + link", "duration": "3-4s"}}
  ]
}}
```

### Important
- Tailor recommendations to the specific idea and niche
- Consider the target audience for this type of content
- Be specific in your suggestions (not generic)
- Include reasoning for why each option fits
"""

        claude_md_path = project_dir / ".claude" / "CLAUDE.md"
        with open(claude_md_path, "w") as f:
            f.write(claude_md)

    def _build_context_section(self, project_id: str) -> str:
        """Build context section for CLAUDE.md."""
        context = self.get_context(project_id)
        sections = []

        if context["notes"]:
            sections.append(f"""## User Notes
{context["notes"]}
""")

        if context["images"]:
            image_list = "\n".join([f"- `{img['filename']}`" for img in context["images"]])
            sections.append(f"""## Reference Images
The following images are available in `context/images/`:
{image_list}

You can reference these when designing scenes or describing visual style.
""")

        if context["files"]:
            file_list = "\n".join([f"- `{f['filename']}`" for f in context["files"]])
            sections.append(f"""## Data Files
The following files are available in `context/files/`:
{file_list}

You can read these files to extract facts, statistics, or content for the video.
""")

        if context["references"]:
            ref_list = "\n".join([f"- `{r['project']}` at `{r['path']}`" for r in context["references"]])
            sections.append(f"""## Workspace Project References
The following workspace projects are available for research:
{ref_list}

You can read files from these projects for additional context.
""")

        return "\n".join(sections)

    def _write_plan_claude_md(
        self,
        project_dir: Path,
        project_name: str,
        niche: str,
        idea: str,
        plan_id: str,
        recommendations: Optional[Dict] = None
    ) -> None:
        """Write CLAUDE.md for plan phase with optional recommendations context."""
        context_section = self._build_context_section(project_dir.name)

        # Build recommendations context if available
        rec_context = ""
        if recommendations:
            selected = recommendations.get("selected_options", {})
            rec_context = f"""
## User's Selected Options

Based on recommendations, the user has selected:
- **Genre:** {selected.get('genre', 'Not specified')}
- **Visual Style:** {selected.get('style', 'Not specified')}
- **Animation Preset:** {selected.get('animation_preset', 'Not specified')}
- **Hook Type:** {selected.get('hook_type', 'Not specified')}

### Research Sources to Use
"""
            for source in recommendations.get("research_sources", []):
                if source.get("selected", True):
                    rec_context += f"- Search: \"{source.get('query', '')}\" ({source.get('reason', '')})\n"

            rec_context += "\nUse these selections to guide your planning.\n"

        claude_md = f"""# Video Studio - Plan Phase (with Research + Image Suggestions)

## Project
- **Name:** {project_name}
- **Niche:** {niche}
- **Plan ID:** {plan_id}

## Video Idea
{idea}

{rec_context}
{context_section}

## CRITICAL: Use Available Skills and Tools

**BEFORE creating the plan, run these commands:**

1. **Load Remotion Skill** (required for video schema knowledge):
   ```
   /remotion-best-practices
   ```
   This provides complete EnhancedVideoProps schema, all scene types, animation options, and visual elements.

2. **Web Research** (use agent-browser or WebSearch):
   - Search for statistics and facts about the topic
   - Find expert quotes and citations
   - Look for trending angles

3. **Image Search** (for scene backgrounds):
   - Use Unsplash source URLs for stock images
   - Consider AI image generation prompts

## Your Task: Research and Create a Detailed Video Plan

Research the topic and create a detailed video outline with image suggestions. DO NOT generate the full script yet.

### Steps
1. **Research** - Use web search to find:
   - Interesting facts and statistics (cite sources)
   - Current trends or news related to the topic
   - Expert opinions or quotes
   - Unique angles that fit the selected genre/style

2. **Plan Each Scene** - For each scene include:
   - Scene type and concept
   - Specific background (gradient preset or image suggestion)
   - Animation choice from the selected preset
   - Image suggestions (Unsplash keywords or AI generation prompts)
   - Exact duration in seconds

3. **Image Suggestions** - For visual scenes, suggest:
   - Unsplash search query: "https://source.unsplash.com/1080x1920/?keywords"
   - OR AI generation prompt: "Describe what to generate"

### Output Format
Save your plan as JSON to: `.plans/{plan_id}.json`

```json
{{
  "plan_id": "{plan_id}",
  "idea": "{idea}",
  "created_at": "ISO timestamp",

  "research_findings": [
    {{"source": "web search", "fact": "85% of workers report...", "citation": "Forbes 2026"}},
    {{"source": "web search", "fact": "Average time saved: 12.4 hours/week", "citation": "McKinsey Report"}}
  ],

  "selected_options": {{
    "genre": "educational",
    "style": "minimalist",
    "animation_preset": "smooth",
    "hook_type": "statistic"
  }},

  "hook": {{
    "concept": "Attention-grabbing statistic about time wasted",
    "type": "statistic",
    "text": "The average worker wastes 12 hours per week on tasks AI can do in seconds."
  }},

  "scenes": [
    {{
      "order": 1,
      "type": "hook",
      "concept": "Statistic hook about time wasted",
      "text": "The average worker wastes 12 hours per week...",
      "background": {{
        "type": "gradient",
        "preset": "purpleNight"
      }},
      "animation": "fadeIn",
      "duration_seconds": 4,
      "image_suggestions": [
        {{"type": "unsplash", "query": "clock time dark", "url": "https://source.unsplash.com/1080x1920/?clock,time,dark"}},
        {{"type": "generate", "prompt": "Digital clock melting, surreal, purple gradient background"}}
      ]
    }},
    {{
      "order": 2,
      "type": "content",
      "title": "Tool #1: ChatGPT",
      "concept": "Email drafting and summarization",
      "text": "Draft professional emails in seconds. Summarize long documents instantly.",
      "background": {{
        "type": "gradient",
        "preset": "deepOcean"
      }},
      "animation": "slideUp",
      "duration_seconds": 10,
      "lottie": {{"preset": "robot", "position": "right"}},
      "image_suggestions": [
        {{"type": "unsplash", "query": "AI robot assistant", "url": "https://source.unsplash.com/1080x1920/?ai,robot"}}
      ]
    }}
  ],

  "cta": {{
    "message": "Subscribe for more AI tips!",
    "style": "bounce animation with particles",
    "background": {{
      "type": "gradient",
      "preset": "neonPink"
    }}
  }},

  "total_duration_seconds": 56,
  "notes": "Research found strong data on AI productivity. Using minimalist style with purple gradients for tech feel."
}}
```

### Background Presets Available
| Preset | Description | Best For |
|--------|-------------|----------|
| purpleNight | Dark purple gradient | Tech, professional |
| deepOcean | Blue-teal gradient | Calm, business |
| sunset | Orange-pink gradient | Warm, creative |
| neonPink | Pink-purple gradient | Trendy, youth |
| midnight | Dark blue gradient | Serious, finance |
| fire | Red-orange gradient | Urgent, action |
| aurora | Blue to purple | Tech, innovation |
| cyber | Cyan to blue | Futuristic |
| matrix | Green on black | Hacker, tech |
| electric | Purple-blue | Energy, dynamic |

### Image Suggestion Guidelines
- Use Unsplash Source URLs: `https://source.unsplash.com/1080x1920/?keyword1,keyword2`
- Use dark/abstract keywords for backgrounds (text readability)
- Include 1-2 suggestions per scene that needs visual variety
- For AI generation prompts, be specific about style, colors, mood

### Important
- Research FIRST, then plan based on findings
- Include specific facts with citations
- Each scene should have image_suggestions if visually relevant
- Match backgrounds to the selected style
- Use animations from the selected preset
"""

        claude_md_path = project_dir / ".claude" / "CLAUDE.md"
        with open(claude_md_path, "w") as f:
            f.write(claude_md)

    def _write_script_claude_md(
        self,
        project_dir: Path,
        project_name: str,
        niche: str,
        plan: Dict,
        script_id: str
    ) -> None:
        """Write CLAUDE.md for script generation phase."""
        context_section = self._build_context_section(project_dir.name)

        # Format the plan for inclusion
        plan_summary = f"""
### Research Summary
{plan.get('research_summary', 'No research provided')}

### Hook
- Concept: {plan.get('hook', {}).get('concept', 'Not specified')}
- Type: {plan.get('hook', {}).get('type', 'Not specified')}

### Planned Scenes
"""
        for scene in plan.get('scenes', []):
            plan_summary += f"""
**Scene {scene.get('order', '?')}: {scene.get('type', 'content')}**
- Concept: {scene.get('concept', '')}
- Visual: {scene.get('visual_idea', '')}
- Duration: {scene.get('duration_estimate', '')}
"""

        plan_summary += f"""
### Call to Action
- Message: {plan.get('cta', {}).get('message', '')}
- Style: {plan.get('cta', {}).get('style', '')}

### Notes
{plan.get('notes', '')}
"""

        claude_md = f"""# Video Studio - Script Generation

## Project
- **Name:** {project_name}
- **Niche:** {niche}
- **Script ID:** {script_id}

## Approved Plan
{plan_summary}

{context_section}

## CRITICAL: Load Remotion Skill First

**BEFORE generating the script, run this command:**
```
/remotion-best-practices
```

This skill contains the complete EnhancedVideoProps schema with:
- All 10 scene types and their properties
- Animation options and timing configurations
- Background presets and visual elements
- Lottie animation presets
- Drawing path presets
- Best practices for engaging videos

## Your Task: Generate Full Video Script

Convert the approved plan into a complete EnhancedVideoProps JSON script.

### EnhancedVideoProps Schema

```json
{{
  "title": "REQUIRED - Short title for the video (3-6 words)",
  "scenes": [
    {{
      "id": "unique-scene-id",
      "type": "hook | content | bullet-list | quote | cta | title-card | whiteboard | stats | icon-reveal | split-screen",
      "duration": 90,  // frames at 30fps (90 = 3 seconds)
      "text": "Main text content",
      "title": "Optional scene title",
      "bullets": ["For bullet-list type only"],
      "emphasis": ["words", "to highlight"],
      "animation": "fadeIn | slideUp | slideDown | slideLeft | slideRight | scale | typewriter | bounce | blur | draw",
      "timing": {{
        "type": "spring | linear | easing",
        "damping": 200,
        "stiffness": 100
      }},
      "transitionIn": {{ "type": "fade | slide | wipe", "duration": 15 }},
      "transitionOut": {{ "type": "fade | slide | wipe", "duration": 15 }},

      "background": {{
        "type": "gradient | mesh | solid | grid | dots | image",
        "gradientPreset": "purpleNight | deepOcean | sunset | neonPink | midnight | fire | aurora | cyber | matrix | electric | darkPurple | peach | mint | lavender",
        "imageUrl": "https://source.unsplash.com/1080x1920/?keywords",
        "overlay": "rgba(0,0,0,0.5)",
        "blur": 2
      }},
      "particles": true,
      "lottie": {{
        "preset": "robot | brain | rocket | success | chart | medical | science",
        "size": 200,
        "position": "center | top | bottom"
      }},
      "drawingPath": {{
        "preset": "check | cross | arrowRight | lightbulb | star | heart | brain | rocket | chart",
        "stroke": "#8b5cf6",
        "strokeWidth": 4
      }},
      "stats": [
        {{ "label": "Label", "value": 100, "maxValue": 100, "color": "#8b5cf6" }}
      ]
    }}
  ],
  "backgroundColor": "#0a0a0a",
  "textColor": "#ffffff",
  "accentColor": "#8b5cf6",
  "backgroundImage": "optional global background URL"
}}
```

### Background Presets
| Preset | Description | Best For |
|--------|-------------|----------|
| purpleNight | Dark purple gradient | Tech, professional |
| deepOcean | Blue-teal gradient | Calm, business |
| sunset | Orange-pink gradient | Warm, creative |
| neonPink | Pink-purple gradient | Trendy, youth |
| midnight | Dark blue gradient | Serious, finance |
| fire | Red-orange gradient | Urgent, action |
| aurora | Blue to purple | Tech, innovation |
| cyber | Cyan to blue | Futuristic |
| matrix | Green on black | Hacker, tech |
| electric | Purple-blue | Energy, dynamic |

### Lottie Animation Presets
- **robot**: For AI/tech topics
- **brain**: For ideas, learning, thinking
- **rocket**: For growth, startups, speed
- **success**: For achievements, wins
- **chart**: For data, analytics
- **medical**: For health topics
- **science**: For research, experiments

### Drawing Path Presets
- **check**: Checkmark (completion)
- **lightbulb**: Ideas
- **star**: Excellence
- **heart**: Passion, love
- **brain**: Intelligence
- **rocket**: Growth
- **chart**: Analytics

### Timing Guidelines
- Total video: 45-60 seconds (1350-1800 frames at 30fps)
- Hook: 90-150 frames (3-5 seconds)
- Content scenes: 150-240 frames (5-8 seconds)
- CTA: 90-120 frames (3-4 seconds)

### Output
Save the script as JSON to: `scripts/{script_id}.json`

Make the video VISUALLY ENGAGING with:
- Gradient backgrounds (never plain black)
- Particles on hook and CTA
- Mix of scene types
- Appropriate lottie animations or drawing paths
- Image backgrounds for variety (use Unsplash Source)
"""

        claude_md_path = project_dir / ".claude" / "CLAUDE.md"
        with open(claude_md_path, "w") as f:
            f.write(claude_md)

    # ==================== Recommendations Phase ====================

    async def generate_recommendations(
        self,
        project_id: str,
        project_name: str,
        niche: str,
        idea: str,
        rec_id: Optional[str] = None
    ) -> AsyncGenerator[Dict, None]:
        """
        Step 1: Generate video recommendations using Claude Code.

        Claude will analyze the idea and suggest options for genre, style,
        animations, research sources, and scene structure.
        """
        rec_id = rec_id or f"rec_{uuid.uuid4().hex[:8]}"
        project_dir = self._get_project_dir(project_id)

        # Clear any existing session to start fresh for recommendations
        self._clear_session(project_dir)

        # Write CLAUDE.md for recommendations phase
        self._write_recommendations_claude_md(project_dir, project_name, niche, idea, rec_id)

        yield {
            "type": "status",
            "message": "Starting recommendations generation...",
            "rec_id": rec_id
        }

        # Spawn Claude (fresh session)
        prompt = f"Analyze this video idea and generate recommendations: {idea}"

        try:
            process = await self._spawn_claude(project_dir, prompt, use_continue=False)

            yield {
                "type": "status",
                "message": "Claude is analyzing the video idea..."
            }

            # Stream output and capture session ID
            buffer = ""
            session_captured = False
            async for line in process.stdout:
                line_text = line.decode('utf-8', errors='replace')
                buffer += line_text

                while '\n' in buffer:
                    json_line, buffer = buffer.split('\n', 1)
                    json_line = json_line.strip()
                    if not json_line:
                        continue

                    # Try to extract session ID
                    if not session_captured:
                        session_id = self._extract_session_id_from_output(json_line)
                        if session_id:
                            self._save_session_id(project_dir, session_id)
                            session_captured = True

                    try:
                        event = json.loads(json_line)
                        event_type = event.get("type", "")

                        # Also check for session ID in init events
                        if event_type == "system" and not session_captured:
                            if "session_id" in event:
                                self._save_session_id(project_dir, event["session_id"])
                                session_captured = True

                        if event_type == "assistant":
                            message = event.get("message", {})
                            content = message.get("content", [])
                            for block in content:
                                if block.get("type") == "text":
                                    yield {
                                        "type": "text",
                                        "content": block.get("text", "")
                                    }
                                elif block.get("type") == "tool_use":
                                    yield {
                                        "type": "tool",
                                        "tool": block.get("name", ""),
                                        "input": str(block.get("input", {}))[:200]
                                    }

                        elif event_type == "result":
                            yield {
                                "type": "result",
                                "content": event.get("result", "")
                            }

                    except json.JSONDecodeError:
                        pass

            await process.wait()

            # Check if recommendations were generated
            rec_path = project_dir / ".recommendations" / f"{rec_id}.json"
            if rec_path.exists():
                with open(rec_path) as f:
                    rec_data = json.load(f)

                yield {
                    "type": "complete",
                    "success": True,
                    "rec_id": rec_id,
                    "recommendations": rec_data
                }
            else:
                yield {
                    "type": "complete",
                    "success": False,
                    "error": "Recommendations file was not generated",
                    "rec_id": rec_id
                }

        except Exception as e:
            logger.error(f"Recommendations generation failed: {e}")
            yield {
                "type": "error",
                "error": str(e),
                "rec_id": rec_id
            }

    def get_recommendations(self, project_id: str, rec_id: Optional[str] = None) -> Optional[Dict]:
        """Get recommendations by ID, or the latest if no ID specified."""
        project_dir = self._get_project_dir(project_id)
        recs_dir = project_dir / ".recommendations"

        if rec_id:
            rec_path = recs_dir / f"{rec_id}.json"
            if rec_path.exists():
                with open(rec_path) as f:
                    return json.load(f)
        else:
            # Get the latest recommendations
            if recs_dir.exists():
                rec_files = list(recs_dir.glob("*.json"))
                if rec_files:
                    latest = max(rec_files, key=lambda f: f.stat().st_mtime)
                    with open(latest) as f:
                        return json.load(f)
        return None

    def update_recommendations(self, project_id: str, rec_id: str, selections: Dict) -> Optional[Dict]:
        """Update recommendations with user selections."""
        project_dir = self._get_project_dir(project_id)
        rec_path = project_dir / ".recommendations" / f"{rec_id}.json"

        if not rec_path.exists():
            return None

        with open(rec_path) as f:
            rec_data = json.load(f)

        # Update selected options
        rec_data["selected_options"] = selections

        # Mark individual items as selected
        if "genre" in selections:
            for genre in rec_data.get("genres", []):
                genre["selected"] = genre["id"] == selections["genre"]

        if "style" in selections:
            for style in rec_data.get("styles", []):
                style["selected"] = style["id"] == selections["style"]

        if "animation_preset" in selections:
            for preset in rec_data.get("animation_presets", []):
                preset["selected"] = preset["id"] == selections["animation_preset"]

        with open(rec_path, "w") as f:
            json.dump(rec_data, f, indent=2)

        return rec_data

    # ==================== Plan Phase ====================

    async def generate_plan(
        self,
        project_id: str,
        project_name: str,
        niche: str,
        idea: str,
        plan_id: Optional[str] = None,
        recommendations: Optional[Dict] = None,
        use_continue: bool = True
    ) -> AsyncGenerator[Dict, None]:
        """
        Step 2: Generate a video plan using Claude Code with optional session continuity.

        Claude will research the topic and create a structured outline with image suggestions.
        Uses --continue if a previous session exists (e.g., from recommendations phase).
        """
        plan_id = plan_id or f"plan_{uuid.uuid4().hex[:8]}"
        project_dir = self._get_project_dir(project_id)

        # If no recommendations provided, try to get the latest
        if recommendations is None:
            recommendations = self.get_recommendations(project_id)

        # Write CLAUDE.md for plan phase with recommendations context
        self._write_plan_claude_md(project_dir, project_name, niche, idea, plan_id, recommendations)

        yield {
            "type": "status",
            "message": "Starting plan generation with research...",
            "plan_id": plan_id
        }

        # Build prompt based on whether we have recommendations
        if recommendations and recommendations.get("selected_options"):
            selected = recommendations["selected_options"]
            prompt = f"""Create a detailed video plan for: {idea}

Use the selected options:
- Genre: {selected.get('genre', 'educational')}
- Style: {selected.get('style', 'professional')}
- Animation: {selected.get('animation_preset', 'smooth')}
- Hook type: {selected.get('hook_type', 'statistic')}

Research the topic first, then create the plan with image suggestions."""
        else:
            prompt = f"Research and create a detailed video plan with image suggestions for: {idea}"

        try:
            # Use --continue if we have a previous session
            process = await self._spawn_claude(project_dir, prompt, use_continue=use_continue)

            yield {
                "type": "status",
                "message": "Claude is researching the topic..."
            }

            # Stream output
            buffer = ""
            async for line in process.stdout:
                line_text = line.decode('utf-8', errors='replace')
                buffer += line_text

                while '\n' in buffer:
                    json_line, buffer = buffer.split('\n', 1)
                    json_line = json_line.strip()
                    if not json_line:
                        continue

                    try:
                        event = json.loads(json_line)
                        event_type = event.get("type", "")

                        if event_type == "assistant":
                            message = event.get("message", {})
                            content = message.get("content", [])
                            for block in content:
                                if block.get("type") == "text":
                                    yield {
                                        "type": "text",
                                        "content": block.get("text", "")
                                    }
                                elif block.get("type") == "tool_use":
                                    yield {
                                        "type": "tool",
                                        "tool": block.get("name", ""),
                                        "input": str(block.get("input", {}))[:200]
                                    }

                        elif event_type == "result":
                            yield {
                                "type": "result",
                                "content": event.get("result", "")
                            }

                    except json.JSONDecodeError:
                        pass

            await process.wait()

            # Check if plan was generated
            plan_path = project_dir / ".plans" / f"{plan_id}.json"
            if plan_path.exists():
                with open(plan_path) as f:
                    plan_data = json.load(f)

                yield {
                    "type": "complete",
                    "success": True,
                    "plan_id": plan_id,
                    "plan": plan_data
                }
            else:
                yield {
                    "type": "complete",
                    "success": False,
                    "error": "Plan file was not generated",
                    "plan_id": plan_id
                }

        except Exception as e:
            logger.error(f"Plan generation failed: {e}")
            yield {
                "type": "error",
                "error": str(e),
                "plan_id": plan_id
            }

    def get_plan(self, project_id: str, plan_id: str) -> Optional[Dict]:
        """Get a plan by ID."""
        project_dir = self._get_project_dir(project_id)
        plan_path = project_dir / ".plans" / f"{plan_id}.json"

        if plan_path.exists():
            with open(plan_path) as f:
                return json.load(f)
        return None

    def list_plans(self, project_id: str) -> List[Dict]:
        """List all plans for a project."""
        project_dir = self._get_project_dir(project_id)
        plans_dir = project_dir / ".plans"

        plans = []
        if plans_dir.exists():
            for plan_file in plans_dir.glob("*.json"):
                try:
                    with open(plan_file) as f:
                        plan = json.load(f)
                    plans.append({
                        "id": plan_file.stem,
                        "idea": plan.get("idea", ""),
                        "scene_count": len(plan.get("scenes", [])),
                        "modified_at": plan_file.stat().st_mtime
                    })
                except:
                    pass

        return sorted(plans, key=lambda x: x["modified_at"], reverse=True)

    def update_plan(self, project_id: str, plan_id: str, updates: Dict) -> Optional[Dict]:
        """Update a plan with user edits."""
        project_dir = self._get_project_dir(project_id)
        plan_path = project_dir / ".plans" / f"{plan_id}.json"

        if not plan_path.exists():
            return None

        with open(plan_path) as f:
            plan = json.load(f)

        # Deep merge updates
        for key, value in updates.items():
            if isinstance(value, dict) and isinstance(plan.get(key), dict):
                plan[key].update(value)
            else:
                plan[key] = value

        with open(plan_path, "w") as f:
            json.dump(plan, f, indent=2)

        return plan

    # ==================== Script Generation Phase ====================

    async def generate_script_from_plan(
        self,
        project_id: str,
        project_name: str,
        niche: str,
        plan_id: str,
        script_id: Optional[str] = None,
        use_continue: bool = True
    ) -> AsyncGenerator[Dict, None]:
        """
        Step 3: Generate full script from an approved plan.

        Uses --continue to maintain session context from recommendations and planning.
        """
        script_id = script_id or f"script_{uuid.uuid4().hex[:8]}"
        project_dir = self._get_project_dir(project_id)

        # Get the plan
        plan = self.get_plan(project_id, plan_id)
        if not plan:
            yield {
                "type": "error",
                "error": f"Plan {plan_id} not found"
            }
            return

        # Write CLAUDE.md for script generation
        self._write_script_claude_md(project_dir, project_name, niche, plan, script_id)

        yield {
            "type": "status",
            "message": "Starting script generation from plan...",
            "script_id": script_id
        }

        prompt = "Generate the full EnhancedVideoProps script from the approved plan. Use the backgrounds, animations, and image suggestions from the plan."

        try:
            # Use --continue to maintain context
            process = await self._spawn_claude(project_dir, prompt, use_continue=use_continue)

            yield {
                "type": "status",
                "message": "Claude is generating the video script..."
            }

            # Stream output
            buffer = ""
            async for line in process.stdout:
                line_text = line.decode('utf-8', errors='replace')
                buffer += line_text

                while '\n' in buffer:
                    json_line, buffer = buffer.split('\n', 1)
                    json_line = json_line.strip()
                    if not json_line:
                        continue

                    try:
                        event = json.loads(json_line)
                        event_type = event.get("type", "")

                        if event_type == "assistant":
                            message = event.get("message", {})
                            content = message.get("content", [])
                            for block in content:
                                if block.get("type") == "text":
                                    yield {
                                        "type": "text",
                                        "content": block.get("text", "")
                                    }
                                elif block.get("type") == "tool_use":
                                    yield {
                                        "type": "tool",
                                        "tool": block.get("name", ""),
                                        "input": str(block.get("input", {}))[:200]
                                    }

                        elif event_type == "result":
                            yield {
                                "type": "result",
                                "content": event.get("result", "")
                            }

                    except json.JSONDecodeError:
                        pass

            await process.wait()

            # Check if script was generated
            script_path = project_dir / "scripts" / f"{script_id}.json"
            if script_path.exists():
                with open(script_path) as f:
                    script_data = json.load(f)

                yield {
                    "type": "complete",
                    "success": True,
                    "script_id": script_id,
                    "script": script_data
                }
            else:
                yield {
                    "type": "complete",
                    "success": False,
                    "error": "Script file was not generated",
                    "script_id": script_id
                }

        except Exception as e:
            logger.error(f"Script generation failed: {e}")
            yield {
                "type": "error",
                "error": str(e),
                "script_id": script_id
            }

    # ==================== Script Management ====================

    def get_script(self, project_id: str, script_id: str) -> Optional[Dict]:
        """Get a script by ID."""
        project_dir = self._get_project_dir(project_id)
        script_path = project_dir / "scripts" / f"{script_id}.json"

        if script_path.exists():
            with open(script_path) as f:
                return json.load(f)
        return None

    def list_scripts(self, project_id: str) -> List[Dict]:
        """List all scripts for a project."""
        project_dir = self._get_project_dir(project_id)
        scripts_dir = project_dir / "scripts"

        scripts = []
        if scripts_dir.exists():
            for script_file in scripts_dir.glob("*.json"):
                try:
                    with open(script_file) as f:
                        script = json.load(f)
                    scripts.append({
                        "id": script_file.stem,
                        "title": script.get("title", "Untitled"),
                        "scene_count": len(script.get("scenes", [])),
                        "modified_at": script_file.stat().st_mtime
                    })
                except:
                    pass

        return sorted(scripts, key=lambda x: x["modified_at"], reverse=True)

    def update_script(self, project_id: str, script_id: str, script: Dict) -> Optional[Dict]:
        """Update a full script."""
        project_dir = self._get_project_dir(project_id)
        script_path = project_dir / "scripts" / f"{script_id}.json"

        with open(script_path, "w") as f:
            json.dump(script, f, indent=2)

        return script

    def update_scene(
        self,
        project_id: str,
        script_id: str,
        scene_id: str,
        updates: Dict
    ) -> Optional[Dict]:
        """Update a single scene in a script."""
        script = self.get_script(project_id, script_id)
        if not script:
            return None

        scenes = script.get("scenes", [])
        for i, scene in enumerate(scenes):
            if scene.get("id") == scene_id:
                scenes[i].update(updates)
                break

        script["scenes"] = scenes
        return self.update_script(project_id, script_id, script)

    def add_scene(
        self,
        project_id: str,
        script_id: str,
        scene: Dict,
        after_scene_id: Optional[str] = None
    ) -> Optional[Dict]:
        """Add a new scene to a script."""
        script = self.get_script(project_id, script_id)
        if not script:
            return None

        scenes = script.get("scenes", [])

        if after_scene_id:
            for i, s in enumerate(scenes):
                if s.get("id") == after_scene_id:
                    scenes.insert(i + 1, scene)
                    break
        else:
            scenes.append(scene)

        script["scenes"] = scenes
        return self.update_script(project_id, script_id, script)

    def delete_scene(self, project_id: str, script_id: str, scene_id: str) -> Optional[Dict]:
        """Delete a scene from a script."""
        script = self.get_script(project_id, script_id)
        if not script:
            return None

        scenes = [s for s in script.get("scenes", []) if s.get("id") != scene_id]
        script["scenes"] = scenes
        return self.update_script(project_id, script_id, script)

    def delete_script(self, project_id: str, script_id: str) -> bool:
        """Delete a script."""
        project_dir = self._get_project_dir(project_id)
        script_path = project_dir / "scripts" / f"{script_id}.json"

        if script_path.exists():
            script_path.unlink()
            return True
        return False

    # ==================== Image Management ====================

    def upload_image(self, project_id: str, filename: str, content: bytes) -> Dict:
        """Upload an image for scene backgrounds."""
        project_dir = self._get_project_dir(project_id)
        image_path = project_dir / "images" / "uploaded" / filename

        with open(image_path, "wb") as f:
            f.write(content)

        return {
            "filename": filename,
            "path": str(image_path),
            "size": len(content),
            "type": "uploaded"
        }

    def save_generated_image(self, project_id: str, filename: str, content: bytes) -> Dict:
        """Save an AI-generated image."""
        project_dir = self._get_project_dir(project_id)
        image_path = project_dir / "images" / "generated" / filename

        with open(image_path, "wb") as f:
            f.write(content)

        return {
            "filename": filename,
            "path": str(image_path),
            "size": len(content),
            "type": "generated"
        }

    def list_images(self, project_id: str) -> Dict:
        """List all images for a project."""
        project_dir = self._get_project_dir(project_id)

        images = {
            "uploaded": [],
            "generated": []
        }

        for image_type in ["uploaded", "generated"]:
            img_dir = project_dir / "images" / image_type
            if img_dir.exists():
                for img in img_dir.iterdir():
                    if img.is_file():
                        images[image_type].append({
                            "filename": img.name,
                            "path": str(img),
                            "size": img.stat().st_size
                        })

        return images

    def delete_image(self, project_id: str, image_type: str, filename: str) -> bool:
        """Delete an image."""
        project_dir = self._get_project_dir(project_id)
        image_path = project_dir / "images" / image_type / filename

        if image_path.exists():
            image_path.unlink()
            return True
        return False


# Singleton instance
video_studio = VideoStudioGenerator()

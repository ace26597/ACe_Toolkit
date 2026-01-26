"""
Video Script Generator - Claude Code powered script generation for Remotion.

Uses Claude Code with remotion-best-practices skill to:
1. Research video ideas
2. Generate detailed Remotion EnhancedVideoProps JSON scripts
"""

import asyncio
import json
import logging
import os
import subprocess
import uuid
from datetime import datetime
from pathlib import Path
from typing import AsyncGenerator, Dict, Optional

logger = logging.getLogger(__name__)


class VideoScriptGenerator:
    """
    Generates Remotion video scripts using Claude Code.

    Launches Claude Code with the remotion-best-practices skill to research
    topics and generate detailed video scripts in EnhancedVideoProps format.
    """

    def __init__(self):
        self.base_dir = "/data/video-factory"
        self.scripts_dir = os.path.join(self.base_dir, "scripts")
        os.makedirs(self.scripts_dir, exist_ok=True)

    def _get_project_dir(self, project_id: str) -> str:
        """Get or create project directory."""
        project_dir = os.path.join(self.base_dir, "projects", project_id)
        os.makedirs(project_dir, exist_ok=True)
        os.makedirs(os.path.join(project_dir, "scripts"), exist_ok=True)
        os.makedirs(os.path.join(project_dir, ".claude"), exist_ok=True)
        return project_dir

    def _get_claude_md(self, project_name: str, niche: str) -> str:
        """Generate CLAUDE.md for the project."""
        return f"""# Video Factory Project: {project_name}

## Context
You are generating short-form video scripts for a {niche} channel.
Your scripts will be rendered using Remotion (React video framework).

## Your Task
When given a video idea:
1. Research the topic to find interesting facts, statistics, and angles
2. Generate a compelling video script in EnhancedVideoProps JSON format
3. Save the script to a JSON file

## Skills Available
- remotion-best-practices: Use this for Remotion-specific patterns
- WebSearch: Research facts and statistics about topics

## EnhancedVideoProps Format
The script must follow this exact JSON structure:

```json
{{
  "title": "REQUIRED - Short descriptive title for the video",
  "scenes": [
    {{
      "id": "unique-id",
      "type": "hook" | "content" | "bullet-list" | "quote" | "cta" | "title-card" | "whiteboard" | "stats" | "icon-reveal" | "split-screen",
      "duration": 90,  // frames at 30fps (90 = 3 seconds)
      "text": "Main text content",
      "title": "Optional title",
      "bullets": ["For bullet-list type only"],
      "emphasis": ["words", "to highlight"],
      "animation": "fadeIn" | "slideUp" | "slideDown" | "scale" | "typewriter" | "bounce" | "blur" | "draw",
      "timing": {{
        "type": "spring" | "linear" | "easing",
        "damping": 200,
        "stiffness": 100,
        "durationFrames": 30
      }},
      "transitionIn": {{ "type": "fade" | "slide" | "wipe", "duration": 15 }},
      "transitionOut": {{ "type": "fade" | "slide" | "wipe", "duration": 15 }},

      // CREATIVE OPTIONS (use these to make videos engaging!)
      "background": {{
        "type": "gradient" | "mesh" | "solid" | "grid" | "dots" | "image",
        "gradientPreset": "purpleNight" | "deepOcean" | "sunset" | "forest" | "neonPink" | "midnight" | "fire" | "arctic",
        // For image backgrounds (use Unsplash Source):
        "imageUrl": "https://source.unsplash.com/1080x1920/?keyword",
        "overlay": "rgba(0,0,0,0.5)",  // Dark overlay for text readability
        "blur": 2  // Optional blur
      }},
      "particles": true,  // Add floating particle effect
      "lottie": {{
        "src": "URL to lottie JSON or use preset name",
        "preset": "robot" | "brain" | "rocket" | "success" | "loading" | "chart" | "medical" | "science",
        "size": 200,
        "position": "center" | "top" | "bottom" | "left" | "right"
      }},
      "drawingPath": {{
        "preset": "check" | "cross" | "arrowRight" | "arrowDown" | "circle" | "underline" | "lightbulb" | "star" | "heart" | "brain",
        "stroke": "#8b5cf6",
        "strokeWidth": 4
      }},

      // For stats scene type
      "stats": [
        {{ "label": "Users", "value": "10M+", "icon": "chart" }},
        {{ "label": "Growth", "value": "250%", "icon": "rocket" }}
      ]
    }}
  ],
  "backgroundColor": "#0a0a0a",
  "textColor": "#ffffff",
  "accentColor": "#8b5cf6",
  // Global background image (applies to all scenes unless overridden)
  "backgroundImage": "https://source.unsplash.com/1080x1920/?topic"
}}
```

## Scene Types

### Basic Scenes
- **hook**: Opening attention grabber (3-5 seconds) - use scale/bounce animation
- **content**: Main information (5-8 seconds) - use slideUp animation
- **bullet-list**: 3-5 bullet points (8-10 seconds) - staggered reveal
- **quote**: Memorable quote or statistic (4-6 seconds) - typewriter animation
- **cta**: Call to action (3-4 seconds) - bounce animation

### Creative Scenes (USE THESE FOR ENGAGING VIDEOS!)
- **whiteboard**: Hand-drawn style with SVG path animations - great for explaining concepts
- **stats**: Animated statistics with icons - perfect for data/facts
- **icon-reveal**: Lottie animation reveals with text - eye-catching transitions
- **split-screen**: Two-column layout for comparisons

## Background Presets
Use gradient backgrounds to make videos visually appealing:
- **purpleNight**: Dark purple gradient (professional, tech)
- **deepOcean**: Blue-teal gradient (calm, business)
- **sunset**: Orange-pink gradient (warm, creative)
- **forest**: Green gradient (nature, health)
- **neonPink**: Pink-purple gradient (trendy, youth)
- **midnight**: Dark blue gradient (serious, finance)
- **fire**: Red-orange gradient (urgent, action)
- **arctic**: Light blue gradient (clean, minimal)

## Lottie Animation Presets
Add animated icons to scenes:
- **robot**: Animated robot (AI/tech topics)
- **brain**: Thinking brain (ideas, learning)
- **rocket**: Launching rocket (growth, startup)
- **success**: Checkmark/celebration (achievements)
- **chart**: Animated chart (data, analytics)
- **medical**: Medical icon (health topics)
- **science**: Science/lab icon (research)

## Drawing Path Presets
For whiteboard-style drawing animations:
- **check**: Checkmark animation
- **lightbulb**: Idea bulb drawing
- **star**: Star shape
- **heart**: Heart shape
- **brain**: Brain outline
- **arrowRight/arrowDown**: Directional arrows

## Using Images (Unsplash Source - FREE, no API key needed)
You can add images to scenes using Unsplash Source URLs. The format is:
```
https://source.unsplash.com/WIDTHxHEIGHT/?KEYWORDS
```

Examples:
- `https://source.unsplash.com/1080x1920/?technology,abstract` - tech background
- `https://source.unsplash.com/1080x1920/?nature,forest` - nature scene
- `https://source.unsplash.com/1080x1920/?medical,health` - healthcare theme
- `https://source.unsplash.com/1080x1920/?business,office` - corporate look
- `https://source.unsplash.com/1080x1920/?space,galaxy` - cosmic theme

To use as background with text readability:
```json
"background": {{
  "type": "image",
  "imageUrl": "https://source.unsplash.com/1080x1920/?your,keywords",
  "overlay": "rgba(0,0,0,0.6)",
  "blur": 2
}}
```

TIP: Always use overlay (dark semi-transparent layer) when using images so text remains readable.
TIP: Use 1080x1920 resolution for vertical short-form videos.

## Best Practices for Engaging Videos
1. **Always set title** - The top-level "title" field is REQUIRED
2. **Always use backgrounds** - Never leave scenes with plain black backgrounds
3. **Add particles** to hook and CTA scenes for energy
4. **Use whiteboard scenes** when explaining processes or concepts
5. **Use stats scenes** when presenting data or numbers
6. **Mix scene types** - Don't use the same type consecutively
7. **Use lottie animations** for icon-reveal scenes
8. **Match background to content** - Use fire/neonPink for urgent topics, deepOcean for calm explanations
9. **Use image backgrounds** - For key scenes, use relevant Unsplash images with overlay

## Timing Guidelines
- Total video: 45-60 seconds (1350-1800 frames at 30fps)
- Hook: 90-150 frames (3-5 seconds)
- Each content scene: 150-240 frames (5-8 seconds)
- CTA: 90-120 frames (3-4 seconds)

## Output Requirements
1. **ALWAYS set the top-level "title" field** - This names the video (e.g., "5 AI Trends 2025")
2. Research the topic first using web search
3. Create an engaging hook with gradient background (or image) and particles
4. Include 3-4 content scenes mixing different scene types
5. Use at least 2 creative scene types (whiteboard, stats, icon-reveal)
6. Consider using 1-2 image backgrounds for visual variety
7. End with a strong CTA with background and particles
8. Save the script as JSON to: scripts/{{idea_id}}.json
"""

    def _build_prompt(self, idea: str, project_name: str, niche: str, idea_id: str) -> str:
        """Build the prompt for Claude Code."""
        return f"""Generate a video script for this idea: "{idea}"

Channel: {project_name}
Niche: {niche}

STEPS:
1. First, use web search to research interesting facts, statistics, or angles about this topic
2. Create a compelling hook with gradient or image background and particles
3. Plan 3-4 content scenes using CREATIVE scene types:
   - Use "whiteboard" for explaining concepts (with drawingPath presets)
   - Use "stats" for presenting data with animated icons
   - Use "icon-reveal" with lottie animations for key points
   - Use gradient backgrounds (purpleNight, deepOcean, sunset, etc.)
   - Use image backgrounds with Unsplash Source URLs for variety
4. End with a strong CTA with background and particles

REQUIRED:
- Set the top-level "title" field (e.g., "5 AI Trends 2025", "Why Sleep Matters")
- The title should be short (3-6 words) and descriptive

CREATIVE REQUIREMENTS:
- NEVER use plain black backgrounds - always use gradient presets
- Add "particles": true to hook and CTA scenes
- Use at least 2 different creative scene types
- Include lottie animations or drawing paths where appropriate
- Mix scene types for visual variety

OUTPUT:
Save the EnhancedVideoProps JSON to: scripts/{idea_id}.json

The JSON must be valid and follow the EnhancedVideoProps schema exactly.
Include researched facts in the content to make it valuable.
Make the video VISUALLY ENGAGING with backgrounds, animations, and creative elements.

After saving, output a brief summary of what the video covers.
"""

    async def generate_script(
        self,
        idea: str,
        project_id: str,
        project_name: str,
        niche: str,
        idea_id: Optional[str] = None
    ) -> AsyncGenerator[Dict, None]:
        """
        Generate a video script using Claude Code.

        Yields SSE events with progress and results.
        """
        idea_id = idea_id or str(uuid.uuid4())[:8]
        project_dir = self._get_project_dir(project_id)

        # Setup CLAUDE.md
        claude_md_path = os.path.join(project_dir, ".claude", "CLAUDE.md")
        with open(claude_md_path, "w") as f:
            f.write(self._get_claude_md(project_name, niche))

        # Build prompt
        prompt = self._build_prompt(idea, project_name, niche, idea_id)

        yield {
            "type": "status",
            "message": "Starting Claude Code session...",
            "idea_id": idea_id
        }

        # Run Claude Code with bypass permissions for file writing
        cmd = [
            "claude",
            "-p", prompt,
            "--output-format", "stream-json",
            "--verbose",
            "--permission-mode", "bypassPermissions"
        ]

        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=project_dir
            )

            yield {
                "type": "status",
                "message": "Claude is researching and generating script..."
            }

            # Stream output
            buffer = ""
            async for line in process.stdout:
                line_text = line.decode('utf-8', errors='replace')
                buffer += line_text

                # Try to parse JSON events
                while '\n' in buffer:
                    json_line, buffer = buffer.split('\n', 1)
                    json_line = json_line.strip()
                    if not json_line:
                        continue

                    try:
                        event = json.loads(json_line)
                        event_type = event.get("type", "")

                        if event_type == "assistant":
                            # Claude's thinking/response
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
                            # Final result
                            yield {
                                "type": "result",
                                "content": event.get("result", "")
                            }

                    except json.JSONDecodeError:
                        # Not valid JSON, might be partial
                        pass

            await process.wait()

            # Check if script was generated
            script_path = os.path.join(project_dir, "scripts", f"{idea_id}.json")
            if os.path.exists(script_path):
                with open(script_path, 'r') as f:
                    script_data = json.load(f)

                yield {
                    "type": "complete",
                    "success": True,
                    "idea_id": idea_id,
                    "script_path": script_path,
                    "script": script_data
                }
            else:
                yield {
                    "type": "complete",
                    "success": False,
                    "error": "Script file was not generated",
                    "idea_id": idea_id
                }

        except Exception as e:
            logger.error(f"Script generation failed: {e}")
            yield {
                "type": "error",
                "error": str(e),
                "idea_id": idea_id
            }

    def get_script(self, project_id: str, idea_id: str) -> Optional[Dict]:
        """Get a generated script by ID."""
        project_dir = self._get_project_dir(project_id)
        script_path = os.path.join(project_dir, "scripts", f"{idea_id}.json")

        if os.path.exists(script_path):
            with open(script_path, 'r') as f:
                return json.load(f)
        return None

    def list_scripts(self, project_id: str) -> list:
        """List all scripts for a project."""
        project_dir = self._get_project_dir(project_id)
        scripts_dir = os.path.join(project_dir, "scripts")

        scripts = []
        if os.path.exists(scripts_dir):
            for filename in os.listdir(scripts_dir):
                if filename.endswith('.json'):
                    script_path = os.path.join(scripts_dir, filename)
                    try:
                        with open(script_path, 'r') as f:
                            script = json.load(f)
                        scripts.append({
                            "id": filename.replace('.json', ''),
                            "path": script_path,
                            "title": script.get("title", "Untitled"),
                            "scene_count": len(script.get("scenes", [])),
                            "modified_at": os.path.getmtime(script_path)
                        })
                    except:
                        pass

        return sorted(scripts, key=lambda x: x["modified_at"], reverse=True)


# Singleton instance
script_generator = VideoScriptGenerator()

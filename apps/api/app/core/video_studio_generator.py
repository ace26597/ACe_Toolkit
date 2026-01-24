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
    Two-phase video script generation with context management.

    Features:
    - Context management (images, files, notes, workspace refs)
    - Plan phase: Claude researches and outlines the video
    - Generate phase: Claude creates full script from approved plan
    - Script editing support
    """

    def __init__(self):
        self.base_dir = Path("/data/video-factory/project-data")
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _get_project_dir(self, project_id: str) -> Path:
        """Get or create project data directory."""
        project_dir = self.base_dir / project_id

        # Create subdirectories
        (project_dir / ".claude").mkdir(parents=True, exist_ok=True)
        (project_dir / "context" / "images").mkdir(parents=True, exist_ok=True)
        (project_dir / "context" / "files").mkdir(parents=True, exist_ok=True)
        (project_dir / ".plans").mkdir(parents=True, exist_ok=True)
        (project_dir / "scripts").mkdir(parents=True, exist_ok=True)
        (project_dir / "images" / "uploaded").mkdir(parents=True, exist_ok=True)
        (project_dir / "images" / "generated").mkdir(parents=True, exist_ok=True)
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
        plan_id: str
    ) -> None:
        """Write CLAUDE.md for plan phase."""
        context_section = self._build_context_section(project_dir.name)

        claude_md = f"""# Video Studio - Plan Phase

## Project
- **Name:** {project_name}
- **Niche:** {niche}
- **Plan ID:** {plan_id}

## Video Idea
{idea}

{context_section}

## Your Task: Create a Video Plan

Research the topic and create a detailed video outline. DO NOT generate the full script yet.

### Steps
1. **Research** - Use web search to find:
   - Interesting facts and statistics
   - Current trends or news related to the topic
   - Common questions people have
   - Unique angles or hooks

2. **Plan the Structure** - Create an outline with:
   - Hook concept (what will grab attention in the first 3 seconds)
   - 3-5 main points or scenes
   - Visual ideas for each scene (background type, animations)
   - Call to action

### Output Format
Save your plan as JSON to: `.plans/{plan_id}.json`

```json
{{
  "plan_id": "{plan_id}",
  "idea": "The original idea",
  "research_summary": "Key findings from your research",
  "hook": {{
    "concept": "What the hook will show/say",
    "type": "How it grabs attention (surprise, question, bold claim, etc.)"
  }},
  "scenes": [
    {{
      "order": 1,
      "type": "hook | content | bullet-list | stats | whiteboard | quote | cta",
      "concept": "What this scene covers",
      "visual_idea": "Background type, animation style, any creative elements",
      "duration_estimate": "3-5 seconds"
    }}
  ],
  "cta": {{
    "message": "What the call to action says",
    "style": "How it's presented"
  }},
  "total_duration_estimate": "45-60 seconds",
  "notes": "Any additional notes or alternatives"
}}
```

### Important
- Focus on PLANNING, not scripting
- Include specific facts/stats from your research
- Each scene should have a clear purpose
- Consider visual variety (mix scene types, backgrounds)
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

    # ==================== Plan Phase ====================

    async def generate_plan(
        self,
        project_id: str,
        project_name: str,
        niche: str,
        idea: str,
        plan_id: Optional[str] = None
    ) -> AsyncGenerator[Dict, None]:
        """
        Phase 1: Generate a video plan using Claude Code.

        Claude will research the topic and create a structured outline.
        """
        plan_id = plan_id or f"plan_{uuid.uuid4().hex[:8]}"
        project_dir = self._get_project_dir(project_id)

        # Write CLAUDE.md for plan phase
        self._write_plan_claude_md(project_dir, project_name, niche, idea, plan_id)

        yield {
            "type": "status",
            "message": "Starting plan generation...",
            "plan_id": plan_id
        }

        # Run Claude Code
        cmd = [
            "claude",
            "-p", f"Research and create a video plan for: {idea}",
            "--output-format", "stream-json",
            "--verbose",
            "--permission-mode", "bypassPermissions"
        ]

        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(project_dir)
            )

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
        script_id: Optional[str] = None
    ) -> AsyncGenerator[Dict, None]:
        """
        Phase 2: Generate full script from an approved plan.
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

        # Run Claude Code
        cmd = [
            "claude",
            "-p", "Generate the full EnhancedVideoProps script from the approved plan.",
            "--output-format", "stream-json",
            "--verbose",
            "--permission-mode", "bypassPermissions"
        ]

        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(project_dir)
            )

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

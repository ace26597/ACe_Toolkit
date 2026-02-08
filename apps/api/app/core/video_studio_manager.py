"""
Video Studio Manager - PTY process management for Remotion video generation.
Similar to CCResearch but focused on video creation with full skill access.

Uses a shared Remotion template with symlinked node_modules to avoid
installing dependencies for every new project.

Uses callback-based PTY reading (same as CCResearch) to avoid race conditions.
"""
import os
import json
import asyncio
import logging
import shutil
import signal
from pathlib import Path
from datetime import datetime
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, Callable
import pexpect

from app.core.config import settings

logger = logging.getLogger(__name__)

# Shared template location (uses config for Mac/Pi compatibility)
TEMPLATE_DIR = Path(settings.DATA_BASE_DIR) / "video-studio-template"


@dataclass
class ProcessInfo:
    """Container for PTY process and its read task."""
    process: pexpect.spawn
    read_task: Optional[asyncio.Task] = None
    is_alive: bool = True


class VideoStudioManager:
    """Manages Video Studio projects and Claude Code PTY processes."""

    def __init__(self):
        self.processes: Dict[str, ProcessInfo] = {}
        self.base_dir = Path(settings.DATA_BASE_DIR) / "users"
        self.template_dir = TEMPLATE_DIR

    def get_user_studio_dir(self, user_id: str) -> Path:
        """Get user's video studio base directory."""
        return self.base_dir / user_id / "video-studio"

    def get_project_dir(self, user_id: str, project_name: str) -> Path:
        """Get specific project directory."""
        return self.get_user_studio_dir(user_id) / project_name

    async def ensure_template_exists(self) -> bool:
        """
        Ensure the shared Remotion template exists with node_modules installed.
        This only needs to run once - all projects share this template.
        """
        if (self.template_dir / "node_modules").exists():
            return True

        logger.info("Creating shared Remotion template...")

        # Create template directory
        self.template_dir.mkdir(parents=True, exist_ok=True)

        # Create package.json
        package_json = {
            "name": "remotion-template",
            "version": "1.0.0",
            "private": True,
            "scripts": {
                "studio": "remotion studio",
                "render": "remotion render",
                "build": "remotion bundle"
            },
            "dependencies": {
                "@remotion/cli": "^4.0.0",
                "@remotion/player": "^4.0.0",
                "@remotion/transitions": "^4.0.0",
                "@remotion/media-utils": "^4.0.0",
                "react": "^18.2.0",
                "react-dom": "^18.2.0",
                "remotion": "^4.0.0"
            },
            "devDependencies": {
                "@types/react": "^18.2.0",
                "typescript": "^5.0.0"
            }
        }
        with open(self.template_dir / "package.json", "w") as f:
            json.dump(package_json, f, indent=2)

        # Run npm install
        logger.info("Installing Remotion dependencies (one-time setup)...")
        process = await asyncio.create_subprocess_exec(
            'npm', 'install',
            cwd=str(self.template_dir),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await process.communicate()

        if process.returncode != 0:
            logger.error(f"Failed to install template dependencies: {stderr.decode()}")
            return False

        logger.info("Shared Remotion template created successfully")
        return True

    async def list_projects(self, user_id: str) -> list[dict]:
        """List all video studio projects for a user."""
        studio_dir = self.get_user_studio_dir(user_id)
        if not studio_dir.exists():
            return []

        projects = []
        for item in studio_dir.iterdir():
            if item.is_dir() and (item / ".project.json").exists():
                try:
                    with open(item / ".project.json") as f:
                        meta = json.load(f)

                    # Count videos
                    out_dir = item / "out"
                    video_count = len(list(out_dir.glob("*.mp4"))) if out_dir.exists() else 0

                    # Check if node_modules symlink exists and is valid
                    node_modules = item / "node_modules"
                    npm_ready = node_modules.exists() and (node_modules.is_symlink() or node_modules.is_dir())

                    session_key = f"{user_id}:{item.name}"
                    proc_info = self.processes.get(session_key)
                    has_terminal = proc_info is not None and proc_info.process.isalive()

                    projects.append({
                        "name": item.name,
                        "created_at": meta.get("created_at"),
                        "last_activity": meta.get("last_activity"),
                        "video_count": video_count,
                        "has_terminal": has_terminal,
                        "npm_installed": npm_ready
                    })
                except Exception as e:
                    logger.warning(f"Error reading project {item.name}: {e}")

        # Sort by last activity
        projects.sort(key=lambda x: x.get("last_activity", ""), reverse=True)
        return projects

    async def create_project(self, user_id: str, project_name: str) -> dict:
        """Create a new video studio project with Remotion setup."""
        # Sanitize project name
        safe_name = project_name.replace(" ", "-").lower()
        safe_name = "".join(c for c in safe_name if c.isalnum() or c == "-")

        project_dir = self.get_project_dir(user_id, safe_name)

        if project_dir.exists():
            raise ValueError(f"Project '{safe_name}' already exists")

        # Ensure shared template exists
        template_ready = await self.ensure_template_exists()
        if not template_ready:
            raise ValueError("Failed to setup Remotion template. Please try again.")

        # Create directory structure
        project_dir.mkdir(parents=True, exist_ok=True)
        (project_dir / "public").mkdir(exist_ok=True)
        (project_dir / "out").mkdir(exist_ok=True)
        (project_dir / "src").mkdir(exist_ok=True)
        (project_dir / ".claude").mkdir(exist_ok=True)

        # Create project metadata
        meta = {
            "name": safe_name,
            "display_name": project_name,
            "created_at": datetime.utcnow().isoformat(),
            "last_activity": datetime.utcnow().isoformat(),
            "user_id": user_id
        }
        with open(project_dir / ".project.json", "w") as f:
            json.dump(meta, f, indent=2)

        # Create package.json (copy from template but with project name)
        package_json = {
            "name": safe_name,
            "version": "1.0.0",
            "private": True,
            "scripts": {
                "studio": "remotion studio",
                "render": "remotion render",
                "build": "remotion bundle"
            },
            "dependencies": {
                "@remotion/cli": "^4.0.0",
                "@remotion/player": "^4.0.0",
                "@remotion/transitions": "^4.0.0",
                "@remotion/media-utils": "^4.0.0",
                "react": "^18.2.0",
                "react-dom": "^18.2.0",
                "remotion": "^4.0.0"
            },
            "devDependencies": {
                "@types/react": "^18.2.0",
                "typescript": "^5.0.0"
            }
        }
        with open(project_dir / "package.json", "w") as f:
            json.dump(package_json, f, indent=2)

        # Symlink node_modules from shared template
        node_modules_link = project_dir / "node_modules"
        template_node_modules = self.template_dir / "node_modules"
        if template_node_modules.exists():
            os.symlink(template_node_modules, node_modules_link)
            logger.info(f"Symlinked node_modules for {safe_name}")

        # Create minimal Remotion config
        remotion_config = '''import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
'''
        with open(project_dir / "remotion.config.ts", "w") as f:
            f.write(remotion_config)

        # Create basic src files
        index_ts = '''import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
'''
        with open(project_dir / "src" / "index.ts", "w") as f:
            f.write(index_ts)

        root_tsx = '''import React from "react";
import { Composition } from "remotion";
import { VideoComposition } from "./Video";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Video"
        component={VideoComposition}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
    </>
  );
};
'''
        with open(project_dir / "src" / "Root.tsx", "w") as f:
            f.write(root_tsx)

        video_tsx = '''import React from "react";
import { AbsoluteFill } from "remotion";

export const VideoComposition: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#1a1a2e" }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        color: "white",
        fontSize: 48,
        fontFamily: "sans-serif"
      }}>
        Video will be generated here
      </div>
    </AbsoluteFill>
  );
};
'''
        with open(project_dir / "src" / "Video.tsx", "w") as f:
            f.write(video_tsx)

        # Create tsconfig.json
        tsconfig = {
            "compilerOptions": {
                "target": "ES2020",
                "module": "ESNext",
                "moduleResolution": "node",
                "jsx": "react-jsx",
                "strict": True,
                "esModuleInterop": True,
                "skipLibCheck": True,
                "forceConsistentCasingInFileNames": True
            },
            "include": ["src/**/*"]
        }
        with open(project_dir / "tsconfig.json", "w") as f:
            json.dump(tsconfig, f, indent=2)

        # Create comprehensive CLAUDE.md for agent-driven video production
        claude_md = f'''# Video Studio - {project_name}

## Mission
Create an entertaining, polished video based on the user's idea. You have full access to research tools, image generation, audio generation, and the Remotion video framework. Use agents to parallelize work and deliver high-quality results.

## Project Layout
```
{project_dir}/
├── src/           # Video components (Video.tsx, Root.tsx, index.ts)
├── public/        # Assets: images, audio, fonts (reference as /filename.ext)
├── out/           # Rendered MP4 videos
└── .claude/       # This config
```

## Production Workflow

Follow these phases in order. Use the Task tool to spawn parallel agents where noted.

### Phase 1: Research & Script (use agents in parallel)

**Agent 1 - Researcher:**
- Use WebSearch/WebFetch for facts, statistics, quotes, trends
- Find compelling angles, recent data, surprising insights
- Identify 3-5 key points that make the topic interesting

**Agent 2 - Script Writer:**
- Write a narration script (voiceover text) timed to scenes
- Each scene needs: narration text, duration (seconds), visual description
- Target 30-90 seconds total (900-2700 frames at 30fps)
- Structure: Hook (3-5s) → Content scenes → CTA/Outro
- Make it entertaining: use humor, surprise, rhetorical questions, storytelling

**Output a script document** in `public/script.json`:
```json
{{
  "title": "Video Title",
  "total_duration_seconds": 60,
  "scenes": [
    {{
      "id": "scene-1",
      "narration": "Text spoken in this scene",
      "duration_seconds": 5,
      "visual": "Description of what viewer sees",
      "image_prompt": "Prompt for image generation if needed"
    }}
  ]
}}
```

### Phase 2: Asset Generation (use agents in parallel)

**Agent 3 - Audio Producer:**
- Generate voiceover audio from the script narration text
- Use available TTS: search HuggingFace Spaces for text-to-speech endpoints
  - `mcp__hf-image__search-spaces` with query "text to speech"
  - Popular options: Kokoro TTS, Edge TTS, F5-TTS
- Save audio files to `public/` (e.g., `public/voiceover.mp3`)
- If TTS unavailable, use `@remotion/captions` with text overlays instead
- For background music: search for royalty-free sources or generate with music spaces

**Agent 4 - Image Producer:**
- Generate or download images for each scene that needs visuals
- Image generation tools available:
  - `mcp__hf-image__FLUX_1-schnell-infer` - Fast image gen (prompt, width, height)
  - `mcp__hugging-face__gr1_z_image_turbo_generate` - High quality (32 resolutions)
  - `mcp__cloudflare__ai_image_generation` - Cloudflare Workers AI
- Download from web: use WebFetch to download images from URLs
- Save ALL images to `public/` directory
- Use 1080x1920 (9:16 portrait) for full backgrounds, 1080x1080 for insets
- Optimize: relevant, high-contrast, readable with text overlay

### Phase 3: Build Video Composition

**Read Remotion skills first:**
- Run `/remotion-best-practices` for comprehensive Remotion patterns
- Key rules to read: animations, audio, compositions, sequencing, transitions, timing, images, fonts, text-animations

**Build `src/Video.tsx`:**
- Import all assets from `public/` using `staticFile()`
- Use `<Audio>` from `@remotion/media` for voiceover and music
- Use `<Img>` from `remotion` for images
- Use `<Sequence>` for scene timing - each scene starts after the previous ends
- Use `@remotion/transitions` (`<TransitionSeries>`) for smooth scene changes

**Audio-Video Sync (CRITICAL):**
- Each `<Sequence>` must match the narration timing from the script
- Use `getAudioDurationInSeconds()` from `@remotion/media` to get exact audio duration
- Calculate frames: `duration_seconds * fps` for each scene
- If using per-scene audio files, verify each file's duration matches the scene
- Add `trimBefore`/`trimAfter` on `<Audio>` if needed to align
- Test sync by rendering a preview: `npx remotion render src/index.ts Video out/preview.mp4 --frames=0-150`

**Text & Captions:**
- Add animated text overlays for key points (even with voiceover)
- Use `interpolate()` for fade-in/out, slide animations
- Use `spring()` for bouncy, engaging text reveals
- Add emphasis styling (larger font, accent color) for key words
- Consider TikTok-style word-by-word captions with `@remotion/captions`

**Visual Quality:**
- Never use plain solid backgrounds - use gradients, images, or patterns
- Layer elements: background → image/video → overlay → text → particles
- Use `interpolate()` with `Easing` for smooth zoom/pan on images
- Add subtle motion to static images (slow zoom, parallax)
- Color palette: pick 2-3 colors, use consistently across scenes

### Phase 4: Render & Verify

**Render the video:**
```bash
npx remotion render src/index.ts Video out/video.mp4
```

**Render options:**
```bash
# Quick preview (first 5 seconds)
npx remotion render src/index.ts Video out/preview.mp4 --frames=0-150

# Full render with custom quality
npx remotion render src/index.ts Video out/video.mp4 --codec=h264 --crf=18

# Specific resolution
npx remotion render src/index.ts Video out/video.mp4 --width=1080 --height=1920
```

**Verification checklist:**
- [ ] Audio and video are in sync (narration matches visuals)
- [ ] No silent gaps or audio overlaps between scenes
- [ ] All images load correctly (no broken references)
- [ ] Text is readable against backgrounds
- [ ] Transitions are smooth between scenes
- [ ] Total duration matches script target
- [ ] Video renders without errors

**If sync is off:** Adjust `<Sequence from={{...}}>` values and re-render.

## Available Tools & Skills

| Category | Tools |
|----------|-------|
| **Research** | WebSearch, WebFetch, mcp__fetch__fetch |
| **Image Gen** | mcp__hf-image__FLUX_1-schnell-infer, mcp__hugging-face__gr1_z_image_turbo_generate, mcp__cloudflare__ai_image_generation |
| **Audio/TTS** | Search HuggingFace Spaces: mcp__hf-image__search-spaces (query: "text to speech") |
| **Discovery** | mcp__hugging-face__space_search (find any ML endpoint) |
| **Remotion** | /remotion-best-practices skill (31 rule files covering all Remotion features) |
| **Downloads** | WebFetch for images/audio from URLs, Bash for curl/wget |

## Key Remotion Patterns

**Scene with image + text + audio:**
```tsx
import {{ AbsoluteFill, Sequence, Img, staticFile, interpolate, useCurrentFrame }} from "remotion";
import {{ Audio }} from "@remotion/media";

const Scene = ({{ text, image, startFrame }}) => {{
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20], [0, 1], {{ extrapolateRight: "clamp" }});
  return (
    <AbsoluteFill>
      <Img src={{staticFile(image)}} style={{{{ width: "100%", height: "100%" }}}} />
      <div style={{{{ position: "absolute", bottom: 100, padding: 40, opacity }}}}>
        <h1 style={{{{ color: "white", fontSize: 48 }}}}>{text}</h1>
      </div>
    </AbsoluteFill>
  );
}};
```

**Composition with audio:**
```tsx
<Composition
  id="Video"
  component={{VideoComposition}}
  durationInFrames={{totalFrames}}
  fps={{30}}
  width={{1080}}
  height={{1920}}
/>
```

## Entertainment Guidelines

- **Hook viewers in 3 seconds** - Start with something unexpected, a bold claim, or a question
- **Use visual variety** - Never show the same layout twice in a row
- **Add motion to everything** - Static = boring. Animate text, zoom images, use transitions
- **Pace it fast** - Short scenes (3-8 seconds), quick cuts, high information density
- **Use contrast** - Big text on dark backgrounds, bright accents, visual hierarchy
- **End with impact** - Strong CTA, memorable closing shot, or callback to the hook
- **Sound matters** - Good voiceover > fancy visuals. Music sets the mood.

## Current Directory
{project_dir}
'''
        with open(project_dir / ".claude" / "CLAUDE.md", "w") as f:
            f.write(claude_md)

        # Create .claude/settings.local.json for permissions
        settings = {
            "permissions": {
                "allow": ["*"],
                "deny": []
            }
        }
        with open(project_dir / ".claude" / "settings.local.json", "w") as f:
            json.dump(settings, f, indent=2)

        logger.info(f"Created video studio project: {safe_name} for user {user_id}")

        return {
            "name": safe_name,
            "display_name": project_name,
            "path": str(project_dir),
            "created_at": meta["created_at"],
            "npm_installed": True  # Already linked
        }

    async def delete_project(self, user_id: str, project_name: str) -> bool:
        """Delete a video studio project."""
        project_dir = self.get_project_dir(user_id, project_name)

        if not project_dir.exists():
            return False

        # Terminate any running process
        await self.terminate_session(user_id, project_name)

        # Delete directory (symlinks are removed, not followed)
        shutil.rmtree(project_dir)
        logger.info(f"Deleted video studio project: {project_name}")
        return True

    async def get_project(self, user_id: str, project_name: str) -> Optional[dict]:
        """Get project details."""
        project_dir = self.get_project_dir(user_id, project_name)

        if not project_dir.exists():
            return None

        try:
            with open(project_dir / ".project.json") as f:
                meta = json.load(f)

            # Get videos
            out_dir = project_dir / "out"
            videos = []
            if out_dir.exists():
                for vid in out_dir.glob("*.mp4"):
                    stat = vid.stat()
                    videos.append({
                        "filename": vid.name,
                        "size": stat.st_size,
                        "created_at": stat.st_mtime
                    })
                videos.sort(key=lambda x: x["created_at"], reverse=True)

            # Check node_modules
            node_modules = project_dir / "node_modules"
            npm_installed = node_modules.exists() and (node_modules.is_symlink() or node_modules.is_dir())

            # Check terminal status
            session_key = f"{user_id}:{project_name}"
            proc_info = self.processes.get(session_key)
            has_terminal = proc_info is not None and proc_info.process.isalive()

            return {
                **meta,
                "path": str(project_dir),
                "videos": videos,
                "has_terminal": has_terminal,
                "npm_installed": npm_installed
            }
        except Exception as e:
            logger.error(f"Error getting project {project_name}: {e}")
            return None

    async def start_session(
        self,
        user_id: str,
        project_name: str,
        rows: int = 24,
        cols: int = 80,
        output_callback: Optional[Callable[[bytes], Any]] = None
    ) -> str:
        """
        Start a Claude Code session - user types their request directly.

        Args:
            user_id: User ID
            project_name: Project name
            rows: Terminal height
            cols: Terminal width
            output_callback: Async callback to receive PTY output bytes

        Returns:
            Session key
        """
        project_dir = self.get_project_dir(user_id, project_name)

        if not project_dir.exists():
            raise ValueError(f"Project '{project_name}' not found")

        session_key = f"{user_id}:{project_name}"

        # Check if process already exists and is alive
        if session_key in self.processes:
            proc_info = self.processes[session_key]
            if proc_info.process.isalive():
                logger.info(f"Session {session_key} already running, reconnecting callback")
                # Cancel old read task
                if proc_info.read_task:
                    proc_info.read_task.cancel()
                    try:
                        await proc_info.read_task
                    except asyncio.CancelledError:
                        pass

                # Start new read task with new callback
                if output_callback:
                    proc_info.read_task = asyncio.create_task(
                        self._async_read_loop(session_key, output_callback)
                    )
                return session_key
            else:
                # Process died, clean up
                del self.processes[session_key]

        # Ensure node_modules symlink exists
        node_modules = project_dir / "node_modules"
        if not node_modules.exists():
            template_node_modules = self.template_dir / "node_modules"
            if template_node_modules.exists():
                os.symlink(template_node_modules, node_modules)

        # Update last activity
        meta_file = project_dir / ".project.json"
        if meta_file.exists():
            with open(meta_file) as f:
                meta = json.load(f)
            meta["last_activity"] = datetime.utcnow().isoformat()
            with open(meta_file, "w") as f:
                json.dump(meta, f, indent=2)

        # Set up environment
        env = os.environ.copy()
        env['TERM'] = 'xterm-256color'
        env['COLORTERM'] = 'truecolor'
        env['FORCE_COLOR'] = '1'
        env['HOME'] = str(Path.home())
        env['PWD'] = str(project_dir)
        env['NODE_PATH'] = '/usr/lib/node_modules'

        # Inject API keys from centralized config
        from app.core.config import settings
        if settings.OPENAI_API_KEY:
            env['OPENAI_API_KEY'] = settings.OPENAI_API_KEY
        if settings.TAVILY_API_KEY:
            env['TAVILY_API_KEY'] = settings.TAVILY_API_KEY

        # Find claude binary - check common locations (macOS and Linux)
        import shutil
        claude_bin = shutil.which('claude')
        if not claude_bin:
            home = str(Path.home())
            search_paths = [
                f'{home}/.local/bin/claude',           # User install (both OS)
                '/opt/homebrew/bin/claude',            # Homebrew (macOS ARM)
                '/usr/local/bin/claude',               # Homebrew (macOS Intel) / Linux
                '/usr/bin/claude',                     # System (Linux)
            ]
            for path in search_paths:
                if os.path.isfile(path) and os.access(path, os.X_OK):
                    claude_bin = path
                    break
        if not claude_bin:
            raise ValueError("claude CLI not found")

        logger.info(f"Starting Claude session for {project_name}")

        # Spawn Claude directly (like ccresearch) with encoding=None for bytes
        process = pexpect.spawn(
            claude_bin,
            args=['--dangerously-skip-permissions'],
            cwd=str(project_dir),
            dimensions=(rows, cols),
            env=env,
            encoding=None,  # Return bytes, not strings
            timeout=None
        )

        # Wait a moment for process to initialize
        await asyncio.sleep(0.1)

        logger.info(f"Process spawned for {session_key}: pid={process.pid}, alive={process.isalive()}")

        # Create process info
        proc_info = ProcessInfo(process=process)
        self.processes[session_key] = proc_info

        # Start read loop if callback provided
        if output_callback:
            proc_info.read_task = asyncio.create_task(
                self._async_read_loop(session_key, output_callback)
            )
            logger.info(f"Started read loop for {session_key}")

        return session_key

    def _read_nonblocking(self, process: pexpect.spawn) -> bytes:
        """Blocking read helper to run in thread."""
        try:
            return process.read_nonblocking(size=4096, timeout=0.1)
        except pexpect.TIMEOUT:
            return b""
        except pexpect.EOF:
            return b""
        except Exception as e:
            logger.debug(f"Read error: {e}")
            return b""

    async def _async_read_loop(
        self,
        session_key: str,
        callback: Callable[[bytes], Any]
    ):
        """
        Async loop reading from pexpect process and calling callback with output.
        Callback may return False to signal the loop should stop.
        """
        proc_info = self.processes.get(session_key)
        if not proc_info:
            logger.error(f"No process info for {session_key}")
            return

        process = proc_info.process
        callback_failed = False
        read_count = 0

        logger.info(f"Read loop starting for {session_key}, process alive: {process.isalive()}, pid: {process.pid}")

        while proc_info.is_alive and not callback_failed:
            try:
                if process.isalive():
                    # Use asyncio.to_thread for blocking read
                    data = await asyncio.to_thread(
                        self._read_nonblocking,
                        process
                    )
                    if data:
                        read_count += 1
                        logger.debug(f"Read {len(data)} bytes from {session_key} (read #{read_count})")
                        # Call callback (might be async)
                        try:
                            result = callback(data)
                            if asyncio.iscoroutine(result):
                                result = await result
                            # If callback returns False, stop the loop
                            if result is False:
                                logger.info(f"Callback signaled stop for {session_key}")
                                callback_failed = True
                                break
                        except Exception as cb_error:
                            logger.error(f"Callback error for {session_key}: {cb_error}")
                            callback_failed = True
                            break
                else:
                    # Process ended
                    logger.info(f"Process ended for {session_key}, total reads: {read_count}")
                    proc_info.is_alive = False
                    break

                await asyncio.sleep(0.02)

            except asyncio.CancelledError:
                logger.info(f"Read loop cancelled for {session_key}")
                break
            except Exception as e:
                logger.error(f"Read loop error for {session_key}: {e}")
                import traceback
                logger.error(traceback.format_exc())
                break

        logger.info(f"Read loop exited for {session_key}, total reads: {read_count}")

    async def terminate_session(self, user_id: str, project_name: str) -> bool:
        """Terminate a running Claude session."""
        session_key = f"{user_id}:{project_name}"

        if session_key not in self.processes:
            return False

        proc_info = self.processes[session_key]
        proc_info.is_alive = False  # Signal read loop to stop

        # Cancel read task
        if proc_info.read_task:
            proc_info.read_task.cancel()
            try:
                await proc_info.read_task
            except asyncio.CancelledError:
                pass

        process = proc_info.process
        try:
            if process.isalive():
                # Send SIGTERM
                os.kill(process.pid, signal.SIGTERM)
                await asyncio.sleep(0.5)

                # Force kill if still alive
                if process.isalive():
                    os.kill(process.pid, signal.SIGKILL)

            process.close()
        except Exception as e:
            logger.warning(f"Error terminating session {session_key}: {e}")

        del self.processes[session_key]
        logger.info(f"Terminated session: {session_key}")
        return True

    def get_process(self, user_id: str, project_name: str) -> Optional[pexpect.spawn]:
        """Get the PTY process for a session."""
        session_key = f"{user_id}:{project_name}"
        proc_info = self.processes.get(session_key)
        return proc_info.process if proc_info else None

    def get_process_info(self, user_id: str, project_name: str) -> Optional[ProcessInfo]:
        """Get the ProcessInfo for a session."""
        session_key = f"{user_id}:{project_name}"
        return self.processes.get(session_key)

    def resize_terminal(self, user_id: str, project_name: str, rows: int, cols: int):
        """Resize the terminal."""
        process = self.get_process(user_id, project_name)
        if process and process.isalive():
            process.setwinsize(rows, cols)

    async def write_input(self, user_id: str, project_name: str, data: bytes):
        """Write data to the PTY stdin."""
        process = self.get_process(user_id, project_name)
        if process and process.isalive():
            process.send(data)

    async def list_videos(self, user_id: str, project_name: str) -> list[dict]:
        """List all rendered videos in a project."""
        project_dir = self.get_project_dir(user_id, project_name)
        out_dir = project_dir / "out"

        if not out_dir.exists():
            return []

        videos = []
        for vid in out_dir.glob("*.mp4"):
            stat = vid.stat()
            videos.append({
                "filename": vid.name,
                "path": str(vid),
                "size": stat.st_size,
                "created_at": stat.st_mtime,
                "url": f"/video-studio/projects/{project_name}/videos/{vid.name}"
            })

        videos.sort(key=lambda x: x["created_at"], reverse=True)
        return videos

    async def install_dependencies(self, user_id: str, project_name: str) -> bool:
        """
        Ensure dependencies are available for a project.
        With the shared template approach, this just ensures the symlink exists.
        """
        project_dir = self.get_project_dir(user_id, project_name)

        if not project_dir.exists():
            return False

        # Ensure template exists
        template_ready = await self.ensure_template_exists()
        if not template_ready:
            return False

        # Create symlink if missing
        node_modules = project_dir / "node_modules"
        if not node_modules.exists():
            template_node_modules = self.template_dir / "node_modules"
            if template_node_modules.exists():
                os.symlink(template_node_modules, node_modules)
                logger.info(f"Symlinked node_modules for {project_name}")

        return True

    async def shutdown(self):
        """Shutdown all processes."""
        for session_key in list(self.processes.keys()):
            user_id, project_name = session_key.split(":", 1)
            await self.terminate_session(user_id, project_name)


# Singleton instance
video_studio_manager = VideoStudioManager()

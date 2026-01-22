"""
Shorts Content Factory Manager

AI-powered short-form content generator for:
- YouTube Shorts
- TikTok
- Instagram Reels

Uses Claude Code for FREE script generation.
No expensive video generation APIs needed.
"""

import os
import json
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field, asdict
from enum import Enum
import uuid
import logging

logger = logging.getLogger(__name__)

# Storage paths
CONTENT_FACTORY_BASE = Path("/data/video-factory")
PROJECTS_DIR = CONTENT_FACTORY_BASE / "projects"
WHITELIST_PATH = Path.home() / ".ccresearch_allowed_emails.json"


class ContentStatus(str, Enum):
    DRAFT = "draft"
    SCRIPT_READY = "script_ready"
    RECORDED = "recorded"
    POSTED_PARTIAL = "posted_partial"  # Posted to some platforms
    POSTED_ALL = "posted_all"  # Posted to all platforms


class Platform(str, Enum):
    YOUTUBE_SHORTS = "youtube_shorts"
    TIKTOK = "tiktok"
    INSTAGRAM_REELS = "instagram_reels"


@dataclass
class PostStatus:
    platform: str
    posted: bool = False
    posted_at: Optional[str] = None
    url: Optional[str] = None
    views: int = 0
    likes: int = 0
    comments: int = 0


@dataclass
class ContentIdea:
    id: str
    title: str
    topic: str
    hook: str  # First 3 seconds - most important
    script: str  # Full 60-sec script
    cta: str  # Call to action
    hashtags: List[str] = field(default_factory=list)
    status: ContentStatus = ContentStatus.DRAFT
    platforms: List[PostStatus] = field(default_factory=list)
    notes: str = ""  # User notes
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> Dict:
        data = asdict(self)
        return data

    @classmethod
    def from_dict(cls, data: Dict) -> 'ContentIdea':
        platforms_data = data.pop('platforms', [])
        idea = cls(**{k: v for k, v in data.items() if k != 'platforms'})
        idea.platforms = [
            PostStatus(**p) if isinstance(p, dict) else p
            for p in platforms_data
        ]
        return idea


@dataclass
class ContentProject:
    id: str
    email: str
    name: str
    niche: str  # e.g., "AI Tools", "Tech News", "Finance"
    ideas: List[ContentIdea] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> Dict:
        data = asdict(self)
        data['ideas'] = [i.to_dict() if isinstance(i, ContentIdea) else i for i in self.ideas]
        return data

    @classmethod
    def from_dict(cls, data: Dict) -> 'ContentProject':
        ideas_data = data.pop('ideas', [])
        project = cls(**{k: v for k, v in data.items() if k != 'ideas'})
        project.ideas = [
            ContentIdea.from_dict(i) if isinstance(i, dict) else i
            for i in ideas_data
        ]
        return project


class ContentFactoryManager:
    def __init__(self):
        self.projects: Dict[str, ContentProject] = {}
        self._ensure_directories()
        self._load_projects()

    def _ensure_directories(self):
        """Create necessary directories."""
        PROJECTS_DIR.mkdir(parents=True, exist_ok=True)

    def _load_projects(self):
        """Load existing projects from disk."""
        if not PROJECTS_DIR.exists():
            return

        for project_file in PROJECTS_DIR.glob("*.json"):
            try:
                with open(project_file) as f:
                    data = json.load(f)
                    project = ContentProject.from_dict(data)
                    self.projects[project.id] = project
            except Exception as e:
                logger.error(f"Failed to load project {project_file}: {e}")

    def _save_project(self, project: ContentProject):
        """Save project to disk."""
        project.updated_at = datetime.now().isoformat()
        project_file = PROJECTS_DIR / f"{project.id}.json"

        with open(project_file, "w") as f:
            json.dump(project.to_dict(), f, indent=2)

    def check_email_allowed(self, email: str) -> bool:
        """Check if email is in the whitelist."""
        try:
            with open(WHITELIST_PATH) as f:
                config = json.load(f)
                return email.lower() in [e.lower() for e in config.get("allowed_emails", [])]
        except Exception:
            return False

    def get_allowed_emails(self) -> List[str]:
        """Get list of allowed emails."""
        try:
            with open(WHITELIST_PATH) as f:
                config = json.load(f)
                return config.get("allowed_emails", [])
        except Exception:
            return []

    # ==================== Project Management ====================

    def create_project(self, email: str, name: str, niche: str) -> ContentProject:
        """Create a new content project."""
        if not self.check_email_allowed(email):
            raise PermissionError(f"Email {email} is not authorized")

        project_id = f"cf_{uuid.uuid4().hex[:12]}"
        project = ContentProject(
            id=project_id,
            email=email,
            name=name,
            niche=niche
        )

        self.projects[project_id] = project
        self._save_project(project)

        return project

    def get_project(self, project_id: str) -> Optional[ContentProject]:
        """Get a project by ID."""
        return self.projects.get(project_id)

    def list_projects(self, email: Optional[str] = None) -> List[ContentProject]:
        """List all projects, optionally filtered by email."""
        projects = list(self.projects.values())
        if email:
            projects = [p for p in projects if p.email.lower() == email.lower()]
        return sorted(projects, key=lambda p: p.updated_at, reverse=True)

    def delete_project(self, project_id: str) -> bool:
        """Delete a project."""
        if project_id not in self.projects:
            return False

        project_file = PROJECTS_DIR / f"{project_id}.json"
        if project_file.exists():
            project_file.unlink()

        del self.projects[project_id]
        return True

    # ==================== Content Generation ====================

    async def generate_content_ideas(
        self,
        project_id: str,
        topic: str,
        count: int = 5
    ) -> List[ContentIdea]:
        """Generate multiple content ideas for a topic using Claude Code."""
        project = self.get_project(project_id)
        if not project:
            raise ValueError(f"Project {project_id} not found")

        prompt = f"""Generate {count} viral short-form video ideas for the niche "{project.niche}" about: {topic}

For EACH idea, provide a JSON object with:
- title: Catchy title (max 60 chars)
- hook: First 3 seconds hook that stops scrolling (CRITICAL - make it provocative/surprising)
- script: Full 60-second script with timing markers [0-3s], [3-15s], [15-45s], [45-60s]
- cta: Call to action for end
- hashtags: 5-8 relevant hashtags

Return ONLY a JSON array of {count} objects. No markdown, no explanation.

Example hook styles that work:
- "Stop scrolling if you..."
- "Nobody is talking about this..."
- "I can't believe [X] just happened..."
- "This changed everything for me..."
- "POV: You just discovered..."

Make the hooks SPECIFIC to the topic, not generic."""

        try:
            result = subprocess.run(
                [
                    "claude",
                    "-p", prompt,
                    "--output-format", "text",
                    "--max-turns", "1"
                ],
                capture_output=True,
                text=True,
                timeout=120,
                cwd=str(PROJECTS_DIR)
            )

            output = result.stdout.strip()

            # Extract JSON array
            json_start = output.find('[')
            json_end = output.rfind(']') + 1

            if json_start >= 0 and json_end > json_start:
                json_str = output[json_start:json_end]
                ideas_data = json.loads(json_str)

                new_ideas = []
                for idea_data in ideas_data:
                    idea = ContentIdea(
                        id=f"idea_{uuid.uuid4().hex[:8]}",
                        title=idea_data.get('title', 'Untitled'),
                        topic=topic,
                        hook=idea_data.get('hook', ''),
                        script=idea_data.get('script', ''),
                        cta=idea_data.get('cta', ''),
                        hashtags=idea_data.get('hashtags', []),
                        status=ContentStatus.SCRIPT_READY,
                        platforms=[
                            PostStatus(platform=Platform.YOUTUBE_SHORTS.value),
                            PostStatus(platform=Platform.TIKTOK.value),
                            PostStatus(platform=Platform.INSTAGRAM_REELS.value),
                        ]
                    )
                    new_ideas.append(idea)
                    project.ideas.append(idea)

                self._save_project(project)
                return new_ideas
            else:
                raise ValueError("Could not extract JSON from Claude response")

        except subprocess.TimeoutExpired:
            raise TimeoutError("Content generation timed out")
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in response: {e}")

    async def generate_single_script(
        self,
        project_id: str,
        topic: str,
        style: str = "educational"
    ) -> ContentIdea:
        """Generate a single detailed script."""
        project = self.get_project(project_id)
        if not project:
            raise ValueError(f"Project {project_id} not found")

        styles = {
            "educational": "Teach something valuable in 60 seconds. Use 'Here's how...' or 'Did you know...'",
            "storytime": "Tell a compelling mini-story with a twist or lesson",
            "controversial": "Take a bold stance that sparks debate (but nothing offensive)",
            "tutorial": "Quick how-to with clear steps",
            "reaction": "React to news/trend with hot take",
            "listicle": "3-5 quick tips or facts"
        }

        style_guide = styles.get(style, styles["educational"])

        prompt = f"""Create ONE viral short-form video script for niche "{project.niche}" about: {topic}

Style: {style_guide}

Structure your response as JSON:
{{
  "title": "Catchy title under 60 characters",
  "hook": "First 3 seconds - MUST stop the scroll. Be specific, surprising, or provocative.",
  "script": "Full script with timing:
    [0-3s] Hook (say this exactly)
    [3-15s] Setup/Context
    [15-45s] Main content/value
    [45-55s] Conclusion
    [55-60s] CTA",
  "cta": "Specific call to action",
  "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "recording_tips": "Brief tips for recording this specific video"
}}

Return ONLY valid JSON. No markdown code blocks."""

        try:
            result = subprocess.run(
                [
                    "claude",
                    "-p", prompt,
                    "--output-format", "text",
                    "--max-turns", "1"
                ],
                capture_output=True,
                text=True,
                timeout=90,
                cwd=str(PROJECTS_DIR)
            )

            output = result.stdout.strip()

            json_start = output.find('{')
            json_end = output.rfind('}') + 1

            if json_start >= 0 and json_end > json_start:
                json_str = output[json_start:json_end]
                idea_data = json.loads(json_str)

                idea = ContentIdea(
                    id=f"idea_{uuid.uuid4().hex[:8]}",
                    title=idea_data.get('title', 'Untitled'),
                    topic=topic,
                    hook=idea_data.get('hook', ''),
                    script=idea_data.get('script', ''),
                    cta=idea_data.get('cta', ''),
                    hashtags=idea_data.get('hashtags', []),
                    notes=idea_data.get('recording_tips', ''),
                    status=ContentStatus.SCRIPT_READY,
                    platforms=[
                        PostStatus(platform=Platform.YOUTUBE_SHORTS.value),
                        PostStatus(platform=Platform.TIKTOK.value),
                        PostStatus(platform=Platform.INSTAGRAM_REELS.value),
                    ]
                )

                project.ideas.append(idea)
                self._save_project(project)
                return idea
            else:
                raise ValueError("Could not extract JSON from Claude response")

        except subprocess.TimeoutExpired:
            raise TimeoutError("Script generation timed out")
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in response: {e}")

    async def improve_hook(self, project_id: str, idea_id: str) -> str:
        """Generate alternative hooks for an idea."""
        project = self.get_project(project_id)
        if not project:
            raise ValueError(f"Project {project_id} not found")

        idea = next((i for i in project.ideas if i.id == idea_id), None)
        if not idea:
            raise ValueError(f"Idea {idea_id} not found")

        prompt = f"""The current hook for this video is: "{idea.hook}"

Topic: {idea.topic}
Script preview: {idea.script[:200]}...

Generate 5 BETTER alternative hooks. Each must:
- Be under 10 words
- Create instant curiosity or FOMO
- Be specific (not generic clickbait)
- Work for TikTok/Shorts/Reels

Return as JSON array of strings only:
["hook1", "hook2", "hook3", "hook4", "hook5"]"""

        try:
            result = subprocess.run(
                [
                    "claude",
                    "-p", prompt,
                    "--output-format", "text",
                    "--max-turns", "1"
                ],
                capture_output=True,
                text=True,
                timeout=60,
                cwd=str(PROJECTS_DIR)
            )

            output = result.stdout.strip()
            json_start = output.find('[')
            json_end = output.rfind(']') + 1

            if json_start >= 0 and json_end > json_start:
                return output[json_start:json_end]
            return "[]"

        except Exception:
            return "[]"

    # ==================== Content Management ====================

    def update_idea(
        self,
        project_id: str,
        idea_id: str,
        updates: Dict[str, Any]
    ) -> Optional[ContentIdea]:
        """Update a content idea."""
        project = self.get_project(project_id)
        if not project:
            return None

        idea = next((i for i in project.ideas if i.id == idea_id), None)
        if not idea:
            return None

        for key, value in updates.items():
            if hasattr(idea, key):
                setattr(idea, key, value)

        idea.updated_at = datetime.now().isoformat()
        self._save_project(project)
        return idea

    def mark_posted(
        self,
        project_id: str,
        idea_id: str,
        platform: str,
        url: Optional[str] = None
    ) -> bool:
        """Mark content as posted to a platform."""
        project = self.get_project(project_id)
        if not project:
            return False

        idea = next((i for i in project.ideas if i.id == idea_id), None)
        if not idea:
            return False

        # Update platform status
        for p in idea.platforms:
            if p.platform == platform:
                p.posted = True
                p.posted_at = datetime.now().isoformat()
                p.url = url
                break

        # Update overall status
        posted_count = sum(1 for p in idea.platforms if p.posted)
        if posted_count == len(idea.platforms):
            idea.status = ContentStatus.POSTED_ALL
        elif posted_count > 0:
            idea.status = ContentStatus.POSTED_PARTIAL

        self._save_project(project)
        return True

    def update_metrics(
        self,
        project_id: str,
        idea_id: str,
        platform: str,
        views: int = 0,
        likes: int = 0,
        comments: int = 0
    ) -> bool:
        """Update metrics for a posted video."""
        project = self.get_project(project_id)
        if not project:
            return False

        idea = next((i for i in project.ideas if i.id == idea_id), None)
        if not idea:
            return False

        for p in idea.platforms:
            if p.platform == platform:
                p.views = views
                p.likes = likes
                p.comments = comments
                break

        self._save_project(project)
        return True

    def delete_idea(self, project_id: str, idea_id: str) -> bool:
        """Delete a content idea."""
        project = self.get_project(project_id)
        if not project:
            return False

        project.ideas = [i for i in project.ideas if i.id != idea_id]
        self._save_project(project)
        return True

    def get_stats(self, project_id: str) -> Dict[str, Any]:
        """Get project statistics."""
        project = self.get_project(project_id)
        if not project:
            return {}

        total_ideas = len(project.ideas)
        posted_all = sum(1 for i in project.ideas if i.status == ContentStatus.POSTED_ALL)
        posted_partial = sum(1 for i in project.ideas if i.status == ContentStatus.POSTED_PARTIAL)
        drafts = sum(1 for i in project.ideas if i.status in [ContentStatus.DRAFT, ContentStatus.SCRIPT_READY])

        total_views = 0
        total_likes = 0
        platform_stats = {}

        for idea in project.ideas:
            for p in idea.platforms:
                total_views += p.views
                total_likes += p.likes
                if p.platform not in platform_stats:
                    platform_stats[p.platform] = {"posted": 0, "views": 0, "likes": 0}
                if p.posted:
                    platform_stats[p.platform]["posted"] += 1
                platform_stats[p.platform]["views"] += p.views
                platform_stats[p.platform]["likes"] += p.likes

        return {
            "total_ideas": total_ideas,
            "posted_all_platforms": posted_all,
            "posted_some_platforms": posted_partial,
            "drafts": drafts,
            "total_views": total_views,
            "total_likes": total_likes,
            "platform_breakdown": platform_stats
        }


# Global instance
video_factory = ContentFactoryManager()

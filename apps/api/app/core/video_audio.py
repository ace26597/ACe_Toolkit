"""
Video Factory Audio Module

Provides voiceover generation and transcription capabilities.
Pi-compatible: Uses cloud APIs (OpenAI TTS, Whisper API).
"""

import asyncio
import os
from pathlib import Path
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import httpx
from app.core.config import settings


# Audio storage paths
AUDIO_DIR = Path("/data/video-factory/audio")
AUDIO_DIR.mkdir(parents=True, exist_ok=True)


@dataclass
class CaptionWord:
    """A single word with timing."""
    text: str
    start_ms: int
    end_ms: int


@dataclass
class CaptionPage:
    """A page of captions (TikTok-style group)."""
    text: str
    start_ms: int
    end_ms: int
    tokens: List[CaptionWord]


@dataclass
class VoiceoverResult:
    """Result of voiceover generation."""
    success: bool
    audio_path: Optional[str] = None
    duration_ms: Optional[int] = None
    error: Optional[str] = None


@dataclass
class TranscriptionResult:
    """Result of audio transcription."""
    success: bool
    text: Optional[str] = None
    words: Optional[List[CaptionWord]] = None
    pages: Optional[List[CaptionPage]] = None
    error: Optional[str] = None


async def generate_voiceover_openai(
    text: str,
    voice: str = "alloy",
    output_path: Optional[str] = None,
    speed: float = 1.0
) -> VoiceoverResult:
    """
    Generate voiceover using OpenAI TTS API.

    Pi-compatible: Cloud-based, minimal local processing.

    Args:
        text: Text to convert to speech
        voice: Voice ID (alloy, echo, fable, onyx, nova, shimmer)
        output_path: Path to save audio file
        speed: Speech speed (0.25 to 4.0)

    Returns:
        VoiceoverResult with audio path and duration
    """
    api_key = settings.OPENAI_API_KEY
    if not api_key:
        return VoiceoverResult(success=False, error="OpenAI API key not configured")

    if not output_path:
        import uuid
        output_path = str(AUDIO_DIR / f"voiceover_{uuid.uuid4().hex[:8]}.mp3")

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(
                "https://api.openai.com/v1/audio/speech",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "tts-1",
                    "input": text,
                    "voice": voice,
                    "speed": speed,
                    "response_format": "mp3",
                }
            )
            response.raise_for_status()

            # Save audio file
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, "wb") as f:
                f.write(response.content)

            # Estimate duration (rough: ~150 words/minute at 1.0 speed)
            word_count = len(text.split())
            duration_ms = int((word_count / 150) * 60 * 1000 / speed)

            return VoiceoverResult(
                success=True,
                audio_path=output_path,
                duration_ms=duration_ms,
            )
        except Exception as e:
            return VoiceoverResult(success=False, error=str(e))


async def transcribe_audio_openai(
    audio_path: str,
    language: str = "en"
) -> TranscriptionResult:
    """
    Transcribe audio using OpenAI Whisper API.

    Pi-compatible: Cloud-based transcription.

    Args:
        audio_path: Path to audio file
        language: Language code

    Returns:
        TranscriptionResult with word-level timestamps
    """
    api_key = settings.OPENAI_API_KEY
    if not api_key:
        return TranscriptionResult(success=False, error="OpenAI API key not configured")

    if not os.path.exists(audio_path):
        return TranscriptionResult(success=False, error=f"Audio file not found: {audio_path}")

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            with open(audio_path, "rb") as audio_file:
                files = {
                    "file": (os.path.basename(audio_path), audio_file, "audio/mpeg"),
                }
                data = {
                    "model": "whisper-1",
                    "language": language,
                    "response_format": "verbose_json",
                    "timestamp_granularities[]": "word",
                }

                response = await client.post(
                    "https://api.openai.com/v1/audio/transcriptions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                    },
                    files=files,
                    data=data,
                )
                response.raise_for_status()
                data = response.json()

            # Extract words with timestamps
            words: List[CaptionWord] = []
            for word_data in data.get("words", []):
                words.append(CaptionWord(
                    text=word_data.get("word", ""),
                    start_ms=int(word_data.get("start", 0) * 1000),
                    end_ms=int(word_data.get("end", 0) * 1000),
                ))

            # Create TikTok-style pages
            pages = create_caption_pages(words, words_per_page=4)

            return TranscriptionResult(
                success=True,
                text=data.get("text", ""),
                words=words,
                pages=pages,
            )
        except Exception as e:
            return TranscriptionResult(success=False, error=str(e))


def create_caption_pages(
    words: List[CaptionWord],
    words_per_page: int = 4,
    max_page_duration_ms: int = 3000
) -> List[CaptionPage]:
    """
    Group words into TikTok-style caption pages.

    Args:
        words: List of words with timing
        words_per_page: Target words per page
        max_page_duration_ms: Maximum page duration

    Returns:
        List of CaptionPage objects
    """
    if not words:
        return []

    pages: List[CaptionPage] = []
    current_tokens: List[CaptionWord] = []
    page_start_ms = words[0].start_ms

    for word in words:
        current_tokens.append(word)

        # Check if we should create a new page
        should_break = False

        # Break on word count
        if len(current_tokens) >= words_per_page:
            should_break = True

        # Break on duration
        if current_tokens and (word.end_ms - page_start_ms) > max_page_duration_ms:
            should_break = True

        # Break on sentence end
        if word.text.rstrip().endswith((".", "!", "?", ":")):
            should_break = True

        if should_break and current_tokens:
            pages.append(CaptionPage(
                text=" ".join(t.text for t in current_tokens),
                start_ms=page_start_ms,
                end_ms=current_tokens[-1].end_ms,
                tokens=current_tokens.copy(),
            ))
            current_tokens = []
            if words.index(word) < len(words) - 1:
                page_start_ms = words[words.index(word) + 1].start_ms

    # Add remaining tokens
    if current_tokens:
        pages.append(CaptionPage(
            text=" ".join(t.text for t in current_tokens),
            start_ms=page_start_ms,
            end_ms=current_tokens[-1].end_ms,
            tokens=current_tokens,
        ))

    return pages


def caption_pages_to_remotion_format(pages: List[CaptionPage]) -> List[Dict[str, Any]]:
    """
    Convert caption pages to Remotion-compatible format.

    Returns format matching EnhancedVideoProps.captionPages schema.
    """
    return [
        {
            "text": page.text,
            "startMs": page.start_ms,
            "endMs": page.end_ms,
            "tokens": [
                {
                    "text": token.text,
                    "startMs": token.start_ms,
                    "endMs": token.end_ms,
                }
                for token in page.tokens
            ]
        }
        for page in pages
    ]


async def generate_voiceover_and_captions(
    script_text: str,
    voice: str = "alloy",
    project_id: str = "default",
    idea_id: str = "default",
) -> Dict[str, Any]:
    """
    Generate voiceover and extract captions in one pipeline.

    Args:
        script_text: The script to convert
        voice: OpenAI voice ID
        project_id: Project identifier
        idea_id: Idea identifier

    Returns:
        Dict with voiceover URL and caption pages
    """
    # Clean script text (remove timing markers)
    import re
    clean_text = re.sub(r'\[\d+-\d+s\]\s*(?:\w+:)?\s*', '', script_text)
    clean_text = re.sub(r'\*([^*]+)\*', r'\1', clean_text)  # Remove emphasis markers
    clean_text = clean_text.strip()

    if not clean_text:
        return {
            "success": False,
            "error": "No text to convert",
        }

    # Generate voiceover
    output_dir = AUDIO_DIR / project_id
    output_dir.mkdir(parents=True, exist_ok=True)
    audio_path = str(output_dir / f"{idea_id}_voiceover.mp3")

    voiceover_result = await generate_voiceover_openai(
        text=clean_text,
        voice=voice,
        output_path=audio_path,
    )

    if not voiceover_result.success:
        return {
            "success": False,
            "error": f"Voiceover generation failed: {voiceover_result.error}",
        }

    # Transcribe for accurate word timing
    transcription_result = await transcribe_audio_openai(audio_path)

    if not transcription_result.success:
        # Return voiceover without captions if transcription fails
        return {
            "success": True,
            "voiceover_url": audio_path,
            "voiceover_duration_ms": voiceover_result.duration_ms,
            "caption_pages": [],
            "warning": f"Transcription failed: {transcription_result.error}",
        }

    # Convert to Remotion format
    caption_pages = caption_pages_to_remotion_format(transcription_result.pages or [])

    return {
        "success": True,
        "voiceover_url": audio_path,
        "voiceover_duration_ms": voiceover_result.duration_ms,
        "caption_pages": caption_pages,
        "word_count": len(transcription_result.words or []),
    }


# Voice options for frontend
AVAILABLE_VOICES = [
    {"id": "alloy", "name": "Alloy", "description": "Neutral, balanced"},
    {"id": "echo", "name": "Echo", "description": "Warm, conversational"},
    {"id": "fable", "name": "Fable", "description": "Expressive, dynamic"},
    {"id": "onyx", "name": "Onyx", "description": "Deep, authoritative"},
    {"id": "nova", "name": "Nova", "description": "Friendly, upbeat"},
    {"id": "shimmer", "name": "Shimmer", "description": "Clear, professional"},
]

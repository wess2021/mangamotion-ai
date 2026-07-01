from __future__ import annotations

import logging
import os
from pathlib import Path

import httpx

logger = logging.getLogger(__name__)

ELEVENLABS_API = "https://api.elevenlabs.io/v1"
DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"


def generate_voice(panel_id: str, text: str, character: str, output_dir: Path) -> str:
    """
    ElevenLabs TTS — requires ELEVENLABS_API_KEY environment variable.
    """
    api_key = os.environ.get("ELEVENLABS_API_KEY", "")
    if not api_key:
        raise RuntimeError("ELEVENLABS_API_KEY environment variable not set")

    if not text or not text.strip():
        from app.services.audio_backends.mock_backend import _generate_silence
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / f"{panel_id}_voice.mp3"
        _generate_silence(str(output_path), 1.0)
        return str(output_path)

    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
    }
    payload = {
        "text": text[:500],
        "model_id": "eleven_monolingual_v1",
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
    }

    resp = httpx.post(
        f"{ELEVENLABS_API}/text-to-speech/{DEFAULT_VOICE_ID}",
        json=payload,
        headers=headers,
        timeout=60,
    )
    resp.raise_for_status()

    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"{panel_id}_voice.mp3"
    output_path.write_bytes(resp.content)
    logger.info("ElevenLabs voice saved: %s", output_path)
    return str(output_path)


def generate_music(project_id: str, mood: str, duration: float, output_dir: Path) -> str:
    from app.services.audio_backends.mock_backend import generate_music as mock_music
    return mock_music(project_id, mood, duration, output_dir)


def generate_sfx(panel_id: str, effect: str, output_dir: Path) -> str:
    from app.services.audio_backends.mock_backend import generate_sfx as mock_sfx
    return mock_sfx(panel_id, effect, output_dir)

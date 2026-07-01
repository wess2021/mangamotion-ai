from __future__ import annotations

import logging
import re
from pathlib import Path

from app.config import settings

logger = logging.getLogger(__name__)

SFX_KEYWORDS = {
    "boom", "crash", "bang", "whoosh", "slash", "thud", "crack",
    "smash", "pow", "zap", "roar", "hiss", "clang", "rumble",
    "swoosh", "snap",
}


def _get_backend():
    backend = settings.audio_backend.lower()
    if backend == "xtts":
        from app.services.audio_backends import xtts_backend
        return xtts_backend
    elif backend == "elevenlabs":
        from app.services.audio_backends import elevenlabs_backend
        return elevenlabs_backend
    else:
        from app.services.audio_backends import mock_backend
        return mock_backend


def _extract_sfx(ocr_text: str) -> str | None:
    for word in re.findall(r"[A-Z]{3,}", ocr_text or ""):
        key = word.lower()
        if key in SFX_KEYWORDS:
            return key
    return None


def generate_panel_voice(
    project_id: str,
    panel_id: str,
    ocr_text: str,
    character: str = "narrator",
) -> str | None:
    if not ocr_text or not ocr_text.strip():
        return None
    output_dir = Path(settings.storage_path) / "projects" / project_id / "audio" / "voices"
    backend = _get_backend()
    try:
        return backend.generate_voice(panel_id, ocr_text.strip()[:500], character, output_dir)
    except Exception as exc:
        logger.warning("Voice generation failed for panel %s: %s", panel_id, exc)
        return None


def generate_project_music(
    project_id: str,
    mood: str,
    duration: float = 120.0,
) -> str | None:
    output_dir = Path(settings.storage_path) / "projects" / project_id / "audio"
    backend = _get_backend()
    try:
        return backend.generate_music(project_id, mood, duration, output_dir)
    except Exception as exc:
        logger.warning("Music generation failed for project %s: %s", project_id, exc)
        return None


def generate_panel_sfx(
    project_id: str,
    panel_id: str,
    ocr_text: str,
) -> str | None:
    sfx_type = _extract_sfx(ocr_text or "")
    if not sfx_type:
        return None
    output_dir = Path(settings.storage_path) / "projects" / project_id / "audio" / "sfx"
    backend = _get_backend()
    try:
        return backend.generate_sfx(panel_id, sfx_type, output_dir)
    except Exception as exc:
        logger.warning("SFX generation failed for panel %s: %s", panel_id, exc)
        return None


def run_audio_pipeline(
    project_id: str,
    panels: list[dict],
    dominant_mood: str = "calm",
    video_duration_total: float = 120.0,
) -> dict:
    results: dict = {
        "music_path": None,
        "panel_voices": {},
        "panel_sfx": {},
    }

    music_path = generate_project_music(project_id, dominant_mood, video_duration_total)
    results["music_path"] = music_path

    for panel in panels:
        panel_id = panel.get("panel_id", "")
        ocr_text = panel.get("ocr_text", "") or ""
        character = panel.get("character", "narrator")

        voice_path = generate_panel_voice(project_id, panel_id, ocr_text, character)
        if voice_path:
            results["panel_voices"][panel_id] = voice_path

        sfx_path = generate_panel_sfx(project_id, panel_id, ocr_text)
        if sfx_path:
            results["panel_sfx"][panel_id] = sfx_path

    return results

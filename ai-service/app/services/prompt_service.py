from __future__ import annotations

import json
import logging
import re
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

EMOTION_STYLE: dict[str, str] = {
    "battle": "Dynamic action shot. High energy. Motion blur. Shattered debris. Intense lighting.",
    "tense": "Low angle shot. Dramatic shadows. Shallow depth of field. Ominous atmosphere.",
    "emotional": "Close-up on face. Soft lighting. Tears glistening. Warm colour palette. Gentle bokeh.",
    "determined": "Heroic angle. Wind blowing through hair. Confident stance. Epic wide shot.",
    "surprised": "Wide-eyed close-up. Sharp focus. Dramatic zoom. High contrast.",
    "calm": "Peaceful wide shot. Natural lighting. Ambient atmosphere. Serene composition.",
}

LOCATION_STYLE: dict[str, str] = {
    "outdoors": "Outdoor setting. Natural sunlight. Wind in the trees.",
    "indoors": "Interior scene. Warm ambient lighting. Stone walls.",
    "battlefield": "Ruined landscape. Smoke and fire. Dust in the air.",
    "town": "Busy streets. Crowd in the background. Market stalls.",
    "unknown": "Cinematic environment.",
}

BASE_QUALITY = (
    "Anime movie quality. Highly cinematic. 4K detail. "
    "Professional animation studio. Fluid motion."
)


def _build_template_prompt(
    panel_id: str,
    ocr_texts: list[str],
    scene: dict | None,
) -> str:
    emotion = (scene or {}).get("emotion", "calm")
    location = (scene or {}).get("location", "unknown")
    characters = (scene or {}).get("characters", [])

    emotion_desc = EMOTION_STYLE.get(emotion, EMOTION_STYLE["calm"])
    location_desc = LOCATION_STYLE.get(location, LOCATION_STYLE["unknown"])

    char_desc = ""
    if characters:
        char_list = ", ".join(characters[:3])
        char_desc = f"Characters: {char_list}. "

    dialogue_hint = ""
    if ocr_texts:
        sample = ocr_texts[0][:80]
        dialogue_hint = f'Scene context: "{sample}". '

    camera_moves = {
        "battle": "Camera performs a fast whip-pan following the action.",
        "tense": "Slow push-in on the subject.",
        "emotional": "Gentle rack focus from background to face.",
        "determined": "Low dolly-in rising to a hero shot.",
        "surprised": "Sudden zoom into the subject.",
        "calm": "Slow panoramic sweep of the environment.",
    }
    camera = camera_moves.get(emotion, "Steady cinematic shot.")

    prompt = (
        f"{char_desc}{dialogue_hint}"
        f"{location_desc} {emotion_desc} "
        f"{camera} {BASE_QUALITY}"
    )
    return prompt.strip()


def _generate_with_llm(
    panel_id: str,
    ocr_texts: list[str],
    scene: dict | None,
) -> str | None:
    if not settings.llm_endpoint:
        return None

    context = {
        "panel_id": panel_id,
        "dialogue": ocr_texts[:5],
        "scene": scene or {},
    }

    prompt = (
        "You are a cinematic prompt writer for AI video generation. "
        "Given the following manga panel context, write ONE short cinematic prompt "
        "(3–6 sentences) suitable for Wan 2.2 video generation. "
        "Be vivid, specific, and cinematic. No bullet points. No explanation.\n\n"
        + json.dumps(context, ensure_ascii=False)
    )

    payload: dict[str, Any] = {
        "model": settings.llm_model,
        "messages": [{"role": "user", "content": prompt}],
        "stream": False,
    }

    try:
        resp = httpx.post(
            f"{settings.llm_endpoint}/api/chat",
            json=payload,
            timeout=30,
        )
        resp.raise_for_status()
        content = resp.json()["message"]["content"].strip()
        if content:
            return content
    except Exception as exc:
        logger.warning("LLM prompt generation failed for panel %s: %s", panel_id, exc)

    return None


def generate_prompt(
    panel_id: str,
    ocr_texts: list[str],
    scene: dict | None,
) -> str:
    llm_prompt = _generate_with_llm(panel_id, ocr_texts, scene)
    if llm_prompt:
        return llm_prompt
    return _build_template_prompt(panel_id, ocr_texts, scene)

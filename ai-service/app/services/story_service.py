from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

EMOTION_KEYWORDS: dict[str, list[str]] = {
    "battle": ["fight", "attack", "slash", "punch", "sword", "battle", "enemy", "defeat", "clash", "boom", "crash", "bang"],
    "tense": ["danger", "trap", "escape", "run", "chase", "warning", "stop", "watch"],
    "emotional": ["cry", "tears", "sad", "sorry", "miss", "love", "heart", "remember", "promise"],
    "determined": ["never", "won't", "protect", "strong", "train", "stronger", "won", "believe"],
    "surprised": ["what", "impossible", "no way", "how", "why", "really", "shocking", "unbelievable"],
    "calm": [],
}

LOCATION_KEYWORDS: dict[str, list[str]] = {
    "outdoors": ["sky", "wind", "forest", "mountain", "road", "village", "field", "outside"],
    "indoors": ["room", "house", "castle", "cave", "corridor", "hall", "door", "inside"],
    "battlefield": ["ruins", "battle", "war", "destroyed", "smoke", "fire"],
    "town": ["market", "street", "crowd", "city", "town"],
}


def _detect_emotion(texts: list[str]) -> str:
    combined = " ".join(texts).lower()
    for emotion, keywords in EMOTION_KEYWORDS.items():
        if any(kw in combined for kw in keywords):
            return emotion
    return "calm"


def _detect_location(texts: list[str]) -> str:
    combined = " ".join(texts).lower()
    for location, keywords in LOCATION_KEYWORDS.items():
        if any(kw in combined for kw in keywords):
            return location
    return "unknown"


def _extract_characters(texts: list[str]) -> list[str]:
    characters: set[str] = set()
    for text in texts:
        words = text.split()
        for i, word in enumerate(words):
            cleaned = re.sub(r"[^a-zA-Z]", "", word)
            if (
                cleaned
                and cleaned[0].isupper()
                and len(cleaned) > 2
                and i > 0
                and words[i - 1].lower() not in ("the", "a", "an", "and", "but", "or", "i", "you", "he", "she", "it")
            ):
                characters.add(cleaned)
    return list(characters)[:5]


def _build_summary(texts: list[str], panel_number: int) -> str:
    dialogue = [t for t in texts if t]
    if not dialogue:
        return f"Panel {panel_number}: A scene unfolds silently."
    joined = " ".join(dialogue[:3])
    if len(joined) > 120:
        joined = joined[:117] + "..."
    return f"Panel {panel_number}: {joined}"


def _analyse_with_llm(project_id: str, ocr_data: list[dict]) -> list[dict] | None:
    if not settings.llm_endpoint:
        return None
    texts_by_panel: dict[str, list[str]] = {}
    for item in ocr_data:
        pid = item["panel_id"]
        texts_by_panel.setdefault(pid, []).append(item["text"])

    panel_summaries = [
        {"panel": pid, "texts": txts}
        for pid, txts in texts_by_panel.items()
    ]

    prompt = (
        "You are a manga story analyst. Given the following panel dialogue and narration data from a manga chapter, "
        "produce a JSON array of scene objects. Each object must have: "
        '{"order": int, "summary": str, "emotion": str, "characters": [str], "location": str}. '
        "Emotion must be one of: battle, tense, emotional, determined, surprised, calm. "
        "Here is the panel data:\n\n"
        + json.dumps(panel_summaries, ensure_ascii=False)
        + "\n\nReturn only valid JSON, no extra text."
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
            timeout=60,
        )
        resp.raise_for_status()
        content = resp.json()["message"]["content"]
        json_match = re.search(r"\[.*\]", content, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
    except Exception as exc:
        logger.warning("LLM story analysis failed: %s", exc)

    return None


def analyse_story(project_id: str, ocr_data: list[dict]) -> list[dict]:
    llm_result = _analyse_with_llm(project_id, ocr_data)
    if llm_result:
        return llm_result

    texts_by_panel: dict[str, list[str]] = {}
    for item in ocr_data:
        pid = item["panel_id"]
        texts_by_panel.setdefault(pid, []).append(item["text"])

    scenes: list[dict] = []
    for order, (panel_id, texts) in enumerate(texts_by_panel.items(), start=1):
        scenes.append({
            "order": order,
            "summary": _build_summary(texts, order),
            "emotion": _detect_emotion(texts),
            "characters": _extract_characters(texts),
            "location": _detect_location(texts),
        })

    if not scenes:
        scenes = [{
            "order": 1,
            "summary": "A chapter of manga unfolds — no dialogue detected.",
            "emotion": "calm",
            "characters": [],
            "location": "unknown",
        }]

    return scenes

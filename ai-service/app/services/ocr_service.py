from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)

_easyocr_reader: Optional[object] = None


def _get_reader(languages: list[str]):
    global _easyocr_reader
    if _easyocr_reader is None:
        try:
            import easyocr
            _easyocr_reader = easyocr.Reader(languages, gpu=False, verbose=False)
            logger.info("EasyOCR reader initialised (CPU mode)")
        except Exception as exc:
            logger.warning("EasyOCR unavailable (%s) — falling back to pytesseract", exc)
            _easyocr_reader = None
    return _easyocr_reader


def _run_easyocr(image_path: str, languages: list[str]) -> list[str]:
    reader = _get_reader(languages)
    if reader is None:
        return []
    results = reader.readtext(image_path, detail=0, paragraph=False)
    return [str(t).strip() for t in results if str(t).strip()]


def _run_pytesseract(image_path: str) -> list[str]:
    try:
        import pytesseract
        from PIL import Image
        img = Image.open(image_path).convert("RGB")
        raw = pytesseract.image_to_string(img, lang="eng+fra")
        lines = [ln.strip() for ln in raw.splitlines() if ln.strip()]
        return lines
    except Exception as exc:
        logger.warning("pytesseract failed: %s", exc)
        return []


def _classify_line(text: str) -> str:
    upper = text.upper()
    sfx_keywords = [
        "BOOM", "CRASH", "BANG", "WHOOSH", "SLASH", "THUD", "CRACK",
        "SMASH", "POW", "ZAP", "ROAR", "HISS", "CLANG", "RUMBLE",
        "SWOOSH", "SNAP", "GRUNT", "GASP",
    ]
    if any(kw in upper for kw in sfx_keywords):
        return "sfx"
    if text.startswith("…") or text.startswith("...") or len(text) > 60:
        return "narration"
    return "dialogue"


def extract_text_from_panel(
    panel_id: str,
    image_path: str,
    languages: list[str],
) -> list[dict]:
    lang_map = {"en": "en", "fr": "fr", "ja": "ja", "ko": "ko"}
    easy_langs = [lang_map.get(lg, "en") for lg in languages]

    lines: list[str] = []

    if settings.ocr_backend == "easyocr":
        lines = _run_easyocr(image_path, easy_langs)
    elif settings.ocr_backend == "pytesseract":
        lines = _run_pytesseract(image_path)
    else:
        lines = _run_easyocr(image_path, easy_langs)
        if not lines:
            lines = _run_pytesseract(image_path)

    results = []
    for text in lines:
        results.append({
            "panel_id": panel_id,
            "text": text,
            "type": _classify_line(text),
        })
    return results


def run_ocr_for_project(project_id: str, languages: list[str]) -> list[dict]:
    panels_dir = Path(settings.storage_path) / "projects" / project_id / "panels"
    if not panels_dir.exists():
        logger.warning("No panels directory found for project %s", project_id)
        return []

    panel_images = sorted(panels_dir.glob("*.png")) + sorted(panels_dir.glob("*.jpg"))
    all_lines: list[dict] = []

    for image_path in panel_images:
        panel_id = image_path.stem
        try:
            lines = extract_text_from_panel(panel_id, str(image_path), languages)
            all_lines.extend(lines)
        except Exception as exc:
            logger.warning("OCR failed for panel %s: %s", panel_id, exc)

    return all_lines

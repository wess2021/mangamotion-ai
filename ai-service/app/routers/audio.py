from pydantic import BaseModel
from fastapi import APIRouter, HTTPException
from typing import Any

from app.services.audio_service import (
    generate_panel_voice,
    generate_project_music,
    generate_panel_sfx,
    run_audio_pipeline,
)

router = APIRouter()


class VoiceRequest(BaseModel):
    project_id: str
    panel_id: str
    ocr_text: str
    character: str = "narrator"


class MusicRequest(BaseModel):
    project_id: str
    mood: str = "calm"
    duration_seconds: float = 120.0


class SfxRequest(BaseModel):
    project_id: str
    panel_id: str
    ocr_text: str


class AudioResponse(BaseModel):
    project_id: str
    audio_path: str
    message: str


class BulkAudioRequest(BaseModel):
    project_id: str
    panels: list[dict[str, Any]]
    dominant_mood: str = "calm"
    total_duration: float = 120.0


class BulkAudioResponse(BaseModel):
    project_id: str
    music_path: str | None
    panel_voices: dict[str, str]
    panel_sfx: dict[str, str]
    voice_count: int
    sfx_count: int
    message: str


@router.post("/audio/voice", response_model=AudioResponse)
def generate_voice(payload: VoiceRequest):
    try:
        path = generate_panel_voice(
            payload.project_id, payload.panel_id, payload.ocr_text, payload.character
        )
        return AudioResponse(
            project_id=payload.project_id,
            audio_path=path or "",
            message="Voice generated" if path else "No text to speak",
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/audio/music", response_model=AudioResponse)
def generate_music(payload: MusicRequest):
    try:
        path = generate_project_music(payload.project_id, payload.mood, payload.duration_seconds)
        return AudioResponse(
            project_id=payload.project_id,
            audio_path=path or "",
            message=f"Music generated [{payload.mood}]" if path else "Music generation failed",
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/audio/sfx", response_model=AudioResponse)
def generate_sfx(payload: SfxRequest):
    try:
        path = generate_panel_sfx(payload.project_id, payload.panel_id, payload.ocr_text)
        return AudioResponse(
            project_id=payload.project_id,
            audio_path=path or "",
            message="SFX generated" if path else "No SFX keyword found in OCR text",
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/audio/pipeline", response_model=BulkAudioResponse)
def run_bulk_audio(payload: BulkAudioRequest):
    try:
        results = run_audio_pipeline(
            payload.project_id,
            payload.panels,
            payload.dominant_mood,
            payload.total_duration,
        )
        voices: dict[str, str] = results["panel_voices"]
        sfx: dict[str, str] = results["panel_sfx"]
        return BulkAudioResponse(
            project_id=payload.project_id,
            music_path=results["music_path"],
            panel_voices=voices,
            panel_sfx=sfx,
            voice_count=len(voices),
            sfx_count=len(sfx),
            message=(
                f"Audio pipeline complete — {len(voices)} voices, "
                f"{len(sfx)} SFX, music: {'yes' if results['music_path'] else 'no'}"
            ),
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

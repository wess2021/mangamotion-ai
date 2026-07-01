from pydantic import BaseModel
from fastapi import APIRouter

router = APIRouter()


class VoiceRequest(BaseModel):
    project_id: str
    character: str
    text: str


class MusicRequest(BaseModel):
    project_id: str
    mood: str  # romance | horror | comedy | battle | drama


class SfxRequest(BaseModel):
    project_id: str
    effect: str


class AudioResponse(BaseModel):
    project_id: str
    audio_path: str
    message: str


@router.post("/audio/voice", response_model=AudioResponse)
def generate_voice(payload: VoiceRequest):
    return {
        "project_id": payload.project_id,
        "audio_path": "",
        "message": "Voice stub — XTTS v2 planned for Phase 5",
    }


@router.post("/audio/music", response_model=AudioResponse)
def generate_music(payload: MusicRequest):
    return {
        "project_id": payload.project_id,
        "audio_path": "",
        "message": "Music stub — AudioCraft / Stable Audio Open planned for Phase 5",
    }


@router.post("/audio/sfx", response_model=AudioResponse)
def generate_sfx(payload: SfxRequest):
    return {
        "project_id": payload.project_id,
        "audio_path": "",
        "message": "SFX stub — AudioCraft planned for Phase 5",
    }

from pydantic import BaseModel
from fastapi import APIRouter

router = APIRouter()


class VideoGenerateRequest(BaseModel):
    project_id: str
    panel_id: str
    prompt: str
    duration_seconds: float = 6.0
    model: str = "wan-2.2"


class VideoGenerateResponse(BaseModel):
    panel_id: str
    video_path: str
    model: str
    message: str


@router.post("/video/generate", response_model=VideoGenerateResponse)
def generate_video(payload: VideoGenerateRequest):
    # Phase 4: integrate Wan 2.2 (primary) and LTX Video (preview)
    return {
        "panel_id": payload.panel_id,
        "video_path": "",
        "model": payload.model,
        "message": "Video generation stub — Wan 2.2 integration planned for Phase 4",
    }

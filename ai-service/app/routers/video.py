from pathlib import Path

from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse

from app.services.video_service import generate_panel_video
from app.config import settings

router = APIRouter()


class VideoGenerateRequest(BaseModel):
    project_id: str
    panel_id: str
    image_path: str
    prompt: str
    duration_seconds: float = 6.0
    model: str = "auto"


class VideoGenerateResponse(BaseModel):
    panel_id: str
    video_path: str
    model: str
    message: str


class BulkVideoRequest(BaseModel):
    project_id: str
    panels: list[dict]


class BulkVideoResponse(BaseModel):
    project_id: str
    results: list[VideoGenerateResponse]
    message: str


@router.post("/video/generate", response_model=VideoGenerateResponse)
def generate_video(payload: VideoGenerateRequest):
    try:
        video_path = generate_panel_video(
            project_id=payload.project_id,
            panel_id=payload.panel_id,
            image_path=payload.image_path,
            prompt=payload.prompt,
            duration=payload.duration_seconds,
        )
        return {
            "panel_id": payload.panel_id,
            "video_path": video_path,
            "model": settings.video_backend,
            "message": f"Video generated via {settings.video_backend} backend",
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/video/generate-bulk", response_model=BulkVideoResponse)
def generate_bulk_videos(payload: BulkVideoRequest):
    results = []
    errors = []
    for panel in payload.panels:
        panel_id = panel.get("panel_id", "")
        image_path = panel.get("image_path", "")
        prompt = panel.get("prompt", "Cinematic anime scene. High quality.")
        duration = float(panel.get("duration_seconds", settings.video_duration))
        try:
            video_path = generate_panel_video(
                project_id=payload.project_id,
                panel_id=panel_id,
                image_path=image_path,
                prompt=prompt,
                duration=duration,
            )
            results.append({
                "panel_id": panel_id,
                "video_path": video_path,
                "model": settings.video_backend,
                "message": "OK",
            })
        except Exception as exc:
            errors.append(f"{panel_id}: {exc}")
            results.append({
                "panel_id": panel_id,
                "video_path": "",
                "model": settings.video_backend,
                "message": f"Failed: {exc}",
            })

    summary = f"{len(results) - len(errors)}/{len(results)} videos generated"
    if errors:
        summary += f" ({len(errors)} failed)"
    return {
        "project_id": payload.project_id,
        "results": results,
        "message": summary,
    }


@router.get("/video/file")
def serve_video_file(path: str):
    video_path = Path(path)
    if not video_path.exists() or not video_path.is_file():
        raise HTTPException(status_code=404, detail="Video file not found")
    return FileResponse(str(video_path), media_type="video/mp4")

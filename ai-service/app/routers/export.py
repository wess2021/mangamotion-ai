from __future__ import annotations

from pathlib import Path
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException

from app.config import settings
from app.services.export_service import merge_project

router = APIRouter()


class MergeRequest(BaseModel):
    project_id: str
    panels: list[dict]
    music_path: str | None = None


class MergeResponse(BaseModel):
    project_id: str
    video_path: str
    srt_path: str | None
    duration_seconds: float
    panel_count: int
    message: str


@router.post("/export/merge", response_model=MergeResponse)
def merge_video(payload: MergeRequest):
    output_dir = str(Path(settings.storage_path) / "projects" / payload.project_id / "export")
    try:
        result = merge_project(
            payload.project_id,
            payload.panels,
            payload.music_path,
            output_dir,
        )
        return MergeResponse(
            project_id=payload.project_id,
            video_path=result["video_path"],
            srt_path=result["srt_path"],
            duration_seconds=result["duration_seconds"],
            panel_count=result["panel_count"],
            message=f"Merged {result['panel_count']} panels into {result['duration_seconds']:.1f}s MP4",
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

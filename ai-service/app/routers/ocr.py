from pydantic import BaseModel
from fastapi import APIRouter, HTTPException

from app.services.ocr_service import run_ocr_for_project

router = APIRouter()


class OcrRequest(BaseModel):
    project_id: str
    languages: list[str] = ["en", "fr", "ja", "ko"]


class OcrLine(BaseModel):
    panel_id: str
    text: str
    type: str


class OcrResponse(BaseModel):
    project_id: str
    lines: list[OcrLine]
    message: str


@router.post("/ocr", response_model=OcrResponse)
def ocr_endpoint(payload: OcrRequest):
    try:
        lines = run_ocr_for_project(payload.project_id, payload.languages)
        return {
            "project_id": payload.project_id,
            "lines": lines,
            "message": f"OCR complete — {len(lines)} text lines extracted",
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

from pydantic import BaseModel
from fastapi import APIRouter

router = APIRouter()


class OcrRequest(BaseModel):
    project_id: str
    languages: list[str] = ["en", "fr", "ja", "ko"]


class OcrLine(BaseModel):
    panel_id: str
    text: str
    type: str  # dialogue | narration | sfx


class OcrResponse(BaseModel):
    project_id: str
    lines: list[OcrLine]
    message: str


@router.post("/ocr", response_model=OcrResponse)
def ocr_endpoint(payload: OcrRequest):
    # Phase 3: integrate EasyOCR / PaddleOCR
    return {
        "project_id": payload.project_id,
        "lines": [],
        "message": "OCR stub — EasyOCR integration planned for Phase 3",
    }

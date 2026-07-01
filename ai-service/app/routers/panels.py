from pydantic import BaseModel
from fastapi import APIRouter

from app.services.panel_detector import detect_panels

router = APIRouter()


class PageInput(BaseModel):
    page_number: int
    image_path: str
    width: int
    height: int


class DetectPanelsRequest(BaseModel):
    project_id: str
    pages: list[PageInput]


class PanelInfo(BaseModel):
    page_number: int
    panel_number: int
    global_panel_number: int
    image_path: str
    x: int
    y: int
    width: int
    height: int


class DetectPanelsResponse(BaseModel):
    project_id: str
    panels: list[PanelInfo]


@router.post("/detect-panels", response_model=DetectPanelsResponse)
def detect_panels_endpoint(payload: DetectPanelsRequest):
    pages = [page.model_dump() for page in payload.pages]
    panels = detect_panels(payload.project_id, pages)
    return {"project_id": payload.project_id, "panels": panels}

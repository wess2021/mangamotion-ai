from pydantic import BaseModel
from fastapi import APIRouter

from app.services.page_extractor import extract_pages

router = APIRouter()


class ExtractPagesRequest(BaseModel):
    project_id: str
    source_path: str


class PageInfo(BaseModel):
    page_number: int
    image_path: str
    width: int
    height: int


class ExtractPagesResponse(BaseModel):
    project_id: str
    pages: list[PageInfo]


@router.post("/extract-pages", response_model=ExtractPagesResponse)
def extract_pages_endpoint(payload: ExtractPagesRequest):
    pages = extract_pages(payload.project_id, payload.source_path)
    return {"project_id": payload.project_id, "pages": pages}

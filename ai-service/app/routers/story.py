from pydantic import BaseModel
from fastapi import APIRouter, HTTPException

from app.services.story_service import analyse_story
from app.services.prompt_service import generate_prompt
from app.services.ocr_service import run_ocr_for_project

router = APIRouter()


class StoryAnalysisRequest(BaseModel):
    project_id: str
    ocr_lines: list[dict] = []


class SceneSummary(BaseModel):
    order: int
    summary: str
    emotion: str
    characters: list[str]


class StoryAnalysisResponse(BaseModel):
    project_id: str
    scenes: list[SceneSummary]
    message: str


class PromptRequest(BaseModel):
    project_id: str
    panel_id: str
    ocr_texts: list[str] = []
    scene: dict = {}


class PromptResponse(BaseModel):
    panel_id: str
    cinematic_prompt: str


class BulkPromptRequest(BaseModel):
    project_id: str


class BulkPromptResponse(BaseModel):
    project_id: str
    prompts: list[PromptResponse]
    message: str


@router.post("/story/analyze", response_model=StoryAnalysisResponse)
def analyze_story(payload: StoryAnalysisRequest):
    try:
        ocr_data = payload.ocr_lines
        if not ocr_data:
            ocr_data = run_ocr_for_project(payload.project_id, ["en", "fr"])
        scenes = analyse_story(payload.project_id, ocr_data)
        return {
            "project_id": payload.project_id,
            "scenes": scenes,
            "message": f"Story analysis complete — {len(scenes)} scenes identified",
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/story/prompts/single", response_model=PromptResponse)
def generate_single_prompt(payload: PromptRequest):
    try:
        prompt = generate_prompt(payload.panel_id, payload.ocr_texts, payload.scene or None)
        return {"panel_id": payload.panel_id, "cinematic_prompt": prompt}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/story/prompts", response_model=BulkPromptResponse)
def generate_bulk_prompts(payload: BulkPromptRequest):
    try:
        ocr_data = run_ocr_for_project(payload.project_id, ["en", "fr"])
        scenes = analyse_story(payload.project_id, ocr_data)

        texts_by_panel: dict[str, list[str]] = {}
        for item in ocr_data:
            texts_by_panel.setdefault(item["panel_id"], []).append(item["text"])

        scene_map = {s["order"]: s for s in scenes}
        prompts = []
        for i, (panel_id, texts) in enumerate(texts_by_panel.items(), start=1):
            scene = scene_map.get(i)
            prompt = generate_prompt(panel_id, texts, scene)
            prompts.append({"panel_id": panel_id, "cinematic_prompt": prompt})

        return {
            "project_id": payload.project_id,
            "prompts": prompts,
            "message": f"Generated {len(prompts)} cinematic prompts",
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

from pydantic import BaseModel
from fastapi import APIRouter

router = APIRouter()


class StoryAnalysisRequest(BaseModel):
    project_id: str


class SceneSummary(BaseModel):
    order: int
    summary: str
    emotion: str
    characters: list[str]


class StoryAnalysisResponse(BaseModel):
    project_id: str
    scenes: list[SceneSummary]
    message: str


@router.post("/story/analyze", response_model=StoryAnalysisResponse)
def analyze_story(payload: StoryAnalysisRequest):
    # Phase 3: integrate Qwen 3 / Gemma 3 / Llama 3.1
    return {
        "project_id": payload.project_id,
        "scenes": [],
        "message": "Story analysis stub — LLM integration planned for Phase 3",
    }


class PromptRequest(BaseModel):
    project_id: str
    panel_id: str


class PromptResponse(BaseModel):
    panel_id: str
    cinematic_prompt: str


@router.post("/story/prompts", response_model=list[PromptResponse])
def generate_prompts(payload: StoryAnalysisRequest):
    return []

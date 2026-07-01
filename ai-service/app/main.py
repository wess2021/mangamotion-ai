from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import extract, panels, ocr, story, video, audio, export

app = FastAPI(
    title="MangaMotion AI Service",
    description="Panel detection, OCR, story analysis, video & audio & export generation",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(extract.router, prefix="/api", tags=["extract"])
app.include_router(panels.router,  prefix="/api", tags=["panels"])
app.include_router(ocr.router,     prefix="/api", tags=["ocr"])
app.include_router(story.router,   prefix="/api", tags=["story"])
app.include_router(video.router,   prefix="/api", tags=["video"])
app.include_router(audio.router,   prefix="/api", tags=["audio"])
app.include_router(export.router,  prefix="/api", tags=["export"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "mangamotion-ai-service"}

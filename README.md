# MangaMotion AI

Open-source platform for transforming manhwa/manga chapters (when you have the necessary rights) into short animated videos using free and open-source AI models.

## Architecture

```
React Frontend  →  Spring Boot API  →  Python AI Service
                         ↓
                    PostgreSQL
```

## Prerequisites

- Node.js 20+
- Java 17+
- Python 3.9+
- Docker & Docker Compose
- FFmpeg (for final video merge)
- NVIDIA GPU with 12GB+ VRAM recommended (RTX 3060 or better)

## Quick Start

### With Docker (recommended)

```bash
docker compose up --build
```

| Service    | URL                        |
|------------|----------------------------|
| Frontend   | http://localhost:5173      |
| Backend    | http://localhost:8080      |
| AI Service | http://localhost:8000/docs |
| PostgreSQL | localhost:5432             |

### Local Development

**Frontend**
```bash
cd frontend && npm install && npm run dev
```

**Backend**
```bash
cd backend && ./mvnw spring-boot:run
```

**AI Service**
```bash
cd ai-service
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Workflow

1. Upload chapter (PDF, ZIP, or images)
2. Detect pages and panels
3. OCR dialogue
4. Story analysis & cinematic prompts
5. Generate animated clips (Wan 2.2)
6. Generate voices, SFX, and music
7. Merge with FFmpeg → downloadable MP4

## Roadmap

- [x] Phase 1 — Project scaffolding & Docker
- [ ] Phase 2 — Upload, pages, panel detection
- [ ] Phase 3 — OCR, story understanding, prompts
- [ ] Phase 4 — Wan 2.2 video generation
- [ ] Phase 5 — Voices, music, sound effects
- [ ] Phase 6 — Merge, timeline editor, MP4 export
- [ ] Phase 7 — Performance & advanced editing

## License

Use only with content you have rights to. AI models have their own licenses (FLUX, Wan, XTTS, etc.).

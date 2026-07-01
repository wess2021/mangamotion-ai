# MangaMotion AI — Development Roadmap

## Phase 1 — Project Setup
- [x] Create React frontend
- [x] Create Spring Boot backend
- [x] Create FastAPI AI service
- [x] Replit environment setup (replaces Docker)

## Phase 2 — Upload & Panel Detection
- [x] Upload chapter (PDF, ZIP, image formats)
- [x] Store uploaded files
- [x] Extract pages from uploaded chapter
- [x] Detect panels per page (OpenCV-based)

## Phase 3 — OCR, Story Understanding & Prompt Generation
- [x] OCR — extract dialogue, narration, and SFX from panels (pytesseract + easyocr fallback)
- [x] Story understanding — analyse characters, locations, emotions, actions (template engine + optional LLM via `LLM_ENDPOINT`)
- [x] Cinematic prompt generation — generate per-panel cinematic prompts from story context

## Phase 4 — Video Generation
- [x] Mock backend — Ken Burns pan/zoom effect via FFmpeg (works on Replit, no GPU needed)
- [x] Wan 2.2 backend — image-to-video stub (activate with `VIDEO_BACKEND=wan22` + local GPU)
- [x] Replicate backend — Wan 2.2 via API (activate with `VIDEO_BACKEND=replicate` + `REPLICATE_API_TOKEN`)
- [x] Bulk video generation endpoint — animates all panels in one pipeline call
- [x] Panel image & video serve endpoints in Spring Boot (`/api/projects/{id}/panels/{panelId}/image|video`)
- [x] `POST /api/projects/{id}/generate-videos` — re-trigger video generation at any time
- [x] Storyboard editor shows inline video player when panel is animated
- [x] Preview page — sequential video player with timeline strip + panel navigation

## Phase 5 — Audio Generation
- [ ] Voice generation — per-character voices using XTTS v2
- [ ] Background music generation — mood-based using AudioCraft / Stable Audio Open
- [ ] Sound effects generation — using AudioCraft

## Phase 6 — Merge & Export
- [ ] Merge video clips using FFmpeg
- [ ] Timeline editor in the frontend
- [ ] Subtitle generation (EN / FR / AR)
- [ ] Download final MP4

## Phase 7 — Polish & Advanced Features
- [ ] Performance optimisation
- [ ] Batch rendering
- [ ] User customisation (style: Anime, Ghibli, Realistic, Pixar)
- [ ] Advanced editing (reorder, regenerate, delete, add scenes)

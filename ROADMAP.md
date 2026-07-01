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
- [ ] Integrate Wan 2.2 (primary model — image → video, text → video)
- [ ] Integrate LTX Video (secondary — fast previews)
- [ ] Generate first animated clips per panel

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

package ai.mangamotion.backend.model;

public enum ProjectStatus {
    CREATED,
    UPLOADING,
    EXTRACTING_PAGES,
    DETECTING_PANELS,
    OCR,
    STORY_ANALYSIS,
    PROMPT_GENERATION,
    VIDEO_GENERATION,
    VOICE_GENERATION,
    AUDIO_GENERATION,
    MERGING,
    READY,
    FAILED
}

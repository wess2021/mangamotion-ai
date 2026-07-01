package ai.mangamotion.backend.dto;

import java.util.UUID;

public record PanelResponse(
        UUID id,
        int pageNumber,
        int panelNumber,
        String imageUrl,
        String ocrText,
        String cinematicPrompt,
        String videoUrl,
        String voiceUrl,
        String sfxUrl,
        int sortOrder
) {
}

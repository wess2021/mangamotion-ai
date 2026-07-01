package ai.mangamotion.backend.dto;

import ai.mangamotion.backend.model.ProjectStatus;

import java.time.Instant;
import java.util.UUID;

public record ProjectResponse(
        UUID id,
        String title,
        ProjectStatus status,
        String progressMessage,
        int progressPercent,
        int panelCount,
        Instant createdAt,
        Instant updatedAt
) {
}

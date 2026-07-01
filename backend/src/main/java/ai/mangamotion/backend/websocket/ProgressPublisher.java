package ai.mangamotion.backend.websocket;

import ai.mangamotion.backend.model.ProjectStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class ProgressPublisher {

    private final SimpMessagingTemplate messagingTemplate;

    public void publish(UUID projectId, ProjectStatus status, String message, int percent) {
        messagingTemplate.convertAndSend(
                "/topic/projects/" + projectId + "/progress",
                new ProgressMessage(status.name(), message, percent)
        );
    }

    public record ProgressMessage(String status, String message, int percent) {}
}

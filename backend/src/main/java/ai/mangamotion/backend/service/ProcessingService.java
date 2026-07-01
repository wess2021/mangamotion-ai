package ai.mangamotion.backend.service;

import ai.mangamotion.backend.model.Panel;
import ai.mangamotion.backend.model.Project;
import ai.mangamotion.backend.model.ProjectStatus;
import ai.mangamotion.backend.repository.ProjectRepository;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProcessingService {

    private final ProjectRepository projectRepository;
    private final ProjectService projectService;
    private final RestClient aiServiceClient;

    @Value("${mangamotion.storage-path}")
    private String storagePath;

    @Async
    public void processChapterAsync(UUID projectId, Path uploadedFile) {
        try {
            runPipeline(projectId, uploadedFile);
        } catch (Exception ex) {
            Project project = projectService.findProject(projectId);
            project.setStatus(ProjectStatus.FAILED);
            project.setProgressMessage("Processing failed: " + ex.getMessage());
            projectRepository.save(project);
        }
    }

    @Transactional
    protected void runPipeline(UUID projectId, Path uploadedFile) {
        Project project = projectService.findProject(projectId);

        projectService.updateProgress(project, ProjectStatus.EXTRACTING_PAGES, "Extracting pages...", 20);
        JsonNode extractResponse = aiServiceClient.post()
                .uri("/api/extract-pages")
                .body(new ExtractPagesRequest(projectId.toString(), uploadedFile.toString()))
                .retrieve()
                .body(JsonNode.class);

        projectService.updateProgress(project, ProjectStatus.DETECTING_PANELS, "Detecting panels...", 40);
        JsonNode panelResponse = aiServiceClient.post()
                .uri("/api/detect-panels")
                .body(new DetectPanelsRequest(
                        projectId.toString(),
                        extractResponse.path("pages")
                ))
                .retrieve()
                .body(JsonNode.class);

        project.getPanels().clear();
        List<Panel> panels = new ArrayList<>();
        int sortOrder = 0;
        for (JsonNode panelNode : panelResponse.path("panels")) {
            Panel panel = new Panel();
            panel.setProject(project);
            panel.setPageNumber(panelNode.path("page_number").asInt());
            panel.setPanelNumber(panelNode.path("panel_number").asInt());
            panel.setImagePath(panelNode.path("image_path").asText());
            panel.setX(panelNode.path("x").asInt());
            panel.setY(panelNode.path("y").asInt());
            panel.setWidth(panelNode.path("width").asInt());
            panel.setHeight(panelNode.path("height").asInt());
            panel.setSortOrder(sortOrder++);
            panels.add(panel);
        }
        project.getPanels().addAll(panels);
        projectRepository.save(project);

        projectService.updateProgress(project, ProjectStatus.OCR, "Reading dialogue...", 55);
        aiServiceClient.post()
                .uri("/api/ocr")
                .body(new OcrRequest(projectId.toString()))
                .retrieve()
                .toBodilessEntity();

        projectService.updateProgress(project, ProjectStatus.STORY_ANALYSIS, "Understanding story...", 70);
        projectService.updateProgress(project, ProjectStatus.PROMPT_GENERATION, "Generating cinematic prompts...", 80);
        projectService.updateProgress(project, ProjectStatus.READY, "Panel detection complete — ready for storyboard", 100);
    }

    private record ExtractPagesRequest(String project_id, String source_path) {}
    private record DetectPanelsRequest(String project_id, JsonNode pages) {}
    private record OcrRequest(String project_id) {}
}

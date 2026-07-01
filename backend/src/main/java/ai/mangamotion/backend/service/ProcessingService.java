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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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

        // Phase 2 — Extract pages
        projectService.updateProgress(project, ProjectStatus.EXTRACTING_PAGES, "Extracting pages...", 15);
        JsonNode extractResponse = aiServiceClient.post()
                .uri("/api/extract-pages")
                .body(new ExtractPagesRequest(projectId.toString(), uploadedFile.toString()))
                .retrieve()
                .body(JsonNode.class);

        // Phase 2 — Detect panels
        projectService.updateProgress(project, ProjectStatus.DETECTING_PANELS, "Detecting panels...", 30);
        JsonNode panelResponse = aiServiceClient.post()
                .uri("/api/detect-panels")
                .body(new DetectPanelsRequest(projectId.toString(), extractResponse.path("pages")))
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

        // Phase 3 — OCR
        projectService.updateProgress(project, ProjectStatus.OCR, "Reading dialogue...", 50);
        JsonNode ocrResponse = aiServiceClient.post()
                .uri("/api/ocr")
                .body(new OcrRequest(projectId.toString()))
                .retrieve()
                .body(JsonNode.class);

        // Build OCR text grouped by panel stem name
        Map<String, StringBuilder> ocrByPanel = new HashMap<>();
        for (JsonNode line : ocrResponse.path("lines")) {
            String panelId = line.path("panel_id").asText();
            String text = line.path("text").asText();
            ocrByPanel.computeIfAbsent(panelId, k -> new StringBuilder()).append(text).append("\n");
        }

        // Phase 3 — Story analysis
        projectService.updateProgress(project, ProjectStatus.STORY_ANALYSIS, "Understanding story...", 65);
        JsonNode storyResponse = aiServiceClient.post()
                .uri("/api/story/analyze")
                .body(new StoryAnalysisRequest(projectId.toString(), ocrResponse.path("lines")))
                .retrieve()
                .body(JsonNode.class);

        // Phase 3 — Prompt generation
        projectService.updateProgress(project, ProjectStatus.PROMPT_GENERATION, "Generating cinematic prompts...", 80);
        JsonNode promptResponse = aiServiceClient.post()
                .uri("/api/story/prompts")
                .body(new BulkPromptRequest(projectId.toString()))
                .retrieve()
                .body(JsonNode.class);

        // Build prompt map by panel stem name
        Map<String, String> promptByPanel = new HashMap<>();
        for (JsonNode promptNode : promptResponse.path("prompts")) {
            promptByPanel.put(promptNode.path("panel_id").asText(), promptNode.path("cinematic_prompt").asText());
        }

        // Persist OCR text and prompts onto each panel
        project = projectService.findProject(projectId);
        for (Panel panel : project.getPanels()) {
            String stem = Path.of(panel.getImagePath()).getFileName().toString().replaceFirst("[.][^.]+$", "");
            if (ocrByPanel.containsKey(stem)) {
                panel.setOcrText(ocrByPanel.get(stem).toString().trim());
            }
            if (promptByPanel.containsKey(stem)) {
                panel.setCinematicPrompt(promptByPanel.get(stem));
            }
        }
        projectRepository.save(project);

        projectService.updateProgress(project, ProjectStatus.READY, "Ready for storyboard — prompts generated", 100);
    }

    private record ExtractPagesRequest(String project_id, String source_path) {}
    private record DetectPanelsRequest(String project_id, JsonNode pages) {}
    private record OcrRequest(String project_id) {}
    private record StoryAnalysisRequest(String project_id, JsonNode ocr_lines) {}
    private record BulkPromptRequest(String project_id) {}
}

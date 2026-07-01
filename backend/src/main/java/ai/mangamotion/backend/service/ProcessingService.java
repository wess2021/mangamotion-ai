package ai.mangamotion.backend.service;

import ai.mangamotion.backend.model.Panel;
import ai.mangamotion.backend.model.Project;
import ai.mangamotion.backend.model.ProjectStatus;
import ai.mangamotion.backend.repository.ProjectRepository;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger log = LoggerFactory.getLogger(ProcessingService.class);

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
            log.error("Pipeline failed for project {}", projectId, ex);
            Project project = projectService.findProject(projectId);
            project.setStatus(ProjectStatus.FAILED);
            project.setProgressMessage("Processing failed: " + ex.getMessage());
            projectRepository.save(project);
        }
    }

    @Async
    public void generateVideosAsync(UUID projectId) {
        try {
            runVideoGeneration(projectId);
        } catch (Exception ex) {
            log.error("Video generation failed for project {}", projectId, ex);
            Project project = projectService.findProject(projectId);
            project.setStatus(ProjectStatus.FAILED);
            project.setProgressMessage("Video generation failed: " + ex.getMessage());
            projectRepository.save(project);
        }
    }

    @Transactional
    protected void runPipeline(UUID projectId, Path uploadedFile) {
        Project project = projectService.findProject(projectId);

        // Phase 2 — Extract pages
        projectService.updateProgress(project, ProjectStatus.EXTRACTING_PAGES, "Extracting pages...", 10);
        JsonNode extractResponse = aiServiceClient.post()
                .uri("/api/extract-pages")
                .body(new ExtractPagesRequest(projectId.toString(), uploadedFile.toString()))
                .retrieve()
                .body(JsonNode.class);

        // Phase 2 — Detect panels
        projectService.updateProgress(project, ProjectStatus.DETECTING_PANELS, "Detecting panels...", 25);
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
        projectService.updateProgress(project, ProjectStatus.OCR, "Reading dialogue...", 40);
        JsonNode ocrResponse = aiServiceClient.post()
                .uri("/api/ocr")
                .body(new OcrRequest(projectId.toString()))
                .retrieve()
                .body(JsonNode.class);

        Map<String, StringBuilder> ocrByPanel = new HashMap<>();
        for (JsonNode line : ocrResponse.path("lines")) {
            String panelId = line.path("panel_id").asText();
            String text = line.path("text").asText();
            ocrByPanel.computeIfAbsent(panelId, k -> new StringBuilder()).append(text).append("\n");
        }

        // Phase 3 — Story analysis
        projectService.updateProgress(project, ProjectStatus.STORY_ANALYSIS, "Understanding story...", 55);
        aiServiceClient.post()
                .uri("/api/story/analyze")
                .body(new StoryAnalysisRequest(projectId.toString(), ocrResponse.path("lines")))
                .retrieve()
                .body(JsonNode.class);

        // Phase 3 — Prompt generation
        projectService.updateProgress(project, ProjectStatus.PROMPT_GENERATION, "Generating cinematic prompts...", 70);
        JsonNode promptResponse = aiServiceClient.post()
                .uri("/api/story/prompts")
                .body(new BulkPromptRequest(projectId.toString()))
                .retrieve()
                .body(JsonNode.class);

        Map<String, String> promptByPanel = new HashMap<>();
        for (JsonNode promptNode : promptResponse.path("prompts")) {
            promptByPanel.put(promptNode.path("panel_id").asText(), promptNode.path("cinematic_prompt").asText());
        }

        // Persist OCR + prompts
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

        projectService.updateProgress(project, ProjectStatus.READY, "Prompts ready — generating videos...", 75);

        // Phase 4 — Video generation (runs inline after prompts)
        runVideoGeneration(projectId);
    }

    @Transactional
    public void runVideoGeneration(UUID projectId) {
        Project project = projectService.findProject(projectId);
        List<Panel> panels = project.getPanels();
        int total = panels.size();

        if (total == 0) {
            projectService.updateProgress(project, ProjectStatus.READY, "No panels to animate", 100);
            return;
        }

        projectService.updateProgress(project, ProjectStatus.VIDEO_GENERATION, "Animating panels...", 80);

        List<Map<String, Object>> panelPayloads = new ArrayList<>();
        for (Panel panel : panels) {
            String prompt = panel.getCinematicPrompt() != null
                    ? panel.getCinematicPrompt()
                    : "Cinematic anime scene. High quality. Fluid motion.";
            String stem = Path.of(panel.getImagePath()).getFileName().toString().replaceFirst("[.][^.]+$", "");
            Map<String, Object> entry = new HashMap<>();
            entry.put("panel_id", stem);
            entry.put("image_path", panel.getImagePath());
            entry.put("prompt", prompt);
            entry.put("duration_seconds", 6.0);
            panelPayloads.add(entry);
        }

        JsonNode bulkResult = aiServiceClient.post()
                .uri("/api/video/generate-bulk")
                .body(new BulkVideoRequest(projectId.toString(), panelPayloads))
                .retrieve()
                .body(JsonNode.class);

        // Map video paths back to panels by stem
        Map<String, String> videoByPanelStem = new HashMap<>();
        for (JsonNode result : bulkResult.path("results")) {
            String panelId = result.path("panel_id").asText();
            String videoPath = result.path("video_path").asText();
            if (!videoPath.isBlank()) {
                videoByPanelStem.put(panelId, videoPath);
            }
        }

        project = projectService.findProject(projectId);
        for (Panel panel : project.getPanels()) {
            String stem = Path.of(panel.getImagePath()).getFileName().toString().replaceFirst("[.][^.]+$", "");
            if (videoByPanelStem.containsKey(stem)) {
                panel.setVideoPath(videoByPanelStem.get(stem));
            }
        }
        projectRepository.save(project);

        long generated = videoByPanelStem.size();
        String msg = generated + "/" + total + " panels animated — ready for storyboard";
        projectService.updateProgress(project, ProjectStatus.READY, msg, 100);
        log.info("Video generation complete for project {}: {}", projectId, msg);
    }

    private record ExtractPagesRequest(String project_id, String source_path) {}
    private record DetectPanelsRequest(String project_id, JsonNode pages) {}
    private record OcrRequest(String project_id) {}
    private record StoryAnalysisRequest(String project_id, JsonNode ocr_lines) {}
    private record BulkPromptRequest(String project_id) {}
    private record BulkVideoRequest(String project_id, List<Map<String, Object>> panels) {}
}

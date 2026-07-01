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
import java.util.*;

@Service
@RequiredArgsConstructor
public class ProcessingService {

    private static final Logger log = LoggerFactory.getLogger(ProcessingService.class);

    private final ProjectRepository projectRepository;
    private final ProjectService projectService;
    private final RestClient aiServiceClient;

    @Value("${mangamotion.storage-path}")
    private String storagePath;

    // ─── Public entry points ──────────────────────────────────────────────────

    @Async
    public void processChapterAsync(UUID projectId, Path uploadedFile) {
        try {
            runPipeline(projectId, uploadedFile);
        } catch (Exception ex) {
            log.error("Pipeline failed for project {}", projectId, ex);
            fail(projectId, "Processing failed: " + ex.getMessage());
        }
    }

    @Async
    public void generateVideosAsync(UUID projectId) {
        try {
            runVideoGeneration(projectId);
        } catch (Exception ex) {
            log.error("Video generation failed for project {}", projectId, ex);
            fail(projectId, "Video generation failed: " + ex.getMessage());
        }
    }

    @Async
    public void generateAudioAsync(UUID projectId) {
        try {
            runAudioPipeline(projectId);
        } catch (Exception ex) {
            log.error("Audio generation failed for project {}", projectId, ex);
            fail(projectId, "Audio generation failed: " + ex.getMessage());
        }
    }

    // ─── Full pipeline ────────────────────────────────────────────────────────

    @Transactional
    protected void runPipeline(UUID projectId, Path uploadedFile) {
        Project project = projectService.findProject(projectId);

        // Phase 2 — Extract pages
        projectService.updateProgress(project, ProjectStatus.EXTRACTING_PAGES, "Extracting pages...", 5);
        JsonNode extractResponse = post("/api/extract-pages",
                new ExtractPagesRequest(projectId.toString(), uploadedFile.toString()));

        // Phase 2 — Detect panels
        projectService.updateProgress(project, ProjectStatus.DETECTING_PANELS, "Detecting panels...", 15);
        JsonNode panelResponse = post("/api/detect-panels",
                new DetectPanelsRequest(projectId.toString(), extractResponse.path("pages")));

        project.getPanels().clear();
        List<Panel> panels = new ArrayList<>();
        int sortOrder = 0;
        for (JsonNode n : panelResponse.path("panels")) {
            Panel p = new Panel();
            p.setProject(project);
            p.setPageNumber(n.path("page_number").asInt());
            p.setPanelNumber(n.path("panel_number").asInt());
            p.setImagePath(n.path("image_path").asText());
            p.setX(n.path("x").asInt());
            p.setY(n.path("y").asInt());
            p.setWidth(n.path("width").asInt());
            p.setHeight(n.path("height").asInt());
            p.setSortOrder(sortOrder++);
            panels.add(p);
        }
        project.getPanels().addAll(panels);
        projectRepository.save(project);

        // Phase 3 — OCR
        projectService.updateProgress(project, ProjectStatus.OCR, "Reading dialogue...", 30);
        JsonNode ocrResponse = post("/api/ocr", new OcrRequest(projectId.toString()));

        Map<String, StringBuilder> ocrByPanel = new HashMap<>();
        for (JsonNode line : ocrResponse.path("lines")) {
            ocrByPanel.computeIfAbsent(line.path("panel_id").asText(), k -> new StringBuilder())
                      .append(line.path("text").asText()).append("\n");
        }

        // Phase 3 — Story analysis
        projectService.updateProgress(project, ProjectStatus.STORY_ANALYSIS, "Understanding story...", 40);
        JsonNode storyResponse = post("/api/story/analyze",
                new StoryAnalysisRequest(projectId.toString(), ocrResponse.path("lines")));

        String dominantMood = "calm";
        for (JsonNode scene : storyResponse.path("scenes")) {
            String emotion = scene.path("emotion").asText("calm");
            if (!emotion.isBlank()) { dominantMood = emotion; break; }
        }

        // Phase 3 — Prompt generation
        projectService.updateProgress(project, ProjectStatus.PROMPT_GENERATION, "Generating cinematic prompts...", 50);
        JsonNode promptResponse = post("/api/story/prompts", new BulkPromptRequest(projectId.toString()));

        Map<String, String> promptByPanel = new HashMap<>();
        for (JsonNode n : promptResponse.path("prompts")) {
            promptByPanel.put(n.path("panel_id").asText(), n.path("cinematic_prompt").asText());
        }

        // Persist OCR + prompts + mood
        project = projectService.findProject(projectId);
        project.setDominantMood(dominantMood);
        for (Panel p : project.getPanels()) {
            String stem = stem(p.getImagePath());
            if (ocrByPanel.containsKey(stem))   p.setOcrText(ocrByPanel.get(stem).toString().trim());
            if (promptByPanel.containsKey(stem)) p.setCinematicPrompt(promptByPanel.get(stem));
        }
        projectRepository.save(project);

        // Phase 4 — Video generation
        projectService.updateProgress(project, ProjectStatus.VIDEO_GENERATION, "Animating panels...", 60);
        runVideoGeneration(projectId);

        // Phase 5 — Audio generation
        runAudioPipeline(projectId);
    }

    // ─── Phase 4 — Video generation ──────────────────────────────────────────

    @Transactional
    public void runVideoGeneration(UUID projectId) {
        Project project = projectService.findProject(projectId);
        List<Panel> panels = project.getPanels();
        if (panels.isEmpty()) {
            projectService.updateProgress(project, ProjectStatus.READY, "No panels to animate", 100);
            return;
        }

        projectService.updateProgress(project, ProjectStatus.VIDEO_GENERATION, "Animating panels...", 60);

        List<Map<String, Object>> payloads = new ArrayList<>();
        for (Panel p : panels) {
            String prompt = p.getCinematicPrompt() != null
                    ? p.getCinematicPrompt() : "Cinematic anime scene. High quality.";
            payloads.add(Map.of(
                    "panel_id", stem(p.getImagePath()),
                    "image_path", p.getImagePath(),
                    "prompt", prompt,
                    "duration_seconds", 6.0
            ));
        }

        JsonNode bulkResult = post("/api/video/generate-bulk",
                new BulkVideoRequest(projectId.toString(), payloads));

        Map<String, String> videoByPanel = new HashMap<>();
        for (JsonNode r : bulkResult.path("results")) {
            String pid  = r.path("panel_id").asText();
            String vpath = r.path("video_path").asText();
            if (!vpath.isBlank()) videoByPanel.put(pid, vpath);
        }

        project = projectService.findProject(projectId);
        for (Panel p : project.getPanels()) {
            String s = stem(p.getImagePath());
            if (videoByPanel.containsKey(s)) p.setVideoPath(videoByPanel.get(s));
        }
        projectRepository.save(project);
        log.info("Video done for project {}: {}/{} panels", projectId, videoByPanel.size(), panels.size());
    }

    // ─── Phase 5 — Audio pipeline ─────────────────────────────────────────────

    @Transactional
    public void runAudioPipeline(UUID projectId) {
        Project project = projectService.findProject(projectId);
        List<Panel> panels = project.getPanels();

        projectService.updateProgress(project, ProjectStatus.VOICE_GENERATION, "Generating voices...", 82);

        String mood = project.getDominantMood() != null ? project.getDominantMood() : "calm";
        double totalDuration = panels.size() * 6.0;

        List<Map<String, Object>> panelPayloads = new ArrayList<>();
        for (Panel p : panels) {
            panelPayloads.add(Map.of(
                    "panel_id", stem(p.getImagePath()),
                    "ocr_text",  p.getOcrText() != null ? p.getOcrText() : "",
                    "character", "narrator"
            ));
        }

        projectService.updateProgress(project, ProjectStatus.AUDIO_GENERATION, "Generating music & SFX...", 90);
        JsonNode audioResult = post("/api/audio/pipeline", new AudioPipelineRequest(
                projectId.toString(), panelPayloads, mood, totalDuration));

        String musicPath = audioResult.path("music_path").asText(null);
        Map<String, String> voiceMap = new HashMap<>();
        Map<String, String> sfxMap   = new HashMap<>();

        audioResult.path("panel_voices").fields().forEachRemaining(e ->
                voiceMap.put(e.getKey(), e.getValue().asText()));
        audioResult.path("panel_sfx").fields().forEachRemaining(e ->
                sfxMap.put(e.getKey(), e.getValue().asText()));

        project = projectService.findProject(projectId);
        if (musicPath != null && !musicPath.isBlank()) project.setMusicPath(musicPath);

        for (Panel p : project.getPanels()) {
            String s = stem(p.getImagePath());
            if (voiceMap.containsKey(s)) p.setVoicePath(voiceMap.get(s));
            if (sfxMap.containsKey(s))   p.setSfxPath(sfxMap.get(s));
        }
        projectRepository.save(project);

        long voices = voiceMap.size();
        long sfx    = sfxMap.size();
        String msg  = voices + " voices, " + sfx + " SFX, music ready — all done!";
        projectService.updateProgress(project, ProjectStatus.READY, msg, 100);
        log.info("Audio pipeline complete for project {}: {}", projectId, msg);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private JsonNode post(String uri, Object body) {
        return aiServiceClient.post().uri(uri).body(body).retrieve().body(JsonNode.class);
    }

    private void fail(UUID projectId, String msg) {
        try {
            Project project = projectService.findProject(projectId);
            project.setStatus(ProjectStatus.FAILED);
            project.setProgressMessage(msg);
            projectRepository.save(project);
        } catch (Exception ignored) {}
    }

    private static String stem(String filePath) {
        return Path.of(filePath).getFileName().toString().replaceFirst("[.][^.]+$", "");
    }

    // ─── Request records ─────────────────────────────────────────────────────

    private record ExtractPagesRequest(String project_id, String source_path) {}
    private record DetectPanelsRequest(String project_id, JsonNode pages) {}
    private record OcrRequest(String project_id) {}
    private record StoryAnalysisRequest(String project_id, JsonNode ocr_lines) {}
    private record BulkPromptRequest(String project_id) {}
    private record BulkVideoRequest(String project_id, List<Map<String, Object>> panels) {}
    private record AudioPipelineRequest(
            String project_id,
            List<Map<String, Object>> panels,
            String dominant_mood,
            double total_duration) {}
}

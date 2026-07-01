package ai.mangamotion.backend.controller;

import ai.mangamotion.backend.dto.PanelResponse;
import ai.mangamotion.backend.dto.ProjectResponse;
import ai.mangamotion.backend.model.Panel;
import ai.mangamotion.backend.model.Project;
import ai.mangamotion.backend.service.ProcessingService;
import ai.mangamotion.backend.service.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;
    private final ProcessingService processingService;

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok", "service", "mangamotion-backend");
    }

    @GetMapping("/projects")
    public List<ProjectResponse> listProjects() {
        return projectService.listProjects();
    }

    @PostMapping("/projects")
    public ProjectResponse createProject(@RequestBody(required = false) Map<String, String> body) {
        String title = body == null ? null : body.get("title");
        return projectService.createProject(title);
    }

    @GetMapping("/projects/{id}")
    public ProjectResponse getProject(@PathVariable UUID id) {
        return projectService.getProject(id);
    }

    @GetMapping("/projects/{id}/panels")
    public List<PanelResponse> getPanels(@PathVariable UUID id) {
        return projectService.getPanels(id);
    }

    @PostMapping(value = "/projects/{id}/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ProjectResponse uploadChapter(
            @PathVariable UUID id,
            @RequestPart("file") MultipartFile file
    ) throws IOException {
        return projectService.uploadChapter(id, file);
    }

    @PostMapping("/projects/{id}/generate-videos")
    public ResponseEntity<Map<String, String>> generateVideos(@PathVariable UUID id) {
        Project project = projectService.findProject(id);
        processingService.generateVideosAsync(project.getId());
        return ResponseEntity.accepted().body(Map.of("message", "Video generation started"));
    }

    @PostMapping("/projects/{id}/generate-audio")
    public ResponseEntity<Map<String, String>> generateAudio(@PathVariable UUID id) {
        Project project = projectService.findProject(id);
        processingService.generateAudioAsync(project.getId());
        return ResponseEntity.accepted().body(Map.of("message", "Audio generation started"));
    }

    // ─── Static file serve endpoints ────────────────────────────────────────

    @GetMapping("/projects/{projectId}/panels/{panelId}/image")
    public ResponseEntity<Resource> getPanelImage(
            @PathVariable UUID projectId, @PathVariable UUID panelId) throws IOException {
        Panel panel = projectService.findPanel(projectId, panelId);
        return serveFile(panel.getImagePath(), "image/png", 86400);
    }

    @GetMapping("/projects/{projectId}/panels/{panelId}/video")
    public ResponseEntity<Resource> getPanelVideo(
            @PathVariable UUID projectId, @PathVariable UUID panelId) throws IOException {
        Panel panel = projectService.findPanel(projectId, panelId);
        return serveFile(panel.getVideoPath(), "video/mp4", 3600);
    }

    @GetMapping("/projects/{projectId}/panels/{panelId}/voice")
    public ResponseEntity<Resource> getPanelVoice(
            @PathVariable UUID projectId, @PathVariable UUID panelId) throws IOException {
        Panel panel = projectService.findPanel(projectId, panelId);
        return serveFile(panel.getVoicePath(), "audio/mpeg", 3600);
    }

    @GetMapping("/projects/{projectId}/panels/{panelId}/sfx")
    public ResponseEntity<Resource> getPanelSfx(
            @PathVariable UUID projectId, @PathVariable UUID panelId) throws IOException {
        Panel panel = projectService.findPanel(projectId, panelId);
        return serveFile(panel.getSfxPath(), "audio/mpeg", 3600);
    }

    @GetMapping("/projects/{projectId}/audio/music")
    public ResponseEntity<Resource> getProjectMusic(@PathVariable UUID projectId) throws IOException {
        Project project = projectService.findProject(projectId);
        return serveFile(project.getMusicPath(), "audio/mpeg", 3600);
    }

    // ─── Helper ──────────────────────────────────────────────────────────────

    private ResponseEntity<Resource> serveFile(String filePath, String contentType, long cacheSeconds)
            throws IOException {
        if (filePath == null || filePath.isBlank()) return ResponseEntity.notFound().build();
        Path path = Path.of(filePath);
        if (!Files.exists(path)) return ResponseEntity.notFound().build();
        String ct = contentType;
        if (ct.startsWith("image")) {
            String probed = Files.probeContentType(path);
            if (probed != null) ct = probed;
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, ct)
                .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=" + cacheSeconds)
                .body(new FileSystemResource(path));
    }
}

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
        return ResponseEntity.accepted().body(Map.of(
                "message", "Video generation started",
                "projectId", id.toString()
        ));
    }

    @GetMapping("/projects/{projectId}/panels/{panelId}/image")
    public ResponseEntity<Resource> getPanelImage(
            @PathVariable UUID projectId,
            @PathVariable UUID panelId
    ) throws IOException {
        Panel panel = projectService.findPanel(projectId, panelId);
        Path imagePath = Path.of(panel.getImagePath());
        if (!Files.exists(imagePath)) {
            return ResponseEntity.notFound().build();
        }
        String contentType = Files.probeContentType(imagePath);
        if (contentType == null) contentType = "image/png";
        Resource resource = new FileSystemResource(imagePath);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, contentType)
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                .body(resource);
    }

    @GetMapping("/projects/{projectId}/panels/{panelId}/video")
    public ResponseEntity<Resource> getPanelVideo(
            @PathVariable UUID projectId,
            @PathVariable UUID panelId
    ) throws IOException {
        Panel panel = projectService.findPanel(projectId, panelId);
        if (panel.getVideoPath() == null || panel.getVideoPath().isBlank()) {
            return ResponseEntity.notFound().build();
        }
        Path videoPath = Path.of(panel.getVideoPath());
        if (!Files.exists(videoPath)) {
            return ResponseEntity.notFound().build();
        }
        Resource resource = new FileSystemResource(videoPath);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, "video/mp4")
                .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=3600")
                .body(resource);
    }
}

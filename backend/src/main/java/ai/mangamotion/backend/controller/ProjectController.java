package ai.mangamotion.backend.controller;

import ai.mangamotion.backend.dto.PanelResponse;
import ai.mangamotion.backend.dto.ProjectResponse;
import ai.mangamotion.backend.service.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

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
}

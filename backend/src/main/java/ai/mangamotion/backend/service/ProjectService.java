package ai.mangamotion.backend.service;

import ai.mangamotion.backend.dto.PanelResponse;
import ai.mangamotion.backend.dto.ProjectResponse;
import ai.mangamotion.backend.model.Panel;
import ai.mangamotion.backend.model.Project;
import ai.mangamotion.backend.model.ProjectStatus;
import ai.mangamotion.backend.repository.ProjectRepository;
import ai.mangamotion.backend.websocket.ProgressPublisher;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProcessingService processingService;
    private final ProgressPublisher progressPublisher;

    public ProjectService(ProjectRepository projectRepository,
                          @Lazy ProcessingService processingService,
                          ProgressPublisher progressPublisher) {
        this.projectRepository = projectRepository;
        this.processingService = processingService;
        this.progressPublisher = progressPublisher;
    }

    @Value("${mangamotion.storage-path}")
    private String storagePath;

    @Transactional(readOnly = true)
    public List<ProjectResponse> listProjects() {
        return projectRepository.findAll().stream()
                .sorted(Comparator.comparing(Project::getCreatedAt).reversed())
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ProjectResponse getProject(UUID id) {
        return toResponse(findProject(id));
    }

    @Transactional(readOnly = true)
    public List<PanelResponse> getPanels(UUID projectId) {
        Project project = findProject(projectId);
        return project.getPanels().stream().map(this::toPanelResponse).toList();
    }

    @Transactional
    public ProjectResponse createProject(String title) {
        Project project = new Project();
        project.setTitle(title == null || title.isBlank() ? "Untitled Chapter" : title.trim());
        project.setStatus(ProjectStatus.CREATED);
        project.setProgressMessage("Project created");
        return toResponse(projectRepository.save(project));
    }

    @Transactional
    public ProjectResponse uploadChapter(UUID projectId, MultipartFile file) throws IOException {
        Project project = findProject(projectId);
        Path uploadDir = Path.of(storagePath, "uploads", projectId.toString());
        Files.createDirectories(uploadDir);

        String originalName = file.getOriginalFilename() == null ? "chapter" : file.getOriginalFilename();
        Path destination = uploadDir.resolve(sanitizeFilename(originalName));
        file.transferTo(destination);

        updateProgress(project, ProjectStatus.UPLOADING, "Upload complete", 10);
        processingService.processChapterAsync(projectId, destination);
        return toResponse(project);
    }

    @Transactional
    public void updateProgress(Project project, ProjectStatus status, String message, int percent) {
        project.setStatus(status);
        project.setProgressMessage(message);
        project.setProgressPercent(percent);
        projectRepository.save(project);
        progressPublisher.publish(project.getId(), status, message, percent);
    }

    public Project findProject(UUID id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Project not found: " + id));
    }

    public Panel findPanel(UUID projectId, UUID panelId) {
        Project project = findProject(projectId);
        return project.getPanels().stream()
                .filter(p -> p.getId().equals(panelId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Panel not found: " + panelId));
    }

    private ProjectResponse toResponse(Project project) {
        String base     = "/api/projects/" + project.getId();
        String musicUrl  = project.getMusicPath()  != null ? base + "/audio/music"  : null;
        String exportUrl = project.getExportPath() != null ? base + "/export/video" : null;
        String srtUrl    = project.getSrtPath()    != null ? base + "/export/srt"   : null;
        return new ProjectResponse(
                project.getId(),
                project.getTitle(),
                project.getStatus(),
                project.getProgressMessage(),
                project.getProgressPercent(),
                project.getPanels().size(),
                project.getCreatedAt(),
                project.getUpdatedAt(),
                musicUrl,
                project.getDominantMood(),
                exportUrl,
                srtUrl
        );
    }

    private PanelResponse toPanelResponse(Panel panel) {
        String base = "/api/projects/" + panel.getProject().getId() + "/panels/" + panel.getId();
        String imageUrl  = base + "/image";
        String videoUrl  = panel.getVideoPath()  != null ? base + "/video"  : null;
        String voiceUrl  = panel.getVoicePath()  != null ? base + "/voice"  : null;
        String sfxUrl    = panel.getSfxPath()    != null ? base + "/sfx"    : null;
        return new PanelResponse(
                panel.getId(),
                panel.getPageNumber(),
                panel.getPanelNumber(),
                imageUrl,
                panel.getOcrText(),
                panel.getCinematicPrompt(),
                videoUrl,
                voiceUrl,
                sfxUrl,
                panel.getSortOrder()
        );
    }

    private String sanitizeFilename(String name) {
        return name.replaceAll("[^a-zA-Z0-9._-]", "_");
    }
}

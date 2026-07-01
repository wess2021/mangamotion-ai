package ai.mangamotion.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "projects")
@Getter
@Setter
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProjectStatus status = ProjectStatus.CREATED;

    @Column(nullable = false)
    private String progressMessage = "Waiting to start";

    @Column(nullable = false)
    private int progressPercent = 0;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    @Column(nullable = false)
    private Instant updatedAt = Instant.now();

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("pageNumber ASC, panelNumber ASC")
    private List<Panel> panels = new ArrayList<>();

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}

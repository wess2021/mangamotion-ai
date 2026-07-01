package ai.mangamotion.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "panels")
@Getter
@Setter
public class Panel {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(nullable = false)
    private int pageNumber;

    @Column(nullable = false)
    private int panelNumber;

    @Column(nullable = false)
    private String imagePath;

    private Integer x;
    private Integer y;
    private Integer width;
    private Integer height;

    @Column(columnDefinition = "TEXT")
    private String ocrText;

    @Column(columnDefinition = "TEXT")
    private String cinematicPrompt;

    private String videoPath;
    private String voicePath;
    private String sfxPath;

    @Column(nullable = false)
    private int sortOrder;
}

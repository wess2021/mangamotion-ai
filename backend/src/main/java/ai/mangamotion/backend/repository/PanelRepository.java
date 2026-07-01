package ai.mangamotion.backend.repository;

import ai.mangamotion.backend.model.Panel;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PanelRepository extends JpaRepository<Panel, UUID> {
}

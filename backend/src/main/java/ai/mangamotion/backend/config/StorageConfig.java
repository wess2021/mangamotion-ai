package ai.mangamotion.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

@Configuration
public class StorageConfig {

    @Value("${mangamotion.storage-path}")
    private String storagePath;

    @PostConstruct
    public void initStorage() throws IOException {
        Files.createDirectories(Path.of(storagePath));
        Files.createDirectories(Path.of(storagePath, "uploads"));
        Files.createDirectories(Path.of(storagePath, "outputs"));
    }
}

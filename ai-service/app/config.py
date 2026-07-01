from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    storage_path: str = "./storage"
    models_path: str = "./models"

    ocr_backend: str = "auto"

    llm_endpoint: str = ""
    llm_model: str = "qwen3"

    video_backend: str = "mock"
    video_duration: float = 6.0

    audio_backend: str = "mock"

    class Config:
        env_file = ".env"


settings = Settings()

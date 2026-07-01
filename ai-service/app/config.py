from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    storage_path: str = "./storage"
    models_path: str = "./models"

    ocr_backend: str = "auto"

    llm_endpoint: str = ""
    llm_model: str = "qwen3"

    class Config:
        env_file = ".env"


settings = Settings()

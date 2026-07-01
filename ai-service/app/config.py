from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    storage_path: str = "./storage"
    models_path: str = "./models"

    class Config:
        env_file = ".env"


settings = Settings()

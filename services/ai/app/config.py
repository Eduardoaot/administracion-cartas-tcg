from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuración del servicio de IA, leída de variables de entorno."""

    model_config = SettingsConfigDict(env_file=None, extra="ignore")

    ai_device: Literal["cpu", "cuda", "auto"] = "cpu"
    ai_segmenter: Literal["opencv", "sam3"] = "opencv"
    ollama_url: str = "http://ollama:11434"
    ollama_vision_model: str = "llama3.2-vision:11b"
    ollama_text_model: str = "llama3.2:3b"
    health_timeout_s: float = 2.0


@lru_cache
def get_settings() -> Settings:
    return Settings()

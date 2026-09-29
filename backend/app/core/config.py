"""
HomeIQ — Centralized Application Configuration (Pydantic v2 BaseSettings).

Simplified & Audited Configuration:
- Single Gemini credential (`GEMINI_API_KEY`) shared across extraction, routing, and embeddings.
- Model names (`GEMINI_FLASH_MODEL`, `GEMINI_PRO_MODEL`, `GEMINI_EMBEDDING_MODEL`) are non-secret configuration values with safe defaults.
- Zero unused external broker/telemetry variables; localhost defaults work out-of-the-box.
"""
from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # --- Application Runtime ---
    APP_NAME: str = "HomeIQ API"
    APP_ENV: Literal["development", "staging", "production", "test"] = "development"
    APP_VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api/v1"
    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    ALLOWED_ORIGINS: list[str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000"]
    )

    # --- Database (PostgreSQL 16 + pgvector, or SQLite for local/test) ---
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://homeiq:homeiq_local_dev_pw@localhost:5432/homeiq_core"
    )
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_ECHO_SQL: bool = False

    # --- Local Document Vault Storage ---
    DOCUMENT_STORAGE_DIR: str = "/tmp/homeiq_document_vault"

    # --- Gemini AI & Grounded Intelligence Plane ---
    # Single API credential used across Flash, Pro, and Embeddings
    GEMINI_API_KEY: str = Field(default="")
    GEMINI_PRO_MODEL: str = "gemini-2.5-pro"
    GEMINI_FLASH_MODEL: str = "gemini-2.5-flash"
    GEMINI_EMBEDDING_MODEL: str = "text-embedding-004"
    RAG_TOP_K_CHUNKS: int = 5
    RAG_MIN_SIMILARITY_SCORE: float = 0.72
    REQUIRE_HUMAN_APPROVAL_FOR_CONSEQUENTIAL_TOOLS: bool = True

    # --- Security & Authentication ---
    JWT_SECRET_KEY: str = Field(
        default="dev-only-jwt-secret-replace-Via-secret-manager-in-prod-32b"
    )
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

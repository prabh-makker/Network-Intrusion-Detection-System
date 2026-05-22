from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional
import os
import logging

logger = logging.getLogger(__name__)

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        extra="ignore"
    )

    PROJECT_NAME: str = "Network Intrusion Detection System"
    API_V1_STR: str = "/api/v1"

    # In production, SECRET_KEY MUST be set via environment variable (min 32 chars)
    SECRET_KEY: str = os.getenv("SECRET_KEY") or "dev-key-not-for-production-replace-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours (security best practice)

    CORS_ORIGINS: str = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3001,http://localhost:3000,http://localhost:3002,http://127.0.0.1:3001,http://127.0.0.1:3000,http://127.0.0.1:3002"
    )

    # DATABASE (Defaults to SQLite for seamless local execution)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./nids.db")

    # SMTP for OTP emails
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM: str = os.getenv("SMTP_FROM", "")

    # ENVIRONMENT
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # ALERTS
    DISCORD_WEBHOOK_URL: Optional[str] = os.getenv("DISCORD_WEBHOOK_URL")

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

settings = Settings()

# Validate SECRET_KEY in production
_PROD_ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower() == "production"
_DEV_KEY = "dev-key-not-for-production-replace-me"
if _PROD_ENVIRONMENT and (
    not os.getenv("SECRET_KEY")
    or settings.SECRET_KEY == _DEV_KEY
    or len(settings.SECRET_KEY) < 32
):
    raise ValueError(
        "CRITICAL: SECRET_KEY environment variable must be set before deploying to production. "
        "Generate a secure key: python -c \"import secrets; print(secrets.token_urlsafe(32))\""
    )

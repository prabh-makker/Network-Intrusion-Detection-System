from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional
import os
import logging

logger = logging.getLogger(__name__)

_INSECURE_KEY = "DEVELOPMENT_ONLY_INSECURE_KEY_REPLACE_IN_PROD"

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        extra="ignore"
    )

    PROJECT_NAME: str = "Network Intrusion Detection System"
    API_V1_STR: str = "/api/v1"

    SECRET_KEY: str = os.getenv("SECRET_KEY", _INSECURE_KEY)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8  # 8 hours

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

    # ALERTS
    DISCORD_WEBHOOK_URL: Optional[str] = os.getenv("DISCORD_WEBHOOK_URL")

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

settings = Settings()

if settings.SECRET_KEY == _INSECURE_KEY:
    raise RuntimeError(
        "SECRET_KEY is using the insecure development default. "
        "Set the SECRET_KEY environment variable before starting. "
        "Example: SECRET_KEY=$(python -c \"import secrets; print(secrets.token_hex(32))\")"
    )

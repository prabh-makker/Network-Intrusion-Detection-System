from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional
import os

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        case_sensitive=True, 
        env_file=".env",
        extra="ignore"
    )

    PROJECT_NAME: str = "Network Intrusion Detection System"
    API_V1_STR: str = "/api/v1"
    
    # IMPORTANT: In production, set this via environment variable
    # Using a fallback for local development only
    SECRET_KEY: str = os.getenv("SECRET_KEY", "DEVELOPMENT_ONLY_INSECURE_KEY_REPLACE_IN_PROD")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
    # DATABASE (Defaults to SQLite for seamless local execution)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./nids.db")
    
    # ALERTS
    DISCORD_WEBHOOK_URL: Optional[str] = os.getenv("DISCORD_WEBHOOK_URL")

settings = Settings()

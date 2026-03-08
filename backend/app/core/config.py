from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "Network Intrusion Detection System"
    API_V1_STR: str = "/api/v1"
    
    # DATABASE (Defaults to SQLite for seamless local execution)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./nids.db")

    class Config:
        case_sensitive = True

settings = Settings()

import os
import json
from pathlib import Path
from typing import List
from dotenv import load_dotenv

# Explicitly load .env from backend root directory
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

class Settings:
    PROJECT_NAME: str = "Conferly Conference Management API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Environment & Host
    APP_ENV: str = os.getenv("APP_ENV", "development")
    APP_HOST: str = os.getenv("APP_HOST", "127.0.0.1")
    APP_PORT: int = int(os.getenv("APP_PORT", "8000"))
    
    # MongoDB URI strictly from .env
    MONGODB_URI: str = os.getenv("MONGODB_URI", "")
    MONGODB_DATABASE: str = os.getenv("MONGODB_DATABASE", "conference_management")
    
    # JWT Security from .env
    JWT_SECRET: str = os.getenv("JWT_SECRET_KEY") or os.getenv("JWT_SECRET", "conferly-super-secure-production-jwt-secret-key-2026-xyz987")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")) # 24 hours
    
    # Frontend & Backend URLs from .env
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    BACKEND_URL: str = os.getenv("BACKEND_URL", "http://localhost:8000/api")
    
    # CORS Origins strictly from .env
    @property
    def FRONTEND_ORIGINS(self) -> List[str]:
        raw = os.getenv("CORS_ORIGINS")
        origins = []
        if raw:
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, list):
                    origins.extend(parsed)
                elif isinstance(parsed, str):
                    origins.append(parsed)
            except Exception:
                origins.extend([item.strip() for item in raw.split(",") if item.strip()])
        if self.FRONTEND_URL and self.FRONTEND_URL not in origins:
            origins.append(self.FRONTEND_URL)
        return origins if origins else [self.FRONTEND_URL]
    
    # Timezone
    INSTITUTION_TIMEZONE: str = os.getenv("INSTITUTION_TIMEZONE", "Asia/Kolkata")
    
    # Upload limits
    MAX_UPLOAD_SIZE_MB: int = 5
    ALLOWED_EXTENSIONS: List[str] = [".png", ".jpg", ".jpeg", ".pdf", ".webp"]

    # Cloudinary Image Storage
    CLOUDINARY_CLOUD_NAME: str = os.getenv("CLOUDINARY_CLOUD_NAME", "").strip('"\' ')
    CLOUDINARY_API_KEY: str = os.getenv("CLOUDINARY_API_KEY", "").strip('"\' ')
    CLOUDINARY_API_SECRET: str = os.getenv("CLOUDINARY_API_SECRET", "").strip('"\' ')

    # Brevo Transactional Email Service
    BREVO_API_KEY: str = os.getenv("BREVO_API_KEY", "").strip('"\' ')
    BREVO_SENDER_EMAIL: str = (os.getenv("BREVO_SENDER_EMAIL") or os.getenv("SENDER_EMAIL", "")).strip('"\' ')

settings = Settings()

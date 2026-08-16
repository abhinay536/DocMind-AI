import os
import shutil
import warnings
from pydantic_settings import BaseSettings

warnings.filterwarnings("ignore")
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
os.environ["TOKENIZERS_PARALLELISM"] = "false"
os.environ["TRANSFORMERS_VERBOSITY"] = "error"
os.environ["PYTHONWARNINGS"] = "ignore"


class Settings(BaseSettings):
    PROJECT_NAME: str = "DocMind AI Multi-Modal Platform"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "docmind-super-secret-jwt-key-change-in-production-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./docmind.db")

    # Qdrant Vector Store
    QDRANT_HOST: str = os.getenv("QDRANT_HOST", "localhost")
    QDRANT_PORT: int = int(os.getenv("QDRANT_PORT", "6333"))
    QDRANT_URL: str = os.getenv("QDRANT_URL", "")
    QDRANT_API_KEY: str = os.getenv("QDRANT_API_KEY", "")

    # Storage Paths
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    DATA_DIR: str = os.path.join(BASE_DIR, "data")
    UPLOADS_DIR: str = os.path.join(DATA_DIR, "uploads")
    IMAGES_DIR: str = os.path.join(DATA_DIR, "images")

    # Models
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "google/flan-t5-base")

    # OCR Path
    DEFAULT_TESSERACT: str = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    TESSERACT_CMD: str = os.getenv("TESSERACT_PATH") or shutil.which("tesseract") or (
        DEFAULT_TESSERACT if os.path.exists(DEFAULT_TESSERACT) else "/usr/bin/tesseract"
    )

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
os.makedirs(settings.DATA_DIR, exist_ok=True)
os.makedirs(settings.UPLOADS_DIR, exist_ok=True)
os.makedirs(settings.IMAGES_DIR, exist_ok=True)

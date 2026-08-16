import os
from fastapi import APIRouter, Depends
from app.models import User
from app.security import get_current_user
from app.config import settings

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get("/status")
def get_system_status(current_user: User = Depends(get_current_user)):
    return {
        "groq_configured": bool(os.getenv("GROQ_API_KEY")),
        "gemini_configured": bool(os.getenv("GEMINI_API_KEY")),
        "tesseract_available": bool(settings.TESSERACT_CMD and os.path.exists(settings.TESSERACT_CMD)),
        "embedding_model": settings.EMBEDDING_MODEL,
        "local_llm_model": settings.LLM_MODEL,
        "qdrant_host": settings.QDRANT_HOST
    }

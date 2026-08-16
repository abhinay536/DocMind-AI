from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime


# User Schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# Document Schemas
class DocumentOut(BaseModel):
    id: int
    user_id: int
    filename: str
    doc_hash: str
    status: str
    error_message: Optional[str] = None
    total_chunks: int
    text_chunks: int
    table_chunks: int
    image_chunks: int
    created_at: datetime

    class Config:
        from_attributes = True


# Citation Schema
class Citation(BaseModel):
    rank: int
    source: str
    page: int
    type: str
    relevance_score: float
    content: str
    image_path: Optional[str] = None


# Chat / RAG Schemas
class ChatQueryRequest(BaseModel):
    document_id: int
    question: str
    conversation_id: Optional[int] = None
    engine: Optional[str] = "Local FLAN-T5 (CPU Offline)"
    groq_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None


class MessageOut(BaseModel):
    id: int
    conversation_id: int
    role: str
    content: str
    intent: Optional[str] = None
    telemetry: Optional[str] = None
    citations: Optional[List[Dict[str, Any]]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationOut(BaseModel):
    id: int
    document_id: int
    title: str
    created_at: datetime
    messages: List[MessageOut] = []

    class Config:
        from_attributes = True


class ChatQueryResponse(BaseModel):
    conversation_id: int
    answer: str
    intent: str
    telemetry: str
    citations: List[Citation]
    gen_time_s: float

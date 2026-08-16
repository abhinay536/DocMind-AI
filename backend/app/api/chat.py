import time
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Document, Conversation, Message
from app.schemas import ChatQueryRequest, ChatQueryResponse, ConversationOut
from app.security import get_current_user
from app.services.vector_store import vector_store_service
from app.services.llm_provider import llm_provider_service

router = APIRouter(prefix="/chat", tags=["Chat & RAG"])


@router.post("/query", response_model=ChatQueryResponse)
def query_rag(
    req: ChatQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Document).filter(Document.id == req.document_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found or access denied")

    if doc.status != "READY":
        raise HTTPException(status_code=400, detail=f"Document is not ready for querying yet. Current status: {doc.status}")

    # Conversation setup
    if req.conversation_id:
        conv = db.query(Conversation).filter(
            Conversation.id == req.conversation_id,
            Conversation.user_id == current_user.id
        ).first()
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        conv = Conversation(
            user_id=current_user.id,
            document_id=doc.id,
            title=f"Chat about {doc.filename}"
        )
        db.add(conv)
        db.commit()
        db.refresh(conv)

    # 1. Save user query message
    user_msg = Message(
        conversation_id=conv.id,
        role="user",
        content=req.question
    )
    db.add(user_msg)
    db.commit()

    # 2. Intent Routing & Retrieval (Hybrid FAISS/Qdrant + BM25 + RRF + Cross-Encoder)
    query_lower = req.question.lower()
    if any(w in query_lower for w in ["image", "ocr", "picture", "chart", "figure", "scan"]):
        intent_label = "🖼️ Intent: Image OCR Distance Search"
        t0 = time.time()
        retrieval = vector_store_service.search_images_only(user_id=current_user.id, document_id=doc.id, query=req.question, k=3)
        retrieval_ms = round((time.time() - t0) * 1000, 2)
        telemetry_str = f"⏱ Retrieval: {retrieval_ms}ms"
    elif any(w in query_lower for w in ["table", "gdp", "numeric", "rate", "percent", "%", "revenue", "budget"]):
        intent_label = "📊 Intent: Table Vector Search"
        t0 = time.time()
        retrieval = vector_store_service.search_tables_only(user_id=current_user.id, document_id=doc.id, query=req.question, k=3)
        retrieval_ms = round((time.time() - t0) * 1000, 2)
        telemetry_str = f"⏱ Retrieval: {retrieval_ms}ms"
    else:
        intent_label = "🎯 Intent: Hybrid (Qdrant + BM25 + RRF + Cross-Encoder Re-Ranking)"
        hybrid_out = vector_store_service.search_hybrid(user_id=current_user.id, document_id=doc.id, query=req.question, k=5, rerank=True)
        retrieval = hybrid_out["results"]
        m = hybrid_out["metrics"]
        telemetry_str = f"⏱ Dense: {m['dense_ms']}ms | Sparse: {m['sparse_ms']}ms | Re-Rank: {m['rerank_ms']}ms | Total: {m['total_retrieval_ms']}ms"

    # 3. LLM Generation
    output = llm_provider_service.generate_answer(
        question=req.question,
        search_results=retrieval,
        engine_choice=req.engine,
        groq_api_key=req.groq_api_key,
        gemini_api_key=req.gemini_api_key
    )

    full_telemetry = f"{telemetry_str} | LLM Gen: {output['gen_time_s']}s"

    # 4. Save Assistant Response message
    asst_msg = Message(
        conversation_id=conv.id,
        role="assistant",
        content=output["answer"],
        intent=intent_label,
        telemetry=full_telemetry,
        citations=output["citations"]
    )
    db.add(asst_msg)
    db.commit()

    return ChatQueryResponse(
        conversation_id=conv.id,
        answer=output["answer"],
        intent=intent_label,
        telemetry=full_telemetry,
        citations=output["citations"],
        gen_time_s=output["gen_time_s"]
    )


@router.get("/conversations", response_model=List[ConversationOut])
def list_conversations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Conversation).filter(Conversation.user_id == current_user.id).order_by(Conversation.created_at.desc()).all()


@router.get("/conversations/{conversation_id}", response_model=ConversationOut)
def get_conversation(conversation_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id, Conversation.user_id == current_user.id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(conversation_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id, Conversation.user_id == current_user.id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    db.delete(conv)
    db.commit()
    return None

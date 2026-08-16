import os
import shutil
import hashlib
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Document
from app.schemas import DocumentOut
from app.security import get_current_user
from app.config import settings
from app.services.document_processor import DocumentProcessor
from app.services.vector_store import vector_store_service

router = APIRouter(prefix="/documents", tags=["Documents"])


def process_document_background(doc_id: int, pdf_save_path: str, upload_dir: str, user_id: int):
    db = next(get_db())
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        return

    try:
        doc.status = "PROCESSING"
        db.commit()

        images_dir = os.path.join(upload_dir, "images")
        processor = DocumentProcessor(pdf_save_path, images_dir=images_dir)
        chunks = processor.process_document()
        processor.close()

        doc.status = "INDEXING"
        db.commit()

        vector_store_service.index_document(user_id=user_id, document_id=doc.id, chunks=chunks)

        doc.status = "READY"
        doc.total_chunks = len(chunks)
        doc.text_chunks = sum(1 for c in chunks if c["type"] == "text")
        doc.table_chunks = sum(1 for c in chunks if c["type"] == "table")
        doc.image_chunks = sum(1 for c in chunks if c["type"] == "image")
        db.commit()
    except Exception as e:
        doc.status = "FAILED"
        doc.error_message = str(e)
        db.commit()


@router.post("/upload", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    content = file.file.read()
    if len(content) > 50 * 1024 * 1024:  # 50MB max
        raise HTTPException(status_code=400, detail="File size exceeds 50MB limit")

    doc_hash = hashlib.md5(content).hexdigest()[:12]
    user_upload_dir = os.path.join(settings.UPLOADS_DIR, f"user_{current_user.id}", doc_hash)
    os.makedirs(user_upload_dir, exist_ok=True)

    pdf_save_path = os.path.join(user_upload_dir, file.filename)
    with open(pdf_save_path, "wb") as f:
        f.write(content)

    new_doc = Document(
        user_id=current_user.id,
        filename=file.filename,
        file_path=pdf_save_path,
        doc_hash=doc_hash,
        status="UPLOADED"
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    background_tasks.add_task(
        process_document_background,
        doc_id=new_doc.id,
        pdf_save_path=pdf_save_path,
        upload_dir=user_upload_dir,
        user_id=current_user.id
    )

    return new_doc


@router.get("", response_model=List[DocumentOut])
def list_documents(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Document).filter(Document.user_id == current_user.id).order_by(Document.created_at.desc()).all()


@router.get("/{document_id}", response_model=DocumentOut)
def get_document(document_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    doc = db.query(Document).filter(Document.id == document_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(document_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    doc = db.query(Document).filter(Document.id == document_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if os.path.exists(os.path.dirname(doc.file_path)):
        try:
            shutil.rmtree(os.path.dirname(doc.file_path))
        except Exception:
            pass

    db.delete(doc)
    db.commit()
    return None

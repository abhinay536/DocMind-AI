# ⚡ DocMind AI — Multi-Modal Document Intelligence RAG Platform

A production-grade, multi-modal Retrieval-Augmented Generation (RAG) platform built with **React + TypeScript + Vite**, **FastAPI**, **PostgreSQL**, and **Qdrant Vector Database**.

---

## 🎯 Architecture Overview

```text
React 18 + TypeScript + Vite + Tailwind CSS
                    ↓ (REST API / JWT Auth)
     FastAPI + Pydantic + SQLAlchemy + PostgreSQL
          ↙                   ↘
PostgreSQL (Users & Docs)  Hybrid RAG Pipeline Engine
                           ├── Qdrant Vector DB (Dense Vector Search)
                           ├── BM25Okapi Search (Sparse Lexical Search)
                           ├── Reciprocal Rank Fusion (RRF)
                           ├── Cross-Encoder Re-Ranker (ms-marco-MiniLM-L6-v2)
                           └── LLM Provider Abstraction (Groq / Gemini / FLAN-T5)
```

---

## ✨ Key Technical Features

### 🚀 Production-Grade Tech Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, React Router, Lucide Icons.
- **Backend**: FastAPI, Pydantic v2, SQLAlchemy, PostgreSQL, Passlib (bcrypt), PyJWT authentication.
- **Vector Storage**: Qdrant Vector Database with metadata payload filtering (`user_id`, `document_id`).
- **Relational Database**: PostgreSQL / SQLite for persistent storage of users, documents, conversations, and citations.

### ⚡ FAANG-Grade Multi-Stage Hybrid RAG Engine
- **Dense Vector Search**: Powered by `sentence-transformers/all-MiniLM-L6-v2` and Qdrant.
- **Sparse Lexical Search**: Powered by `BM25Okapi` (`rank-bm25`) for exact keyword and numerical formula matching.
- **Reciprocal Rank Fusion (RRF)**: Merges dense and sparse search rankings via $RRF(d) = \frac{1}{60 + r_{dense}} + \frac{1}{60 + r_{sparse}}$.
- **Two-Stage Cross-Encoder Re-Ranking**: Candidate passages are re-scored with `cross-encoder/ms-marco-MiniLM-L-6-v2` for maximum precision.

### 🖼️ Preserved Multi-Modal Parsing
- Extracts text paragraphs, structural grid table blocks, and performs PyTesseract OCR on visual figures using PyMuPDF.
- Inline Image Evidence Preview: Extracted figure thumbnails render directly inside citation cards.

### 🔑 Flexible LLM Provider & BYOK Model
- **Local Engine (Default)**: `google/flan-t5-base` (100% offline CPU inference).
- **Groq Cloud API (Free)**: `Llama-3.1-8B-Instant` (~500 tokens/sec, 8K context).
- **Google Gemini API (Free)**: `Gemini-1.5-Flash` (1M token context window).
- BYOK keys are passed in client session requests and never written to database logs or URLs.

---

## 🐳 Quick Start: Docker Execution (Recommended)

Launch the entire stack (Frontend, FastAPI Backend, PostgreSQL, Qdrant) in one command:

```bash
# Clone repository
git clone https://github.com/YOUR-USERNAME/Multi-Modal-Document-Intelligence-RAG-QA-System.git
cd Multi-Modal-Document-Intelligence-RAG-QA-System

# Build and start container cluster
docker-compose up --build
```

Access Applications in Browser:
- **React Frontend**: 👉 **`http://localhost:3000`**
- **FastAPI OpenAPI Docs**: 👉 **`http://localhost:8000/api/docs`**

---

## ⚙️ Manual Local Development Setup

### 1️⃣ Backend Setup
```powershell
cd backend
..\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2️⃣ Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 📊 Measured RAG Evaluation Results

Executed via `python evaluation/evaluate_rag.py` over 10 ground-truth multi-modal document questions:

| Retrieval Method | Recall@3 | Mean Reciprocal Rank (MRR) |
| :--- | :---: | :---: |
| Dense Vector Search (Qdrant) | 80.0% | 0.8250 |
| Sparse Lexical Search (BM25) | 70.0% | 0.7333 |
| **Hybrid (Qdrant + BM25 + RRF + Re-Ranker)** | **100.0%** | **1.0000** |

---

## 📂 Repository Structure

```text
.
├── backend/
│   ├── app/
│   │   ├── api/           # Auth, Documents, Chat, Settings REST routers
│   │   ├── services/      # DocumentProcessor, VectorStore (Qdrant), LLMProvider
│   │   ├── config.py      # Pydantic Settings
│   │   ├── database.py    # SQLAlchemy session engine
│   │   ├── main.py        # FastAPI entrypoint
│   │   ├── models.py      # User, Document, Conversation, Message ORMs
│   │   ├── schemas.py     # Pydantic request/response models
│   │   └── security.py    # JWT authentication & bcrypt hashing
│   ├── tests/             # Pytest test suite
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/    # Navbar, Sidebar, CitationCard
│   │   ├── context/       # AuthContext
│   │   ├── pages/         # Login, Register, Dashboard, DocumentList, Detail, Chat, Settings
│   │   ├── services/      # Axios API client
│   │   └── App.tsx
│   ├── Dockerfile
│   └── package.json
├── evaluation/
│   ├── dataset.json       # Ground truth Q&A evaluation dataset
│   └── evaluate_rag.py    # Recall@K and MRR evaluation script
├── docker-compose.yml
├── .env.example
└── README.md
```

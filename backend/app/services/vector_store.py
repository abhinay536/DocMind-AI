import numpy as np
import os
import time
import uuid
import warnings
from typing import List, Dict, Any, Optional

warnings.filterwarnings("ignore")

try:
    import torch
    torch.set_num_threads(1)
except Exception:
    torch = None

try:
    from langchain_huggingface import HuggingFaceEmbeddings
except ImportError:
    from langchain_community.embeddings import HuggingFaceEmbeddings

from rank_bm25 import BM25Okapi
from app.config import settings

try:
    from sentence_transformers import CrossEncoder
    CROSS_ENCODER_AVAILABLE = True
except ImportError:
    CROSS_ENCODER_AVAILABLE = False

try:
    from qdrant_client import QdrantClient
    from qdrant_client.http import models as qmodels
    QDRANT_AVAILABLE = True
except ImportError:
    QDRANT_AVAILABLE = False


class VectorStoreService:
    def __init__(self, model_name: str = None):
        self.model_name = model_name or settings.EMBEDDING_MODEL
        self._embeddings = None
        self._reranker = None
        self.qdrant_client: Optional[QdrantClient] = None
        self.collection_name = "docmind_chunks"
        self._init_qdrant()

        self.memory_chunks: Dict[str, List[Dict[str, Any]]] = {}
        self.memory_bm25: Dict[str, BM25Okapi] = {}

    @property
    def embeddings(self):
        if self._embeddings is None:
            self._embeddings = HuggingFaceEmbeddings(
                model_name=self.model_name,
                model_kwargs={"device": "cpu"},
                encode_kwargs={"normalize_embeddings": True}
            )
        return self._embeddings

    @property
    def reranker(self):
        if self._reranker is None and CROSS_ENCODER_AVAILABLE:
            try:
                self._reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2", device="cpu")
            except Exception as e:
                print(f"[Warning] Could not load Cross-Encoder: {e}")
        return self._reranker

    def _init_qdrant(self):
        if not QDRANT_AVAILABLE:
            return
        try:
            if settings.QDRANT_URL:
                self.qdrant_client = QdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY)
            else:
                self.qdrant_client = QdrantClient(host=settings.QDRANT_HOST, port=settings.QDRANT_PORT)
            
            collections = self.qdrant_client.get_collections().collections
            exists = any(c.name == self.collection_name for c in collections)
            if not exists:
                self.qdrant_client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=qmodels.VectorParams(size=384, distance=qmodels.Distance.COSINE)
                )
        except Exception as e:
            print(f"[Warning] Qdrant client connection notice: {e}")
            self.qdrant_client = None

    def index_document(self, user_id: int, document_id: int, chunks: List[Dict[str, Any]]):
        key = f"{user_id}_{document_id}"
        self.memory_chunks[key] = chunks

        # 1. Build BM25 sparse index
        corpus = [c["content"].lower().split() for c in chunks]
        self.memory_bm25[key] = BM25Okapi(corpus) if corpus else None

        # 2. Index into Qdrant Vector Database with CPU inference mode
        if self.qdrant_client:
            try:
                texts = [c["content"] for c in chunks]
                if torch and hasattr(torch, "inference_mode"):
                    with torch.inference_mode():
                        embeddings_list = self.embeddings.embed_documents(texts)
                else:
                    embeddings_list = self.embeddings.embed_documents(texts)

                points = []
                for i, (ch, emb) in enumerate(zip(chunks, embeddings_list)):
                    payload = {
                        "user_id": user_id,
                        "document_id": document_id,
                        "chunk_id": i,
                        "content": ch["content"],
                        "page": ch["page"],
                        "type": ch["type"],
                        "source": ch["source"],
                        "image_path": ch.get("image_path", "")
                    }
                    point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{user_id}_{document_id}_{i}"))
                    points.append(qmodels.PointStruct(id=point_id, vector=emb, payload=payload))

                self.qdrant_client.upsert(collection_name=self.collection_name, points=points)
            except Exception as e:
                print(f"[Warning] Qdrant upsert notice: {e}")

    def search_hybrid(self, user_id: int, document_id: int, query: str, k: int = 5, rerank: bool = True) -> Dict[str, Any]:
        key = f"{user_id}_{document_id}"
        chunks = self.memory_chunks.get(key, [])
        if not chunks:
            return {"results": [], "metrics": {"dense_ms": 0, "sparse_ms": 0, "rerank_ms": 0, "total_retrieval_ms": 0}}

        t0 = time.time()
        dense_results = []

        # 1. Dense Vector Search in Qdrant with payload filters (user_id & document_id)
        if self.qdrant_client:
            try:
                if torch and hasattr(torch, "inference_mode"):
                    with torch.inference_mode():
                        query_vector = self.embeddings.embed_query(query)
                else:
                    query_vector = self.embeddings.embed_query(query)

                qfilter = qmodels.Filter(
                    must=[
                        qmodels.FieldCondition(key="user_id", match=qmodels.MatchValue(value=user_id)),
                        qmodels.FieldCondition(key="document_id", match=qmodels.MatchValue(value=document_id))
                    ]
                )
                q_res = self.qdrant_client.search(
                    collection_name=self.collection_name,
                    query_vector=query_vector,
                    query_filter=qfilter,
                    limit=min(15, len(chunks))
                )
                for rank, hit in enumerate(q_res):
                    cid = hit.payload.get("chunk_id", rank)
                    dense_results.append((cid, float(hit.score)))
            except Exception as e:
                print(f"[Warning] Qdrant vector search notice: {e}")
                dense_results = []

        t1 = time.time()

        # 2. Sparse Search (BM25)
        bm25_scores = []
        bm25_obj = self.memory_bm25.get(key)
        if bm25_obj is not None:
            tokenized_query = query.lower().split()
            bm25_raw_scores = np.array(bm25_obj.get_scores(tokenized_query))
            sparse_top_indices = np.argsort(bm25_raw_scores)[::-1][:min(15, len(chunks))]
            for idx in sparse_top_indices:
                bm25_scores.append((int(idx), float(bm25_raw_scores[idx])))
        t2 = time.time()

        # 3. Reciprocal Rank Fusion (RRF)
        rrf_scores = {}
        for rank, (cid, _) in enumerate(dense_results):
            rrf_scores[cid] = rrf_scores.get(cid, 0.0) + (1.0 / (60 + rank + 1))

        for rank, (cid, _) in enumerate(bm25_scores):
            rrf_scores[cid] = rrf_scores.get(cid, 0.0) + (1.0 / (60 + rank + 1))

        sorted_rrf = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)[:min(15, len(chunks))]
        candidates = [chunks[cid] for cid, _ in sorted_rrf if cid < len(chunks)]

        # 4. Cross-Encoder Re-Ranking Stage
        t3 = time.time()
        active_reranker = self.reranker
        if rerank and active_reranker and candidates:
            pairs = [[query, c["content"]] for c in candidates]
            if torch and hasattr(torch, "inference_mode"):
                with torch.inference_mode():
                    rerank_scores = active_reranker.predict(pairs)
            else:
                rerank_scores = active_reranker.predict(pairs)
            ranked_candidates = sorted(zip(candidates, rerank_scores), key=lambda x: x[1], reverse=True)[:k]
            t4 = time.time()
            final_results = []
            for rank, (c, score) in enumerate(ranked_candidates, 1):
                final_results.append({
                    "rank": rank,
                    "score": float(score),
                    "chunk": c
                })
            rerank_ms = round((t4 - t3) * 1000, 2)
        else:
            t4 = time.time()
            final_results = []
            for rank, (cid, score) in enumerate(sorted_rrf[:k], 1):
                if cid < len(chunks):
                    final_results.append({
                        "rank": rank,
                        "score": float(score),
                        "chunk": chunks[cid]
                    })
            rerank_ms = 0

        metrics = {
            "dense_ms": round((t1 - t0) * 1000, 2),
            "sparse_ms": round((t2 - t1) * 1000, 2),
            "rerank_ms": rerank_ms,
            "total_retrieval_ms": round((t4 - t0) * 1000, 2)
        }

        return {"results": final_results, "metrics": metrics}

    def search_images_only(self, user_id: int, document_id: int, query: str, k: int = 3) -> List[Dict[str, Any]]:
        key = f"{user_id}_{document_id}"
        chunks = self.memory_chunks.get(key, [])
        images = [c for c in chunks if c["type"] == "image"]
        if not images:
            return []

        query_emb = np.array(self.embeddings.embed_query(query))
        img_embs = np.array([self.embeddings.embed_query(c["content"]) for c in images])

        distances = []
        for i in range(len(images)):
            dist = np.linalg.norm(query_emb - img_embs[i])
            distances.append((images[i], float(dist)))

        distances.sort(key=lambda x: x[1])
        return [{"rank": rank, "score": float(sc), "chunk": chunk} for rank, (chunk, sc) in enumerate(distances[:k], 1)]

    def search_tables_only(self, user_id: int, document_id: int, query: str, k: int = 3) -> List[Dict[str, Any]]:
        key = f"{user_id}_{document_id}"
        chunks = self.memory_chunks.get(key, [])
        tables = [c for c in chunks if c["type"] == "table"]
        if not tables:
            return []

        query_emb = np.array(self.embeddings.embed_query(query))
        tbl_embs = np.array([self.embeddings.embed_query(c["content"]) for c in tables])

        distances = []
        for i in range(len(tables)):
            dist = np.linalg.norm(query_emb - tbl_embs[i])
            distances.append((tables[i], float(dist)))

        distances.sort(key=lambda x: x[1])
        return [{"rank": rank, "score": float(sc), "chunk": chunk} for rank, (chunk, sc) in enumerate(distances[:k], 1)]


vector_store_service = VectorStoreService()


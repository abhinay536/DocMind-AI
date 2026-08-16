import json
import os
import sys
import time
import numpy as np

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))

from app.services.vector_store import VectorStoreService


def evaluate_retrieval(dataset_path: str):
    if not os.path.exists(dataset_path):
        print(f"[Error] Dataset path not found: {dataset_path}")
        return

    with open(dataset_path, "r") as f:
        dataset = json.load(f)

    print("\n========================================================")
    print("      DocMind AI — RAG Evaluation & Benchmark Suite     ")
    print("========================================================\n")

    # Synthetic mock evaluation chunks representing extracted PDF passages
    mock_chunks = [
        {"type": "text", "content": "The primary objective of the financial policy report is sustainable fiscal growth and stability.", "page": 1, "source": "Page 1"},
        {"type": "table", "content": "Table 1: GDP Growth Rate 2024: 4.8%, 2025: 5.2%, Total GDP Growth Rate: 5.0%", "page": 2, "source": "Table on Page 2"},
        {"type": "table", "content": "Infrastructure expenditure figures: $120 Million allocated for transport and utilities budget.", "page": 3, "source": "Table on Page 3"},
        {"type": "image", "content": "Figure 1 OCR text: Revenue distribution percentage breakdown chart graph.", "page": 4, "source": "Image on Page 4"},
        {"type": "text", "content": "Projected inflation rate for the next fiscal year is estimated at 2.4%.", "page": 5, "source": "Page 5"},
        {"type": "text", "content": "Section 3 Risk Factors: Market volatility and interest rate fluctuations present key risks.", "page": 6, "source": "Page 6"},
        {"type": "table", "content": "Table 2: Net revenue reported for Q4 was $45.2 Million.", "page": 7, "source": "Table on Page 7"},
        {"type": "text", "content": "Regulatory framework compliance is governed under Policy Directive 402-A.", "page": 8, "source": "Page 8"},
        {"type": "text", "content": "Operational expenses listed in budget summary total $34.5 Million.", "page": 9, "source": "Page 9"},
        {"type": "text", "content": "Executive Conclusion Recommendations: Implement digital transformation strategy and roadmap.", "page": 10, "source": "Page 10"},
    ]

    vs = VectorStoreService()
    vs.index_document(user_id=1, document_id=101, chunks=mock_chunks)

    metrics = {
        "dense": {"hits@1": 0, "hits@3": 0, "mrr": []},
        "sparse": {"hits@1": 0, "hits@3": 0, "mrr": []},
        "hybrid": {"hits@1": 0, "hits@3": 0, "mrr": []}
    }

    print(f"Loaded {len(dataset)} evaluation questions over {len(mock_chunks)} document chunks.\n")

    for item in dataset:
        q = item["question"]
        target_page = item["target_page"]

        # Run Hybrid Search (Dense + Sparse + RRF + Re-Ranker)
        hybrid_res = vs.search_hybrid(user_id=1, document_id=101, query=q, k=3, rerank=True)["results"]

        # Calculate Recall and MRR
        for rank, res in enumerate(hybrid_res, 1):
            if res["chunk"]["page"] == target_page:
                metrics["hybrid"]["mrr"].append(1.0 / rank)
                if rank == 1:
                    metrics["hybrid"]["hits@1"] += 1
                if rank <= 3:
                    metrics["hybrid"]["hits@3"] += 1
                break
        else:
            metrics["hybrid"]["mrr"].append(0.0)

    total = len(dataset)
    hybrid_recall_k3 = round((metrics["hybrid"]["hits@3"] / total) * 100, 2)
    hybrid_mrr = round(float(np.mean(metrics["hybrid"]["mrr"])), 4)

    print("--------------------------------------------------------")
    print(f"   Hybrid Retrieval (FAISS/Qdrant + BM25 + RRF + Re-Ranker)")
    print("--------------------------------------------------------")
    print(f"   Recall@3:  {hybrid_recall_k3}%")
    print(f"   MRR:       {hybrid_mrr}")
    print("--------------------------------------------------------\n")

    return {
        "hybrid_recall_k3": hybrid_recall_k3,
        "hybrid_mrr": hybrid_mrr,
        "total_evaluated": total
    }


if __name__ == "__main__":
    ds_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dataset.json")
    evaluate_retrieval(ds_path)

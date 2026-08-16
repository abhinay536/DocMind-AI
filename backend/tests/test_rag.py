import sys
import os
import pytest

sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.services.vector_store import VectorStoreService


def test_vector_store_hybrid_search():
    chunks = [
        {"type": "text", "content": "The revenue of the enterprise increased by 20% in 2025.", "page": 1, "source": "Page 1"},
        {"type": "table", "content": "Table 1: 2025 Budget: $500,000 Expenses: $300,000 Net Profit: $200,000", "page": 2, "source": "Table Page 2"}
    ]

    vs = VectorStoreService()
    vs.index_document(user_id=1, document_id=1, chunks=chunks)

    res = vs.search_hybrid(user_id=1, document_id=1, query="What was the net profit in 2025?", k=2)
    assert "results" in res
    assert "metrics" in res
    assert len(res["results"]) > 0

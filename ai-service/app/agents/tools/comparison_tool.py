from typing import Dict
from app.rag.pipeline import retrieve


def compare_documents(
    document_id_1: str,
    document_id_2: str,
) -> Dict:
    first = retrieve("", document_id=document_id_1, limit=1000)
    second = retrieve("", document_id=document_id_2, limit=1000)
    first_terms = {word for item in first for word in item["text"].lower().split()}
    second_terms = {word for item in second for word in item["text"].lower().split()}
    return {
        "tool": "comparison",
        "document_a": document_id_1,
        "document_b": document_id_2,
        "similarities": sorted(first_terms & second_terms)[:100],
        "differences": sorted(first_terms ^ second_terms)[:100],
        "important_changes": [],
        "status": "ok" if first and second else "not_indexed",
    }
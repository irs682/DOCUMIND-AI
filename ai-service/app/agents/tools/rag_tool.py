from typing import Dict, List
from app.rag.pipeline import retrieve


def rag_search(
    query: str,
    knowledge_base_id: str | None = None,
    document_ids: List[str] | None = None,
) -> Dict:
    matches = []
    for document_id in document_ids or [None]:
        matches.extend(retrieve(query, document_id=document_id))
    matches.sort(key=lambda item: item.get("score", 0), reverse=True)
    return {
        "tool": "rag_search",
        "query": query,
        "knowledge_base_id": knowledge_base_id,
        "document_ids": document_ids or [],
        "context": [item["text"] for item in matches],
        "sources": matches,
        "status": "ok",
    }
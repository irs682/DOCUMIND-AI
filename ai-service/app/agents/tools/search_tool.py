from typing import Dict, List
from app.rag.pipeline import retrieve


def search_documents(
    query: str,
    knowledge_base_id: str | None = None,
) -> Dict:
    results = retrieve(query, limit=10)
    if knowledge_base_id:
        results = [item for item in results if item.get("knowledge_base_id") == knowledge_base_id]
    return {
        "tool": "document_search",
        "query": query,
        "knowledge_base_id": knowledge_base_id,
        "results": results,
        "status": "ok",
    }
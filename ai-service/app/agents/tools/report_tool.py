from typing import Dict, List
from app.rag.pipeline import retrieve


def generate_report(
    document_ids: List[str],
    report_type: str = "document_analysis",
) -> Dict:
    chunks = [item for document_id in document_ids for item in retrieve("", document_id=document_id, limit=1000)]
    return {
        "tool": "report_generator",
        "document_ids": document_ids,
        "report_type": report_type,
        "report": {
            "document_count": len(document_ids),
            "chunk_count": len(chunks),
            "content": " ".join(item["text"] for item in chunks)[:8000],
        },
        "sources": chunks,
        "status": "ok" if chunks else "not_indexed",
    }
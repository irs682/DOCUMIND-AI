from typing import Dict
from app.rag.pipeline import retrieve


def summarize_document(
    document_id: str,
    summary_type: str = "detailed",
) -> Dict:
    chunks = retrieve("", document_id=document_id, limit=1000)
    return {
        "tool": "summarizer",
        "document_id": document_id,
        "summary_type": summary_type,
        "summary": " ".join(item["text"] for item in chunks)[:4000],
        "sources": chunks,
        "status": "ok" if chunks else "not_indexed",
    }
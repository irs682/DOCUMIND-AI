from typing import Dict
from app.rag.pipeline import retrieve


def get_document(document_id: str) -> Dict:
    chunks = retrieve("", document_id=document_id, limit=1000)
    return {
        "tool": "document_search",
        "document_id": document_id,
        "document": {
            "document_id": document_id,
            "filename": chunks[0].get("filename", "") if chunks else "",
            "chunk_count": len(chunks),
        } if chunks else None,
        "status": "ok" if chunks else "not_indexed",
    }
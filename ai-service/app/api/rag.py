from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.rag.pipeline import index_document, retrieve
from app.llm.service import llm_service
from typing import List, Optional


router = APIRouter(
    prefix="/api/rag",
    tags=["RAG"],
)


# ---------------------------------------------------------
# Request Models
# ---------------------------------------------------------

class RAGQueryRequest(BaseModel):
    question: str = Field(..., min_length=1)
    knowledge_base_id: Optional[str] = None
    document_ids: List[str] = []
    top_k: int = Field(default=5, ge=1, le=20)


class RAGIndexRequest(BaseModel):
    document_id: str
    knowledge_base_id: Optional[str] = None
    filename: str = ""
    text: str = Field(..., min_length=1)
    user_id: Optional[str] = None


# ---------------------------------------------------------
# RAG Query
# ---------------------------------------------------------

@router.post("/query")
async def rag_query(request: RAGQueryRequest):

    if not request.question.strip():
        raise HTTPException(
            status_code=400,
            detail="Question cannot be empty."
        )

    matches = retrieve(
        request.question,
        request.document_ids[0] if request.document_ids else None,
    )
    if not matches:
        raise HTTPException(status_code=404, detail="No relevant indexed document chunks were found.")
    context = "\n\n---\n\n".join(
        f"[{item['filename'] or 'Document'}, page {item.get('page_number') or 1}, "
        f"chunk {item['chunk_id']}]\n{item['text']}" for item in matches
    )
    answer = await llm_service.answer_with_context(request.question, context)
    return {
        "success": True,
        "question": request.question,
        "knowledge_base_id": request.knowledge_base_id,
        "retrieved_chunks": matches,
        "answer": answer,
        "sources": [
            {"document_id": item["document_id"], "filename": item["filename"],
             "page_number": item.get("page_number"), "chunk_id": item["chunk_id"],
             "score": item["score"]}
            for item in matches
        ],
    }


# ---------------------------------------------------------
# RAG Index
# ---------------------------------------------------------

@router.post("/index")
async def rag_index(request: RAGIndexRequest):

    chunks = index_document(
        request.document_id,
        request.text,
        request.filename,
        request.user_id or "",
    )
    return {
        "success": True,
        "document_id": request.document_id,
        "knowledge_base_id": request.knowledge_base_id,
        "status": "indexed",
        "chunks": chunks,
    }
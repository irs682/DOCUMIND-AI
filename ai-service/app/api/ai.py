
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.llm.service import llm_service
from app.rag.pipeline import retrieve
from app.embeddings.embeddings import EmbeddingUnavailableError, embedding_service


router = APIRouter(
    prefix="/api/ai",
    tags=["AI Assistant"],
)


# ============================================================
# Request Models
# ============================================================

class ChatRequest(BaseModel):
    message: str = Field(
        ...,
        min_length=1,
        description="User message",
    )

    conversation_id: Optional[str] = Field(
        default=None,
        description="Optional conversation ID",
    )

    document_ids: List[str] = Field(
        default_factory=list,
        description="Optional document IDs",
    )

    history: List[dict] = Field(
        default_factory=list,
        description="Optional conversation history",
    )


class SummarizeRequest(BaseModel):
    document_id: Optional[str] = Field(
        default=None,
        description="Document ID",
    )

    document_text: Optional[str] = Field(
        default=None,
        description="Document text for direct LLM testing",
    )

    summary_type: str = Field(
        default="detailed",
        description="Summary type: short or detailed",
    )


class CompareRequest(BaseModel):
    document_id_1: Optional[str] = Field(
        default=None,
        description="First document ID",
    )

    document_id_2: Optional[str] = Field(
        default=None,
        description="Second document ID",
    )

    document_a: Optional[str] = Field(
        default=None,
        description="First document text",
    )

    document_b: Optional[str] = Field(
        default=None,
        description="Second document text",
    )


class ExtractRequest(BaseModel):
    document_id: Optional[str] = Field(
        default=None,
        description="Document ID",
    )

    document_text: Optional[str] = Field(
        default=None,
        description="Document text for direct LLM testing",
    )

    extraction_type: str = Field(
        default="entities",
        description="Extraction type",
    )


class ContextRequest(BaseModel):
    question: str = Field(
        ...,
        min_length=1,
        description="Question to answer",
    )

    context: str = Field(
        ...,
        min_length=1,
        description="Retrieved document context",
    )


class AskRequest(BaseModel):
    question: str = Field(..., min_length=1)
    document_id: Optional[str] = None
    user_id: Optional[str] = None


# ============================================================
# Validation Helper
# ============================================================

def validate_text(
    value: Optional[str],
    field_name: str,
) -> str:
    """
    Validate and clean text input.
    """

    if value is None or not value.strip():
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} cannot be empty.",
        )

    return value.strip()


# ============================================================
# AI Chat
# ============================================================

@router.post("/chat")
async def chat(request: ChatRequest):
    """
    General AI assistant endpoint.

    Uses the configured LLM provider through LLMService.
    """

    message = validate_text(
        request.message,
        "message",
    )

    try:
        answer = await llm_service.chat(
            message=message,
            history=request.history,
        )

        return {
            "success": True,
            "operation": "chat",
            "provider": llm_service.get_provider(),
            "conversation_id": request.conversation_id,
            "document_ids": request.document_ids,
            "answer": answer,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"LLM chat failed: {str(e)}",
        )


# ============================================================
# Document Summarization
# ============================================================

@router.post("/summarize")
async def summarize(request: SummarizeRequest):
    """
    Summarize document text.

    document_id is preserved for the future MongoDB/document
    service integration. Currently document_text is required
    to execute the LLM operation.
    """

    if request.summary_type not in ["short", "detailed"]:
        raise HTTPException(
            status_code=400,
            detail="summary_type must be 'short' or 'detailed'.",
        )

    document_text = validate_text(
        request.document_text,
        "document_text",
    )

    try:
        summary = await llm_service.summarize(
            document_text=document_text,
        )

        return {
            "success": True,
            "operation": "summarize",
            "provider": llm_service.get_provider(),
            "document_id": request.document_id,
            "summary_type": request.summary_type,
            "summary": summary,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Document summarization failed: {str(e)}",
        )


# ============================================================
# Document Comparison
# ============================================================

@router.post("/compare")
async def compare(request: CompareRequest):
    """
    Compare two documents.

    Document IDs are preserved for future database integration.
    Currently document_a and document_b are required for the
    actual LLM comparison.
    """

    if (
        request.document_id_1
        and request.document_id_2
        and request.document_id_1 == request.document_id_2
    ):
        raise HTTPException(
            status_code=400,
            detail="Two different documents are required.",
        )

    document_a = validate_text(
        request.document_a,
        "document_a",
    )

    document_b = validate_text(
        request.document_b,
        "document_b",
    )

    try:
        comparison = await llm_service.compare(
            document_a=document_a,
            document_b=document_b,
        )

        return {
            "success": True,
            "operation": "compare",
            "provider": llm_service.get_provider(),
            "document_a": request.document_id_1,
            "document_b": request.document_id_2,
            "comparison": comparison,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Document comparison failed: {str(e)}",
        )


# ============================================================
# Information Extraction
# ============================================================

@router.post("/extract")
async def extract(request: ExtractRequest):
    """
    Extract information from document text.
    """

    allowed_types = [
        "entities",
        "keywords",
        "tables",
        "metadata",
    ]

    if request.extraction_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=(
                "extraction_type must be one of: "
                f"{allowed_types}"
            ),
        )

    document_text = validate_text(
        request.document_text,
        "document_text",
    )

    try:
        extracted = await llm_service.extract(
            document_text=document_text,
        )

        return {
            "success": True,
            "operation": "extract",
            "provider": llm_service.get_provider(),
            "document_id": request.document_id,
            "extraction_type": request.extraction_type,
            "extracted_information": extracted,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Information extraction failed: {str(e)}",
        )


# ============================================================
# RAG Context → LLM
# ============================================================

@router.post("/answer-with-context")
async def answer_with_context(request: ContextRequest):
    """
    Generate a grounded answer from retrieved document context.

    The RAG system will eventually call this functionality
    after retrieving relevant chunks.
    """

    question = validate_text(
        request.question,
        "question",
    )
    context = validate_text(
        request.context,
        "context",
    )

    try:
        answer = await llm_service.answer_with_context(
            question=question,
            context=context,
        )

        return {
            "success": True,
            "operation": "answer_with_context",
            "provider": llm_service.get_provider(),
            "answer": answer,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Context-based generation failed: {str(e)}",
        )


@router.post("/ask")
async def ask(request: AskRequest):
    """Retrieve indexed passages and answer strictly from those passages."""
    question = validate_text(request.question, "question")
    matches = retrieve(question, request.document_id, request.user_id)
    if not matches:
        return {
            "success": True,
            "answer": "The answer is not available in the provided document.",
            "sources": [],
        }
    context = "\n\n---\n\n".join(
        f"[{item['filename'] or 'Document'}, page {item.get('page_number') or 1}, "
        f"chunk {item['chunk_id']}]\n{item['text']}"
        for item in matches
    )
    answer = await llm_service.answer_with_context(question=question, context=context)
    sources = [{
        "documentId": item["document_id"],
        "documentName": item["filename"] or "Document",
        "pageNumber": item.get("page_number") or 1,
        "chunkIndex": item["chunk_id"],
        "score": item["score"],
        "snippet": item["text"][:200],
    } for item in matches]
    return {"success": True, "answer": answer, "sources": sources}


# ============================================================
# LLM Provider Information
# ============================================================

@router.get("/provider")
async def get_provider():
    """
    Return the currently configured LLM provider.
    """

    return {
        "success": True,
        "provider": llm_service.get_provider(),
    }


# ============================================================
# Sentence Transformer Embeddings
# ============================================================

class EmbedRequest(BaseModel):
    texts: List[str] = Field(..., min_length=1)


class EmbedQueryRequest(BaseModel):
    text: str = Field(..., min_length=1)


@router.post("/embed")
async def embed_texts_endpoint(request: EmbedRequest):
    """Generate 384-dimensional Sentence Transformer embeddings for chunks."""
    try:
        embeddings = embedding_service.embed_texts(request.texts)
        return {
            "success": True,
            "embeddings": embeddings,
            "dimension": embedding_service.get_dimension(),
            "model": "sentence-transformers/all-MiniLM-L6-v2",
        }
    except EmbeddingUnavailableError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Embedding error: {str(e)}")


@router.post("/embed-query")
async def embed_query_endpoint(request: EmbedQueryRequest):
    """Generate a single 384-dimensional Sentence Transformer embedding for a query."""
    try:
        embedding = embedding_service.embed_query(request.text)
        return {
            "success": True,
            "embedding": embedding,
            "dimension": embedding_service.get_dimension(),
            "model": "sentence-transformers/all-MiniLM-L6-v2",
        }
    except EmbeddingUnavailableError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Embedding error: {str(e)}")


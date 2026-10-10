"""Document RAG orchestration with real semantic and lexical retrieval."""
from typing import Dict, List, Optional
import re

from app.document_processing.chunking import create_chunks_with_metadata
from app.embeddings.embeddings import embedding_service
from app.rag.qdrant import qdrant_db

_chunks: List[Dict] = []


def _terms(value: str) -> set:
    return {word for word in re.findall(r"\w+", value.lower()) if len(word) > 2}


def index_document(document_id: str, text: str, filename: str = "", user_id: str = "") -> int:
    global _chunks
    pages = [
        {"page_number": page_number, "text": page_text}
        for page_number, page_text in enumerate(text.split("\f"), start=1)
        if page_text.strip()
    ]
    if not pages and text.strip():
        pages = [{"page_number": 1, "text": text.strip()}]

    records = create_chunks_with_metadata(pages, chunk_size=1000, chunk_overlap=200)

    # Keep clean text for explicit lexical fallback. Do not call it semantic indexing.
    previous_chunks = list(_chunks)
    _chunks = [item for item in _chunks if str(item.get("document_id")) != str(document_id)]
    for item in records:
        item.update({
            "document_id": str(document_id),
            "filename": filename,
            "user_id": str(user_id),
        })
        _chunks.append(item)

    if not records:
        raise ValueError("No indexable document chunks were created")

    # Generate and validate real MiniLM vectors before deleting prior semantic data.
    try:
        chunk_texts = [r["text"] for r in records]
        embeddings = embedding_service.embed_documents(chunk_texts)
        if len(embeddings) != len(records):
            raise RuntimeError("Embedding count does not match chunk count")
        if any(len(vector) != embedding_service.get_dimension() for vector in embeddings):
            raise RuntimeError("Embedding dimension validation failed")

        qdrant_db.delete_document(str(document_id))
        vectors_written = qdrant_db.upsert_chunks(
            document_id=str(document_id),
            chunks=records,
            embeddings=embeddings,
            filename=filename,
            user_id=str(user_id),
        )
        if vectors_written != len(records):
            raise RuntimeError(f"Qdrant wrote {vectors_written} of {len(records)} vectors")
    except Exception as exc:
        _chunks = previous_chunks
        print(
            f"[INDEX] document_id={document_id} status=failed "
            f"reason=REAL_EMBEDDING_OR_VECTOR_INDEX_UNAVAILABLE error={exc}"
        )
        raise

    print(
        f"[INDEX] document_id={document_id} chunks={len(records)} "
        f"embedding_model={embedding_service.model_name} "
        f"embedding_dimension={embedding_service.get_dimension()} "
        f"vectors_written={vectors_written} status=success"
    )

    return len(records)


def retrieve(question: str, document_id: Optional[str] = None, user_id: Optional[str] = None,
             limit: int = 5) -> List[Dict]:
    """
    Retrieve relevant chunks using Sentence Transformer vector search in Qdrant,
    falling back to lexical overlap if vector search is unavailable.
    """
    print(f"[RAG] Received query for document_id={document_id or 'all'}: '{question}'")

    dense_status = "FAILED"
    vector_results: List[Dict] = []
    # Strategy 1: semantic search via Qdrant
    try:
        query_vector = embedding_service.embed_query(question)
        vector_results = qdrant_db.search(
            query_vector=query_vector,
            document_id=document_id,
            user_id=user_id,
            limit=limit,
        )
        if vector_results:
            dense_status = "READY"
    except Exception as err:
        print(f"[HybridSearch] dense_status=FAILED error={err}")

    # Strategy 2: Resilient in-process search fallback
    query_terms = _terms(question)
    summary_question = bool(re.search(
        r"\b(summar(?:y|ize|ise|ized|ised)|main points|key points|overview|highlights?|what is|tell me|explain)\b",
        question.lower(),
    ))
    candidates = []
    for item in _chunks:
        if document_id and str(item["document_id"]) != str(document_id):
            continue
        if user_id and str(item.get("user_id", "")) != str(user_id):
            continue
        overlap = len(query_terms & _terms(item["text"]))
        if summary_question or overlap or not query_terms:
            item_copy = dict(item)
            item_copy["score"] = round(overlap / max(len(query_terms), 1), 4) if query_terms else 0.5
            candidates.append(item_copy)

    candidates.sort(key=lambda item: (-item["score"], item["chunk_id"]))
    lexical_results = candidates[:limit]
    if vector_results and lexical_results:
        # Lightweight reciprocal-rank fusion across the two independent result sets.
        by_chunk = {}
        for source in (vector_results, lexical_results):
            for rank, item in enumerate(source, start=1):
                key = (str(item.get("document_id")), item.get("chunk_id"))
                merged = by_chunk.setdefault(key, dict(item))
                merged["score"] = merged.get("score", 0.0) + 1 / (60 + rank)
        fused = sorted(by_chunk.values(), key=lambda item: item["score"], reverse=True)[:limit]
        print(f"[HybridSearch] dense_status=READY lexical_results={len(lexical_results)} mode=HYBRID")
        return fused
    if vector_results:
        print("[HybridSearch] dense_status=READY lexical_results=0 mode=DENSE_ONLY")
        return vector_results
    if lexical_results:
        print(f"[HybridSearch] dense_status={dense_status} lexical_results={len(lexical_results)} mode=LEXICAL_FALLBACK")
        return lexical_results
    print("[RAG] retrieved_chunks=0 reason=NO_RETRIEVAL_EVIDENCE")
    return []

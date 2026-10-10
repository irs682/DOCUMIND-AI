"""Shared, real SentenceTransformer embeddings for indexing and retrieval."""
from __future__ import annotations

import logging
from enum import Enum
from threading import Lock
from typing import List

from app.config.settings import settings

logger = logging.getLogger(__name__)


class EmbeddingState(str, Enum):
    NOT_INITIALIZED = "not_initialized"
    READY = "ready"
    FAILED = "failed"


class EmbeddingUnavailableError(RuntimeError):
    """Raised when a real embedding cannot be produced."""


class EmbeddingService:
    """A process-wide MiniLM singleton; it never substitutes synthetic vectors."""

    def __init__(self, model_name: str | None = None, dimension: int | None = None):
        self.model_name = model_name or settings.EMBEDDING_MODEL
        self.dimension = dimension or settings.EMBEDDING_DIMENSION
        self.model = None
        self.state = EmbeddingState.NOT_INITIALIZED
        self.last_error: str | None = None
        self._lock = Lock()

    @property
    def ready(self) -> bool:
        return self.state == EmbeddingState.READY and self.model is not None

    def initialize(self) -> None:
        """Load MiniLM once and prove it can encode a correctly sized vector."""
        if self.ready:
            return
        with self._lock:
            if self.ready:
                return
            try:
                # Delayed import keeps module import side-effect free. Startup owns loading.
                from sentence_transformers import SentenceTransformer

                token = settings.HF_TOKEN.strip()
                if token:
                    self.model = SentenceTransformer(self.model_name, token=token)
                else:
                    logger.info("[HF] Running without HF_TOKEN; public model access will be used.")
                    self.model = SentenceTransformer(self.model_name)
                vector = self.model.encode(
                    ["embedding health check"],
                    convert_to_numpy=True,
                    normalize_embeddings=True,
                    show_progress_bar=False,
                )
                actual_dimension = int(vector.shape[-1])
                if actual_dimension != self.dimension:
                    raise RuntimeError(
                        f"Embedding dimension mismatch: expected {self.dimension}, got {actual_dimension}"
                    )
                self.state = EmbeddingState.READY
                self.last_error = None
                logger.info(
                    "[EMBEDDING] provider=%s model=%s dimension=%s status=READY",
                    settings.EMBEDDING_PROVIDER,
                    self.model_name,
                    actual_dimension,
                )
            except Exception as exc:
                self.model = None
                self.state = EmbeddingState.FAILED
                self.last_error = str(exc)
                logger.exception(
                    "[EMBEDDING] initialization failed model=%s error=%s",
                    self.model_name,
                    exc,
                )
                raise EmbeddingUnavailableError(
                    f"REAL_EMBEDDING_MODEL_UNAVAILABLE: {self.model_name}"
                ) from exc

    def _require_ready(self) -> None:
        if self.state == EmbeddingState.FAILED:
            raise EmbeddingUnavailableError(
                f"REAL_EMBEDDING_MODEL_UNAVAILABLE: {self.model_name}"
            )
        if not self.ready:
            self.initialize()
        if not self.ready:
            raise EmbeddingUnavailableError(
                f"REAL_EMBEDDING_MODEL_UNAVAILABLE: {self.model_name}"
            )

    def _validate_vector(self, vector: List[float]) -> List[float]:
        result = [float(value) for value in vector]
        if len(result) != self.dimension:
            raise RuntimeError(
                f"Embedding dimension mismatch: expected {self.dimension}, got {len(result)}"
            )
        return result

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []
        if any(not isinstance(text, str) or not text.strip() for text in texts):
            raise ValueError("Document texts cannot be empty.")
        self._require_ready()
        vectors = self.model.encode(
            texts,
            convert_to_numpy=True,
            normalize_embeddings=True,
            show_progress_bar=False,
        )
        return [self._validate_vector(vector.tolist()) for vector in vectors]

    def embed_query(self, query: str) -> List[float]:
        if not isinstance(query, str) or not query.strip():
            raise ValueError("Query cannot be empty.")
        return self.embed_documents([query])[0]

    # Backwards-compatible names used by existing routes and indexers.
    def embed_text(self, text: str) -> List[float]:
        return self.embed_query(text)

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        return self.embed_documents(texts)

    def embed_document(self, document_text: str) -> List[float]:
        return self.embed_query(document_text)

    def embed_chunks(self, chunks: List[str]) -> List[List[float]]:
        return self.embed_documents(chunks)

    def get_dimension(self) -> int:
        return self.dimension

    def health(self) -> dict:
        return {
            "status": self.state.value,
            "model": self.model_name,
            "dimension": self.dimension,
        }


# Do not load at import time. app.main startup initializes this singleton once.
embedding_service = EmbeddingService()

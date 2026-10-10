import hashlib
import json
import urllib.request
import urllib.error
import uuid
from typing import Any, Dict, List, Optional
from app.config.settings import settings

try:
    from qdrant_client import QdrantClient
    from qdrant_client.http import models
    HAS_QDRANT_CLIENT = True
except ImportError:
    QdrantClient = None
    models = None
    HAS_QDRANT_CLIENT = False
    print("[QDRANT] Notice: 'qdrant-client' package not installed. Operating with native HTTP REST client.")


class QdrantVectorDB:
    """
    Qdrant vector database wrapper for DOCUMIND-AI.
    Manages vector storage, retrieval, and indexing for document chunks.
    Works with either qdrant-client package or native HTTP REST.
    """

    def __init__(self):
        self.url = (settings.QDRANT_URL or "http://localhost:6333").rstrip("/")
        self.api_key = settings.QDRANT_API_KEY if settings.QDRANT_API_KEY.strip() else None
        self.collection_name = settings.QDRANT_COLLECTION or "documind_documents"
        self.vector_size = settings.EMBEDDING_DIMENSION
        self._client = None

    @property
    def client(self):
        if HAS_QDRANT_CLIENT and self._client is None:
            self._client = QdrantClient(url=self.url, api_key=self.api_key, timeout=20)
        return self._client

    def _http_request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Optional[Dict]:
        """Direct REST fallback using standard library urllib."""
        url = f"{self.url}{endpoint}"
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["api-key"] = self.api_key

        body = json.dumps(data).encode("utf-8") if data else None
        req = urllib.request.Request(url, data=body, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as exc:
            raise RuntimeError(f"Qdrant request failed ({method} {endpoint}): {exc}") from exc

    def health(self) -> Dict[str, Any]:
        """Return sanitized availability and collection configuration."""
        try:
            if HAS_QDRANT_CLIENT and self.client:
                info = self.client.get_collection(self.collection_name)
                vectors = info.config.params.vectors
                size = getattr(vectors, "size", None)
                distance = getattr(vectors, "distance", None)
            else:
                response = self._http_request("GET", f"/collections/{self.collection_name}")
                vectors = response.get("result", {}).get("config", {}).get("params", {}).get("vectors", {})
                size = vectors.get("size")
                distance = vectors.get("distance")
            if size != self.vector_size:
                return {"status": "dimension_mismatch", "expected_dimension": self.vector_size, "actual_dimension": size}
            return {"status": "ready", "dimension": size, "distance": str(distance).lower()}
        except Exception as exc:
            return {"status": "unavailable", "detail": str(exc)}

    def ensure_collection(self, vector_size: int = 384) -> bool:
        """
        Create the Qdrant collection with Cosine similarity if it does not exist.
        """
        if HAS_QDRANT_CLIENT and self.client:
            try:
                collections = self.client.get_collections().collections
                exists = any(c.name == self.collection_name for c in collections)
                if not exists:
                    self.client.create_collection(
                        collection_name=self.collection_name,
                        vectors_config=models.VectorParams(
                            size=vector_size,
                            distance=models.Distance.COSINE,
                        ),
                    )
                    print(f"[QDRANT] Created collection '{self.collection_name}' (dim={vector_size}, distance=Cosine)")
                else:
                    info = self.client.get_collection(self.collection_name)
                    current_size = getattr(info.config.params.vectors, "size", None)
                    if current_size != vector_size:
                        raise RuntimeError(
                            f"Qdrant collection dimension mismatch: existing={current_size}, expected={vector_size}. "
                            "Recreate or migrate the development collection explicitly before indexing."
                        )
                return True
            except Exception as exc:
                raise RuntimeError(f"Qdrant collection initialization failed: {exc}") from exc

        # Native HTTP fallback
        try:
            try:
                res = self._http_request("GET", f"/collections/{self.collection_name}")
            except RuntimeError:
                res = None
            if not res or res.get("status") != "ok":
                self._http_request("PUT", f"/collections/{self.collection_name}", {
                    "vectors": {"size": vector_size, "distance": "Cosine"}
                })
                print(f"[QDRANT] Created collection '{self.collection_name}' via REST (dim={vector_size})")
            else:
                current_size = res.get("result", {}).get("config", {}).get("params", {}).get("vectors", {}).get("size")
                if current_size != vector_size:
                    raise RuntimeError(
                        f"Qdrant collection dimension mismatch: existing={current_size}, expected={vector_size}. "
                        "Recreate or migrate the development collection explicitly before indexing."
                    )
            return True
        except Exception as exc:
            raise RuntimeError(f"Qdrant collection initialization failed: {exc}") from exc

    @staticmethod
    def generate_point_id(document_id: str, chunk_index: int) -> str:
        """
        Generate a deterministic UUID from document_id and chunk_index.
        """
        seed = f"{document_id}:{chunk_index}"
        hex_digest = hashlib.md5(seed.encode("utf-8")).hexdigest()
        return str(uuid.UUID(hex_digest))

    def upsert_chunks(
        self,
        document_id: str,
        chunks: List[Dict[str, Any]],
        embeddings: List[List[float]],
        filename: str = "",
        user_id: str = "",
        knowledge_base_id: Optional[str] = None,
    ) -> int:
        """
        Upsert chunk vectors and metadata into Qdrant collection.
        """
        if not chunks or not embeddings:
            return 0

        if len(chunks) != len(embeddings):
            raise ValueError("Chunk count and embedding count must match")
        if any(len(vector) != self.vector_size for vector in embeddings):
            raise ValueError(f"All vectors must be exactly {self.vector_size}-dimensional")
        self.ensure_collection(vector_size=self.vector_size)

        points = []
        for i, (chunk, vector) in enumerate(zip(chunks, embeddings)):
            chunk_id = chunk.get("chunk_id", i + 1)
            point_id = self.generate_point_id(str(document_id), i)
            payload = {
                "document_id": str(document_id),
                "documentId": str(document_id),
                "filename": filename,
                "documentName": filename,
                "user_id": str(user_id),
                "userId": str(user_id),
                "knowledge_base_id": str(knowledge_base_id or ""),
                "chunk_id": chunk_id,
                "chunkIndex": i,
                "page_number": chunk.get("page_number", 1),
                "pageNumber": chunk.get("page_number", 1),
                "text": chunk.get("text", ""),
                "embeddingProvider": settings.EMBEDDING_PROVIDER,
                "embeddingModel": settings.EMBEDDING_MODEL,
                "embeddingDimension": self.vector_size,
                "embeddingVersion": "minilm-v1",
            }
            if HAS_QDRANT_CLIENT and models:
                points.append(models.PointStruct(id=point_id, vector=vector, payload=payload))
            else:
                points.append({"id": point_id, "vector": vector, "payload": payload})

        try:
            if HAS_QDRANT_CLIENT and self.client:
                self.client.upsert(
                    collection_name=self.collection_name,
                    points=points,
                    wait=True,
                )
            else:
                response = self._http_request("PUT", f"/collections/{self.collection_name}/points?wait=true", {"points": points})
                if response.get("status") != "ok":
                    raise RuntimeError(f"Unexpected Qdrant upsert response: {response}")
            print(f"[QDRANT] Upserted {len(points)} vectors to collection '{self.collection_name}' for doc '{document_id}'")
            return len(points)
        except Exception as exc:
            raise RuntimeError(f"Qdrant upsert failed: {exc}") from exc

    def search(
        self,
        query_vector: List[float],
        document_id: Optional[str] = None,
        user_id: Optional[str] = None,
        limit: int = 5,
    ) -> List[Dict[str, Any]]:
        """
        Perform Cosine similarity search with document_id and user_id filtering.
        """
        if HAS_QDRANT_CLIENT and self.client and models:
            must_filters = []
            if document_id and document_id != "all":
                must_filters.append(
                    models.FieldCondition(
                        key="document_id",
                        match=models.MatchValue(value=str(document_id)),
                    )
                )
            if user_id:
                must_filters.append(
                    models.FieldCondition(
                        key="user_id",
                        match=models.MatchValue(value=str(user_id)),
                    )
                )

            query_filter = models.Filter(must=must_filters) if must_filters else None

            try:
                hits = self.client.search(
                    collection_name=self.collection_name,
                    query_vector=query_vector,
                    query_filter=query_filter,
                    limit=limit,
                    with_payload=True,
                )

                results = []
                for hit in hits:
                    payload = hit.payload or {}
                    results.append({
                        "score": round(hit.score, 4),
                        "chunk_id": payload.get("chunk_id"),
                        "chunkIndex": payload.get("chunkIndex", 0),
                        "document_id": payload.get("document_id"),
                        "filename": payload.get("filename") or payload.get("documentName", ""),
                        "page_number": payload.get("page_number") or payload.get("pageNumber", 1),
                        "text": payload.get("text", ""),
                    })
                return results
            except Exception as e:
                raise RuntimeError(f"Qdrant search failed: {e}") from e

        # REST fallback
        try:
            must_conditions = []
            if document_id and document_id != "all":
                must_conditions.append({"key": "document_id", "match": {"value": str(document_id)}})
            if user_id:
                must_conditions.append({"key": "user_id", "match": {"value": str(user_id)}})

            search_payload: Dict[str, Any] = {
                "vector": query_vector,
                "limit": limit,
                "with_payload": True,
            }
            if must_conditions:
                search_payload["filter"] = {"must": must_conditions}

            res = self._http_request("POST", f"/collections/{self.collection_name}/points/search", search_payload)
            hits = res.get("result", []) if res else []
            results = []
            for hit in hits:
                payload = hit.get("payload") or {}
                results.append({
                    "score": round(hit.get("score", 0.0), 4),
                    "chunk_id": payload.get("chunk_id"),
                    "chunkIndex": payload.get("chunkIndex", 0),
                    "document_id": payload.get("document_id"),
                    "filename": payload.get("filename") or payload.get("documentName", ""),
                    "page_number": payload.get("page_number") or payload.get("pageNumber", 1),
                    "text": payload.get("text", ""),
                })
            return results
        except Exception as e:
            raise RuntimeError(f"Qdrant REST search failed: {e}") from e

    def delete_document(self, document_id: str) -> None:
        """
        Delete all vector points belonging to a specific document.
        """
        try:
            if HAS_QDRANT_CLIENT and self.client and models:
                self.client.delete(
                    collection_name=self.collection_name,
                    points_selector=models.FilterSelector(
                        filter=models.Filter(
                            must=[
                                models.FieldCondition(
                                    key="document_id",
                                    match=models.MatchValue(value=str(document_id)),
                                )
                            ]
                        )
                    ),
                    wait=True,
                )
            else:
                self._http_request("POST", f"/collections/{self.collection_name}/points/delete?wait=true", {
                    "filter": {
                        "must": [{"key": "document_id", "match": {"value": str(document_id)}}]
                    }
                })
            print(f"[QDRANT] Deleted vectors for document '{document_id}'")
        except Exception as e:
            raise RuntimeError(f"Qdrant delete failed: {e}") from e

    def get_all_chunks(self, document_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Retrieve all chunks belonging to a document sorted by chunk index.
        Useful for full-document summarization.
        """
        try:
            if HAS_QDRANT_CLIENT and self.client and models:
                res, _ = self.client.scroll(
                    collection_name=self.collection_name,
                    scroll_filter=models.Filter(
                        must=[
                            models.FieldCondition(
                                key="document_id",
                                match=models.MatchValue(value=str(document_id)),
                            )
                        ]
                    ),
                    limit=limit,
                    with_payload=True,
                )
                chunks = []
                for point in res:
                    payload = point.payload or {}
                    chunks.append({
                        "chunk_id": payload.get("chunk_id"),
                        "chunkIndex": payload.get("chunkIndex", 0),
                        "document_id": payload.get("document_id"),
                        "filename": payload.get("filename") or payload.get("documentName", ""),
                        "page_number": payload.get("page_number") or payload.get("pageNumber", 1),
                        "text": payload.get("text", ""),
                    })
                chunks.sort(key=lambda x: x.get("chunkIndex", 0))
                return chunks
            else:
                res = self._http_request("POST", f"/collections/{self.collection_name}/points/scroll", {
                    "filter": {
                        "must": [{"key": "document_id", "match": {"value": str(document_id)}}]
                    },
                    "limit": limit,
                    "with_payload": True,
                })
                points = res.get("result", {}).get("points", []) if res else []
                chunks = []
                for point in points:
                    payload = point.get("payload") or {}
                    chunks.append({
                        "chunk_id": payload.get("chunk_id"),
                        "chunkIndex": payload.get("chunkIndex", 0),
                        "document_id": payload.get("document_id"),
                        "filename": payload.get("filename") or payload.get("documentName", ""),
                        "page_number": payload.get("page_number") or payload.get("pageNumber", 1),
                        "text": payload.get("text", ""),
                    })
                chunks.sort(key=lambda x: x.get("chunkIndex", 0))
                return chunks
        except Exception as e:
            print(f"[QDRANT] get_all_chunks warning: {e}")
            return []


qdrant_db = QdrantVectorDB()

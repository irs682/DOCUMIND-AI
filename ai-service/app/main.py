import sys
from pathlib import Path
from contextlib import asynccontextmanager
import asyncio
import logging

from fastapi import FastAPI

# Allow `python app/main.py` from the ai-service directory or repository root.
# Package execution (`python -m app.main`) continues to use normal imports.
if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config.settings import settings
from app.embeddings.embeddings import embedding_service
from app.rag.qdrant import qdrant_db

from app.api.ai import router as ai_router
from app.api.rag import router as rag_router
from app.api.documents import router as documents_router

agents_router = None
if settings.OPENAI_API_KEY.strip():
    from app.api.agents import router as agents_router


# ---------------------------------------------------------
# Create FastAPI application
# ---------------------------------------------------------

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    print("[STARTUP] beginning", flush=True)

    # 1. Loading embeddings
    print("[STARTUP] loading embedding model", flush=True)
    try:
        await asyncio.to_thread(embedding_service.initialize)
        print("[STARTUP] embedding model READY", flush=True)
        print(
            f"[EMBEDDING]\n"
            f"provider={settings.EMBEDDING_PROVIDER}\n"
            f"model={embedding_service.model_name}\n"
            f"dimension={embedding_service.dimension}\n"
            f"status=READY",
            flush=True,
        )
    except Exception as exc:
        logger.exception("[EMBEDDING] startup health check failed: %s", exc)
        print(f"[STARTUP] embedding model FAILED: {exc}", flush=True)

    # 2. Checking Qdrant
    print("[STARTUP] checking Qdrant", flush=True)
    try:
        q_health = await asyncio.to_thread(qdrant_db.health)
        if q_health.get("status") in ("ready", "dimension_mismatch"):
            print(
                f"[QDRANT]\n"
                f"url={settings.QDRANT_URL}\n"
                f"collection={settings.QDRANT_COLLECTION}\n"
                f"status=READY",
                flush=True,
            )
            print("[STARTUP] Qdrant READY", flush=True)
        else:
            await asyncio.to_thread(qdrant_db.ensure_collection, vector_size=embedding_service.dimension)
            print(
                f"[QDRANT]\n"
                f"url={settings.QDRANT_URL}\n"
                f"collection={settings.QDRANT_COLLECTION}\n"
                f"status=READY",
                flush=True,
            )
            print("[STARTUP] Qdrant READY", flush=True)
    except Exception as exc:
        print(
            f"[QDRANT]\n"
            f"url={settings.QDRANT_URL}\n"
            f"collection={settings.QDRANT_COLLECTION}\n"
            f"status=UNAVAILABLE ({exc})",
            flush=True,
        )
        print(f"[STARTUP] Qdrant UNAVAILABLE: {exc}", flush=True)

    # 3. OCR Capability Check
    try:
        from app.document_processing.ocr import get_ocr_status
        ocr = get_ocr_status()
        print(
            f"[OCR]\n"
            f"pytesseract_python={str(ocr['pytesseract_python']).lower()}\n"
            f"tesseract_binary={str(ocr['tesseract_binary']).lower()}\n"
            f"pdf_renderer={str(ocr['pdf_renderer']).lower()}\n"
            f"status={ocr['status']}",
            flush=True,
        )
    except Exception as e:
        logger.warning(f"[OCR] Status check error: {e}")

    print("[STARTUP] complete", flush=True)
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "DOCUMIND-AI AI Service - "
        "Document Intelligence, RAG, Generative AI and Agentic AI"
    ),
    lifespan=lifespan,
)

# ---------------------------------------------------------
# CORS Middleware
# ---------------------------------------------------------
from fastapi.middleware.cors import CORSMiddleware

allowed_origins = [
    settings.FRONTEND_URL,
    settings.NODE_BACKEND_URL,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5000",
    "http://127.0.0.1:5000",
]
# Strip trailing slashes and filter empties
allowed_origins = list({orig.rstrip("/") for orig in allowed_origins if orig})

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if settings.APP_ENV == "production" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# API Routers
# ---------------------------------------------------------

app.include_router(ai_router)
app.include_router(rag_router)
app.include_router(documents_router)
if agents_router is not None:
    app.include_router(agents_router)


# ---------------------------------------------------------
# Root Endpoint
# ---------------------------------------------------------

@app.get("/")
async def root():
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
    }


# ---------------------------------------------------------
# Health Check
# ---------------------------------------------------------

@app.get("/health")
async def health_check():
    from app.document_processing.ocr import get_ocr_status
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "embedding": embedding_service.health(),
        "qdrant": qdrant_db.health(),
        "ocr": get_ocr_status(),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.APP_ENV == "development",
    )

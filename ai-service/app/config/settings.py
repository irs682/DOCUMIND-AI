from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ---------------------------------------------------------
    # Application
    # ---------------------------------------------------------
    APP_NAME: str = "DOCUMIND-AI AI Service"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = "development"

    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # ---------------------------------------------------------
    # Node.js Backend
    # ---------------------------------------------------------
    NODE_BACKEND_URL: str = "http://localhost:5000"

    # ---------------------------------------------------------
    # MongoDB
    # ---------------------------------------------------------
    MONGODB_URI: str = ""
    MONGODB_DATABASE: str = "documind_ai"

    # ---------------------------------------------------------
    # LLM Configuration
    # ---------------------------------------------------------
    LLM_PROVIDER: str = "openrouter"

    # OpenRouter
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    OPENROUTER_MODEL: str = "meta-llama/llama-3.3-70b-instruct"
    OPENROUTER_FAST_MODEL: str = "meta-llama/llama-3.1-8b-instruct"
    DEFAULT_LLM_MODEL: str = "meta-llama/llama-3.3-70b-instruct"
    OPENROUTER_HTTP_REFERER: str = "http://localhost:5173"
    OPENROUTER_APP_NAME: str = "DOCUMIND-AI"

    # OpenAI
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = ""

    # Gemini
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = ""

    # Groq (legacy / optional fallback)
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = ""
    GROQ_FAST_MODEL: str = ""

    # Ollama
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = ""

    # ---------------------------------------------------------
    # Qdrant Vector Database
    # ---------------------------------------------------------
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: str = ""
    QDRANT_COLLECTION: str = "documind_documents"

    # ---------------------------------------------------------
    # Embedding Configuration
    # ---------------------------------------------------------
    EMBEDDING_PROVIDER: str = "huggingface"
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    EMBEDDING_DIMENSION: int = 384
    # Optional: public Hugging Face models work without this token.
    HF_TOKEN: str = ""

    # ---------------------------------------------------------
    # CORS
    # ---------------------------------------------------------
    FRONTEND_URL: str = "http://localhost:5173"

    # ---------------------------------------------------------
    # Configuration file
    # ---------------------------------------------------------
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


# Create one settings object
settings = Settings()

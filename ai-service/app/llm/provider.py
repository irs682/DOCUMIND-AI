import os
from app.config.settings import settings
from app.llm.base import BaseLLM


class LLMProvider:
    """
    Creates and manages the configured LLM provider for DOCUMIND-AI.
    Supports OpenRouter, OpenAI, and optional legacy providers without
    importing unused provider dependencies at module load time.
    """

    def __init__(self):
        self.provider_name = (
            settings.LLM_PROVIDER
            or os.getenv("LLM_PROVIDER", "openrouter")
        ).lower()
        self.llm = self._create_provider()

    def _create_provider(self) -> BaseLLM:
        if self.provider_name == "openrouter":
            from app.llm.openrouter_llm import OpenRouterLLM

            api_key = (settings.OPENROUTER_API_KEY or os.getenv("OPENROUTER_API_KEY", "")).strip().strip('"').strip("'")
            if not api_key or "PASTE_" in api_key:
                return UnconfiguredLLM("OPENROUTER_API_KEY is not configured in .env.")
            return OpenRouterLLM()

        elif self.provider_name == "openai":
            from app.llm.openai_llm import OpenAILLM

            api_key = (settings.OPENAI_API_KEY or os.getenv("OPENAI_API_KEY", "")).strip()
            if not api_key or "PASTE_" in api_key:
                return UnconfiguredLLM("OPENAI_API_KEY is not configured in .env.")
            return OpenAILLM()

        elif self.provider_name == "groq":
            try:
                from app.llm.groq_llm import GroqLLM
            except ModuleNotFoundError:
                return UnconfiguredLLM(
                    "langchain_groq is not installed. Groq has been deprecated in favor of OpenRouter."
                )

            api_key = (settings.GROQ_API_KEY or os.getenv("GROQ_API_KEY", "")).strip()
            if not api_key or "PASTE_" in api_key:
                return UnconfiguredLLM("GROQ_API_KEY is not configured in .env.")
            return GroqLLM()

        else:
            return UnconfiguredLLM(
                f"Unsupported LLM_PROVIDER: {self.provider_name}. Expected 'openrouter' or 'openai'."
            )

    def get_llm(self) -> BaseLLM:
        return self.llm

    def get_provider_name(self) -> str:
        return self.provider_name


class UnconfiguredLLM(BaseLLM):
    """Surfaces clean configuration errors if provider key or dependency is absent."""

    def __init__(self, message: str):
        self.message = message

    async def generate(self, messages, temperature=0.0, **kwargs):
        raise RuntimeError(self.message)

    async def generate_with_context(self, question, context, temperature=0.0, **kwargs):
        raise RuntimeError(self.message)


llm_provider = LLMProvider()
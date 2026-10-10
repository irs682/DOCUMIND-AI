from abc import ABC, abstractmethod
from typing import Any, Dict, List


class BaseLLM(ABC):
    """
    Base interface for all LLM providers.

    Providers such as OpenAI, Gemini, Groq, and Ollama
    can implement this interface.
    """

    @abstractmethod
    async def generate(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.0,
        **kwargs: Any,
    ) -> str:
        """Generate a response from the LLM."""
        raise NotImplementedError

    @abstractmethod
    async def generate_with_context(
        self,
        question: str,
        context: str,
        temperature: float = 0.0,
        **kwargs: Any,
    ) -> str:
        """Generate an answer grounded in retrieved context."""
        raise NotImplementedError
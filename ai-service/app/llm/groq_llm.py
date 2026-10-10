from typing import Any, Dict, List

try:
    from langchain_groq import ChatGroq
except ImportError:
    ChatGroq = None

from app.config.settings import settings
from app.llm.base import BaseLLM
from app.llm.prompts import RAG_SYSTEM_PROMPT


class GroqLLM(BaseLLM):
    """
    Groq implementation for DOCUMIND-AI.

    Provides fast LLM inference through the Groq API.
    """

    def __init__(self):
        if ChatGroq is None:
            raise RuntimeError(
                "langchain_groq is not installed. Groq has been deprecated in favor of OpenRouter."
            )

        if not settings.GROQ_API_KEY:
            raise ValueError(
                "GROQ_API_KEY is not configured."
            )

        if not settings.GROQ_MODEL:
            raise ValueError(
                "GROQ_MODEL is not configured in environment."
            )
        self.model_name = settings.GROQ_MODEL

        self.llm = ChatGroq(
            api_key=settings.GROQ_API_KEY,
            model=self.model_name,
            temperature=0,
        )

    async def generate(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.0,
        **kwargs: Any,
    ) -> str:
        """
        Generate a response using Groq.
        """

        formatted_messages = [
            (
                message["role"],
                message["content"],
            )
            for message in messages
        ]

        response = await self.llm.ainvoke(
            formatted_messages
        )

        return self._extract_content(response)

    async def generate_with_context(
        self,
        question: str,
        context: str,
        temperature: float = 0.0,
        **kwargs: Any,
    ) -> str:
        """
        Generate a grounded response using retrieved
        document context.
        """

        messages = [
            (
                "system",
                RAG_SYSTEM_PROMPT,
            ),
            (
                "human",
                f"""
DOCUMENT CONTEXT
================

{context}

================

USER QUESTION
================

{question}

================

Answer the question using only the
provided document context.

Rules:
- Do not invent information.
- Use the supplied context as the primary source.
- If the context is insufficient, clearly state that.
- Preserve important facts, dates, names, and numbers.
- Include source information when it is available.
""",
            ),
        ]

        response = await self.llm.ainvoke(messages)

        return self._extract_content(response)

    @staticmethod
    def _extract_content(response: Any) -> str:
        """
        Safely extract text from a LangChain response.
        """

        content = getattr(response, "content", "")

        if isinstance(content, str):
            return content.strip()

        if isinstance(content, list):
            parts = []

            for item in content:
                if isinstance(item, dict):
                    text = item.get("text")

                    if text:
                        parts.append(str(text))

                elif isinstance(item, str):
                    parts.append(item)

            return "\n".join(parts).strip()

        return str(content).strip()
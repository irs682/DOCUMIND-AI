from typing import Any, Dict, List

from langchain_google_genai import ChatGoogleGenerativeAI

from app.config.settings import settings
from app.llm.base import BaseLLM
from app.llm.prompts import RAG_SYSTEM_PROMPT


class GeminiLLM(BaseLLM):
    """
    Google Gemini implementation for DOCUMIND-AI.

    This class provides Gemini-based text generation while
    following the common BaseLLM interface.
    """

    def __init__(self):
        if not settings.GEMINI_API_KEY:
            raise ValueError(
                "GEMINI_API_KEY is not configured."
            )

        self.model_name = (
            settings.GEMINI_MODEL
            if settings.GEMINI_MODEL
            else "gemini-2.0-flash"
        )

        self.llm = ChatGoogleGenerativeAI(
            model=self.model_name,
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0,
            max_retries=2,
        )

    async def generate(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.0,
        **kwargs: Any,
    ) -> str:
        """
        Generate a response using Google Gemini.
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
        Generate a grounded answer using retrieved
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
- If the context does not contain enough information,
  clearly state that.
- Preserve important facts, dates, names, and numbers.
- Use source information when it is available.
""",
            ),
        ]

        response = await self.llm.ainvoke(messages)

        return self._extract_content(response)

    @staticmethod
    def _extract_content(response: Any) -> str:
        """
        Safely extract text from the Gemini response.
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

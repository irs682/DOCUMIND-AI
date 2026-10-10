from typing import Any, Dict, List

from openai import AsyncOpenAI

from app.config.settings import settings
from app.llm.base import BaseLLM
from app.llm.prompts import RAG_SYSTEM_PROMPT


class OpenAILLM(BaseLLM):
    """
    OpenAI implementation for DOCUMIND-AI.
    """

    def __init__(self):
        if not settings.OPENAI_API_KEY:
            raise ValueError(
                "OPENAI_API_KEY is not configured."
            )

        self.model_name = (
            settings.OPENAI_MODEL
            if settings.OPENAI_MODEL
            else "gpt-4o-mini"
        )

        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    async def generate(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.0,
        **kwargs: Any,
    ) -> str:

        response = await self.client.chat.completions.create(
            model=self.model_name,
            temperature=temperature,
            messages=messages,
        )
        return response.choices[0].message.content or ""

    async def generate_with_context(
        self,
        question: str,
        context: str,
        temperature: float = 0.0,
        **kwargs: Any,
    ) -> str:

        messages = [
            {
                "role": "system",
                "content": RAG_SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": f"""
DOCUMENT CONTEXT
================

{context}

================

USER QUESTION
================

{question}

================

Answer the question using the document context.
""",
            },
        ]

        return await self.generate(messages, temperature=temperature, **kwargs)

    @staticmethod
    def _extract_content(response: Any) -> str:
        """
        Safely extract text from LangChain response.
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
from typing import Any, Dict, List

from app.llm.provider import llm_provider
from app.llm.prompts import (
    SYSTEM_PROMPT,
    SUMMARY_PROMPT,
    COMPARISON_PROMPT,
    EXTRACTION_PROMPT,
)


class LLMService:
    """
    Application-level LLM service.

    This class provides common operations required by
    DOCUMIND-AI.
    """

    def __init__(self):
        self.llm = llm_provider.get_llm()

    async def chat(
        self,
        message: str,
        history: List[Dict[str, str]] | None = None,
    ) -> str:

        messages = [
            {
                "role": "system",
                "content": SYSTEM_PROMPT,
            }
        ]

        if history:
            messages.extend(history)

        messages.append(
            {
                "role": "user",
                "content": message,
            }
        )

        return await self.llm.generate(messages)

    async def generate(
        self,
        messages: List[Dict[str, str]],
    ) -> str:

        return await self.llm.generate(messages)

    async def answer_with_context(
        self,
        question: str,
        context: str,
    ) -> str:

        return await self.llm.generate_with_context(
            question=question,
            context=context,
        )

    async def summarize(
        self,
        document_text: str,
    ) -> str:

        messages = [
            {
                "role": "system",
                "content": SUMMARY_PROMPT,
            },
            {
                "role": "user",
                "content": document_text,
            },
        ]

        return await self.llm.generate(messages)

    async def compare(
        self,
        document_a: str,
        document_b: str,
    ) -> str:

        prompt = f"""
DOCUMENT A
==========

{document_a}

DOCUMENT B
==========

{document_b}

Compare the two documents.
"""

        messages = [
            {
                "role": "system",
                "content": COMPARISON_PROMPT,
            },
            {
                "role": "user",
                "content": prompt,
            },
        ]

        return await self.llm.generate(messages)

    async def extract(
        self,
        document_text: str,
    ) -> str:

        messages = [
            {
                "role": "system",
                "content": EXTRACTION_PROMPT,
            },
            {
                "role": "user",
                "content": document_text,
            },
        ]

        return await self.llm.generate(messages)

    def get_provider(self) -> str:
        return llm_provider.get_provider_name()


llm_service = LLMService()
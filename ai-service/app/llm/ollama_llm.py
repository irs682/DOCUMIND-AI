from typing import Any, Dict, List

from langchain_ollama import ChatOllama

from app.config.settings import settings
from app.llm.base import BaseLLM
from app.llm.prompts import RAG_SYSTEM_PROMPT


class OllamaLLM(BaseLLM):
    """
    Ollama implementation for DOCUMIND-AI.

    This provider allows DOCUMIND-AI to run an LLM locally
    without sending document content to an external LLM API.
    """

    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL

        self.model_name = (
            settings.OLLAMA_MODEL
            if settings.OLLAMA_MODEL
            else "llama3.2"
        )

        self.llm = ChatOllama(
            base_url=self.base_url,
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
        Generate a response using Ollama.
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

If the context does not contain enough
information, clearly state that.
""",
            ),
        ]

        response = await self.llm.ainvoke(messages)

        return self._extract_content(response)

    @staticmethod
    def _extract_content(response: Any) -> str:
        """
        Safely extract text from the LangChain
        Ollama response.
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
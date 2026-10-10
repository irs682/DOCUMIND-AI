import os
from typing import Any, Dict, List, Optional
import httpx

from app.config.settings import settings
from app.llm.base import BaseLLM
from app.llm.prompts import RAG_SYSTEM_PROMPT


class OpenRouterLLM(BaseLLM):
    """
    OpenRouter implementation for DOCUMIND-AI using direct HTTP requests via httpx.
    """

    def __init__(self):
        self.api_key = (
            settings.OPENROUTER_API_KEY
            or os.getenv("OPENROUTER_API_KEY", "")
        ).strip().strip('"').strip("'")

        self.base_url = (
            settings.OPENROUTER_BASE_URL
            or os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
        ).rstrip("/")

        self.main_model = (
            settings.OPENROUTER_MODEL
            or settings.DEFAULT_LLM_MODEL
            or os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct")
        )
        self.fast_model = (
            settings.OPENROUTER_FAST_MODEL
            or os.getenv("OPENROUTER_FAST_MODEL", self.main_model)
        )

        if not self.api_key or "PASTE_" in self.api_key:
            raise ValueError("OPENROUTER_API_KEY is not configured in .env.")

        if not self.main_model:
            raise ValueError("OPENROUTER_MODEL is not configured in .env.")

    async def generate(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.0,
        model: Optional[str] = None,
        max_tokens: int = 2048,
        **kwargs: Any,
    ) -> str:
        """
        Generate a response using OpenRouter chat completions.
        """
        selected_model = model or self.main_model

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        app_name = (
            settings.OPENROUTER_APP_NAME
            or os.getenv("OPENROUTER_APP_NAME", "DOCUMIND-AI")
        )
        http_referer = (
            settings.OPENROUTER_HTTP_REFERER
            or os.getenv("OPENROUTER_HTTP_REFERER", "http://localhost:5173")
        )

        if app_name:
            headers["X-Title"] = app_name
        if http_referer:
            headers["HTTP-Referer"] = http_referer

        payload = {
            "model": selected_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
            )

        if response.status_code >= 400:
            try:
                data = response.json()
                message = (
                    data.get("error", {}).get("message")
                    or response.text
                )
            except Exception:
                message = response.text

            raise RuntimeError(
                f"OpenRouter request failed ({response.status_code}): {message}"
            )

        data = response.json()
        content = (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content")
        )

        if not content:
            raise RuntimeError("OpenRouter returned no assistant content.")

        return content.strip()

    async def generate_with_context(
        self,
        question: str,
        context: str,
        temperature: float = 0.0,
        **kwargs: Any,
    ) -> str:
        """
        Generate a grounded response using retrieved document context.
        """
        messages = [
            {
                "role": "system",
                "content": RAG_SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": f"""DOCUMENT CONTEXT
================

{context}

================

USER QUESTION
================

{question}

================

Answer the question using only the provided document context.

Rules:
- Do not invent information.
- Use the supplied context as the primary source.
- If the context is insufficient, clearly state that.
- Preserve important facts, dates, names, and numbers.
- Include source information when it is available.
""",
            },
        ]

        return await self.generate(messages, temperature=temperature, **kwargs)

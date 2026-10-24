"""No network or provider construction at import time."""

from app.core.config import settings
from app.llm.base import LLMProvider
from app.llm.providers import (
    ClaudeProvider,
    FakeProvider,
    GeminiProvider,
    OllamaProvider,
)


def get_provider() -> LLMProvider:
    return {
        "fake": FakeProvider,
        "gemini": GeminiProvider,
        "ollama": OllamaProvider,
        "claude": ClaudeProvider,
    }[settings.LLM_PROVIDER]()

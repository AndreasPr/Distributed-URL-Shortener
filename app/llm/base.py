"""Typed boundary; errors deliberately contain no upstream response or prompt."""

from dataclasses import dataclass
from typing import Generic, Protocol, TypeVar

from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


class LLMError(Exception):
    pass


class NotConfigured(LLMError):
    pass


class BudgetExceeded(LLMError):
    pass


class LLMTimeout(LLMError):
    pass


class InvalidOutput(LLMError):
    pass


@dataclass(frozen=True)
class Metadata:
    provider: str
    model: str
    latency_ms: float
    input_tokens: int | None = None
    output_tokens: int | None = None


@dataclass(frozen=True)
class Classification(Generic[T]):
    value: T
    metadata: Metadata


class LLMProvider(Protocol):
    def classify_json(
        self, system_prompt: str, user_content: str, schema: type[T]
    ) -> Classification[T]: ...

"""Typed boundary; errors deliberately contain no upstream response or prompt."""

from dataclasses import dataclass
from typing import Generic, Protocol, TypeVar

from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


class LLMError(Exception):
    pass


class HTTPError(LLMError):
    """Only the numeric status is retained; never retain upstream bodies."""

    def __init__(self, status_code: int):
        self.status_code = status_code
        super().__init__(f"LLM HTTP {status_code}")


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

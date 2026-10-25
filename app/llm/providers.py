"""Small HTTP adapters sharing validation, admission, retry and privacy policy."""

import json
import random
import re
import time
from typing import Any
from urllib.parse import urlsplit

import requests
from opentelemetry.instrumentation.utils import suppress_instrumentation
from pydantic import ValidationError

from app.core.config import settings
from app.llm.base import (
    BudgetExceeded,
    Classification,
    HTTPError,
    InvalidOutput,
    LLMError,
    LLMTimeout,
    Metadata,
    NotConfigured,
    T,
)
from app.llm.limits import GLOBAL_LIMITS, Limits
from app.observability.metrics import (
    llm_errors_total,
    llm_latency_seconds,
    llm_requests_total,
)


class Provider:
    name = "fake"

    def __init__(self, model: str, *, limits: Limits | None = None):
        self.model = model
        self.limits = limits if limits is not None else GLOBAL_LIMITS

    def classify_json(
        self, system_prompt: str, user_content: str, schema: type[T]
    ) -> Classification[T]:
        started = time.monotonic()
        acquired = self.limits.slots.acquire(timeout=settings.LLM_TIMEOUT_SECONDS)
        if not acquired:
            llm_errors_total.labels(self.name, "capacity").inc()
            llm_latency_seconds.labels(self.name).observe(time.monotonic() - started)
            raise LLMTimeout("LLM concurrency wait timed out")
        try:
            input_tokens: int | None = None
            output_tokens: int | None = None
            for repair in range(2):
                prompt = system_prompt
                if repair:
                    # Never echo invalid output or sensitive validation errors.
                    prompt += "\nReturn only valid JSON matching the supplied schema."
                try:
                    raw, tokens_in, tokens_out = self._attempts(
                        prompt, user_content, schema.model_json_schema()
                    )
                    if tokens_in is not None:
                        input_tokens = (input_tokens or 0) + tokens_in
                    if tokens_out is not None:
                        output_tokens = (output_tokens or 0) + tokens_out
                    value = schema.model_validate_json(raw, strict=True)
                except (ValidationError, ValueError, TypeError, InvalidOutput):
                    llm_errors_total.labels(self.name, "schema").inc()
                    if repair:
                        raise InvalidOutput(
                            "LLM output failed schema validation"
                        ) from None
                else:
                    return Classification(
                        value,
                        Metadata(
                            self.name,
                            self.model,
                            (time.monotonic() - started) * 1000,
                            input_tokens,
                            output_tokens,
                        ),
                    )
            raise InvalidOutput("LLM output failed schema validation")
        finally:
            self.limits.slots.release()
            llm_latency_seconds.labels(self.name).observe(time.monotonic() - started)

    def _attempts(
        self, system: str, user: str, schema: dict[str, Any]
    ) -> tuple[str, int | None, int | None]:
        for attempt in range(settings.LLM_MAX_RETRIES + 1):
            try:
                self.limits.reserve()
            except BudgetExceeded:
                llm_errors_total.labels(self.name, "budget").inc()
                raise
            llm_requests_total.labels(self.name).inc()
            try:
                if self.name == "gemini":
                    self.limits.pace(settings.GEMINI_MIN_INTERVAL_SECONDS)
                return self._generate(system, user, schema)
            except Retryable as exc:
                llm_errors_total.labels(self.name, "upstream").inc()
                if attempt == settings.LLM_MAX_RETRIES:
                    raise HTTPError(exc.status_code) from None
                delay = settings.LLM_BACKOFF_SECONDS * 2**attempt
                time.sleep(random.uniform(delay / 2, delay))
            except LLMError:
                llm_errors_total.labels(self.name, "transport").inc()
                raise
        raise LLMError("LLM retry limit exhausted")

    def _generate(
        self, system: str, user: str, schema: dict[str, Any]
    ) -> tuple[str, int | None, int | None]:
        raise NotImplementedError


class Retryable(HTTPError):
    pass


class HTTPProvider(Provider):
    def _post(
        self, url: str, headers: dict[str, str], payload: dict[str, Any]
    ) -> dict[str, Any]:
        # No automatic HTTP spans: upstream bodies/keys must not enter telemetry.
        # No redirects: never forward authentication to another endpoint.
        started = time.monotonic()
        try:
            with suppress_instrumentation(), requests.Session() as session:
                session.trust_env = False
                with session.post(
                    url,
                    headers=headers,
                    json=payload,
                    timeout=(
                        min(3.0, settings.LLM_TIMEOUT_SECONDS),
                        settings.LLM_TIMEOUT_SECONDS,
                    ),
                    allow_redirects=False,
                    stream=True,
                ) as response:
                    if response.status_code == 429 or 500 <= response.status_code < 600:
                        raise Retryable(response.status_code)
                    if response.status_code != 200:
                        raise HTTPError(response.status_code)
                    body = bytearray()
                    for chunk in response.iter_content(chunk_size=4096):
                        if time.monotonic() - started > settings.LLM_TIMEOUT_SECONDS:
                            raise LLMTimeout("LLM response deadline exceeded")
                        body.extend(chunk)
                        if len(body) > 1_048_576:
                            raise LLMError("LLM response too large")
                    data = json.loads(body)
                    if not isinstance(data, dict):
                        raise InvalidOutput("Invalid LLM response envelope")
                    return data
        except requests.Timeout:
            raise LLMTimeout("LLM request timed out") from None
        except requests.RequestException:
            raise LLMError("LLM connection failed") from None
        except (ValueError, UnicodeError):
            raise InvalidOutput("Invalid LLM response envelope") from None

    @staticmethod
    def tokens(value: Any) -> int | None:
        return value if type(value) is int and value >= 0 else None


class GeminiProvider(HTTPProvider):
    name = "gemini"

    def __init__(self, *, limits: Limits | None = None):
        if not settings.GEMINI_API_KEY or not settings.GEMINI_MODEL:
            raise NotConfigured("Gemini requires GEMINI_API_KEY and GEMINI_MODEL")
        if not re.fullmatch(r"[A-Za-z0-9._-]+", settings.GEMINI_MODEL):
            raise NotConfigured("Invalid Gemini model identifier")
        super().__init__(settings.GEMINI_MODEL, limits=limits)

    def _generate(
        self, system: str, user: str, schema: dict[str, Any]
    ) -> tuple[str, int | None, int | None]:
        data = self._post(
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self.model}:generateContent",
            {"x-goog-api-key": settings.GEMINI_API_KEY},
            {
                "systemInstruction": {"parts": [{"text": system}]},
                "contents": [{"role": "user", "parts": [{"text": user}]}],
                "generationConfig": {
                    "responseMimeType": "application/json",
                    "responseJsonSchema": schema,
                    "maxOutputTokens": settings.LLM_MAX_OUTPUT_TOKENS,
                },
            },
        )
        try:
            text = "".join(
                p["text"]
                for p in data["candidates"][0]["content"]["parts"]
                if not p.get("thought")
            )
            usage = data.get("usageMetadata", {})
            return (
                text,
                self.tokens(usage.get("promptTokenCount")),
                self.tokens(usage.get("candidatesTokenCount")),
            )
        except (KeyError, IndexError, TypeError, AttributeError):
            raise InvalidOutput("Invalid Gemini response envelope") from None


class OllamaProvider(HTTPProvider):
    name = "ollama"

    def __init__(self, *, limits: Limits | None = None):
        base = urlsplit(settings.OLLAMA_BASE_URL)
        if (
            base.scheme not in {"http", "https"}
            or base.hostname
            not in {"localhost", "127.0.0.1", "::1", "host.docker.internal", "ollama"}
            or base.username
            or base.password
            or base.query
            or base.fragment
            or base.path not in {"", "/"}
        ):
            raise NotConfigured("Ollama requires a local server origin")
        if not settings.OLLAMA_MODEL or "cloud" in settings.OLLAMA_MODEL.lower():
            raise NotConfigured("Ollama requires a local OLLAMA_MODEL")
        super().__init__(settings.OLLAMA_MODEL, limits=limits)

    def _generate(
        self, system: str, user: str, schema: dict[str, Any]
    ) -> tuple[str, int | None, int | None]:
        data = self._post(
            settings.OLLAMA_BASE_URL.rstrip("/") + "/api/chat",
            {},
            {
                "model": self.model,
                "stream": False,
                "format": schema,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "options": {"num_predict": settings.LLM_MAX_OUTPUT_TOKENS},
            },
        )
        try:
            return (
                data["message"]["content"],
                self.tokens(data.get("prompt_eval_count")),
                self.tokens(data.get("eval_count")),
            )
        except (KeyError, TypeError):
            raise InvalidOutput("Invalid Ollama response envelope") from None


class ClaudeProvider(HTTPProvider):
    """Optional compatibility adapter, not a free-tier recommendation."""

    name = "claude"

    def __init__(self, *, limits: Limits | None = None):
        if not settings.ANTHROPIC_API_KEY or not settings.ANTHROPIC_MODEL:
            raise NotConfigured("Claude requires ANTHROPIC_API_KEY and ANTHROPIC_MODEL")
        super().__init__(settings.ANTHROPIC_MODEL, limits=limits)

    def _generate(
        self, system: str, user: str, schema: dict[str, Any]
    ) -> tuple[str, int | None, int | None]:
        data = self._post(
            "https://api.anthropic.com/v1/messages",
            {
                "x-api-key": settings.ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
            },
            {
                "model": self.model,
                "system": system,
                "max_tokens": settings.LLM_MAX_OUTPUT_TOKENS,
                "messages": [{"role": "user", "content": user}],
                "output_config": {"format": {"type": "json_schema", "schema": schema}},
            },
        )
        try:
            text = "".join(p["text"] for p in data["content"] if p["type"] == "text")
            usage = data.get("usage", {})
            return (
                text,
                self.tokens(usage.get("input_tokens")),
                self.tokens(usage.get("output_tokens")),
            )
        except (KeyError, TypeError, AttributeError):
            raise InvalidOutput("Invalid Claude response envelope") from None


class FakeProvider(Provider):
    """Return caller-supplied JSON unchanged; defaults-only schemas work with {}."""

    def __init__(self, response: str = "{}", *, limits: Limits | None = None):
        super().__init__("deterministic", limits=limits)
        self.response = response

    def _generate(
        self, system: str, user: str, schema: dict[str, Any]
    ) -> tuple[str, int | None, int | None]:
        return self.response, None, None

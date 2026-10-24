"""Offline contract tests. Every HTTP send is intercepted; no credentials needed."""

import json
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from pathlib import Path

import pytest
import requests
from pydantic import BaseModel, ConfigDict

from app.core.config import settings
from app.llm import get_provider
from app.llm.base import (
    BudgetExceeded,
    InvalidOutput,
    LLMError,
    LLMTimeout,
    NotConfigured,
)
from app.llm.limits import GLOBAL_LIMITS, Limits
from app.llm.providers import (
    ClaudeProvider,
    FakeProvider,
    GeminiProvider,
    OllamaProvider,
)
from app.observability.metrics import (
    llm_budget_remaining,
    llm_errors_total,
    llm_requests_total,
)


class Verdict(BaseModel):
    model_config = ConfigDict(extra="forbid")
    safe: bool


@pytest.fixture(autouse=True)
def no_network(monkeypatch):
    def deny(*args, **kwargs):
        raise AssertionError("Real HTTP is forbidden in LLM tests")

    monkeypatch.setattr(requests.Session, "send", deny)
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "placeholder-test-only")
    monkeypatch.setattr(settings, "GEMINI_MODEL", "fixture-model")
    monkeypatch.setattr(settings, "OLLAMA_BASE_URL", "http://localhost:11434")
    monkeypatch.setattr(settings, "OLLAMA_MODEL", "fixture-local")
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "placeholder-test-only")
    monkeypatch.setattr(settings, "ANTHROPIC_MODEL", "fixture-model")
    monkeypatch.setattr(settings, "LLM_MAX_RETRIES", 2)
    monkeypatch.setattr(settings, "LLM_BACKOFF_SECONDS", 0.001)


def http(monkeypatch, replies):
    pending = iter(replies)
    calls = []

    def send(session, request, **kwargs):
        calls.append((request, kwargs))
        reply = next(pending)
        if isinstance(reply, Exception):
            raise reply
        status, body = reply
        response = requests.Response()
        response.status_code = status
        response._content = json.dumps(body).encode()
        response._content_consumed = True
        return response

    monkeypatch.setattr(requests.Session, "send", send)
    return calls


def ollama(text='{"safe":true}'):
    return {"message": {"content": text}, "prompt_eval_count": 4, "eval_count": 3}


def test_fake_deterministic_and_factory(monkeypatch):
    monkeypatch.setattr(settings, "LLM_PROVIDER", "fake")
    assert isinstance(get_provider(), FakeProvider)
    provider = FakeProvider('{"safe":true}', limits=Limits(1, 2))
    result = provider.classify_json("system", "text", Verdict)
    assert result.value.safe is True
    assert result.metadata.provider == "fake"
    assert result.metadata.input_tokens is None
    assert result.metadata.latency_ms >= 0
    assert provider.classify_json("ignored", "different", Verdict).value == result.value


@pytest.mark.parametrize(
    "provider,reply",
    [
        (
            GeminiProvider,
            {
                "candidates": [{"content": {"parts": [{"text": '{"safe":true}'}]}}],
                "usageMetadata": {"promptTokenCount": 4, "candidatesTokenCount": 3},
            },
        ),
        (OllamaProvider, ollama()),
        (
            ClaudeProvider,
            json.loads(
                (Path(__file__).parent / "fixtures/llm/claude_message.json").read_text()
            ),
        ),
    ],
)
def test_recorded_contracts(monkeypatch, provider, reply):
    calls = http(monkeypatch, [(200, reply)])
    result = provider(limits=Limits(1, 10)).classify_json("system", "user", Verdict)
    assert result.value.safe
    assert result.metadata.model.startswith("fixture-")
    assert result.metadata.input_tokens > 0
    request, options = calls[0]
    assert options["timeout"] == (3.0, settings.LLM_TIMEOUT_SECONDS)
    assert options["stream"] is True
    assert "placeholder-test-only" not in request.url
    body = json.loads(request.body)
    if provider is GeminiProvider:
        assert (
            body["generationConfig"]["responseJsonSchema"]
            == Verdict.model_json_schema()
        )
        assert request.headers["x-goog-api-key"] == "placeholder-test-only"
    elif provider is OllamaProvider:
        assert body["format"] == Verdict.model_json_schema()
        assert body["stream"] is False
    else:
        assert body["output_config"]["format"]["schema"] == Verdict.model_json_schema()
        assert request.headers["anthropic-version"] == "2023-06-01"


@pytest.mark.parametrize("status", [429, 500, 503])
def test_backoff_jitter_and_budget_per_attempt(monkeypatch, status):
    calls = http(monkeypatch, [(status, {}), (status, {}), (200, ollama())])
    sleeps = []
    monkeypatch.setattr("app.llm.providers.time.sleep", sleeps.append)
    limits = Limits(1, 3)
    result = OllamaProvider(limits=limits).classify_json("s", "u", Verdict)
    assert result.value.safe and limits.used == 3 and len(calls) == 3
    assert 0.0005 <= sleeps[0] <= 0.001
    assert 0.001 <= sleeps[1] <= 0.002
    assert llm_budget_remaining._value.get() == 0


@pytest.mark.parametrize(
    "bad", ["not JSON", '{"safe":"true"}', '{"safe":true,"extra":1}']
)
def test_single_schema_repair(monkeypatch, bad):
    calls = http(monkeypatch, [(200, ollama(bad)), (200, ollama())])
    result = OllamaProvider(limits=Limits(1, 2)).classify_json("s", "u", Verdict)
    assert result.value.safe and len(calls) == 2
    assert result.metadata.input_tokens == 8
    assert result.metadata.output_tokens == 6
    repair = json.loads(calls[1][0].body)
    assert "matching the supplied schema" in repair["messages"][0]["content"]
    assert bad not in repair["messages"][0]["content"]


def test_bad_envelope_repaired_once(monkeypatch):
    calls = http(monkeypatch, [(200, {}), (200, ollama())])
    assert (
        OllamaProvider(limits=Limits(1, 2)).classify_json("s", "u", Verdict).value.safe
    )
    assert len(calls) == 2


def test_invalid_output_does_not_leak(caplog):
    with pytest.raises(InvalidOutput) as exc:
        FakeProvider("secret-full-prompt", limits=Limits(1, 5)).classify_json(
            "secret", "user", Verdict
        )
    assert "secret" not in str(exc.value)
    assert "secret" not in caplog.text


@pytest.mark.parametrize(
    "failure", [requests.Timeout("secret-key"), requests.ConnectionError("secret-key")]
)
def test_transport_errors_sanitized_no_retry(monkeypatch, failure):
    calls = http(monkeypatch, [failure])
    with pytest.raises(LLMError) as exc:
        OllamaProvider(limits=Limits(1, 10)).classify_json("s", "u", Verdict)
    assert len(calls) == 1 and "secret-key" not in str(exc.value)
    if isinstance(failure, requests.Timeout):
        assert isinstance(exc.value, LLMTimeout)


@pytest.mark.parametrize(
    "status,attempts", [(400, 1), (401, 1), (302, 1), (429, 3), (503, 3)]
)
def test_bounded_failures(monkeypatch, status, attempts):
    calls = http(monkeypatch, [(status, {"error": "secret"})] * attempts)
    with pytest.raises(LLMError):
        OllamaProvider(limits=Limits(1, 10)).classify_json("s", "u", Verdict)
    assert len(calls) == attempts


def test_budget_includes_repairs_and_is_shared(monkeypatch):
    limits = Limits(1, 1)
    http(monkeypatch, [(200, ollama("broken"))])
    with pytest.raises(BudgetExceeded):
        OllamaProvider(limits=limits).classify_json("s", "u", Verdict)
    with pytest.raises(BudgetExceeded):
        FakeProvider('{"safe":true}', limits=limits).classify_json("s", "u", Verdict)
    assert FakeProvider().limits is GLOBAL_LIMITS
    assert GeminiProvider().limits is GLOBAL_LIMITS


def test_budget_resets_next_utc_day_and_zero_disables():
    limits = Limits(1, 1)
    limits.reserve()
    with pytest.raises(BudgetExceeded):
        limits.reserve()
    limits.day -= timedelta(days=1)
    limits.reserve()
    assert limits.used == 1
    with pytest.raises(BudgetExceeded):
        Limits(1, 0).reserve()


def test_global_concurrency_across_instances():
    limits = Limits(2, 30)
    lock = threading.Lock()
    active = peak = 0

    class SlowFake(FakeProvider):
        def _generate(self, *args):
            nonlocal active, peak
            with lock:
                active += 1
                peak = max(peak, active)
            time.sleep(0.01)
            with lock:
                active -= 1
            return '{"safe":true}', None, None

    with ThreadPoolExecutor(max_workers=10) as pool:
        results = list(
            pool.map(
                lambda _: SlowFake(limits=limits).classify_json("s", "u", Verdict),
                range(20),
            )
        )
    assert all(r.value.safe for r in results)
    assert peak == 2 and limits.used == 20


def test_capacity_timeout_does_not_spend_budget(monkeypatch):
    monkeypatch.setattr(settings, "LLM_TIMEOUT_SECONDS", 0.001)
    limits = Limits(1, 1)
    limits.slots.acquire()
    try:
        with pytest.raises(LLMTimeout):
            FakeProvider(limits=limits).classify_json("s", "u", Verdict)
        assert limits.used == 0
    finally:
        limits.slots.release()


@pytest.mark.parametrize(
    "provider,key",
    [
        (GeminiProvider, "GEMINI_API_KEY"),
        (ClaudeProvider, "ANTHROPIC_API_KEY"),
        (OllamaProvider, "OLLAMA_MODEL"),
    ],
)
def test_missing_configuration(monkeypatch, provider, key):
    monkeypatch.setattr(settings, key, "")
    with pytest.raises(NotConfigured):
        provider()


@pytest.mark.parametrize(
    "url",
    [
        "https://ollama.com",
        "http://user:secret@localhost:11434",
        "http://localhost:11434?key=secret",
    ],
)
def test_ollama_remote_or_credential_url_rejected(monkeypatch, url):
    monkeypatch.setattr(settings, "OLLAMA_BASE_URL", url)
    with pytest.raises(NotConfigured):
        OllamaProvider()


def test_attempt_metrics():
    before = llm_requests_total.labels("fake")._value.get()
    errors = llm_errors_total.labels("fake", "schema")._value.get()
    with pytest.raises(InvalidOutput):
        FakeProvider("bad", limits=Limits(1, 3)).classify_json("s", "u", Verdict)
    assert llm_requests_total.labels("fake")._value.get() == before + 2
    assert llm_errors_total.labels("fake", "schema")._value.get() == errors + 2


def test_http_privacy_suppresses_instrumentation(monkeypatch, caplog):
    from opentelemetry.context import _SUPPRESS_INSTRUMENTATION_KEY, get_value

    calls = []
    original = http(monkeypatch, [(200, ollama())])
    send = requests.Session.send

    def guarded(session, request, **kwargs):
        calls.append(get_value(_SUPPRESS_INSTRUMENTATION_KEY))
        return send(session, request, **kwargs)

    monkeypatch.setattr(requests.Session, "send", guarded)
    OllamaProvider(limits=Limits(1, 1)).classify_json(
        "private-system", "private-user", Verdict
    )
    assert calls == [True] and len(original) == 1
    assert "private-system" not in caplog.text
    assert "private-user" not in caplog.text
    assert "placeholder-test-only" not in caplog.text


def test_oversized_response_rejected(monkeypatch):
    http(monkeypatch, [(200, {"message": {"content": "x" * 1_048_577}})])
    with pytest.raises(LLMError, match="too large"):
        OllamaProvider(limits=Limits(1, 2)).classify_json("s", "u", Verdict)


def test_deadline_checked_between_chunks(monkeypatch):
    http(monkeypatch, [(200, ollama())])
    monkeypatch.setattr(settings, "LLM_TIMEOUT_SECONDS", 0.000001)
    with pytest.raises(LLMTimeout):
        OllamaProvider(limits=Limits(1, 2)).classify_json("s", "u", Verdict)


def test_cloud_model_rejected(monkeypatch):
    monkeypatch.setattr(settings, "OLLAMA_MODEL", "fixture-cloud")
    with pytest.raises(NotConfigured):
        OllamaProvider()


def test_budget_reservations_atomic():
    limits = Limits(5, 7)

    def reserve(_):
        try:
            limits.reserve()
            return True
        except BudgetExceeded:
            return False

    with ThreadPoolExecutor(max_workers=20) as pool:
        assert sum(pool.map(reserve, range(100))) == 7

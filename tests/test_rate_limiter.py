import asyncio
import json

from fastapi import FastAPI
from fastapi.responses import PlainTextResponse
from starlette.requests import Request

import app.middleware.rate_limiter as rate_limiter_module
from app.middleware.rate_limiter import rate_limit_middleware


def make_request(path="/shorten", client_host="127.0.0.1", headers=None):
    header_items = []
    for key, value in (headers or {}).items():
        header_items.append((key.lower().encode(), value.encode()))

    scope = {
        "type": "http",
        "http_version": "1.1",
        "method": "GET",
        "path": path,
        "raw_path": path.encode(),
        "query_string": b"",
        "headers": header_items,
        "client": (client_host, 12345),
        "server": ("testserver", 80),
        "scheme": "http",
    }
    return Request(scope)


def test_rate_limiter_allows_request_and_sets_headers(monkeypatch):
    request = make_request(headers={"x-forwarded-for": "10.0.0.5, 10.0.0.6"})
    captured = {}

    def fake_check(key, limit):
        captured["key"] = key
        captured["limit"] = limit
        return True, 7, 0

    monkeypatch.setattr(rate_limiter_module, "_check_sliding_window", fake_check)

    async def call_next(_request):
        return PlainTextResponse("ok")

    response = asyncio.run(rate_limit_middleware(request, call_next))

    assert response.status_code == 200
    assert response.body.decode() == "ok"
    assert captured["key"] == "rate_limit:sw:/shorten:10.0.0.5"
    assert captured["limit"] == 20
    assert response.headers["X-RateLimit-Limit"] == "20"
    assert response.headers["X-RateLimit-Remaining"] == "13"


def test_rate_limiter_rejects_request_when_limit_exceeded(monkeypatch):
    request = make_request(path="/health/redis", client_host="192.168.1.9")
    monkeypatch.setattr(rate_limiter_module, "_check_sliding_window", lambda key, limit: (False, limit, 45_000))

    async def call_next(_request):
        return PlainTextResponse("should not be used")

    response = asyncio.run(rate_limit_middleware(request, call_next))

    assert response.status_code == 429
    assert response.headers["Retry-After"] == "45"
    assert response.headers["X-RateLimit-Limit"] == "100"
    assert response.headers["X-RateLimit-Remaining"] == "0"
    assert json.loads(response.body)["error"] == "Rate limit exceeded"


def test_rate_limiter_fails_open_when_redis_unavailable(monkeypatch):
    request = make_request()
    monkeypatch.setattr(rate_limiter_module, "_check_sliding_window", lambda key, limit: (_ for _ in ()).throw(RuntimeError("redis down")))

    async def call_next(_request):
        return PlainTextResponse("ok")

    response = asyncio.run(rate_limit_middleware(request, call_next))

    assert response.status_code == 200
    assert response.body.decode() == "ok"


def test_rate_limiter_bypasses_metrics_endpoint(monkeypatch):
    request = make_request(path="/metrics")
    called = {"value": False}

    def fake_check(*_args, **_kwargs):
        called["value"] = True
        return True, 0, 0

    monkeypatch.setattr(rate_limiter_module, "_check_sliding_window", fake_check)

    async def call_next(_request):
        return PlainTextResponse("metrics")

    response = asyncio.run(rate_limit_middleware(request, call_next))

    assert response.status_code == 200
    assert response.body.decode() == "metrics"
    assert called["value"] is False

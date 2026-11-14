"""Explicit hosted IP trust and shared-bucket availability contracts."""

import os
import subprocess
import sys
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.testclient import TestClient

from app.api import auth, trust
from app.api.principal import Principal
from app.api.routes import router as urls_router
from app.api.workspaces import router as workspace_router
from app.core.config import settings
from app.middleware import rate_limiter as limiter
from app.models.identity import DEFAULT_WORKSPACE_ID


def config_result(**changes):
    env = {
        "PATH": os.environ["PATH"],
        "ENVIRONMENT": "production",
        "AUTH_MODE": "supabase",
        "SUPABASE_URL": "https://fixture.example",
        "DATABASE_URL": "postgresql://fixture@db.invalid/db",
        "REDIS_URL": "rediss://cache.invalid:6379",
        "CORS_ORIGINS": "https://frontend.example",
        "LLM_DAILY_BUDGET": "0",
        **changes,
    }
    return subprocess.run(
        [sys.executable, "-c", "from app.core.config import settings"],
        env=env,
        capture_output=True,
        text=True,
    )


@pytest.mark.parametrize("mode", ["trusted_proxies", "peer_only"])
@pytest.mark.parametrize("network", ["0.0.0.0/0", "::/0", "10.0.0.1/0"])
def test_unrestricted_proxies_always_rejected(mode, network):
    result = config_result(CLIENT_IP_MODE=mode, TRUSTED_PROXIES=network)
    assert result.returncode != 0
    assert "TRUSTED_PROXIES" in result.stderr


def test_explicit_mode_required_and_validated():
    assert config_result().returncode != 0
    assert config_result(CLIENT_IP_MODE="peer_only").returncode == 0
    assert config_result(TRUSTED_PROXIES="10.2.3.4/32").returncode == 0
    result = config_result(CLIENT_IP_MODE="auto")
    assert result.returncode != 0
    assert "CLIENT_IP_MODE" in result.stderr


def test_peer_ignores_all_forwarded_headers_even_from_allowlisted_peer(monkeypatch):
    monkeypatch.setattr(settings, "CLIENT_IP_MODE", "peer_only")
    monkeypatch.setattr(settings, "TRUSTED_PROXIES", ["10.2.3.4/32"])
    for value in ["198.51.100.1", "203.0.113.1, 10.2.3.4", "invalid"]:
        request = Request(
            {
                "type": "http",
                "client": ("10.2.3.4", 123),
                "headers": [
                    (name.encode(), value.encode())
                    for name in [
                        "x-forwarded-for",
                        "forwarded",
                        "x-real-ip",
                        "cf-connecting-ip",
                        "true-client-ip",
                    ]
                ],
            }
        )
        assert limiter.client_ip(request) == "10.2.3.4"


@pytest.mark.parametrize("mode", ["trusted_proxies", "peer_only"])
@pytest.mark.parametrize("kind", ["user", "api_key"])
def test_authenticated_buckets_still_limit_and_isolate_principals(
    monkeypatch, mode, kind
):
    monkeypatch.setattr(settings, "CLIENT_IP_MODE", mode)
    monkeypatch.setattr(settings, "WRITE_RATE_CAPACITY", 1)
    monkeypatch.setattr(settings, "AUTH_IP_RATE_CAPACITY", 1)
    buckets = limiter.LocalBuckets(clock=lambda: 0)
    monkeypatch.setattr(
        limiter,
        "check_bucket",
        lambda path, identity, cap, refill: buckets.check(path + identity, cap, refill),
    )
    app = FastAPI()
    app.middleware("http")(limiter.rate_limit_middleware)
    app.include_router(workspace_router)
    principal = Principal(
        workspace_id=DEFAULT_WORKSPACE_ID,
        role="owner",
        scopes=frozenset({"write"}),
        auth_method=kind,
        user_id="00000000-0000-0000-0000-000000000010" if kind == "user" else None,
        api_key_id=1 if kind == "api_key" else None,
        email_verified=True,
    )
    app.dependency_overrides[auth.get_principal] = lambda: principal

    @app.post("/write")
    def write(p=Depends(auth.require_write)):
        return {"ok": True}

    client = TestClient(app)
    assert client.post("/write").status_code == 200
    denied = client.post("/write", headers={"x-forwarded-for": "203.0.113.8"})
    assert denied.status_code == 429
    assert "retry-after" in denied.headers
    from dataclasses import replace

    principal = replace(
        principal,
        **(
            {"user_id": "00000000-0000-0000-0000-000000000011"}
            if kind == "user"
            else {"api_key_id": 2}
        ),
    )
    assert client.post("/write").status_code == 200
    if mode == "peer_only":
        assert client.get("/me").status_code == 200
        assert client.get("/me").status_code == 429
        principal = replace(
            principal,
            **(
                {"user_id": "00000000-0000-0000-0000-000000000012"}
                if kind == "user"
                else {"api_key_id": 3}
            ),
        )
        assert client.get("/me").status_code == 200


def test_peer_public_routes_do_not_consume_shared_bucket_and_reports_keep_captcha(
    monkeypatch,
):
    monkeypatch.setattr(settings, "CLIENT_IP_MODE", "peer_only")
    monkeypatch.setattr(settings, "APP_ROLE", "api")
    forbidden = Mock(side_effect=AssertionError("shared bucket must not be used"))
    monkeypatch.setattr(limiter, "check_bucket", forbidden)
    monkeypatch.setattr(trust, "check_bucket", forbidden)
    captcha = Mock(side_effect=HTTPException(403, "CAPTCHA required"))
    monkeypatch.setattr(trust, "verify_captcha", captcha)
    app = FastAPI()
    app.middleware("http")(limiter.rate_limit_middleware)
    app.include_router(trust.router)
    from app.db.database import get_db

    app.dependency_overrides[get_db] = lambda: None
    app.include_router(urls_router)
    app.include_router(workspace_router)
    # Exercise public middleware with a harmless redirect handler, no DB.
    app.router.routes = [
        r for r in app.router.routes if getattr(r, "path", "") != "/{code}"
    ]

    @app.get("/{code}")
    def redirect(code: str):
        return {"code": code}

    client = TestClient(app)
    for _ in range(125):
        assert client.get("/sample").status_code == 200
    assert (
        client.post("/shorten", json={"long_url": "https://example.com/"}).status_code
        == 401
    )
    assert client.get("/me").status_code == 401
    response = client.post(
        "/reports",
        json={"short_code": "sample", "category": "spam", "captcha_token": "fixture"},
    )
    assert response.status_code == 403
    captcha.assert_called_once_with("fixture", "report")
    forbidden.assert_not_called()
    trust.public_limit(
        Request(
            {
                "type": "http",
                "client": ("10.2.3.4", 1),
                "headers": [],
                "route": SimpleNamespace(path="/warnings/{code}/continue"),
            }
        )
    )


def test_peer_warning_once_per_startup(monkeypatch, caplog):
    from app import main

    monkeypatch.setattr(settings, "CLIENT_IP_MODE", "peer_only")
    monkeypatch.setattr(settings, "APP_ROLE", "api")
    monkeypatch.setattr(main, "_on_startup", AsyncMock())
    monkeypatch.setattr(main, "_on_shutdown", AsyncMock())
    with caplog.at_level("WARNING"), TestClient(main.app) as client:
        client.get("/livez")
        client.get("/livez")
    warnings = [
        r for r in caplog.records if "CLIENT_IP_MODE=peer_only" in r.getMessage()
    ]
    assert len(warnings) == 1
    assert "not enforced" in warnings[0].getMessage()

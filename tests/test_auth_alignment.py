"""Auth alignment contracts: trusted metadata, authorization and abuse boundaries."""

import json
import threading
from dataclasses import replace
from datetime import datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from types import SimpleNamespace
from uuid import uuid4

import jwt
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.api.auth import get_principal
from app.api.dev_auth import router as dev_router
from app.api.principal import Principal
from app.api.routes import router
from app.api.workspaces import router as workspace_router
from app.core.config import settings
from app.db.database import get_db
from app.middleware.rate_limiter import check_bucket, limit_write, rate_limit_middleware
from app.models.identity import DEFAULT_WORKSPACE_ID, User, Workspace, WorkspaceMember
from app.models.url import URL
from app.models.url_verdict import URLVerdict
from app.services.api_keys import KeyScopeError, authenticate, create_key
from app.services.jwt_auth import InvalidToken, local_key, verify_token
from app.services.user_auth import seed_demo_users, user_principal


@pytest.fixture
def supabase(monkeypatch):
    state = SimpleNamespace(body={}, status=200, calls=[])

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            state.calls.append(
                (
                    self.path,
                    self.headers.get("apikey"),
                    self.headers.get("Authorization"),
                )
            )
            self.send_response(state.status)
            self.end_headers()
            self.wfile.write(json.dumps(state.body).encode())

        def log_message(self, *args):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    monkeypatch.setattr(settings, "AUTH_MODE", "supabase")
    monkeypatch.setattr(
        settings, "SUPABASE_URL", f"http://127.0.0.1:{server.server_port}"
    )
    monkeypatch.setattr(settings, "SUPABASE_ANON_KEY", "placeholder-anon-key")
    monkeypatch.setattr(
        settings, "PLATFORM_ADMIN_EMAILS", frozenset({"admin@example.test"})
    )
    try:
        yield state
    finally:
        server.shutdown()
        server.server_close()
        thread.join()


@pytest.fixture
def client(db_session):
    app = FastAPI()
    app.middleware("http")(rate_limit_middleware)
    app.include_router(dev_router)
    app.include_router(workspace_router)
    app.include_router(router)
    app.dependency_overrides[get_db] = lambda: db_session
    return TestClient(app)


def human(db, role="owner", verified=True):
    subject = str(uuid4())
    db.add(User(id=subject, email="person@example.test", email_verified=verified))
    db.flush()
    db.add(
        WorkspaceMember(workspace_id=DEFAULT_WORKSPACE_ID, user_id=subject, role=role)
    )
    db.commit()
    return Principal(
        user_id=subject,
        workspace_id=DEFAULT_WORKSPACE_ID,
        role=role,
        scopes=frozenset(),
        auth_method="user",
        email_verified=verified,
    )


@pytest.mark.parametrize("confirmed", [True, False])
def test_trusted_confirmation_and_hourly_attempt_limit(supabase, db_session, confirmed):
    subject = str(uuid4())
    supabase.body = {
        "id": subject,
        "email": "Admin@Example.Test",
        "email_confirmed_at": "2026-01-01T00:00:00Z" if confirmed else None,
        "user_metadata": {"email_verified": True},
    }
    claims = {
        "sub": subject,
        "email": "forged@example.test",
        "email_verified": True,
        "user_metadata": {"email_verified": True},
        "platform_admin": True,
    }
    for _ in range(3):
        principal = user_principal(db_session, claims, token="placeholder-token")
        assert principal.email_verified is confirmed
        assert principal.platform_admin is confirmed
    assert supabase.calls == [
        ("/auth/v1/user", "placeholder-anon-key", "Bearer placeholder-token")
    ]
    row = db_session.get(User, subject)
    row.email_verification_checked_at -= timedelta(hours=2)
    db_session.commit()
    user_principal(db_session, claims, token="placeholder-token")
    assert len(supabase.calls) == 2


def test_outage_keeps_previous_and_claims_cannot_verify(supabase, db_session):
    subject = str(uuid4())
    supabase.status = 503
    claims = {
        "sub": subject,
        "email": "admin@example.test",
        "user_metadata": {"email_verified": True},
    }
    principal = user_principal(db_session, claims, token="placeholder-token")
    assert not principal.email_verified and not principal.platform_admin
    row = db_session.get(User, subject)
    row.email_verified = True
    row.email_verification_checked_at -= timedelta(hours=2)
    db_session.commit()
    assert user_principal(db_session, claims, token="placeholder-token").email_verified
    user_principal(db_session, claims, token="placeholder-token")
    assert len(supabase.calls) == 2


def test_invalid_workspace_does_not_reset_email_budget(supabase, db_session):
    subject = str(uuid4())
    supabase.status = 503
    for _ in range(2):
        with pytest.raises(InvalidToken):
            user_principal(
                db_session, {"sub": subject}, str(uuid4()), token="placeholder-token"
            )
    assert len(supabase.calls) == 1


def test_anonymous_session_is_generic_401(client, monkeypatch):
    import time

    monkeypatch.setattr(settings, "AUTH_MODE", "local")
    token = jwt.encode(
        {
            "sub": str(uuid4()),
            "is_anonymous": True,
            "exp": int(time.time()) + 60,
            "iss": "relaymark-local",
            "aud": "relaymark-demo",
        },
        local_key(),
        algorithm="RS256",
    )
    response = client.get("/me", headers={"Authorization": "Bearer " + token})
    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid credentials"}
    assert response.headers["www-authenticate"] == "Bearer"


@pytest.mark.parametrize(
    "method,path,body",
    [
        ("POST", "/shorten", {"long_url": "https://example.com"}),
        ("DELETE", "/urls/missing", None),
        ("POST", "/api-keys", {"name": "test", "scopes": ["read"]}),
        ("DELETE", "/api-keys/1", None),
        ("POST", "/workspaces", {"name": "new", "slug": "new"}),
        (
            "POST",
            f"/workspaces/{DEFAULT_WORKSPACE_ID}/members",
            {"email": "new@example.test"},
        ),
        (
            "PATCH",
            f"/workspaces/{DEFAULT_WORKSPACE_ID}/members",
            {"user_id": str(uuid4()), "role": "member"},
        ),
        ("DELETE", f"/workspaces/{DEFAULT_WORKSPACE_ID}/members/{uuid4()}", None),
        ("POST", "/admin/flagged/missing/review", {"decision": "block"}),
    ],
)
def test_unverified_humans_read_but_cannot_mutate(
    client, db_session, method, path, body
):
    principal = human(db_session, verified=False)
    client.app.dependency_overrides[get_principal] = lambda: principal
    assert client.get("/me").status_code == 200
    assert client.get("/urls").status_code == 200
    response = client.request(method, path, json=body)
    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "email_unverified"


def test_api_keys_unaffected_by_email_gate(client, db_session):
    _, raw = create_key(db_session, "writer", ["read", "write"])
    response = client.post(
        "/shorten", headers={"X-API-Key": raw}, json={"long_url": "https://example.com"}
    )
    assert response.status_code == 200


def test_platform_boundary_and_global_queue(client, db_session):
    principal = human(db_session, role="admin")
    other = str(uuid4())
    db_session.add(Workspace(id=other, name="other", slug="other"))
    db_session.flush()
    db_session.add(
        URL(short_code="foreign", long_url="https://example.com", workspace_id=other)
    )
    db_session.flush()
    db_session.add(
        URLVerdict(
            short_code="foreign",
            workspace_id=other,
            verdict="suspicious",
            score=0.5,
            reasons=["path_keyword"],
            source="heuristic",
        )
    )
    db_session.commit()
    client.app.dependency_overrides[get_principal] = lambda: principal
    for path in ["/admin/flagged", "/admin/activity/foreign"]:
        assert client.get(path).status_code == 403
    _, key = create_key(db_session, "admin-key", ["admin"])
    del client.app.dependency_overrides[get_principal]
    assert client.get("/admin/flagged", headers={"X-API-Key": key}).status_code == 403
    principal = replace(principal, platform_admin=True)
    client.app.dependency_overrides[get_principal] = lambda: principal
    assert client.get("/admin/flagged").json()[0]["short_code"] == "foreign"
    assert client.get("/admin/activity/foreign").status_code == 200
    assert (
        client.post(
            "/admin/flagged/foreign/review", json={"decision": "allow"}
        ).status_code
        == 204
    )


@pytest.mark.parametrize(
    "role,scopes,allowed",
    [
        ("viewer", ["write"], False),
        ("member", ["admin"], False),
        ("admin", ["admin"], True),
        ("owner", ["admin"], True),
        ("member", ["read", "write"], True),
    ],
)
def test_key_scope_ceiling(db_session, role, scopes, allowed):
    creator = human(db_session, role=role)
    if allowed:
        create_key(db_session, "scoped", scopes, created_by_user_id=creator.user_id)
    else:
        with pytest.raises(KeyScopeError):
            create_key(db_session, "scoped", scopes, created_by_user_id=creator.user_id)


def test_key_removal_demotion_and_one_time_secret(client, db_session):
    owner = human(db_session)
    admin = human(db_session, "admin")
    client.app.dependency_overrides[get_principal] = lambda: admin
    issued = client.post("/api-keys", json={"name": "test", "scopes": ["admin"]})
    assert issued.status_code == 201
    secret = issued.json()["key"]
    listing = client.get("/api-keys")
    assert secret not in listing.text and "key_hash" not in listing.text
    assert authenticate(db_session, secret) is not None
    member = db_session.get(WorkspaceMember, (DEFAULT_WORKSPACE_ID, admin.user_id))
    member.role = "member"
    db_session.commit()
    assert authenticate(db_session, secret) is None
    client.app.dependency_overrides[get_principal] = lambda: replace(
        admin, role="member"
    )
    assert (
        client.post(
            "/api-keys", json={"name": "escalation", "scopes": ["admin"]}
        ).status_code
        == 403
    )
    client.app.dependency_overrides[get_principal] = lambda: owner
    assert (
        client.delete(
            f"/workspaces/{DEFAULT_WORKSPACE_ID}/members/{admin.user_id}"
        ).status_code
        == 204
    )
    assert client.get("/api-keys").json()[0]["revoked_at"] is not None
    assert authenticate(db_session, secret) is None


def test_namespaced_principal_and_ip_write_buckets(client, db_session, monkeypatch):
    import app.middleware.rate_limiter as limiter

    captured = []
    original = limiter.check_bucket
    monkeypatch.setattr(
        limiter,
        "check_bucket",
        lambda *args: (captured.append(args) or original(*args)),
    )
    principal = human(db_session)
    client.app.dependency_overrides[get_principal] = lambda: principal
    client.post("/shorten", json={"long_url": "https://example.com"})
    assert captured[-1][0] == "/shorten"
    assert captured[-1][1] == f"user:{principal.user_id}:ip:testclient"
    del client.app.dependency_overrides[get_principal]
    key, raw = create_key(db_session, "writer", ["write"])
    client.post(
        "/shorten", headers={"X-API-Key": raw}, json={"long_url": "https://example.com"}
    )
    assert captured[-1][1] == f"key:{key.id}:ip:testclient"


@pytest.mark.parametrize(
    "method,path,body", [("GET", "/me", None), ("POST", "/auth/dev-login", {})]
)
def test_auth_ip_limit_before_authentication(client, monkeypatch, method, path, body):
    monkeypatch.setattr(settings, "AUTH_IP_RATE_CAPACITY", 2)
    monkeypatch.setattr(settings, "AUTH_IP_RATE_REFILL", 0.0001)
    for _ in range(2):
        assert client.request(method, path, json=body).status_code != 429
    response = client.request(
        method, path, json=body, headers={"X-Forwarded-For": "1.2.3.4"}
    )
    assert response.status_code == 429 and int(response.headers["retry-after"]) > 0


def test_local_seed_verified(db_session):
    seed_demo_users(db_session)
    assert all(user.email_verified for user in db_session.scalars(select(User)))


@pytest.mark.parametrize("mode", ["local", "apikey_only"])
def test_production_requires_supabase(mode):
    import os
    import subprocess
    import sys

    result = subprocess.run(
        [sys.executable, "-c", "import app.core.config"],
        env=os.environ | {"ENVIRONMENT": "production", "AUTH_MODE": mode},
        capture_output=True,
        text=True,
    )
    assert result.returncode != 0
    assert "Production requires AUTH_MODE=supabase" in result.stderr


@pytest.mark.parametrize(
    "url",
    [
        "",
        "http://project.supabase.co",
        "https://project.supabase.co/path",
        "https://user:pass@project.supabase.co",
    ],
)
def test_production_requires_https_origin(url):
    import os
    import subprocess
    import sys

    result = subprocess.run(
        [sys.executable, "-c", "import app.core.config"],
        env=os.environ
        | {
            "ENVIRONMENT": "production",
            "AUTH_MODE": "supabase",
            "SUPABASE_URL": url,
            "CORS_ORIGINS": "https://example.com",
        },
        capture_output=True,
    )
    assert result.returncode != 0


@pytest.mark.parametrize(
    "args,ack,allowed",
    [
        (["uvicorn", "app.main:app"], False, True),
        (["uvicorn", "app.main:app", "--host", "127.0.0.1"], False, True),
        (["uvicorn", "app.main:app", "--host=::1"], False, True),
        (["uvicorn", "app.main:app", "--host", "0.0.0.0"], False, False),
        (["uvicorn", "app.main:app", "--host", "0.0.0.0"], True, True),
        (["uvicorn", "app.main:app", "--fd", "3"], False, False),
        (["custom_server.py"], False, False),
        (["custom_uvicorn_server.py"], False, False),
    ],
)
def test_local_listener_guard(monkeypatch, caplog, args, ack, allowed):
    import sys
    from app.services.auth_startup import validate_local_binding

    monkeypatch.setattr(settings, "AUTH_MODE", "local")
    monkeypatch.setattr(settings, "LOCAL_AUTH_I_UNDERSTAND", ack)
    monkeypatch.setattr(sys, "argv", args)
    monkeypatch.delenv("UVICORN_HOST", raising=False)
    if allowed:
        validate_local_binding()
        assert "LOCAL AUTH ENABLED" in caplog.text
    else:
        with pytest.raises(RuntimeError, match="loopback"):
            validate_local_binding()


def test_email_response_subject_and_size_limits(supabase, db_session):
    for body in [
        {
            "id": str(uuid4()),
            "email": "admin@example.test",
            "email_confirmed_at": "2026-01-01T00:00:00Z",
        },
        {"oversized": "a" * 65537},
    ]:
        subject = str(uuid4())
        supabase.body = body
        assert not user_principal(
            db_session, {"sub": subject}, token="placeholder-token"
        ).email_verified


def test_delegated_key_creator_is_retained_and_removed(client, db_session):
    owner = human(db_session)
    admin = human(db_session, "admin")
    _, parent = create_key(
        db_session, "parent", ["admin"], created_by_user_id=admin.user_id
    )
    issued = client.post(
        "/api-keys",
        headers={"X-API-Key": parent},
        json={"name": "child", "scopes": ["read"]},
    )
    assert issued.status_code == 201
    child = issued.json()["key"]
    assert authenticate(db_session, child).created_by_user_id == admin.user_id
    client.app.dependency_overrides[get_principal] = lambda: owner
    assert (
        client.delete(
            f"/workspaces/{DEFAULT_WORKSPACE_ID}/members/{admin.user_id}"
        ).status_code
        == 204
    )
    assert authenticate(db_session, parent) is None
    assert authenticate(db_session, child) is None


def test_actor_ip_pair_and_auth_store_failure(
    client, db_session, isolated_cache, monkeypatch
):
    from starlette.requests import Request

    monkeypatch.setattr(settings, "WRITE_RATE_CAPACITY", 1)
    monkeypatch.setattr(settings, "WRITE_RATE_REFILL", 0.0001)

    def request(ip):
        return Request(
            {
                "type": "http",
                "headers": [],
                "client": (ip, 1234),
                "route": SimpleNamespace(path="/shorten"),
            }
        )

    limit_write(request("198.51.100.1"), "user:example")
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as failure:
        limit_write(request("198.51.100.1"), "user:example")
    assert failure.value.status_code == 429
    limit_write(request("198.51.100.2"), "user:example")
    limit_write(request("198.51.100.1"), "key:example")
    isolated_cache.down = True
    assert client.get("/me").status_code == 503


def test_email_http_contract_and_metrics(monkeypatch):
    from unittest.mock import MagicMock
    from app.services.email_verification import confirmed_email
    from app.observability.metrics import auth_email_verification_total
    import app.services.email_verification as service

    monkeypatch.setattr(settings, "SUPABASE_ANON_KEY", "placeholder-key")
    monkeypatch.setattr(settings, "SUPABASE_URL", "https://project.supabase.co")
    response = MagicMock()
    response.__enter__.return_value = response
    response.status_code = 200
    response.iter_content.return_value = [
        json.dumps(
            {"id": "subject", "email": "ok@example.test", "email_confirmed_at": None}
        ).encode()
    ]
    get = MagicMock(return_value=response)
    monkeypatch.setattr(service.requests, "get", get)
    counter = auth_email_verification_total.labels(result="unconfirmed")
    before = counter._value.get()
    assert confirmed_email("subject", "placeholder-token") == ("ok@example.test", False)
    assert counter._value.get() == before + 1
    assert get.call_args.kwargs["timeout"] == 2
    assert get.call_args.kwargs["allow_redirects"] is False
    response.status_code = 302
    assert confirmed_email("subject", "placeholder-token") is None


def test_all_protected_mutations_use_verification_gate():
    # Guard route additions: all application mutations share the two enforcing deps.
    from fastapi.routing import APIRoute
    from app.api.auth import require_platform_admin

    for route in [*router.routes, *workspace_router.routes]:
        if not isinstance(route, APIRoute) or not route.methods.intersection(
            {"POST", "PUT", "PATCH", "DELETE"}
        ):
            continue
        calls = [dep.call for dep in route.dependant.dependencies]
        assert any(
            call is require_platform_admin
            or getattr(call, "__module__", "") == "app.api.auth"
            and getattr(call, "__name__", "") == "dependency"
            for call in calls
        ), route.path

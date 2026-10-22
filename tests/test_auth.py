import hashlib
import json
from unittest.mock import Mock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.exc import OperationalError

import app.main as main
from app.core.config import settings
from app.db.database import get_db
from app.models.url import URL
from app.services.api_keys import authenticate, create_key, list_keys, revoke_key


@pytest.fixture
def client(db_session, monkeypatch):
    import app.services.url_service as service

    monkeypatch.setattr(service, "publish_click_event", Mock())
    monkeypatch.setattr(main, "init_tracing", Mock())
    monkeypatch.setattr(main, "configure_logging_with_tracing", Mock())
    previous = main.app.dependency_overrides.copy()
    main.app.dependency_overrides[get_db] = lambda: db_session
    from app.api.routes import get_health_db

    main.app.dependency_overrides[get_health_db] = lambda: db_session
    try:
        with TestClient(main.app) as client:
            yield client
    finally:
        main.app.dependency_overrides = previous


def test_key_hashing_metadata_and_revocation(db_session, monkeypatch):
    import app.services.api_keys as service
    import hmac

    key, raw = create_key(db_session, "demo", ["read", "write"])
    assert len(raw) >= 40
    assert key.key_hash == hashlib.sha256(raw.encode()).hexdigest()
    assert key.key_hash != raw and key.prefix == raw[:8]
    assert key.created_at and key.last_used_at is None
    compare = Mock(wraps=hmac.compare_digest)
    monkeypatch.setattr(service.hmac, "compare_digest", compare)
    assert authenticate(db_session, raw).id == key.id
    assert key.last_used_at is not None
    assert authenticate(db_session, "invalid") is None
    assert compare.call_count == 2
    assert all(
        len(value) == 64 for args in compare.call_args_list for value in args.args
    )
    assert raw not in json.dumps(list_keys(db_session))
    assert "key_hash" not in list_keys(db_session)[0]
    assert revoke_key(db_session, key.id)
    assert revoke_key(db_session, key.id)  # idempotent
    assert authenticate(db_session, raw) is None
    assert not revoke_key(db_session, 9999)


@pytest.mark.parametrize("name,scopes", [("", ["read"]), ("ok", []), ("ok", ["root"])])
def test_key_invalid_creation(db_session, name, scopes):
    with pytest.raises(ValueError):
        create_key(db_session, name, scopes)


@pytest.mark.parametrize(
    "method,path",
    [
        ("POST", "/shorten"),
        ("DELETE", "/urls/code"),
        ("GET", "/urls"),
        ("GET", "/analytics/code"),
        ("GET", "/admin/keys"),
        ("DELETE", "/admin/keys/1"),
    ],
)
@pytest.mark.parametrize("header", [None, "invalid"])
def test_missing_and_invalid_keys_are_401(client, method, path, header):
    response = client.request(
        method,
        path,
        headers={"X-API-Key": header} if header else {},
        json={"long_url": "https://example.com"} if method == "POST" else None,
    )
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "APIKey"


def test_scope_enforcement_and_creator(client, db_session):
    read, read_raw = create_key(db_session, "reader", ["read"])
    write, write_raw = create_key(db_session, "writer", ["write"])
    admin, admin_raw = create_key(db_session, "admin", ["admin"])
    assert (
        client.post(
            "/shorten",
            json={"long_url": "https://example.com"},
            headers={"X-API-Key": read_raw},
        ).status_code
        == 403
    )
    assert client.get("/urls", headers={"X-API-Key": write_raw}).status_code == 403
    assert (
        client.get("/analytics/missing", headers={"X-API-Key": write_raw}).status_code
        == 403
    )
    assert client.get("/admin/keys", headers={"X-API-Key": read_raw}).status_code == 403
    response = client.post(
        "/shorten",
        json={"long_url": "https://example.com"},
        headers={"X-API-Key": write_raw},
    )
    assert response.status_code == 200
    code = response.json()["short_code"]
    assert db_session.scalar(
        select(URL).where(URL.short_code == code)
    ).created_by == str(write.id)
    assert client.get("/urls", headers={"X-API-Key": read_raw}).status_code == 200
    assert (
        client.get("/analytics/" + code, headers={"X-API-Key": read_raw}).status_code
        == 200
    )
    assert (
        client.delete("/urls/" + code, headers={"X-API-Key": read_raw}).status_code
        == 403
    )
    assert (
        client.get("/admin/keys", headers={"X-API-Key": admin_raw}).status_code == 200
    )
    assert (
        client.delete(
            "/admin/keys/" + str(write.id), headers={"X-API-Key": admin_raw}
        ).status_code
        == 204
    )
    assert client.get("/urls", headers={"X-API-Key": write_raw}).status_code == 401
    assert (
        client.delete("/urls/" + code, headers={"X-API-Key": admin_raw}).status_code
        == 204
    )


def test_public_endpoints_and_openapi(client):
    for path in ("/health", "/livez", "/metrics"):
        assert client.get(path).status_code == 200
    assert client.get("/unknown", follow_redirects=False).status_code == 404
    spec = client.get("/openapi.json").json()
    assert spec["components"]["securitySchemes"]["APIKeyHeader"]["name"] == "X-API-Key"
    for path, method in [
        ("/shorten", "post"),
        ("/urls", "get"),
        ("/analytics/{short_code}", "get"),
    ]:
        assert spec["paths"][path][method]["security"]
    assert not spec["paths"]["/{code}"]["get"].get("security")


def test_auth_database_failure_is_503(client, db_session, monkeypatch):
    monkeypatch.setattr(
        db_session,
        "scalar",
        Mock(side_effect=OperationalError("select", {}, Exception("offline"))),
    )
    response = client.get("/urls", headers={"X-API-Key": "invalid"})
    assert response.status_code == 503
    assert response.json() == {"detail": "Authentication unavailable"}


def test_write_limits_and_key_isolation(
    client, db_session, isolated_cache, monkeypatch
):
    monkeypatch.setattr(settings, "WRITE_RATE_CAPACITY", 2)
    isolated_cache.clock = lambda: 100.0
    _, raw1 = create_key(db_session, "one", ["write"])
    _, raw2 = create_key(db_session, "two", ["write"])
    for _ in range(2):
        response = client.post(
            "/shorten",
            json={"long_url": "https://example.com"},
            headers={"X-API-Key": raw1},
        )
        assert response.status_code == 200
    response = client.post(
        "/shorten",
        json={"long_url": "https://example.com"},
        headers={"X-API-Key": raw1},
    )
    assert response.status_code == 429 and response.headers["retry-after"] == "1"
    assert response.headers["ratelimit-remaining"] == "0"
    assert (
        client.post(
            "/shorten",
            json={"long_url": "https://example.com"},
            headers={"X-API-Key": raw2},
        ).status_code
        == 200
    )
    assert all(raw1 not in key and raw2 not in key for key in isolated_cache.buckets)


def test_delete_uses_template_bucket_not_code(
    client, db_session, isolated_cache, monkeypatch
):
    monkeypatch.setattr(settings, "WRITE_RATE_CAPACITY", 1)
    isolated_cache.clock = lambda: 100.0
    _, raw = create_key(db_session, "writer", ["write"])
    assert client.delete("/urls/first", headers={"X-API-Key": raw}).status_code == 404
    assert client.delete("/urls/second", headers={"X-API-Key": raw}).status_code == 429
    assert len(isolated_cache.buckets) == 1
    assert "/urls/{code}" in next(iter(isolated_cache.buckets))


def test_redirects_share_ip_bucket_and_ignore_spoofed_headers(
    client, isolated_cache, monkeypatch
):
    monkeypatch.setattr(settings, "REDIRECT_RATE_CAPACITY", 1)
    isolated_cache.clock = lambda: 100.0
    assert (
        client.get("/first", headers={"X-Forwarded-For": "1.2.3.4"}).status_code == 404
    )
    response = client.get("/second", headers={"X-Forwarded-For": "5.6.7.8"})
    assert response.status_code == 429
    assert len(isolated_cache.buckets) == 1
    assert "/{code}" in next(iter(isolated_cache.buckets))
    assert client.get("/livez").status_code == 200


def test_redis_failure_closes_writes_but_not_redirects(
    client, db_session, isolated_cache
):
    _, raw = create_key(db_session, "writer", ["write"])
    db_session.add(URL(short_code="abc", long_url="https://example.com"))
    db_session.commit()
    isolated_cache.down = True
    assert (
        client.post(
            "/shorten",
            json={"long_url": "https://example.com"},
            headers={"X-API-Key": raw},
        ).status_code
        == 503
    )
    assert client.delete("/urls/abc", headers={"X-API-Key": raw}).status_code == 503
    assert client.get("/abc", follow_redirects=False).status_code == 307
    assert (
        db_session.scalar(select(URL).where(URL.short_code == "abc")).deleted_at is None
    )


def test_internal_metrics_not_exposed_on_api_port(monkeypatch):
    from app.observability.metrics import configure_metrics

    monkeypatch.setattr(settings, "METRICS_PORT", 8002)
    app = FastAPI()
    configure_metrics(app)
    with TestClient(app) as client:
        assert client.get("/metrics").status_code == 404


def test_cli_prints_key_once_and_never_lists_hash(db_session, monkeypatch, capsys):
    import app.cli as cli
    from contextlib import nullcontext

    monkeypatch.setattr(cli, "SessionLocal", lambda: nullcontext(db_session))
    monkeypatch.setattr(
        "sys.argv", ["cli", "keys", "create", "--name", "demo", "--scopes", "read"]
    )
    cli.main()
    created = json.loads(capsys.readouterr().out)
    raw = created["key"]
    assert authenticate(db_session, raw) is not None
    monkeypatch.setattr("sys.argv", ["cli", "keys", "list"])
    cli.main()
    listed = capsys.readouterr().out
    assert raw not in listed and "key_hash" not in listed
    monkeypatch.setattr("sys.argv", ["cli", "keys", "revoke", str(created["id"])])
    cli.main()
    assert raw not in capsys.readouterr().out
    assert authenticate(db_session, raw) is None

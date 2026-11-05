import base64
import hashlib
import hmac
import json
import time
from datetime import datetime
from unittest.mock import Mock
from uuid import uuid4

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.api.dev_auth import router as dev_router
from app.api.workspaces import router as workspace_router
from app.core.config import settings
from app.db.database import get_db
from app.models.identity import DEFAULT_WORKSPACE_ID, User, WorkspaceMember
from app.services import jwt_auth
from app.services.user_auth import DEMO_USERS, user_principal


@pytest.fixture
def identity(monkeypatch):
    private = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public = json.loads(jwt.algorithms.RSAAlgorithm.to_jwk(private.public_key()))
    public.update(kid="first", alg="RS256")
    response = Mock()
    response.__enter__ = Mock(return_value=response)
    response.__exit__ = Mock(return_value=False)
    response.iter_content.side_effect = lambda **kw: iter(
        [json.dumps({"keys": [public]}).encode()]
    )
    get = Mock(return_value=response)
    monkeypatch.setattr(jwt_auth.requests, "get", get)
    monkeypatch.setattr(settings, "AUTH_MODE", "supabase")
    monkeypatch.setattr(settings, "SUPABASE_URL", "https://project.supabase.co")
    monkeypatch.setattr(settings, "SUPABASE_LEGACY_JWT_SECRET", "")
    jwt_auth.jwks_cache.cache_clear()
    claims = {
        "sub": str(uuid4()),
        "iss": "https://project.supabase.co/auth/v1",
        "aud": "authenticated",
        "exp": int(time.time()) + 300,
        "nbf": int(time.time()) - 1,
        "email": "user@example.test",
        "role": "owner",
    }

    def sign(changes=None, **kwargs):
        return jwt.encode(
            claims | (changes or {}),
            private,
            algorithm="RS256",
            headers={"kid": "first"},
            **kwargs,
        )

    return private, public, claims, sign, get


@pytest.fixture
def client(db_session):
    app = FastAPI()
    app.include_router(dev_router)
    app.include_router(workspace_router)
    app.dependency_overrides[get_db] = lambda: db_session
    return TestClient(app)


@pytest.mark.parametrize(
    "changes",
    [
        {"exp": 1},
        {"aud": "wrong"},
        {"iss": "https://evil.test/auth/v1"},
        {"nbf": int(time.time()) + 3600},
        {"sub": "not-a-uuid"},
    ],
)
def test_claim_failures(identity, client, changes):
    token = identity[3](changes)
    response = client.get("/me", headers={"Authorization": "Bearer " + token})
    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid credentials"}
    assert response.headers["www-authenticate"] == "Bearer"


def test_algorithm_attacks_and_tampering(identity):
    private, _, claims, sign, _ = identity
    none = jwt.encode(claims, key="", algorithm="none")
    parts = sign().split(".")
    parts[1] = (
        base64.urlsafe_b64encode(json.dumps(claims | {"email": "changed"}).encode())
        .rstrip(b"=")
        .decode()
    )
    pem = private.public_key().public_bytes(
        serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
    )
    header = base64.urlsafe_b64encode(b'{"alg":"HS256","kid":"first"}').rstrip(b"=")
    payload = base64.urlsafe_b64encode(json.dumps(claims).encode()).rstrip(b"=")
    message = header + b"." + payload
    confusion = (
        message
        + b"."
        + base64.urlsafe_b64encode(
            hmac.new(pem, message, hashlib.sha256).digest()
        ).rstrip(b"=")
    ).decode()
    for token in [none, confusion, ".".join(parts), "garbage"]:
        with pytest.raises(jwt_auth.InvalidToken):
            jwt_auth.verify_token(token)


def test_jwks_rotation_ttl_rate_limit(identity, monkeypatch):
    private, public, _, sign, get = identity
    clock = [100.0]
    monkeypatch.setattr(jwt_auth.time, "monotonic", lambda: clock[0])
    jwt_auth.verify_token(sign())
    jwt_auth.verify_token(sign())
    assert get.call_count == 1
    assert get.call_args.args[0].endswith("/auth/v1/.well-known/jwks.json")
    rotated = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    new_public = json.loads(jwt.algorithms.RSAAlgorithm.to_jwk(rotated.public_key()))
    new_public.update(kid="second", alg="RS256")
    token = jwt.encode(
        identity[2], rotated, algorithm="RS256", headers={"kid": "second"}
    )
    with pytest.raises(jwt_auth.InvalidToken):
        jwt_auth.verify_token(token)
    assert get.call_count == 1
    clock[0] += 11
    public.clear()
    public.update(new_public)
    assert jwt_auth.verify_token(token)["sub"] == identity[2]["sub"]
    assert get.call_count == 2
    clock[0] += 601
    jwt_auth.verify_token(token)
    assert get.call_count == 3
    with pytest.raises(jwt_auth.InvalidToken):
        jwt_auth.verify_token(sign())


def test_provision_once_and_database_role(identity, db_session, client):
    token = identity[3]()
    headers = {"Authorization": "Bearer " + token}
    for _ in range(2):
        assert client.get("/me", headers=headers).status_code == 200
    assert db_session.scalar(select(func.count()).select_from(User)) == 1
    member = db_session.scalar(
        select(WorkspaceMember).where(WorkspaceMember.user_id == identity[2]["sub"])
    )
    assert member.role == "owner"
    member.role = "viewer"
    db_session.commit()
    assert client.get("/me", headers=headers).json()["role"] == "viewer"
    response = client.get("/me", headers=headers | {"X-API-Key": "anything"})
    assert response.status_code == 400
    user = db_session.get(User, identity[2]["sub"])
    user.suspended_at = datetime.now()
    db_session.commit()
    assert client.get("/me", headers=headers).status_code == 401


def test_api_key_default_and_dev_gate(client, monkeypatch, db_session):
    from app.services.api_keys import create_key

    monkeypatch.setattr(settings, "AUTH_MODE", "apikey_only")
    _, key = create_key(db_session, "existing", ["read"])
    assert client.get("/me", headers={"X-API-Key": key}).status_code == 200
    assert client.get("/auth/dev-users").status_code == 404
    assert client.post("/auth/dev-login", json={}).status_code == 404
    assert client.get("/me", headers={"Authorization": "Bearer x"}).status_code == 401


def test_local_demo_users(client, monkeypatch, db_session):
    monkeypatch.setattr(settings, "AUTH_MODE", "local")
    assert len(client.get("/auth/dev-users").json()) == 2
    for name in DEMO_USERS:
        response = client.post("/auth/dev-login", json={"user": name})
        assert response.status_code == 200
        assert response.headers["cache-control"] == "no-store"
        token = response.json()["access_token"]
        principal = client.get(
            "/me", headers={"Authorization": "Bearer " + token}
        ).json()
        assert principal["role"] == name
        assert principal["workspace_id"] == DEFAULT_WORKSPACE_ID
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    assert client.post("/auth/dev-login", json={}).status_code == 404


def test_jwks_failure_closed(identity):
    identity[4].side_effect = jwt_auth.requests.Timeout()
    for _ in range(2):
        with pytest.raises(jwt_auth.InvalidToken):
            jwt_auth.verify_token(identity[3]())
    assert identity[4].call_count == 1


def test_startup_refuses_local_production():
    import os
    import subprocess
    import sys

    result = subprocess.run(
        [sys.executable, "-c", "import app.core.config"],
        env=os.environ | {"AUTH_MODE": "local", "ENVIRONMENT": "production"},
        capture_output=True,
        text=True,
    )
    assert result.returncode != 0
    assert "Production requires AUTH_MODE=supabase" in result.stderr


def test_legacy_only_explicitly_enabled(identity, monkeypatch):
    secret = "local-test-secret-" * 4
    token = jwt.encode(identity[2], secret, algorithm="HS256")
    with pytest.raises(jwt_auth.InvalidToken):
        jwt_auth.verify_token(token)
    monkeypatch.setattr(settings, "SUPABASE_LEGACY_JWT_SECRET", secret)
    assert jwt_auth.verify_token(token)["sub"] == identity[2]["sub"]
    assert identity[4].call_count == 0


def test_no_token_in_logs(identity, client, caplog):
    token = identity[3]({"exp": 1})
    client.get("/me", headers={"Authorization": "Bearer " + token})
    assert token not in caplog.text


def test_empty_key_with_bearer_rejected(identity, client):
    assert (
        client.get(
            "/me", headers={"Authorization": "Bearer " + identity[3](), "X-API-Key": ""}
        ).status_code
        == 400
    )


def test_missing_expiry_and_unknown_key(identity):
    claims = identity[2].copy()
    del claims["exp"]
    with pytest.raises(jwt_auth.InvalidToken):
        jwt_auth.verify_token(
            jwt.encode(claims, identity[0], algorithm="RS256", headers={"kid": "first"})
        )
    jwt_auth.jwks_cache.cache_clear()
    with pytest.raises(jwt_auth.InvalidToken) as failure:
        jwt_auth.verify_token(
            jwt.encode(
                identity[2], identity[0], algorithm="RS256", headers={"kid": "unknown"}
            )
        )
    assert failure.value.reason == "unknown_kid"


def test_es256_signature(identity):
    from cryptography.hazmat.primitives.asymmetric import ec

    private = ec.generate_private_key(ec.SECP256R1())
    public = json.loads(jwt.algorithms.ECAlgorithm.to_jwk(private.public_key()))
    public.update(kid="ec", alg="ES256")
    identity[1].clear()
    identity[1].update(public)
    token = jwt.encode(identity[2], private, algorithm="ES256", headers={"kid": "ec"})
    assert jwt_auth.verify_token(token)["sub"] == identity[2]["sub"]


@pytest.mark.parametrize(
    "document", [b"not-json", b"x" * 65537, b'{"keys": {}}', b"{}"]
)
def test_invalid_jwks_documents(identity, document):
    identity[4].return_value.iter_content.side_effect = lambda **kw: iter([document])
    with pytest.raises(jwt_auth.InvalidToken):
        jwt_auth.verify_token(identity[3]())


@pytest.mark.parametrize(
    "change", [{"alg": "ES256"}, {"kty": "EC"}, {"use": "enc"}, {"key_ops": ["sign"]}]
)
def test_jwk_purpose_and_type_checked(identity, change):
    identity[1].update(change)
    with pytest.raises(jwt_auth.InvalidToken):
        jwt_auth.verify_token(identity[3]())


def test_disabled_deleted_and_workspace_membership(identity, client, db_session):
    headers = {"Authorization": "Bearer " + identity[3]()}
    response = client.get("/me", headers=headers)
    workspace = response.json()["workspace_id"]
    assert (
        client.get("/me", headers=headers | {"X-Workspace-ID": workspace}).status_code
        == 200
    )
    assert (
        client.get(
            "/me", headers=headers | {"X-Workspace-ID": str(uuid4())}
        ).status_code
        == 401
    )
    assert (
        client.get("/me", headers=headers | {"X-Workspace-ID": "invalid"}).status_code
        == 401
    )
    user = db_session.get(User, identity[2]["sub"])
    user.deleted_at = datetime.now()
    db_session.commit()
    assert client.get("/me", headers=headers).status_code == 401


def test_first_login_rollback_is_atomic(identity, db_session, monkeypatch):
    original_flush = db_session.flush
    calls = [0]

    def fail(*args, **kwargs):
        calls[0] += 1
        if calls[0] == 3:
            raise RuntimeError("simulated write failure")
        return original_flush(*args, **kwargs)

    monkeypatch.setattr(db_session, "flush", fail)
    with pytest.raises(RuntimeError):
        user_principal(db_session, identity[2])
    db_session.rollback()
    assert db_session.get(User, identity[2]["sub"]) is None


def test_auth_metrics_and_store_failure(identity, client, monkeypatch):
    from sqlalchemy.exc import OperationalError

    from app.api import auth
    from app.observability.metrics import auth_failure_total, auth_success_total

    success = auth_success_total._value.get()
    headers = {"Authorization": "Bearer " + identity[3]()}
    assert client.get("/me", headers=headers).status_code == 200
    assert auth_success_total._value.get() == success + 1
    counter = auth_failure_total.labels(reason="store_unavailable")
    before = counter._value.get()
    monkeypatch.setattr(
        auth,
        "user_principal",
        Mock(side_effect=OperationalError("query", {}, Exception())),
    )
    assert client.get("/me", headers=headers).status_code == 503
    assert counter._value.get() == before + 1


def test_dev_disabled_user(client, monkeypatch, db_session):
    monkeypatch.setattr(settings, "AUTH_MODE", "local")
    client.get("/auth/dev-users")
    db_session.get(User, DEMO_USERS["owner"]).suspended_at = datetime.now()
    db_session.commit()
    assert client.post("/auth/dev-login", json={"user": "owner"}).status_code == 401


@pytest.mark.parametrize(
    "token", ["x" * 16385, "", "Bearer"], ids=["oversized", "empty", "malformed"]
)
def test_bounded_bad_tokens(identity, client, token):
    assert (
        client.get("/me", headers={"Authorization": "Bearer " + token}).status_code
        == 401
    )


def test_missing_kid(identity):
    token = jwt.encode(identity[2], identity[0], algorithm="RS256")
    with pytest.raises(jwt_auth.InvalidToken):
        jwt_auth.verify_token(token)


def test_verified_membership_controls_owner_mutations(identity, client, db_session):
    headers = {"Authorization": "Bearer " + identity[3]()}
    assert client.get("/me", headers=headers).status_code == 200
    member = db_session.scalar(
        select(WorkspaceMember).where(WorkspaceMember.user_id == identity[2]["sub"])
    )
    member.role = "viewer"
    db_session.commit()
    assert (
        client.post(
            "/workspaces", headers=headers, json={"name": "New", "slug": "new"}
        ).status_code
        == 403
    )


def test_openapi_has_bearer_and_key_auth(client):
    schemas = client.get("/openapi.json").json()["components"]["securitySchemes"]
    assert schemas["HTTPBearer"]["scheme"] == "bearer"
    assert schemas["APIKeyHeader"]["name"] == "X-API-Key"


def test_jwks_response_read_timeout(identity):
    identity[4].return_value.iter_content.side_effect = (
        jwt_auth.requests.ConnectionError()
    )
    with pytest.raises(jwt_auth.InvalidToken) as failure:
        jwt_auth.verify_token(identity[3]())
    assert failure.value.reason == "jwks_unavailable"


def test_local_signing_key_initialization_is_single_flight(monkeypatch):
    from concurrent.futures import ThreadPoolExecutor

    monkeypatch.setattr(jwt_auth, "_local_signing_key", None)
    with ThreadPoolExecutor(max_workers=8) as pool:
        keys = list(pool.map(lambda _: jwt_auth.local_key(), range(16)))
    assert len({id(key) for key in keys}) == 1

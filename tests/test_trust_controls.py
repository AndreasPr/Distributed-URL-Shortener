"""Trust policy regressions, with no real CAPTCHA or provider traffic."""

from datetime import timedelta
from unittest.mock import Mock
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.api.auth import get_principal
from app.api.principal import Principal
from app.api.routes import router as urls_router
from app.api.trust import router
from app.api.workspaces import router as workspace_router
from app.core.config import settings
from app.db.database import get_db
from app.models.identity import DEFAULT_WORKSPACE_ID, User, Workspace, WorkspaceMember
from app.models.trust import (
    AbuseReport,
    AuditLog,
    DailyCreation,
    DeletedIdentity,
    DeniedDomain,
)
from app.models.url import URL
from app.models.url_verdict import URLVerdict
from app.services.api_keys import authenticate, create_key, utcnow
from app.services.data_rights import purge_due, subject_hash
from app.services.jwt_auth import InvalidToken
from app.services.user_auth import user_principal


@pytest.fixture
def trust_client(db_session, monkeypatch):
    user = User(
        id=str(uuid4()),
        email="fixture@example.test",
        email_verified=True,
        created_at=utcnow() - timedelta(days=2),
    )
    db_session.add(user)
    db_session.add(
        WorkspaceMember(
            workspace_id=DEFAULT_WORKSPACE_ID, user_id=user.id, role="owner"
        )
    )
    db_session.commit()
    principal = Principal(
        workspace_id=DEFAULT_WORKSPACE_ID,
        role="owner",
        scopes=frozenset(),
        auth_method="user",
        user_id=user.id,
        email_verified=True,
        platform_admin=True,
    )
    app = FastAPI()
    app.include_router(workspace_router)
    app.include_router(router)
    app.include_router(urls_router)
    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[get_principal] = lambda: principal
    monkeypatch.setattr("app.api.auth.limit_write", lambda *args: None)
    monkeypatch.setattr("app.services.url_service.publish_click_event", lambda *_: None)
    return TestClient(app), user, principal


def create(client, url="https://example.com/", **extra):
    return client.post("/shorten", json={"long_url": url, **extra})


@pytest.mark.parametrize("state", ["unverified", "suspended", "deleted"])
def test_creation_requires_active_verified_owner(trust_client, db_session, state):
    client, user, principal = trust_client
    if state == "unverified":
        user.email_verified = False
    else:
        setattr(user, state + "_at", utcnow())
    db_session.commit()
    assert create(client).status_code == 403


def test_legacy_keys_cannot_create_but_owned_verified_keys_can(
    trust_client, db_session
):
    client, user, principal = trust_client
    for owner, status in [(None, 403), (user.id, 200)]:
        key, _ = create_key(db_session, "test", ["write"], created_by_user_id=owner)
        client.app.dependency_overrides[get_principal] = lambda: Principal(
            workspace_id=DEFAULT_WORKSPACE_ID,
            role="member",
            scopes=frozenset({"write"}),
            auth_method="api_key",
            api_key_id=key.id,
        )
        assert create(client).status_code == status


def test_daily_limit_cannot_be_bypassed_by_deletion(
    trust_client, db_session, monkeypatch
):
    client, user, _ = trust_client
    monkeypatch.setattr(settings, "FREE_DAILY_LINKS", 1)
    code = create(client).json()["short_code"]
    assert client.delete("/urls/" + code).status_code == 204
    response = create(client)
    assert response.status_code == 429
    assert response.json()["detail"]["code"] == "daily_creation_limit"
    assert int(response.headers["retry-after"]) > 0
    usage = db_session.get(DailyCreation, (user.id, utcnow().date()))
    usage.day -= timedelta(days=1)
    db_session.commit()
    assert create(client).status_code == 200


def test_workspace_cap_and_failed_alias_does_not_consume_quota(
    trust_client, db_session, monkeypatch
):
    client, user, _ = trust_client
    monkeypatch.setattr(settings, "FREE_WORKSPACE_LINKS", 1)
    code = create(client, custom_alias="chosen").json()["short_code"]
    assert create(client).status_code == 402
    db_session.rollback()
    monkeypatch.setattr(settings, "FREE_WORKSPACE_LINKS", 2)
    assert create(client, custom_alias=code).status_code == 409
    db_session.rollback()
    assert db_session.get(DailyCreation, (user.id, utcnow().date())).count == 1


@pytest.mark.parametrize(
    "destination", ["https://short.example.test/a", "https://sub.api.example.test/a"]
)
def test_product_hosts_rejected(trust_client, monkeypatch, destination):
    client, _, _ = trust_client
    monkeypatch.setattr(
        settings, "PRODUCT_HOSTS", ("short.example.test", "api.example.test")
    )
    assert create(client, destination).status_code == 422


def test_denylist_is_platform_only_and_blocks_existing_redirects(
    trust_client, db_session
):
    from dataclasses import replace

    client, _, principal = trust_client
    code = create(client).json()["short_code"]
    client.app.dependency_overrides[get_principal] = lambda: replace(
        principal, platform_admin=False
    )
    assert (
        client.post("/admin/denylist", json={"domain": "example.com"}).status_code
        == 403
    )
    client.app.dependency_overrides[get_principal] = lambda: principal
    assert (
        client.post("/admin/denylist", json={"domain": "EXAMPLE.COM."}).status_code
        == 201
    )
    assert create(client).status_code == 422
    assert client.get("/" + code, follow_redirects=False).status_code == 451


def test_probation_warning_continue_and_later_block(
    trust_client, db_session, monkeypatch
):
    from types import SimpleNamespace

    client, user, _ = trust_client
    user.created_at = utcnow()
    db_session.commit()
    monkeypatch.setattr(
        "app.services.trust.analyze",
        lambda url: SimpleNamespace(score=0.4, reasons=["credential_path"]),
    )
    code = create(client).json()["short_code"]
    verdict = db_session.get(URLVerdict, code)
    assert verdict.verdict == "suspicious" and verdict.review_decision is None
    response = client.get("/" + code, follow_redirects=False)
    assert response.headers["location"].endswith("/warn/" + code)
    assert client.get("/warnings/" + code).json()["host"] == "example.com"
    assert (
        client.post("/warnings/" + code + "/continue").json()["redirect_url"]
        == "https://example.com/"
    )
    verdict.review_decision = "block"
    db_session.commit()
    assert client.post("/warnings/" + code + "/continue").status_code == 451


def test_old_account_not_probation_flagged(trust_client, db_session, monkeypatch):
    from types import SimpleNamespace

    client, _, _ = trust_client
    monkeypatch.setattr(
        "app.services.trust.analyze",
        lambda url: SimpleNamespace(score=0.4, reasons=["credential_path"]),
    )
    code = create(client).json()["short_code"]
    assert db_session.get(URLVerdict, code) is None


@pytest.mark.parametrize("mode", ["trusted_proxies", "peer_only"])
def test_report_requires_captcha_and_enters_queue(
    trust_client, db_session, monkeypatch, mode
):
    monkeypatch.setattr(settings, "CLIENT_IP_MODE", mode)
    from fastapi import HTTPException

    client, _, _ = trust_client
    code = create(client).json()["short_code"]
    monkeypatch.setattr(
        "app.api.trust.verify_captcha", Mock(side_effect=HTTPException(400, "invalid"))
    )
    payload = {"short_code": code, "category": "phishing", "captcha_token": "fixture"}
    assert client.post("/reports", json=payload).status_code == 400
    assert db_session.query(AbuseReport).count() == 0
    monkeypatch.setattr("app.api.trust.verify_captcha", lambda *args: None)
    client.app.dependency_overrides[get_principal] = lambda: (_ for _ in ()).throw(
        AssertionError("Reports must be public")
    )
    assert client.post("/reports", json=payload).status_code == 202
    assert db_session.query(AbuseReport).count() == 1
    assert db_session.get(URLVerdict, code).verdict == "suspicious"
    assert (
        client.get("/" + code, follow_redirects=False)
        .headers["location"]
        .endswith("/warn/" + code)
    )


def test_report_rate_limit(trust_client, monkeypatch):
    from app.middleware.rate_limiter import BucketResult

    client, _, _ = trust_client
    monkeypatch.setattr(
        "app.api.trust.check_bucket", lambda *a: BucketResult(False, 0, 60, 60, 10)
    )
    response = client.post(
        "/reports",
        json={"short_code": "any", "category": "spam", "captcha_token": "fixture"},
    )
    assert response.status_code == 429 and response.headers["retry-after"] == "60"


@pytest.mark.parametrize(
    "body,status",
    [
        ({"success": True, "hostname": "example.test", "action": "report"}, None),
        ({"success": False}, 400),
        ({"success": True, "hostname": "attacker.test", "action": "report"}, 400),
        ({"success": True, "hostname": "example.test", "action": "signup"}, 400),
    ],
)
def test_turnstile_checks_trusted_response(monkeypatch, body, status):
    import json

    from fastapi import HTTPException

    from app.services.turnstile import verify_captcha

    monkeypatch.setattr(settings, "TURNSTILE_SECRET_KEY", "test-placeholder")
    monkeypatch.setattr(settings, "TURNSTILE_HOSTNAMES", ("example.test",))
    response = Mock(status_code=200)
    response.iter_content.return_value = [json.dumps(body).encode()]
    context = Mock()
    context.__enter__ = Mock(return_value=response)
    context.__exit__ = Mock(return_value=False)
    post = Mock(return_value=context)
    monkeypatch.setattr("app.services.turnstile.requests.post", post)
    if status:
        with pytest.raises(HTTPException) as exc:
            verify_captcha("fixture", "report")
        assert exc.value.status_code == status
    else:
        verify_captcha("fixture", "report")
    assert post.call_args.kwargs["timeout"] == (2, 2)
    assert post.call_args.kwargs["allow_redirects"] is False


def test_suspend_disables_links_keys_and_audits(trust_client, db_session):
    client, user, _ = trust_client
    code = create(client).json()["short_code"]
    key, raw = create_key(db_session, "owned", ["write"], created_by_user_id=user.id)
    assert client.post(f"/admin/users/{user.id}/suspend").status_code == 204
    assert authenticate(db_session, raw) is None
    assert client.get("/" + code).status_code == 404
    actions = {row.action for row in db_session.scalars(select(AuditLog))}
    assert {"key.created", "user.suspended"} <= actions


def test_export_and_purge_after_thirty_days(trust_client, db_session):
    client, user, _ = trust_client
    subject = user.id
    code = create(client).json()["short_code"]
    _, raw = create_key(db_session, "export-key", ["read"], created_by_user_id=user.id)
    exported = client.get("/me/export")
    assert exported.status_code == 200
    assert raw not in exported.text and "key_hash" not in exported.text
    assert exported.json()["links"][0]["short_code"] == code
    assert (
        client.request("DELETE", "/me", json={"confirmation": "DELETE"}).status_code
        == 204
    )
    assert client.get("/" + code).status_code == 404
    assert purge_due(db_session) == 0
    user.deleted_at = utcnow() - timedelta(days=31)
    db_session.commit()
    assert purge_due(db_session) == 1
    assert db_session.get(User, subject) is None
    assert db_session.query(URL).count() == 0
    assert db_session.get(DeletedIdentity, subject_hash(subject)) is not None
    with pytest.raises(InvalidToken):
        user_principal(db_session, {"sub": subject})
    assert purge_due(db_session) == 0


def test_audit_workspace_boundary_and_role(trust_client, db_session):
    from dataclasses import replace

    client, _, principal = trust_client
    assert client.get(f"/workspaces/{uuid4()}/audit").status_code == 404
    client.app.dependency_overrides[get_principal] = lambda: replace(
        principal, role="member"
    )
    assert client.get(f"/workspaces/{DEFAULT_WORKSPACE_ID}/audit").status_code == 403


def test_moderation_history_disable_and_denylist_lifecycle(
    trust_client, db_session, monkeypatch
):
    client, user, _ = trust_client
    code = create(client).json()["short_code"]
    monkeypatch.setattr("app.api.trust.verify_captcha", lambda *a: None)
    payload = {"short_code": code, "category": "spam", "captcha_token": "fixture"}
    assert client.post("/reports", json=payload).status_code == 202
    assert client.post("/reports", json=payload).status_code == 202
    assert len(client.get("/admin/reports/" + code).json()) == 2
    assert client.post("/admin/links/" + code + "/disable").status_code == 204
    assert client.get("/warnings/" + code).status_code == 404
    assert client.post("/reports", json=payload).status_code == 404
    assert client.post("/admin/links/missing/disable").status_code == 404
    assert client.post(f"/admin/users/{uuid4()}/suspend").status_code == 404
    assert (
        client.post(
            "/admin/denylist", json={"domain": "https://example.com"}
        ).status_code
        == 422
    )
    assert (
        client.post("/admin/denylist", json={"domain": "example.com"}).status_code
        == 201
    )
    assert "example.com" in client.get("/admin/denylist").json()
    assert client.delete("/admin/denylist/example.com").status_code == 204
    assert client.get("/admin/denylist").json() == []
    assert client.get(f"/workspaces/{DEFAULT_WORKSPACE_ID}/audit").json()


def test_warning_expiry_and_public_rate_store_failure(
    trust_client, db_session, monkeypatch
):
    client, _, _ = trust_client
    code = create(client).json()["short_code"]
    row = db_session.scalar(select(URL).where(URL.short_code == code))
    row.expires_at = utcnow() - timedelta(seconds=1)
    db_session.commit()
    assert client.get("/warnings/" + code).status_code == 410
    monkeypatch.setattr("app.api.trust.check_bucket", Mock(side_effect=RuntimeError))
    assert client.post("/warnings/" + code + "/continue").status_code == 503


@pytest.mark.parametrize(
    "failure", ["missing", "timeout", "oversized", "malformed", "upstream"]
)
def test_captcha_failure_is_closed(monkeypatch, failure):
    import requests
    from fastapi import HTTPException

    from app.services.turnstile import verify_captcha

    monkeypatch.setattr(
        settings, "TURNSTILE_SECRET_KEY", "" if failure == "missing" else "fixture"
    )
    monkeypatch.setattr(settings, "TURNSTILE_HOSTNAMES", ("example.test",))
    response = Mock(status_code=503 if failure == "upstream" else 200)
    response.iter_content.return_value = [
        b"x" * 16385 if failure == "oversized" else b"invalid-json"
    ]
    context = Mock(
        __enter__=Mock(return_value=response), __exit__=Mock(return_value=False)
    )
    monkeypatch.setattr(
        "app.services.turnstile.requests.post",
        (
            Mock(side_effect=requests.Timeout)
            if failure == "timeout"
            else Mock(return_value=context)
        ),
    )
    with pytest.raises(HTTPException) as exc:
        verify_captcha("fixture", "report")
    assert exc.value.status_code == 503


def test_worker_provider_is_explicit_and_budgeted(monkeypatch, db_session):
    from app.events.memory import InMemoryEventBus
    from app.workers.abuse_worker import AbuseWorker

    factory = Mock()
    monkeypatch.setattr("app.workers.abuse_worker.Classifier", factory)
    for explicit, budget, variant in [
        (False, 10, "heuristics"),
        (True, 0, "heuristics"),
        (True, 10, "combined"),
    ]:
        monkeypatch.setattr(settings, "LLM_EXPLICIT", explicit)
        monkeypatch.setattr(settings, "LLM_DAILY_BUDGET", budget)
        AbuseWorker(InMemoryEventBus(), db_session)
        assert factory.call_args.kwargs["variant"] == variant


def test_export_is_private_and_excludes_other_users(trust_client, db_session):
    client, user, principal = trust_client
    db_session.add(URL(short_code="other-owner", long_url="https://example.org/"))
    db_session.commit()
    response = client.get("/me/export")
    assert response.headers["cache-control"] == "no-store"
    assert response.json()["links"] == []
    from dataclasses import replace

    client.app.dependency_overrides[get_principal] = lambda: replace(
        principal, user_id=None, api_key_id=1, auth_method="api_key"
    )
    assert client.get("/me/export").status_code == 403


def test_key_revocation_audit_identifies_actor(trust_client, db_session):
    from app.services.api_keys import revoke_key

    _, user, _ = trust_client
    key, _ = create_key(db_session, "audit-key", ["read"], created_by_user_id=user.id)
    assert revoke_key(db_session, key.id, actor_id=user.id)
    record = db_session.scalar(select(AuditLog).where(AuditLog.action == "key.revoked"))
    assert record.actor_id == user.id
    assert record.target == str(key.id)

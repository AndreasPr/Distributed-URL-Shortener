from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock
from uuid import uuid4

import pytest
import yaml
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.api.auth import get_principal
from app.api.principal import Principal
from app.api.routes import router, get_health_db
from app.api.trust import router as trust_router
from app.core.config import settings
from app.db.database import get_db
from app.models.identity import User, WorkspaceMember, DEFAULT_WORKSPACE_ID
import app.models.trust
from app.models.url import URL
from app.services.api_keys import create_key
from app.services.reliability import ReliabilityControls
from app.services.user_auth import user_principal
from app.services.usage import usage_snapshot
from app.llm.providers import FakeProvider
from app.llm.base import NotConfigured
from app.abuse.classifier import Classifier
from scripts.backup import database_env
from scripts.hosted_monitor import breaches, update_issues


@pytest.fixture
def client(db_session, monkeypatch):
    app = FastAPI()
    app.include_router(trust_router)
    app.include_router(router)
    app.add_middleware(ReliabilityControls)
    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[get_health_db] = lambda: db_session
    monkeypatch.setattr("app.api.auth.limit_write", lambda *args: None)
    monkeypatch.setattr(
        "app.services.url_service.publish_click_event", lambda *args: None
    )
    return TestClient(app)


@pytest.mark.parametrize(
    "flag",
    ["SIGNUPS_ENABLED", "LINK_CREATION_ENABLED", "LLM_ENABLED", "READ_ONLY_MODE"],
)
def test_switches_keep_redirects_and_warning_continue_working(
    client, db_session, monkeypatch, flag
):
    monkeypatch.setattr(settings, flag, flag == "READ_ONLY_MODE")
    row = URL(
        short_code="demo-code",
        long_url="https://example.com",
        created_at=datetime.now(timezone.utc) - timedelta(days=3),
    )
    db_session.add(row)
    db_session.commit()
    assert client.get("/demo-code", follow_redirects=False).status_code == 307
    assert client.post("/warnings/demo-code/continue").status_code == 200
    status = client.get("/status")
    assert status.status_code == 200
    assert status.headers["cache-control"] == "no-store"
    if flag in {"READ_ONLY_MODE", "LINK_CREATION_ENABLED"}:
        denied = client.post("/shorten", json={"long_url": "https://example.com"})
        assert denied.status_code == 503
        assert denied.json()["detail"]["code"] in {
            "read_only_mode",
            "link_creation_disabled",
        }


def test_read_only_blocks_other_writes(client, monkeypatch):
    monkeypatch.setattr(settings, "READ_ONLY_MODE", True)
    for method, path in [
        ("post", "/api-keys"),
        ("delete", "/urls/demo"),
        ("post", "/reports"),
        ("patch", "/workspaces/any/members"),
    ]:
        assert getattr(client, method)(path).status_code == 503


def test_signup_switch_blocks_new_provisioning_not_existing_users(
    db_session, monkeypatch
):
    monkeypatch.setattr(settings, "AUTH_MODE", "apikey_only")
    subject = str(uuid4())
    claims = {"sub": subject, "email": "fixture@example.test"}
    user_principal(db_session, claims)
    monkeypatch.setattr(settings, "SIGNUPS_ENABLED", False)
    assert user_principal(db_session, claims).user_id == subject
    unknown = str(uuid4())
    with pytest.raises(HTTPException) as error:
        user_principal(db_session, {**claims, "sub": unknown})
    assert error.value.status_code == 503
    assert db_session.get(User, unknown) is None


def test_disabled_llm_never_constructs_provider(monkeypatch):
    monkeypatch.setattr(settings, "LLM_ENABLED", False)
    provider = Mock(side_effect=AssertionError("must not construct"))
    result = Classifier(factory=provider, variant="llm").classify(
        "https://example.com/login"
    )
    assert result.source == "heuristic"
    provider.assert_not_called()
    with pytest.raises(NotConfigured):
        FakeProvider().classify_json("", "", Mock())


def test_health_cost_one_ping_and_queries_database(client, db_session, monkeypatch):
    ping = Mock(return_value=True)
    monkeypatch.setattr("app.api.routes.redis_client", SimpleNamespace(ping=ping))
    from sqlalchemy import event

    statements = []

    def capture(conn, cursor, statement, *args):
        statements.append(statement)

    engine = db_session.get_bind()
    event.listen(engine, "before_cursor_execute", capture)
    try:
        assert client.get("/health").status_code == 200
        ping.assert_called_once()
        assert any("SELECT 1" in sql for sql in statements)
    finally:
        event.remove(engine, "before_cursor_execute", capture)


def test_usage_authorization_for_platform_admin_and_owned_keys(
    client, db_session, monkeypatch
):
    owner = User(id=str(uuid4()), email="admin@example.test", email_verified=True)
    db_session.add(owner)
    db_session.add(
        WorkspaceMember(
            workspace_id=DEFAULT_WORKSPACE_ID, user_id=owner.id, role="owner"
        )
    )
    db_session.commit()
    key, raw = create_key(db_session, "quota", ["admin"], created_by_user_id=owner.id)
    monkeypatch.setattr(settings, "PLATFORM_ADMIN_EMAILS", [owner.email])
    monkeypatch.setattr(
        "app.services.usage.redis_client",
        SimpleNamespace(
            info=lambda: {"used_memory": 19_000_000, "instantaneous_ops_per_sec": 4}
        ),
    )
    assert client.get("/admin/usage").status_code == 401
    response = client.get("/admin/usage", headers={"X-API-Key": raw})
    assert response.status_code == 200
    assert response.json()["redis_commands_per_second_estimate"] == 4
    assert raw not in response.text and owner.email not in response.text
    monkeypatch.setattr(settings, "PLATFORM_ADMIN_EMAILS", [])
    assert client.get("/admin/usage", headers={"X-API-Key": raw}).status_code == 403
    monkeypatch.setattr(settings, "PLATFORM_ADMIN_EMAILS", [owner.email])
    owner.email_verified = False
    db_session.commit()
    assert client.get("/admin/usage", headers={"X-API-Key": raw}).status_code == 403
    principal = Principal(
        workspace_id=DEFAULT_WORKSPACE_ID,
        role="owner",
        scopes=frozenset(),
        user_id=owner.id,
        auth_method="user",
        email_verified=True,
        platform_admin=True,
    )
    client.app.dependency_overrides[get_principal] = lambda: principal
    assert client.get("/admin/usage").status_code == 200


def test_unknown_usage_never_becomes_zero(db_session, monkeypatch):
    monkeypatch.setattr(
        "app.services.usage.redis_client",
        SimpleNamespace(info=Mock(side_effect=ConnectionError)),
    )
    result = usage_snapshot(db_session)
    redis = next(
        item for item in result["limits"] if item["name"] == "redis_memory_bytes"
    )
    assert redis["used"] is None and redis["status"] == "unavailable"
    with pytest.raises(ValueError):
        breaches(result)


def test_issue_thresholds_deduplicate_and_escalate():
    snapshot = {
        "limits": [{"name": "database_bytes", "used": 69, "limit": 100, "status": "ok"}]
    }
    assert breaches(snapshot) == []
    snapshot["limits"][0]["used"] = 70
    calls = []
    existing = []

    def api(url, token, payload=None, method=None):
        if payload:
            calls.append((method, payload))
        return existing

    update_issues(snapshot, "owner/repo", "fake", api)
    assert calls[0][1]["title"] == "Quota 70%: database_bytes"
    existing.append(
        {
            "title": calls[0][1]["title"],
            "body": calls[0][1]["body"],
            "number": 1,
            "user": {"login": "github-actions[bot]"},
        }
    )
    update_issues(snapshot, "owner/repo", "fake", api)
    assert len(calls) == 1
    snapshot["limits"][0]["used"] = 90
    update_issues(snapshot, "owner/repo", "fake", api)
    assert calls[-1][0] == "PATCH" and "90%" in calls[-1][1]["title"]


@pytest.mark.parametrize(
    "dsn",
    [
        "postgresql://user@db.example:5432/db?sslmode=require",
        "postgresql://user@aws-0-us-east-1.pooler.supabase.com:6543/db?sslmode=require",
        "postgresql://user@aws-0-us-east-1.pooler.supabase.com:5432/db",
    ],
)
def test_backup_rejects_wrong_pooler_or_no_tls(dsn):
    with pytest.raises(ValueError):
        database_env(dsn)


def test_backup_workflow_only_uploads_ciphertext():
    workflow = yaml.safe_load(Path(".github/workflows/nightly-backup.yml").read_text())
    job = workflow["jobs"]["backup"]
    upload = next(s for s in job["steps"] if "upload-artifact@" in s.get("uses", ""))
    assert upload["with"]["path"].endswith(".dump.age")
    assert upload["with"]["retention-days"] == 14
    assert "if" not in upload  # Success-only, never always().
    assert "PRIVATE" not in str(job)
    assert job["if"] == "vars.BACKUPS_ENABLED == 'true'"


def test_live_smoke_is_manual_and_bounded():
    source = Path("scripts/free_tier_smoke.js").read_text()
    assert "iterations: 20" in source and "maxRedirects: 0" in source
    assert source.count("http.get(") == 1
    assert all(
        "free_tier_smoke.js" not in p.read_text()
        for p in Path(".github/workflows").glob("*.yml")
    )

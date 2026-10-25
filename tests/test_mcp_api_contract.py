"""Record/verify actual API handler responses, never hand-shaped MCP mocks.

UPDATE_MCP_CONTRACTS=1 pytest tests/test_mcp_api_contract.py records synthetic
SQLite-backed responses; the ordinary gate compares them to committed fixtures.
"""

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import app.api.routes as routes
import app.services.activity_signals as activity
from app.api.auth import require_admin, require_read, require_write
from app.db.database import get_db
from app.models.analytics import Analytics
from app.models.url import URL
from app.models.url_verdict import URLVerdict

FIXTURE = (
    Path(__file__).resolve().parents[1] / "mcp-server/tests/fixtures/api-contract.json"
)


@pytest.fixture
def client(db_session, monkeypatch):
    application = FastAPI()
    application.include_router(routes.router)
    application.dependency_overrides[get_db] = lambda: db_session
    for dep in (require_admin, require_read, require_write):
        application.dependency_overrides[dep] = lambda: SimpleNamespace(id=1)
    monkeypatch.setattr(activity.time, "time", lambda: 1800000000)
    monkeypatch.setattr(activity.cache, "read_cache", lambda fn: [b"2"] + [None] * 59)
    return TestClient(application)


def seed(db):
    db.add(
        URL(
            short_code="fixture",
            long_url="https://example.com/",
            created_at=datetime(2026, 1, 1),
        )
    )
    db.flush()
    db.add(
        URLVerdict(
            short_code="fixture",
            verdict="suspicious",
            score=0.5,
            reasons=["credential_path"],
            source="heuristic",
            created_at=datetime(2026, 1, 1),
        )
    )
    db.add(
        Analytics(
            short_code="fixture",
            clicked_at=datetime.fromtimestamp(1799999970, timezone.utc).replace(
                tzinfo=None
            ),
        )
    )
    db.commit()


def test_recorded_api_contract(client, db_session):
    seed(db_session)
    responses = {}
    for name, path in {
        "analytics": "/analytics/fixture",
        "flagged": "/admin/flagged?limit=20&offset=0",
        "status": "/urls/fixture/status",
        "signals": "/admin/activity/fixture?window_minutes=60",
    }.items():
        response = client.get(path)
        assert response.status_code == 200
        responses[name] = response.json()
    response = client.post(
        "/shorten",
        json={"long_url": "https://example.com/", "custom_alias": "new-fixture"},
    )
    assert response.status_code == 200
    responses["create"] = response.json()
    response = client.post("/admin/flagged/fixture/review", json={"decision": "block"})
    assert response.status_code == 204 and not response.content
    responses["review"] = {"status_code": 204, "body": None}
    if os.getenv("UPDATE_MCP_CONTRACTS") == "1":
        FIXTURE.parent.mkdir(parents=True, exist_ok=True)
        FIXTURE.write_text(json.dumps(responses, indent=2) + "\n")
    assert responses == json.loads(FIXTURE.read_text())


def test_activity_partial_failure(client, db_session, monkeypatch):
    seed(db_session)
    monkeypatch.setattr(activity.cache, "read_cache", lambda fn: None)
    body = client.get("/admin/activity/fixture").json()
    assert body["sources_status"] == {"analytics": "ok", "rate_limits": "failed"}
    assert body["rate_limit_rejections"] is None
    assert body["click_count"] == 1


def test_signal_code_isolation_and_window(client, db_session):
    seed(db_session)
    body = client.get("/admin/activity/other").json()
    assert body["click_count"] == 0
    assert client.get("/admin/activity/fixture?window_minutes=61").status_code == 422


def test_status_has_no_redirect_side_effect(client, db_session, monkeypatch):
    seed(db_session)
    monkeypatch.setattr(
        routes.service, "resolve", lambda *args: pytest.fail("must not resolve")
    )
    assert client.get("/urls/fixture/status").json()["status"] == "active"
    row = db_session.query(URL).filter_by(short_code="fixture").one()
    row.deleted_at = datetime(2026, 1, 1)
    db_session.commit()
    assert client.get("/urls/fixture/status").json()["status"] == "deleted"


def test_admin_auth_required(db_session):
    application = FastAPI()
    application.include_router(routes.router)
    application.dependency_overrides[get_db] = lambda: db_session
    response = TestClient(application).get("/admin/activity/fixture")
    assert response.status_code == 401


def test_actual_429_only_and_per_code(monkeypatch):
    from app.middleware import rate_limiter as limiter
    from fastapi import HTTPException

    recorded = []
    app = FastAPI()
    app.middleware("http")(limiter.rate_limit_middleware)

    @app.post("/shorten")
    def shorten():
        return {"short_code": "abc"}

    @app.delete("/urls/{code}")
    def delete(code: str):
        raise HTTPException(429, "limited")

    @app.get("/{code}")
    def redirect(code: str):
        return {"ok": True}

    monkeypatch.setattr(limiter, "record_rejection", recorded.append)
    allowed = [True]
    monkeypatch.setattr(
        limiter,
        "check_bucket",
        lambda *a: limiter.BucketResult(allowed[0], 0, 1, 1, 10),
    )
    client = TestClient(app)
    assert client.post("/shorten").status_code == 200
    assert client.get("/abc").status_code == 200
    assert recorded == []
    allowed[0] = False
    assert client.get("/abc").status_code == 429
    assert client.get("/xyz").status_code == 429
    assert client.delete("/urls/abc").status_code == 429
    assert recorded == ["abc", "xyz", "abc"]


def test_rejection_storage_is_independent_and_bounded(monkeypatch):
    calls = []
    monkeypatch.setattr(activity.time, "time", lambda: 1800000000)
    monkeypatch.setattr(activity.cache, "read_cache", lambda fn: fn())
    monkeypatch.setattr(
        activity.cache,
        "redis_client",
        SimpleNamespace(eval=lambda *args: calls.append(args)),
    )
    activity.record_rejection("abc")
    activity.record_rejection("../invalid")
    assert len(calls) == 1
    assert calls[0][1:] == (1, "activity:429:abc:30000000")
    assert "3660" in calls[0][0] and "INCR" in calls[0][0]


def test_admin_read_scope_is_insufficient(db_session):
    from app.services.api_keys import create_key

    _, raw = create_key(db_session, "reader", ["read"])
    app = FastAPI()
    app.include_router(routes.router)
    app.dependency_overrides[get_db] = lambda: db_session
    assert (
        TestClient(app)
        .get("/admin/activity/fixture", headers={"X-API-Key": raw})
        .status_code
        == 403
    )


def test_signal_queries_only_requested_code_and_completed_minutes(
    db_session, monkeypatch
):
    monkeypatch.setattr(activity.time, "time", lambda: 1800000030)
    monkeypatch.setattr(activity.cache, "read_cache", lambda fn: fn())
    keys = []

    def mget(values):
        keys.extend(values)
        return [b"3", None]

    monkeypatch.setattr(activity.cache, "redis_client", SimpleNamespace(mget=mget))
    result = activity.signals(db_session, "xyz", 2)
    assert keys == ["activity:429:xyz:29999998", "activity:429:xyz:29999999"]
    assert result["rate_limit_rejections"] == 3
    assert result["window_end"] == "2027-01-15T08:00:00Z"


def test_database_failure_not_empty_activity(monkeypatch):
    def broken(*args):
        raise RuntimeError("private connection string")

    db = SimpleNamespace(query=broken, rollback=lambda: None)
    monkeypatch.setattr(activity.cache, "read_cache", lambda fn: [None] * 60)
    result = activity.signals(db, "abc", 60)
    assert result["sources_status"]["analytics"] == "failed"
    assert result["click_count"] is None and result["click_velocity"] is None
    assert result["rate_limit_rejections"] == 0
    assert "private" not in json.dumps(result)


def test_status_block_allow_expiry_precedence(client, db_session):
    seed(db_session)
    verdict = db_session.query(URLVerdict).one()
    verdict.review_decision = "block"
    db_session.commit()
    assert client.get("/urls/fixture/status").json()["status"] == "blocked"
    verdict.review_decision = "allow"
    db_session.commit()
    assert client.get("/urls/fixture/status").json()["status"] == "active"
    row = db_session.query(URL).one()
    row.expires_at = datetime(2000, 1, 1)
    db_session.commit()
    assert client.get("/urls/fixture/status").json()["status"] == "expired"

import json
import os
from datetime import datetime, timedelta
from unittest.mock import Mock

import pytest
from sqlalchemy import select

from app.models.analytics import Analytics
from app.models.api_key import APIKey
from app.models.url import URL
from app.models.url_verdict import URLVerdict
from app.services.api_keys import hash_key
from scripts import demo
from scripts.demo_seed import fixtures, seed


def test_seed_stable_aliases_clicks_verdicts_and_hashed_keys(db_session):
    anchor = datetime(2026, 10, 29, 12)
    result = seed(db_session, anchor)
    assert result["urls"] == 30
    assert result["history_rows"] == db_session.query(Analytics).count() == 115
    assert db_session.query(URLVerdict).filter_by(verdict="clean").count() == 24
    assert db_session.query(URLVerdict).filter_by(verdict="suspicious").count() == 4
    assert db_session.query(URLVerdict).filter_by(verdict="malicious").count() == 2
    keys = list(db_session.scalars(select(APIKey).order_by(APIKey.id)))
    assert keys[0].scopes == ["admin"] and keys[1].scopes == ["read", "write"]
    assert keys[0].key_hash == hash_key(result["admin_key"])
    assert keys[1].key_hash == hash_key(result["read_write_key"])
    assert result["admin_key"] != result["read_write_key"]
    rows = db_session.query(URL).order_by(URL.id).all()
    assert [(r.short_code, r.long_url) for r in rows] == fixtures()
    assert rows[0].created_at == anchor - timedelta(days=7)
    with pytest.raises(ValueError, match="empty database"):
        seed(db_session, anchor)
    assert db_session.query(APIKey).count() == 2


def test_seed_identities_repeat_after_fresh_reset(db_session):
    anchor = datetime(2026, 10, 29, 12)
    seed(db_session, anchor)
    first = [
        (r.short_code, r.event_id, r.clicked_at)
        for r in db_session.query(Analytics).order_by(Analytics.id)
    ]
    for model in (Analytics, URLVerdict, URL, APIKey):
        db_session.query(model).delete()
    db_session.commit()
    seed(db_session, anchor)
    second = [
        (r.short_code, r.event_id, r.clicked_at)
        for r in db_session.query(Analytics).order_by(Analytics.id)
    ]
    assert first == second


def test_environment_drops_user_credentials_and_compose_overrides(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "private-fixture")
    monkeypatch.setenv("POSTGRES_PASSWORD", "private-fixture")
    monkeypatch.setenv("COMPOSE_FILE", "other.yml")
    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    assert (
        not {"GEMINI_API_KEY", "POSTGRES_PASSWORD", "COMPOSE_FILE", "LLM_PROVIDER"}
        & demo.environment().keys()
    )
    assert "PATH" in demo.environment()


def test_private_state_and_no_overwrite(tmp_path, monkeypatch):
    monkeypatch.setattr(demo, "STATE", tmp_path / ".demo")
    password = demo.initialize()
    env = (demo.STATE / "env").read_text()
    assert password in env
    assert os.stat(demo.STATE).st_mode & 0o777 == 0o700
    assert os.stat(demo.STATE / "env").st_mode & 0o777 == 0o600
    assert "API_KEY" not in env
    with pytest.raises(FileExistsError):
        demo.initialize()


def test_down_refuses_foreign_owner(tmp_path, monkeypatch):
    monkeypatch.setattr(demo, "STATE", tmp_path / ".demo")
    demo.initialize()
    (demo.STATE / "owner").write_text("another-checkout")
    run = Mock()
    monkeypatch.setattr(demo, "compose", run)
    with pytest.raises(RuntimeError, match="ownership"):
        demo.down()
    run.assert_not_called()


def test_down_removes_only_own_state(tmp_path, monkeypatch):
    monkeypatch.setattr(demo, "STATE", tmp_path / ".demo")
    demo.initialize()
    sibling = tmp_path / ".env"
    sibling.write_text("preserve")
    monkeypatch.setattr(demo, "resources", lambda kind: [])
    run = Mock()
    monkeypatch.setattr(demo, "compose", run)
    demo.down()
    run.assert_called_once_with(
        "down", "--volumes", "--remove-orphans", "--timeout", "15"
    )
    assert not demo.STATE.exists() and sibling.read_text() == "preserve"


def test_up_prints_each_key_once_only_after_verification(monkeypatch, capsys):
    monkeypatch.setattr(demo, "preflight", lambda: None)
    monkeypatch.setattr(demo, "initialize", lambda: "grafana-private-fixture")
    data = dict(
        admin_key="admin-private-fixture",
        read_write_key="writer-private-fixture",
        urls=30,
        history_rows=115,
    )
    calls = []

    def compose(*args, **kwargs):
        calls.append(args)
        return Mock(stdout=json.dumps(data))

    monkeypatch.setattr(demo, "compose", compose)
    monkeypatch.setattr(demo, "request", lambda url, key="": (307, b""))
    monkeypatch.setattr(demo, "wait_for", lambda *args, **kwargs: None)
    demo.up()
    output = capsys.readouterr().out
    for key in (
        "admin-private-fixture",
        "writer-private-fixture",
        "grafana-private-fixture",
    ):
        assert output.count(key) == 1
    assert ("exec", "-T", "api-redis", "alembic", "upgrade", "head") in calls
    assert all("private-fixture" not in str(call) for call in calls)


def test_wait_is_bounded(monkeypatch):
    clock = iter([0, 0, 2])
    monkeypatch.setattr(demo.time, "monotonic", lambda: next(clock))
    monkeypatch.setattr(demo.time, "sleep", lambda _: None)
    with pytest.raises(RuntimeError, match="Timed out"):
        demo.wait_for("fixture", lambda: False, timeout=1)


def test_no_redirect_following():
    assert (
        demo.NoRedirect().redirect_request(
            None, None, 307, None, {}, "https://example.com"
        )
        is None
    )

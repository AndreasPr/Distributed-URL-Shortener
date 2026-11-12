"""Hosted consumers together against disposable PostgreSQL and Redis."""

import time

import pytest

from app.core.config import settings
from app.models.analytics import Analytics
from app.models.url_verdict import URLVerdict
from app.workers.supervisor import hosted_supervisor
from tests.integration.conftest import wait_for

pytestmark = pytest.mark.integration


def test_hosted_consumers_process_and_shutdown(stack, pg_engine, monkeypatch):
    import app.main as main

    monkeypatch.setattr(settings, "APP_ROLE", "all")
    monkeypatch.setattr(
        settings, "DB_URL", pg_engine.url.render_as_string(hide_password=False)
    )
    monkeypatch.setattr(settings, "LLM_PROVIDER", "fake")
    supervisor = hosted_supervisor()
    monkeypatch.setattr(main.app.state, "supervisor", supervisor, raising=False)
    supervisor.start()
    try:
        wait_for(lambda: supervisor.ready.is_set())
        wait_for(lambda: all(w["healthy"] for w in supervisor.snapshot().values()))
        response = stack.client.post(
            "/shorten", json={"long_url": "https://example.com/"}
        )
        assert response.status_code == 200
        code = response.json()["short_code"]
        assert stack.client.get("/" + code, follow_redirects=False).status_code == 307

        def processed():
            with stack.db() as session:
                return (
                    session.query(Analytics).filter_by(short_code=code).count() == 1
                    and session.query(URLVerdict).filter_by(short_code=code).count()
                    == 1
                )

        wait_for(processed)
        assert stack.client.get("/health").status_code == 200
    finally:
        start = time.monotonic()
        supervisor.close()
        assert time.monotonic() - start < 8
        assert not any(thread.is_alive() for thread in supervisor.threads.values())


def test_statement_timeouts_are_transaction_local(pg_engine, monkeypatch):
    from sqlalchemy import event, text

    from app.db.database import transaction_limits

    monkeypatch.setattr(settings, "APP_ROLE", "all")
    with pg_engine.connect() as connection:
        original = connection.scalar(text("SHOW statement_timeout"))
        connection.rollback()
        event.listen(connection, "begin", transaction_limits)
        with connection.begin():
            assert connection.scalar(text("SHOW statement_timeout")) == "5s"
            assert connection.scalar(text("SHOW lock_timeout")) == "2s"
        event.remove(connection, "begin", transaction_limits)
        with connection.begin():
            assert connection.scalar(text("SHOW statement_timeout")) == original

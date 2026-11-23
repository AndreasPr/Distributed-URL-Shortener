from app.api import routes
from app.models.url import URL
from fastapi import FastAPI, Request


def test_health_endpoint_excludes_global_counts(monkeypatch, db_session):
    # A stored URL must not leak its count through public readiness.
    url = URL(long_url="https://example.com/test")
    db_session.add(url)
    db_session.commit()

    monkeypatch.setattr(routes.redis_client, "ping", lambda: True)
    monkeypatch.setattr(routes.redis_client, "dbsize", lambda: 1)

    result = routes.health(Request({"type": "http", "app": FastAPI()}), db_session)

    assert result["status"] == "ok"
    assert result["db"] == "reachable"
    assert result["redis"] == "reachable"
    assert set(result) == {"status", "db", "redis"}

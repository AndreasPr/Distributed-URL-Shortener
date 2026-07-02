from app.api import routes
from app.models.url import URL
from fastapi import HTTPException


def test_health_endpoint_includes_total_urls(monkeypatch, db_session):
    # Create a URL row so the endpoint reports a non-zero URL count.
    url = URL(long_url="https://example.com/test")
    db_session.add(url)
    db_session.commit()

    monkeypatch.setattr(routes.redis_client, "ping", lambda: True)
    monkeypatch.setattr(routes.redis_client, "dbsize", lambda: 1)

    result = routes.health(db_session)

    assert result["status"] == "ok"
    assert result["db"] == "reachable"
    assert result["redis"] == "reachable"
    assert result["total_urls"] == 1

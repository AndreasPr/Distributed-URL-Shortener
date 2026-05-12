from types import SimpleNamespace
from unittest.mock import MagicMock

from fastapi import HTTPException
from fastapi.responses import RedirectResponse

import app.api.routes as routes
from app.schemas.url_schema import URLCreate


def test_create_short_url_returns_service_code(monkeypatch):
    monkeypatch.setattr(routes.service, "shorten", MagicMock(return_value="abc"))
    db = MagicMock()
    req = URLCreate(long_url="https://example.com")

    result = routes.create_short_url(req, db)

    assert result == {"short_code": "abc"}
    routes.service.shorten.assert_called_once_with(db, req.long_url)


def test_redirect_returns_redirect_response(monkeypatch):
    monkeypatch.setattr(routes.service, "resolve", MagicMock(return_value="https://example.com"))
    db = MagicMock()

    response = routes.redirect("abc", db)

    assert isinstance(response, RedirectResponse)
    assert response.headers["location"] == "https://example.com"


def test_redirect_raises_404_for_missing_code(monkeypatch):
    monkeypatch.setattr(routes.service, "resolve", MagicMock(return_value=None))
    db = MagicMock()

    try:
        routes.redirect("missing", db)
        assert False, "Expected HTTPException"
    except HTTPException as exc:
        assert exc.status_code == 404
        assert exc.detail == "Not found"


def test_analytics_route_uses_service(monkeypatch):
    payload = {"short_code": "abc", "total_clicks": 2, "timestamps": ["2026-05-11T12:00:00"]}
    monkeypatch.setattr(routes.analytics_service, "get_analytics", MagicMock(return_value=payload))
    db = MagicMock()

    result = routes.analytics("abc", db)

    assert result == payload
    routes.analytics_service.get_analytics.assert_called_once_with(db, "abc")


def test_redis_health_success(monkeypatch):
    monkeypatch.setattr(routes.redis_client, "ping", MagicMock(return_value=True))
    monkeypatch.setattr(routes.redis_client, "dbsize", MagicMock(return_value=4))

    result = routes.redis_health()

    assert result == {"status": "ok", "redis": "reachable", "dbsize": 4}


def test_redis_health_failure(monkeypatch):
    monkeypatch.setattr(routes.redis_client, "ping", MagicMock(side_effect=RuntimeError("boom")))

    try:
        routes.redis_health()
        assert False, "Expected HTTPException"
    except HTTPException as exc:
        assert exc.status_code == 503
        assert "Redis unavailable" in exc.detail

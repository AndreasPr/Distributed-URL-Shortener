from types import SimpleNamespace
from unittest.mock import MagicMock

import app.services.url_service as url_service_module
from app.services.url_service import URLService


def test_shorten_creates_code_and_commits(monkeypatch):
    service = URLService()
    fake_repo = MagicMock()
    fake_repo.create_with_code.return_value = "cb"
    service.repo = fake_repo
    db = MagicMock()

    code = service.shorten(db, "https://example.com")

    assert code == "cb"
    fake_repo.create_with_code.assert_called_once_with(db, "https://example.com")
    db.commit.assert_called_once()


def test_resolve_returns_cached_value_and_publishes_event(monkeypatch):
    service = URLService()
    fake_repo = MagicMock()
    service.repo = fake_repo
    monkeypatch.setattr(url_service_module, "get_cache", lambda code: "https://cached.example.com")
    publish_mock = MagicMock()
    monkeypatch.setattr(url_service_module, "publish_click_event", publish_mock)
    db = MagicMock()

    result = service.resolve(db, "abc")

    assert result == "https://cached.example.com"
    fake_repo.get_by_code.assert_not_called()
    publish_mock.assert_called_once_with("abc")


def test_resolve_caches_database_value_on_miss(monkeypatch):
    service = URLService()
    fake_repo = MagicMock()
    fake_repo.get_by_code.return_value = SimpleNamespace(long_url="https://example.com")
    service.repo = fake_repo
    set_cache_mock = MagicMock()
    publish_mock = MagicMock()
    monkeypatch.setattr(url_service_module, "get_cache", lambda code: None)
    monkeypatch.setattr(url_service_module, "set_cache", set_cache_mock)
    monkeypatch.setattr(url_service_module, "publish_click_event", publish_mock)
    db = MagicMock()

    result = service.resolve(db, "abc")

    assert result == "https://example.com"
    set_cache_mock.assert_called_once_with("abc", "https://example.com", ttl=service.CACHE_TTL)
    publish_mock.assert_called_once_with("abc")


def test_resolve_returns_none_when_code_missing(monkeypatch):
    service = URLService()
    fake_repo = MagicMock()
    fake_repo.get_by_code.return_value = None
    service.repo = fake_repo
    set_cache_mock = MagicMock()
    publish_mock = MagicMock()
    monkeypatch.setattr(url_service_module, "get_cache", lambda code: None)
    monkeypatch.setattr(url_service_module, "set_cache", set_cache_mock)
    monkeypatch.setattr(url_service_module, "publish_click_event", publish_mock)
    db = MagicMock()

    result = service.resolve(db, "missing")

    assert result is None
    set_cache_mock.assert_not_called()
    publish_mock.assert_not_called()

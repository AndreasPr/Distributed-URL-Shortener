import json
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

import app.services.url_service as url_service_module
from app.services.url_service import URLService


@pytest.fixture(autouse=True)
def fake_cache_eviction(monkeypatch):
    monkeypatch.setattr(url_service_module, "delete_cache", MagicMock())


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


def test_resolve_returns_cached_value_and_records_click(monkeypatch):
    service = URLService()
    fake_repo = MagicMock()
    service.repo = fake_repo
    fake_repo.get_by_code.return_value = SimpleNamespace(
        deleted_at=None, expires_at=None, long_url="https://cached.example.com"
    )
    publish_mock = MagicMock()
    monkeypatch.setattr(url_service_module, "publish_click_event", publish_mock)
    monkeypatch.setattr(
        url_service_module, "get_cache", lambda code: "https://cached.example.com"
    )
    db = MagicMock()

    result = service.resolve(db, "abc")

    assert result == "https://cached.example.com"
    fake_repo.get_by_code.assert_called_once_with(db, "abc")
    publish_mock.assert_called_once_with("abc")
    db.commit.assert_not_called()


def test_resolve_caches_database_value_on_miss(monkeypatch):
    service = URLService()
    fake_repo = MagicMock()
    fake_repo.get_by_code.return_value = SimpleNamespace(
        deleted_at=None, expires_at=None, long_url="https://example.com"
    )
    service.repo = fake_repo
    publish_mock = MagicMock()
    monkeypatch.setattr(url_service_module, "publish_click_event", publish_mock)
    set_cache_mock = MagicMock()
    monkeypatch.setattr(url_service_module, "get_cache", lambda code: None)
    monkeypatch.setattr(url_service_module, "set_cache", set_cache_mock)
    db = MagicMock()

    result = service.resolve(db, "abc")

    assert result == "https://example.com"
    set_cache_mock.assert_called_once()
    assert json.loads(set_cache_mock.call_args.args[1])["url"] == "https://example.com"
    assert set_cache_mock.call_args.kwargs["ttl"] == service.CACHE_TTL
    assert set_cache_mock.call_args.kwargs["lock_token"]
    publish_mock.assert_called_once_with("abc")
    db.commit.assert_not_called()


def test_resolve_returns_none_when_code_missing(monkeypatch):
    service = URLService()
    fake_repo = MagicMock()
    fake_repo.get_by_code.return_value = None
    service.repo = fake_repo
    publish_mock = MagicMock()
    monkeypatch.setattr(url_service_module, "publish_click_event", publish_mock)
    set_cache_mock = MagicMock()
    monkeypatch.setattr(url_service_module, "get_cache", lambda code: None)
    monkeypatch.setattr(url_service_module, "set_cache", set_cache_mock)
    db = MagicMock()

    result = service.resolve(db, "missing")

    assert result is None
    assert json.loads(set_cache_mock.call_args.args[1])["kind"] == "missing"
    assert set_cache_mock.call_args.kwargs["ttl"] == 30
    publish_mock.assert_not_called()
    db.commit.assert_not_called()

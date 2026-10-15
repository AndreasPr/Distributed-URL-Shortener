from unittest.mock import Mock

import pytest
from redis.exceptions import ConnectionError, TimeoutError

import app.cache.redis_client as cache
from app.observability.metrics import (
    cache_errors_total,
    cache_hits_total,
    cache_misses_total,
)


@pytest.mark.parametrize("error", [ConnectionError, TimeoutError])
@pytest.mark.parametrize("operation", ["get", "ping", "dbsize"])
def test_read_errors_are_logged_and_counted(monkeypatch, caplog, error, operation):
    fake = Mock()
    getattr(fake, operation).side_effect = error("offline")
    monkeypatch.setattr(cache, "redis_client", fake)
    before = cache_errors_total._value.get()
    result = (
        cache.get_cache("code")
        if operation == "get"
        else cache.read_cache(getattr(fake, operation))
    )
    assert result is None
    assert cache_errors_total._value.get() == before + 1
    assert "Redis read failed" in caplog.text
    assert caplog.records[-1].exc_info


def test_programming_errors_are_not_hidden(monkeypatch):
    monkeypatch.setattr(
        cache, "redis_client", Mock(get=Mock(side_effect=ValueError("bug")))
    )
    with pytest.raises(ValueError, match="bug"):
        cache.get_cache("code")


@pytest.mark.parametrize(
    "value,counter",
    [("https://example.com/", cache_hits_total), (None, cache_misses_total)],
)
def test_normal_cache_reads(monkeypatch, value, counter):
    monkeypatch.setattr(cache, "redis_client", Mock(get=Mock(return_value=value)))
    before = counter._value.get()
    assert cache.get_cache("code") == value
    assert counter._value.get() == before + 1

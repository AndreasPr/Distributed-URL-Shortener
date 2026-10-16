import json
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from threading import Barrier, Event
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from redis.exceptions import ConnectionError, TimeoutError

import app.cache.redis_client as cache
import app.services.url_service as service
from app.cache.circuit_breaker import CircuitBreaker
from app.cache.singleflight import SingleFlight
from app.observability.metrics import (
    cache_errors_total,
    cache_fallback_total,
    cache_lock_wait_total,
    circuit_breaker_state,
    negative_cache_hits_total,
)


def row():
    return SimpleNamespace(
        long_url="https://example.com/", deleted_at=None, expires_at=None
    )


def test_circuit_open_half_open_closed_and_failed_probe(monkeypatch):
    clock = [0.0]
    breaker = CircuitBreaker(threshold=3, cooldown=5, clock=lambda: clock[0])
    monkeypatch.setattr(cache, "breaker", breaker)
    operation = Mock(side_effect=ConnectionError("stopped"))
    before = cache_errors_total._value.get()
    for _ in range(3):
        assert cache.read_cache(operation) is None
    assert breaker.state == 1 and circuit_breaker_state._value.get() == 1
    for _ in range(20):
        assert cache.read_cache(operation) is None
    assert operation.call_count == 3
    assert cache_errors_total._value.get() == before + 23
    clock[0] = 5

    def bad_probe():
        assert breaker.state == 2 and circuit_breaker_state._value.get() == 2
        raise TimeoutError("still stopped")

    assert cache.read_cache(bad_probe) is None
    assert breaker.state == 1
    clock[0] = 10

    def good_probe():
        assert breaker.state == 2
        return True

    assert cache.read_cache(good_probe)
    assert breaker.state == 0 and circuit_breaker_state._value.get() == 0
    assert cache.read_cache(lambda: "healthy") == "healthy"


def test_only_one_half_open_probe_and_stale_success_cannot_close(monkeypatch):
    clock = [0.0]
    breaker = CircuitBreaker(threshold=1, cooldown=1, clock=lambda: clock[0])
    monkeypatch.setattr(cache, "breaker", breaker)
    old = breaker.permit()
    breaker.failure(old)
    breaker.success(old)
    assert breaker.state == 1
    clock[0] = 1
    entered, release = Event(), Event()

    def probe():
        entered.set()
        assert release.wait(5)
        return True

    with ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(cache.read_cache, probe)
        assert entered.wait(5)
        blocked = Mock(return_value=True)
        assert cache.read_cache(blocked) is None
        blocked.assert_not_called()
        release.set()
        assert future.result(timeout=5)
    assert breaker.state == 0


def test_success_resets_consecutive_failures(monkeypatch):
    breaker = CircuitBreaker()
    monkeypatch.setattr(cache, "breaker", breaker)
    fail = Mock(side_effect=ConnectionError("offline"))
    for _ in range(2):
        cache.read_cache(fail)
    cache.read_cache(lambda: True)
    for _ in range(2):
        cache.read_cache(fail)
    assert breaker.state == 0
    cache.read_cache(fail)
    assert breaker.state == 1


def test_client_timeout_and_retry_configuration(monkeypatch):
    factory = Mock()
    monkeypatch.setattr(cache.redis.Redis, "from_url", factory)
    cache._create_client()
    kwargs = factory.call_args.kwargs
    assert kwargs["socket_timeout"] == 0.1
    assert kwargs["socket_connect_timeout"] == 0.1
    assert kwargs["retry"].get_retries() == 0


def test_ttl_jitter_bounds_and_absolute_expiry(monkeypatch, isolated_cache):
    samples = [cache.jittered_ttl(86400) for _ in range(1000)]
    assert all(77760 <= value <= 95040 for value in samples)
    assert min(samples) < 86400 < max(samples)
    monkeypatch.setattr(cache.time, "time", lambda: 1000)
    for chooser in (lambda low, high: low, lambda low, high: high):
        monkeypatch.setattr(cache.random, "randint", chooser)
        cache.set_cache("key", "value", ttl=100)
        assert isolated_cache.deadlines["key"] in (1090000, 1110000)
        cache.set_cache("key", "value", ttl=100, expires_at_ms=1005000)
        assert isolated_cache.deadlines["key"] == 1005000


@pytest.mark.parametrize("redis_down", [False, True])
def test_many_cold_requests_share_one_database_read(
    monkeypatch, isolated_cache, redis_down
):
    isolated_cache.down = redis_down
    started, release = Event(), Event()
    barrier = Barrier(20)

    def load(db, code):
        started.set()
        assert release.wait(5)
        return row()

    repo = Mock()
    repo.get_by_code.side_effect = load
    svc = service.URLService()
    svc.repo = repo
    monkeypatch.setattr(service, "publish_click_event", Mock())
    before = cache_lock_wait_total._value.get()

    def request(_):
        barrier.wait(timeout=5)
        return svc.resolve(Mock(), "cold")

    with ThreadPoolExecutor(max_workers=20) as executor:
        futures = [executor.submit(request, i) for i in range(20)]
        assert started.wait(5)
        deadline = time.monotonic() + 0.15
        while (
            cache_lock_wait_total._value.get() - before < 19
            and time.monotonic() < deadline
        ):
            time.sleep(0.001)
        release.set()
        assert [f.result(timeout=5) for f in futures] == ["https://example.com/"] * 20
    assert repo.get_by_code.call_count == 1
    assert service.loads._pending == {}
    assert service.publish_click_event.call_count == 20


def test_cross_process_lock_wait_rechecks_cache(monkeypatch):
    started, release = Event(), Event()
    svc = service.URLService()
    svc.repo = Mock()

    def load(db, code):
        started.set()
        assert release.wait(5)
        return row()

    svc.repo.get_by_code.side_effect = load
    svc.repo.get_lifecycle.return_value = (None, None)
    # Calling _load directly models separate process-local single-flight maps.
    with ThreadPoolExecutor(max_workers=2) as executor:
        first = executor.submit(svc._load, Mock(), "same")
        assert started.wait(5)
        before = cache_lock_wait_total._value.get()
        second = executor.submit(svc._load, Mock(), "same")
        deadline = time.monotonic() + 0.15
        while (
            cache_lock_wait_total._value.get() == before and time.monotonic() < deadline
        ):
            time.sleep(0.001)
        release.set()
        assert first.result(timeout=5).long_url == "https://example.com/"
        assert second.result(timeout=5).long_url == "https://example.com/"
    assert svc.repo.get_by_code.call_count == 1
    # Deliberate safety tradeoff: another replica still validates lifecycle.
    svc.repo.get_lifecycle.assert_called_once()


def test_negative_caching_and_alias_creation_invalidation(db_session, monkeypatch):
    svc = service.URLService()
    original = svc.repo.get_by_code
    svc.repo.get_by_code = Mock(wraps=original)
    before = negative_cache_hits_total._value.get()
    for _ in range(5):
        assert svc.resolve(db_session, "new-alias") is None
    assert svc.repo.get_by_code.call_count == 1
    assert negative_cache_hits_total._value.get() == before + 4
    svc.shorten(db_session, "https://example.com/", "new-alias")
    monkeypatch.setattr(service, "publish_click_event", Mock())
    assert svc.resolve(db_session, "new-alias") == "https://example.com/"


def test_alias_creation_fences_an_inflight_negative_fill(db_session):
    svc = service.URLService()

    def old_read(db, code):
        service.URLService().shorten(db, "https://example.com/", code)
        return None  # Simulate a read that started before the creation committed.

    svc.repo.get_by_code = Mock(side_effect=old_read)
    assert svc.resolve(db_session, "new-alias") is None
    assert cache.get_cache("new-alias") is None


def test_lock_release_and_publication_require_owner(isolated_cache):
    token, reachable = cache.acquire_lock("abc")
    assert token and reachable
    other, reachable = cache.acquire_lock("abc")
    assert other is None and reachable
    isolated_cache.set("url-lock:abc", "new-owner", px=1500)
    cache.release_lock("abc", token)
    cache.set_cache("abc", "stale", lock_token=token)
    assert isolated_cache.get("url-lock:abc") == "new-owner"
    assert isolated_cache.get("abc") is None


def test_negative_cache_expiry(db_session, isolated_cache):
    svc = service.URLService()
    svc.repo.get_by_code = Mock(return_value=None)
    assert svc.resolve(db_session, "missing") is None
    payload = json.loads(isolated_cache.get("missing"))
    assert 29 <= payload["until"] - time.time() <= 30
    isolated_cache.deadlines["missing"] = 0
    assert svc.resolve(db_session, "missing") is None
    assert svc.repo.get_by_code.call_count == 2


def test_redis_down_falls_back_and_counts_metric(isolated_cache, monkeypatch):
    isolated_cache.down = True
    svc = service.URLService()
    svc.repo.get_by_code = Mock(return_value=row())
    monkeypatch.setattr(service, "publish_click_event", Mock())
    before = cache_fallback_total._value.get()
    for _ in range(10):
        assert svc.resolve(Mock(), "abc") == "https://example.com/"
    assert cache.breaker.state == 1
    assert sum(isolated_cache.calls.values()) == 3
    assert cache_fallback_total._value.get() == before + 10


def test_singleflight_timeout_and_exception_cleanup():
    flight = SingleFlight()
    started, release = Event(), Event()

    def slow():
        started.set()
        assert release.wait(5)
        return "first"

    with ThreadPoolExecutor(max_workers=1) as executor:
        first = executor.submit(flight.run, "key", slow)
        assert started.wait(5)
        assert flight.run("key", lambda: "fallback", wait=0.001) == "fallback"
        release.set()
        assert first.result(timeout=5) == "first"
    with pytest.raises(ValueError):
        flight.run("key", Mock(side_effect=ValueError("database error")))
    assert flight._pending == {}


def test_positive_cache_still_checks_deletion_and_database_failure(monkeypatch):
    svc = service.URLService()
    svc.repo.get_by_code = Mock(return_value=row())
    svc.repo.get_lifecycle = Mock(return_value=(None, None))
    monkeypatch.setattr(service, "publish_click_event", Mock())
    assert svc.resolve(Mock(), "abc") == "https://example.com/"
    assert svc.resolve(Mock(), "abc") == "https://example.com/"
    assert svc.repo.get_by_code.call_count == 1
    assert svc.repo.get_lifecycle.call_count == 1
    svc.repo.get_lifecycle.side_effect = RuntimeError("database unavailable")
    with pytest.raises(RuntimeError, match="database unavailable"):
        svc.resolve(Mock(), "abc")
    svc.repo.get_lifecycle.side_effect = None
    svc.repo.get_lifecycle.return_value = (datetime.now(timezone.utc), None)
    assert svc.resolve(Mock(), "abc") is None


@pytest.mark.docker
def test_postgresql_stampede_executes_one_select(postgres, monkeypatch):
    from pathlib import Path
    from sqlalchemy import event
    from sqlalchemy.orm import Session
    from alembic import command
    from alembic.config import Config
    from app.repositories.url_repository import URLRepository

    cfg = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    with postgres.begin() as connection:
        cfg.attributes["connection"] = connection
        command.upgrade(cfg, "head")
    with Session(postgres) as session:
        code = service.URLService().shorten(session, "https://example.com/")
    selects = []

    def track(connection, cursor, statement, parameters, context, executemany):
        if statement.lstrip().startswith("SELECT") and "FROM urls" in statement:
            selects.append(statement)

    event.listen(postgres, "before_cursor_execute", track)
    started, release = Event(), Event()
    original = URLRepository.get_by_code

    def delayed(self, db, code):
        started.set()
        assert release.wait(5)
        return original(self, db, code)

    monkeypatch.setattr(URLRepository, "get_by_code", delayed)
    monkeypatch.setattr(service, "publish_click_event", Mock())
    barrier = Barrier(12)
    before = cache_lock_wait_total._value.get()

    def request(_):
        with Session(postgres) as session:
            barrier.wait(timeout=5)
            return service.URLService().resolve(session, code)

    try:
        with ThreadPoolExecutor(max_workers=12) as executor:
            futures = [executor.submit(request, i) for i in range(12)]
            assert started.wait(5)
            deadline = time.monotonic() + 0.15
            while (
                cache_lock_wait_total._value.get() - before < 11
                and time.monotonic() < deadline
            ):
                time.sleep(0.001)
            release.set()
            assert [future.result(timeout=5) for future in futures] == [
                "https://example.com/"
            ] * 12
        assert len(selects) == 1
    finally:
        event.remove(postgres, "before_cursor_execute", track)

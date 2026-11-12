"""Offline hosted profile contracts: no real accounts, brokers or credentials."""

import json
import os
import subprocess
import sys
import threading
import time
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient
from redis.exceptions import ResponseError

import app.main as main
from app.cache import redis_client as cache
from app.cache.circuit_breaker import CircuitBreaker
from app.core.config import settings
from app.middleware.rate_limiter import LocalBuckets, check_bucket
from app.workers.supervisor import Supervisor
from test_app_assembly import client  # noqa: F401; reuse assembled app fixture


def wait_until(predicate):
    end = time.monotonic() + 2
    while time.monotonic() < end:
        if predicate():
            return
        time.sleep(0.005)
    assert predicate()


class Worker:
    def __init__(self, crash=False):
        self.stop = threading.Event()
        self.last_success = time.monotonic()
        self.lag_value = 3
        self.crash = crash
        self.flushed = False

    def run(self):
        try:
            if self.crash:
                raise RuntimeError("crash")
            self.stop.wait()
        finally:
            self.flushed = True


def test_supervisor_restarts_and_stops_both_consumers():
    workers = []

    def create():
        worker = Worker(crash=not workers)
        workers.append(worker)
        return worker

    other = Worker()
    supervisor = Supervisor(
        {"analytics": create, "abuse": lambda: other}, backoff=0.01, cap=0.02
    )
    supervisor.start()
    try:
        wait_until(lambda: len(workers) == 2)
        status = supervisor.snapshot()
        assert all(w["healthy"] and w["lag"] == 3 for w in status.values())
    finally:
        start = time.monotonic()
        supervisor.close()
        assert time.monotonic() - start < 1
    assert all(w.flushed for w in workers + [other])
    assert not any(t.is_alive() for t in supervisor.threads.values())


def test_stale_worker_reports_unknown_lag():
    worker = Worker()
    worker.last_success = float("-inf")
    supervisor = Supervisor({"analytics": lambda: worker})
    supervisor.workers["analytics"] = worker
    assert supervisor.snapshot()["analytics"] == {
        "alive": True,
        "healthy": False,
        "lag": None,
    }


def test_lifespan_livez_while_migration_waits(monkeypatch):
    import app.workers.supervisor as module

    release = threading.Event()
    supervisor = Supervisor({}, prepare=lambda: release.wait(3))
    monkeypatch.setattr(settings, "APP_ROLE", "all")
    monkeypatch.setattr(module, "hosted_supervisor", lambda: supervisor)
    monkeypatch.setattr(main, "init_tracing", Mock())
    monkeypatch.setattr(main, "shutdown_tracing", Mock())
    monkeypatch.setattr(main, "publisher", Mock())
    start = time.monotonic()
    try:
        with TestClient(main.app) as http:
            assert http.get("/livez").status_code == 200
            assert time.monotonic() - start < 1
            assert http.get("/a-code").status_code == 503
            release.set()
    finally:
        release.set()


def test_quota_opens_breaker_and_recovers(monkeypatch):
    now = [0.0]
    breaker = CircuitBreaker(clock=lambda: now[0])
    monkeypatch.setattr(cache, "breaker", breaker)
    monkeypatch.setattr(settings, "APP_ROLE", "all")
    failed = Mock(side_effect=ResponseError("max requests limit exceeded"))
    from app.observability.metrics import redis_degraded_total

    before = redis_degraded_total._value.get()
    assert cache.read_cache(failed) is None
    assert breaker.state == 1
    assert cache.read_cache(failed) is None
    assert failed.call_count == 1
    assert redis_degraded_total._value.get() == before + 2
    now[0] = 5
    assert cache.read_cache(lambda: True)
    assert breaker.state == 0


def test_other_response_errors_propagate(monkeypatch):
    monkeypatch.setattr(cache, "breaker", CircuitBreaker())
    with pytest.raises(ResponseError):
        cache.read_cache(Mock(side_effect=ResponseError("wrong type")))


def test_local_bucket_refill_isolation_and_bound():
    now = [0.0]
    bucket = LocalBuckets(clock=lambda: now[0], max_entries=2)
    assert bucket.check("a", 1, 1).allowed
    assert not bucket.check("a", 1, 1).allowed
    assert bucket.check("b", 1, 1).allowed
    now[0] = 1
    assert bucket.check("a", 1, 1).allowed
    bucket.check("c", 1, 1)
    assert len(bucket.entries) == 2


def test_hosted_bucket_fallback_only(monkeypatch):
    monkeypatch.setattr(cache, "read_cache", lambda fn: None)
    monkeypatch.setattr(settings, "APP_ROLE", "all")
    assert check_bucket("/shorten", "hosted-test", 2, 1).allowed
    monkeypatch.setattr(settings, "APP_ROLE", "api")
    with pytest.raises(ConnectionError):
        check_bucket("/shorten", "hosted-test", 2, 1)


def hosted_ready(monkeypatch, client):
    monkeypatch.setattr(settings, "APP_ROLE", "all")
    ready = threading.Event()
    ready.set()
    supervisor = SimpleNamespace(
        ready=ready,
        snapshot=lambda: {"analytics": {"alive": False, "healthy": False, "lag": None}},
    )
    monkeypatch.setattr(main.app.state, "supervisor", supervisor, raising=False)


def test_quota_never_turns_redirect_into_5xx(client, monkeypatch):
    code = client.post("/shorten", json={"long_url": "https://example.com/"}).json()[
        "short_code"
    ]
    hosted_ready(monkeypatch, client)
    monkeypatch.setattr(cache, "breaker", CircuitBreaker())
    for name in ("get", "eval", "set", "ping"):
        getattr(cache.redis_client, name).side_effect = ResponseError(
            "max requests limit exceeded"
        )
    for _ in range(3):
        assert client.get("/" + code, follow_redirects=False).status_code == 307
    health = client.get("/health")
    assert health.status_code == 503
    assert health.json()["redis"] == "unreachable"
    assert health.json()["workers"]["analytics"]["alive"] is False


def test_full_redirect_cache_hit_uses_two_redis_commands(client, monkeypatch):
    code = client.post("/shorten", json={"long_url": "https://example.com/"}).json()[
        "short_code"
    ]
    hosted_ready(monkeypatch, client)
    cache.redis_client.get.return_value = json.dumps(
        {"version": 1, "kind": "url", "url": "https://example.com/", "expires_at": None}
    )
    cache.redis_client.reset_mock()
    assert client.get("/" + code, follow_redirects=False).status_code == 307
    assert [call[0] for call in cache.redis_client.mock_calls] == ["eval", "get"]


@pytest.mark.parametrize(
    "changes,error",
    [
        ({"APP_ROLE": "invalid"}, "APP_ROLE"),
        ({"CORS_ORIGINS": "http://localhost:3000"}, "localhost"),
        ({"TRUSTED_PROXIES": ""}, "TRUSTED_PROXIES"),
        ({"TRUSTED_PROXIES": "0.0.0.0/0"}, "TRUSTED_PROXIES"),
        ({"DATABASE_URL": "postgresql://user:pass@db.invalid/db"}, "default"),
        (
            {
                "DATABASE_URL": "postgresql://user:replace_with_url_safe_local_db_password@db.invalid/db"
            },
            "default",
        ),
        ({"LLM_DAILY_BUDGET": ""}, "LLM_DAILY_BUDGET"),
    ],
)
def test_production_rejects_unsafe_settings(changes, error):
    env = production_env() | changes
    result = subprocess.run(
        [sys.executable, "-c", "import app.core.config"],
        env=env,
        capture_output=True,
        text=True,
    )
    assert result.returncode != 0
    assert error in result.stderr


def production_env():
    return os.environ | {
        "ENVIRONMENT": "production",
        "AUTH_MODE": "supabase",
        "APP_ROLE": "all",
        "SUPABASE_URL": "https://project.example.com",
        "CORS_ORIGINS": "https://example.com",
        "TRUSTED_PROXIES": "10.42.0.0/24",
        "LLM_DAILY_BUDGET": "0",
        "DATABASE_URL": "postgresql://user@db.invalid/db?sslmode=require",
        "REDIS_URL": "rediss://redis.invalid:6379/0",
        "LLM_PROVIDER": "fake",
    }


def test_hosted_defaults_and_tls_configuration():
    env = production_env()
    env.pop("EVENT_BUS", None)
    result = subprocess.run(
        [
            sys.executable,
            "-c",
            "from app.core.config import settings; print(settings.EVENT_BUS)",
        ],
        env=env,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stderr
    assert result.stdout.strip() == "redis_streams"


def test_migrations_use_same_transaction_and_advisory_lock(monkeypatch):
    from app.db import startup

    engine = Mock()
    from unittest.mock import MagicMock

    context = MagicMock()
    engine.begin.return_value = context
    monkeypatch.setattr(startup, "create_engine", lambda *a, **k: engine)
    upgrade = Mock()
    monkeypatch.setattr(startup.command, "upgrade", upgrade)
    startup.migrate()
    connection = context.__enter__.return_value
    sql = [str(c.args[0]) for c in connection.execute.call_args_list]
    assert "pg_advisory_xact_lock" in sql[-1]
    assert upgrade.call_args.args[0].attributes["connection"] is connection
    engine.dispose.assert_called_once()


@pytest.mark.docker
def test_concurrent_migrations_on_postgres(postgres, monkeypatch):
    from concurrent.futures import ThreadPoolExecutor
    from sqlalchemy import text
    from app.db import startup
    from test_migrations import assert_matches_models

    monkeypatch.setattr(settings, "DB_URL", str(postgres.url))
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [pool.submit(startup.migrate) for _ in range(2)]
        for future in futures:
            future.result(timeout=20)
    with postgres.begin() as connection:
        assert_matches_models(connection)
        assert connection.scalar(
            text("SELECT pg_try_advisory_xact_lock(:key)"),
            {"key": startup.MIGRATION_LOCK},
        )


def test_stream_quota_uses_shared_breaker(monkeypatch):
    from app.events.redis_streams import RedisStreamsEventBus
    from app.events.models import ClickEvent

    monkeypatch.setattr(settings, "APP_ROLE", "all")
    monkeypatch.setattr(cache, "breaker", CircuitBreaker())
    redis = Mock()
    redis.xadd.side_effect = ResponseError("max requests limit exceeded")
    bus = RedisStreamsEventBus(redis)
    for _ in range(2):
        with pytest.raises(ConnectionError):
            bus.publish("clicks", ClickEvent(short_code="abc"))
    assert redis.xadd.call_count == 1
    assert cache.breaker.state == 1


def test_worker_role_never_serves_redirects(client, monkeypatch):
    monkeypatch.setattr(settings, "APP_ROLE", "worker")
    assert client.get("/livez").status_code == 200
    assert client.get("/abc").status_code == 503


def test_backoff_is_capped_and_shutdown_interrupts_wait():
    worker = Worker(crash=True)
    calls = []
    supervisor = Supervisor({"test": lambda: worker}, backoff=1, cap=3)

    class Stop:
        def is_set(self):
            return len(calls) == 5

        def wait(self, delay):
            calls.append(delay)

    supervisor.stop = Stop()
    supervisor._run("test", lambda: worker)
    assert calls == [1, 2, 3, 3, 3]


def test_shutdown_deadline_is_shared():
    release = threading.Event()

    class Stuck(Worker):
        def run(self):
            release.wait()

    supervisor = Supervisor({"analytics": Stuck, "abuse": Stuck})
    supervisor.start()
    try:
        wait_until(lambda: len(supervisor.workers) == 2)
        start = time.monotonic()
        supervisor.close(timeout=0.05)
        assert time.monotonic() - start < 0.2
    finally:
        release.set()
        for thread in supervisor.threads.values():
            thread.join(1)


def test_hosted_pool_configuration():
    result = subprocess.run(
        [
            sys.executable,
            "-c",
            "from app.db.database import engine; print(engine.pool.size(), engine.pool._max_overflow, engine.pool._recycle, engine.pool._pre_ping)",
        ],
        env=production_env(),
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stderr
    assert result.stdout.strip() == "5 2 300 True"


def test_render_blueprint_is_one_free_service_with_private_settings():
    from pathlib import Path
    import yaml

    blueprint = yaml.safe_load(Path("render.yaml").read_text())
    assert set(blueprint) == {"services"}
    assert len(blueprint["services"]) == 1
    service = blueprint["services"][0]
    assert service["plan"] == "free"
    assert service["region"] == "virginia"
    assert service["autoDeployTrigger"] == "checksPass"
    assert service["healthCheckPath"] == "/livez"
    assert service["dockerCommand"] == "python -m app.hosted"
    env = {entry["key"]: entry for entry in service["envVars"]}
    assert env["APP_ROLE"]["value"] == "all"
    for name in (
        "DATABASE_URL",
        "REDIS_URL",
        "SUPABASE_URL",
        "SUPABASE_ANON_KEY",
        "TRUSTED_PROXIES",
        "CORS_ORIGINS",
    ):
        assert env[name] == {"key": name, "sync": False}


def test_migration_retry_and_stop_before_workers_start():
    calls = []
    failed = threading.Event()

    def migrate():
        calls.append(True)
        if len(calls) == 1:
            failed.set()
            raise ConnectionError("database starting")

    worker = Worker()
    supervisor = Supervisor(
        {"analytics": lambda: worker}, prepare=migrate, backoff=0.01
    )
    supervisor.start()
    try:
        assert failed.wait(1)
        wait_until(lambda: supervisor.ready.is_set())
        assert len(calls) == 2
    finally:
        supervisor.close()

    release = threading.Event()
    second = Supervisor({"analytics": Mock()}, prepare=lambda: release.wait())
    second.start()
    second.stop.set()
    release.set()
    second.close()
    assert not second.ready.is_set()
    assert not second.threads


def test_failed_consumer_construction_closes_owned_resources(monkeypatch):
    import app.db.database as db_module
    import app.events as events
    import app.workers.abuse_worker as abuse
    from app.workers.supervisor import hosted_supervisor

    db, bus = Mock(), Mock()
    monkeypatch.setattr(db_module, "SessionLocal", lambda: db)
    monkeypatch.setattr(events, "create_event_bus", lambda: bus)
    monkeypatch.setattr(
        abuse, "AbuseWorker", Mock(side_effect=ValueError("invalid policy"))
    )
    with pytest.raises(ValueError):
        hosted_supervisor().factories["abuse"]()
    db.close.assert_called_once()
    bus.close.assert_called_once()
    monkeypatch.setattr(db_module, "SessionLocal", None)
    with pytest.raises(RuntimeError, match="Database not configured"):
        hosted_supervisor().factories["analytics"]()


def test_hosted_launcher_bounds_drain_and_never_implicitly_trusts_proxy(monkeypatch):
    import runpy
    import uvicorn

    run = Mock()
    monkeypatch.setattr(uvicorn, "run", run)
    monkeypatch.setenv("PORT", "18080")
    runpy.run_module("app.hosted", run_name="__main__")
    assert run.call_args.kwargs["port"] == 18080
    assert run.call_args.kwargs["proxy_headers"] is False
    assert run.call_args.kwargs["timeout_graceful_shutdown"] == 1


@pytest.mark.parametrize(
    "origin",
    [
        "http://localhost.:3000",
        "http://test.localhost",
        "http://127.0.0.2",
        "http://[::1]",
        "http://[::ffff:127.0.0.1]",
    ],
)
def test_loopback_origin_forms(origin):
    from app.core.config import local_origin

    assert local_origin(origin)
    assert not local_origin("https://example.com")

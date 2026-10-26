"""Disposable real services; never connect to the developer's Compose volumes."""

import time
from pathlib import Path
from threading import Thread
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from alembic import command
from alembic.config import Config

ROOT = Path(__file__).resolve().parents[2]


def wait_for(predicate, timeout=10):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        value = predicate()
        if value:
            return value
        time.sleep(0.025)
    pytest.fail(f"Condition not satisfied within {timeout} seconds")


@pytest.fixture(autouse=True)
def isolated_cache():
    """Override the root unit fixture: integration must NOT install FakeRedis."""
    yield


@pytest.fixture(scope="session")
def pg_engine():
    from testcontainers.postgres import PostgresContainer

    with PostgresContainer("postgres:16.13-alpine") as container:
        engine = create_engine(
            container.get_connection_url(),
            pool_pre_ping=True,
            connect_args={"connect_timeout": 3},
        )
        try:
            cfg = Config(str(ROOT / "alembic.ini"))
            with engine.begin() as connection:
                cfg.attributes["connection"] = connection
                command.upgrade(cfg, "head")
            yield engine
        finally:
            engine.dispose()


@pytest.fixture
def database(pg_engine):
    with pg_engine.begin() as connection:
        connection.execute(
            text(
                "TRUNCATE analytics, abuse_outbox, url_verdicts, urls, api_keys "
                "RESTART IDENTITY CASCADE"
            )
        )
    return sessionmaker(bind=pg_engine, expire_on_commit=False)


@pytest.fixture
def redis_service():
    from testcontainers.redis import RedisContainer

    with RedisContainer("redis:7.4.9-alpine") as container:
        yield container


@pytest.fixture
def stack(database, redis_service, monkeypatch):
    import app.api.routes as routes
    import app.cache.redis_client as cache
    import app.db.database as db_module
    import app.events.publisher as publisher_module
    import app.main as main
    import app.services.url_service as service
    from app.cache.circuit_breaker import CircuitBreaker
    from app.cache.singleflight import SingleFlight
    from app.core.config import settings
    from app.db.database import get_db
    from app.events.publisher import BackgroundPublisher
    from app.events.redis_streams import RedisStreamsEventBus
    from app.services.api_keys import create_key

    host = redis_service.get_container_host_ip()
    port = redis_service.get_exposed_port(6379)
    redis_url = f"redis://{host}:{port}/0"
    monkeypatch.setattr(settings, "REDIS_URL", redis_url)
    monkeypatch.setattr(settings, "EVENT_BUS", "redis_streams")
    for name in (
        "EVENT_TOPIC",
        "EVENT_CONSUMER_GROUP",
        "EVENT_DLQ_TOPIC",
        "ABUSE_TOPIC",
        "ABUSE_GROUP",
        "ABUSE_DLQ_TOPIC",
    ):
        monkeypatch.setattr(settings, name, name.lower() + uuid4().hex[:8])
    monkeypatch.setattr(settings, "EVENT_CLAIM_IDLE_MS", 100)
    monkeypatch.setattr(settings, "LLM_PROVIDER", "fake")
    monkeypatch.setattr(settings, "METRICS_PORT", 0)
    monkeypatch.setattr(settings, "WRITE_RATE_CAPACITY", 100)
    monkeypatch.setattr(settings, "WRITE_RATE_REFILL", 100.0)
    monkeypatch.setattr(settings, "REDIRECT_RATE_CAPACITY", 1000)
    monkeypatch.setattr(settings, "REDIRECT_RATE_REFILL", 1000.0)
    redis = cache._create_client()
    monkeypatch.setattr(cache, "redis_client", redis)
    monkeypatch.setattr(routes, "redis_client", redis)
    monkeypatch.setattr(cache, "breaker", CircuitBreaker(cooldown=0.2))
    monkeypatch.setattr(service, "loads", SingleFlight())
    monkeypatch.setattr(db_module, "SessionLocal", database)
    publisher = BackgroundPublisher(factory=RedisStreamsEventBus)
    monkeypatch.setattr(main, "publisher", publisher)
    monkeypatch.setattr(publisher_module, "publisher", publisher)
    # Exporters are outside this suite: don't send telemetry to a local/remote OTLP
    # endpoint. Real startup/shutdown and publisher lifecycle still execute.
    monkeypatch.setattr(main, "init_tracing", lambda **kw: None)
    monkeypatch.setattr(main, "shutdown_tracing", lambda: None)

    def get_session():
        with database() as session:
            yield session

    previous = main.app.dependency_overrides.copy()
    main.app.dependency_overrides[get_db] = get_session
    main.app.dependency_overrides[routes.get_health_db] = get_session
    with database() as session:
        keys = {
            scope: create_key(session, scope, [scope])[1]
            for scope in ("read", "write", "admin")
        }
    workers = []

    def run_worker(worker):
        thread = Thread(target=worker.run, daemon=True)
        workers.append((worker, thread))
        thread.start()
        return worker

    try:
        with TestClient(main.app, headers={"X-API-Key": keys["admin"]}) as client:
            yield SimpleNamespace(
                client=client,
                db=database,
                redis=redis,
                redis_service=redis_service,
                keys=keys,
                publisher=publisher,
                run_worker=run_worker,
            )
    finally:
        for worker, thread in workers:
            worker.stop.set()
            thread.join(8)
            assert not thread.is_alive(), "Worker leaked beyond fixture teardown"
        main.app.dependency_overrides = previous
        publisher.close()
        redis.close()


@pytest.fixture
def analytics_worker(stack):
    from app.events.redis_streams import RedisStreamsEventBus
    from app.workers.analytics_worker import AnalyticsWorker

    return stack.run_worker(
        AnalyticsWorker(
            RedisStreamsEventBus(),
            stack.db(),
            batch_size=100,
            flush_interval=0.15,
            backoff=0.01,
        )
    )


@pytest.fixture(scope="session")
def kafka_service():
    from testcontainers.kafka import KafkaContainer

    # Same pinned KRaft image as Compose; this is intentionally slow/optional.
    container = KafkaContainer("confluentinc/cp-kafka:8.3.0").with_kraft()
    try:
        container.start(timeout=90)
        yield container
    finally:
        if container.get_wrapped_container() is not None:
            container.stop()

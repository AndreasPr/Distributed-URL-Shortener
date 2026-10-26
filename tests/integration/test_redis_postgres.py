"""Real FastAPI assembly + migrated PostgreSQL + Redis Streams and Lua."""

import base64
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import text

from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from app.core.config import settings
from app.events.models import ClickEvent, DeadLetter
from app.events.redis_streams import RedisStreamsEventBus
from app.models.analytics import Analytics
from app.models.url import URL, Base
from app.models.url_verdict import URLVerdict
from app.workers.analytics_worker import AnalyticsWorker

from .conftest import wait_for

pytestmark = pytest.mark.integration


def shorten(stack, **fields):
    response = stack.client.post(
        "/shorten", json={"long_url": "https://example.com/", **fields}
    )
    assert response.status_code == 200, response.text
    return response.json()["short_code"]


def count(stack, code):
    with stack.db() as db:
        return db.query(Analytics).filter_by(short_code=code).count()


def test_migrations_empty_postgres_matches_models(pg_engine):
    with pg_engine.connect() as connection:
        context = MigrationContext.configure(
            connection, opts={"compare_type": True, "compare_server_default": True}
        )
        assert compare_metadata(context, Base.metadata) == []
        assert (
            connection.scalar(text("SELECT version_num FROM alembic_version")) == "0005"
        )
        assert set(Base.metadata.tables) == {
            "urls",
            "analytics",
            "api_keys",
            "url_verdicts",
            "abuse_outbox",
        }


def test_shorten_redirect_idle_flush_analytics(stack, analytics_worker):
    code = shorten(stack)
    assert stack.client.get("/health").status_code == 200
    assert stack.client.get("/livez").status_code == 200
    assert stack.client.get("/metrics").status_code == 200
    for _ in range(5):
        response = stack.client.get("/" + code, follow_redirects=False)
        assert response.status_code == 307
        assert response.headers["location"] == "https://example.com/"
    # Batch size 100: five events must flush from the idle timer, not size.
    wait_for(lambda: count(stack, code) == 5)
    response = stack.client.get("/analytics/" + code)
    assert response.json()["total_clicks"] == 5
    assert len(response.json()["timestamps"]) == 5
    wait_for(
        lambda: stack.redis.xpending(
            settings.EVENT_TOPIC, settings.EVENT_CONSUMER_GROUP
        )["pending"]
        == 0
    )


def test_expiry_and_deletion_not_served_from_cache(stack):
    expiry = datetime.now(timezone.utc) + timedelta(seconds=2)
    code = shorten(stack, expires_at=expiry.isoformat())
    assert stack.client.get("/" + code, follow_redirects=False).status_code == 307
    with stack.db() as db:
        row = db.query(URL).filter_by(short_code=code).one()
        assert row.expires_at is not None
    wait_for(lambda: datetime.now(timezone.utc) >= expiry, timeout=4)
    assert stack.client.get("/" + code, follow_redirects=False).status_code == 410
    other = shorten(stack)
    assert stack.client.get("/" + other, follow_redirects=False).status_code == 307
    assert stack.redis.get(other) is not None
    assert stack.client.delete("/urls/" + other).status_code == 204
    assert stack.redis.get(other) is None
    assert stack.client.get("/" + other, follow_redirects=False).status_code == 404
    assert other not in {r["short_code"] for r in stack.client.get("/urls").json()}


def test_api_key_scopes_and_revocation(stack):
    code = shorten(stack)
    stack.client.headers.pop("X-API-Key")
    assert (
        stack.client.post(
            "/shorten", json={"long_url": "https://example.com/"}
        ).status_code
        == 401
    )
    assert (
        stack.client.get(
            "/analytics/" + code, headers={"X-API-Key": "invalid"}
        ).status_code
        == 401
    )
    read = {"X-API-Key": stack.keys["read"]}
    write = {"X-API-Key": stack.keys["write"]}
    assert stack.client.get("/urls", headers=read).status_code == 200
    assert (
        stack.client.post(
            "/shorten", headers=read, json={"long_url": "https://example.com/"}
        ).status_code
        == 403
    )
    assert stack.client.get("/admin/activity/" + code, headers=read).status_code == 403
    assert stack.client.get("/analytics/" + code, headers=write).status_code == 403
    assert stack.client.get("/" + code, follow_redirects=False).status_code == 307
    from app.models.api_key import APIKey
    from app.services.api_keys import revoke_key

    with stack.db() as db:
        row = db.query(APIKey).filter_by(name="read").one()
        revoke_key(db, row.id)
    assert stack.client.get("/urls", headers=read).status_code == 401


def test_real_lua_atomic_burst_refill_and_isolation(stack):
    from app.middleware.rate_limiter import check_bucket

    def attempt(_):
        return check_bucket("/shorten", "key:one", 5, 0.01).allowed

    with ThreadPoolExecutor(max_workers=12) as executor:
        results = list(executor.map(attempt, range(20)))
    assert sum(results) == 5
    assert check_bucket("/shorten", "key:two", 5, 0.01).allowed
    assert check_bucket("/other", "key:one", 5, 0.01).allowed
    assert check_bucket("/refill", "key:one", 1, 10).allowed
    wait_for(lambda: check_bucket("/refill", "key:one", 1, 10).allowed, timeout=2)


def test_http_rate_limit_headers_and_actual_signals(stack, monkeypatch):
    monkeypatch.setattr(settings, "WRITE_RATE_CAPACITY", 1)
    monkeypatch.setattr(settings, "WRITE_RATE_REFILL", 0.001)
    code = shorten(stack)
    response = stack.client.post("/shorten", json={"long_url": "https://example.com/"})
    assert response.status_code == 429
    assert int(response.headers["Retry-After"]) > 0
    assert response.headers["RateLimit-Remaining"] == "0"
    assert not stack.redis.keys("activity:429:*")  # /shorten has no attributable code
    monkeypatch.setattr(settings, "REDIRECT_RATE_CAPACITY", 1)
    monkeypatch.setattr(settings, "REDIRECT_RATE_REFILL", 0.001)
    assert stack.client.get("/" + code, follow_redirects=False).status_code == 307
    assert stack.client.get("/" + code, follow_redirects=False).status_code == 429
    keys = stack.redis.keys("activity:429:" + code + ":*")
    assert len(keys) == 1 and int(stack.redis.get(keys[0])) == 1
    assert 0 < stack.redis.ttl(keys[0]) <= 3660


def test_duplicates_one_row_and_commit_before_ack(stack, monkeypatch):
    code = shorten(stack)
    event = ClickEvent(short_code=code)
    consumer = RedisStreamsEventBus()
    original_ack = consumer.ack
    acknowledged = []

    def verify_commit(messages):
        # Query through a separate PostgreSQL connection before real XACK.
        assert count(stack, code) == 1
        original_ack(messages)
        acknowledged.append(True)

    monkeypatch.setattr(consumer, "ack", verify_commit)
    stack.run_worker(
        AnalyticsWorker(
            consumer, stack.db(), batch_size=100, flush_interval=0.15, backoff=0.01
        )
    )
    bus = RedisStreamsEventBus()
    try:
        bus.publish(settings.EVENT_TOPIC, event)
        bus.publish(settings.EVENT_TOPIC, event)
        wait_for(lambda: count(stack, code) == 1)
        wait_for(
            lambda: stack.redis.xpending(
                settings.EVENT_TOPIC, settings.EVENT_CONSUMER_GROUP
            )["pending"]
            == 0
        )
        wait_for(lambda: bool(acknowledged))
        assert stack.redis.xlen(settings.EVENT_TOPIC) == 2
        assert count(stack, code) == 1
    finally:
        bus.close()


def test_poison_reaches_dlq_after_three_attempts(stack, analytics_worker):
    # Real wire bytes, not a Pydantic object that would reject before publishing.
    stack.redis.xadd(settings.EVENT_TOPIC, {"event": "not-json"})
    wait_for(lambda: stack.redis.xlen(settings.EVENT_DLQ_TOPIC) == 1)
    raw = stack.redis.xrange(settings.EVENT_DLQ_TOPIC)[0][1]["event"]
    event = DeadLetter.model_validate_json(raw)
    assert event.attempts == 3
    assert base64.b64decode(event.payload_base64) == b"not-json"
    wait_for(
        lambda: stack.redis.xpending(
            settings.EVENT_TOPIC, settings.EVENT_CONSUMER_GROUP
        )["pending"]
        == 0
    )


def test_pending_message_recovered_by_another_consumer(stack):
    code = shorten(stack)
    first = RedisStreamsEventBus()
    second = RedisStreamsEventBus()
    try:
        first.subscribe(settings.EVENT_TOPIC, settings.EVENT_CONSUMER_GROUP)
        first.publish(settings.EVENT_TOPIC, ClickEvent(short_code=code))
        messages = first.poll(0.1, 1)
        assert len(messages) == 1
        second.subscribe(settings.EVENT_TOPIC, settings.EVENT_CONSUMER_GROUP)
        recovered = wait_for(lambda: second.poll(0.05, 1))
        assert recovered[0].receipt == messages[0].receipt
        worker = AnalyticsWorker(second, stack.db(), backoff=0.001)
        try:
            worker.buffer = recovered
            worker.flush()
            assert count(stack, code) == 1
            assert second.lag()["pending"] == 0
        finally:
            worker.db.close()
    finally:
        first.close()
        second.close()


def test_worker_shutdown_flushes_batch(stack):
    code = shorten(stack)
    bus = RedisStreamsEventBus()
    worker = stack.run_worker(
        AnalyticsWorker(
            bus, stack.db(), batch_size=100, flush_interval=60, backoff=0.01
        )
    )
    writer = RedisStreamsEventBus()
    try:
        writer.publish(settings.EVENT_TOPIC, ClickEvent(short_code=code))
        wait_for(lambda: len(worker.buffer) == 1)
        assert count(stack, code) == 0
        worker.stop.set()
        wait_for(lambda: count(stack, code) == 1)
    finally:
        writer.close()


def test_stopped_redis_redirect_falls_back_postgres(stack):
    code = shorten(stack)
    assert stack.client.get("/" + code, follow_redirects=False).status_code == 307
    # Stop ONLY this test's container, never the developer's Compose Redis.
    stack.redis_service.get_wrapped_container().stop(timeout=1)
    started = time.monotonic()
    for _ in range(3):
        response = stack.client.get("/" + code, follow_redirects=False)
        assert response.status_code == 307
    assert time.monotonic() - started < 4
    health = stack.client.get("/health")
    assert health.status_code == 503 and health.json()["redis"] == "unreachable"
    assert stack.client.get("/livez").status_code == 200
    assert (
        stack.client.post(
            "/shorten", json={"long_url": "https://example.com/"}
        ).status_code
        == 503
    )


def test_abuse_outbox_worker_review_enforcement_with_fake(stack):
    from app.abuse.classifier import Classifier
    from app.llm.limits import Limits
    from app.llm.providers import FakeProvider
    from app.workers.abuse_worker import AbuseWorker

    provider = FakeProvider(
        '{"verdict":"malicious","confidence":0.95,"reasons":["credential_path"]}',
        limits=Limits(1, 10),
    )
    stack.run_worker(
        AbuseWorker(
            RedisStreamsEventBus(), stack.db(), Classifier(factory=lambda: provider)
        )
    )
    code = shorten(stack, long_url="https://example.com/login")

    def classified():
        with stack.db() as db:
            return db.query(URLVerdict).filter_by(short_code=code).count() == 1

    wait_for(classified)
    assert provider.limits.used == 1
    assert stack.client.get("/" + code, follow_redirects=False).status_code == 451
    assert stack.redis.get(code) is None
    flagged = stack.client.get("/admin/flagged").json()
    assert any(row["short_code"] == code for row in flagged)
    assert (
        stack.client.post(
            "/admin/flagged/" + code + "/review", json={"decision": "allow"}
        ).status_code
        == 204
    )
    assert stack.client.get("/" + code, follow_redirects=False).status_code == 307
    assert (
        stack.client.post(
            "/admin/flagged/" + code + "/review", json={"decision": "block"}
        ).status_code
        == 204
    )
    assert stack.redis.get(code) is None
    assert stack.client.get("/" + code, follow_redirects=False).status_code == 451

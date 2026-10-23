"""Delivery contracts: durable effects precede acknowledgements, redirects never wait."""

import base64
import json
import time
from threading import Event, Thread
from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient
from redis.exceptions import ResponseError
from sqlalchemy import select
from sqlalchemy.exc import OperationalError

from app.core.config import settings
from app.events.base import Delivery
from app.events.memory import InMemoryEventBus
from app.events.models import ClickEvent, DeadLetter
from app.events.publisher import BackgroundPublisher
from app.models.analytics import Analytics
from app.models.url import URL
from app.observability.metrics import events_dropped_total, events_failed_total
from app.repositories.analytics_repository import AnalyticsRepository
from app.workers.analytics_worker import AnalyticsWorker


@pytest.fixture
def bus():
    bus = InMemoryEventBus()
    bus.subscribe(settings.EVENT_TOPIC, settings.EVENT_CONSUMER_GROUP)
    return bus


def buffer(worker, bus, *events):
    for event in events:
        if isinstance(event, bytes):
            bus.inject(settings.EVENT_TOPIC, event)
        else:
            bus.publish(settings.EVENT_TOPIC, event)
    worker.buffer.extend(bus.poll(0, 100))


def test_duplicate_delivery_one_row_and_commit_before_ack(db_session, bus, monkeypatch):
    db_session.add(URL(short_code="abc123", long_url="https://example.com"))
    db_session.commit()
    order = []
    commit, ack = db_session.commit, bus.ack
    monkeypatch.setattr(
        db_session, "commit", lambda: (commit(), order.append("commit"))
    )
    monkeypatch.setattr(
        bus, "ack", lambda messages: (order.append("ack"), ack(messages))
    )
    worker = AnalyticsWorker(bus, db_session, backoff=0.001)
    event = ClickEvent(short_code="abc123")
    buffer(worker, bus, event, event)
    worker.flush()
    rows = db_session.scalars(select(Analytics)).all()
    assert len(rows) == 1
    assert rows[0].event_id == str(event.event_id)
    assert order == ["commit", "ack"]
    assert len(bus.acked) == 2


@pytest.mark.parametrize(
    "payload", [b"{broken", b'{"schema_version":99,"short_code":"abc123"}']
)
def test_malformed_or_unknown_version_dlq_after_three_attempts(
    db_session, bus, payload, monkeypatch
):
    sleeps = []
    monkeypatch.setattr("app.workers.analytics_worker.time.sleep", sleeps.append)
    worker = AnalyticsWorker(bus, db_session, backoff=0.01)
    before = events_failed_total._value.get()
    buffer(worker, bus, payload)
    worker.flush()
    dead = DeadLetter.model_validate_json(
        bus.messages[settings.EVENT_DLQ_TOPIC][0].payload
    )
    assert base64.b64decode(dead.payload_base64) == payload
    assert dead.attempts == 3
    assert dead.error == "ValidationError"
    assert events_failed_total._value.get() - before == 3
    assert sleeps == [0.01, 0.02]
    assert len(bus.acked) == 1


def test_poison_row_does_not_discard_healthy_batch_rows(db_session, bus):
    repository = Mock(spec=AnalyticsRepository)
    repository.create_event.side_effect = [ValueError("poison")] * 3 + [None]
    worker = AnalyticsWorker(bus, db_session, repository=repository, backoff=0.001)
    buffer(worker, bus, ClickEvent(short_code="bad"), ClickEvent(short_code="good"))
    worker.flush()
    assert repository.create_event.call_count == 4
    assert len(bus.messages[settings.EVENT_DLQ_TOPIC]) == 1
    assert len(bus.acked) == 2


def test_database_error_never_acknowledges_or_deadletters(db_session, bus):
    repository = Mock(spec=AnalyticsRepository)
    repository.create_event.side_effect = OperationalError(
        "insert", {}, Exception("offline")
    )
    worker = AnalyticsWorker(bus, db_session, repository=repository, backoff=0.001)
    buffer(worker, bus, ClickEvent(short_code="abc123"))
    for _ in range(3):
        with pytest.raises(OperationalError):
            worker.flush()
    assert worker.buffer
    assert not bus.acked
    assert not bus.messages[settings.EVENT_DLQ_TOPIC]


def test_commit_failure_does_not_ack(db_session, bus, monkeypatch):
    worker = AnalyticsWorker(bus, db_session, repository=Mock(), backoff=0.001)
    buffer(worker, bus, ClickEvent(short_code="abc123"))
    monkeypatch.setattr(
        db_session, "commit", Mock(side_effect=RuntimeError("commit failed"))
    )
    with pytest.raises(RuntimeError, match="commit failed"):
        worker.flush()
    assert not bus.acked
    assert len(worker.buffer) == 1


def test_dlq_publish_failure_does_not_advance_offset(db_session, bus, monkeypatch):
    worker = AnalyticsWorker(bus, db_session, repository=Mock(), backoff=0.001)
    buffer(worker, bus, ClickEvent(short_code="abc123"), b"bad")
    publish = bus.publish
    monkeypatch.setattr(
        bus, "publish", Mock(side_effect=ConnectionError("broker offline"))
    )
    with pytest.raises(ConnectionError):
        worker.flush()
    assert not bus.acked  # includes healthy row before the poison event
    assert len(worker.buffer) == 2
    monkeypatch.setattr(bus, "publish", publish)
    worker.flush()
    assert len(bus.acked) == 2


@pytest.mark.parametrize("shutdown", [False, True])
def test_idle_timer_and_shutdown_flush(db_session, bus, shutdown):
    worker = AnalyticsWorker(
        bus,
        db_session,
        repository=Mock(),
        batch_size=100,
        flush_interval=0.03 if not shutdown else 100,
        backoff=0.001,
    )
    bus.publish(settings.EVENT_TOPIC, ClickEvent(short_code="abc123"))
    ack = bus.ack
    bus.ack = lambda messages: (ack(messages), worker.stop.set())
    poll = bus.poll

    def polling(timeout, limit):
        result = poll(timeout, limit)
        if shutdown and result:
            worker.stop.set()
        return result

    bus.poll = polling
    thread = Thread(target=worker.run)
    thread.start()
    thread.join(1)
    if thread.is_alive():
        worker.stop.set()
        thread.join(1)
        pytest.fail("Idle timer did not flush within one second")
    assert len(bus.acked) == 1
    assert not worker.buffer


def test_slow_broker_and_full_queue_do_not_block_redirects(db_session, monkeypatch):
    import app.main as main
    import app.events.publisher as module
    from app.db.database import get_db

    entered, release = Event(), Event()
    slow = Mock()

    def publish(*args):
        entered.set()
        release.wait(2)
        raise ConnectionError("broker offline")

    slow.publish.side_effect = publish
    publisher = BackgroundPublisher(lambda: slow, capacity=1)
    monkeypatch.setattr(module, "publisher", publisher)
    monkeypatch.setattr(main, "publisher", publisher)
    monkeypatch.setattr(main, "init_tracing", Mock())
    monkeypatch.setattr(main, "configure_logging_with_tracing", Mock())
    db_session.add(URL(short_code="abc123", long_url="https://example.com"))
    db_session.commit()
    before = events_dropped_total._value.get()
    previous = main.app.dependency_overrides.copy()
    main.app.dependency_overrides[get_db] = lambda: db_session
    try:
        with TestClient(main.app) as client:
            assert client.get("/abc123", follow_redirects=False).status_code == 307
            assert entered.wait(1)
            started = time.monotonic()
            for _ in range(5):
                assert client.get("/abc123", follow_redirects=False).status_code == 307
            assert time.monotonic() - started < 0.3  # broker is still blocked
            assert events_dropped_total._value.get() - before >= 4
            release.set()
    finally:
        release.set()
        publisher.close()
        main.app.dependency_overrides = previous
    assert events_dropped_total._value.get() - before >= 5


def test_kafka_raw_poll_and_explicit_offsets(monkeypatch):
    from kafka.structs import TopicPartition
    import app.events.kafka as module
    import app.kafka.consumer as consumer_module

    constructor = Mock()
    monkeypatch.setattr(consumer_module, "KafkaConsumer", constructor)
    consumer_module.create_consumer("clicks", "analytics")
    assert constructor.call_args.kwargs["enable_auto_commit"] is False
    assert "value_deserializer" not in constructor.call_args.kwargs
    consumer = Mock()
    monkeypatch.setattr(module, "create_consumer", lambda *args: consumer)
    adapter = module.KafkaEventBus()
    adapter.subscribe("clicks", "analytics")
    consumer.poll.return_value = {
        0: [Mock(topic="clicks", value=b"invalid-json", offset=7, partition=2)]
    }
    messages = adapter.poll(0.01, 10)
    consumer.commit.assert_not_called()
    assert messages[0].payload == b"invalid-json"
    adapter.ack(messages)
    assert (
        consumer.commit.call_args.kwargs["offsets"][TopicPartition("clicks", 2)].offset
        == 8
    )
    adapter.close()
    consumer.close.assert_called_once_with(autocommit=False, timeout_ms=5000)


def test_redis_groups_recover_pending_before_new_reads():
    from app.events.redis_streams import RedisStreamsEventBus

    client = Mock()
    client.xgroup_create.side_effect = ResponseError("BUSYGROUP Consumer Group exists")
    client.xautoclaim.return_value = [b"1-1", [(b"1-0", {b"event": b"broken"})], []]
    adapter = RedisStreamsEventBus(client)
    adapter.subscribe("clicks", "analytics")
    messages = adapter.poll(0.01, 10)
    assert messages == [Delivery("clicks", b"broken", "1-0")]
    client.xack.assert_not_called()
    client.xreadgroup.assert_not_called()
    adapter.ack(messages)
    client.xack.assert_called_once_with("clicks", "analytics", "1-0")
    client.xautoclaim.return_value = [b"0-0", [], []]
    client.xreadgroup.return_value = [(b"clicks", [(b"2-0", {b"event": b"new"})])]
    assert adapter.poll(0.01, 10)[0].payload == b"new"
    assert client.xautoclaim.call_args.kwargs["start_id"] == "1-1"
    adapter.publish("clicks", ClickEvent(short_code="abc123"))
    client.xadd.assert_called_once()


def test_memory_groups_and_unacknowledged_recovery(bus):
    bus.publish(settings.EVENT_TOPIC, ClickEvent(short_code="abc123"))
    first = bus.poll(0, 1)
    bus.subscribe(settings.EVENT_TOPIC, settings.EVENT_CONSUMER_GROUP)
    assert bus.poll(0, 1) == first
    bus.ack(first)
    bus.subscribe(settings.EVENT_TOPIC, "other")
    assert bus.poll(0, 1) == first


def test_dlq_list_and_replay_preserve_event_id(bus, capsys):
    from app.cli import dead_letters

    event = ClickEvent(short_code="abc123")
    bus.publish(
        settings.EVENT_DLQ_TOPIC,
        DeadLetter(
            source_topic=settings.EVENT_TOPIC,
            payload_base64=base64.b64encode(event.model_dump_json().encode()).decode(),
            error="IntegrityError",
        ),
    )
    assert dead_letters(bus, "list", 1) == 1
    assert json.loads(capsys.readouterr().out)["error"] == "IntegrityError"
    assert dead_letters(bus, "replay", 1) == 1
    replay = ClickEvent.model_validate_json(
        bus.messages[settings.EVENT_TOPIC][0].payload
    )
    assert replay.event_id == event.event_id


@pytest.mark.parametrize(
    "backend,classname",
    [
        ("memory", "InMemoryEventBus"),
        ("kafka", "KafkaEventBus"),
        ("redis_streams", "RedisStreamsEventBus"),
    ],
)
def test_adapter_selection_without_connecting(monkeypatch, backend, classname):
    from app.events import create_event_bus

    monkeypatch.setattr(settings, "EVENT_BUS", backend)
    assert type(create_event_bus()).__name__ == classname


@pytest.mark.docker
def test_postgres_duplicate_after_ack_failure(postgres):
    from sqlalchemy.orm import Session
    from app.models.url import Base

    Base.metadata.create_all(postgres)
    bus = InMemoryEventBus()
    bus.subscribe(settings.EVENT_TOPIC, settings.EVENT_CONSUMER_GROUP)
    with Session(postgres) as db:
        db.add(URL(short_code="abc123", long_url="https://example.com"))
        db.commit()
        worker = AnalyticsWorker(bus, db, backoff=0.001)
        buffer(worker, bus, ClickEvent(short_code="abc123"))
        ack = bus.ack
        bus.ack = Mock(side_effect=ConnectionError("ack lost"))
        with pytest.raises(ConnectionError):
            worker.flush()
        assert len(db.scalars(select(Analytics)).all()) == 1
        bus.ack = ack
        worker.flush()
        assert len(db.scalars(select(Analytics)).all()) == 1
        assert len(bus.acked) == 1


@pytest.fixture
def real_redis(monkeypatch):
    import os
    import subprocess
    from uuid import uuid4
    from redis import Redis
    from redis.exceptions import ConnectionError as RedisConnectionError

    if os.environ.get("RUN_DOCKER_TESTS") != "1":
        pytest.skip("Requires Docker: RUN_DOCKER_TESTS=1")
    name = "url-events-redis-" + uuid4().hex[:12]
    subprocess.run(
        [
            "docker",
            "run",
            "--rm",
            "-d",
            "--name",
            name,
            "-p",
            "127.0.0.1::6379",
            "redis:7.4.9-alpine",
        ],
        check=True,
        capture_output=True,
    )
    try:
        port = (
            subprocess.check_output(["docker", "port", name, "6379/tcp"], text=True)
            .strip()
            .rsplit(":", 1)[1]
        )
        url = "redis://127.0.0.1:" + port + "/0"
        client = Redis.from_url(url)
        for _ in range(100):
            try:
                if client.ping():
                    break
            except RedisConnectionError:
                time.sleep(0.05)
        else:
            pytest.fail("Disposable Redis did not start")
        monkeypatch.setattr(settings, "REDIS_URL", url)
        yield client
        client.close()
    finally:
        subprocess.run(["docker", "rm", "-f", name], check=True, capture_output=True)


@pytest.mark.docker
def test_real_redis_pending_recovery_and_ack(real_redis, monkeypatch):
    from app.events.redis_streams import RedisStreamsEventBus

    monkeypatch.setattr(settings, "EVENT_CLAIM_IDLE_MS", 1)
    first, recovered = RedisStreamsEventBus(), RedisStreamsEventBus()
    try:
        first.subscribe("clicks", "analytics")
        event = ClickEvent(short_code="abc123")
        first.publish("clicks", event)
        original = first.poll(0.01, 1)
        assert len(original) == 1
        assert first.lag() == {"pending": 1, "stream_length": 1}
        time.sleep(0.01)
        recovered.subscribe("clicks", "analytics")
        messages = recovered.poll(0.01, 1)
        assert messages == original
        recovered.ack(messages)
        assert recovered.lag()["pending"] == 0
        assert not recovered.poll(0.01, 1)
    finally:
        first.close()
        recovered.close()


def test_legacy_event_without_id_goes_to_dlq(db_session, bus):
    worker = AnalyticsWorker(bus, db_session, backoff=0.001)
    buffer(worker, bus, b'{"short_code":"abc123"}')
    worker.flush()
    assert len(bus.messages[settings.EVENT_DLQ_TOPIC]) == 1
    assert not db_session.scalars(select(Analytics)).all()


def test_memory_recovers_more_than_one_batch(bus):
    for _ in range(3):
        bus.publish(settings.EVENT_TOPIC, ClickEvent(short_code="abc123"))
    messages = bus.poll(0, 3)
    bus.subscribe(settings.EVENT_TOPIC, settings.EVENT_CONSUMER_GROUP)
    assert [bus.poll(0, 1)[0] for _ in range(3)] == messages


@pytest.mark.docker
def test_real_kafka_delivery_commit_and_dlq(db_session, monkeypatch):
    import os
    import socket
    import subprocess
    from uuid import uuid4
    from kafka import KafkaAdminClient
    from kafka.errors import KafkaError
    from app.events.kafka import KafkaEventBus

    if os.environ.get("RUN_DOCKER_TESTS") != "1":
        pytest.skip("Requires Docker: RUN_DOCKER_TESTS=1")
    name = "url-events-kafka-" + uuid4().hex[:12]
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    environment = {
        "CLUSTER_ID": "q1Sh-9_ISia_zwGINzRvyQ",
        "KAFKA_NODE_ID": "1",
        "KAFKA_PROCESS_ROLES": "broker,controller",
        "KAFKA_CONTROLLER_QUORUM_VOTERS": "1@localhost:29093",
        "KAFKA_LISTENERS": "PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:29093",
        "KAFKA_ADVERTISED_LISTENERS": f"PLAINTEXT://127.0.0.1:{port}",
        "KAFKA_LISTENER_SECURITY_PROTOCOL_MAP": "PLAINTEXT:PLAINTEXT,CONTROLLER:PLAINTEXT",
        "KAFKA_CONTROLLER_LISTENER_NAMES": "CONTROLLER",
        "KAFKA_INTER_BROKER_LISTENER_NAME": "PLAINTEXT",
        "KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR": "1",
        "KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS": "0",
    }
    command = [
        "docker",
        "run",
        "--rm",
        "-d",
        "--name",
        name,
        "-p",
        f"127.0.0.1:{port}:9092",
    ]
    for key, value in environment.items():
        command.extend(["-e", key + "=" + value])
    command.append("confluentinc/cp-kafka:8.3.0")
    subprocess.run(command, check=True, capture_output=True)
    adapter = KafkaEventBus()
    try:
        monkeypatch.setattr(settings, "KAFKA_BOOTSTRAP_SERVERS", f"127.0.0.1:{port}")
        deadline = time.monotonic() + 45
        while time.monotonic() < deadline:
            try:
                admin = KafkaAdminClient(
                    bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
                    api_version_auto_timeout_ms=1000,
                    request_timeout_ms=2000,
                )
                admin.close()
                break
            except KafkaError:
                time.sleep(0.25)
        else:
            pytest.fail("Disposable Kafka did not start in 45 seconds")
        event = ClickEvent(short_code="abc123")
        adapter.publish(settings.EVENT_TOPIC, event)
        adapter.publish(settings.EVENT_TOPIC, event)
        adapter.producer.send(settings.EVENT_TOPIC, b"malformed").get(timeout=5)
        adapter.subscribe(settings.EVENT_TOPIC, settings.EVENT_CONSUMER_GROUP)
        db_session.add(URL(short_code="abc123", long_url="https://example.com"))
        db_session.commit()
        worker = AnalyticsWorker(adapter, db_session, backoff=0.001)
        deadline = time.monotonic() + 10
        while len(worker.buffer) < 3 and time.monotonic() < deadline:
            worker.buffer.extend(adapter.poll(0.2, 3 - len(worker.buffer)))
        assert len(worker.buffer) == 3
        worker.flush()
        assert len(db_session.scalars(select(Analytics)).all()) == 1
        assert adapter.lag() == {"uncommitted": 0}
        adapter.close()
        adapter = KafkaEventBus()
        adapter.subscribe(settings.EVENT_DLQ_TOPIC, "dlq-test")
        messages = []
        deadline = time.monotonic() + 10
        while not messages and time.monotonic() < deadline:
            messages = adapter.poll(0.2, 1)
        assert len(messages) == 1
        assert DeadLetter.model_validate_json(messages[0].payload).attempts == 3
        adapter.ack(messages)
    finally:
        adapter.close()
        subprocess.run(["docker", "rm", "-f", name], check=True, capture_output=True)


def test_idle_timer_flushes_even_when_later_polls_fail(db_session, bus):
    worker = AnalyticsWorker(
        bus,
        db_session,
        repository=Mock(),
        batch_size=100,
        flush_interval=0.01,
        backoff=0.001,
    )
    bus.publish(settings.EVENT_TOPIC, ClickEvent(short_code="abc123"))
    poll, ack = bus.poll, bus.ack
    calls = 0

    def failing_poll(timeout, limit):
        nonlocal calls
        calls += 1
        if calls > 1:
            raise ConnectionError("broker offline")
        return poll(timeout, limit)

    bus.poll = failing_poll
    bus.ack = lambda messages: (ack(messages), worker.stop.set())
    thread = Thread(target=worker.run)
    thread.start()
    thread.join(1)
    if thread.is_alive():
        worker.stop.set()
        thread.join(1)
        pytest.fail("Broker outage stranded an idle batch")
    assert len(bus.acked) == 1

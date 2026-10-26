"""Optional real Kafka adapter/consumer and PostgreSQL transaction contract."""

from uuid import uuid4

import pytest

from app.core.config import settings
from app.events.kafka import KafkaEventBus
from app.events.models import ClickEvent
from app.models.analytics import Analytics
from app.models.url import URL
from app.workers.analytics_worker import AnalyticsWorker

from .conftest import wait_for

pytestmark = [pytest.mark.integration, pytest.mark.slow]


def test_kafka_consumer_commits_only_after_database(
    database, kafka_service, monkeypatch
):
    monkeypatch.setattr(
        settings, "KAFKA_BOOTSTRAP_SERVERS", kafka_service.get_bootstrap_server()
    )
    topic = "integration-" + uuid4().hex
    group = "integration-" + uuid4().hex
    with database() as db:
        db.add(URL(short_code="kafka01", long_url="https://example.com/"))
        db.commit()
    bus = KafkaEventBus()
    worker = AnalyticsWorker(bus, database(), backoff=0.01)
    try:
        event = ClickEvent(short_code="kafka01")
        bus.publish(topic, event)
        bus.publish(topic, event)
        bus.subscribe(topic, group)
        assert bus.consumer.config["enable_auto_commit"] is False

        def receive():
            worker.buffer.extend(bus.poll(0.2, 10))
            return len(worker.buffer) == 2

        wait_for(receive, timeout=30)
        assert bus.lag()["uncommitted"] == 2
        original_ack = bus.ack

        def verify_commit(messages):
            # A separate connection can see the row only AFTER COMMIT.
            with database() as db:
                assert (
                    db.query(Analytics).filter_by(event_id=str(event.event_id)).count()
                    == 1
                )
            original_ack(messages)

        bus.ack = verify_commit
        worker.flush()
        assert bus.lag()["uncommitted"] == 0
    finally:
        worker.db.close()
        bus.close()

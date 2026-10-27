"""Metric semantics and parity of the two automatically provisioned stacks."""

import json
from pathlib import Path
from unittest.mock import Mock

import yaml
from kafka.structs import TopicPartition
from prometheus_client import REGISTRY

from app.core.config import settings
from app.events.kafka import KafkaEventBus
from app.events.memory import InMemoryEventBus
from app.events.models import ClickEvent
from app.events.redis_streams import RedisStreamsEventBus
from app.workers.analytics_worker import AnalyticsWorker
from test_app_assembly import client  # Reuse the real assembled-app fixture.

ROOT = Path(__file__).resolve().parents[1]


def test_redis_lag_excludes_acknowledged_history_and_reports_retained_dlq():
    redis = Mock()
    redis.xpending.return_value = {"pending": 3}
    redis.xlen.return_value = 10000
    redis.xinfo_groups.return_value = [{"name": b"group", "lag": 7}]
    bus = RedisStreamsEventBus(redis)
    bus.topic, bus.group = "clicks", "group"
    assert bus.lag() == {"stream_length": 10000, "pending": 3, "unread": 7}
    assert bus.queue_size("dead") == 10000
    redis.xlen.assert_called_with("dead")


def test_unknown_redis_lag_does_not_look_healthy():
    import math

    redis = Mock()
    redis.xpending.return_value = {"pending": 0}
    redis.xlen.return_value = 100
    redis.xinfo_groups.return_value = [{"name": b"group", "lag": None}]
    bus = RedisStreamsEventBus(redis)
    bus.topic, bus.group = "clicks", "group"
    assert math.isnan(bus.lag()["unread"])


def test_kafka_retained_dlq_size_accounts_for_retention():
    bus = KafkaEventBus()
    bus.consumer = Mock()
    bus.consumer.partitions_for_topic.return_value = {0, 1}
    partitions = [TopicPartition("dead", i) for i in [0, 1]]
    bus.consumer.beginning_offsets.return_value = dict(zip(partitions, [100, 50]))
    bus.consumer.end_offsets.return_value = dict(zip(partitions, [120, 55]))
    assert bus.queue_size("dead") == 25
    bus.consumer.commit.assert_not_called()


def test_worker_exports_current_dlq_size(db_session):
    bus = InMemoryEventBus()
    bus.publish(settings.EVENT_DLQ_TOPIC, ClickEvent(short_code="sample"))
    worker = AnalyticsWorker(bus, db_session)
    original = bus.queue_size

    def size(topic):
        result = original(topic)
        worker.stop.set()
        return result

    bus.queue_size = size
    worker.run()
    assert (
        REGISTRY.get_sample_value("dlq_queue_size", {"backend": settings.EVENT_BUS})
        == 1
    )
    assert (
        REGISTRY.get_sample_value(
            "analytics_broker_metrics_last_success_timestamp_seconds"
        )
        > 0
    )


def test_provisioned_configmaps_match_canonical_sources():
    rulemap = yaml.safe_load((ROOT / "k8s/base/prometheus/rules-configmap.yaml").read_text())
    assert rulemap["data"]["slo.yml"] == (ROOT / "prometheus/rules/slo.yml").read_text()
    docs = list(yaml.safe_load_all((ROOT / "k8s/base/grafana/deployment.yaml").read_text()))
    dashboard = next(
        d for d in docs if d["metadata"]["name"] == "grafana-dashboard-json"
    )
    canonical = json.loads(
        (ROOT / "grafana/dashboards/url-shortener-dashboard.json").read_text()
    )
    assert "dashboard" not in canonical  # File provisioning requires a raw dashboard.
    assert json.loads(dashboard["data"]["url-shortener-dashboard.json"]) == canonical
    assert len([p for p in canonical["panels"] if p["id"] >= 100]) == 5
    config = next(
        d
        for d in yaml.safe_load_all(
            (ROOT / "k8s/base/prometheus/deployment.yaml").read_text()
        )
        if d["kind"] == "ConfigMap"
    )
    parsed = yaml.safe_load(config["data"]["prometheus.yml"])
    assert parsed["rule_files"] == ["/etc/prometheus/rules/*.yml"]
    assert all("dns_sd_configs" in j for j in parsed["scrape_configs"])


def test_redirect_slo_selector_captures_5xx_and_excludes_health(client, monkeypatch):
    import app.api.routes as routes

    labels = {"handler": "/{code}", "method": "GET", "status": "5xx"}
    before = REGISTRY.get_sample_value("http_requests_total", labels) or 0
    monkeypatch.setattr(
        routes.service, "resolve", Mock(side_effect=RuntimeError("offline"))
    )
    monkeypatch.setattr(client._transport, "raise_server_exceptions", False)
    assert client.get("/sample").status_code == 500
    assert REGISTRY.get_sample_value("http_requests_total", labels) == before + 1
    assert client.get("/livez").status_code == 200
    assert REGISTRY.get_sample_value("http_requests_total", labels) == before + 1


def test_new_kafka_group_lag_starts_at_retained_offset():
    bus = KafkaEventBus()
    bus.consumer = Mock()
    partition = TopicPartition("clicks", 0)
    bus.consumer.assignment.return_value = {partition}
    bus.consumer.end_offsets.return_value = {partition: 1000}
    bus.consumer.committed.return_value = None
    bus.consumer.beginning_offsets.return_value = {partition: 900}
    assert bus.lag() == {"uncommitted": 100}


def test_headless_metrics_services_include_unready_replicas():
    for file, name in [
        ("api/deployment.yaml", "api-metrics"),
        ("worker/deployment.yaml", "worker"),
    ]:
        documents = yaml.safe_load_all((ROOT / "k8s/base" / file).read_text())
        service = next(
            d
            for d in documents
            if d["kind"] == "Service" and d["metadata"]["name"] == name
        )
        assert service["spec"]["clusterIP"] == "None"
        assert service["spec"]["publishNotReadyAddresses"] is True


def test_grafana_upgrade_preserves_existing_datasource_identity():
    """An imposed UID breaks provisioning over a legacy generated datasource UID."""
    local = yaml.safe_load(
        (ROOT / "grafana/provisioning/datasources/prometheus.yml").read_text()
    )
    manifests = list(
        yaml.safe_load_all((ROOT / "k8s/base/grafana/deployment.yaml").read_text())
    )
    config = next(
        m for m in manifests if m["metadata"]["name"] == "grafana-datasources"
    )
    kubernetes = yaml.safe_load(config["data"]["prometheus.yaml"])
    for provision in (local, kubernetes):
        datasource = provision["datasources"][0]
        assert datasource["name"] == "Prometheus"
        assert datasource["isDefault"] is True
        assert "uid" not in datasource
        assert "deleteDatasources" not in provision
    dashboard = json.loads(
        (ROOT / "grafana/dashboards/url-shortener-dashboard.json").read_text()
    )
    assert all("datasource" not in panel for panel in dashboard["panels"])

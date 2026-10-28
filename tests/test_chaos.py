import importlib.util
import json
from pathlib import Path

import pytest

spec = importlib.util.spec_from_file_location("chaos_run", "scripts/chaos/run.py")
chaos = importlib.util.module_from_spec(spec)
spec.loader.exec_module(chaos)


def test_explicit_latency_success_and_sample_thresholds():
    rows = [
        {"phase": phase, "status": 307, "latency_ms": 20}
        for phase in ("before", "during", "after")
        for _ in range(40)
    ]
    assert chaos.expectations(chaos.summarize(rows))
    rows[40]["status"] = 503
    assert not chaos.expectations(chaos.summarize(rows))
    rows[40]["status"] = 307
    rows[40]["latency_ms"] = 3000
    assert not chaos.expectations(chaos.summarize(rows))
    assert not chaos.expectations(chaos.summarize([]))


@pytest.mark.parametrize(
    "delivered,dropped,stable,worker,broker",
    [
        (100, 0, True, True, True),
        (90, 10, True, False, True),
        (90, 0, True, False, False),
        (101, 0, True, False, False),
        (100, 1, True, False, False),
        (100, 0, False, False, False),
    ],
)
def test_event_accounting(delivered, dropped, stable, worker, broker):
    assert chaos.event_policy("worker_down", 100, delivered, dropped, stable) == worker
    assert chaos.event_policy("broker_down", 100, delivered, dropped, stable) == broker


def test_partial_pause_failure_still_restores(monkeypatch):
    monkeypatch.setenv("CHAOS_BACKEND", "compose")
    monkeypatch.setenv("EVENT_BUS", "redis_streams")
    controller = chaos.Controller("broker_down")
    calls = []

    def command(args):
        calls.append(args)
        if args[0] == "pause":
            raise RuntimeError("partial failure")

    monkeypatch.setattr(controller, "command", command)
    with pytest.raises(RuntimeError):
        controller.fault()
    controller.restore()
    assert calls == [["pause", "redis"], ["unpause", "redis"]]
    assert not controller.restore_needed


def test_kind_restores_original_replica_count(monkeypatch):
    monkeypatch.setenv("CHAOS_BACKEND", "kind")
    monkeypatch.setenv("KUBE_CONTEXT", "kind-chaos")
    controller = chaos.Controller("worker_down")
    calls = []

    def command(args):
        calls.append(args)
        return "2" if args[0] == "get" else ""

    monkeypatch.setattr(controller, "command", command)
    controller.preflight()
    controller.fault()
    controller.restore()
    assert ["scale", "deployment/worker", "--replicas=2"] in calls


def test_missing_key_writes_failure_without_fault(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    monkeypatch.delenv("API_KEY", raising=False)
    monkeypatch.setattr(chaos.signal, "signal", lambda *args: None)
    assert chaos.main("redis_down") == 1
    result = json.loads(next(Path("chaos/results").glob("*.json")).read_text())
    assert result["passed"] is False
    assert result["samples"] == []
    assert result["failure_type"] == "ValueError"


def test_drop_counter_uses_internal_metrics_endpoint(monkeypatch):
    monkeypatch.setenv("METRICS_BASE_URL", "http://127.0.0.1:18002")
    calls = []

    def request(path, **kwargs):
        calls.append((path, kwargs))
        return 200, "events_dropped_total 3.0\n"

    monkeypatch.setattr(chaos, "http", request)
    assert chaos.drops() == 3
    assert calls == [("/metrics", {"base_url": "http://127.0.0.1:18002"})]

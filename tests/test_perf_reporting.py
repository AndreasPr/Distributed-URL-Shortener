import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location("run_perf", Path("scripts/run_perf.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def test_report_excludes_setup_and_preserves_failure():
    summary = {
        "metrics": {
            "http_reqs": {"count": 10000},
            "workload_requests": {"count": 100},
            "workload_timestamp": {"min": 1000, "max": 11000},
            "workload_latency": {"med": 2, "p(95)": 5, "p(99)": 9},
            "workload_errors": {"value": 0.02},
            "dropped_iterations": {"count": 3},
        }
    }
    result = module.report(summary, 0.8, 99)
    assert "| Throughput (requests/s) | 10.0 |" in result
    assert "k6 exit status: 99" in result
    assert "| Dropped iterations | 3 |" in result
    assert "| Cache hit ratio (Prometheus last 1m) | 0.8 |" in result


def test_unavailable_metrics_are_not_invented():
    result = module.report({"metrics": {}}, None, 1)
    assert "TBD (unavailable)" in result
    assert "| Throughput (requests/s) | 0" not in result

"""Disposable local performance run. Never prints or persists the generated API key."""

import json
import os
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]


def query(expression):
    url = "http://localhost:19090/api/v1/query?" + urlencode({"query": expression})
    with urlopen(url, timeout=5) as response:
        payload = json.load(response)
    if payload["status"] != "success":
        raise ValueError("Prometheus query failed")
    result = payload["data"]["result"]
    return float(result[0]["value"][1]) if result else None


def report(summary, ratio, status):
    metrics = summary["metrics"]
    latency = metrics.get("workload_latency", {})
    stamps = metrics.get("workload_timestamp", {})
    seconds = (stamps.get("max", 0) - stamps.get("min", 0)) / 1000
    count = metrics.get("workload_requests", {}).get("count", 0)
    throughput = count / seconds if seconds > 0 else None
    values = {
        "Throughput (requests/s)": throughput,
        "p50 (ms)": latency.get("med"),
        "p95 (ms)": latency.get("p(95)"),
        "p99 (ms)": latency.get("p(99)"),
        "Unexpected-status error fraction": metrics.get("workload_errors", {}).get(
            "value"
        ),
        "Cache hit ratio (Prometheus last 1m)": ratio,
        "Dropped iterations": metrics.get("dropped_iterations", {}).get("count", 0),
    }
    lines = [
        "# Local performance result",
        "",
        f"k6 exit status: {status}",
        "",
        "| Metric | Measured value |",
        "|---|---|",
    ]
    for key, value in values.items():
        lines.append(
            f'| {key} | {value if value is not None else "TBD (unavailable)"} |'
        )
    return "\n".join(lines) + "\n"


def main():
    os.chdir(ROOT)
    out = ROOT / "perf/results" / datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out.mkdir(parents=True)
    compose = ["docker", "compose", "-p", "shortener-perf", "-f", "perf/compose.yml"]
    status = 1
    try:
        subprocess.run(compose + ["up", "--build", "-d"], check=True)
        for _ in range(120):
            try:
                with urlopen("http://localhost:18000/health", timeout=2) as response:
                    if response.status == 200:
                        break
            except OSError:
                pass
            time.sleep(1)
        else:
            raise RuntimeError("Performance API did not become healthy")
        key = json.loads(
            subprocess.check_output(
                compose
                + [
                    "exec",
                    "-T",
                    "api",
                    "python",
                    "-m",
                    "app.cli",
                    "keys",
                    "create",
                    "--name",
                    "perf",
                    "--scopes",
                    "read",
                    "write",
                ]
            )
        )
        env = {
            **os.environ,
            "API_KEY": key["key"],
            "BASE_URL": "http://localhost:18000",
        }
        variant = os.environ.get("PERF_VARIANT", "load")
        if variant not in ("load", "stress", "spike"):
            raise ValueError("PERF_VARIANT must be load, stress or spike")
        command = [
            "k6",
            "run",
            "--summary-export",
            str(out / "summary.json"),
            f"scripts/{variant}_test.js",
        ]
        (out / "metadata.json").write_text(
            json.dumps(
                {
                    "variant": variant,
                    "dataset_size": env.get("DATASET_SIZE", "10000"),
                    "duration": env.get("DURATION", "2m"),
                    "rate": env.get("RATE", "100"),
                    "commit": subprocess.check_output(
                        ["git", "rev-parse", "HEAD"], text=True
                    ).strip(),
                    "command": command,
                    "hardware": "TBD: record host and Docker resource limits",
                },
                indent=2,
            )
        )
        with (out / "k6.log").open("w") as log:
            status = subprocess.run(
                command, env=env, stdout=log, stderr=subprocess.STDOUT
            ).returncode
        time.sleep(3)  # allow the final Prometheus scrape
        ratio = None
        try:
            ratio = query(
                "sum(rate(cache_hits_total[1m])) / "
                "(sum(rate(cache_hits_total[1m])) + sum(rate(cache_misses_total[1m])))"
            )
            if ratio is not None and not 0 <= ratio <= 1:
                ratio = None
        except (OSError, ValueError, KeyError):
            pass
        summary = json.loads((out / "summary.json").read_text())
        (out / "report.md").write_text(report(summary, ratio, status))
        print((out / "report.md").read_text())
        print(f"Artifacts: {out}")
    finally:
        cleanup = subprocess.run(
            compose + ["down", "-v", "--remove-orphans"]
        ).returncode
        if cleanup:
            print(
                "Cleanup failed: rerun docker compose -p shortener-perf "
                "-f perf/compose.yml down -v"
            )
            status = status or cleanup
    return status


if __name__ == "__main__":
    raise SystemExit(main())

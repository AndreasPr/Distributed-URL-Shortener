"""Opt-in failure experiments against an already running, isolated local stack."""

import json
import math
import os
import signal
import subprocess
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, Request, build_opener


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def http(path, method="GET", body=None):
    headers = {"X-API-Key": os.environ["API_KEY"]}
    data = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode()
    req = Request(
        os.environ.get("BASE_URL", "http://127.0.0.1:8000") + path,
        data=data,
        headers=headers,
        method=method,
    )
    try:
        with build_opener(NoRedirect).open(req, timeout=2) as response:
            return response.status, response.read().decode()
    except HTTPError as error:
        return error.code, error.read().decode()
    except (URLError, TimeoutError, OSError):
        return 0, ""


def analytics(code):
    status, body = http("/analytics/" + code)
    if status != 200:
        raise RuntimeError(f"Analytics HTTP {status}")
    return json.loads(body)["total_clicks"]


def drops():
    status, body = http("/metrics")
    if status != 200:
        raise RuntimeError(f"Metrics HTTP {status}")
    values = [
        float(line.split()[-1])
        for line in body.splitlines()
        if line.startswith("events_dropped_total ")
        or line.startswith("events_dropped_total{")
    ]
    if not values:
        raise RuntimeError("events_dropped_total missing")
    return sum(values)


def summarize(samples):
    result = {}
    for phase in ("before", "during", "after"):
        rows = [row for row in samples if row["phase"] == phase]
        latencies = sorted(row["latency_ms"] for row in rows)
        good = sum(row["status"] == 307 for row in rows)
        result[phase] = {
            "requests": len(rows),
            "successes": good,
            "error_rate": 1 - good / len(rows) if rows else None,
            "p95_ms": latencies[math.ceil(len(rows) * 0.95) - 1] if rows else None,
            "max_ms": max(latencies) if rows else None,
        }
    return result


def expectations(phases):
    return all(
        p["requests"] >= 10
        and p["error_rate"] < 0.01
        and p["p95_ms"] < 1000
        and p["max_ms"] < 2500
        for p in phases.values()
    )


def event_policy(experiment, successful, delivered, dropped, stable):
    if experiment == "worker_down":
        return delivered == successful and dropped == 0 and stable
    if experiment == "broker_down":
        return (
            0 <= delivered <= successful
            and dropped >= 0
            and delivered + dropped == successful
            and stable
        )
    return True


class Controller:
    def __init__(self, experiment):
        self.experiment = experiment
        self.backend = os.environ.get("CHAOS_BACKEND", "compose")
        bus = os.environ.get("EVENT_BUS", "redis_streams")
        if bus not in ("redis_streams", "kafka"):
            raise ValueError("EVENT_BUS must be redis_streams or kafka")
        self.service = "worker-redis" if bus == "redis_streams" else "worker"
        if experiment != "worker_down":
            self.service = (
                "kafka" if experiment == "broker_down" and bus == "kafka" else "redis"
            )
        self.restore_needed = False
        self.replicas = None
        if self.backend == "kind":
            if experiment != "worker_down":
                raise ValueError(
                    "kind supports worker_down only; "
                    "use Compose for broker/Redis faults"
                )
            context = os.environ.get("KUBE_CONTEXT", "")
            if not context.startswith("kind-"):
                raise ValueError("Set KUBE_CONTEXT explicitly to a kind-* context")
            self.base = ["kubectl", "--context", context, "-n", "url-shortener"]
        elif self.backend == "compose":
            self.base = [
                "docker",
                "compose",
                "--profile",
                "redis-streams" if bus == "redis_streams" else "kafka",
            ]
        else:
            raise ValueError("CHAOS_BACKEND must be compose or kind")

    def command(self, args):
        return subprocess.check_output(
            self.base + args, timeout=150, stderr=subprocess.PIPE, text=True
        )

    def preflight(self):
        if self.backend == "kind":
            self.replicas = int(
                self.command(
                    ["get", "deployment/worker", "-o", "jsonpath={.spec.replicas}"]
                )
            )
            if self.replicas < 1:
                raise RuntimeError("Worker must initially be running")
        else:
            running = self.command(
                ["ps", "--status", "running", "--services"]
            ).splitlines()
            if self.service not in running:
                raise RuntimeError(f"Expected running service: {self.service}")

    def fault(self):
        self.restore_needed = True  # recover even if the command partially fails
        if self.backend == "kind":
            self.command(["scale", "deployment/worker", "--replicas=0"])
            self.command(
                ["wait", "--for=delete", "pod", "-l", "app=worker", "--timeout=120s"]
            )
        else:
            action = "pause" if self.experiment == "broker_down" else "stop"
            self.command([action, self.service])

    def restore(self):
        if not self.restore_needed:
            return
        if self.backend == "kind":
            self.command(["scale", "deployment/worker", f"--replicas={self.replicas}"])
            self.command(["rollout", "status", "deployment/worker", "--timeout=120s"])
        else:
            action = "unpause" if self.experiment == "broker_down" else "start"
            self.command([action, self.service])
        self.restore_needed = False


def main(experiment):
    out = Path("chaos/results")
    out.mkdir(parents=True, exist_ok=True)
    path = out / (
        datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ") + f"-{experiment}.json"
    )
    result = {
        "experiment": experiment,
        "passed": False,
        "expectations": "each phase >=10 samples, success >99%, p95<1000ms, max<2500ms",
        "event_bus": os.environ.get("EVENT_BUS", "redis_streams"),
        "backend": os.environ.get("CHAOS_BACKEND", "compose"),
    }
    samples = []
    stop = threading.Event()
    phase = ["before"]
    thread = None
    controller = None

    def interrupted(signum, frame):
        raise RuntimeError("Interrupted; restoring service")

    signal.signal(signal.SIGTERM, interrupted)
    signal.signal(signal.SIGINT, interrupted)
    try:
        if not os.environ.get("API_KEY"):
            raise ValueError("Set API_KEY to a read/write key")
        result["stage"] = "preflight (API_KEY, services, health)"
        controller = Controller(experiment)
        controller.preflight()
        if http("/health")[0] != 200:
            raise RuntimeError("API must initially be healthy")
        status, body = http(
            "/shorten", "POST", {"long_url": "https://example.com/chaos"}
        )
        if status != 200:
            raise RuntimeError(f"Shorten HTTP {status}")
        code = json.loads(body)["short_code"]
        if analytics(code) != 0:
            raise RuntimeError("Fresh link already has clicks; isolate this run")
        baseline_drops = drops()
        result["short_code"] = code

        def load():
            while not stop.is_set():
                started = time.monotonic()
                label = phase[0]
                status, _ = http("/" + code)
                samples.append(
                    {
                        "phase": label,
                        "status": status,
                        "latency_ms": (time.monotonic() - started) * 1000,
                    }
                )
                stop.wait(max(0, 0.5 - (time.monotonic() - started)))

        result["stage"] = "before load"
        thread = threading.Thread(target=load, daemon=True)
        thread.start()
        time.sleep(20)
        # Control commands may take time; transitions remain in the during phase.
        phase[0] = "during"
        result["stage"] = "inject fault"
        controller.fault()
        time.sleep(20)
        result["stage"] = "restore service"
        controller.restore()
        phase[0] = "after"
        time.sleep(20)
        stop.set()
        thread.join(timeout=5)
        if thread.is_alive():
            raise RuntimeError("Load thread did not stop")
        phases = summarize(samples)
        result["phases"] = phases
        successful = sum(row["status"] == 307 for row in samples)
        # Fixed observation window allows pending batches/retries and late duplicates.
        result["stage"] = "observe analytics recovery"
        observed = []
        for _ in range(30):
            observed.append(analytics(code))
            time.sleep(2)
        delivered = observed[-1]
        lost_metric = drops() - baseline_drops
        result.update(
            successful_redirects=successful,
            analytics_count=delivered,
            events_dropped_delta=lost_metric,
            analytics_observations=observed,
        )
        stable = len(set(observed[-5:])) == 1
        healthy = http("/health")[0] == 200
        policy_ok = event_policy(experiment, successful, delivered, lost_metric, stable)
        result["policy_ok"] = policy_ok
        result["recovered_health"] = healthy
        result["stage"] = "evaluate expectations"
        result["passed"] = expectations(phases) and policy_ok and healthy
    except Exception as error:
        # Exception messages from HTTP/subprocess can contain credentials: type only.
        result["failure_type"] = type(error).__name__
    finally:
        stop.set()
        if thread:
            thread.join(timeout=5)
        if controller:
            try:
                controller.restore()
            except Exception as error:
                result["recovery_error"] = type(error).__name__
                result["passed"] = False
        result["samples"] = samples
        path.write_text(json.dumps(result, indent=2) + "\n")
    print(f'{"PASS" if result["passed"] else "FAIL"}: {experiment}; result={path}')
    return 0 if result["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1]))

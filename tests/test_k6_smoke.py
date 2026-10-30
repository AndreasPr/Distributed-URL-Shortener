"""Exercise the real load gate against deterministic transient/failed responses."""

import json
import os
import shutil
import subprocess
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Lock, Thread

import pytest

ROOT = Path(__file__).resolve().parents[1]


@pytest.mark.skipif(shutil.which("k6") is None, reason="Optional k6 binary required")
def test_load_gate_handles_transients_without_hiding_http_or_latency_failures(tmp_path):
    class Handler(BaseHTTPRequestHandler):
        calls = 0
        mode = "transient"
        lock = Lock()

        def log_message(self, *args):
            pass

        def do_POST(self):
            self.rfile.read(int(self.headers.get("Content-Length", 0)))
            body = b'{"short_code":"sample"}'
            self.send_response(200)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            with self.lock:
                Handler.calls += 1
                call = Handler.calls
            if self.mode == "slow" or (self.mode == "transient" and call <= 4):
                time.sleep(0.83)
            self.send_response(429 if self.mode == "throttle" else 307)
            self.send_header("Location", "https://example.com/")
            self.send_header("Content-Length", "0")
            self.end_headers()

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        for mode, duration in [
            ("transient", "20s"),
            ("throttle", "1s"),
            ("slow", "1s"),
        ]:
            Handler.mode, Handler.calls = mode, 0
            summary = tmp_path / f"{mode}.json"
            result = subprocess.run(
                [
                    "k6",
                    "run",
                    "--summary-export",
                    str(summary),
                    str(ROOT / "scripts/smoke_load_test.js"),
                ],
                env={
                    **os.environ,
                    "BASE_URL": f"http://127.0.0.1:{server.server_port}",
                    "API_KEY": "synthetic-test-placeholder",
                    "DURATION": duration,
                },
                capture_output=True,
                text=True,
                timeout=40,
            )
            metrics = json.loads(summary.read_text())["metrics"]
            if mode == "transient":
                assert result.returncode == 0, result.stdout + result.stderr
                assert metrics.get("dropped_iterations", {}).get("count", 0) == 0
            else:
                assert result.returncode == 99, result.stdout + result.stderr
                if mode == "throttle":
                    assert metrics["http_req_failed{name:redirect}"]["value"] == 1
                else:
                    assert metrics["http_req_duration{name:redirect}"]["p(95)"] >= 500
    finally:
        server.shutdown()
        server.server_close()
        thread.join(2)

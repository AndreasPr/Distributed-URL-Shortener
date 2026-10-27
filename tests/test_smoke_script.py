"""Run the real curl-based smoke script against controlled HTTP responses."""

import json
import os
import subprocess
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

import pytest

ROOT = Path(__file__).resolve().parents[1]


@pytest.mark.parametrize(
    "bad_auth,bad_limit,success",
    [(False, False, True), (True, False, False), (False, True, False)],
)
def test_smoke_checks_auth_and_throttling(bad_auth, bad_limit, success):
    class Handler(BaseHTTPRequestHandler):
        writes = 0

        def log_message(self, *args):
            pass

        def respond(self, status, body, headers=None):
            payload = (
                body.encode() if isinstance(body, str) else json.dumps(body).encode()
            )
            self.send_response(status)
            for key, value in (headers or {}).items():
                self.send_header(key, value)
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)

        def do_GET(self):
            if self.path == "/health":
                self.respond(200, {"db": "reachable", "redis": "reachable"})
            elif self.path == "/metrics":
                self.respond(200, "http_requests_total 1\n")
            elif self.path == "/analytics/sample":
                self.respond(200, {"total_clicks": 1})
            elif self.path == "/sample":
                self.respond(307, "", {"Location": "https://example.com/"})
            else:
                self.respond(404, {})

        def do_POST(self):
            self.rfile.read(int(self.headers.get("Content-Length", 0)))
            if not self.headers.get("X-API-Key"):
                self.respond(200 if bad_auth else 401, {})
            else:
                Handler.writes += 1
                if Handler.writes <= 2:
                    self.respond(200, {"short_code": "sample"})
                else:
                    self.respond(503 if bad_limit else 429, {}, {"Retry-After": "1"})

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        url = f"http://127.0.0.1:{server.server_port}"
        result = subprocess.run(
            ["bash", str(ROOT / "scripts/smoke_test.sh")],
            env=dict(
                os.environ,
                API_KEY="test-only-placeholder",
                BASE_URL=url,
                METRICS_URL=url + "/metrics",
            ),
            capture_output=True,
            text=True,
            timeout=15,
        )
        assert (result.returncode == 0) is success
        assert "test-only-placeholder" not in result.stdout + result.stderr
        if success:
            assert "auth=401; rate-limit=429" in result.stdout
    finally:
        server.shutdown()
        server.server_close()
        thread.join()

"""One-command local demo using only Python's standard library and Docker Compose."""

import argparse
import json
import os
import re
import secrets
import socket
import subprocess
import sys
import time
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import HTTPRedirectHandler, Request, build_opener

ROOT = Path(__file__).resolve().parents[1]
STATE = ROOT / ".demo"
PROJECT = "shortener-demo"
PORTS = (18080, 13000, 13001, 19091, 16687)
API = "http://localhost:18080"


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def request(url: str, key: str = "") -> tuple[int, bytes]:
    headers = {"X-API-Key": key} if key else {}
    try:
        with build_opener(NoRedirect).open(
            Request(url, headers=headers), timeout=3
        ) as response:
            return response.status, response.read()
    except HTTPError as exc:
        return exc.code, exc.read()


def wait_for(label, check, timeout=180):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            if check():
                print(f"Ready: {label}", flush=True)
                return
        except (OSError, ValueError, KeyError):
            pass
        time.sleep(1)
    raise RuntimeError(f"Timed out waiting for {label}")


def environment() -> dict[str, str]:
    # Compose --env-file does not override exported variables. Do not inherit a
    # real DB/LLM credential or an arbitrary COMPOSE_FILE from the caller.
    allowed = {
        "PATH",
        "HOME",
        "USER",
        "TMPDIR",
        "DOCKER_HOST",
        "DOCKER_CONTEXT",
        "DOCKER_CONFIG",
        "DOCKER_TLS_VERIFY",
        "DOCKER_CERT_PATH",
        "BUILDX_BUILDER",
        "SSH_AUTH_SOCK",
    }
    return {k: v for k, v in os.environ.items() if k in allowed}


def compose(*args, capture=False):
    command = [
        "docker",
        "compose",
        "--project-directory",
        str(ROOT),
        "--env-file",
        str(STATE / "env"),
        "-p",
        PROJECT,
        "-f",
        str(ROOT / "docker-compose.yml"),
        "-f",
        str(ROOT / "demo/compose.yml"),
        "--profile",
        "redis-streams",
        *args,
    ]
    return subprocess.run(
        command,
        cwd=ROOT,
        env=environment(),
        check=True,
        text=True,
        capture_output=capture,
    )


def resources(kind: str) -> list[str]:
    args = ["ps", "-aq"] if kind == "container" else [kind, "ls", "-q"]
    result = subprocess.run(
        ["docker", *args, "--filter", f"label=com.docker.compose.project={PROJECT}"],
        check=True,
        text=True,
        capture_output=True,
        env=environment(),
    )
    return result.stdout.split()


def preflight() -> None:
    version = subprocess.check_output(
        ["docker", "compose", "version", "--short"], text=True, env=environment()
    )
    match = re.search(r"(\d+)\.(\d+)\.(\d+)", version)
    if not match or tuple(map(int, match.groups())) < (2, 24, 4):
        raise RuntimeError("Docker Compose >=2.24.4 required")
    if STATE.exists() or any(
        resources(kind) for kind in ("container", "volume", "network")
    ):
        raise RuntimeError(
            "Demo already exists; run make demo-down in its original checkout first"
        )
    for port in PORTS:
        with socket.socket() as listener:
            try:
                listener.bind(("127.0.0.1", port))
            except OSError:
                raise RuntimeError(
                    f"Demo port {port} is occupied; stop its owner first"
                ) from None


def initialize() -> str:
    STATE.mkdir(mode=0o700)
    password = secrets.token_urlsafe(24)
    values = {
        "POSTGRES_USER": "demo",
        "POSTGRES_PASSWORD": secrets.token_urlsafe(24),
        "POSTGRES_DB": "shortener_demo",
        "GRAFANA_ADMIN_USER": "demo",
        "GRAFANA_ADMIN_PASSWORD": password,
        "LLM_PROVIDER": "fake",
    }
    with (STATE / "env").open("x") as handle:
        os.chmod(handle.name, 0o600)
        handle.write("".join(f"{k}={v}\n" for k, v in values.items()))
    (STATE / "owner").write_text(str(ROOT))
    return password


def verify_owner() -> None:
    if STATE.is_symlink() or (STATE / "owner").read_text() != str(ROOT):
        raise RuntimeError("Demo state ownership mismatch; refusing cleanup")
    for container in resources("container"):
        owner = subprocess.check_output(
            [
                "docker",
                "inspect",
                "--format",
                '{{ index .Config.Labels "com.docker.compose.project.working_dir" }}',
                container,
            ],
            text=True,
            env=environment(),
        ).strip()
        if Path(owner).resolve() != ROOT:
            raise RuntimeError(
                "Another checkout owns demo containers; refusing cleanup"
            )


def worker(action: str) -> None:
    verify_owner()
    compose("stop" if action == "worker-stop" else "start", "worker-redis")
    print(
        "Demo analytics worker " + ("stopped" if action == "worker-stop" else "started")
    )


def down() -> None:
    if not STATE.exists():
        print("No demo state in this checkout; nothing removed.")
        return
    verify_owner()
    compose("down", "--volumes", "--remove-orphans", "--timeout", "15")
    for name in ("env", "owner"):
        (STATE / name).unlink()
    STATE.rmdir()
    print(
        "Demo containers, volumes and credentials removed. " "Normal stack untouched."
    )


def up() -> None:
    preflight()
    grafana_password = initialize()
    print(
        "Starting isolated Redis Streams/FakeProvider demo; "
        "first build may take minutes.",
        flush=True,
    )
    compose("up", "--build", "-d")
    # up already gates API on the successful migration service; explicit repeat is safe.
    compose("exec", "-T", "api-redis", "alembic", "upgrade", "head")
    wait_for("API", lambda: request(API + "/health")[0] == 200)
    seeded = compose(
        "exec", "-T", "api-redis", "python", "/app/demo_seed.py", capture=True
    )
    data = json.loads(seeded.stdout)
    for _ in range(6):
        if request(API + "/demo-docs")[0] != 307:
            raise RuntimeError("Demo redirect failed")
    wait_for(
        "analytics worker (six live click events)",
        lambda: json.loads(
            request(API + "/analytics/demo-docs", data["read_write_key"])[1]
        )["total_clicks"]
        == 7,
    )
    wait_for("frontend", lambda: request("http://localhost:13000/")[0] == 200)
    wait_for("Grafana", lambda: request("http://localhost:13001/api/health")[0] == 200)
    wait_for("Jaeger", lambda: request("http://localhost:16687/")[0] == 200)
    wait_for("Prometheus", lambda: request("http://localhost:19091/-/ready")[0] == 200)
    print(
        f"Seeded {data['urls']} links, {data['history_rows']} fixture clicks, "
        "six live clicks, six flagged links."
    )
    print(
        "Synthetic history/verdicts are fixtures, "
        "not live abuse or throughput measurements."
    )
    print(
        "Save these credentials now; displayed once. "
        "Do not record this terminal output:"
    )
    print("ADMIN_KEY=" + data["admin_key"])
    print("READ_WRITE_KEY=" + data["read_write_key"])
    print("Grafana username: demo; password: " + grafana_password)
    print("API docs: http://localhost:18080/docs")
    print("Frontend: http://localhost:13000 (paste a key into its in-memory settings)")
    print("Grafana: http://localhost:13001/d/url-shortener")
    print("Jaeger: http://localhost:16687 (service: api or worker)")
    print("Walkthrough: docs/demo-script.md | Reset: make demo-down && make demo")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["up", "down", "worker-stop", "worker-start"])
    args = parser.parse_args()
    try:
        if args.action in {"worker-stop", "worker-start"}:
            worker(args.action)
        else:
            (up if args.action == "up" else down)()
    except (OSError, ValueError, RuntimeError, subprocess.CalledProcessError) as exc:
        # Never echo captured seed output, command env, DB URL or traceback.
        print(
            f"Demo failed ({type(exc).__name__}). "
            + (
                str(exc)
                if isinstance(exc, RuntimeError)
                else "Check Docker/build output above."
            ),
            file=sys.stderr,
        )
        print(
            "Cleanup/retry: make demo-down, then make demo. "
            "No automatic deletion of your stack.",
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

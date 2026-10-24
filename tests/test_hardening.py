"""Security boundaries without external infrastructure."""

import asyncio
import os
from pathlib import Path
import subprocess
import sys

import pytest
import yaml
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import BaseModel

from app.middleware.hardening import BodyLimitMiddleware, install_error_handlers


class Payload(BaseModel):
    number: int


def application():
    app = FastAPI()
    install_error_handlers(app)
    app.add_middleware(BodyLimitMiddleware, limit=64)

    @app.post("/body")
    def body(payload: Payload):
        return payload

    @app.get("/broken")
    def broken():
        raise RuntimeError("password=do-not-return-this")

    return app


def test_body_limit_and_safe_errors():
    with TestClient(application(), raise_server_exceptions=False) as client:
        assert client.post("/body", json={"number": 1}).status_code == 200
        response = client.post("/body", content=b"x" * 65)
        assert response.status_code == 413
        assert response.json() == {"detail": "Request body too large"}
        response = client.post("/body", json={"number": "private-value"})
        assert response.status_code == 422
        assert "private-value" not in response.text
        assert "input" not in response.json()["detail"][0]
        response = client.get("/broken")
        assert response.status_code == 500
        assert response.json() == {"detail": "Internal server error"}


def test_chunked_body_cannot_bypass_limit():
    async def exercise():
        reached = []
        sent = []
        chunks = iter(
            [
                {"type": "http.request", "body": b"x" * 40, "more_body": True},
                {"type": "http.request", "body": b"x" * 25, "more_body": False},
            ]
        )

        async def downstream(*args):
            reached.append(True)

        async def receive():
            return next(chunks)

        async def send(message):
            sent.append(message)

        await BodyLimitMiddleware(downstream, 64)(
            {"type": "http", "headers": []}, receive, send
        )
        assert not reached
        assert sent[0]["status"] == 413

    asyncio.run(exercise())


@pytest.mark.parametrize(
    "origins",
    [
        "*",
        "https://*.example.com",
        "https://user:pass@example.com",
        "https://example.com/path",
        "",
    ],
)
def test_production_rejects_unsafe_cors(origins):
    env = dict(os.environ, ENVIRONMENT="production", CORS_ORIGINS=origins)
    result = subprocess.run(
        [sys.executable, "-c", "import app.core.config"], env=env, capture_output=True
    )
    assert result.returncode != 0


def test_production_accepts_exact_origin():
    env = dict(os.environ, ENVIRONMENT="production", CORS_ORIGINS="https://example.com")
    assert (
        subprocess.run(
            [sys.executable, "-c", "import app.core.config"],
            env=env,
            capture_output=True,
        ).returncode
        == 0
    )


def test_all_kubernetes_containers_have_security_and_resources():
    root = Path(__file__).resolve().parents[1]
    workloads = []
    for path in (root / "k8s").rglob("*.yaml"):
        if "secret" in path.name:
            continue
        for doc in yaml.safe_load_all(path.read_text()):
            if not doc or doc["kind"] not in {"Deployment", "StatefulSet", "Job"}:
                continue
            workloads.append(doc["metadata"]["name"])
            spec = doc["spec"]["template"]["spec"]
            assert spec["securityContext"]["runAsNonRoot"]
            assert spec["securityContext"]["runAsUser"] > 0
            assert spec["securityContext"]["seccompProfile"]["type"] == "RuntimeDefault"
            assert spec["automountServiceAccountToken"] is False
            for c in spec.get("initContainers", []) + spec["containers"]:
                security = c["securityContext"]
                assert security["allowPrivilegeEscalation"] is False
                assert security["capabilities"]["drop"] == ["ALL"]
                assert security["readOnlyRootFilesystem"] or doc["metadata"][
                    "name"
                ] in {"kafka", "zookeeper"}
                for bound in ("requests", "limits"):
                    assert {"cpu", "memory"} <= c["resources"][bound].keys()
    assert len(workloads) == 11
    assert "abuse-worker" in workloads


def test_network_policy_default_deny_and_exact_dependency_ports():
    root = Path(__file__).resolve().parents[1]
    policies = {
        p["metadata"]["name"]: p["spec"]
        for p in yaml.safe_load_all((root / "k8s/7-network-policies.yaml").read_text())
    }
    assert policies["default-deny"] == {
        "podSelector": {},
        "policyTypes": ["Ingress", "Egress"],
        "ingress": [],
        "egress": [],
    }
    for name in ["api", "worker"]:
        rules = policies[name + "-dependencies"]["egress"]
        assert {
            (r["to"][0]["podSelector"]["matchLabels"]["app"], r["ports"][0]["port"])
            for r in rules
        } == {("postgres", 5432), ("redis", 6379), ("kafka", 9092)}


def test_slow_request_body_returns_408(monkeypatch):
    import app.middleware.hardening as hardening

    original_timeout = asyncio.timeout
    monkeypatch.setattr(hardening.asyncio, "timeout", lambda _: original_timeout(0.001))

    async def exercise():
        sent = []

        async def receive():
            await asyncio.sleep(1)
            return {"type": "http.request", "body": b""}

        async def send(message):
            sent.append(message)

        async def downstream(*args):
            pytest.fail("slow body reached handler")

        await BodyLimitMiddleware(downstream, 64)({"type": "http"}, receive, send)
        assert sent[0]["status"] == 408

    asyncio.run(exercise())


def test_kafka_constructor_uses_supported_bounded_timeouts(monkeypatch):
    from unittest.mock import Mock
    from kafka import KafkaConsumer
    import app.kafka.consumer as module

    constructor = Mock()
    monkeypatch.setattr(module, "KafkaConsumer", constructor)
    module.create_consumer("topic", "group")
    options = constructor.call_args.kwargs
    assert set(options) <= KafkaConsumer.DEFAULT_CONFIG.keys()
    assert options["session_timeout_ms"] < options["request_timeout_ms"] <= 10000


def test_cors_setting_is_configmap_data_not_object_metadata():
    root = Path(__file__).resolve().parents[1]
    config = yaml.safe_load((root / "k8s/1-configmap.yaml").read_text())
    assert "CORS_ORIGINS" not in config["metadata"]
    assert config["data"]["CORS_ORIGINS"].startswith("https://")


def test_frontend_build_excludes_local_secrets_and_artifacts():
    root = Path(__file__).resolve().parents[1]
    patterns = (root / "frontend/.dockerignore").read_text().splitlines()
    assert {".env*", "node_modules", ".next", "*.tsbuildinfo"} <= set(patterns)

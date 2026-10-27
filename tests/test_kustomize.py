"""Rendered deployment contracts; live kind smoke is a separate CI gate."""

import re
import shutil
import subprocess
from pathlib import Path

import pytest
import yaml

ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture(params=["ci", "local"])
def rendered(request):
    if not shutil.which("kubectl"):
        pytest.skip("kubectl required; kind CI validates both overlays")
    output = subprocess.check_output(
        ["kubectl", "kustomize", str(ROOT / "k8s/overlays" / request.param)], text=True
    )
    return request.param, list(yaml.safe_load_all(output))


def test_overlay_contract(rendered):
    mode, docs = rendered
    workloads = [d for d in docs if d["kind"] in {"Deployment", "StatefulSet", "Job"}]
    names = {d["metadata"]["name"] for d in workloads}
    assert {
        "api",
        "worker",
        "abuse-worker",
        "postgres",
        "redis",
        "jaeger",
        "db-migrate",
    } <= names
    assert "zookeeper" not in names and "frontend" not in names
    config = next(
        d
        for d in docs
        if d["kind"] == "ConfigMap" and d["metadata"]["name"] == "url-shortener-config"
    )
    assert config["data"]["EVENT_BUS"] == ("redis_streams" if mode == "ci" else "kafka")
    assert ("kafka" in names) == (mode == "local")
    assert any(d["kind"] == "Ingress" for d in docs) == (mode == "local")
    assert any(d["kind"] == "HorizontalPodAutoscaler" for d in docs) == (
        mode == "local"
    )
    for d in workloads:
        spec = d["spec"]["template"]["spec"]
        if mode == "ci" and d["kind"] != "Job":
            assert d["spec"]["replicas"] == 1
        for c in spec.get("initContainers", []) + spec["containers"]:
            assert not c["image"].endswith(":latest")
            if c["image"].startswith("url-shortener:"):
                assert re.fullmatch(r"url-shortener:[0-9a-f]{40}", c["image"])
        for claim in d["spec"].get("volumeClaimTemplates", []):
            assert "storageClassName" not in claim["spec"]
    for d in docs:
        if d["kind"] == "PersistentVolumeClaim":
            assert "storageClassName" not in d["spec"]
    api = next(d for d in workloads if d["metadata"]["name"] == "api")
    container = api["spec"]["template"]["spec"]["containers"][0]
    assert container["livenessProbe"]["httpGet"]["path"] == "/livez"
    assert container["startupProbe"]["httpGet"]["path"] == "/livez"
    assert container["readinessProbe"]["httpGet"]["path"] == "/health"
    assert api["spec"]["template"]["spec"]["topologySpreadConstraints"]
    job = next(d for d in workloads if d["kind"] == "Job")
    assert job["spec"]["template"]["spec"]["containers"][0]["command"] == [
        "alembic",
        "upgrade",
        "head",
    ]
    assert job["spec"]["activeDeadlineSeconds"] <= 300
    postgres = next(d for d in workloads if d["metadata"]["name"] == "postgres")
    pc = postgres["spec"]["template"]["spec"]["containers"][0]
    assert {e["name"]: e.get("value") for e in pc["env"]}["PGDATA"].endswith("/pgdata")
    assert all("subPath" not in m for m in pc["volumeMounts"])
    worker = next(d for d in workloads if d["metadata"]["name"] == "worker")
    wc = worker["spec"]["template"]["spec"]["containers"][0]
    assert {e["name"]: e.get("value") for e in wc["env"]}[
        "REDIS_URL"
    ] == "redis://redis:6379/0"
    if mode == "local":
        kafka = next(
            d
            for d in docs
            if d["kind"] == "Service" and d["metadata"]["name"] == "kafka"
        )
        assert kafka["spec"]["publishNotReadyAddresses"] is True
    assert {"api", "worker", "abuse-worker"} <= {
        d["metadata"]["name"] for d in docs if d["kind"] == "PodDisruptionBudget"
    }


def test_scripts_are_strict_and_syntax_valid():
    for name in ["k8s/deploy.sh", "scripts/smoke_test.sh"]:
        path = ROOT / name
        assert "set -euo pipefail" in path.read_text()
        subprocess.run(["bash", "-n", str(path)], check=True)
    script = (ROOT / "k8s/deploy.sh").read_text()
    assert "apply -k" in script
    assert "trap diagnostics ERR" in script
    assert "|| echo" not in script


@pytest.mark.parametrize(
    "failure",
    [
        "rollout status statefulset/postgres",
        "wait --for=condition=complete job/db-migrate",
    ],
)
def test_deploy_stops_before_final_apply_on_wait_failure(tmp_path, failure):
    import os

    log = tmp_path / "calls"
    executable = tmp_path / "kubectl"
    executable.write_text("""#!/bin/sh
printf '%s\\n' "$*" >> "$CALL_LOG"
case "$*" in *"$FAIL_AT"*) exit 42;; esac
exit 0
""")
    executable.chmod(0o755)
    env = dict(
        os.environ,
        PATH=str(tmp_path) + os.pathsep + os.environ["PATH"],
        KUBE_CONTEXT="fake",
        CALL_LOG=str(log),
        FAIL_AT=failure,
    )
    result = subprocess.run(
        ["bash", str(ROOT / "k8s/deploy.sh"), "ci"],
        env=env,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 42
    assert "Deployment failed" in result.stderr
    calls = log.read_text()
    assert "apply -k " in calls
    assert "apply -k " + str(ROOT / "k8s/overlays/ci") not in calls
    assert "describe pods" in calls

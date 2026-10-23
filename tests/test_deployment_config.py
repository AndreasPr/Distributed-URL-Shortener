"""Validate credential wiring without a daemon, network, or real credentials."""

import json
import os
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
REQUIRED = (
    "POSTGRES_USER",
    "POSTGRES_PASSWORD",
    "POSTGRES_DB",
    "GRAFANA_ADMIN_USER",
    "GRAFANA_ADMIN_PASSWORD",
)


@pytest.fixture
def compose_config(tmp_path):
    if not shutil.which("docker"):
        pytest.skip("Docker CLI unavailable; Compose configuration cannot be checked")
    probe = subprocess.run(["docker", "compose", "version"], capture_output=True)
    if probe.returncode:
        pytest.skip("Docker Compose plugin unavailable")
    empty_env = tmp_path / "empty.env"
    empty_env.write_text("")
    env = os.environ.copy()
    env.update({key: "placeholder_for_config_test" for key in REQUIRED})

    def run(overrides=None, profile="kafka"):
        return subprocess.run(
            [
                "docker",
                "compose",
                "--env-file",
                str(empty_env),
                "-f",
                str(ROOT / "docker-compose.yml"),
                "--profile",
                profile,
                "config",
                "--format",
                "json",
            ],
            env={**env, **(overrides or {})},
            capture_output=True,
            text=True,
            cwd=ROOT,
        )

    return run


@pytest.mark.parametrize("key", REQUIRED)
def test_compose_rejects_empty_required_credentials(compose_config, key):
    result = compose_config({key: ""})
    assert result.returncode != 0
    assert key in result.stderr


def test_compose_uses_same_database_credentials_for_all_clients(compose_config):
    result = compose_config()
    assert result.returncode == 0, "Compose configuration failed (output withheld)"
    services = json.loads(result.stdout)["services"]
    database = services["postgres"]["environment"]
    expected = (
        f"postgresql://{database['POSTGRES_USER']}:{database['POSTGRES_PASSWORD']}"
        f"@postgres:5432/{database['POSTGRES_DB']}"
    )
    for name in ("api", "worker", "migrate"):
        assert services[name]["environment"]["DB_URL"] == expected
    grafana = services["grafana"]["environment"]
    assert grafana["GF_SECURITY_ADMIN_USER"] == "placeholder_for_config_test"
    assert grafana["GF_SECURITY_ADMIN_PASSWORD"] == "placeholder_for_config_test"


@pytest.mark.parametrize("profile", ["kafka", "redis-streams"])
def test_profile_selects_matching_brokers(compose_config, profile):
    result = compose_config(profile=profile)
    assert result.returncode == 0, "Compose configuration failed (output withheld)"
    services = json.loads(result.stdout)["services"]
    if profile == "kafka":
        assert {"api", "worker", "kafka", "zookeeper"} <= services.keys()
        assert "api-redis" not in services
        assert services["api"]["environment"]["EVENT_BUS"] == "kafka"
        assert services["worker"]["environment"]["EVENT_BUS"] == "kafka"
    else:
        assert not {"kafka", "zookeeper", "api", "worker"} & services.keys()
        assert services["api-redis"]["environment"]["EVENT_BUS"] == "redis_streams"
        assert services["worker-redis"]["environment"]["EVENT_BUS"] == "redis_streams"


def test_kubernetes_metrics_use_internal_port_and_network_policy():
    import yaml

    documents = list(yaml.safe_load_all((ROOT / "k8s/api/deployment.yaml").read_text()))
    deployment = next(item for item in documents if item["kind"] == "Deployment")
    container = deployment["spec"]["template"]["spec"]["containers"][0]
    assert "--no-proxy-headers" in container["command"]
    assert {v["name"]: v.get("value") for v in container["env"]}[
        "METRICS_PORT"
    ] == "8002"
    service = next(
        item
        for item in documents
        if item["kind"] == "Service" and item["metadata"]["name"] == "api"
    )
    assert service["spec"]["type"] == "ClusterIP"
    assert [port["targetPort"] for port in service["spec"]["ports"]] == [8000]
    policies = list(yaml.safe_load_all((ROOT / "k8s/7-network-policies.yaml").read_text()))
    policy = next(item for item in policies if item["metadata"]["name"] == "api-metrics")
    rules = policy["spec"]["ingress"]
    assert rules[0] == {
        "from": [{"podSelector": {"matchLabels": {"app": "prometheus"}}}],
        "ports": [{"protocol": "TCP", "port": 8002}],
    }
    ingress = yaml.safe_load((ROOT / "k8s/5-ingress.yaml").read_text())
    backends = [
        path["backend"]["service"]["name"]
        for rule in ingress["spec"]["rules"]
        for path in rule["http"]["paths"]
    ]
    assert "api-metrics" not in backends
    assert "prometheus" not in backends

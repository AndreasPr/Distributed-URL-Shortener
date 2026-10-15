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

    def run(overrides=None):
        return subprocess.run(
            [
                "docker",
                "compose",
                "--env-file",
                str(empty_env),
                "-f",
                str(ROOT / "docker-compose.yml"),
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

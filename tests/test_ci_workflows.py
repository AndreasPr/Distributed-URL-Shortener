"""Release permissions and prerequisites must not regress during workflow edits."""

import re
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]


def load(name):
    return yaml.safe_load((ROOT / ".github/workflows" / name).read_text())


def test_release_only_publishes_after_ci_and_scanning():
    workflow = load("docker.yml")
    triggers = workflow.get("on", workflow.get(True))
    assert triggers["push"] == {"tags": ["v*.*.*"]}
    assert "workflow_run" not in triggers
    jobs = workflow["jobs"]
    assert jobs["release-ci"]["uses"] == "./.github/workflows/ci.yml"
    assert jobs["image"]["needs"] == "release-ci"
    assert "needs.release-ci.result == 'success'" in jobs["image"]["if"]
    assert set(jobs["publish"]["needs"]) == {"release-ci", "image"}
    assert "startsWith(github.ref, 'refs/tags/')" in jobs["publish"]["if"]
    assert jobs["publish"]["permissions"]["packages"] == "write"
    assert workflow["permissions"] == {"contents": "read"}
    steps = jobs["image"]["steps"]
    build = next(
        s for s in steps if s.get("uses", "").startswith("docker/build-push-action")
    )
    assert build["with"]["push"] is False and build["with"]["load"] is True
    # Cached apt layers must not keep already-fixed OS vulnerabilities in releases.
    assert build["with"]["pull"] is True
    assert build["with"]["no-cache"] is True
    scanner = next(s for s in steps if "--scanners vuln" in s.get("run", ""))
    assert "--ignore-unfixed" in scanner["run"] and "--exit-code 1" in scanner["run"]
    assert "--severity HIGH,CRITICAL" in scanner["run"]
    assert not scanner.get("continue-on-error", False)
    login = next(
        s
        for s in jobs["publish"]["steps"]
        if s.get("uses", "").startswith("docker/login-action")
    )
    assert login["with"]["password"] == "${{ secrets.GITHUB_TOKEN }}"
    assert not (ROOT / ".github/workflows/cd.yml").exists()


def test_ci_checks_are_independent_and_actions_are_immutable():
    workflow = load("ci.yml")
    assert "workflow_call" in workflow.get("on", workflow.get(True))
    assert {
        "lint-types",
        "unit",
        "integration",
        "mcp",
        "frontend",
        "gitleaks",
        "pip-audit",
        "npm-audit",
        "promtool",
    } <= workflow["jobs"].keys()
    assert any(
        s.get("run", "").strip() == "make test-integration"
        for s in workflow["jobs"]["integration"]["steps"]
    )
    for path in (ROOT / ".github/workflows").glob("*.yml"):
        text = path.read_text()
        assert "GHCR_TOKEN" not in text
        for action in re.findall(r"uses:\s+([^\s#]+)", text):
            if not action.startswith("./"):
                assert re.search(r"@[a-f0-9]{40}$", action), action
        doc = yaml.safe_load(text)
        assert doc["permissions"] == {"contents": "read"}
        assert doc["concurrency"]["cancel-in-progress"] is True


def test_runtime_image_uses_allowlisted_sources_and_removes_build_tools():
    dockerfile = (ROOT / "Dockerfile").read_text()
    assert "COPY . ./" not in dockerfile
    for source in ["app", "alembic", "alembic.ini"]:
        assert f"COPY {source} " in dockerfile
    assert "/opt/venv/bin/python -m pip uninstall -y setuptools wheel pip" in dockerfile
    assert (
        "/usr/local/bin/python -m pip uninstall -y setuptools wheel pip" in dockerfile
    )
    assert "apt-get upgrade -y" in dockerfile
    assert "--no-binary=psycopg2-binary" in dockerfile
    assert "libpq-dev" in dockerfile
    assert ".kilo" in (ROOT / ".dockerignore").read_text().splitlines()

"""Offline deployment contracts; no production keys or network access."""

from unittest.mock import Mock

import pytest

from scripts import check_supabase_hardening as hardening
from scripts import smoke_prod


def response(status=200, data=None, headers=None):
    result = Mock(status_code=status, headers=headers or {})
    result.json.return_value = data or {}
    return result


def test_smoke_verifies_both_hops_and_cleans_up(monkeypatch):
    monkeypatch.setattr(smoke_prod, "uuid4", lambda: Mock(hex="a" * 32))
    session = Mock()
    session.request.side_effect = [
        response(),
        response(),
        response(data={"short_code": "smoke-" + "a" * 16}),
        response(307, headers={"Location": "https://example.com/"}),
        response(307, headers={"Location": "https://example.com/"}),
        response(data={"total_clicks": 2}),
        response(204),
    ]
    smoke_prod.smoke(
        session,
        "https://api.example.invalid",
        "https://web.example.invalid/s",
        "synthetic-placeholder",
    )
    calls = session.request.call_args_list
    assert calls[-1].args[0] == "DELETE"
    assert all(call.kwargs["allow_redirects"] is False for call in calls)
    assert calls[3].kwargs["headers"] == {}
    assert calls[2].kwargs["headers"]["X-API-Key"] == "synthetic-placeholder"


@pytest.mark.parametrize(
    "bad",
    [response(200), response(307, headers={"Location": "https://wrong.example/"})],
)
def test_wrong_redirect_fails_and_still_deletes(monkeypatch, bad):
    monkeypatch.setattr(smoke_prod, "uuid4", lambda: Mock(hex="a" * 32))
    session = Mock()
    session.request.side_effect = [
        response(),
        response(),
        response(data={"short_code": "smoke-" + "a" * 16}),
        bad,
        response(204),
    ]
    with pytest.raises(smoke_prod.Failure, match="redirect hop"):
        smoke_prod.smoke(
            session,
            "https://api.example.invalid",
            "https://api.example.invalid",
            "fixture",
        )
    assert session.request.call_args_list[-1].args[0] == "DELETE"


def test_cold_start_bounded_and_revision_checked():
    now = [0.0]
    session = Mock()
    session.request.return_value = response(headers={"X-Deployment-Revision": "old"})

    def sleep(seconds):
        now[0] += seconds

    with pytest.raises(smoke_prod.Failure, match="expected revision"):
        smoke_prod.wait_live(
            session,
            "https://example.invalid",
            90,
            "new",
            clock=lambda: now[0],
            sleep=sleep,
        )
    assert now[0] == 90


def test_hardening_readonly_and_effective_privileges():
    connection = Mock()
    exists = Mock()
    exists.scalar.return_value = True
    tables = Mock()
    tables.fetchall.return_value = [("safe", True, False), ("unsafe", False, True)]
    connection.exec_driver_sql.side_effect = [Mock(), exists, tables]
    problems = hardening.inspect(connection)
    assert problems == [
        "unsafe: RLS disabled",
        "unsafe: anon has effective table/column privileges",
    ]
    connection.execution_options.assert_called_once_with(postgresql_readonly=True)
    connection.begin.return_value.rollback.assert_called_once()
    assert "has_any_column_privilege" in hardening.TABLES


def test_revision_header_is_sha_only(monkeypatch):
    from fastapi import Response

    from app.api.routes import livez

    monkeypatch.setenv("RENDER_GIT_COMMIT", "a" * 40)
    response = Response()
    livez(response)
    assert response.headers["X-Deployment-Revision"] == "a" * 40
    monkeypatch.setenv("RENDER_GIT_COMMIT", "not-a-sha")
    response = Response()
    livez(response)
    assert "X-Deployment-Revision" not in response.headers


def test_deploy_workflow_is_opt_in_and_ci_gated():
    from pathlib import Path

    import yaml

    doc = yaml.safe_load(Path(".github/workflows/deploy-check.yml").read_text())
    job = doc["jobs"]["deploy-and-check"]
    assert "head_repository.full_name == github.repository" in job["if"]
    assert "conclusion == 'success'" in job["if"]
    assert "event == 'push'" in job["if"]
    assert "HOSTED_DEPLOY_ENABLED" in job["if"]
    assert job["environment"] == "production"
    assert doc["permissions"] == {"contents": "read"}
    assert doc["concurrency"]["cancel-in-progress"] is False


def test_readiness_waits_for_background_startup(monkeypatch):
    monkeypatch.setattr(smoke_prod, "uuid4", lambda: Mock(hex="a" * 32))
    session = Mock()
    session.request.side_effect = [
        response(),
        response(503),
        response(),
        response(data={"short_code": "smoke-" + "a" * 16}),
        response(307, headers={"Location": "https://example.com/"}),
        response(data={"total_clicks": 1}),
        response(204),
    ]
    sleep = Mock()
    smoke_prod.smoke(
        session,
        "https://api.example.invalid",
        "https://api.example.invalid",
        "fixture",
        sleep=sleep,
    )
    sleep.assert_called_once_with(2)


def test_redirect_verifier_unset_origin_is_explicit_skip():
    import os
    import subprocess

    env = dict(os.environ)
    env.pop("API_ORIGIN", None)
    result = subprocess.run(
        ["bash", "scripts/verify_hosted_redirect.sh"],
        env=env,
        text=True,
        capture_output=True,
        check=False,
    )
    assert result.returncode == 0
    assert result.stdout.startswith("SKIP: API_ORIGIN is unset")


def test_network_exception_never_echoes_secret():
    import requests

    session = Mock()
    session.request.side_effect = requests.ConnectionError("private-token-in-url")
    with pytest.raises(smoke_prod.Failure) as error:
        smoke_prod.request(
            session, "GET", "https://example.invalid", key="private-token"
        )
    assert "private-token" not in str(error.value)

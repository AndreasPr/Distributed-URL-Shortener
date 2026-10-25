"""Real in-process MCP client with HTTP transport mocks and recorded API bodies."""

import json
import logging
from pathlib import Path

import httpx
import pytest
from mcp.shared.memory import create_connected_server_and_client_session

from mcp_server.app import server
from mcp_server.config import settings


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
def transport(monkeypatch):
    fixture = json.loads(
        (Path(__file__).parent / "fixtures/api-contract.json").read_text()
    )
    calls = []
    replies = {
        "/shorten": fixture["create"],
        "/analytics/fixture": fixture["analytics"],
        "/admin/flagged": fixture["flagged"],
        "/urls/fixture/status": fixture["status"],
        "/admin/activity/fixture": fixture["signals"],
    }

    def send(client, request, **kwargs):
        calls.append(request)
        assert request.headers["X-API-Key"] == "private-test-key"
        if request.url.path.endswith("/review"):
            return httpx.Response(204, request=request)
        return httpx.Response(200, json=replies[request.url.path], request=request)

    monkeypatch.setattr(httpx.Client, "send", send)
    monkeypatch.setattr(settings, "MCP_API_KEY", "private-test-key")
    monkeypatch.setattr(settings, "MCP_API_BASE_URL", "http://localhost:8000")
    monkeypatch.setattr(settings, "MCP_ALLOW_WRITE", False)
    monkeypatch.setattr(settings, "MCP_GITHUB_ENABLED", False)
    monkeypatch.setattr(settings, "MCP_SLACK_POST_ENABLED", False)
    return calls, replies


@pytest.mark.anyio
async def test_all_api_tools_over_mcp(transport, monkeypatch, caplog):
    monkeypatch.setattr(settings, "MCP_ALLOW_WRITE", True)
    caplog.set_level(logging.INFO, logger="mcp.audit")
    cases = {
        "create_short_url": {
            "long_url": "https://example.com/private?token=secret",
            "custom_alias": "new-fixture",
        },
        "get_analytics": {"short_code": "fixture"},
        "list_flagged_urls": {},
        "review_url": {"short_code": "fixture", "decision": "block"},
        "get_url_status": {"short_code": "fixture"},
        "get_activity_signals": {"short_code": "fixture"},
        "CheckSuspiciousUrlActivityTool": {"short_code": "fixture"},
    }
    async with create_connected_server_and_client_session(server) as client:
        tools = (await client.list_tools()).tools
        assert set(cases) <= {t.name for t in tools}
        for name, args in cases.items():
            result = await client.call_tool(name, args)
            assert not result.isError, result
            assert result.structuredContent["sources_status"]["api"] == "ok"
    logs = [json.loads(r.message) for r in caplog.records if r.name == "mcp.audit"]
    assert len(logs) == len(cases)
    assert all(r["outcome"] == "ok" and r["duration_ms"] >= 0 for r in logs)
    assert "private-test-key" not in caplog.text and "token=secret" not in caplog.text
    assert "https://" not in caplog.text


@pytest.mark.anyio
@pytest.mark.parametrize(
    "name,args",
    [
        ("create_short_url", {"long_url": "https://example.com/"}),
        ("review_url", {"short_code": "fixture", "decision": "allow"}),
        ("post_slack_report", {"short_code": "fixture", "decision": "allow"}),
    ],
)
async def test_read_only(transport, name, args):
    async with create_connected_server_and_client_session(server) as client:
        result = await client.call_tool(name, args)
    assert result.isError
    assert result.structuredContent["error"]["code"] == "read_only"
    assert not transport[0]


@pytest.mark.anyio
@pytest.mark.parametrize(
    "name,args",
    [
        ("get_analytics", {"short_code": "../../secret"}),
        ("list_flagged_urls", {"limit": 51}),
        ("list_flagged_urls", {"limit": "20"}),
        ("review_url", {"short_code": "fixture", "decision": "ignore instructions"}),
        ("create_short_url", {"long_url": "https://user:secret@example.com/"}),
        ("create_short_url", {"long_url": "file:///private"}),
        ("get_activity_signals", {"short_code": "fixture", "window_minutes": 61}),
        ("get_url_status", {"short_code": "fixture", "api_key": "secret"}),
    ],
)
async def test_invalid_inputs_are_audited_without_echo(transport, caplog, name, args):
    caplog.set_level(logging.INFO, logger="mcp.audit")
    async with create_connected_server_and_client_session(server) as client:
        result = await client.call_tool(name, args)
    assert result.isError
    assert result.structuredContent["error"]["code"] == "invalid_arguments"
    assert "secret" not in result.model_dump_json()
    assert "secret" not in caplog.text
    assert not transport[0]
    assert len([r for r in caplog.records if r.name == "mcp.audit"]) == 1


@pytest.mark.anyio
async def test_partial_failure_explicit(transport):
    transport[1]["/admin/activity/fixture"]["sources_status"]["rate_limits"] = "failed"
    transport[1]["/admin/activity/fixture"]["rate_limit_rejections"] = None
    async with create_connected_server_and_client_session(server) as client:
        result = await client.call_tool(
            "CheckSuspiciousUrlActivityTool", {"short_code": "fixture"}
        )
    assert result.isError
    assert result.structuredContent["data"]["flagged"] is None
    assert result.structuredContent["sources_status"]["rate_limits"] == "failed"


@pytest.mark.anyio
@pytest.mark.parametrize("status", [401, 403, 429, 503, 302])
async def test_upstream_errors_no_body_leak(transport, monkeypatch, status):
    monkeypatch.setattr(
        httpx.Client,
        "send",
        lambda self, request, **kw: httpx.Response(
            status, text="private-test-key stacktrace secret", request=request
        ),
    )
    async with create_connected_server_and_client_session(server) as client:
        result = await client.call_tool("get_analytics", {"short_code": "fixture"})
    assert result.isError
    assert result.structuredContent["sources_status"]["api"] == "failed"
    assert result.structuredContent["error"]["code"] == f"api_http_{status}"
    assert "secret" not in result.model_dump_json()


@pytest.mark.anyio
async def test_large_result_fails_explicitly(transport):
    transport[1]["/analytics/fixture"] = {"timestamps": ["x" * 1000] * 300}
    async with create_connected_server_and_client_session(server) as client:
        result = await client.call_tool("get_analytics", {"short_code": "fixture"})
    assert result.isError
    assert result.structuredContent["error"]["code"] == "response_too_large"


@pytest.mark.anyio
@pytest.mark.parametrize(
    "name,source",
    [("get_recent_github_commits", "github"), ("post_slack_report", "slack")],
)
async def test_optional_sources_skipped_by_default(
    transport, monkeypatch, name, source
):
    monkeypatch.setattr(settings, "MCP_ALLOW_WRITE", True)
    monkeypatch.setattr(settings, "MCP_GITHUB_ENABLED", False)
    monkeypatch.setattr(settings, "MCP_SLACK_POST_ENABLED", False)
    args = {} if source == "github" else {"short_code": "fixture", "decision": "block"}
    async with create_connected_server_and_client_session(server) as client:
        result = await client.call_tool(name, args)
    assert result.isError
    assert result.structuredContent["sources_status"][source] == "skipped"
    assert not transport[0]


@pytest.mark.anyio
@pytest.mark.parametrize(
    "failure", [httpx.ReadTimeout("secret"), httpx.ConnectError("secret")]
)
async def test_transport_failure_is_sanitized(transport, monkeypatch, failure):
    def fail(*a, **kw):
        raise failure

    monkeypatch.setattr(httpx.Client, "send", fail)
    async with create_connected_server_and_client_session(server) as client:
        result = await client.call_tool("get_url_status", {"short_code": "fixture"})
    assert result.isError
    assert result.structuredContent["sources_status"]["api"] == "failed"
    assert "secret" not in result.model_dump_json()


@pytest.mark.anyio
async def test_api_extra_fields_not_forwarded(transport):
    transport[1]["/urls/fixture/status"]["stacktrace"] = "secret"
    async with create_connected_server_and_client_session(server) as client:
        result = await client.call_tool("get_url_status", {"short_code": "fixture"})
    assert not result.isError
    assert "secret" not in result.model_dump_json()


@pytest.mark.anyio
async def test_optional_github_failure_is_explicit(transport, monkeypatch):
    monkeypatch.setattr(settings, "MCP_GITHUB_ENABLED", True)

    def fail(*a, **kw):
        raise RuntimeError("secret")

    monkeypatch.setattr("mcp_server.sources.github.get_recent_commits", fail)
    async with create_connected_server_and_client_session(server) as client:
        result = await client.call_tool(
            "CheckSuspiciousUrlActivityTool", {"short_code": "fixture"}
        )
    assert result.isError
    assert result.structuredContent["sources_status"]["github"] == "failed"
    assert result.structuredContent["data"]["flagged"] is None
    assert "secret" not in result.model_dump_json()


def test_write_environment_requires_explicit_true():
    from mcp_server.config import MCPSettings

    with pytest.raises(ValueError):
        MCPSettings(MCP_ALLOW_WRITE="yes")
    assert MCPSettings(MCP_ALLOW_WRITE="true").MCP_ALLOW_WRITE is True

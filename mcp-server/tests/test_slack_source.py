import pytest
from mcp_server.api import APIError
from mcp_server.config import settings
from mcp_server.sources.slack import post_flag_report


@pytest.mark.parametrize("write,slack", [(False, True), (True, False), (False, False)])
def test_slack_requires_both_gates(monkeypatch, write, slack):
    monkeypatch.setattr(settings, "MCP_ALLOW_WRITE", write)
    monkeypatch.setattr(settings, "MCP_SLACK_POST_ENABLED", slack)
    with pytest.raises(APIError, match="slack_disabled"):
        post_flag_report({"short_code": "abc", "decision": "block"})


def test_explicit_slack_payload_is_bounded(monkeypatch):
    import httpx

    calls = []

    def send(self, request, **kwargs):
        calls.append(request)
        return httpx.Response(200, text="ok", request=request)

    monkeypatch.setattr(httpx.Client, "send", send)
    monkeypatch.setattr(settings, "MCP_ALLOW_WRITE", True)
    monkeypatch.setattr(settings, "MCP_SLACK_POST_ENABLED", True)
    monkeypatch.setattr(
        settings, "SLACK_WEBHOOK_URL", "https://hooks.slack.com/services/placeholder"
    )
    assert post_flag_report({"short_code": "fixture", "decision": "allow"}) == {
        "sent": True
    }
    assert b"URL review: fixture; decision: allow" in calls[0].content

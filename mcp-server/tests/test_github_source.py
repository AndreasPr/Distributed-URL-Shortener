import pytest
from mcp_server.api import APIError
from mcp_server.config import settings
from mcp_server.sources.github import get_recent_commits


def test_github_disabled_even_with_credentials(monkeypatch):
    monkeypatch.setattr(settings, "MCP_GITHUB_ENABLED", False)
    monkeypatch.setattr(settings, "GITHUB_TOKEN", "placeholder")
    with pytest.raises(APIError, match="github_disabled"):
        get_recent_commits()


def test_github_context_is_bounded_and_does_not_echo_messages(monkeypatch):
    import httpx

    def send(self, request, **kwargs):
        assert request.url.host == "api.github.com"
        return httpx.Response(
            200,
            json=[{"sha": "a" * 40, "commit": {"message": "untrusted secret"}}] * 20,
            request=request,
        )

    monkeypatch.setattr(httpx.Client, "send", send)
    monkeypatch.setattr(settings, "MCP_GITHUB_ENABLED", True)
    monkeypatch.setattr(settings, "GITHUB_REPOSITORY", "example/repo")
    result = get_recent_commits()
    assert len(result["commits"]) == 10
    assert "secret" not in str(result)
    assert result["correlation"] == "heuristic_context_only"

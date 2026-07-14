import pytest

from mcp_server.errors import SourceError


class FakeResponse:
    def __init__(self, status_code=200, json_body=None, headers=None, text=""):
        self.status_code = status_code
        self._json = json_body or []
        self.headers = headers or {}
        self.text = text

    def json(self):
        return self._json


class FakeClient:
    def __init__(self, responses):
        # responses is an iterator of FakeResponse to return for successive get() calls
        self._responses = list(responses)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def get(self, url, headers=None, params=None, timeout=None):
        if not self._responses:
            return FakeResponse(status_code=200, json_body=[])
        return self._responses.pop(0)


def test_get_recent_commits_happy(monkeypatch):
    from mcp_server.sources import github

    monkeypatch.setattr(github, "_resolve_repository", lambda: "owner/repo")
    monkeypatch.setattr(github, "settings", type("S", (), {"GITHUB_TOKEN": "x", "MCP_GITHUB_TIMEOUT_SECONDS": 5})())

    commit_item = {"sha": "abc", "commit": {"message": "m", "author": {"name": "a", "date": "2020-01-01T00:00:00Z"}}, "html_url": "https://"}
    detail = {"files": [{"filename": "routes.py"}]}

    monkeypatch.setattr(github.httpx, "Client", lambda timeout=None: FakeClient([FakeResponse(200, [commit_item]), FakeResponse(200, detail)]))

    result = github.get_recent_commits(window_minutes=60, path_filter=None, limit=10)
    assert "commits" in result
    assert isinstance(result["commits"], list)


def test_get_recent_commits_rate_limited(monkeypatch):
    from mcp_server.sources import github

    monkeypatch.setattr(github, "_resolve_repository", lambda: "owner/repo")
    monkeypatch.setattr(github, "settings", type("S", (), {"GITHUB_TOKEN": "x", "MCP_GITHUB_TIMEOUT_SECONDS": 5})())

    # First response is a 403
    monkeypatch.setattr(github.httpx, "Client", lambda timeout=None: FakeClient([FakeResponse(403, json_body=[], headers={"Retry-After": "30"}, text="rate limited")]))

    with pytest.raises(SourceError) as exc:
        github.get_recent_commits(window_minutes=60)

    assert exc.value.message == "rate_limited"

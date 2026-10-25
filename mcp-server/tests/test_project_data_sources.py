import pytest
from mcp_server.sources import project_data


def test_project_data_http_only(monkeypatch):
    calls = []
    monkeypatch.setattr(
        project_data, "request", lambda *a, **kw: calls.append((a, kw)) or {}
    )
    project_data.get_activity_signals("abc", 10)
    assert calls == [
        (("GET", "/admin/activity/abc"), {"params": {"window_minutes": 10}})
    ]
    with pytest.raises(ValueError):
        project_data.get_activity_signals("../private", 100)

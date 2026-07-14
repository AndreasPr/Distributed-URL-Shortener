import pytest

from mcp_server.errors import SourceError


def test_post_flag_report_disabled(monkeypatch):
    from mcp_server.sources import slack

    monkeypatch.setattr(slack, "settings", type("S", (), {"MCP_SLACK_POST_ENABLED": False, "SLACK_WEBHOOK_URL": None})())

    res = slack.post_flag_report({"short_code": "a", "reason": "x", "anomaly_metrics": {}})
    assert res["reason"] == "slack_disabled"


def test_post_flag_report_happy_and_failure(monkeypatch):
    from mcp_server.sources import slack

    monkeypatch.setattr(slack, "settings", type("S", (), {"MCP_SLACK_POST_ENABLED": True, "SLACK_WEBHOOK_URL": "http://example"})())

    # valid-ish report for the model
    report = {
        "short_code": "a",
        "long_url": "https://x",
        "reason": "suspicious",
        "anomaly_metrics": {
            "short_code": "a",
            "long_url": "https://x",
            "flagged": True,
            "reason": "r",
            "metrics": {
                "short_code": "a",
                "long_url": "https://x",
                "click_count": 10,
                "click_velocity": 1.0,
                "velocity_threshold": 2.0,
                "rate_limit_triggers": 0,
                "suspected_bot_pattern": False,
            },
        },
    }

    class FakeResp:
        def __init__(self, status_code=200, text="ok"):
            self.status_code = status_code
            self.text = text

    # monkeypatch httpx.post to return 200
    monkeypatch.setattr(slack.httpx, "post", lambda url, json, timeout: FakeResp(200))
    res = slack.post_flag_report(report)
    assert res["success"] is True

    # simulate webhook failure
    monkeypatch.setattr(slack.httpx, "post", lambda url, json, timeout: FakeResp(500, text="err"))
    with pytest.raises(SourceError) as exc:
        slack.post_flag_report(report)
    assert exc.value.message == "webhook_failed"

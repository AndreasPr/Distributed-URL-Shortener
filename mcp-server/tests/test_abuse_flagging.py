from mcp_server.workflows.abuse_flagging import CheckSuspiciousUrlActivityTool, _flag_thresholds


def test_flag_thresholds_detects_spike_and_rate_limit():
    click_stats = {
        "click_velocity": 24.0,
        "rolling_average_velocity": 2.0,
        "click_count": 20,
    }
    rate_signals = {
        "trigger_count": 8,
        "suspicious_pattern": True,
    }

    flagged, reason = _flag_thresholds(click_stats, rate_signals)

    assert flagged is True
    assert "velocity" in reason
    assert "rate limit" in reason
    assert "bot-like" in reason


def test_check_suspicious_url_activity_returns_expected_structure(monkeypatch):
    monkeypatch.setattr(
        "mcp_server.workflows.abuse_flagging.get_top_short_codes",
        lambda *args, **kwargs: ["abc123"],
    )
    monkeypatch.setattr(
        "mcp_server.workflows.abuse_flagging.get_click_stats",
        lambda short_code, window_minutes: {
            "short_code": short_code,
            "click_count": 1,
            "click_velocity": 0.1,
            "rolling_average_velocity": 0.1,
            "long_url": "https://example.com/test",
            "timestamps": [],
            "analysis_window_minutes": window_minutes,
        },
    )
    monkeypatch.setattr(
        "mcp_server.workflows.abuse_flagging.get_rate_limit_signals",
        lambda short_code, window_minutes: {
            "short_code": short_code,
            "trigger_count": 0,
            "suspicious_pattern": False,
            "window_minutes": window_minutes,
            "recent_triggers": [],
        },
    )
    monkeypatch.setattr(
        "mcp_server.workflows.abuse_flagging.get_cache_stats",
        lambda short_code: {"redis_available": True, "dbsize": 42, "cache_hit_ratio": 0.5},
    )
    monkeypatch.setattr(
        "mcp_server.workflows.abuse_flagging.get_recent_commits",
        lambda *args, **kwargs: {"commits": []},
    )
    monkeypatch.setattr(
        "mcp_server.workflows.abuse_flagging.post_flag_report",
        lambda report: {"success": True},
    )

    result = CheckSuspiciousUrlActivityTool().run(time_window_minutes=60)

    assert isinstance(result, dict)
    assert result["flagged_urls"] == []
    assert "No suspicious URLs" in result["why"]
    assert result["related_commits"] == []
    assert result["slack_status"] is None


def test_check_suspicious_url_activity_flags_abuse_and_posts_to_slack(monkeypatch):
    monkeypatch.setattr(
        "mcp_server.workflows.abuse_flagging.get_top_short_codes",
        lambda *args, **kwargs: ["abc123"],
    )
    monkeypatch.setattr(
        "mcp_server.workflows.abuse_flagging.get_click_stats",
        lambda short_code, window_minutes: {
            "short_code": short_code,
            "click_count": 50,
            "click_velocity": 30.0,
            "rolling_average_velocity": 1.0,
            "long_url": "https://example.com/spam",
            "timestamps": [],
            "analysis_window_minutes": window_minutes,
        },
    )
    monkeypatch.setattr(
        "mcp_server.workflows.abuse_flagging.get_rate_limit_signals",
        lambda short_code, window_minutes: {
            "short_code": short_code,
            "trigger_count": 10,
            "suspicious_pattern": True,
            "window_minutes": window_minutes,
            "recent_triggers": [],
        },
    )
    monkeypatch.setattr(
        "mcp_server.workflows.abuse_flagging.get_cache_stats",
        lambda short_code: {"redis_available": True, "dbsize": 128, "cache_hit_ratio": 0.76},
    )
    monkeypatch.setattr(
        "mcp_server.workflows.abuse_flagging.get_recent_commits",
        lambda *args, **kwargs: {"commits": []},
    )
    monkeypatch.setattr(
        "mcp_server.workflows.abuse_flagging.post_flag_report",
        lambda report: {"success": True, "message": "Slack report posted."},
    )

    result = CheckSuspiciousUrlActivityTool().run(time_window_minutes=60)

    assert isinstance(result, dict)
    assert len(result["flagged_urls"]) == 1
    assert result["slack_status"] == {"success": True, "message": "Slack report posted."}
    assert "Flagged suspicious URLs" in result["why"]

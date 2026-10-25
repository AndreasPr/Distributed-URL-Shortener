from mcp_server.workflows.abuse_flagging import assess


def signals(**kw):
    return dict(
        short_code="abc",
        sources_status={"analytics": "ok", "rate_limits": "ok"},
        click_count=20,
        click_velocity=2,
        rolling_average_velocity=0.1,
        rate_limit_rejections=8,
        **kw,
    )


def test_heuristic_detects_velocity_and_actual_rejections():
    result = assess(signals())
    assert result["flagged"] is True
    assert result["reasons"] == ["click_velocity", "rate_limit_rejections"]


def test_partial_failure_is_unknown_not_clean():
    data = signals()
    data["sources_status"]["rate_limits"] = "failed"
    data["rate_limit_rejections"] = None
    assert assess(data)["flagged"] is None

"""On-demand heuristic; unknown sources never become zero activity."""

from mcp_server.config import settings


def assess(signals):
    states = signals["sources_status"]
    if any(state != "ok" for state in states.values()):
        return {
            "short_code": signals["short_code"],
            "flagged": None,
            "reason": "incomplete_sources",
            "signals": signals,
            "sources_status": states,
        }
    reasons = []
    count = signals["click_count"]
    velocity = signals["click_velocity"]
    baseline = signals["rolling_average_velocity"]
    if count >= settings.ABNORMAL_VELOCITY_MIN_CLICKS and (
        baseline == 0 or velocity > baseline * settings.ABNORMAL_VELOCITY_MULTIPLIER
    ):
        reasons.append("click_velocity")
    if signals["rate_limit_rejections"] >= settings.RATE_LIMIT_TRIGGER_THRESHOLD:
        reasons.append("rate_limit_rejections")
    return {
        "short_code": signals["short_code"],
        "flagged": bool(reasons),
        "reasons": reasons,
        "heuristic": True,
        "signals": signals,
        "sources_status": states,
    }

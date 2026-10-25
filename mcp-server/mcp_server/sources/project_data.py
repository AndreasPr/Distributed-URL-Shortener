"""Compatibility helper: project data is exclusively obtained through the API."""

from mcp_server.api import request
from mcp_server.schemas import SignalsInput


def get_activity_signals(short_code: str, window_minutes: int = 60):
    args = SignalsInput(short_code=short_code, window_minutes=window_minutes)
    return request(
        "GET",
        f"/admin/activity/{args.short_code}",
        params={"window_minutes": args.window_minutes},
    )

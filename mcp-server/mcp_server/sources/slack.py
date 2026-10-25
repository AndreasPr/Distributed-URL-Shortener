"""Explicit opt-in notifications; never include destination URLs or free text."""

import httpx
from mcp_server.api import APIError
from mcp_server.config import settings
from mcp_server.schemas import SlackInput


def post_flag_report(report):
    if not settings.MCP_ALLOW_WRITE or not settings.MCP_SLACK_POST_ENABLED:
        raise APIError("slack_disabled")
    if not settings.SLACK_WEBHOOK_URL or not settings.SLACK_WEBHOOK_URL.startswith(
        "https://hooks.slack.com/services/"
    ):
        raise APIError("invalid_slack_configuration")
    args = SlackInput.model_validate(report)
    with httpx.Client(
        timeout=settings.MCP_HTTP_TIMEOUT_SECONDS,
        trust_env=False,
        follow_redirects=False,
    ) as client:
        response = client.post(
            settings.SLACK_WEBHOOK_URL,
            json={"text": f"URL review: {args.short_code}; decision: {args.decision}"},
        )
        if response.status_code != 200:
            raise APIError("slack_request_failed")
    return {"sent": True}

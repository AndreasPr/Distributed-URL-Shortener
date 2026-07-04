import json
import logging
from typing import Any

import httpx

from mcp_server.config import settings
from mcp_server.errors import SourceError
from mcp_server.models.report import SlackFlagReport

logger = logging.getLogger(__name__)


def post_flag_report(report: dict[str, Any]) -> dict[str, Any]:
    if not settings.MCP_SLACK_POST_ENABLED:
        return {
            "success": False,
            "reason": "slack_disabled",
            "message": "Slack reporting is not enabled. Set MCP_SLACK_POST_ENABLED=true to allow write actions.",
        }

    if not settings.SLACK_WEBHOOK_URL:
        raise SourceError("slack", "missing_webhook_url", details="SLACK_WEBHOOK_URL is required to post alerts.")

    try:
        payload = SlackFlagReport(**report).model_dump()
    except Exception as exc:
        logger.exception("Slack report validation failed")
        raise SourceError("slack", "invalid_report", details=str(exc))

    message_blocks = [
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*Abusive URL detected:* <{payload.get('anomaly_metrics', {}).get('long_url') or 'unknown'}|{payload['short_code']}>",
            },
        },
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": f"*Reason:* {payload['reason']}"},
                {"type": "mrkdwn", "text": f"*Click velocity:* {payload['anomaly_metrics']['metrics']['click_velocity']:.2f} clicks/sec"},
                {"type": "mrkdwn", "text": f"*Rate-limit triggers:* {payload['anomaly_metrics']['metrics']['rate_limit_triggers']}"},
                {"type": "mrkdwn", "text": f"*Suspected bot pattern:* {payload['anomaly_metrics']['metrics']['suspected_bot_pattern']}"},
            ],
        },
    ]

    if payload.get("related_commit"):
        commit = payload["related_commit"]
        message_blocks.append(
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Related commit:* <{commit['html_url']}|{commit['sha'][:7]}> - {commit['message']}"
                    if commit.get("html_url")
                    else f"*Related commit:* {commit['sha'][:7]} - {commit['message']}",
                },
            }
        )

    if payload.get("cache_stats"):
        cache = payload["cache_stats"]
        message_blocks.append(
            {
                "type": "context",
                "elements": [
                    {"type": "mrkdwn", "text": f"Redis available: {cache['redis_available']}, dbsize: {cache['dbsize']}"},
                ],
            }
        )

    try:
        response = httpx.post(settings.SLACK_WEBHOOK_URL, json={"blocks": message_blocks}, timeout=10.0)
        if response.status_code >= 300:
            raise SourceError(
                "slack",
                "webhook_failed",
                details={"status_code": response.status_code, "body": response.text},
            )

        return {"success": True, "message": "Slack report posted."}
    except SourceError:
        raise
    except Exception as exc:
        logger.exception("Slack webhook call failed")
        raise SourceError("slack", "webhook_error", details=str(exc))

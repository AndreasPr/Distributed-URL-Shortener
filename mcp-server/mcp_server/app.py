import os
import logging
from typing import Any, Dict

from mcp.server.fastmcp.server import FastMCP
from mcp.server.fastmcp.tools.base import Tool

from mcp_server.config import settings
from mcp_server.workflows.abuse_flagging import CheckSuspiciousUrlActivityTool
from mcp_server.sources.project_data import (
    get_click_stats,
    get_rate_limit_signals,
    get_cache_stats,
)
from mcp_server.sources.github import get_recent_commits
from mcp_server.sources.slack import post_flag_report

logger = logging.getLogger(__name__)

server = FastMCP(
    name="URL Shortener Abuse Detection",
    instructions="A tool server that checks suspicious URL activity and reports suspicious cases.",
    host=settings.MCP_HOST,
    port=settings.MCP_PORT,
    json_response=True,
    stateless_http=True,
)

@server.tool(
    name="CheckSuspiciousUrlActivityTool",
    title="Check Suspicious URL Activity",
    description="Analyze recent URL click patterns, correlate with recent GitHub changes, and optionally post a Slack report for flagged abuse.",
    structured_output=True,
)
def check_suspicious_url_activity(time_window_minutes: int = settings.MCP_ABUSE_WINDOW_MINUTES) -> dict[str, Any]:
    return CheckSuspiciousUrlActivityTool().run(time_window_minutes=time_window_minutes)

# Expose source tools for standalone data access.
@server.tool(
    name="GetProjectClickStatsTool",
    title="Get Project Click Stats",
    description="Fetch URL click count and velocity from project analytics data.",
    structured_output=True,
)
def get_project_click_stats(short_code: str, window_minutes: int = settings.MCP_ABUSE_WINDOW_MINUTES) -> dict[str, Any]:
    return get_click_stats(short_code=short_code, window_minutes=window_minutes)

@server.tool(
    name="GetRateLimitSignalsTool",
    title="Get Rate Limit Signals",
    description="Fetch rate-limit trigger counts and suspicious patterns from project Redis data.",
    structured_output=True,
)
def get_rate_limit_signals_tool(short_code: str, window_minutes: int = settings.MCP_ABUSE_WINDOW_MINUTES) -> dict[str, Any]:
    return get_rate_limit_signals(short_code=short_code, window_minutes=window_minutes)

@server.tool(
    name="GetCacheStatsTool",
    title="Get Cache Stats",
    description="Fetch Redis cache health and hit/miss metrics for the URL shortener.",
    structured_output=True,
)
def get_cache_stats_tool(short_code: str | None = None) -> dict[str, Any]:
    return get_cache_stats(short_code=short_code)

@server.tool(
    name="GetRecentGitHubCommitsTool",
    title="Get Recent GitHub Commits",
    description="Fetch recent commits and PR metadata for this repository.",
    structured_output=True,
)
def get_recent_github_commits_tool(window_minutes: int = settings.MCP_ABUSE_WINDOW_MINUTES, path_filter: str | None = None, limit: int = 20) -> dict[str, Any]:
    return get_recent_commits(window_minutes=window_minutes, path_filter=path_filter, limit=limit)

@server.tool(
    name="PostSlackFlagReportTool",
    title="Post Slack Flag Report",
    description="Send a flagged-URL report to Slack if Slack reporting is enabled.",
    structured_output=True,
)
def post_slack_flag_report_tool(report: dict) -> dict[str, Any]:
    return post_flag_report(report=report)


def main():
    server.run(transport="streamable-http")


if __name__ == "__main__":
    main()

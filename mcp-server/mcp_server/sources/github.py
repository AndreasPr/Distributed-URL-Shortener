"""Optional bounded commit context; correlation is heuristic, not causation."""

import re
from datetime import datetime, timedelta, timezone

import httpx
from mcp_server.api import APIError
from mcp_server.config import settings


def get_recent_commits(window_minutes=60, path_filter=None, limit=10):
    if not settings.MCP_GITHUB_ENABLED:
        raise APIError("github_disabled")
    repo = settings.GITHUB_REPOSITORY or ""
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repo):
        raise APIError("invalid_github_repository")
    headers = {"Accept": "application/vnd.github+json"}
    if settings.GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {settings.GITHUB_TOKEN}"
    since = datetime.now(timezone.utc) - timedelta(minutes=min(60, window_minutes))
    with httpx.Client(
        timeout=settings.MCP_GITHUB_TIMEOUT_SECONDS,
        trust_env=False,
        follow_redirects=False,
    ) as client:
        with client.stream(
            "GET",
            f"https://api.github.com/repos/{repo}/commits",
            headers=headers,
            params={"since": since.isoformat(), "per_page": min(10, limit)},
        ) as response:
            if response.status_code != 200:
                raise APIError("github_request_failed")
            data = bytearray()
            for chunk in response.iter_bytes():
                data.extend(chunk)
                if len(data) > 131072:
                    raise APIError("response_too_large")
    import json

    rows = json.loads(data)
    # Commit messages are untrusted free text; omit them from tool output.
    commits = [
        {"sha": row["sha"]}
        for row in rows[: min(10, limit)]
        if re.fullmatch(r"[a-f0-9]{40}", row.get("sha", ""))
    ]
    return {"commits": commits, "correlation": "heuristic_context_only"}

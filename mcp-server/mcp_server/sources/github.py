import datetime
import json
import logging
import re
import subprocess
from pathlib import Path
from typing import Any

import httpx

from mcp_server.config import settings
from mcp_server.errors import SourceError
from mcp_server.models.commit import CommitSummary

logger = logging.getLogger(__name__)


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _parse_github_repo(remote_url: str) -> str | None:
    ssh_match = re.match(r"git@github\.com:(?P<owner>[^/]+)/(?P<repo>[^.]+)(?:\.git)?$", remote_url)
    if ssh_match:
        return f"{ssh_match.group('owner')}/{ssh_match.group('repo')}"

    https_match = re.match(r"https://github\.com/(?P<owner>[^/]+)/(?P<repo>[^.]+)(?:\.git)?$", remote_url)
    if https_match:
        return f"{https_match.group('owner')}/{https_match.group('repo')}"

    return None


def _resolve_repository() -> str:
    env_repo = getattr(settings, "GITHUB_REPOSITORY", None)
    if env_repo:
        return env_repo

    try:
        repo_root = _repo_root()
        remote_url = subprocess.check_output(
            ["git", "config", "--get", "remote.origin.url"],
            cwd=str(repo_root),
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
        repo = _parse_github_repo(remote_url)
        if repo:
            return repo
    except Exception as exc:
        logger.warning("Unable to resolve GitHub repository from git remote: %s", exc)

    raise SourceError(
        "github",
        "repository_resolution_failed",
        details="Set GITHUB_REPOSITORY or ensure git remote origin is configured.",
    )


def _format_utc_iso(ts: datetime.datetime) -> str:
    return ts.astimezone(datetime.timezone.utc).isoformat().replace("+00:00", "Z")


def get_recent_commits(
    window_minutes: int = settings.MCP_ABUSE_WINDOW_MINUTES,
    path_filter: str | None = None,
    limit: int = 20,
) -> dict[str, Any]:
    if not settings.GITHUB_TOKEN:
        raise SourceError("github", "missing_github_token", details="GITHUB_TOKEN is required")

    repo = _resolve_repository()
    since = _format_utc_iso(datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=window_minutes))
    url = f"https://api.github.com/repos/{repo}/commits"
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {settings.GITHUB_TOKEN}",
        "User-Agent": "url-shortener-mcp/1.0",
    }

    params: dict[str, Any] = {"since": since, "per_page": min(limit, 100)}
    if path_filter:
        params["path"] = path_filter

    try:
        with httpx.Client(timeout=settings.MCP_GITHUB_TIMEOUT_SECONDS) as client:
            response = client.get(url, headers=headers, params=params)
            if response.status_code == 403:
                details = {
                    "status_code": 403,
                    "retry_after": response.headers.get("Retry-After"),
                    "message": response.text,
                }
                raise SourceError("github", "rate_limited", details=details)
            if response.status_code >= 400:
                raise SourceError(
                    "github",
                    "request_failed",
                    details={"status_code": response.status_code, "body": response.text},
                )

            commits_data = response.json()
    except SourceError:
        raise
    except Exception as exc:
        logger.exception("GitHub commit lookup failed")
        raise SourceError("github", "request_error", details=str(exc))

    commits: list[CommitSummary] = []
    for raw in commits_data[:limit]:
        commit_info = raw.get("commit", {})
        author_info = commit_info.get("author", {})
        timestamp = author_info.get("date")
        if not timestamp:
            timestamp = commit_info.get("committer", {}).get("date")

        commit = CommitSummary(
            sha=raw.get("sha", ""),
            message=commit_info.get("message", ""),
            author=author_info.get("name") or raw.get("author", {}).get("login"),
            timestamp=_format_utc_iso(datetime.datetime.fromisoformat(timestamp.replace("Z", "+00:00"))) if timestamp else "",
            html_url=raw.get("html_url"),
            files_changed=[],
        )
        if commit.sha:
            try:
                details_url = f"https://api.github.com/repos/{repo}/commits/{commit.sha}"
                detail_response = client.get(details_url, headers=headers, timeout=settings.MCP_GITHUB_TIMEOUT_SECONDS)
                if detail_response.status_code == 200:
                    detail_json = detail_response.json()
                    commit.files_changed = [file.get("filename", "") for file in detail_json.get("files", [])]
            except Exception:
                logger.warning("Failed to fetch commit detail for %s", commit.sha)
        commits.append(commit)

    return {"commits": [commit.model_dump() for commit in commits]}

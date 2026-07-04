import datetime
import logging
from typing import Any

from mcp_server.config import settings
from mcp_server.models.anomaly import AnomalyMetrics, AnomalyResult
from mcp_server.models.commit import CommitSummary
from mcp_server.models.report import AbuseFlaggingResult, SlackFlagReport
from mcp_server.sources.github import get_recent_commits
from mcp_server.sources.project_data import (
    get_cache_stats,
    get_click_stats,
    get_rate_limit_signals,
    get_top_short_codes,
)
from mcp_server.sources.slack import post_flag_report
from mcp_server.errors import SourceError

logger = logging.getLogger(__name__)


def _utc_now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


def _format_utc_iso(dt: datetime.datetime) -> str:
    return dt.astimezone(datetime.timezone.utc).isoformat().replace("+00:00", "Z")


def _flag_thresholds(click_stats: dict[str, Any], rate_signals: dict[str, Any]) -> tuple[bool, str]:
    velocity_multiplier = settings.ABNORMAL_VELOCITY_MULTIPLIER
    min_clicks = settings.ABNORMAL_VELOCITY_MIN_CLICKS
    rate_limit_threshold = settings.RATE_LIMIT_TRIGGER_THRESHOLD

    click_velocity = click_stats.get("click_velocity", 0.0)
    baseline_velocity = click_stats.get("rolling_average_velocity", 0.0)
    click_count = click_stats.get("click_count", 0)
    trigger_count = rate_signals.get("trigger_count", 0)
    suspicious_bot = rate_signals.get("suspicious_pattern", False)

    reasons: list[str] = []
    if baseline_velocity > 0 and click_velocity > baseline_velocity * velocity_multiplier:
        reasons.append(
            f"velocity {click_velocity:.2f} > {velocity_multiplier}x baseline ({baseline_velocity:.2f})"
        )
    elif baseline_velocity <= 0 and click_count >= min_clicks:
        reasons.append(f"velocity spike: {click_count} clicks in window with little prior history")

    if trigger_count >= rate_limit_threshold:
        reasons.append(f"rate limit triggered {trigger_count} times")
    if suspicious_bot:
        reasons.append("bot-like request pattern detected")

    if reasons:
        return True, "; ".join(reasons)
    return False, "no abnormal activity detected"


def _select_correlated_commit(commits: list[CommitSummary]) -> CommitSummary | None:
    for commit in commits:
        files = [file.lower() for file in commit.files_changed or []]
        if any(path in files for path in ["rate_limiter", "middleware", "routes.py", "redirect"]):
            return commit
    return commits[0] if commits else None


class CheckSuspiciousUrlActivityTool:
    def run(self, time_window_minutes: int = settings.MCP_ABUSE_WINDOW_MINUTES) -> dict[str, Any]:
        now = _utc_now()
        window_start = now - datetime.timedelta(minutes=time_window_minutes)

        try:
            commits_response = get_recent_commits(window_minutes=time_window_minutes, path_filter=None, limit=20)
            commits = [CommitSummary.model_validate(c) for c in commits_response.get("commits", [])]
        except SourceError as exc:
            commits = []
            logger.warning("GitHub source failed during abuse flagging: %s", exc.to_dict())

        flagged_urls: list[AnomalyResult] = []
        slack_status: dict[str, str] | None = None

        try:
            suspicious_short_codes = get_top_short_codes(window_minutes=time_window_minutes, limit=5)
        except SourceError as exc:
            suspicious_short_codes = []
            logger.warning("Failed to fetch top short codes: %s", exc.to_dict())

        for short_code in suspicious_short_codes:
            click_stats = {}
            rate_signals = {}
            cache_stats = {}
            try:
                click_stats = get_click_stats(short_code=short_code, window_minutes=time_window_minutes)
            except SourceError as exc:
                logger.warning("click stats failed for %s: %s", short_code, exc.to_dict())
                click_stats = {"short_code": short_code, "click_count": 0, "click_velocity": 0.0}

            try:
                rate_signals = get_rate_limit_signals(short_code=short_code, window_minutes=time_window_minutes)
            except SourceError as exc:
                logger.warning("rate limit signals failed for %s: %s", short_code, exc.to_dict())
                rate_signals = {"short_code": short_code, "trigger_count": 0, "suspicious_pattern": False}

            try:
                cache_stats = get_cache_stats(short_code=short_code)
            except SourceError as exc:
                logger.warning("cache stats failed: %s", exc.to_dict())
                cache_stats = {"redis_available": False}

            flagged, reason = _flag_thresholds(click_stats, rate_signals)
            anomaly = AnomalyResult(
                short_code=short_code,
                long_url=click_stats.get("long_url"),
                flagged=flagged,
                reason=reason,
                metrics=AnomalyMetrics(
                    short_code=short_code,
                    long_url=click_stats.get("long_url"),
                    click_count=click_stats.get("click_count", 0),
                    click_velocity=click_stats.get("click_velocity", 0.0),
                    velocity_threshold=settings.ABNORMAL_VELOCITY_MULTIPLIER,
                    rate_limit_triggers=rate_signals.get("trigger_count", 0),
                    suspected_bot_pattern=rate_signals.get("suspicious_pattern", False),
                    cache_hit_ratio=None,
                ),
            )

            if anomaly.flagged:
                flagged_urls.append(anomaly)

                related_commit = _select_correlated_commit(commits)
                report = SlackFlagReport(
                    short_code=short_code,
                    long_url=click_stats.get("long_url"),
                    reason=anomaly.reason,
                    anomaly_metrics=anomaly,
                    related_commit=related_commit,
                    cache_stats=cache_stats if cache_stats else None,
                ).model_dump()
                try:
                    slack_status = post_flag_report(report)
                except SourceError as exc:
                    logger.warning("Slack post failed: %s", exc.to_dict())
                    slack_status = exc.to_dict()

        why = (
            "Flagged suspicious URLs based on abnormal velocity and rate-limit behavior."
            if flagged_urls
            else "No suspicious URLs detected in the requested window."
        )

        return AbuseFlaggingResult(
            flagged_urls=flagged_urls,
            why=why,
            related_commits=[commit for commit in commits],
            slack_status=slack_status,
        ).model_dump()

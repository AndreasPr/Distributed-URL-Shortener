from typing import Any

from pydantic import BaseModel
from mcp_server.models.anomaly import AnomalyResult
from mcp_server.models.commit import CommitSummary
from mcp_server.models.metrics import CacheStats


class SlackFlagReport(BaseModel):
    short_code: str
    long_url: str | None = None
    reason: str
    anomaly_metrics: AnomalyResult
    related_commit: CommitSummary | None = None
    cache_stats: CacheStats | None = None


class AbuseFlaggingResult(BaseModel):
    flagged_urls: list[AnomalyResult]
    why: str
    related_commits: list[CommitSummary] = []
    slack_status: dict[str, Any] | None = None

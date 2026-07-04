from pydantic import BaseModel


class AnomalyMetrics(BaseModel):
    short_code: str
    long_url: str | None = None
    click_count: int
    click_velocity: float
    rolling_average_velocity: float | None = None
    velocity_threshold: float
    rate_limit_triggers: int
    suspected_bot_pattern: bool
    cache_hit_ratio: float | None = None


class AnomalyResult(BaseModel):
    short_code: str
    long_url: str | None = None
    flagged: bool
    reason: str
    metrics: AnomalyMetrics

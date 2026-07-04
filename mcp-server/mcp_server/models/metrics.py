from pydantic import BaseModel


class ClickStats(BaseModel):
    short_code: str
    click_count: int
    click_velocity: float
    timestamps: list[str]
    analysis_window_minutes: int
    rolling_average_velocity: float | None = None
    long_url: str | None = None


class RateLimitSignals(BaseModel):
    short_code: str
    trigger_count: int
    suspicious_pattern: bool
    window_minutes: int
    recent_triggers: list[str]


class CacheStats(BaseModel):
    redis_available: bool
    dbsize: int | None = None
    cache_hit_ratio: float | None = None
    short_code: str | None = None

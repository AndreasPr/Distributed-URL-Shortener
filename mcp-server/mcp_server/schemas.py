from datetime import datetime, timezone
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator

Code = Annotated[str, Field(pattern=r"^[A-Za-z0-9_-]{1,32}$", max_length=32)]


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class CodeInput(Input):
    short_code: Code


class CreateInput(Input):
    long_url: HttpUrl = Field(max_length=2048)
    custom_alias: Annotated[str, Field(pattern=r"^[A-Za-z0-9_-]{3,32}$")] | None = None
    expires_at: datetime | None = None

    @field_validator("long_url")
    @classmethod
    def no_credentials(cls, value):
        if value.username is not None or value.password is not None:
            raise ValueError("URL credentials forbidden")
        return value

    @field_validator("expires_at")
    @classmethod
    def future(cls, value):
        if value and (value.tzinfo is None or value <= datetime.now(timezone.utc)):
            raise ValueError("Expiry must be a future timezone-aware timestamp")
        return value


class ListInput(Input):
    limit: int = Field(20, ge=1, le=50)
    offset: int = Field(0, ge=0, le=10000)


class ReviewInput(CodeInput):
    decision: Literal["allow", "block"]


class SignalsInput(CodeInput):
    window_minutes: int = Field(60, ge=1, le=60)


class SlackInput(CodeInput):
    # Do not accept arbitrary reports, Slack markup or URL text from tools.
    decision: Literal["allow", "block"]


class EmptyInput(Input):
    pass


class Output(BaseModel):
    # Upstream fields outside the contract are discarded, never forwarded.
    model_config = ConfigDict(extra="ignore")


class Created(Output):
    short_code: Code


class AnalyticsResult(Created):
    total_clicks: int = Field(ge=0)
    timestamps: list[datetime] = Field(max_length=1000)


class StatusResult(Created):
    status: Literal["active", "deleted", "expired", "blocked"]
    expires_at: datetime | None
    verdict: Literal["pending", "clean", "suspicious", "malicious"]


class FlaggedResult(Created):
    verdict: Literal["suspicious", "malicious"]
    score: float = Field(ge=0, le=1)
    reasons: list[Annotated[str, Field(max_length=64)]] = Field(max_length=16)
    source: Literal["heuristic", "llm", "combined"]
    created_at: datetime


class SourceStates(Output):
    analytics: Literal["ok", "failed", "skipped"]
    rate_limits: Literal["ok", "failed", "skipped"]


class SignalsResult(Created):
    window_minutes: int = Field(ge=1, le=60)
    window_start: datetime
    window_end: datetime
    click_count: int | None = Field(ge=0)
    click_velocity: float | None = Field(ge=0)
    rolling_average_velocity: float | None = Field(ge=0)
    rate_limit_rejections: int | None = Field(ge=0)
    sources_status: SourceStates
    coverage: Literal["best_effort_since_deployment; completed_minutes; async_clicks"]

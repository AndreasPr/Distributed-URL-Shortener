"""Environment only: never implicitly load private files from the working directory."""

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class MCPSettings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore")
    MCP_API_BASE_URL: str = "http://localhost:8000"
    MCP_API_KEY: str = ""
    MCP_ALLOW_WRITE: bool = False
    MCP_HTTP_TIMEOUT_SECONDS: float = Field(default=10, gt=0, le=60)
    MCP_GITHUB_ENABLED: bool = False
    MCP_SLACK_POST_ENABLED: bool = False
    GITHUB_TOKEN: str | None = None
    GITHUB_REPOSITORY: str | None = None
    SLACK_WEBHOOK_URL: str | None = None
    MCP_ABUSE_WINDOW_MINUTES: int = Field(default=60, ge=1, le=60)
    MCP_GITHUB_TIMEOUT_SECONDS: int = 10
    ABNORMAL_VELOCITY_MULTIPLIER: float = 3.0
    ABNORMAL_VELOCITY_MIN_CLICKS: int = 10
    RATE_LIMIT_TRIGGER_THRESHOLD: int = 5
    SUSPECTED_BOT_PATTERN_THRESHOLD: int = 10

    @field_validator("MCP_ALLOW_WRITE", mode="before")
    @classmethod
    def explicit_write_opt_in(cls, value):
        if isinstance(value, bool):
            return value
        if isinstance(value, str) and value.lower() in {"true", "false"}:
            return value.lower() == "true"
        raise ValueError("MCP_ALLOW_WRITE must be true or false")


settings = MCPSettings()

import os
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class MCPSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    GITHUB_TOKEN: str | None = Field(None)
    SLACK_WEBHOOK_URL: str | None = Field(None)
    MCP_SLACK_POST_ENABLED: bool = Field(False)
    MCP_ABUSE_WINDOW_MINUTES: int = Field(60)
    MCP_GITHUB_TIMEOUT_SECONDS: int = Field(10)
    MCP_HOST: str = Field("127.0.0.1")
    MCP_PORT: int = Field(8001)
    GITHUB_REPOSITORY: str | None = Field(None)

    ABNORMAL_VELOCITY_MULTIPLIER: float = Field(3.0)
    ABNORMAL_VELOCITY_MIN_CLICKS: int = Field(10)
    BASELINE_HISTORY_MINUTES: int = Field(1440)
    RATE_LIMIT_TRIGGER_THRESHOLD: int = Field(5)
    SUSPECTED_BOT_PATTERN_THRESHOLD: int = Field(10)


settings = MCPSettings()

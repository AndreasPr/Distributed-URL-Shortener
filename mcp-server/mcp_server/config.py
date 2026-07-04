import os
from pydantic import Field
from pydantic_settings import BaseSettings


class MCPSettings(BaseSettings):
    GITHUB_TOKEN: str | None = Field(None, env="GITHUB_TOKEN")
    SLACK_WEBHOOK_URL: str | None = Field(None, env="SLACK_WEBHOOK_URL")
    MCP_SLACK_POST_ENABLED: bool = Field(False, env="MCP_SLACK_POST_ENABLED")
    MCP_ABUSE_WINDOW_MINUTES: int = Field(60, env="MCP_ABUSE_WINDOW_MINUTES")
    MCP_GITHUB_TIMEOUT_SECONDS: int = Field(10, env="MCP_GITHUB_TIMEOUT_SECONDS")
    MCP_HOST: str = Field("127.0.0.1", env="MCP_HOST")
    MCP_PORT: int = Field(8001, env="MCP_PORT")
    GITHUB_REPOSITORY: str | None = Field(None, env="GITHUB_REPOSITORY")

    ABNORMAL_VELOCITY_MULTIPLIER: float = Field(3.0, env="MCP_ABNORMAL_VELOCITY_MULTIPLIER")
    ABNORMAL_VELOCITY_MIN_CLICKS: int = Field(10, env="MCP_ABNORMAL_VELOCITY_MIN_CLICKS")
    BASELINE_HISTORY_MINUTES: int = Field(1440, env="MCP_BASELINE_HISTORY_MINUTES")
    RATE_LIMIT_TRIGGER_THRESHOLD: int = Field(5, env="MCP_RATE_LIMIT_TRIGGER_THRESHOLD")
    SUSPECTED_BOT_PATTERN_THRESHOLD: int = Field(10, env="MCP_SUSPECTED_BOT_PATTERN_THRESHOLD")

    class Config:
        env_file = ".env"


settings = MCPSettings()

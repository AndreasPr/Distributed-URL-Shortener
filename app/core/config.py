import ipaddress
import math
import os
from urllib.parse import urlsplit


class Settings:
    ABUSE_TOPIC = os.getenv("ABUSE_TOPIC", "url-created")
    ABUSE_GROUP = os.getenv("ABUSE_GROUP", "abuse-group")
    ABUSE_DLQ_TOPIC = os.getenv("ABUSE_DLQ_TOPIC", "abuse-dlq")
    ABUSE_GRAY_LOW = float(os.getenv("ABUSE_GRAY_LOW", "0.15"))
    ABUSE_GRAY_HIGH = float(os.getenv("ABUSE_GRAY_HIGH", "0.65"))
    ABUSE_VERDICT_TTL = int(os.getenv("ABUSE_VERDICT_TTL", "3600"))
    ABUSE_LLM_INPUT_LIMIT = int(os.getenv("ABUSE_LLM_INPUT_LIMIT", "512"))
    ABUSE_METRICS_PORT = int(os.getenv("ABUSE_METRICS_PORT", "8003"))
    if not 0 <= ABUSE_GRAY_LOW < ABUSE_GRAY_HIGH <= 1:
        raise ValueError("Invalid abuse gray-zone thresholds")
    if ABUSE_VERDICT_TTL <= 0 or not 64 <= ABUSE_LLM_INPUT_LIMIT <= 2048:
        raise ValueError("Invalid abuse cache/input limits")
    LLM_PROVIDER = os.getenv("LLM_PROVIDER", "fake")
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MIN_INTERVAL_SECONDS = float(os.getenv("GEMINI_MIN_INTERVAL_SECONDS", "5"))
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "")
    OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "")
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
    ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "")
    LLM_CONCURRENCY = int(os.getenv("LLM_CONCURRENCY", "2"))
    LLM_DAILY_BUDGET = int(os.getenv("LLM_DAILY_BUDGET", "100"))
    LLM_TIMEOUT_SECONDS = float(os.getenv("LLM_TIMEOUT_SECONDS", "15"))
    LLM_MAX_RETRIES = int(os.getenv("LLM_MAX_RETRIES", "2"))
    LLM_BACKOFF_SECONDS = float(os.getenv("LLM_BACKOFF_SECONDS", "0.25"))
    LLM_MAX_OUTPUT_TOKENS = int(os.getenv("LLM_MAX_OUTPUT_TOKENS", "512"))
    if LLM_PROVIDER not in {"fake", "gemini", "ollama", "claude"}:
        raise ValueError("Invalid LLM_PROVIDER")
    if (
        LLM_CONCURRENCY < 1
        or LLM_DAILY_BUDGET < 0
        or not 0 <= LLM_MAX_RETRIES <= 5
        or LLM_MAX_OUTPUT_TOKENS < 1
    ):
        raise ValueError("Invalid LLM limits")
    for duration in (
        LLM_TIMEOUT_SECONDS,
        LLM_BACKOFF_SECONDS,
        GEMINI_MIN_INTERVAL_SECONDS,
    ):
        if not math.isfinite(duration) or duration <= 0:
            raise ValueError("LLM durations must be finite and positive")
    OTEL_EXPORTER_OTLP_ENDPOINT = os.getenv(
        "OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318"
    )
    ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
    MAX_REQUEST_BODY_BYTES = int(os.getenv("MAX_REQUEST_BODY_BYTES", "16384"))
    if MAX_REQUEST_BODY_BYTES <= 0:
        raise ValueError("MAX_REQUEST_BODY_BYTES must be positive")
    # Accept DATABASE_URL or DB_URL for local Docker Desktop / Kubernetes deployments
    DB_URL: str = os.environ.get("DATABASE_URL") or os.environ.get(
        "DB_URL", "postgresql://user:pass@localhost:5433/url_db"
    )
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9094")
    EVENT_BUS = os.getenv("EVENT_BUS", "kafka")
    EVENT_TOPIC = os.getenv("EVENT_TOPIC", "url-events")
    EVENT_DLQ_TOPIC = os.getenv("EVENT_DLQ_TOPIC", "url-events-dlq")
    EVENT_CONSUMER_GROUP = os.getenv("EVENT_CONSUMER_GROUP", "analytics-group")
    EVENT_BATCH_SIZE = int(os.getenv("EVENT_BATCH_SIZE", "100"))
    EVENT_FLUSH_INTERVAL = float(os.getenv("EVENT_FLUSH_INTERVAL", "5"))
    EVENT_PUBLISH_ATTEMPTS = int(os.getenv("EVENT_PUBLISH_ATTEMPTS", "60"))
    EVENT_QUEUE_SIZE = int(os.getenv("EVENT_QUEUE_SIZE", "1000"))
    EVENT_RETRY_BACKOFF = float(os.getenv("EVENT_RETRY_BACKOFF", "0.25"))
    EVENT_CLAIM_IDLE_MS = int(os.getenv("EVENT_CLAIM_IDLE_MS", "60000"))
    EVENT_METRICS_PORT = int(os.getenv("EVENT_METRICS_PORT", "8001"))
    if EVENT_BUS not in {"kafka", "redis_streams", "memory"}:
        raise ValueError("EVENT_BUS must be kafka, redis_streams or memory")
    if (
        min(
            EVENT_BATCH_SIZE,
            EVENT_FLUSH_INTERVAL,
            EVENT_QUEUE_SIZE,
            EVENT_PUBLISH_ATTEMPTS,
            EVENT_RETRY_BACKOFF,
            EVENT_CLAIM_IDLE_MS,
        )
        <= 0
    ):
        raise ValueError(
            "Event queue, batch, timer and retry settings must be positive"
        )
    if EVENT_TOPIC == EVENT_DLQ_TOPIC:
        raise ValueError("Event and dead-letter topics must differ")
    if len({ABUSE_TOPIC, ABUSE_DLQ_TOPIC, EVENT_TOPIC, EVENT_DLQ_TOPIC}) != 4:
        raise ValueError("Abuse and analytics topics must differ")
    WRITE_RATE_CAPACITY = int(os.getenv("WRITE_RATE_CAPACITY", "20"))
    WRITE_RATE_REFILL = float(os.getenv("WRITE_RATE_REFILL", "1"))
    REDIRECT_RATE_CAPACITY = int(os.getenv("REDIRECT_RATE_CAPACITY", "120"))
    REDIRECT_RATE_REFILL = float(os.getenv("REDIRECT_RATE_REFILL", "10"))
    TRUSTED_PROXIES = [
        value.strip()
        for value in os.getenv("TRUSTED_PROXIES", "").split(",")
        if value.strip()
    ]
    METRICS_PORT = int(os.getenv("METRICS_PORT", "0"))
    for network in TRUSTED_PROXIES:
        ipaddress.ip_network(network, strict=False)
    for rate in (
        WRITE_RATE_CAPACITY,
        WRITE_RATE_REFILL,
        REDIRECT_RATE_CAPACITY,
        REDIRECT_RATE_REFILL,
    ):
        if not math.isfinite(rate) or rate <= 0:
            raise ValueError("Rate capacities/refill rates must be finite and positive")
    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:3000,http://localhost:3001,"
            "http://localhost:3002,http://localhost:3003,"
            "http://127.0.0.1:3000,http://127.0.0.1:3001,"
            "http://127.0.0.1:3002,http://127.0.0.1:3003",
        ).split(",")
        if origin.strip()
    ]

    for origin in CORS_ORIGINS:
        parsed = urlsplit(origin)
        if (
            "*" in origin
            or parsed.scheme not in {"http", "https"}
            or not parsed.hostname
            or parsed.username
            or parsed.password
            or parsed.path
            or parsed.query
            or parsed.fragment
        ):
            raise ValueError("CORS_ORIGINS must contain exact HTTP(S) origins")
    if ENVIRONMENT == "production" and not os.getenv("CORS_ORIGINS"):
        raise ValueError("Production requires explicit CORS_ORIGINS")

    if DB_URL.startswith("sqlite"):
        raise ValueError(
            "SQLite is not supported; configure Postgres via DB_URL or DATABASE_URL."
        )


settings = Settings()

import ipaddress
import math
import os
from urllib.parse import urlsplit


class Settings:
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

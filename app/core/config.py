import os


class Settings:
    # Accept DATABASE_URL or DB_URL for local Docker Desktop / Kubernetes deployments
    DB_URL = os.getenv("DATABASE_URL") or os.getenv(
        "DB_URL", "postgresql://user:pass@localhost:5433/url_db"
    )
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9094")
    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003," \
            "http://127.0.0.1:3000,http://127.0.0.1:3001,http://127.0.0.1:3002,http://127.0.0.1:3003",
        ).split(",")
        if origin.strip()
    ]

    if DB_URL.startswith("sqlite"):
        raise ValueError(
            "SQLite is not supported; configure Postgres via DB_URL or DATABASE_URL."
        )


settings = Settings()

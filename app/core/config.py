import os


class Settings:
    # Accept DATABASE_URL (Railway) or DB_URL (local/custom)
    DB_URL = os.getenv("DATABASE_URL") or os.getenv("DB_URL", "postgresql://user:pass@localhost:5433/url_db")
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9094")

    if DB_URL.startswith("sqlite"):
        raise ValueError("SQLite is not supported; configure Postgres via DB_URL or DATABASE_URL.")


settings = Settings()

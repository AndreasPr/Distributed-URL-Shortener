"""Portable migration checks plus opt-in real PostgreSQL validation."""

import io
from pathlib import Path

import pytest
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import IntegrityError

from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from app.models.analytics import Analytics
from app.models.url import Base

ROOT = Path(__file__).resolve().parents[1]


def config(connection=None):
    cfg = Config(str(ROOT / "alembic.ini"))
    if connection is not None:
        cfg.attributes["connection"] = connection
    return cfg


def assert_matches_models(connection):
    assert Analytics.__table__.metadata is Base.metadata
    ctx = MigrationContext.configure(
        connection, opts={"compare_type": True, "compare_server_default": True}
    )
    assert compare_metadata(ctx, Base.metadata) == []


def test_migrations_on_empty_sqlite():
    # SQLite is a unit-test surrogate, not a supported application database.
    engine = create_engine("sqlite://")
    try:
        with engine.begin() as connection:
            connection.exec_driver_sql("PRAGMA foreign_keys=ON")
            command.upgrade(config(connection), "head")
            assert_matches_models(connection)
            assert (
                connection.scalar(text("SELECT version_num FROM alembic_version"))
                == "0005"
            )
    finally:
        engine.dispose()


def test_offline_sql_uses_postgresql_settings(monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "DB_URL", "postgresql://unused@localhost/unused")
    output = io.StringIO()
    cfg = config()
    cfg.output_buffer = output
    command.upgrade(cfg, "head", sql=True)
    sql = output.getvalue()
    assert "SERIAL" in sql
    assert "WHERE event_id IS NOT NULL" in sql
    assert "FOREIGN KEY(short_code)" in sql
    assert "ON DELETE CASCADE" in sql


@pytest.mark.docker
def test_postgresql_upgrade_schema_constraints_and_downgrade(postgres):
    with postgres.begin() as connection:
        cfg = config(connection)
        command.upgrade(cfg, "0001")
        inspector = inspect(connection)
        assert {c["name"] for c in inspector.get_columns("urls")} == {
            "id",
            "short_code",
            "long_url",
            "created_at",
        }
        assert {c["name"] for c in inspector.get_columns("analytics")} == {
            "id",
            "short_code",
            "clicked_at",
        }
        connection.execute(
            text(
                "INSERT INTO urls (short_code, long_url) VALUES ('abc', 'https://example.com')"
            )
        )
        connection.execute(text("INSERT INTO analytics (short_code) VALUES ('abc')"))
        command.upgrade(cfg, "head")
        command.upgrade(cfg, "head")  # Repeated deployment is a no-op.
        assert_matches_models(connection)
        assert connection.scalar(text("SELECT count(*) FROM analytics")) == 1
        assert connection.scalar(text("SELECT expires_at FROM urls")) is None
        indexes = {i["name"]: i for i in inspect(connection).get_indexes("analytics")}
        assert indexes["idx_analytics_short_code_clicked_at"]["column_names"] == [
            "short_code",
            "clicked_at",
        ]
        assert indexes["idx_analytics_short_code_clicked_at"]["column_sorting"] == {
            "clicked_at": ("desc",),
        }
        assert indexes["uq_analytics_event_id"]["unique"]
        assert (
            "event_id IS NOT NULL"
            in indexes["uq_analytics_event_id"]["dialect_options"]["postgresql_where"]
        )
        connection.execute(
            text(
                "INSERT INTO analytics (short_code, event_id) VALUES "
                "('abc', NULL), ('abc', NULL), ('abc', 'event-1')"
            )
        )
        for statement in [
            "INSERT INTO analytics (short_code, event_id) VALUES ('abc', 'event-1')",
            "INSERT INTO analytics (short_code) VALUES ('missing')",
            "INSERT INTO analytics (short_code) VALUES (NULL)",
            "INSERT INTO urls (short_code, long_url) VALUES ('abc', 'https://example.org')",
        ]:
            with pytest.raises(IntegrityError):
                with connection.begin_nested():
                    connection.execute(text(statement))
        command.downgrade(cfg, "0001")
        assert connection.scalar(text("SELECT count(*) FROM analytics")) == 4
        assert "event_id" not in {
            c["name"] for c in inspect(connection).get_columns("analytics")
        }
        command.upgrade(cfg, "head")
        assert_matches_models(connection)
        connection.execute(text("DELETE FROM urls WHERE short_code='abc'"))
        assert connection.scalar(text("SELECT count(*) FROM analytics")) == 0
        command.downgrade(cfg, "base")
        assert set(inspect(connection).get_table_names()) == {"alembic_version"}


@pytest.mark.docker
def test_legacy_schema_can_be_stamped_and_upgraded(postgres):
    with postgres.begin() as connection:
        # The archived SQL is an independent oracle for the original deployment.
        connection.exec_driver_sql((ROOT / "scripts/migrate.sql").read_text())
        connection.execute(
            text(
                "INSERT INTO urls (short_code, long_url) VALUES ('old', 'https://example.com')"
            )
        )
        cfg = config(connection)
        command.stamp(cfg, "0001")
        command.upgrade(cfg, "head")
        assert_matches_models(connection)
        assert connection.scalar(text("SELECT short_code FROM urls")) == "old"

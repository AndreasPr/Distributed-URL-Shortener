"""Protect runtime behavior touched while adding static typing."""

import logging

import pytest
from sqlalchemy import TIMESTAMP, Integer, String, Text

from app.models.analytics import Analytics
from app.models.url import URL
from app.observability.logging import configure_logging_with_tracing


def test_typed_models_preserve_column_types_and_nullability():
    expected = {
        URL: {
            "id": (Integer, False),
            "short_code": (String, True),
            "long_url": (Text, False),
            "created_at": (TIMESTAMP, True),
        },
        Analytics: {
            "id": (Integer, False),
            "short_code": (String, True),
            "clicked_at": (TIMESTAMP, True),
        },
    }
    for model, columns in expected.items():
        for name, (kind, nullable) in columns.items():
            column = model.__table__.columns[name]
            assert isinstance(column.type, kind)
            assert column.nullable is nullable
    assert URL.__table__.columns.short_code.unique
    assert URL.__table__.columns.short_code.type.length == 10
    assert URL.__table__.columns.created_at.server_default is not None
    assert Analytics.__table__.columns.clicked_at.server_default is not None


def test_trace_logging_preserves_message_for_default_formatter(monkeypatch):
    logger = logging.Logger("isolated-test")
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter())
    logger.addHandler(handler)
    monkeypatch.setattr(logging, "getLogger", lambda: logger)
    configure_logging_with_tracing()
    record = logging.LogRecord("test", logging.INFO, "", 0, "hello", (), None)
    handler.filter(record)
    assert handler.format(record) == "hello [trace_id=none]"


def test_worker_reports_unconfigured_database(monkeypatch):
    import app.workers.analytics_worker as worker

    monkeypatch.setattr(worker, "SessionLocal", None)
    monkeypatch.setattr(worker, "init_tracing", lambda **kwargs: None)
    monkeypatch.setattr(worker, "configure_logging_with_tracing", lambda: None)
    with pytest.raises(RuntimeError, match="Database not configured"):
        worker.main()

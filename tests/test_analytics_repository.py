from unittest.mock import MagicMock

from app.repositories.analytics_repository import AnalyticsRepository
from app.models.identity import DEFAULT_WORKSPACE_ID


def test_batch_create_clicks_uses_single_execute_call():
    repo = AnalyticsRepository()
    db = MagicMock()

    inserted = repo.batch_create_clicks(db, ["a", "b", "c"], workspace_id=DEFAULT_WORKSPACE_ID)

    assert inserted == 3
    db.execute.assert_called_once()
    sql_text = str(db.execute.call_args.args[0])
    assert "INSERT INTO analytics" in sql_text
    assert db.execute.call_args.args[1] == [
        {"short_code": code, "workspace_id": DEFAULT_WORKSPACE_ID}
        for code in ["a", "b", "c"]
    ]


def test_batch_create_clicks_returns_zero_for_empty_list():
    repo = AnalyticsRepository()
    db = MagicMock()

    inserted = repo.batch_create_clicks(db, [], workspace_id=DEFAULT_WORKSPACE_ID)

    assert inserted == 0
    db.execute.assert_not_called()


def test_analytics_repository_count_and_timestamps(db_session):
    repo = AnalyticsRepository()

    repo.batch_create_clicks(db_session, ["abc", "abc", "xyz"], workspace_id=DEFAULT_WORKSPACE_ID)
    db_session.commit()

    assert repo.get_click_count(db_session, "abc", workspace_id=DEFAULT_WORKSPACE_ID) == 2
    assert repo.get_click_count(db_session, "xyz", workspace_id=DEFAULT_WORKSPACE_ID) == 1

    timestamps = repo.get_click_timestamps(db_session, "abc", workspace_id=DEFAULT_WORKSPACE_ID)
    assert len(timestamps) == 2

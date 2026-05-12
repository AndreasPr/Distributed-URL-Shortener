from unittest.mock import MagicMock

from app.repositories.analytics_repository import AnalyticsRepository


def test_batch_create_clicks_uses_single_execute_call():
    repo = AnalyticsRepository()
    db = MagicMock()

    inserted = repo.batch_create_clicks(db, ["a", "b", "c"])

    assert inserted == 3
    db.execute.assert_called_once()
    sql_text = str(db.execute.call_args.args[0])
    assert "INSERT INTO analytics (short_code) VALUES" in sql_text
    assert ":short_code_0" in sql_text and ":short_code_1" in sql_text and ":short_code_2" in sql_text
    assert db.execute.call_args.args[1] == {
        "short_code_0": "a",
        "short_code_1": "b",
        "short_code_2": "c",
    }


def test_batch_create_clicks_returns_zero_for_empty_list():
    repo = AnalyticsRepository()
    db = MagicMock()

    inserted = repo.batch_create_clicks(db, [])

    assert inserted == 0
    db.execute.assert_not_called()


def test_analytics_repository_count_and_timestamps(db_session):
    repo = AnalyticsRepository()

    repo.batch_create_clicks(db_session, ["abc", "abc", "xyz"])
    db_session.commit()

    assert repo.get_click_count(db_session, "abc") == 2
    assert repo.get_click_count(db_session, "xyz") == 1

    timestamps = repo.get_click_timestamps(db_session, "abc")
    assert len(timestamps) == 2

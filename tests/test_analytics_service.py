from unittest.mock import MagicMock

from app.services.analytics_service import AnalyticsService


def test_get_analytics_uses_repository_results():
    service = AnalyticsService()
    fake_repo = MagicMock()
    fake_repo.get_click_timestamps.return_value = ["2026-05-11T12:00:00"]
    fake_repo.get_click_count.return_value = 42
    service.repo = fake_repo
    db = MagicMock()

    result = service.get_analytics(db, "abc")

    assert result == {
        "short_code": "abc",
        "total_clicks": 42,
        "timestamps": ["2026-05-11T12:00:00"],
    }
    fake_repo.get_click_timestamps.assert_called_once_with(db, "abc")
    fake_repo.get_click_count.assert_called_once_with(db, "abc")

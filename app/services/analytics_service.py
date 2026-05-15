from sqlalchemy.orm import Session

from app.repositories.analytics_repository import AnalyticsRepository


class AnalyticsService:
    def __init__(self):
        self.repo = AnalyticsRepository()

    def get_analytics(self, db: Session, short_code: str):
        timestamps = self.repo.get_click_timestamps(db, short_code)

        return {
            "short_code": short_code,
            "total_clicks": self.repo.get_click_count(db, short_code),
            "timestamps": timestamps,
        }

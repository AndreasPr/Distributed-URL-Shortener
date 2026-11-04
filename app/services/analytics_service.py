from sqlalchemy.orm import Session

from app.models.identity import DEFAULT_WORKSPACE_ID
from app.repositories.analytics_repository import AnalyticsRepository
from app.repositories.url_repository import URLRepository


class URLNotFoundError(LookupError):
    """The requested short code does not exist."""


class AnalyticsService:
    def __init__(self):
        self.repo = AnalyticsRepository()
        self.url_repo = URLRepository()

    def get_analytics(
        self, db: Session, short_code: str, *, workspace_id: str = DEFAULT_WORKSPACE_ID
    ):
        if self.url_repo.get_by_code(db, short_code, workspace_id=workspace_id) is None:
            raise URLNotFoundError(short_code)
        timestamps = self.repo.get_click_timestamps(
            db, short_code, workspace_id=workspace_id
        )

        return {
            "short_code": short_code,
            "total_clicks": self.repo.get_click_count(
                db, short_code, workspace_id=workspace_id
            ),
            "timestamps": timestamps,
        }

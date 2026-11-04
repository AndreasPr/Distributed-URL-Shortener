from datetime import timezone

from sqlalchemy import Uuid, bindparam, func, select, text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.events.models import ClickEvent
from app.models.analytics import Analytics
from app.models.url import URL


class AnalyticsRepository:
    def create_event(self, db: Session, event: ClickEvent) -> None:
        """Trusted worker entry: derive tenant from the globally unique stored code.

        Never trust a tenant supplied in event JSON; missing codes are poison.
        """
        url = db.scalar(select(URL).where(URL.short_code == event.short_code))
        if url is None:
            raise ValueError("Unknown event short code")
        db.execute(
            insert(Analytics)
            .values(
                short_code=event.short_code,
                workspace_id=url.workspace_id,
                created_by_user_id=url.created_by_user_id,
                event_id=str(event.event_id),
                clicked_at=event.occurred_at.astimezone(timezone.utc).replace(
                    tzinfo=None
                ),
            )
            .on_conflict_do_nothing(
                index_elements=[Analytics.event_id],
                index_where=text("event_id IS NOT NULL"),
            )
        )

    def create_click(self, db: Session, short_code: str, *, workspace_id: str) -> None:
        self.batch_create_clicks(db, [short_code], workspace_id=workspace_id)

    def batch_create_clicks(
        self, db: Session, short_codes: list[str], *, workspace_id: str
    ) -> int:
        if not short_codes:
            return 0
        db.execute(
            insert(Analytics),
            [dict(short_code=code, workspace_id=workspace_id) for code in short_codes],
        )
        return len(short_codes)

    def get_click_count(
        self, db: Session, short_code: str, *, workspace_id: str
    ) -> int:
        return int(
            db.scalar(
                select(func.count(Analytics.id)).where(
                    Analytics.short_code == short_code,
                    Analytics.workspace_id == workspace_id,
                )
            )
            or 0
        )

    def get_click_timestamps(self, db: Session, short_code: str, *, workspace_id: str):
        # Preserve the established driver-native timestamp response contract.
        statement = text(
            "SELECT clicked_at FROM analytics WHERE short_code = :code "
            "AND workspace_id = :workspace_id ORDER BY clicked_at DESC"
        ).bindparams(bindparam("workspace_id", type_=Uuid(as_uuid=False)))
        return list(
            db.execute(
                statement, {"code": short_code, "workspace_id": workspace_id}
            ).scalars()
        )

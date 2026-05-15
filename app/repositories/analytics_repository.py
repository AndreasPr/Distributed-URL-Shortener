from typing import List

from sqlalchemy import text
from sqlalchemy.orm import Session


class AnalyticsRepository:
    def create_click(self, db: Session, short_code: str) -> None:
        db.execute(
            text("INSERT INTO analytics (short_code) VALUES (:short_code)"),
            {"short_code": short_code},
        )

    def batch_create_clicks(self, db: Session, short_codes: List[str]) -> int:
        """Insert multiple clicks in a single batch. Returns count inserted."""
        if not short_codes:
            return 0

        placeholders = ", ".join(
            [f"(:short_code_{i})" for i in range(len(short_codes))]
        )
        params = {f"short_code_{i}": code for i, code in enumerate(short_codes)}

        db.execute(
            text(f"INSERT INTO analytics (short_code) VALUES {placeholders}"),
            params,
        )
        return len(short_codes)

    def get_click_count(self, db: Session, short_code: str) -> int:
        result = db.execute(
            text("SELECT COUNT(*) FROM analytics WHERE short_code = :short_code"),
            {"short_code": short_code},
        )
        return int(result.scalar() or 0)

    def get_click_timestamps(self, db: Session, short_code: str):
        result = db.execute(
            text(
                "SELECT clicked_at FROM analytics WHERE short_code = :short_code ORDER BY clicked_at DESC"
            ),
            {"short_code": short_code},
        )
        return [row[0] for row in result.fetchall()]

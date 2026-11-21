"""Real PostgreSQL grouping, expiry serialization and tenancy for GET /urls data."""

from datetime import datetime, timezone
from uuid import uuid4

import pytest

from app.models.identity import Workspace
from app.models.url import URL
from app.repositories.url_repository import URLRepository

pytestmark = pytest.mark.integration


def test_list_expiry_postgres(database):
    with database() as db:
        ours, theirs = str(uuid4()), str(uuid4())
        for identifier in (ours, theirs):
            db.add(Workspace(id=identifier, name="List test", slug=identifier))
        db.flush()
        for code, workspace, expiry in [
            ("noexpiry", ours, None),
            ("withexpiry", ours, datetime(2030, 3, 10, 7)),
            ("privateexpiry", theirs, datetime(2030, 3, 10, 7)),
        ]:
            db.add(
                URL(
                    short_code=code,
                    long_url="https://example.com/",
                    workspace_id=workspace,
                    expires_at=expiry,
                )
            )
        db.commit()
        rows = URLRepository().list_recent(db, workspace_id=ours)
        by_code = {row["short_code"]: row for row in rows}
        assert set(by_code) == {"noexpiry", "withexpiry"}
        assert by_code["noexpiry"]["expires_at"] is None
        assert datetime.fromisoformat(by_code["withexpiry"]["expires_at"]) == datetime(
            2030, 3, 10, 7, tzinfo=timezone.utc
        )
        assert all(row["click_count"] == 0 for row in rows)

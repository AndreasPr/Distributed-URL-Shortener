"""First-login contention against real PostgreSQL, not SQLite mocks."""

from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

import pytest
from sqlalchemy import func, select

from app.models.identity import User, WorkspaceMember
from app.services.user_auth import user_principal

pytestmark = pytest.mark.integration


def test_concurrent_first_login_is_atomic(database):
    subject = str(uuid4())

    def login(_):
        with database() as db:
            return user_principal(db, {"sub": subject, "email": "test@example.test"})

    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(login, range(8)))
    assert len({result.workspace_id for result in results}) == 1
    with database() as db:
        assert (
            db.scalar(select(func.count()).select_from(User).where(User.id == subject))
            == 1
        )
        assert (
            db.scalar(
                select(func.count())
                .select_from(WorkspaceMember)
                .where(WorkspaceMember.user_id == subject)
            )
            == 1
        )

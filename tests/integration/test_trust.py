"""Trust quotas serialize across real PostgreSQL transactions."""

from concurrent.futures import ThreadPoolExecutor

import pytest

from app.core.config import settings

pytestmark = pytest.mark.integration


def test_concurrent_creation_cannot_exceed_daily_quota(stack, monkeypatch):
    monkeypatch.setattr(settings, "FREE_DAILY_LINKS", 3)

    def create(_):
        return stack.client.post(
            "/shorten", json={"long_url": "https://example.com/quota"}
        ).status_code

    with ThreadPoolExecutor(max_workers=6) as pool:
        statuses = list(pool.map(create, range(8)))
    assert statuses.count(200) == 3
    assert statuses.count(429) == 5


def test_creation_refreshes_identity_after_other_session_suspends(stack):
    from fastapi import HTTPException

    from app.api.principal import Principal
    from app.models.identity import DEFAULT_WORKSPACE_ID, User
    from app.services.api_keys import utcnow
    from app.services.trust import creation_user
    from app.services.user_auth import DEMO_USERS

    subject = DEMO_USERS["owner"]
    with stack.db() as first, stack.db() as second:
        stale = first.get(User, subject)
        assert stale.suspended_at is None
        second.get(User, subject).suspended_at = utcnow()
        second.commit()
        principal = Principal(
            user_id=subject,
            workspace_id=DEFAULT_WORKSPACE_ID,
            role="owner",
            scopes=frozenset(),
            auth_method="user",
            email_verified=True,
        )
        with pytest.raises(HTTPException) as error:
            creation_user(first, principal)
        assert error.value.status_code == 403

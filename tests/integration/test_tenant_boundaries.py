"""Real PostgreSQL UUID predicates through the assembled API and Redis limiter."""

from uuid import uuid4

import pytest

from app.models.analytics import Analytics
from app.models.identity import Workspace
from app.models.url import URL
from app.models.url_verdict import URLVerdict
from app.services.api_keys import create_key

pytestmark = pytest.mark.integration


def test_workspace_boundary_with_real_postgres_and_redis(stack):
    workspace_id = str(uuid4())
    with stack.db() as db:
        db.add(
            Workspace(
                id=workspace_id, name="Other tenant", slug="tenant-" + workspace_id
            )
        )
        db.flush()
        db.add(
            URL(
                short_code="privateTenant",
                long_url="https://example.com",
                workspace_id=workspace_id,
            )
        )
        db.flush()
        db.add(Analytics(short_code="privateTenant", workspace_id=workspace_id))
        db.add(
            URLVerdict(
                short_code="privateTenant",
                workspace_id=workspace_id,
                verdict="suspicious",
                score=0.5,
                reasons=["path_keyword"],
                source="heuristic",
            )
        )
        db.commit()
        key, secret = create_key(
            db, "other tenant", ["admin"], workspace_id=workspace_id
        )
        key_id = key.id
    for path in [
        "/analytics/privateTenant",
        "/urls/privateTenant/status",
        "/admin/activity/privateTenant",
    ]:
        assert stack.client.get(path).status_code == 404
    assert stack.client.delete("/urls/privateTenant").status_code == 404
    assert stack.client.delete(f"/api-keys/{key_id}").status_code == 404
    assert stack.client.get("/admin/flagged").json() == []
    response = stack.client.get(
        "/analytics/privateTenant", headers={"X-API-Key": secret}
    )
    assert response.status_code == 200 and response.json()["total_clicks"] == 1
    response = stack.client.get("/me", headers={"X-API-Key": secret})
    assert response.json()["workspace_id"] == workspace_id
    assert stack.client.get("/privateTenant", follow_redirects=False).status_code == 307

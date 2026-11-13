"""Tenant boundaries must hold even when callers know another tenant's code/ID."""

from dataclasses import replace
from inspect import signature
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import event, select
from sqlalchemy.orm import Session

from app.api.auth import get_principal
from app.api.principal import ROLE_PERMISSIONS, Principal
from app.api.routes import router
from app.api.workspaces import router as workspace_router
from app.db.database import get_db
from app.models.analytics import Analytics
from app.models.identity import (
    DEFAULT_WORKSPACE_ID,
    User,
    Workspace,
    WorkspaceInvite,
    WorkspaceMember,
)
from app.models.url import URL
from app.models.url_verdict import URLVerdict
from app.repositories.analytics_repository import AnalyticsRepository
from app.repositories.url_repository import URLRepository
from app.services.api_keys import create_key


@pytest.fixture
def client(db_session):
    app = FastAPI()
    app.include_router(workspace_router)
    app.include_router(router)
    app.dependency_overrides[get_db] = lambda: db_session
    return TestClient(app)


@pytest.fixture
def tenants(db_session, owned_key):
    other = str(uuid4())
    db_session.add(Workspace(id=other, name="Other", slug="other"))
    db_session.flush()
    for code, workspace in [("ours", DEFAULT_WORKSPACE_ID), ("theirs", other)]:
        db_session.add(
            URL(short_code=code, long_url="https://example.com", workspace_id=workspace)
        )
        db_session.flush()
        db_session.add(Analytics(short_code=code, workspace_id=workspace))
        db_session.add(
            URLVerdict(
                short_code=code,
                workspace_id=workspace,
                verdict="suspicious",
                score=0.5,
                reasons=["path_keyword"],
                source="heuristic",
            )
        )
    db_session.commit()
    _, ours = owned_key(db_session, "ours", ["admin"])
    other_key, theirs = owned_key(db_session, "theirs", ["admin"], workspace_id=other)
    return other, ours, other_key.id, theirs


def test_real_api_key_principal_and_tenant_isolation(client, db_session, tenants):
    other, raw, key_id, other_raw = tenants
    client.headers["X-API-Key"] = raw
    me = client.get("/me").json()
    assert me["workspace_id"] == DEFAULT_WORKSPACE_ID
    assert me["auth_method"] == "api_key" and me["user_id"] is None
    assert [row["short_code"] for row in client.get("/urls").json()] == ["ours"]
    assert client.get("/analytics/ours").json()["total_clicks"] == 1
    for path in ["/analytics/theirs", "/urls/theirs/status"]:
        assert client.get(path).status_code == 404
    assert client.delete("/urls/theirs").status_code == 404
    assert (
        client.post(
            "/admin/flagged/theirs/review", json={"decision": "block"}
        ).status_code
        == 403
    )
    assert client.get("/admin/flagged").status_code == 403
    assert client.get("/admin/activity/theirs").status_code == 403
    assert all(row["id"] != key_id for row in client.get("/api-keys").json())
    assert client.delete(f"/api-keys/{key_id}").status_code == 404
    assert client.get(f"/workspaces/{other}/members").status_code == 404
    assert client.get("/workspaces").json()[0]["slug"] == "legacy"
    # A caller cannot select another tenant by injecting a workspace header/body.
    result = client.post(
        "/shorten",
        headers={"X-Workspace-ID": other},
        json={"long_url": "https://example.com", "workspace_id": other},
    )
    assert result.status_code == 200
    row = db_session.scalar(
        select(URL).where(URL.short_code == result.json()["short_code"])
    )
    assert row.workspace_id == DEFAULT_WORKSPACE_ID
    assert (
        client.get("/urls/theirs/status", headers={"X-API-Key": other_raw}).status_code
        == 200
    )
    # Public resolution is intentionally global; status/preview remains private.
    assert client.get("/theirs", follow_redirects=False).status_code == 307
    assert client.get("/urls/theirs/status").status_code == 404
    assert client.get("/analytics/theirs").status_code == 404


def test_self_service_key_creation_returns_secret_once(client, tenants):
    client.headers["X-API-Key"] = tenants[1]
    response = client.post("/api-keys", json={"name": "automation", "scopes": ["read"]})
    assert response.status_code == 201
    key = response.json()
    assert key["key"] not in client.get("/api-keys").text
    assert "key_hash" not in client.get("/api-keys").text
    assert (
        client.get("/me", headers={"X-API-Key": key["key"]}).json()["workspace_id"]
        == DEFAULT_WORKSPACE_ID
    )
    assert (
        client.post(
            "/api-keys",
            headers={"X-API-Key": key["key"]},
            json={"name": "escalate", "scopes": ["admin"]},
        ).status_code
        == 403
    )
    assert client.delete(f'/api-keys/{key["id"]}').status_code == 204
    assert client.get("/me", headers={"X-API-Key": key["key"]}).status_code == 401


@pytest.fixture
def user_context(db_session, client):
    user_id = str(uuid4())
    db_session.add(User(id=user_id, email="owner@example.test", email_verified=True))
    db_session.flush()
    db_session.add(
        WorkspaceMember(
            workspace_id=DEFAULT_WORKSPACE_ID, user_id=user_id, role="owner"
        )
    )
    db_session.commit()
    principal = Principal(
        workspace_id=DEFAULT_WORKSPACE_ID,
        user_id=user_id,
        role="owner",
        scopes=frozenset(),
        auth_method="user",
        email_verified=True,
    )
    # Deliberate trusted dependency override, NOT an HTTP user/role header.
    client.app.dependency_overrides[get_principal] = lambda: principal
    return principal


@pytest.mark.parametrize("role", ["viewer", "member", "admin", "owner"])
@pytest.mark.parametrize(
    "method,path,permission,payload,allowed",
    [
        ("GET", "/urls", "links:read", None, 200),
        ("GET", "/analytics/ours", "analytics:read", None, 200),
        ("POST", "/shorten", "links:create", {"long_url": "https://example.com"}, 200),
        ("DELETE", "/urls/missing", "links:edit_own", None, 404),
        ("GET", "/admin/keys", "keys:manage", None, 200),
        ("POST", "/api-keys", "keys:manage", {"name": "new", "scopes": ["read"]}, 201),
        ("GET", "/admin/flagged", "review:manage", None, 200),
        (
            "POST",
            "/admin/flagged/ours/review",
            "review:manage",
            {"decision": "allow"},
            204,
        ),
        (
            "POST",
            f"/workspaces/{DEFAULT_WORKSPACE_ID}/members",
            "members:manage",
            {"email": "invite@example.test"},
            201,
        ),
    ],
)
def test_role_endpoint_matrix(
    client, tenants, user_context, role, method, path, permission, payload, allowed
):
    principal = replace(user_context, role=role)
    client.app.dependency_overrides[get_principal] = lambda: principal
    response = client.request(method, path, json=payload)
    assert response.status_code == (
        allowed if permission in ROLE_PERMISSIONS[role] and not path.startswith("/admin/flagged") else 403
    ), response.text


def test_members_can_only_delete_their_own_links(
    client, db_session, tenants, user_context
):
    member = replace(user_context, role="member")
    client.app.dependency_overrides[get_principal] = lambda: member
    assert client.delete("/urls/ours").status_code == 404
    code = client.post("/shorten", json={"long_url": "https://example.com"}).json()[
        "short_code"
    ]
    assert (
        db_session.scalar(select(URL).where(URL.short_code == code)).created_by_user_id
        == member.user_id
    )
    assert client.delete("/urls/" + code).status_code == 204


def test_last_owner_and_pending_invites(client, db_session, user_context):
    path = f"/workspaces/{DEFAULT_WORKSPACE_ID}/members"
    assert client.delete(path + f"/{user_context.user_id}").status_code == 409
    assert (
        client.patch(
            path, json={"user_id": user_context.user_id, "role": "admin"}
        ).status_code
        == 409
    )
    assert (
        client.post(
            path, json={"email": "Invite@Example.test", "role": "admin"}
        ).status_code
        == 201
    )
    assert client.post(path, json={"email": "invite@example.test"}).status_code == 409
    assert db_session.query(WorkspaceInvite).one().email == "invite@example.test"
    assert (
        db_session.query(WorkspaceMember).count() == 1
    )  # Inviting never grants membership.
    second = str(uuid4())
    db_session.add(User(id=second, email="second@example.test"))
    db_session.flush()
    db_session.add(
        WorkspaceMember(workspace_id=DEFAULT_WORKSPACE_ID, user_id=second, role="owner")
    )
    db_session.commit()
    assert client.patch(path + "/" + second, json={"role": "member"}).status_code == 204
    assert client.delete(path + "/" + second).status_code == 204
    assert client.delete(path + f"/{user_context.user_id}").status_code == 409
    assert (
        client.patch(
            path, json={"user_id": user_context.user_id, "role": "superuser"}
        ).status_code
        == 422
    )


def test_create_workspace_requires_future_user_identity(
    client, db_session, tenants, user_context
):
    response = client.post(
        "/workspaces", json={"name": "New workspace", "slug": "new-workspace"}
    )
    assert response.status_code == 201
    workspace_id = response.json()["id"]
    assert response.json()["plan"] == "free"
    assert (
        db_session.get(WorkspaceMember, (workspace_id, user_context.user_id)).role
        == "owner"
    )
    client.app.dependency_overrides.clear()
    client.app.dependency_overrides[get_db] = lambda: db_session
    assert (
        client.post(
            "/workspaces",
            headers={"X-API-Key": tenants[1]},
            json={"name": "No user", "slug": "no-user"},
        ).status_code
        == 403
    )


def test_client_repository_queries_require_and_filter_workspace(db_session, tenants):
    urls, analytics = URLRepository(), AnalyticsRepository()
    operations = [
        (urls.get_by_code, ("theirs",)),
        (urls.list_recent, ()),
        (urls.soft_delete, ("theirs",)),
        (analytics.get_click_count, ("theirs",)),
        (analytics.get_click_timestamps, ("theirs",)),
    ]
    statements = []

    def capture(conn, cursor, statement, parameters, context, executemany):
        statements.append(statement.lower())

    event.listen(db_session.bind, "before_cursor_execute", capture)
    try:
        for method, args in operations:
            assert (
                signature(method).parameters["workspace_id"].default
                is signature(method).empty
            )
            with pytest.raises(TypeError):
                method(db_session, *args)
            statements.clear()
            result = method(db_session, *args, workspace_id=DEFAULT_WORKSPACE_ID)
            assert statements and all(
                "workspace_id" in sql.partition("where")[2] for sql in statements
            )
            if method != urls.list_recent:
                assert result in (None, False, 0, [])
    finally:
        event.remove(db_session.bind, "before_cursor_execute", capture)
    # A future tenant-facing repository method without a required workspace fails.
    for cls, exceptions in [
        (URLRepository, {"get_public_by_code", "get_public_lifecycle"}),
        (AnalyticsRepository, {"create_event"}),
    ]:
        for name, method in vars(cls).items():
            if callable(method) and not name.startswith("_") and name not in exceptions:
                assert "workspace_id" in signature(method).parameters, name


def test_worker_derives_tenant_from_stored_url(db_session, tenants):
    from app.abuse.persistence import store
    from app.abuse.schemas import Assessment
    from app.events.models import ClickEvent

    event = ClickEvent(short_code="theirs")
    repo = AnalyticsRepository()
    repo.create_event(db_session, event)
    repo.create_event(db_session, event)
    db_session.commit()
    row = db_session.scalar(
        select(Analytics).where(Analytics.event_id == str(event.event_id))
    )
    assert row.workspace_id == tenants[0]
    assert (
        db_session.query(Analytics).filter_by(event_id=str(event.event_id)).count() == 1
    )
    db_session.query(URLVerdict).filter_by(short_code="theirs").delete()
    db_session.commit()
    store(
        db_session,
        "theirs",
        Assessment(verdict="clean", score=0, reasons=[], source="heuristic"),
    )
    assert db_session.get(URLVerdict, "theirs").workspace_id == tenants[0]


def test_machine_actor_ownership_and_no_user_header_impersonation(client, db_session, owned_key):
    first, first_raw = owned_key(db_session, "first", ["read", "write"])
    _, second_raw = owned_key(db_session, "second", ["read", "write"])
    code = client.post(
        "/shorten",
        headers={"X-API-Key": first_raw},
        json={"long_url": "https://example.com"},
    ).json()["short_code"]
    assert (
        client.delete("/urls/" + code, headers={"X-API-Key": second_raw}).status_code
        == 404
    )
    assert (
        client.delete("/urls/" + code, headers={"X-API-Key": first_raw}).status_code
        == 204
    )
    assert (
        client.get(
            "/me",
            headers={
                "Authorization": "Bearer not-verified",
                "X-User-ID": str(uuid4()),
                "X-Role": "owner",
            },
        ).status_code
        == 401
    )
    assert (
        client.post(
            f"/workspaces/{DEFAULT_WORKSPACE_ID}/members",
            headers={"X-API-Key": first_raw, "X-Role": "owner"},
            json={"email": "pending@example.test"},
        ).status_code
        == 403
    )


@pytest.mark.parametrize("alias", ["workspaces", "api-keys", "WORKSPACES"])
def test_new_route_names_cannot_be_claimed_as_aliases(client, tenants, alias):
    assert (
        client.post(
            "/shorten",
            headers={"X-API-Key": tenants[1]},
            json={"long_url": "https://example.com", "custom_alias": alias},
        ).status_code
        == 422
    )

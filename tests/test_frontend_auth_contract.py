"""Backend gaps required by the browser account/workspace flows."""

from datetime import datetime
from uuid import uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.auth import get_principal
from app.api.principal import Principal
from app.api.workspaces import router
from app.db.database import get_db
from app.models.identity import DEFAULT_WORKSPACE_ID, User, Workspace, WorkspaceMember
from app.services.api_keys import authenticate, create_key


def setup_client(db, monkeypatch, role="viewer"):
    monkeypatch.setattr("app.api.auth.limit_write", lambda *args: None)
    subject = str(uuid4())
    db.add(User(id=subject, email="fixture@example.test", email_verified=True))
    db.add(
        WorkspaceMember(workspace_id=DEFAULT_WORKSPACE_ID, user_id=subject, role=role)
    )
    db.commit()
    principal = Principal(
        user_id=subject,
        workspace_id=DEFAULT_WORKSPACE_ID,
        role=role,
        scopes=frozenset(),
        auth_method="user",
        email_verified=True,
    )
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_principal] = lambda: principal
    return TestClient(app), subject


def test_workspace_switcher_lists_all_memberships_only(db_session, monkeypatch):
    client, user = setup_client(db_session, monkeypatch)
    other = Workspace(name="Second", slug="second")
    hidden = Workspace(name="Hidden", slug="hidden")
    db_session.add_all([other, hidden])
    db_session.flush()
    db_session.add(WorkspaceMember(workspace_id=other.id, user_id=user, role="member"))
    db_session.commit()
    assert {row["id"] for row in client.get("/workspaces").json()} == {
        DEFAULT_WORKSPACE_ID,
        other.id,
    }


def test_delete_account_revokes_keys_and_tombstones(db_session, monkeypatch):
    client, user = setup_client(db_session, monkeypatch)
    key, secret = create_key(db_session, "fixture", ["read"], created_by_user_id=user)
    assert (
        client.request("DELETE", "/me", json={"confirmation": "wrong"}).status_code
        == 422
    )
    response = client.request("DELETE", "/me", json={"confirmation": "DELETE"})
    assert response.status_code == 204
    assert isinstance(db_session.get(User, user).deleted_at, datetime)
    assert authenticate(db_session, secret) is None


def test_delete_last_owner_is_rejected(db_session, monkeypatch):
    client, user = setup_client(db_session, monkeypatch, "owner")
    other = str(uuid4())
    db_session.add(User(id=other, email="other@example.test", email_verified=True))
    db_session.add(WorkspaceMember(workspace_id=DEFAULT_WORKSPACE_ID, user_id=other, role="member"))
    db_session.commit()
    assert (
        client.request("DELETE", "/me", json={"confirmation": "DELETE"}).status_code
        == 409
    )
    assert db_session.get(User, user).deleted_at is None


def test_account_deletion_requires_verified_human(db_session, monkeypatch):
    from dataclasses import replace

    client, user = setup_client(db_session, monkeypatch)
    original = client.app.dependency_overrides[get_principal]()
    client.app.dependency_overrides[get_principal] = lambda: replace(
        original, email_verified=False
    )
    response = client.request("DELETE", "/me", json={"confirmation": "DELETE"})
    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "email_unverified"
    client.app.dependency_overrides[get_principal] = lambda: Principal(
        api_key_id=1,
        workspace_id=DEFAULT_WORKSPACE_ID,
        role="admin",
        scopes=frozenset({"admin"}),
        auth_method="api_key",
    )
    assert (
        client.request("DELETE", "/me", json={"confirmation": "DELETE"}).status_code
        == 403
    )
    assert db_session.get(User, user).deleted_at is None

"""Workspace management for authenticated human and API-key Principals."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.auth import get_principal, require_permission
from app.api.principal import Principal, Role
from app.db.database import get_db
from app.models.api_key import APIKey
from app.models.identity import User, Workspace, WorkspaceInvite, WorkspaceMember
from app.services.api_keys import utcnow

router = APIRouter()


class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    slug: str = Field(
        min_length=3, max_length=100, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$"
    )

    @field_validator("name")
    @classmethod
    def nonblank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Name must not be blank")
        return value.strip()


class InviteCreate(BaseModel):
    email: str = Field(
        min_length=3, max_length=320, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$"
    )
    role: Role = "member"

    @field_validator("email")
    @classmethod
    def normalized(cls, value: str) -> str:
        return value.casefold()


class MemberPatch(BaseModel):
    user_id: UUID
    role: Role


class RolePatch(BaseModel):
    role: Role


def workspace_for(
    db: Session, principal: Principal, workspace_id: UUID, *, lock: bool = False
) -> Workspace:
    if str(workspace_id) != principal.workspace_id:
        raise HTTPException(404, "Workspace not found")
    stmt = select(Workspace).where(Workspace.id == principal.workspace_id)
    if lock:
        stmt = stmt.with_for_update()
    workspace = db.scalar(stmt)
    if workspace is None:
        raise HTTPException(404, "Workspace not found")
    return workspace


def serialize_workspace(workspace: Workspace) -> dict:
    return {
        "id": workspace.id,
        "name": workspace.name,
        "slug": workspace.slug,
        "plan": workspace.plan,
        "created_at": workspace.created_at,
    }


@router.get("/me")
def me(principal: Principal = Depends(get_principal)):
    return {
        "user_id": principal.user_id,
        "api_key_id": principal.api_key_id,
        "workspace_id": principal.workspace_id,
        "role": principal.role,
        "scopes": sorted(principal.scopes),
        "auth_method": principal.auth_method,
        "email_verified": principal.email_verified,
        "platform_admin": principal.platform_admin,
    }


@router.get("/workspaces")
def workspaces(
    principal: Principal = Depends(require_permission("workspaces:read")),
    db: Session = Depends(get_db),
):
    # Both kinds of Principal carry an authenticated workspace context.
    rows = db.scalars(select(Workspace).where(Workspace.id == principal.workspace_id))
    return [serialize_workspace(row) for row in rows]


@router.post("/workspaces", status_code=201)
def create_workspace(
    payload: WorkspaceCreate,
    principal: Principal = Depends(require_permission("workspaces:create")),
    db: Session = Depends(get_db),
):
    if principal.auth_method != "user" or principal.user_id is None:
        raise HTTPException(403, "User authentication required")
    user = db.get(User, principal.user_id)
    if user is None or user.suspended_at is not None or user.deleted_at is not None:
        raise HTTPException(401, "User unavailable")
    row = Workspace(name=payload.name, slug=payload.slug)
    try:
        db.add(row)
        db.flush()
        db.add(
            WorkspaceMember(
                workspace_id=row.id, user_id=principal.user_id, role="owner"
            )
        )
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "Workspace slug already exists") from exc
    db.refresh(row)
    return serialize_workspace(row)


@router.get("/workspaces/{workspace_id}/members")
def members(
    workspace_id: UUID,
    principal: Principal = Depends(require_permission("workspaces:read")),
    db: Session = Depends(get_db),
):
    workspace_for(db, principal, workspace_id)
    rows = db.scalars(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == principal.workspace_id
        )
    )
    invites = db.scalars(
        select(WorkspaceInvite).where(
            WorkspaceInvite.workspace_id == principal.workspace_id
        )
    )
    return {
        "members": [
            {"user_id": row.user_id, "role": row.role, "created_at": row.created_at}
            for row in rows
        ],
        "pending_invites": [
            {"email": row.email, "role": row.role, "created_at": row.created_at}
            for row in invites
        ],
    }


@router.post("/workspaces/{workspace_id}/members", status_code=201)
def invite(
    workspace_id: UUID,
    payload: InviteCreate,
    principal: Principal = Depends(require_permission("members:manage")),
    db: Session = Depends(get_db),
):
    workspace_for(db, principal, workspace_id, lock=True)
    row = WorkspaceInvite(
        workspace_id=principal.workspace_id,
        email=payload.email,
        role=payload.role,
        created_by_user_id=principal.user_id,
    )
    try:
        db.add(row)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "Invite already pending") from exc
    return {"email": row.email, "role": row.role, "status": "pending"}


def change_member(
    db: Session,
    principal: Principal,
    workspace_id: UUID,
    user_id: UUID,
    role: Role | None,
) -> None:
    # Lock the WORKSPACE first, serializing changes to different owner rows too.
    # PostgreSQL READ COMMITTED sees the preceding writer's committed owner count.
    workspace_for(db, principal, workspace_id, lock=True)
    row = db.scalar(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == principal.workspace_id,
            WorkspaceMember.user_id == str(user_id),
        )
    )
    if row is None:
        raise HTTPException(404, "Member not found")
    if row.role == "owner" and role != "owner":
        owners = db.scalar(
            select(func.count())
            .select_from(WorkspaceMember)
            .where(
                WorkspaceMember.workspace_id == principal.workspace_id,
                WorkspaceMember.role == "owner",
            )
        )
        if owners == 1:
            raise HTTPException(409, "Cannot remove or demote the last owner")
    if role is None:
        db.execute(
            update(APIKey)
            .where(
                APIKey.workspace_id == principal.workspace_id,
                APIKey.created_by_user_id == str(user_id),
                APIKey.revoked_at.is_(None),
            )
            .values(revoked_at=utcnow())
        )
        db.delete(row)
    else:
        row.role = role
    db.commit()


@router.patch("/workspaces/{workspace_id}/members/{user_id}", status_code=204)
def patch_member(
    workspace_id: UUID,
    user_id: UUID,
    payload: RolePatch,
    principal: Principal = Depends(require_permission("members:manage")),
    db: Session = Depends(get_db),
):
    change_member(db, principal, workspace_id, user_id, payload.role)
    return Response(status_code=204)


@router.patch("/workspaces/{workspace_id}/members", status_code=204)
def patch_member_body(
    workspace_id: UUID,
    payload: MemberPatch,
    principal: Principal = Depends(require_permission("members:manage")),
    db: Session = Depends(get_db),
):
    change_member(db, principal, workspace_id, payload.user_id, payload.role)
    return Response(status_code=204)


@router.delete("/workspaces/{workspace_id}/members/{user_id}", status_code=204)
@router.delete("/workspaces/{workspace_id}/members", status_code=204)
def remove_member(
    workspace_id: UUID,
    user_id: UUID,
    principal: Principal = Depends(require_permission("members:manage")),
    db: Session = Depends(get_db),
):
    change_member(db, principal, workspace_id, user_id, None)
    return Response(status_code=204)

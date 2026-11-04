"""Shared authorization vocabulary; no permission is inferred from request data."""

from dataclasses import dataclass
from typing import Literal
from uuid import UUID

Role = Literal["viewer", "member", "admin", "owner"]
READ = frozenset({"links:read", "analytics:read", "workspaces:read"})
MEMBER = READ | {"links:create", "links:edit_own"}
ADMIN = MEMBER | {"links:manage", "keys:manage", "review:manage"}
ROLE_PERMISSIONS = {
    "viewer": READ,
    "member": MEMBER,
    "admin": ADMIN,
    "owner": ADMIN
    | {"members:manage", "billing:manage", "workspace:delete", "workspaces:create"},
}


@dataclass(frozen=True)
class Principal:
    workspace_id: str
    role: Role
    scopes: frozenset[str]
    auth_method: Literal["api_key", "user"]
    user_id: str | None = None
    api_key_id: int | None = None
    platform_admin: bool = False

    def __post_init__(self) -> None:
        UUID(self.workspace_id)
        if self.role not in ROLE_PERMISSIONS:
            raise ValueError("Unknown principal role")
        if self.auth_method == "api_key":
            if self.api_key_id is None or self.user_id is not None:
                raise ValueError("API-key principal requires only api_key_id")
        elif self.auth_method == "user":
            if self.user_id is None or self.api_key_id is not None:
                raise ValueError("User principal requires only user_id")
            UUID(self.user_id)
        else:
            raise ValueError("Unknown authentication method")

    @property
    def id(self) -> str | int:
        """Compatibility for audit and rate-limit identifiers."""
        return self.api_key_id if self.api_key_id is not None else str(self.user_id)

    def allows(self, permission: str) -> bool:
        if permission not in ROLE_PERMISSIONS[self.role]:
            return False
        scope = (
            "read"
            if permission in READ
            else (
                "write" if permission in {"links:create", "links:edit_own"} else "admin"
            )
        )
        return (
            self.auth_method == "user" or scope in self.scopes or "admin" in self.scopes
        )

import logging
from collections.abc import Callable

from fastapi import Depends, HTTPException, Request, Security
from fastapi.security import APIKeyHeader
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.principal import Principal, Role
from app.db.database import get_db
from app.middleware.rate_limiter import limit_write
from app.services.api_keys import authenticate

logger = logging.getLogger(__name__)
key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def get_principal(
    raw: str | None = Security(key_header), db: Session = Depends(get_db)
) -> Principal:
    invalid = HTTPException(
        401, "Missing or invalid API key", headers={"WWW-Authenticate": "APIKey"}
    )
    if not raw or len(raw) > 256:
        raise invalid
    try:
        key = authenticate(db, raw)
        if key is None:
            raise invalid
        role: Role = (
            "admin"
            if "admin" in key.scopes
            else "member" if "write" in key.scopes else "viewer"
        )
        return Principal(
            workspace_id=key.workspace_id,
            role=role,
            scopes=frozenset(key.scopes),
            auth_method="api_key",
            api_key_id=key.id,
        )
    except SQLAlchemyError as exc:
        db.rollback()
        logger.warning("API key store unavailable (%s)", type(exc).__name__)
        raise HTTPException(503, "Authentication unavailable") from exc


def require_permission(permission: str) -> Callable:
    def dependency(
        request: Request, principal: Principal = Depends(get_principal)
    ) -> Principal:
        if not principal.allows(permission):
            raise HTTPException(403, "Insufficient permission")
        if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
            limit_write(request, principal.id)
        return principal

    return dependency


# Stable dependency names for existing clients/tests, one policy implementation.
require_read = require_permission("links:read")
require_write = require_permission("links:create")
require_edit = require_permission("links:edit_own")
require_analytics = require_permission("analytics:read")
require_keys = require_permission("keys:manage")
require_admin = require_permission("review:manage")

# Step 15.3 extension point: get_principal will verify Supabase JWTs and resolve
# users.id == verified sub plus membership. Never accept user IDs/roles from headers.
require = require_permission

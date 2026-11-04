import logging
from collections.abc import Callable
from uuid import UUID

from fastapi import Depends, Header, HTTPException, Request, Security
from fastapi.security import APIKeyHeader, HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.principal import Principal, Role
from app.db.database import get_db
from app.middleware.rate_limiter import limit_write
from app.observability.metrics import auth_failure_total, auth_success_total
from app.services.api_keys import authenticate
from app.services.jwt_auth import InvalidToken, verify_token
from app.services.user_auth import user_principal

logger = logging.getLogger(__name__)
key_header = APIKeyHeader(name="X-API-Key", auto_error=False)
bearer_scheme = HTTPBearer(auto_error=False)


def get_principal(
    request: Request,
    raw: str | None = Security(key_header),
    db: Session = Depends(get_db),
    bearer: HTTPAuthorizationCredentials | None = Security(bearer_scheme),
    x_workspace_id: str | None = Header(default=None),
) -> Principal:
    authorization = request.headers.get("authorization")
    if "x-api-key" in request.headers and authorization is not None:
        auth_failure_total.labels(reason="ambiguous_credentials").inc()
        raise HTTPException(400, "Use either Bearer or X-API-Key authentication")
    if authorization is not None:
        try:
            scheme, separator, token = authorization.partition(" ")
            if scheme.lower() != "bearer" or not separator or not token:
                raise InvalidToken()
            if x_workspace_id is not None:
                try:
                    x_workspace_id = str(UUID(x_workspace_id))
                except ValueError:
                    raise InvalidToken("workspace_membership") from None
            principal = user_principal(db, verify_token(token), x_workspace_id)
            auth_success_total.inc()
            return principal
        except InvalidToken as exc:
            auth_failure_total.labels(reason=exc.reason).inc()
            raise HTTPException(
                401, "Invalid credentials", headers={"WWW-Authenticate": "Bearer"}
            ) from None
        except SQLAlchemyError:
            db.rollback()
            auth_failure_total.labels(reason="store_unavailable").inc()
            raise HTTPException(503, "Authentication unavailable") from None
    invalid = HTTPException(
        401, "Missing or invalid API key", headers={"WWW-Authenticate": "APIKey"}
    )
    if not raw or len(raw) > 256:
        auth_failure_total.labels(reason="api_key").inc()
        raise invalid
    try:
        key = authenticate(db, raw)
        if key is None:
            auth_failure_total.labels(reason="api_key").inc()
            raise invalid
        role: Role = (
            "admin"
            if "admin" in key.scopes
            else "member" if "write" in key.scopes else "viewer"
        )
        auth_success_total.inc()
        return Principal(
            workspace_id=key.workspace_id,
            role=role,
            scopes=frozenset(key.scopes),
            auth_method="api_key",
            api_key_id=key.id,
        )
    except SQLAlchemyError as exc:
        auth_failure_total.labels(reason="store_unavailable").inc()
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

require = require_permission

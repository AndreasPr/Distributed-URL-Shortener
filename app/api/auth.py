import logging
from collections.abc import Callable

from fastapi import Depends, HTTPException, Request, Security
from fastapi.security import APIKeyHeader
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.middleware.rate_limiter import limit_write
from app.models.api_key import APIKey
from app.services.api_keys import authenticate

logger = logging.getLogger(__name__)
key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def require_scope(scope: str) -> Callable:
    def dependency(
        request: Request,
        raw: str | None = Security(key_header),
        db: Session = Depends(get_db),
    ) -> APIKey:
        if not raw or len(raw) > 256:
            raise HTTPException(
                401,
                "Missing or invalid API key",
                headers={"WWW-Authenticate": "APIKey"},
            )
        try:
            key = authenticate(db, raw)
        except SQLAlchemyError as exc:
            db.rollback()
            logger.warning("API key store unavailable (%s)", type(exc).__name__)
            raise HTTPException(503, "Authentication unavailable") from exc
        if key is None:
            raise HTTPException(
                401,
                "Missing or invalid API key",
                headers={"WWW-Authenticate": "APIKey"},
            )
        if scope not in key.scopes and "admin" not in key.scopes:
            raise HTTPException(403, "Insufficient API key scope")
        if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
            limit_write(request, key.id)
        return key

    return dependency


require_read = require_scope("read")
require_write = require_scope("write")
require_admin = require_scope("admin")

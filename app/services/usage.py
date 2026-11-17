"""Read-only, best-effort measurements. Unknown provider usage is never zero."""

from datetime import datetime, timezone

from fastapi import Depends, HTTPException, Request
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.api.auth import get_principal, require_platform_admin
from app.api.principal import Principal
from app.cache.redis_client import read_cache, redis_client
from app.core.config import settings
from app.db.database import get_db
from app.llm.limits import GLOBAL_LIMITS
from app.models.api_key import APIKey
from app.models.identity import User
from app.models.url import URL


def require_usage_admin(
    request: Request,
    principal: Principal = Depends(get_principal),
    db: Session = Depends(get_db),
) -> Principal:
    if principal.auth_method == "user":
        return require_platform_admin(request, principal)
    key = db.get(APIKey, principal.api_key_id)
    user = (
        db.get(User, key.created_by_user_id) if key and key.created_by_user_id else None
    )
    # get_principal already authenticates digest, revocation and current membership.
    if (
        not key
        or key.revoked_at is not None
        or "admin" not in key.scopes
        or "admin" not in principal.scopes
        or not user
        or not user.email_verified
        or user.suspended_at is not None
        or user.deleted_at is not None
        or user.email.lower() not in settings.PLATFORM_ADMIN_EMAILS
    ):
        raise HTTPException(403, "Platform administrator required")
    return principal


def measurement(name: str, used, limit: int, unit: str, *, estimated=False) -> dict:
    return {
        "name": name,
        "used": used,
        "limit": limit if limit > 0 else None,
        "unit": unit,
        "estimated": estimated,
        "status": "ok" if used is not None else "unavailable",
        "percent": (
            round(100 * used / limit, 2) if used is not None and limit > 0 else None
        ),
    }


def usage_snapshot(db: Session) -> dict:
    db_size = links = largest_workspace = None
    try:
        if db.get_bind().dialect.name == "postgresql":
            db_size = int(
                db.execute(
                    text("SELECT pg_database_size(current_database())")
                ).scalar_one()
            )
        links = int(
            db.scalar(
                select(func.count()).select_from(URL).where(URL.deleted_at.is_(None))
            )
            or 0
        )
        grouped = (
            select(func.count(URL.id).label("count"))
            .where(URL.deleted_at.is_(None))
            .group_by(URL.workspace_id)
            .subquery()
        )
        largest_workspace = int(db.scalar(select(func.max(grouped.c.count))) or 0)
    except Exception:
        db.rollback()
    info = None
    try:
        info = read_cache(lambda: redis_client.info())
    except Exception:
        pass
    redis_memory = command_rate = None
    if isinstance(info, dict):
        for name, value in info.items():
            if isinstance(value, (int, float)) and value >= 0:
                if name == "used_memory":
                    redis_memory = int(value)
                if name == "instantaneous_ops_per_sec":
                    command_rate = float(value)
    with GLOBAL_LIMITS.lock:
        llm_used = (
            GLOBAL_LIMITS.used
            if GLOBAL_LIMITS.day == datetime.now(timezone.utc).date()
            else 0
        )
        llm_budget = GLOBAL_LIMITS.budget
    return {
        "measured_at": datetime.now(timezone.utc).isoformat(),
        "redis_commands_per_second_estimate": command_rate,
        "limits": [
            measurement(
                "database_bytes", db_size, settings.USAGE_DATABASE_LIMIT_BYTES, "bytes"
            ),
            measurement(
                "redis_memory_bytes",
                redis_memory,
                settings.USAGE_REDIS_LIMIT_BYTES,
                "bytes",
            ),
            measurement(
                "redis_daily_commands",
                command_rate * 86400 if command_rate is not None else None,
                settings.USAGE_REDIS_DAILY_COMMAND_LIMIT,
                "commands/day",
                estimated=True,
            ),
            measurement("llm_daily_requests", llm_used, llm_budget, "requests/day"),
            measurement(
                "active_links", links, settings.USAGE_TOTAL_LINK_LIMIT, "links"
            ),
            measurement(
                "largest_workspace_links",
                largest_workspace,
                settings.FREE_WORKSPACE_LINKS,
                "links",
            ),
        ],
        "limitations": [
            "LLM usage resets on process restart. Zero budget disables calls.",
            "Redis daily commands extrapolates recent server rate, not billing usage.",
            "Render hours/bandwidth and Grafana usage require dashboard checks.",
        ],
    }

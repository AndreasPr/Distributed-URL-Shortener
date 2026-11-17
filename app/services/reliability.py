"""Runtime controls are application admission switches, not a SQL read-only role."""

import re

from fastapi import HTTPException
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from app.core.config import settings


def public_controls() -> dict[str, bool]:
    return {
        "signups_enabled": settings.SIGNUPS_ENABLED and not settings.READ_ONLY_MODE,
        "link_creation_enabled": settings.LINK_CREATION_ENABLED
        and not settings.READ_ONLY_MODE,
        "llm_enabled": settings.LLM_ENABLED,
        "read_only_mode": settings.READ_ONLY_MODE,
    }


def require_signup_enabled() -> None:
    if not public_controls()["signups_enabled"]:
        raise HTTPException(
            503,
            detail={
                "code": "signups_disabled",
                "message": "New accounts are temporarily disabled.",
            },
        )


class ReliabilityControls:
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http" and scope["method"] in {
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
        }:
            path = scope["path"].rstrip("/")
            code = None
            if (
                settings.READ_ONLY_MODE
                and path != "/auth/dev-login"
                and not re.fullmatch(r"/warnings/[A-Za-z0-9_-]{1,32}/continue", path)
            ):
                code = "read_only_mode"
            elif path == "/shorten" and not settings.LINK_CREATION_ENABLED:
                code = "link_creation_disabled"
            if code:
                await JSONResponse(
                    {
                        "detail": {
                            "code": code,
                            "message": (
                                "Changes are temporarily paused. "
                                "Existing links remain available."
                            ),
                        }
                    },
                    status_code=503,
                    headers={"Retry-After": "300"},
                )(scope, receive, send)
                return
        await self.app(scope, receive, send)

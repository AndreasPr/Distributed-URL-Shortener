"""Fail closed when the actual local-auth listener cannot be established."""

import ipaddress
import logging
import os
import sys
from pathlib import Path

from app.core.config import settings


def validate_local_binding() -> None:
    if settings.AUTH_MODE != "local":
        return
    if settings.ENVIRONMENT == "production":
        raise RuntimeError("Production requires AUTH_MODE=supabase")
    args = sys.argv
    host = None
    launcher = Path(args[0])
    if launcher.name == "uvicorn" or (
        launcher.name == "__main__.py" and launcher.parent.name == "uvicorn"
    ):
        host = os.getenv("UVICORN_HOST", "127.0.0.1")
        for index, arg in enumerate(args):
            if arg == "--host" and index + 1 < len(args):
                host = args[index + 1]
            elif arg.startswith("--host="):
                host = arg.split("=", 1)[1]
        if (
            any(arg.split("=", 1)[0] in {"--fd", "--uds"} for arg in args)
            or os.getenv("UVICORN_FD")
            or os.getenv("UVICORN_UDS")
        ):
            host = None
    try:
        loopback = host is not None and ipaddress.ip_address(host).is_loopback
    except ValueError:
        loopback = False
    if not loopback and not settings.LOCAL_AUTH_I_UNDERSTAND:
        raise RuntimeError(
            "Local auth requires a verified loopback Uvicorn listener "
            "or LOCAL_AUTH_I_UNDERSTAND=true"
        )
    logging.getLogger(__name__).critical(
        "LOCAL AUTH ENABLED: passwordless owner login; "
        "never expose this listener to untrusted clients"
    )

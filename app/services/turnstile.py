"""Server-side CAPTCHA validation; never log tokens or provider response bodies."""

import json

import requests
from fastapi import HTTPException

from app.core.config import settings


def verify_captcha(token: str, action: str) -> None:
    if not settings.TURNSTILE_SECRET_KEY or not settings.TURNSTILE_HOSTNAMES:
        raise HTTPException(503, "Report security check is not configured")
    try:
        with requests.post(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            data={"secret": settings.TURNSTILE_SECRET_KEY, "response": token},
            timeout=(2, 2),
            allow_redirects=False,
            stream=True,
        ) as response:
            if response.status_code != 200:
                raise ValueError("unavailable")
            data = bytearray()
            for chunk in response.iter_content(1024):
                data.extend(chunk)
                if len(data) > 16384:
                    raise ValueError("oversized")
            result = json.loads(data)
    except (requests.RequestException, ValueError):
        raise HTTPException(503, "Security check unavailable; please retry") from None
    if (
        not isinstance(result, dict)
        or result.get("success") is not True
        or result.get("hostname") not in settings.TURNSTILE_HOSTNAMES
        or result.get("action") != action
    ):
        raise HTTPException(400, "Security check failed; please retry")

"""Only the authenticated Supabase user endpoint attests email confirmation."""

import json
from datetime import datetime

import requests

from app.core.config import settings
from app.observability.metrics import auth_email_verification_total


def confirmed_email(subject: str, token: str) -> tuple[str, bool] | None:
    if not settings.SUPABASE_ANON_KEY:
        auth_email_verification_total.labels(result="unconfigured").inc()
        return None
    try:
        with requests.get(
            settings.SUPABASE_URL + "/auth/v1/user",
            headers={
                "apikey": settings.SUPABASE_ANON_KEY,
                "Authorization": "Bearer " + token,
            },
            timeout=2,
            allow_redirects=False,
            stream=True,
        ) as response:
            if response.status_code != 200:
                raise ValueError("User endpoint failed")
            body = bytearray()
            for chunk in response.iter_content(chunk_size=4096):
                body.extend(chunk)
                if len(body) > 65536:
                    raise ValueError("User response too large")
            user = json.loads(body)
        if user["id"] != subject or user.get("is_anonymous") is True:
            raise ValueError("User identity mismatch")
        email = user["email"]
        if not isinstance(email, str) or not 3 <= len(email) <= 320 or "@" not in email:
            raise ValueError("Invalid email")
        timestamp = user.get("email_confirmed_at")
        verified = timestamp is not None
        if verified:
            if not isinstance(timestamp, str) or not timestamp:
                raise ValueError("Invalid confirmation timestamp")
            parsed = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
            if parsed.tzinfo is None:
                raise ValueError("Confirmation timestamp lacks timezone")
        auth_email_verification_total.labels(
            result="confirmed" if verified else "unconfirmed"
        ).inc()
        return email.lower(), verified
    except (requests.RequestException, ValueError, TypeError, KeyError):
        # Keep the last trusted value. Never log response bodies, headers or tokens.
        auth_email_verification_total.labels(result="failed").inc()
        return None

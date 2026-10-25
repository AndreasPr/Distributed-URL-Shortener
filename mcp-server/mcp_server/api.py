"""Bounded HTTP-only boundary to the shortener; no redirects or ambient proxies."""

import json
from urllib.parse import urlsplit

import httpx
from mcp_server.config import settings


class APIError(Exception):
    def __init__(self, code: str):
        self.code = code
        super().__init__(code)


def request(method: str, path: str, *, params=None, body=None):
    origin = urlsplit(settings.MCP_API_BASE_URL)
    if (
        origin.scheme not in {"http", "https"}
        or not origin.hostname
        or origin.username
        or origin.password
        or origin.query
        or origin.fragment
        or origin.path not in {"", "/"}
    ):
        raise APIError("invalid_api_origin")
    if origin.scheme == "http" and origin.hostname not in {
        "localhost",
        "127.0.0.1",
        "::1",
        "api",
        "api-redis",
    }:
        raise APIError("https_required")
    if not settings.MCP_API_KEY:
        raise APIError("missing_api_key")
    try:
        with httpx.Client(
            timeout=settings.MCP_HTTP_TIMEOUT_SECONDS,
            follow_redirects=False,
            trust_env=False,
        ) as client:
            with client.stream(
                method,
                settings.MCP_API_BASE_URL.rstrip("/") + path,
                headers={"X-API-Key": settings.MCP_API_KEY},
                params=params,
                json=body,
            ) as response:
                if not 200 <= response.status_code < 300:
                    raise APIError(f"api_http_{response.status_code}")
                if response.status_code == 204:
                    return {"success": True}
                data = bytearray()
                for chunk in response.iter_bytes():
                    data.extend(chunk)
                    if len(data) > 262144:
                        raise APIError("response_too_large")
                return json.loads(data)
    except APIError:
        raise
    except httpx.TimeoutException:
        raise APIError("api_timeout") from None
    except (httpx.HTTPError, ValueError):
        raise APIError("api_unavailable_or_invalid_response") from None

"""Atomic Redis token buckets shared across replicas and matched route templates."""

import hashlib
import ipaddress
from dataclasses import dataclass

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool
from starlette.routing import Match

from app.cache import redis_client as cache
from app.core.config import settings

TOKEN_BUCKET_LUA = """
local now_parts = redis.call('TIME')
local now = tonumber(now_parts[1]) + tonumber(now_parts[2]) / 1000000
local capacity = tonumber(ARGV[1])
local refill = tonumber(ARGV[2])
local previous = redis.call('HMGET', KEYS[1], 'tokens', 'updated')
local tokens = tonumber(previous[1]) or capacity
local updated = tonumber(previous[2]) or now
now = math.max(now, updated)
tokens = math.min(capacity, tokens + (now - updated) * refill)
local allowed = 0
if tokens >= 1 then
    allowed = 1
    tokens = tokens - 1
end
redis.call('HSET', KEYS[1], 'tokens', tokens, 'updated', now)
redis.call('PEXPIRE', KEYS[1], math.ceil(capacity / refill * 1000))
local retry = 0
if allowed == 0 then retry = math.ceil((1 - tokens) / refill) end
return {allowed, math.floor(tokens), retry, math.ceil((capacity - tokens) / refill)}
"""


@dataclass(frozen=True)
class BucketResult:
    allowed: bool
    remaining: int
    retry_after: int
    reset: int
    capacity: int

    def headers(self) -> dict[str, str]:
        headers = {
            "RateLimit-Limit": str(self.capacity),
            "RateLimit-Remaining": str(self.remaining),
            "RateLimit-Reset": str(self.reset),
        }
        if not self.allowed:
            headers["Retry-After"] = str(max(1, self.retry_after))
        return headers


def check_bucket(
    template: str, identity: str, capacity: int, refill: float
) -> BucketResult:
    identity_hash = hashlib.sha256(identity.encode()).hexdigest()
    key = f"rate_limit:tb:{template}:{identity_hash}"
    result = cache.read_cache(
        lambda: cache.redis_client.eval(TOKEN_BUCKET_LUA, 1, key, capacity, refill)
    )
    if result is None:
        raise ConnectionError("Rate limit store unavailable")
    allowed, remaining, retry, reset = result
    return BucketResult(bool(allowed), int(remaining), int(retry), int(reset), capacity)


def client_ip(request: Request) -> str:
    peer = request.client.host if request.client else "unknown"
    trusted = [
        ipaddress.ip_network(network, strict=False)
        for network in settings.TRUSTED_PROXIES
    ]

    def is_trusted(address: str) -> bool:
        try:
            ip = ipaddress.ip_address(address)
            return any(ip in network for network in trusted)
        except ValueError:
            return False

    if not is_trusted(peer):
        return peer
    forwarded = request.headers.get("x-forwarded-for", "")
    if not forwarded or len(forwarded) > 4096:
        return peer
    # Walk from the socket toward the client; never trust an attacker-added prefix.
    current = peer
    for value in reversed(forwarded.split(",")):
        if not is_trusted(current):
            break
        try:
            current = str(ipaddress.ip_address(value.strip()))
        except ValueError:
            return peer
    return current


def limit_write(request: Request, key_id: int) -> None:
    template = request.scope["route"].path
    try:
        result = check_bucket(
            template,
            f"key:{key_id}",
            settings.WRITE_RATE_CAPACITY,
            settings.WRITE_RATE_REFILL,
        )
    except Exception as exc:
        raise HTTPException(
            503, "Write rate limiter unavailable", headers={"Retry-After": "1"}
        ) from exc
    request.state.rate_limit_headers = result.headers()
    if not result.allowed:
        raise HTTPException(429, "Rate limit exceeded", headers=result.headers())


async def rate_limit_middleware(request: Request, call_next):
    # Middleware runs before routing. Match in the same order as Starlette;
    # /health, /metrics and other fixed routes must not become /{code} buckets.
    template = None
    for route in request.app.router.routes:
        match, _ = route.matches(request.scope)
        if match == Match.FULL:
            template = getattr(route, "path", None)
            break
    headers = {}
    if request.method == "GET" and template == "/{code}":
        try:
            result = await run_in_threadpool(
                check_bucket,
                template,
                f"ip:{client_ip(request)}",
                settings.REDIRECT_RATE_CAPACITY,
                settings.REDIRECT_RATE_REFILL,
            )
        except Exception:
            # Redirect availability wins over limiting during Redis outages.
            pass
        else:
            headers = result.headers()
            if not result.allowed:
                return JSONResponse(
                    {"detail": "Rate limit exceeded"}, status_code=429, headers=headers
                )
    response = await call_next(request)
    response.headers.update(getattr(request.state, "rate_limit_headers", headers))
    return response

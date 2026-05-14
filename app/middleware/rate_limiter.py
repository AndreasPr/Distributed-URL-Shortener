import time
import uuid

from fastapi import Request
from fastapi.responses import JSONResponse

from app.cache.redis_client import redis_client

WINDOW_SECONDS = 60
WINDOW_MILLISECONDS = WINDOW_SECONDS * 1000
DEFAULT_LIMIT = 100

ROUTE_LIMITS = {
	"/shorten": 20,
}

# Atomic sliding-window check/add in Redis
_SLIDING_WINDOW_LUA = """
local key = KEYS[1]
local now_ms = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]

redis.call('ZREMRANGEBYSCORE', key, '-inf', now_ms - window_ms)

local current_count = redis.call('ZCARD', key)
if current_count >= limit then
	local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
	local retry_after_ms = window_ms

	if oldest[2] then
		retry_after_ms = window_ms - (now_ms - tonumber(oldest[2]))
		if retry_after_ms < 0 then
			retry_after_ms = 0
		end
	end

	return {0, current_count, retry_after_ms}
end

redis.call('ZADD', key, now_ms, member)
redis.call('PEXPIRE', key, window_ms)

return {1, current_count + 1, 0}
"""


def _get_client_ip(request: Request) -> str:
	forwarded_for = request.headers.get("x-forwarded-for")
	if forwarded_for:
		return forwarded_for.split(",")[0].strip()

	if request.client and request.client.host:
		return request.client.host

	return "unknown"


def _resolve_limit(path: str) -> int:
	return ROUTE_LIMITS.get(path, DEFAULT_LIMIT)


def _check_sliding_window(key: str, limit: int) -> tuple[bool, int, int]:
	now_ms = int(time.time() * 1000)
	member = f"{now_ms}-{uuid.uuid4().hex}"

	allowed, current_count, retry_after_ms = redis_client.eval(
		_SLIDING_WINDOW_LUA,
		1,
		key,
		now_ms,
		WINDOW_MILLISECONDS,
		limit,
		member,
	)

	return bool(allowed), int(current_count), int(retry_after_ms)


async def rate_limit_middleware(request: Request, call_next):
	if request.url.path == "/metrics":
		return await call_next(request)

	client_ip = _get_client_ip(request)
	path = request.url.path
	limit = _resolve_limit(path)
	key = f"rate_limit:sw:{path}:{client_ip}"

	try:
		allowed, current_count, retry_after_ms = _check_sliding_window(key, limit)
	except Exception:
		# Fail open if Redis is temporarily unavailable.
		return await call_next(request)

	if not allowed:
		retry_after_seconds = max(1, (retry_after_ms + 999) // 1000)
		return JSONResponse(
			status_code=429,
			content={
				"error": "Rate limit exceeded",
				"path": path,
				"limit": limit,
				"window_seconds": WINDOW_SECONDS,
				"retry_after_seconds": retry_after_seconds,
			},
			headers={
				"Retry-After": str(retry_after_seconds),
				"X-RateLimit-Limit": str(limit),
				"X-RateLimit-Remaining": "0",
			},
		)

	response = await call_next(request)
	remaining = max(limit - current_count, 0)
	response.headers["X-RateLimit-Limit"] = str(limit)
	response.headers["X-RateLimit-Remaining"] = str(remaining)
	return response

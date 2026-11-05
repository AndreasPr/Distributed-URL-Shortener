"""Bounded JWT verification. No token-controlled URLs or algorithm/key fallback."""

import json
import threading
import time
from functools import lru_cache
from typing import Any
from uuid import UUID

import jwt
import requests
from cryptography.hazmat.primitives.asymmetric import ec, rsa

from app.core.config import settings


class InvalidToken(Exception):
    def __init__(self, reason: str = "invalid_token"):
        self.reason = reason


class JWKSCache:
    def __init__(self, url: str, ttl: float = 600, refresh_interval: float = 10):
        self.url = url
        self.ttl = ttl
        self.refresh_interval = refresh_interval
        self.keys: dict[str, dict[str, Any]] = {}
        self.expires = 0.0
        self.next_refresh = 0.0
        self.lock = threading.Lock()

    def key(self, kid: str, algorithm: str) -> Any:
        with self.lock:
            now = time.monotonic()
            if now >= self.expires or kid not in self.keys:
                if now < self.next_refresh:
                    raise InvalidToken("jwks_refresh_limited")
                # Failed requests also consume the refresh budget.
                self.next_refresh = now + self.refresh_interval
                try:
                    with requests.get(
                        self.url, timeout=(2, 3), allow_redirects=False, stream=True
                    ) as response:
                        response.raise_for_status()
                        raw = bytearray()
                        for chunk in response.iter_content(chunk_size=4096):
                            raw.extend(chunk)
                            if len(raw) > 65536:
                                raise ValueError("JWKS too large")
                        document = json.loads(raw)
                    entries = document["keys"]
                    if not isinstance(entries, list) or len(entries) > 32:
                        raise ValueError("Invalid key set")
                    keys = {
                        item["kid"]: item
                        for item in entries
                        if isinstance(item, dict)
                        and isinstance(item.get("kid"), str)
                        and item.get("kty") in {"RSA", "EC"}
                        and item.get("use", "sig") == "sig"
                        and "verify" in item.get("key_ops", ["verify"])
                    }
                    self.keys = keys
                    self.expires = now + self.ttl
                except (requests.RequestException, ValueError, KeyError, TypeError):
                    raise InvalidToken("jwks_unavailable") from None
            entry = self.keys.get(kid)
            if entry is None:
                raise InvalidToken("unknown_kid")
            if entry.get("alg", algorithm) != algorithm:
                raise InvalidToken("algorithm")
            if entry.get("kty") != {"RS256": "RSA", "ES256": "EC"}[algorithm]:
                raise InvalidToken("algorithm")
            return jwt.PyJWK.from_dict(entry, algorithm=algorithm).key


@lru_cache(maxsize=4)
def jwks_cache(url: str, ttl: float, interval: float) -> JWKSCache:
    return JWKSCache(url, ttl, interval)


_local_key_lock = threading.Lock()
_local_signing_key: rsa.RSAPrivateKey | None = None


def local_key() -> rsa.RSAPrivateKey:
    # Unlike lru_cache alone, this cannot generate different keys concurrently.
    # Local demo only: restarting this single API process invalidates its tokens.
    global _local_signing_key
    with _local_key_lock:
        if _local_signing_key is None:
            _local_signing_key = rsa.generate_private_key(
                public_exponent=65537, key_size=2048
            )
        return _local_signing_key


def verify_token(token: str) -> dict[str, Any]:
    key: str | rsa.RSAPublicKey | ec.EllipticCurvePublicKey
    try:
        if len(token) > 16384:
            raise InvalidToken()
        header = jwt.get_unverified_header(token)
        algorithm = header.get("alg")
        if settings.AUTH_MODE == "local":
            key = local_key().public_key()
            issuer, audience, algorithms = (
                "relaymark-local",
                "relaymark-demo",
                ["RS256"],
            )
        elif settings.AUTH_MODE == "supabase":
            issuer = settings.SUPABASE_URL.rstrip("/") + "/auth/v1"
            audience = settings.SUPABASE_JWT_AUDIENCE
            algorithms = list(settings.SUPABASE_JWT_ALGORITHMS)
            if algorithm == "HS256" and settings.SUPABASE_LEGACY_JWT_SECRET:
                key = settings.SUPABASE_LEGACY_JWT_SECRET
                algorithms = ["HS256"]
            else:
                if algorithm not in algorithms:
                    raise InvalidToken("algorithm")
                kid = header.get("kid")
                if not isinstance(kid, str) or not 1 <= len(kid) <= 256:
                    raise InvalidToken("unknown_kid")
                key = jwks_cache(
                    issuer + "/.well-known/jwks.json",
                    settings.JWKS_CACHE_TTL,
                    settings.JWKS_REFRESH_INTERVAL,
                ).key(kid, algorithm)
        else:
            raise InvalidToken("mode")
        claims = jwt.decode(
            token,
            key,
            algorithms=algorithms,
            issuer=issuer,
            audience=audience,
            options={"require": ["exp", "iss", "aud", "sub"]},
        )
        if claims.get("is_anonymous") is True:
            raise InvalidToken("anonymous_session")
        claims["sub"] = str(UUID(claims["sub"]))
        return claims
    except InvalidToken:
        raise
    except jwt.ExpiredSignatureError:
        raise InvalidToken("expired") from None
    except (jwt.PyJWTError, ValueError, TypeError, AttributeError):
        raise InvalidToken() from None

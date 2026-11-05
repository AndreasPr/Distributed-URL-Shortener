"""Loopback-only GoTrue/API contract fixture. No production auth bypass exists."""

import base64
import hashlib
import json
import sys
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
import jwt
from app.services.jwt_auth import local_key

SUB = "00000000-0000-0000-0000-000000000010"
W1 = "00000000-0000-0000-0000-000000000001"
W2 = "00000000-0000-0000-0000-000000000002"
refreshes = {}
codes = {}


def session(email="owner@example.test", expires=3600):
    now = int(time.time())
    user = {
        "id": SUB,
        "aud": "authenticated",
        "role": "authenticated",
        "email": email,
        "email_confirmed_at": "2026-01-01T00:00:00Z",
        "created_at": "2026-01-01T00:00:00Z",
        "app_metadata": {"provider": "email"},
        "user_metadata": {"display_name": "Test owner"},
    }
    token = jwt.encode(
        {
            "sub": SUB,
            "iss": "relaymark-local",
            "aud": "relaymark-demo",
            "exp": now + expires,
            "iat": now,
            "email": email,
        },
        local_key(),
        algorithm="RS256",
    )
    refresh = str(uuid4())
    refreshes[refresh] = email
    return {
        "access_token": token,
        "refresh_token": refresh,
        "token_type": "bearer",
        "expires_in": expires,
        "expires_at": now + expires,
        "user": user,
    }


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def reply(self, status, body):
        payload = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Access-Control-Allow-Origin", "http://127.0.0.1:3100")
        self.send_header(
            "Access-Control-Allow-Headers",
            "authorization, apikey, content-type, x-client-info, x-supabase-api-version, x-workspace-id",
        )
        self.send_header(
            "Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS"
        )
        self.send_header("Access-Control-Expose-Headers", "Retry-After")
        self.send_header("Retry-After", "7")
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_OPTIONS(self):
        self.reply(200, {})

    def do_GET(self):
        path = urlparse(self.path)
        if path.path == "/fixture/expired":
            result = session(expires=-60)
            result["refresh_token"] = "unknown"
            return self.reply(200, result)
        if path.path == "/ready":
            return self.reply(200, {})
        if path.path == "/health":
            return self.reply(
                200, {"status": "healthy", "redis": "ok", "total_urls": 1}
            )
        if path.path == "/auth/v1/authorize":
            q = parse_qs(path.query)
            code = str(uuid4())
            codes[code] = q.get("code_challenge", [""])[0]
            self.send_response(302)
            self.send_header("Location", q["redirect_to"][0] + "&code=" + code)
            self.end_headers()
            return
        try:
            claims = jwt.decode(
                self.headers.get("Authorization", "").removeprefix("Bearer "),
                local_key().public_key(),
                algorithms=["RS256"],
                audience="relaymark-demo",
                issuer="relaymark-local",
            )
        except jwt.PyJWTError:
            return self.reply(401, {"message": "Invalid credentials"})
        if path.path == "/auth/v1/user":
            return self.reply(200, session(claims["email"])["user"])
        if path.path == "/me":
            return self.reply(
                200,
                {
                    "user_id": SUB,
                    "workspace_id": self.headers.get("X-Workspace-ID", W1),
                    "role": "owner",
                    "email_verified": True,
                    "platform_admin": False,
                },
            )
        if path.path == "/workspaces":
            return self.reply(
                200,
                [
                    {"id": W1, "name": "Personal", "slug": "personal"},
                    {"id": W2, "name": "Team", "slug": "team"},
                ],
            )
        if path.path == "/urls":
            return self.reply(
                200,
                [
                    {
                        "short_code": (
                            "team-code"
                            if self.headers.get("X-Workspace-ID") == W2
                            else "personal-code"
                        ),
                        "long_url": "https://example.com",
                        "created_at": "2026-01-01",
                        "click_count": 0,
                    }
                ],
            )
        if path.path.startswith("/admin/"):
            return self.reply(403, {"detail": "Platform administrator required"})
        if path.path == "/api-keys":
            return self.reply(200, [])
        return self.reply(200, {"status": "healthy", "redis": "ok", "total_urls": 1})

    def do_POST(self):
        path = urlparse(self.path)
        body = json.loads(
            self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"{}"
        )
        if path.path == "/auth/v1/token":
            grant = parse_qs(path.query).get("grant_type", [""])[0]
            if grant == "refresh_token":
                email = refreshes.get(body.get("refresh_token"))
                if not email:
                    return self.reply(
                        400,
                        {
                            "error_code": "refresh_token_not_found",
                            "msg": "Session expired",
                        },
                    )
                return self.reply(200, session(email))
            if grant == "pkce":
                expected = codes.pop(body.get("auth_code"), None)
                actual = (
                    base64.urlsafe_b64encode(
                        hashlib.sha256(body.get("code_verifier", "").encode()).digest()
                    )
                    .decode()
                    .rstrip("=")
                )
                if expected != actual:
                    return self.reply(400, {"msg": "Invalid verifier"})
                return self.reply(200, session())
            return self.reply(200, session(body.get("email", "owner@example.test")))
        if path.path == "/auth/v1/signup":
            return self.reply(200, session(body["email"])["user"])
        if path.path == "/auth/v1/logout":
            return self.reply(200, {})
        if path.path == "/shorten":
            return self.reply(429, {"detail": "Rate limited"})
        return self.reply(200, {})

    def do_PUT(self):
        self.reply(200, session()["user"])


if __name__ == "__main__":
    ThreadingHTTPServer.request_queue_size = 128
    ThreadingHTTPServer(("127.0.0.1", 3199), Handler).serve_forever()

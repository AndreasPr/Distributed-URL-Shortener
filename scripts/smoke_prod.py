"""Bounded hosted smoke test. Credentials come only from environment, never output."""

import os
import re
import sys
import time
from datetime import datetime, timedelta, timezone
from urllib.parse import urlsplit
from uuid import uuid4

import requests


class Failure(Exception):
    pass


def base(value):
    parsed = urlsplit(value)
    if (
        parsed.scheme != "https"
        or not parsed.hostname
        or parsed.username
        or parsed.password
        or parsed.query
        or parsed.fragment
    ):
        raise Failure("configuration: use credential-free HTTPS origins/bases")
    return value.rstrip("/")


def request(session, method, url, *, key=None, timeout=10, **kwargs):
    headers = {"X-API-Key": key} if key else {}
    try:
        return session.request(
            method,
            url,
            headers=headers,
            timeout=timeout,
            allow_redirects=False,
            **kwargs,
        )
    except requests.RequestException:
        raise Failure("network: request failed or timed out") from None


def wait_live(
    session, api, seconds, revision="", clock=time.monotonic, sleep=time.sleep
):
    deadline = clock() + seconds
    while clock() < deadline:
        try:
            response = request(
                session,
                "GET",
                api + "/livez",
                timeout=max(0.1, min(5, deadline - clock())),
            )
            if response.status_code == 200 and (
                not revision
                or response.headers.get("X-Deployment-Revision") == revision
            ):
                return
        except Failure:
            pass
        sleep(min(2, max(0, deadline - clock())))
    raise Failure(
        "deployment: expected revision not live"
        if revision
        else "cold start: /livez did not return 200 within 90 seconds"
    )


def smoke(session, api, short_base, key, sleep=time.sleep, clock=time.monotonic):
    wait_live(session, api, 90, clock=clock, sleep=sleep)
    # /livez intentionally answers before migrations and consumers are ready.
    ready_until = clock() + 60
    while True:
        health = request(session, "GET", api + "/health")
        if health.status_code == 200:
            break
        if clock() >= ready_until:
            raise Failure(
                f"health: HTTP {health.status_code}; inspect Render dependency health"
            )
        sleep(2)
    code = "smoke-" + uuid4().hex[:16]
    destination = "https://example.com/"
    problem = None
    try:
        result = request(
            session,
            "POST",
            api + "/shorten",
            key=key,
            json={
                "long_url": destination,
                "custom_alias": code,
                "expires_at": (
                    datetime.now(timezone.utc) + timedelta(hours=1)
                ).isoformat(),
            },
        )
        if result.status_code != 200:
            raise Failure(
                f"creation: HTTP {result.status_code}; check key owner/scopes/quota"
            )
        if result.json().get("short_code") != code:
            raise Failure("creation: unexpected response contract")
        bases = list(dict.fromkeys([api, short_base]))
        for index, origin in enumerate(bases):
            redirect = request(session, "GET", origin + "/" + code)
            if (
                redirect.status_code != 307
                or redirect.headers.get("Location") != destination
            ):
                raise Failure(
                    f"redirect hop {index + 1}: wrong 307/Location; try API directly"
                )
        deadline = clock() + 60
        while clock() < deadline:
            analytics = request(session, "GET", api + "/analytics/" + code, key=key)
            if analytics.status_code != 200:
                raise Failure(
                    f"analytics: HTTP {analytics.status_code}; check read scope"
                )
            count = analytics.json().get("total_clicks")
            if count == len(bases):
                break
            if isinstance(count, int) and count > len(bases):
                raise Failure("analytics: duplicate/unexpected clicks")
            sleep(2)
        else:
            raise Failure(
                "analytics: clicks not visible within 60 seconds; inspect worker/broker"
            )
    except Exception as exc:
        problem = (
            exc
            if isinstance(exc, Failure)
            else Failure("response: invalid API contract")
        )
    finally:
        try:
            removed = request(session, "DELETE", api + "/urls/" + code, key=key)
            if removed.status_code not in (204, 404):
                raise Failure(
                    f"cleanup: HTTP {removed.status_code}; inspect synthetic links"
                )
        except Failure as exc:
            problem = problem or exc
    if problem:
        raise problem
    print(
        "PASS: livez, health, exact 307/Location, analytics and synthetic-link cleanup"
    )


def main():
    try:
        api = base(os.environ.get("API_ORIGIN", ""))
        if urlsplit(api).path:
            raise Failure("configuration: API_ORIGIN must be an origin without a path")
        short = base(os.environ.get("SMOKE_SHORT_BASE_URL") or api)
        key = os.environ.get("SMOKE_API_KEY", "")
        if not key:
            raise Failure("configuration: synthetic read/write key is missing")
        with requests.Session() as session:
            session.trust_env = False
            revision = os.environ.get("SMOKE_EXPECTED_REVISION", "")
            if revision:
                if not re.fullmatch(r"[0-9a-f]{40}", revision):
                    raise Failure(
                        "configuration: expected revision must be a commit SHA"
                    )
                # Build/deploy wait is separate from the 90-second cold-start check.
                wait_live(session, api, 900, revision)
            smoke(session, api, short, key)
        return 0
    except Failure as exc:
        print("FAIL: " + str(exc))
        return 1
    except Exception:
        print("FAIL: unexpected configuration/verification error; details withheld")
        return 1


if __name__ == "__main__":
    sys.exit(main())

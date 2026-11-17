#!/usr/bin/env python3
"""Small scheduled health/quota checks; never print response bodies or credentials."""
import argparse
import json
import math
import os
import re
import urllib.error
import urllib.request
from urllib.parse import urlsplit


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def request(url, token=None, payload=None, method=None, api_key=False):
    headers = {"Accept": "application/json", "User-Agent": "relaymark-monitor"}
    if token:
        headers["X-API-Key" if api_key else "Authorization"] = token if api_key else "Bearer " + token
    data = json.dumps(payload).encode() if payload is not None else None
    if data:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.build_opener(NoRedirect()).open(req, timeout=90) as response:
        body = response.read(1024 * 1024 + 1)
        if len(body) > 1024 * 1024:
            raise ValueError("Response too large")
        return json.loads(body)


def origin(value):
    parsed = urlsplit(value)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.path not in {"", "/"}:
        raise ValueError("HTTPS API origin required")
    return value.rstrip("/")


def breaches(snapshot):
    result = []
    for entry in snapshot["limits"]:
        name, limit, used = entry["name"], entry.get("limit"), entry.get("used")
        if not re.fullmatch(r"[a-z_]{1,50}", name):
            raise ValueError("Invalid limit name")
        if entry.get("status") != "ok" or used is None:
            raise ValueError("Usage measurement unavailable")
        if limit is None:
            continue
        if not all(isinstance(v, (int, float)) and math.isfinite(v) for v in (limit, used)) or limit <= 0 or used < 0:
            raise ValueError("Invalid usage values")
        ratio = used / limit
        if ratio >= 0.7:
            result.append((name, 90 if ratio >= 0.9 else 70, used, limit, bool(entry.get("estimated"))))
    return result


def update_issues(snapshot, repository, token, call=request):
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repository):
        raise ValueError("Invalid repository")
    base = "https://api.github.com/repos/" + repository + "/issues"
    findings = breaches(snapshot)
    if not findings:
        return
    existing = []
    for page in range(1, 11):
        batch = call(base + f"?state=open&per_page=100&page={page}", token)
        existing.extend(batch)
        if len(batch) < 100:
            break
    else:
        raise ValueError("Issue pagination budget exceeded")
    for name, level, used, limit, estimated in findings:
        marker = f"<!-- relaymark-quota:{name} -->"
        title = f"Quota {level}%: {name}"
        previous = next((i for i in existing if not i.get("pull_request") and marker in (i.get("body") or "") and i.get("user", {}).get("login") == "github-actions[bot]"), None)
        if previous and (previous["title"] == title or previous["title"].startswith("Quota 90%:")):
            continue
        payload = {"title": title, "body": f"{marker}\nMeasured usage: {used:g} / {limit:g}.\nEstimated: {estimated}.\nReview docs/hosted-limits.md; reduce usage or disable writes. No automatic paid upgrade.\nOnly API-measured limits are covered; provider billing dashboards require separate review."}
        if previous:
            call(base + "/" + str(int(previous["number"])), token, payload, "PATCH")
        else:
            call(base, token, payload, "POST")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["health", "quota"])
    args = parser.parse_args()
    try:
        base = origin(os.environ["API_ORIGIN"])
        if args.mode == "health":
            body = request(base + "/health")
            if body.get("status") != "ok" or body.get("db") != "reachable" or body.get("redis") != "reachable":
                raise ValueError("Dependency degraded")
            print("PASS: health, database and Redis reachable")
        else:
            snapshot = request(base + "/admin/usage", os.environ["USAGE_API_KEY"], api_key=True)
            update_issues(snapshot, os.environ["GITHUB_REPOSITORY"], os.environ["GH_TOKEN"])
            print("PASS: measured quota checks completed; billing dashboards remain manual")
    except Exception as exc:
        print("FAIL: monitor (" + type(exc).__name__ + "); inspect configuration/dependencies privately")
        raise SystemExit(1) from None


if __name__ == "__main__":
    main()

# OpenTelemetry security patch — 2026-11-13

The supplied CI audit identifies `opentelemetry-api==1.45.1` as affected by
[CVE-2026-126360 / GHSA-mf5v-w3w3-f6cg](https://github.com/advisories/GHSA-mf5v-w3w3-f6cg).
The fix is 1.45.2. Malformed traceparent values carried in JSON can cause excessive
regex CPU work; HTTP header validation does not protect all event/MCP carriers.

Updated the pinned OpenTelemetry family to 1.45.2 / 0.66b2 and regenerated all
three hashed locks with `make lock`. Only the 15 OpenTelemetry packages changed.
The SDK pins the API and semantic-conventions versions, so upgrading just API/SDK
failed resolution against instrumentation 0.66b1; the compatible family resolves.
No advisory ignore, audit downgrade or application behavior workaround was added.

Added event-carrier regression cases rejecting oversized future-version context
and whitespace/newline context, while accepting a valid parent. The focused
tracing suite initially exposed a pre-existing fixture registration dependency
(`no such table: denied_domains`). Explicitly registering the trust models in
that test module makes its database fixture independent of collection order.

## Actual checks

```text
make lock + uv pip sync requirements-dev.txt --python .venv/bin/python
exit 0

uv pip check
Checked 116 packages in 8ms
All installed packages are compatible
exit 0

.venv/bin/python -m pip_audit --disable-pip --no-deps -r requirements.txt -r mcp-server/requirements.txt --format json --output /tmp/otel-pip-audit.json
No known vulnerabilities found
exit 0

.venv/bin/python -m pytest tests/test_observability.py -q
11 passed, 2 warnings in 0.73s
exit 0

make mcp-test
Success: no issues found in 14 source files
35 passed in 0.73s
exit 0
```

The audit still emits its informational `--no-deps` warning; the lock files are
hashed and the exact existing CI invocation was retained. The initial `uv pip
check` was blocked from reading its cache by the sandbox, then passed with cache
access. The initial focused tracing run failed before the fixture fix described
above. No failure is being treated as a passing check.

Complete local records: `/tmp/otel-lock.log`, `/tmp/otel-sync.log`,
`/tmp/otel-audit.log`, `/tmp/otel-pip-audit.json`, `/tmp/otel-focused-final.log`,
`/tmp/otel-check.log`, `/tmp/otel-mcp.log`. They are temporary local artifacts.
Frontend, Docker image, kind and full service integration checks were not rerun
for this Python dependency-only change. CI must rerun after pushing; the local
audit result is a point-in-time result, not a guarantee against future advisories.

Full backend gate, exit 0 (actual excerpt):

```text
make check
Success: no issues found in 88 source files
TOTAL                                       3689    229  93.79%
660 passed, 37 deselected, 2 warnings in 56.16s
Checking rules/slo.yml
  SUCCESS: 22 rules found
  SUCCESS
```

Black, isort, Flake8, mypy, unit tests and Prometheus validation passed.
`git diff --check` also passed. Changes are local and have not been pushed.

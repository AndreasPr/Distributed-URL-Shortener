# Render Key Value verification — 2026-11-13

Branch: `step-15-6a-render-keyvalue`. No live deployment or hosted service was
contacted. Public vendor documentation was reviewed; only a local disposable
Valkey container was used. No paid resource or secret was added.

## Scope

- Blueprint: one Free web service and one Free Key Value service, Virginia;
  empty external allowlist, noeviction, persistence off, injected connectionString.
- Production Redis guard: TLS externally; private single-label hostname allowlist
  `red-[a-z0-9]{1,59}` on port 6379 (or omitted). Query overrides forbidden.
- Tests cover allowed TLS/private URLs, malformed/unsafe URLs, credential-safe
  errors, production startup enforcement and unchanged development plaintext.
- Local image: `valkey/valkey:8.0.2-alpine`. This verifies Valkey major 8 command
  compatibility, not Render's exact patch, DNS, ACL, availability or restart behavior.

## Actual commands and results

```text
.venv/bin/python -m pytest --run-integration tests/integration/test_valkey_compatibility.py -s -q
Valkey 8: XADD XGROUP CREATE XREADGROUP XAUTOCLAIM XACK EVAL PASS
1 passed, 2 warnings in 0.46s
exit 0

make mcp-test
Success: no issues found in 14 source files
35 passed in 0.76s
exit 0

make frontend-check  # Node 22.23.4
# tests 23
# pass 23
# fail 0
cd frontend && ./node_modules/.bin/tsc --noEmit --incremental false
exit 0 (npm ci, ESLint, unit tests and TypeScript)
```

Full local command logs: `/tmp/relaymark-valkey-check.log`,
`/tmp/relaymark-keyvalue-mcp.log`, `/tmp/relaymark-keyvalue-frontend.log`.
These are temporary verification records, not committed artifacts.

Final full gate (exit 0), actual excerpts:

```text
make check
All done! ✨ 🍰 ✨
Success: no issues found in 88 source files
TOTAL                                       3689    229  93.79%
657 passed, 37 deselected, 2 warnings in 58.73s
Checking rules/slo.yml
  SUCCESS: 22 rules found
  SUCCESS
```

Black, isort, Flake8, mypy, unit coverage and Prometheus rule checks passed.
Complete local output: `/tmp/relaymark-keyvalue-check-final.log`.

Offline README validation (exit 0): 242 lines, 59 links and 33 command examples
checked; shell examples parse. External URLs were syntax-checked, not contacted.
Additional documentation check: 53 local link paths resolve (exit 0).
`git diff --check` passed (exit 0).

## Failures corrected during verification

The initial compatibility invocation lacked `--run-integration` and skipped its
test. The first enabled run failed because Docker returned no port binding for
`None`; using port `0` correctly requests a loopback-bound ephemeral port.
The rerun above passed. A filtered `docker ps -a` afterward returned no containers
with label `relaymark.purpose=valkey-compatibility` (exit 0).

The first `make check` failed (exit 2): 653 passed, 1 failed, 37 deselected.
The older production CORS test inherited plaintext localhost Redis; its fixture
now explicitly supplies TLS Redis. No guard was relaxed to satisfy the test.
Focused rerun: 51 passed, 1 Docker-marked test skipped, exit 0.

## Remaining operator verification

Apply the Blueprint only when ready, in one workspace, without upgrading any plan.
Verify both Free services, Virginia, empty external allowlist, private connection
injection, worker health and production smoke. These checks were deliberately
not run here. Free restart loss is an accepted limitation, not a durable queue
claim. Full PostgreSQL/Kafka integration suites were not rerun for this scoped change.

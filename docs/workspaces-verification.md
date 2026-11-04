# Users and workspaces verification — 2026-11-04

Branch: `step-15-1-users-workspaces`. CPython 3.11.14; Node 22.23.4;
Docker Desktop 27.4.0. All databases used below were disposable local containers.
No migration was applied to the developer's running stack or to any cloud service.

Scope follows the clarified request: Supabase-compatible user UUIDs/fields, a legacy
workspace backfill, RLS enabled without policies, API-key Principals, permissions,
tenant isolation, key-management HTTP endpoints and a marked user-token extension.
Plan limits are step 15.2; JWT verification is step 15.3. Owner endpoint paths are
tested using trusted dependency overrides, not a fake HTTP authentication scheme.

## Final output excerpts

All listed final commands exited **0**. Full local stdout/stderr logs were retained
under `/tmp/tenancy-*.log` for this session; these transient logs are not committed.

```text
make check
Success: no issues found in 75 source files
TOTAL                                       2606    165  93.67%
479 passed, 26 deselected, 6 warnings in 46.85s
Checking rules/slo.yml
  SUCCESS: 22 rules found
  SUCCESS

TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock make test-integration
TOTAL                                       2606    163  93.75%
Required test coverage of 93.6% reached. Total coverage: 93.75%
492 passed, 13 deselected, 7 warnings in 61.10s (0:01:01)

RUN_DOCKER_TESTS=1 .venv/bin/python -m pytest tests/test_tenancy_migrations.py tests/test_migrations.py -q
6 passed in 7.83s

make frontend-check
# tests 13
# pass 13
# fail 0
cd frontend && ./node_modules/.bin/tsc --noEmit --incremental false

make mcp-test
Success: no issues found in 14 source files
35 passed in 1.86s
```

Black, isort, Flake8, mypy, Prometheus validation/rule tests, frontend lint and strict
TypeScript all passed. The existing Starlette/FastAPI deprecation warnings remain;
they were not suppressed. The combined coverage floor remains 93.6%.

## What was exercised

- `tests/test_tenancy.py`: parametrized role/endpoint matrix; real API-key Principal;
  workspace header/body spoofing; per-key and human ownership; cross-tenant links,
  analytics, status previews, review, activity and key revocation; warm-cache private
  reads; one-time key response; invite uniqueness/pending state; last-owner checks;
  required repository workspace arguments and captured SQL WHERE predicates.
- `tests/integration/test_tenant_boundaries.py`: assembled API against real PostgreSQL
  UUID columns and real Redis Lua limiting with two workspaces. This test is included
  in the existing CI integration target.
- `tests/test_tenancy_migrations.py`: old-schema data in every tenant table survives
  backfill; schema matches models; RLS is on for every table and has zero policies;
  a temporary non-owner PostgreSQL role sees no rows and cannot insert; downgrade/
  re-upgrade preserves legacy business rows; simultaneous owner demotions serialize
  so one succeeds and one returns 409. Run the explicit Docker command above: these
  disposable migration tests are outside the ordinary integration marker target.
- Existing API-key tests, cache tests, event-worker tests and recorded MCP API response
  fixtures remain passing. Driver-native analytics timestamp formatting was retained.

Initial iterations failed because old mocks lacked the new Principal/workspace
contract, the SQLite boolean default differed from the migration, and an ORM timestamp
conversion changed a recorded SQLite response. Those defects were corrected without
relaxing authorization assertions or changing the recorded contract. Tests that open
local sockets were initially blocked by the sandbox and passed with authorized local
execution. Docker worked; Ryuk remained enabled with the documented socket mapping.

## Remaining boundaries and deployment steps

- Review [security](security.md) and [ADR 0035](adr/0035-workspaces-and-permissions.md).
- Back up before `alembic upgrade head`; inspect old aliases `me`, `workspaces`, and
  `api-keys` for route-name conflicts. No destinations are silently renamed.
- The current application database owner bypasses RLS. Do not switch to a non-owner
  role until verified context and policies exist in 15.3. RLS preparation is not a
  claim of database-enforced tenant isolation for the owner role.
- API keys cannot acquire owner/platform-admin permissions. No JWT/Supabase integration,
  invite delivery/acceptance, billing, workspace-delete endpoint or plan enforcement
  was added. Global review is not exposed to workspace admins.
- Optional Kafka/slow tests, kind deployment and frontend browser tests were not rerun;
  this change does not modify broker adapters, manifests or frontend code. GitHub-hosted
  workflows have not been dispatched, and nothing has been pushed or deployed.

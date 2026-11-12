# Hosted profile verification — 2026-11-11

Branch: `step-15-1-hosted-profile`. No live hosted connection, provider call,
secret, deployment or paid resource was used. Compose/kind manifests are unchanged.

## Contract evidence

| Requirement | Evidence |
| --- | --- |
| Role defaults and isolated consumers | `tests/test_hosted_profile.py`: supervisor restart, stale health, worker-only route restriction; `tests/integration/test_hosted.py`: both consumers process against PostgreSQL/Redis |
| Lifespan and liveness | `test_lifespan_livez_while_migration_waits`: subsecond live endpoint while migration deliberately waits; manual process timings below |
| Bounded backoff/stop | Restart, capped-backoff, cooperative-flush and shared shutdown-deadline tests; real consumer integration joins both threads |
| Redis quota degradation | `test_quota_opens_breaker_and_recovers`, `test_stream_quota_uses_shared_breaker`, `test_quota_never_turns_redirect_into_5xx`; actual phrase `max requests limit exceeded` |
| Fallback limits | `test_local_bucket_refill_isolation_and_bound`, `test_hosted_bucket_fallback_only`; default API writes retain prior failure behavior |
| Two foreground hit commands | `test_full_redirect_cache_hit_uses_two_redis_commands` observes exactly `eval`, `get` on the assembled redirect route; excludes asynchronous event work |
| Small pool and TLS URL handling | `test_hosted_pool_configuration`, `test_hosted_defaults_and_tls_configuration`; no real hosted TLS endpoint tested |
| Transaction-local SQL timeout | `tests/integration/test_hosted.py::test_statement_timeouts_are_transaction_local` checks timeout values and that they revert after commit |
| Migration serialization | `test_concurrent_migrations_on_postgres`: two migration callers on empty disposable PostgreSQL, model/schema match and lock release; unit test verifies shared transaction/connection |
| Production validation | Parameterized unsafe configuration and loopback-origin tests; missing/unrestricted proxy, default password and unspecified fake-LLM budget rejected |
| Render blueprint | One free Virginia web service, `/livez`, `checksPass`, private `sync: false` settings asserted by unit test |

## Process timings

Command: `python -m app.hosted`, `APP_ROLE=all`, development API-key mode,
Redis Streams, tracing disabled, unused local PostgreSQL/Redis endpoints.
A Python harness polls `/livez`, sends SIGTERM, waits up to ten seconds, and
checks for `Application shutdown complete.`. It removes every spawned process.

The first check measured **1.023 s**, exceeding the one-second cold-start target.
It revealed Alembic/consumer imports on the lifespan path. Those imports were moved
to the background startup thread. The first harness also incorrectly expected exit
status zero; this Uvicorn version deliberately re-raises SIGTERM after graceful
shutdown (Python return code -15). The final harness accepts that status only with
the completed-shutdown log.

Final actual output:

```text
Run 1: process launch to /livez=0.819s; SIGTERM to exit=0.187s; status=-15; graceful shutdown confirmed
Run 2: process launch to /livez=0.772s; SIGTERM to exit=0.290s; status=-15; graceful shutdown confirmed
Run 3: process launch to /livez=0.639s; SIGTERM to exit=0.290s; status=-15; graceful shutdown confirmed
```

These are local measurements with dependencies unavailable, not a Render cold-start
SLA. Real-image import speed, sleeping/free infrastructure and external I/O remain
unmeasured. Arbitrarily stuck threads cannot guarantee a final flush; bounded daemon
termination and unacknowledged replay are documented in `hosted-limits.md`.

## Checks and earlier failures

- Initial sandboxed `make check` failed: fake HTTP servers could not bind (`Operation
  not permitted`), and two old tests needed the newly required production settings
  and Request argument. Rerunning with local networking allowed and fixtures updated
  passed. No plugins or capture settings were disabled.
- First new targeted run passed 18 assertions but had two teardown errors from a
  replaced supervisor test double. Lifespan now closes its own supervisor instance.
- Initial Testcontainers attempt failed in Ryuk before application tests. The documented
  `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock` resolved it with Ryuk
  **enabled**. A subsequent fixture incorrectly stringified a masked database URL;
  using the in-memory full disposable connection URL fixed it without printing it.
- The first full combined run passed 607 tests but failed coverage at 93.21% against
  93.6%. Added failure-path/timeout coverage; the floor was not lowered.
- Concurrent migration plus targeted hosted tests: **23 passed**, exit 0 (before the
  additional gate/cleanup/loopback tests). Full log: `/tmp/hosted-postgres-check.log`.
- `make mcp-test`: Black/isort/Flake8/mypy passed; **35 passed in 0.98s**, exit 0.
  Full log: `/tmp/hosted-mcp.log`.
- Docker CMD JSON and shell syntax: passed, exit 0. No image rebuild or Render
  deployment was performed. Frontend checks were not rerun: no frontend files changed.
- Final gate output and coverage are recorded below. Logs are local verification
  artifacts in `/tmp`, not committed build artifacts.

A later repeat with Ryuk enabled and the socket override failed before PostgreSQL
startup: `Port mapping for container ... and port 8080 is not available` (19 shared
fixture errors, 597 unit tests passed). This was an intermittent test infrastructure
failure, not an application assertion. The final combined run uses the existing
**local-only** documented `TESTCONTAINERS_RYUK_DISABLED=true` fallback; CI was not
changed. Fixture teardown and a Docker container inventory verify cleanup. The
previous successful enabled-Ryuk run had 611 passing tests and 93.73% coverage.

## Final actual output (exit 0 for both gates)

`make check` (complete record: `/tmp/hosted-final-gate.log`):

```text
All done! ✨ 🍰 ✨
91 files would be left unchanged.
Success: no issues found in 83 source files
=============== 598 passed, 33 deselected, 2 warnings in 53.80s ================
sh scripts/check-prometheus.sh
Checking rules/slo.yml
  SUCCESS: 22 rules found

  SUCCESS
```

Black, isort, Flake8, mypy, unit tests and Prometheus validation/unit rules passed.

`TESTCONTAINERS_RYUK_DISABLED=true make test-integration`
(complete record: `/tmp/hosted-final-integration.log`):

```text
TOTAL                                       3285    199  93.94%
Coverage XML written to file coverage.xml
Coverage JSON written to file coverage.json
Required test coverage of 93.6% reached. Total coverage: 93.94%
========== 617 passed, 14 deselected, 3 warnings in 73.64s (0:01:13) ===========
```

The excluded tests are optional Kafka/slow and separate Docker-marker tests;
concurrent migrations were run separately as noted above. Existing third-party
Starlette/Testcontainers deprecation warnings remain. Final
`docker ps -a --filter label=org.testcontainers=true` returned **no containers**.
The developer's Compose stack was not stopped, recreated or removed.

Relative documentation links and staged whitespace checks passed. Staged Gitleaks
scan reported no leaks. Real Render deployment, hosted TLS/pooler interoperability
and proxy-CIDR verification remain manual; no cloud validation is implied by these
local results.

# Testing

Install the pinned Python and development lock as described in
[developer.md](developer.md), then run from the repository root:

```sh
make test                   # fast units; no Docker services
make check                  # lint, mypy, units, Prometheus rule checks
make test-integration       # units + real PostgreSQL/Redis, combined coverage
make test-integration-slow  # same plus real Kafka (optional)
make mcp-test               # separate MCP suite
```

Docker Desktop must be running for integration tests. The first run may download
public images: PostgreSQL `16.13-alpine`, Redis `7.4.9-alpine`, and optionally
Kafka `8.3.0` (KRaft). Testcontainers is locked at `4.14.2`. No Compose volumes,
application `.env`, cloud credentials or live LLM providers are needed.

The integration target intentionally includes unit tests: its fresh report is the
**combined** coverage gate. `make test` overrides the combined floor because it
excludes real-service paths. Plain pytest skips integration unless passed
`--run-integration`; use `-m integration` to select only those tests. The older
`docker`-marked tests remain available independently, but are excluded from these
targets because the new fixtures cover their service contracts.

## Isolation and coverage of behavior

`tests/integration/conftest.py` creates a session PostgreSQL container, applies all
Alembic revisions, truncates tables per test, and creates a fresh Redis container
per test. FastAPI dependency overrides point only at that PostgreSQL instance.
The real startup/shutdown lifecycle and bounded publisher run; the external OTLP
exporter is disabled. Worker threads stop and join before containers are removed.
Tests are sequential; this database fixture is not intended for pytest-xdist.

`test_redis_postgres.py` covers empty-database schema/model parity, authenticated
shortening, redirect and idle analytics flush, expiry, soft deletion, scopes and
revocation, real Lua burst/refill/isolation, actual 429 signals, duplicate events,
commit-before-XACK visibility from a separate connection, malformed-message DLQ,
XAUTOCLAIM recovery, shutdown flush, Redis outage fallback, and FakeProvider abuse
classification/review/enforcement. No test fetches a destination page.

`test_kafka.py` runs the real Kafka producer/consumer and PostgreSQL worker. It
checks duplicate persistence and a committed row visible before manual offset
acknowledgement. Redis tests cannot establish Kafka compatibility; run the slow
target when changing that adapter or consumer configuration.

## Coverage policy

Measured on 2026-10-26 with CPython 3.11.14 and Docker Desktop engine 27.4.0:

| Suite | Result | Covered statements | Coverage |
| --- | --- | --- | --- |
| Units + PostgreSQL/Redis | 373 passed, 11 deselected | 2166 / 2313 | 93.64% |
| Same + optional Kafka | 374 passed, 10 deselected | 2171 / 2313 | 93.86% |

The enforced floor is **93.6%**, the default suite's measured result rounded down
to one decimal, configured in `pyproject.toml`. It exceeds the requested initial
80% target. The old baseline's 61% is historical, not today's measured result.
In the full run `app/main.py` is 83.33%, `app/kafka/consumer.py` 100%, and
`app/workers/analytics_worker.py` 91.80%. These are combined-suite measurements;
the new tests additionally provide real-service evidence for those paths.

Coverage is line coverage over `app/`, with existing exclusions unchanged; it is
not branch coverage or proof of correctness. Raise the floor after adding
meaningful tests for worker CLI startup/signal handling and optional metrics-server
lifecycle, then record the new measured baseline. Do not lower it to conceal a
regression. Frontend and MCP have separate checks and are not in this percentage.

## Docker Desktop cleanup-helper failure

On the verification machine, the default invocation failed before PostgreSQL
startup: Testcontainers' Ryuk 0.8.1 exited with `Cannot connect to the Docker daemon
at unix:///var/run/docker.sock`. Docker itself and a standalone helper worked, so
this is a locally observed helper/socket startup problem, not a passing test run.
A privileged-helper diagnostic also failed; its precise Docker Desktop cause is
not established. The committed defaults keep Ryuk enabled.

For this diagnosed local failure only, the verification commands used:

```sh
TESTCONTAINERS_RYUK_DISABLED=true make test-integration
TESTCONTAINERS_RYUK_DISABLED=true make test-integration-slow
```

Normal fixture teardown still removes these containers and their anonymous
volumes. Disabling Ryuk removes crash recovery: after an interrupted invocation,
inspect `docker ps -a --filter label=org.testcontainers=true` and remove only the
containers belonging to that test session. Never use a blanket Docker prune or
stop the developer's Compose stack. Prefer fixing Docker Desktop socket access
and returning to the default command. CI does not set this override.

See [integration-verification.md](integration-verification.md) for actual outputs.

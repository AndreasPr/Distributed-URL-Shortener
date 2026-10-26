# ADR 0015: Disposable service integration tests

## Context

The original baseline's 61% coverage and SQLite/mocked tests could not validate
PostgreSQL migrations, Redis Lua atomicity, broker acknowledgement ordering, or
application startup against real dependencies. Later unit work raised coverage,
but coverage alone is not evidence of service compatibility.

## Decision

Use pinned Testcontainers Python 4.14.2 with PostgreSQL 16.13-alpine and Redis
7.4.9-alpine. Apply Alembic once per test session to an empty PostgreSQL database;
truncate application tables between tests. Give each Redis test its own container
so the outage test cannot stop a developer's service. Exercise the actual FastAPI
app and workers, substituting only the outbound telemetry exporter and LLM with
o-network implementations. Run Kafka 8.3.0 separately under `integration,slow`.

`make test` stays unit-only. `make test-integration` runs units and PostgreSQL/Redis
integration tests together, producing a fresh combined coverage report and
enforcing its measured floor. CI runs this gate with Docker; Kafka remains opt-in.
Do not accumulate coverage from separate runs or require Kafka for normal CI.

## Alternatives and consequences

SQLite/fakes remain useful for fast edge cases, but cannot replace these contracts.
Using the existing Compose stack risks modifying developer data and gives tests
order-dependent initial state. Disposable containers cost Docker startup time and
image downloads, but isolate service state and require no cloud credentials.

Ryuk remains enabled by default for crash cleanup; fixture teardown also removes
containers and volumes. On this Docker Desktop installation Ryuk intermittently
failed to reach its mounted Docker socket. Verification used the explicit,
process-local override documented in testing.md; this is not silently enabled in
CI or the Makefile. An interrupted run with Ryuk disabled needs manual cleanup of
that run's containers. The Kafka consumer is genuinely Kafka-specific and is
covered against a real broker only in the slow target.

# ADR 0005: Alembic owns the PostgreSQL schema

Status: Accepted

## Context

The ad-hoc migration script reruns SQL without a schema version. Its deployed
schema differs from ORM metadata: analytics.short_code is NOT NULL with a
cascading foreign key, and the analytics index is composite/descending. The
models instead had nullable analytics codes and additional single-column indexes.

## Decision

Use the historical deployment SQL as revision 0001's source of truth, align the
ORM metadata to that schema, then add the requested nullable lifecycle/ownership
columns and a partial unique event-ID index in revision 0002. Preserve the
already-present URL unique constraint/backing index and analytics composite
index. Do not introduce redundant indexes or change application behavior to use
the new fields. The prior model-regression test now expects the deployed
analytics NOT NULL constraint.

Alembic reads settings.DB_URL directly. Keep credentials out of configuration.
Pin Alembic 1.18.4 and regenerate all shared hashed locks without unrelated
upgrades. Keep the historical SQL as documentation and an independent test oracle;
delete the Python runner.

Use one migration service/Job before API and worker startup. The standalone image
default upgrades before execing the API; Compose and Kubernetes API commands
bypass that default because their dedicated migrator owns the schema. Stop the
Kubernetes deployment script when migration completion cannot be confirmed.

Do not auto-stamp or guess the state of existing databases. Verify legacy schema,
back up, stamp 0001, then upgrade. A normal upgrade fails on preexisting unmanaged
tables rather than silently skipping them.

## Consequences

New deployments and verified legacy adoption are tested against isolated real
PostgreSQL, including metadata comparison and data/constraint behavior. Portable
SQLite and offline-SQL tests remain in the default suite; PostgreSQL tests are
opt-in Docker tests until step 5.1. Existing runtime volumes are untouched.

Timestamp types remain without time zone to match the existing schema. New
strings are unbounded because no API-key/event identifier format is established.
Downgrades drop the added data; migrations can lock tables and must run serially.
Model alignment makes the existing deployment constraints visible in metadata;
SQLite unit fixtures do not automatically prove PostgreSQL FK behavior.
See [migration guide](../migrations.md) for operating instructions.

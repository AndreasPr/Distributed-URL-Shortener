# Developer tooling

Run commands from the repository root unless stated otherwise. Only free local tools are required. The backend quality gate is `make check`; frontend and MCP gates are `make frontend-check` and `make mcp-test`. These same commands run in [CI](../.github/workflows/ci.yml). See [deployment](DEPLOYMENT.md) for credentials and persistent-volume setup.

## Recreate the Python environment

The project pins **CPython 3.11.14** in [.python-version](../.python-version), both Docker stages, and CI (which reads the version file). A working interpreter build matters as well as its version. Use **uv 0.9.9**, the lock generator used here; older uv 0.6.3 did not know how to download this Python release. Install that uv release using a working Python (`python3 -m pip install --user uv==0.9.9`) or its official distribution. See [uv installation](https://docs.astral.sh/uv/getting-started/installation/) and [managed Python versions](https://docs.astral.sh/uv/concepts/python-versions/).

```sh
uv --version
uv python install 3.11.14
# Preserve any existing environment first; choose an unused backup name.
# Run this only if .venv exists:
mv .venv .venv-before-tooling
uv venv --python 3.11.14 --managed-python .venv
uv pip sync --python .venv/bin/python --require-hashes requirements-dev.txt
.venv/bin/python -X faulthandler -c 'import sys, readline; print(sys.version); print("readline OK")'
make check
make mcp-test
```

Do not overwrite an existing backup. `.venv-*` backups are ignored by Git and Docker. This session preserved the original environment as `.venv-readline-backup`; the new environment uses a persistent uv-managed interpreter under the user's local data directory. No Anaconda installation was modified. If you use a custom `UV_PYTHON_INSTALL_DIR`, retain it when recreating environments. Make uses `.venv/bin/python` explicitly, so shell activation is optional. Select that interpreter in your editor.

Alternatively, a correctly built pyenv CPython 3.11.14 can create the environment; verify `import readline` before installing dependencies. A Docker build uses `python:3.11.14-slim` and the hashed runtime requirements.

### Root cause of the previous segfault

The old `.venv/bin/python` symlink pointed to Anaconda, not a standalone project Python:

```text
CPython 3.11.5 (main, Sep 11 2023, 08:31:25) [Clang 14.0.6]
base_prefix: ~/anaconda3
platform: macOS 14.6.1, arm64
python -X faulthandler -c 'import readline'
Fatal Python error: Segmentation fault
```

This reproduces without pytest, application imports, or third-party pytest plugins. The isolated `python -I -S -X faulthandler -c "import readline"` also exits with signal 11 (subprocess return code -11), ruling out site initialization and PYTHON* environment settings as necessary triggers. The crash occurs during the native extension's import (`create_module`). `otool -L` shows the extension linked to `@rpath/libreadline.8.dylib`; the dynamic-loader trace showed Anaconda's `libreadline.8.2.dylib`, `libncursesw.6.dylib`, and `libtinfow.6.dylib`. This establishes the failure at the local native interpreter/library boundary; it does **not** establish which library instruction or ABI mismatch caused it. No native debugger proof of a particular library bug is claimed.

The clean uv-managed build reports:

```text
CPython 3.11.14 (main, Oct 31 2025, 23:15:22) [Clang 21.1.4]
readline import: PASS
```

Normal pytest now collects and runs both suites successfully. **There is no capture/plugin-disabling workaround in Makefile or CI.** The old baseline flag `-p no:capture` is no longer needed after recreating the environment. Merely checking out `.python-version` does not replace an old virtual environment.

## Commands

| Target | Behavior |
| --- | --- |
| `make up` | `docker compose --profile kafka up --build -d`; configure ignored `.env` first |
| `make down` | Stops Compose without deleting volumes |
| `make logs` | Follows Compose logs, starting with the last 100 lines |
| `make test` | Normal pytest discovery under tests/, statement coverage and ignored coverage.xml |
| `make lint` | Black check, isort check (Black profile), full Flake8 on app/ |
| `make typecheck` | Blocking mypy on all app modules, including untyped function bodies |
| `make check` | lint + typecheck + test; nonzero on any failure |
| `make fmt` | Applies isort and Black to app/ |
| `make frontend-check` | npm ci, Next core-web-vitals ESLint with zero warnings, tsc --noEmit |
| `make mcp-test` | Separate MCP suite, with the same locked Python environment |
| `make demo` | Prints `demo seeding is added in step 8.3`; no seed data yet |
| `make lock` | Regenerates the three hashed, exact dependency locks |

The backend lint/type scope is app/, matching the previous CI scope; MCP and test code execute in their respective test suites. Full Flake8 replaces the previous selected-error-only invocation. E203/W503 are the only style exceptions, for Black compatibility. Missing third-party typing metadata is suppressed only for named Kafka/OpenTelemetry modules in pyproject.toml, not globally. Application typing errors fail CI; no blanket application ignores were added.

Tests use in-memory SQLite and mocks. They do not establish PostgreSQL/Kafka end-to-end delivery or production readiness. Compose configuration cases require Docker CLI + Compose (no daemon) and explicitly skip if unavailable. Generated coverage, caches, Node artifacts, databases, and environment files must stay untracked.

## Frontend

Use Node **22** (see frontend/.nvmrc and CI). With nvm installed:

```sh
cd frontend
nvm install
nvm use
cd ..
make frontend-check
```

The checked-in `.eslintrc.json` extends `next/core-web-vitals`; `eslint-config-next` is pinned to the existing Next.js 14.2.35 release. `npm run lint` is noninteractive, and no rules were disabled. npm ci uses package-lock.json and does not update it. tsc uses `--incremental false` to avoid creating build information. Next regenerates the ignored next-env.d.ts automatically.

Local verification used Node 23.9.0, which produced an engine warning for eslint-visitor-keys (it requires Node ^20.19, ^22.13, or >=24). The frontend gate still exited zero. Use Node 22.13+ to satisfy that dependency. npm also reports existing ecosystem deprecations and audit findings; this tooling change does not claim to remediate them or upgrade the application's framework. The install in frontend-check suppresses audit/funding network reports; dependency security review is separate from lint/type checking.

## Dependency files and updates

Readable direct requirements live in:

- requirements.in: backend runtime packages, pinned to inspected versions (SQLAlchemy retains 2.0.51).
- mcp-server/requirements.in: MCP packages plus backend imports.
- requirements-dev.in: both sets plus pytest/coverage, Black, isort, Flake8, mypy, pre-commit, and uv.

Corresponding `.txt` files are **uv-generated lock files** with exact transitive versions and hashes. Do not edit them manually. The dev lock is resolved first; runtime and MCP locks are constrained to that shared resolution, preventing mixed versions in the combined development environment. Locks are universal for Python 3.11; platform-specific requirements retain markers. mcp-server/pyproject.toml mirrors its direct pins for metadata; installs for this project should use the hashed locks. Pytest is a development dependency, not a runtime dependency. Obsolete Codecov CLI and optional IPython are not needed by the gate; CI's Codecov Action remains independent.

To update dependencies deliberately:

```sh
# Edit the relevant .in file (and MCP direct metadata if applicable).
make lock
.venv/bin/uv pip sync --python .venv/bin/python --require-hashes requirements-dev.txt
make check
make frontend-check
make mcp-test
```

For a deliberate transitive refresh, use uv pip compile's --upgrade option when generating the shared dev lock, then regenerate the constrained runtime/MCP locks and review the full diff. Ordinary `make lock` retains valid existing resolutions. For frontend changes, update package.json/package-lock.json together and validate via npm ci. Never add paid services or credentials to resolve dependency/setup issues.

## Pre-commit and secret scanning

```sh
.venv/bin/pre-commit install
.venv/bin/pre-commit run --all-files
```

The local Black/isort/Flake8/mypy hooks use the same locked `.venv` as Make; they check rather than rewrite code. Gitleaks is pinned to v8.24.2 and runs with redaction. Its first setup needs network access and a Go toolchain (or pre-commit's supported toolchain setup). `.gitleaks.toml` extends default detection and allows only anchored, obvious `replace_with_*`, `REPLACE_WITH_*`, and the configuration-test placeholder value. It does not exempt whole directories, database URLs, or real tokens. The hook checks staged changes, not all historical commits; a separate historical audit can still find material removed during cleanup. Do not print findings without redaction or paste .env contents.

## CI and operational debugging

CI installs Python from .python-version and the hashed development lock, runs make check with blocking mypy, and runs MCP tests. A second job runs the frontend gate on Node 22. Live PostgreSQL/Redis services and their CI credentials were removed because the current suites use SQLite/mocks; this is not a replacement for future integration tests. Codecov upload is nonblocking. CD publication behavior is unchanged; see [CI/CD](ci-cd.md).

For local runtime issues, use `docker compose ps -a` and `docker compose logs --tail=100 api worker migrate`. Do not dump resolved Compose configuration or container environments into logs. Use `docker compose config --quiet` for validation. Optional Kubernetes deployment still has baseline issues; this step does not repair them.

See [Step 0.3 verification](tooling-verification.md) for actual command output, interpreter evidence, and remaining limitations; [ADR 0003](adr/0003-reproducible-quality-gate.md) records the decisions.

## Versioned database migrations

Run `alembic upgrade head` using the project environment. See the [migration guide](migrations.md) for settings, empty databases, existing-volume adoption, rollback, and PostgreSQL tests. Existing pre-Alembic databases must be verified and stamped at revision 0001 before normal startup. Never blindly stamp head.

## Cache verification (step 1.4)

`make check` includes the deterministic fake-Redis stampede, breaker, TTL, and
negative-cache tests. With Docker running, use:

```sh
RUN_DOCKER_TESTS=1 .venv/bin/python -m pytest -q
```

This also runs PostgreSQL SELECT-counting and a real Redis outage test. Containers
use disposable names, loopback ephemeral ports, and no project volumes. The Redis
test stops only the container it created. No frontend or Kubernetes deployment is
needed. See [cache strategy](adr/0002-cache-strategy.md) for lifecycle checks on
positive hits and the bounded stale-404 tradeoff during failed invalidation.


## Analytics event bus (step 1.5)

Use exactly one Compose profile; `.env` supplies credentials as before:

```sh
# Full mode (also the default for make up):
docker compose --profile kafka up --build -d
# Stop before switching; preserve volumes:
docker compose --profile kafka down
# Lightweight mode, no Kafka or ZooKeeper:
docker compose --profile redis-streams up --build -d
# Equivalent: make up PROFILE=redis-streams
```

Kafka mode uses service names `api` / `worker`; lightweight mode uses `api-redis` /
`worker-redis`. Both expose the API on 8000 and keep the `api`/`worker` network
aliases for metrics. Plain Compose up starts common infrastructure only. Rebuild
images when changing code. Do not start both profiles together (port conflict).

For host execution export `EVENT_BUS=kafka` or `EVENT_BUS=redis_streams` and matching
`KAFKA_BOOTSTRAP_SERVERS` or `REDIS_URL`. Run Uvicorn and
`python -m app.workers.analytics_worker` in separate terminals as before.
`EVENT_BUS=memory` is only for tests: separate processes cannot share it.

Settings (also listed in `.env.example`): `EVENT_TOPIC`, `EVENT_DLQ_TOPIC`,
`EVENT_CONSUMER_GROUP`, `EVENT_BATCH_SIZE` (100), `EVENT_FLUSH_INTERVAL` (5 seconds),
`EVENT_QUEUE_SIZE` (1000), `EVENT_RETRY_BACKOFF` (0.25 seconds),
`EVENT_CLAIM_IDLE_MS` (60000), `EVENT_METRICS_PORT` (8001).
Compose explicitly selects the adapter and passes topic/group/batch/flush/queue
settings; adjust deployment environment for the other advanced settings.
Kubernetes uses Kafka with the same ConfigMap keys wired into both deployments.
Do not reuse the analytics group for another independent application.

Inspect or replay dead letters (use `api-redis` instead of `api` in lightweight mode):

```sh
docker compose --profile kafka exec api python -m app.cli dlq list --limit 20
docker compose --profile kafka exec api python -m app.cli dlq replay --limit 20
# Host equivalent with the correct exported environment:
.venv/bin/python -m app.cli dlq list --limit 20
```

List prints envelope metadata/error class, not raw payload. Replay republishes valid
original events with their original UUID, then acknowledges the DLQ delivery.
It is safe against duplicate click inserts, but deliberately stops on malformed
or unknown-version payloads; those need a deliberate schema repair/upgrade first.
Commands wait up to five seconds of idle polling for group assignment/new records.
Redis pending replay work is reclaimable after `EVENT_CLAIM_IDLE_MS`; Kafka resumes
at committed offsets. Replay does not erase stored DLQ history.

Worker metrics are exposed on port 8001 (internal Compose/Kubernetes service) and
scraped by Prometheus: `events_consumed_total`, `events_failed_total`,
`dlq_events_total`, and `consumer_lag{backend,kind}`. API `/metrics` exposes
`events_dropped_total`. Redis `stream_length` includes acknowledged records;
`pending` is unacknowledged delivered work, not unread entries. Kafka lag measures
end offsets minus committed offsets. Existing `analytics_events_processed_total`
counts successfully processed valid deliveries, including deduplicated deliveries.

The API queue is bounded and not durable. Broker failures/full queues lose analytics
without breaking redirects. Process termination can lose queued/in-flight events.
Accepted broker events are processed at least once; the database UUID index makes
click effects idempotent. A database outage leaves work unacknowledged, even during
shutdown. Three poison attempts can recur after a crash. DLQ publications may be
duplicated if acknowledgement fails. Old unversioned Kafka events go to the DLQ.

Redis Streams shares resources with the redirect cache. Compose now persists Redis
with AOF and a volume, but this is not replicated/zero-loss storage. Streams and DLQ
history are not auto-trimmed: monitor memory and trim only safely processed history.
Do not evict stream keys or delete pending entries. See [ADR 0003](adr/0003-event-bus.md)
for throughput, partitioning and retention tradeoffs.

Validation:

```sh
make check
make mcp-test
RUN_DOCKER_TESTS=1 .venv/bin/python -m pytest -q
```

Event tests cover duplicates, ack order, idle/shutdown flush, poison JSON/version,
DLQ failure/replay, full queues, slow brokers, and Redis pending recovery. Docker
cases create disposable PostgreSQL, Redis and Kafka containers; they do not stop the user's
services. See [the actual verification record](event-bus-verification.md).

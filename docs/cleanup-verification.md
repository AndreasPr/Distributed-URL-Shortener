# Step 0.2 cleanup verification

Step 0.1 was fast-forward merged into local master; cleanup was performed on `step-0-2-cleanup`. No application logic or existing service volumes were changed. No remote branch was pushed. The baseline remains a historical snapshot.

## Changes

- Removed tracked generated outputs/data and added recursive ignore patterns. Safe `.env.example` files remain trackable; real local environment/Secret files are ignored.
- Compose now requires local PostgreSQL and Grafana values. Kubernetes DB_USER and passwords come from a separately created Secret, not a committed credential manifest. See [deployment](DEPLOYMENT.md).
- Consolidated four overlapping CI/CD guides and moved operational guides under docs; updated links. The consolidated guide reflects actual workflow behavior rather than old deployment claims.
- Restricted backend build context and pinned third-party images to locally observed versions. All new tags were verified in registry manifests. See the [version table](DEPLOYMENT.md#verification-and-image-versions) and [ADR 0002](adr/0002-local-configuration-and-image-pins.md).
- Added six Compose configuration tests for required values and consistent database credentials. They use placeholders, require no daemon, and skip explicitly when Compose is unavailable.

## Removed and moved files

Deleted tracked artifacts: `.DS_Store`, `grafana/.DS_Store`, `.coverage`, `coverage.xml`, `dump.rdb`, `url_shortener.db`, `frontend/tsconfig.tsbuildinfo`, and generated `frontend/next-env.d.ts`. Next.js regenerates the last file when needed. No tracked `.env`, `.pyc`, or `__pycache__` files were found.

Removed `k8s/2-secrets.yaml`; replaced it with placeholder-only `k8s/secrets.example.yaml` and `k8s/.env.example`, plus instructions to create the actual Secret using `kubectl --from-env-file`.

Consolidated and deleted `CI-CD-IMPLEMENTATION.md`, `CI-CD-QUICKREF.md`, `CI-CD-SETUP.md`, and `CICD.md` into `docs/ci-cd.md`.

Moved `DEPLOYMENT.md`, `DEVELOPER.md`, `GRAFANA.md`, and `OPENTELEMETRY.md` into `docs/` with their filenames retained. The deployment guide was rewritten around the new credential setup; useful development/observability content was retained.

## Commands and observed results

Local Python checks used the existing virtual environment. Pytest retained the baseline `-p no:capture` workaround. Actual output excerpts:

```text
.venv/bin/python -m pytest -p no:capture --cov=app --cov-report=term-missing -v
======================== 29 passed, 1 warning in 2.89s =========================
TOTAL                                        443    173    61%

(cd mcp-server; ../.venv/bin/python -m pytest -p no:capture -v)
======================== 10 passed, 1 warning in 0.83s =========================

.venv/bin/black --check app/
2 files would be reformatted, 30 files would be left unchanged.

.venv/bin/flake8 app/ --count --select=E9,F63,F7,F82 --show-source --statistics
0

.venv/bin/isort --check-only app/
ERROR: app/main.py Imports are incorrectly sorted and/or formatted.
ERROR: app/observability/tracing.py Imports are incorrectly sorted and/or formatted.
ERROR: app/db/database.py Imports are incorrectly sorted and/or formatted.

.venv/bin/mypy app/ --ignore-missing-imports
Found 13 errors in 8 files (checked 32 source files)
```

Black failures are in `app/core/config.py` and `app/observability/tracing.py`. These formatting/import/type errors match the baseline and were not fixed. The new configuration test file passes Black, isort, and the selected Flake8 checks. Frontend `CI=1 npm run lint` still opens the ESLint setup prompt without linting; `./node_modules/.bin/tsc --noEmit --incremental false` exits 0 with no output.

```text
docker compose --env-file .env.example config: exit 0
Rebuilt image /health: {"status": "ok", "db": "reachable", "redis": "reachable"}
Excluded paths present: []
Temporary smoke container removed; existing services untouched
```

Resolved Compose configuration was captured without printing values. Configuration validation used safe example values, not a deployment with placeholders. An initial YAML editing error was caught and fixed before final validation; the six configuration tests pass against the final file. `bash -n k8s/deploy.sh` and `git diff --check` pass.

`docker build -t url-shortener:step-0-2 .` succeeds. The first clean image installed SQLAlchemy 2.1.4 from the previously unpinned requirement and failed the health smoke check because the selected `psycopg` driver was unavailable. The running local API reported SQLAlchemy 2.0.51; pinning that version restored the existing psycopg2 behavior without changing application code. The second image passed the read-only health check on the existing local network, privately reusing the existing API environment. Its temporary environment file and smoke container were removed. No create/redirect requests or data mutations were used for this health check.

The image inspection checked that `/app` excludes `.git`, `.env`, `.env.example`, database/Redis dumps, coverage, node_modules, frontend, tests, docs, k8s, and mcp-server, while retaining `scripts/migrate.sql` and importing the application. The existing API, worker, monitoring services, and volumes were not restarted or replaced. This does not assert Kubernetes readiness, complete tracing functionality, or Kafka end-to-end delivery.

## Limits remaining

Application credential defaults and existing CI configuration were not changed in this no-application-logic step; deployment instructions explicitly supply local values. Removing committed files does not erase old Git history. Existing database/Grafana volumes retain their original credentials. Most Python dependencies remain unpinned; Jaeger v1 remains the existing end-of-life release to avoid a tracing migration in this cleanup. Kubernetes baseline failures and the previous lint/type errors remain separate work.

## Rebuilt-image tests

The existing backend tests were mounted read-only into the final image and run with networking disabled:

```text
docker run --rm --network none --mount type=bind,source=<repo>/tests,target=/checks,readonly --entrypoint python url-shortener:step-0-2 -m pytest /checks -p no:cacheprovider -q
23 passed, 6 skipped, 219 warnings in 0.42s
```

The six configuration tests skip inside the backend image because it intentionally contains no Docker CLI; all six passed on the host. Warnings are SQLAlchemy and Kafka/importlib deprecations. All relative Markdown file links were checked and resolve. PostgreSQL Kubernetes probes use the injected POSTGRES_USER and POSTGRES_DB, matching the new Secret wiring.

Kubernetes YAML parsing and Secret-key reference checks passed using the already installed frontend `js-yaml` package. Initial Python `yaml` and Node `yaml` checks were unavailable (modules not installed); no dependencies were installed for that check. No manifests were applied to the cluster.

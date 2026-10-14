# Repository standing rules

- Use only free tools. Never add paid services or cloud credentials.
- Never commit secrets, `.env` files, database files, or build artifacts. Inspect the staged diff and stage explicit paths; existing tracked artifacts are not permission to add more.
- Keep changes small and scoped to the task. Do not fix unrelated baseline issues opportunistically.
- Add or update tests for every behavior change.
- Run the applicable test and lint commands before finishing and paste their actual output (or clearly labeled excerpts with a complete record). Report failures and exit statuses. Run type checks too; do not hide failures with `|| true`.
- If a command cannot run in the environment, state why honestly. Distinguish blocked checks, failed checks, and passing checks; never guess results.
- Do not rewrite Git history or force-push.
- Record architectural and tooling decisions as numbered ADRs in `docs/adr/`, including context, decision, and consequences.
- Keep README claims accurate and distinguish implemented, tested, and planned features.
- Use conventional commit messages, such as `docs: record project baseline`.

## Setup and run commands

Run from the repository root unless otherwise stated. Use Python 3.11 and a local virtual environment:

```sh
python3.11 -m venv .venv
.venv/bin/python -m pip install -r requirements-dev.txt
.venv/bin/python -m pip install -r mcp-server/requirements.txt
docker compose up --build -d
docker compose ps
```

Compose runs the API, migration job, worker, PostgreSQL, Redis, Kafka, ZooKeeper, Prometheus, Grafana, and Jaeger. The frontend is separate:

```sh
cd frontend
npm ci
npm run dev
```

API: `http://localhost:8000`; frontend: `http://localhost:3000`; Grafana: `http://localhost:3001`; Prometheus: `http://localhost:9090`; Jaeger: `http://localhost:16686`.
Frontend `NEXT_PUBLIC_API_URL` defaults to `http://localhost:8000`.

For host-based backend development instead of the Compose API/worker, start only dependencies, then use separate terminals for API and worker:

```sh
docker compose up -d postgres redis kafka zookeeper
.venv/bin/python scripts/migrate.py
.venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
.venv/bin/python -m app.workers.analytics_worker
```

Do not start a second API on an occupied port. Host defaults match Compose's PostgreSQL 5433, Redis 6379, and Kafka 9094 mappings. `DATABASE_URL` overrides `DB_URL`; separate `DB_HOST`/`DB_PASSWORD` variables are not assembled by application settings.

MCP server (repository root, after installing both dependency sets):

```sh
PYTHONPATH=.:mcp-server .venv/bin/python -m mcp_server.app
```

It serves streamable HTTP at `http://127.0.0.1:8001/mcp`. Keep Slack posting disabled; tests mock external sources and need no credentials. Do not invoke notification tools without explicit authorization.

Kubernetes is optional: inspect `kubectl config current-context` first; `bash k8s/deploy.sh` applies resources to that context. It requires a working cluster, storage provisioning, images, and metrics support. Do not claim that running the script proves deployment health. See `docs/baseline.md` for known gaps.

## Tests and quality checks

Backend commands, matching CI's checks (the local coverage command avoids overwriting tracked `coverage.xml`):

```sh
.venv/bin/python -m pytest --cov=app --cov-report=term-missing -v
.venv/bin/black --check app/
.venv/bin/flake8 app/ --count --select=E9,F63,F7,F82 --show-source --statistics
.venv/bin/isort --check-only app/
.venv/bin/mypy app/ --ignore-missing-imports
```

CI additionally uses `--cov-report=xml`. Its mypy check is currently informational, but report errors locally. Flake8 here checks only the selected error classes, not all style rules.

Root pytest discovers only `tests/`. Run MCP separately:

```sh
cd mcp-server
../.venv/bin/python -m pytest -v
```

On the baseline macOS Python 3.11.5 environment, pytest's capture plugin crashes while importing readline. The observed workaround is adding `-p no:capture` to both pytest commands; disclose its use. Do not treat a pre-collection crash as test failures or a passing suite.

Frontend checks (from `frontend/`):

```sh
npm run lint
./node_modules/.bin/tsc --noEmit --incremental false
npm run build
```

There is no frontend test script. At baseline, `npm run lint` opens an ESLint setup prompt and does not perform linting; report this limitation rather than silently configuring it. TypeScript's `--incremental false` avoids modifying tracked build information. Run builds when relevant; never stage generated outputs.

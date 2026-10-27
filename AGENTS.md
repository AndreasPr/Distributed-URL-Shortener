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

## Setup and commands

Use CPython 3.11.14 from `.python-version` (also used by Docker and CI). Follow [docs/developer.md](docs/developer.md) to create a clean `.venv` with uv 0.9.9 and install the hashed `requirements-dev.txt` lock. The former Anaconda readline crash is resolved by recreating the environment; do not disable pytest capture or plugins in the gate.

- `make up`, `make down`, `make logs`: local Compose stack. Copy `.env.example` only when `.env` is absent and replace placeholders locally; preserve existing volume credentials.
- `make check`: Black check, isort check, full Flake8, blocking mypy, backend tests with coverage, and Prometheus rule validation/unit tests (native promtool or Docker required).
- `make fmt`: apply Black and isort to app/, eval/, and tests/integration/.
- `make eval EVAL_PROVIDER=fake`: offline synthetic abuse evaluation; writes docs/eval-results.md.
- `make test`: fast unit tests only (SQLite/mocks); `make lint`, `make typecheck`: individual backend checks.
- `make test-integration`: unit + Testcontainers PostgreSQL/Redis tests and the combined coverage floor; Docker required. `make test-integration-slow` also runs optional Kafka. See [docs/testing.md](docs/testing.md).
- `make frontend-check`: npm ci, noninteractive core-web-vitals ESLint, tsc --noEmit. Use Node 22.13+ (CI uses Node 22).
- `make mcp-test`: the separate MCP pytest suite.
- `bash scripts/kind_smoke.sh`: disposable kind Kubernetes validation, SHA image build/load, gated deploy, HTTP smoke and cleanup (Docker, kind, kubectl, kubeconform required). See [docs/kubernetes.md](docs/kubernetes.md).
- `make lock`: regenerate exact hashed locks after editing readable `.in` files. Keep runtime/MCP versions constrained to the dev resolution; synchronize `.venv` afterward.
- `.venv/bin/pre-commit run --all-files`: matching local checks plus pinned Gitleaks; never expose unredacted secret findings.
- `make demo`: prints the step 8.3 seeding placeholder only.

Run `make check`, `make frontend-check`, and `make mcp-test` before finishing applicable changes and report actual outcomes. Gate scope and known limitations are documented in the developer guide. Unit tests use SQLite/mocks; only the integration targets validate real disposable services. MCP notification tools still require explicit authorization. Kubernetes has its own explicit kind smoke gate; the ordinary backend/MCP checks do not deploy a cluster.

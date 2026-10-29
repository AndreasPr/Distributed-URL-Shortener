# Step 9.3: demo verification

Date: 2026-10-29. Branch: step-9-3-demo. Implementation tested at commit `9e79979`.
Final follow-up changes only document these results. No cloud calls or live LLM inference.

## Clean-checkout run

Cloned the committed repository with `git clone --no-hardlinks` into a new temporary
checkout (`/tmp/shortener-demo-clean.6thcXn`). No root .env, .venv, frontend node_modules,
API keys or data volumes were copied. Ran `make demo` there with Docker Desktop available.
The backend and frontend images built successfully; Alembic completed, and startup exited 0.
Docker reused cached layers where available; this was a clean Git checkout, not a wiped
Docker image cache or an offline-install test.

Selected actual output, omitting all generated credential lines:

```text
Ready: analytics worker (six live click events)
Ready: frontend
Ready: Grafana
Ready: Jaeger
Ready: Prometheus
Seeded 30 links, 115 fixture clicks, six live clicks, six flagged links.
Synthetic history/verdicts are fixtures, not live abuse or throughput measurements.
API docs: http://localhost:18080/docs
Frontend: http://localhost:13000 (paste a key into its in-memory settings)
Grafana: http://localhost:13001/d/url-shortener
Jaeger: http://localhost:16687 (service: api or worker)
Walkthrough: docs/demo-script.md | Reset: make demo-down && make demo
```

Keys were captured privately for verification, never printed in the audit output or committed.
The raw temporary startup log was deleted after cleanup; a sanitized local build log remains
at `/tmp/demo-clean-run-sanitized.log`. API keys were displayed exactly once by the command,
not saved by the demo runner. Postgres stored hashes. Generated DB/Grafana secrets stayed in
ignored private `.demo/env` and were removed by demo-down.

## Actual walkthrough checks

Used HTTP against loopback services without following redirects, plus the worker stop/start
helper. Actual output:

```text
PASS: clean state=30 links/115 historical+6 live clicks/6 flags; scopes=401,403; keys each printed once
PASS: create=200, redirect=307; burst statuses [409, 429]
PASS: review=204, blocked redirect=451
PASS: worker outage redirects=307; clicks held at 7; recovered to 10
PASS: frontend=200 with correct API CSP; Grafana provisioned dashboard authenticated=200
PASS: all Prometheus scrape targets up
PASS: Jaeger has a trace containing both api and worker processes
PASS: repeated make demo refuses overwrite and does not reprint keys
```

The 409s are intentional: the rate-limit example repeats an allocated alias rather than
creating arbitrary additional links. New unauthenticated creation returned 401; read/write
credentials could not access admin review (403). Admin review succeeded. Six seeded pending
flags were verified via the authenticated API before review. The worker experiment confirmed
three queued events became three rows after restart; this is a graceful stop, not arbitrary
crash/failure proof. UI readiness/CSP and Grafana dashboard API were checked over HTTP;
no browser-driven form/review or actual three-minute video was recorded.

## Cleanup

Ran `make demo-down` in the same clean checkout, then ran it again. Both exited 0.
Queried Docker by the exact demo project label; no demo containers, named volumes or network
remained. `.demo` was removed and `git status --porcelain` in the clone was empty.
The original checkout's root .env and normal-stack resources were not altered.

```text
Demo containers, volumes and credentials removed. Normal stack untouched.
python3 scripts/demo.py down
No demo state in this checkout; nothing removed.
PASS: demo containers/volumes/network/private state removed; clean checkout still clean
PASS: second demo-down succeeds with no state
```

Images/build cache are intentionally retained. No demo is left running; use `make demo`
from your own checkout to start the recording environment with new credentials.

## Quality checks

`make check`: exit 0. Actual final excerpt:

```text
TOTAL                                       2369    152  93.58%
=============== 430 passed, 23 deselected, 6 warnings in 21.70s ================
sh scripts/check-prometheus.sh
Checking rules/slo.yml
  SUCCESS: 22 rules found

  SUCCESS
```

Nine new tests in `tests/test_demo.py` cover stable fixture IDs/counts/verdicts, key hashing,
empty-DB refusal, private state permissions, credential environment isolation, cleanup
ownership, bounded waits, non-followed redirects and one-time display. Also ran Black,
isort and Flake8 explicitly on both scripts and the tests, plus mypy on both scripts:

```text
Success: no issues found in 2 source files
```

`make frontend-check`: exit 0; npm ci, ESLint, all five tests and TypeScript passed. The host
Node v23.9.0 emitted an existing engine-range warning; the clean-clone Docker frontend build
used pinned Node 22.23.4 and succeeded. This does not resolve the existing dependency audit
findings described in known-limitations.md.

`make mcp-test`: exit 0:

```text
35 passed in 6.88s
```

README offline checker: 196 lines, 52 links, 31 command examples passed. Existing deprecation
warnings remain. Dedicated Testcontainers/Kafka, Terraform and live-provider evaluations
were not rerun for this demo-only change; the real Compose PostgreSQL/Redis path was exercised
above. See [demo script](demo-script.md) for the exact human recording steps and cleanup.

# Final quality and honesty audit

Date: 2026-10-28 local (some artifacts have 2026-10-29 UTC timestamps).
Branch: step-8-4-final-audit. Starting commit: `3036e705fb620f5a04bfecb984fc9d928b67a768`.
No application features, live-provider calls, cloud deployment, history rewriting, or threshold
relaxations were introduced. Read [CV claims](claims.md) and [known limitations](known-limitations.md).

## Check outcomes

| Check | Actual outcome |
|---|---|
| `make check` | PASS: lint, mypy, unit tests, promtool rules and rule tests; 400 passed, 23 deselected |
| `make test-integration-slow` | FAIL: default Ryuk setup failed before 13 integration tests; 399 unit tests passed, 10 deselected |
| `TESTCONTAINERS_RYUK_DISABLED=true make test-integration-slow` | PASS: 412 tests, 10 deselected; real PostgreSQL/Redis/Kafka; 93.85% combined coverage vs 93.6% floor |
| `make frontend-check` and `npm run build` | PASS: npm ci, ESLint, five frontend tests, TypeScript and production build |
| `make mcp-test` | PASS: formatting/lint/types and 35 tests |
| `make tf-fmt tf-validate tf-lint tf-sec` | PASS: Terraform 1.17.0 override, TFLint, Checkov 3.3.30; 185 passed / 0 failed / 7 documented skips; no plan/apply |
| Prometheus | PASS through make check: 22 rules plus synthetic time-series tests |
| `actionlint` | PASS, exit 0 |
| `yamllint` | PASS on 39 tracked YAML files; relaxed style with line-length/truthy disabled (Actions semantics checked by actionlint) |
| Shell syntax / ShellCheck | PASS on all 10 tracked shell scripts; changed helper rechecked |
| Offline Markdown links | PASS: 224 local file links resolve; README: 188 lines, 51 links and 29 command examples pass (external URL syntax only) |
| `pre-commit run --all-files` | PASS before final documentation additions; staged checks repeated at commit |
| `make audit` | PASS: pip-audit found no known locked backend/MCP vulnerabilities |
| `npm audit --json` | FAIL, exit 1: 27 vulnerabilities (2 critical, 19 high, 4 moderate, 2 low); not fixed by this audit |
| Trivy backend image | PASS, exit 0, zero fixable HIGH/CRITICAL under .trivyignore policy; native Trivy 0.76.0, not CI's pinned 0.67.2 |
| Gitleaks history | PASS: 91 commits across all locally available refs, non-shallow repository; no findings |
| Gitleaks entire working directory | FAIL, exit 1: 12 findings including ignored credentials and generated/report candidates; details below |
| `make eval EVAL_PROVIDER=fake` | PASS in disposable clone; no live inference; user's public evaluation report preserved |
| kind / kubeconform | 57 local-overlay and 52 CI-overlay resources valid; deployment Ready and PVCs Bound; HTTP smoke PASS |
| kind 30-second k6 gate | FAIL, exit 99: 2 dropped iterations; p95 90.12ms, HTTP error rate 0%; thresholds unchanged |
| CodeQL | Not run locally; successful prior GitHub run linked below, not a claim about the unpushed audit branch |

The integration retry uses the already documented Docker Desktop workaround in [testing](testing.md).
Disabling Ryuk removes crash cleanup, not fixture teardown. The initial helper container was gone
when inspected; its exact Docker Desktop root cause is not established. Do not hide that initial
failure or enable the workaround globally in CI. Unit coverage is not the combined integration floor.

## Fresh-clone test

Cloned the local committed repository with `git clone --no-hardlinks` into
`/tmp/shortener-final-audit`; this tests tracked files at the starting commit, not ignored local
artifacts or a fresh remote checkout of the unpushed audit branch. Generated throwaway credentials
were placed only in the clone's ignored .env, never logged, and removed after the test.

1. README's conditional .env copy succeeded. Filled the five required database/Grafana keys,
   forcing FakeProvider. No source credentials were copied.
2. Exact `make up PROFILE=redis-streams` failed because existing user services already occupied
   default host ports: Docker reported port 5433 allocated. The existing stack was not stopped.
3. Removed only the audit project's containers/volumes. Added a temporary, clone-only Compose
   port override: API 18080, Grafana 13001, Prometheus 19091, Jaeger 16687; other published ports
   suppressed. The remainder is explicitly an **adapted** test, not an exact README-port pass.
4. Both Redis Streams and Kafka `make up` succeeded. In each, waited for health, created a
   read/write key via the README CLI, created a URL, observed 307 without following it, and
   confirmed exactly one analytics row. Swagger, Jaeger and Prometheus returned HTTP 200.
5. An immediate Redis-mode Grafana probe returned RemoteDisconnected. Kafka-mode Grafana
   returned 200. A separate new Grafana project with a bounded readiness wait returned 200
   after eight seconds. Detached Compose startup is not a service-readiness guarantee.
6. Frontend conditional env copy, `npm ci` and `npm run dev` succeeded in the clone;
   `http://localhost:3000/` returned 200. This was an HTTP page check, **not a browser-driven
   create/review workflow**. The example frontend API URL remained the normal local port;
   pairing the frontend with remapped API ports requires updating NEXT_PUBLIC_API_URL.
7. All audit Compose projects/volumes and the disposable kind cluster were removed. The audit
   frontend process was stopped; the clone remains for inspection with no generated .env key file.

Small fixes: README now calls out occupied ports, /health readiness and Grafana startup delay.
The legacy `scripts/run_k6_tests.sh` used removed `/health/redis`, suggested ZooKeeper, failed
to export BASE_URL, and did not require a key. It now uses `/health`, current profile instructions,
exports the requested URL/key, and has a regression test using fake curl/k6. Stress duration text
now matches its eight-minute stages. It still targets an existing stack; `make perf` remains the
recommended isolated benchmark. No load thresholds or production limits were changed.

## Secret and placeholder review

Only filenames/key names are reported; values and raw scanner matches are omitted.

| Finding | Scope / disposition |
|---|---|
| `.env`: GEMINI_API_KEY | Ignored local credential; not found by the history scan; retained for owner review |
| `mcp-server/.env`: GITHUB_TOKEN, SLACK_WEBHOOK_URL | Ignored optional connector credentials; retained; owner should revoke if unnecessary or exposed |
| `frontend/.next/prerender-manifest.json`, `frontend/.next/server-reference-manifest.json` | Generated ignored artifacts; scanner candidates do not contain any of the three configured secret values |
| `reports/trivy.json`, `reports/trivy-security-fix.json`, `reports/trivy-security-amd64.json` | Ignored scan reports with candidates; none contains the three configured secret values; no blanket allowlist added |

All listed files are ignored by Git. This is not proof that scanner candidates are all harmless
or that credentials have never left the machine. Review private files locally; do not paste them
into issues, logs or PRs. No credential was validated against a provider or rotated automatically.

Tracked-text search for TODO/FIXME/yourusername/changeme/admin/admin found only recorded test
runner `todo` output and the checker's deliberate `yourusername` rejection test. IPv4 matches
include loopback/bind defaults, cluster/service ranges, synthetic validation cases and historical
verification output; no blanket replacement was made. Git history was searched by these patterns
and filenames only, without exposing deleted values. Historical examples stay historical;
no force-push or rewriting was attempted. Intentional safe credential placeholders in .env.example
remain necessary. Demo video, make demo, license choice and incomplete measurements remain visible.

## Evidence and reproduction boundaries

Prior public runs checked through GitHub's API (completed/success):

- [CI on starting master commit](https://github.com/AndreasPr/Distributed-URL-Shortener/actions/runs/40789163665).
- [Kind workflow on prior design branch](https://github.com/AndreasPr/Distributed-URL-Shortener/actions/runs/40789040984).
- [CodeQL on prior design branch](https://github.com/AndreasPr/Distributed-URL-Shortener/actions/runs/40789040985).

Audit logs are retained under `/tmp/final-*.log` on this machine, with raw JSON audit outputs
under `/tmp/final-*.json`; these temporary paths are not portable evidence in a clone.
The selected sanitized outputs below preserve the essential results. Fresh-clone kind artifacts
are in `/tmp/shortener-final-audit/artifacts/k8s/`. The failed load gate was not rerun repeatedly
until green. Full performance/chaos workloads and live Gemini/Ollama evaluation were not rerun:
those are environment-dependent experiments, not static checks; prior results are qualified in
claims.md. No `make lock`, `make fmt`, cloud apply, live-provider evaluation or destructive normal-stack
command was run just to claim coverage of every Make target.

## Manual work before calling the project production-ready

1. Address the frontend security dependency migration and rerun npm audit, frontend/browser and
   build tests. Do not treat the non-blocking report as a clean bill of health.
2. Record host/Docker resource settings; investigate the kind k6 drops and repeat the strict gate.
3. Review ignored credentials and optional connectors; revoke/rotate if exposed or no longer needed.
4. Repair local Ryuk startup or explicitly use the documented isolated workaround and cleanup discipline.
5. Preserve/export sanitized benchmark/chaos evidence and hardware metadata if sharing CV claims;
   acquire public evaluation data under terms to reproduce live numbers, with dev-only tuning.
6. Push this branch and review its own CI/CodeQL/kind results. Existing successful runs are prior commits.
7. Choose a license and record the demo/video separately; complete freshness/latency instrumentation,
   sustained capacity and failover testing before claiming those outcomes.

## Selected actual output

Final `make check` (exit 0; unit coverage is separate from the combined gate):

```text
TOTAL                                       2324    150  93.55%
=============== 400 passed, 23 deselected, 6 warnings in 22.84s ================
sh scripts/check-prometheus.sh
Checking rules/slo.yml
  SUCCESS: 22 rules found

  SUCCESS
```

The integration run preceded the added shell-helper regression test; its 412-test count
includes the original 399 unit tests plus 13 integration tests. It does not include that
new unit test, which passed in the final check above.

Integration retry (exit 0):

```text
Required test coverage of 93.6% reached. Total coverage: 93.85%
=============== 412 passed, 10 deselected, 7 warnings in 53.09s ================
```

Offline README/link validation (exit 0):

```text
PASS: README 188 lines (<300)
PASS: 51 Markdown links checked (local paths/anchors and URL syntax)
PASS: 29 command examples checked against repository targets/scripts/config
PASS: bash examples parse; no stack/deployment command was executed
NOTE: 7 external URLs need online HTTP verification; localhost endpoints need running services
Local links checked: 224; missing: 0
```

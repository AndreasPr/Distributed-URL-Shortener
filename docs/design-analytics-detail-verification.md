# Analytics, link detail and health verification — step 15.12f

Branch: `step-15-12f-analytics-detail-status`. Local verification on 2026-11-23; no live deployment or real identity provider contacted. No new dependency, backend endpoint, schema migration or stored browser state.

## Scope and contracts

Analytics and link detail use real timestamp/status/list data, scoped by the existing API client and workspace header. The demo router implements the same UI against in-memory samples only. V2 tokens and the bundled font are applied to each page's main and the detail confirmation portal, not globally. Status does not display global counts, DB size, worker names, lag internals, made-up uptime or incidents. The existing `/health/redis` endpoint is unchanged and unused by the page.

Backend changes are exactly the two requested fixes: remove `/health.total_urls` and its query; constrain `/urls?limit` to 1–100 with default 20. Existing workspace filtering/order is untouched. ADR 0052 records the data/display tradeoffs.

## Consumer inventory

Searched `scripts/`, `.github/`, `grafana/`, `render.yaml`, `docs/` and `frontend/e2e/` for `/health`, `total_urls`, `dbsize`, `Total URLs` and `Redis DB size` before removing the field, then repeated after edits. Also inspected frontend types/demo and backend health tests. Consumers and dispositions:

| Consumer | Use and disposition |
|---|---|
| `frontend/app/health/page.tsx` | Removed Total URLs / Redis DB size; consumes health + controls, displays valid degraded 503 JSON. |
| `frontend/lib/api.ts`, `demo-api.ts` | Removed count/size health fields; demo no longer fabricates a global total. Added bounded list/status methods. |
| `frontend/lib/reliability.ts`, `components/ReliabilityBanner.tsx` | Public health probe retries transport failures for 90 s but accepts a real degraded response. Banner reads controls independently. Protected-request readiness remains unchanged. |
| `frontend/e2e/identity_provider.py` | Removed total_urls from both fixture response occurrences. |
| `frontend/e2e/demo.spec.ts`, `reliability.spec.ts` | Sample health and warmup/banner consumers; no count expectation; regression-tested. |
| `frontend/e2e/analytics-detail.spec.ts` | New health ok/degraded/unreachable/recovery/privacy/a11y checks. |
| `frontend/tests/demo-api.test.cjs`, `api.test.cjs`, `reliability.test.cjs` | Updated mock contracts; no leaked total; healthy/degraded vs transport retries tested. |
| `tests/test_health_route.py`, `test_routes.py`, `test_app_assembly.py` | Updated exact bodies; a database fake asserts health never calls a count query. Separate Redis DB-size endpoint tests retained. |
| `scripts/smoke_test.sh` | Checks reachable db/redis only; unchanged. |
| `scripts/smoke_prod.py`, `hosted_monitor.py` | HTTP readiness/body status only; unchanged. |
| `scripts/demo.py`, `run_perf.py`, `run_k6_tests.sh`, `chaos/run.py` | Health HTTP success checks; unchanged. demo.py also checks Grafana's separate `/api/health`. |
| `.github/` | No direct health-body/count consumer found; workflows delegate to the scripts above. |
| `render.yaml` | `/livez` health-check path; no health-body/count parsing. |
| `grafana/cloud/README.md` | Synthetic `/health` HTTP 200 monitor; unchanged. No Grafana JSON/rule global-count consumer. |
| `docs/api-changes.md` | Current contract updated and 422 list-limit change recorded. |
| `docs/design-links-verification.md` | Historical follow-up annotated with this step's resolution. |
| `docs/adr/0051-dashboard-list-expiry.md` | Historical decision deferring the health fix retained; superseded here/ADR 0052. |

Other documentation mentioning `/health` describes endpoint readiness, runbooks or historical evidence, not the removed response field. Inspected paths (no current count-dependent instructions found):

- `docs/DEPLOYMENT.md`
- `docs/OPENTELEMETRY.md`
- `docs/adr/0016-local-kustomize-deployments.md`
- `docs/adr/0029-cache-strategy.md`
- `docs/adr/0051-dashboard-list-expiry.md`
- `docs/api-changes.md`
- `docs/auth-verification.md`
- `docs/aws-design.md`
- `docs/baseline.md`
- `docs/ci-security-verification.md`
- `docs/ci-verification.md`
- `docs/cleanup-verification.md`
- `docs/demo-mode-verification.md`
- `docs/design-links-verification.md`
- `docs/design-port-plan.md`
- `docs/design.md`
- `docs/final-audit.md`
- `docs/frontend-audit-after.md`
- `docs/frontend-auth-verification.md`
- `docs/hosted-limits.md`
- `docs/hosted-profile.md`
- `docs/hosting-runbook.md`
- `docs/known-limitations.md`
- `docs/kubernetes-diagnosis.md`
- `docs/kubernetes.md`
- `docs/runbook.md`
- `docs/security-hardening-verification.md`
- `docs/security.md`
- `docs/slo-verification.md`
- `docs/slo.md`
- `docs/uptime.md`

Historical verification transcripts mention the old test name `test_health_endpoint_includes_total_urls`. They are past output, not current contracts, and were not rewritten:

- `docs/abuse-eval-verification.md`
- `docs/abuse-verification.md`
- `docs/auth-verification.md`
- `docs/baseline-fixes-verification.md`
- `docs/baseline.md`
- `docs/broker-retry-verification.md`
- `docs/cache-verification.md`
- `docs/chaos-verification.md`
- `docs/ci-security-verification.md`
- `docs/ci-verification.md`
- `docs/design-verification.md`
- `docs/event-bus-verification.md`
- `docs/gemini-pacing-verification.md`
- `docs/integration-verification.md`
- `docs/kubernetes-verification.md`
- `docs/llm-verification.md`
- `docs/mcp-verification.md`
- `docs/migrations-verification.md`
- `docs/performance-verification.md`
- `docs/readme-verification.md`
- `docs/security-hardening-verification.md`
- `docs/short-codes-verification.md`
- `docs/slo-verification.md`
- `docs/terraform-verification.md`
- `docs/tooling-verification.md`
- `docs/tracing-verification.md`
- `docs/url-features-verification.md`

## Timestamp payload risk

The analytics endpoint still returns its full unbounded timestamp array; the visible window does not reduce network or JSON parsing costs. Aggregation is linear in timestamp count, with 7/30/90 displayed buckets; local calendar arithmetic handles DST and year boundaries. Invalid dates are ignored, with a visible mismatch note if timestamp count differs from the server total. Peak is within the selected window, with earliest-day tie-breaking; total/first/last span all valid timestamps.

Measured a **synthetic**, uncompressed JSON object with 10,000 identical ISO timestamps: **270,059 bytes**, total 10,000 and 90 displayed buckets. The unit performance guard runs 10,000 timestamps in under 1 second on this machine. No production payload, network latency, heap profile or large-scale benchmark was measured. Server-side aggregation/pagination needs a later backend contract; it is not implemented here.

## Reproduction and evidence

Frontend build/browser checks use a temporary copy excluding `.env*`, with the existing local fake identity provider (3199), Next (3100), Node 22.23.4 and no real Supabase credentials. Tests cover selector/query/manual/empty/error retry/table; active/expired/blocked/missing-list/not-found/viewer/delete/copy detail; 503, 90-second failure and recovery; 320px layout; light/dark axe. Phone screenshots were inspected locally. API limits are checked with SQLite and disposable PostgreSQL, including newest-first/default limit and cross-tenant exclusion.

Final results are recorded below. Complete local command logs are retained under `/tmp/analytics-*.log`; these logs and screenshots are not committed build artifacts.

### Passing checks (actual output excerpts)

- `make check`: final log `/tmp/analytics-check-verified.log` (exit 0; output below).
- `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock make test-integration`: exit 0, `/tmp/analytics-integration-final.log`:

```text
TOTAL                                       3979    232  94.17%
Required test coverage of 93.6% reached. Total coverage: 94.17%
========== 746 passed, 14 deselected, 3 warnings in 113.93s (0:01:53) ==========
```

- `make frontend-check`: exit 0; npm ci, ESLint, 45 unit tests and TypeScript; `/tmp/analytics-frontend-check.log`. Final standalone lint/types/unit logs: `/tmp/analytics-lint-verified.log`, `/tmp/analytics-types-verified.log`, `/tmp/analytics-unit-verified.log`.
- `npm run build`: unchanged retry exit 0, `/tmp/analytics-build-final-retry.log`; includes dynamic `/links/[code]` and demo catch-all. The advisory interruption below remains relevant.
- `npx playwright test e2e/analytics-detail.spec.ts e2e/reliability.spec.ts e2e/demo.spec.ts e2e/shell.spec.ts e2e/links.spec.ts e2e/auth.spec.ts --reporter=list`: exit 0, `/tmp/analytics-browser-verified.log`:

```text
52 passed (25.6s)
```

- `make mcp-test`: exit 0, `/tmp/analytics-mcp.log`:

```text
Success: no issues found in 14 source files
...................................                                      [100%]
35 passed in 1.06s
```

### Earlier failures and limits

1. Initial backend type check failed because removing the numeric health field narrowed inferred body values to strings. Fixed with `dict[str, object]`; no blanket ignore.
2. Sandboxed `make check` could not bind local fixture sockets: 4 failures and 5 setup errors (PermissionError), 712 passed, exit 2 from make. Re-ran with local socket permissions; this was not an application regression.
3. First browser run: 51 passed, 1 failed, exit 1. The new error assertion also matched Next's route announcer. Scoped to `main [role="alert"]`; full suite then passed, with no suppressed tests/retries.
4. First build attempts compiled/type-checked successfully but Next 16.4.3's existing security-advisory hook exited 1. Identical retries exited 0. No advisory was suppressed and no dependency upgraded in this no-dependency task. A passing retry does **not** resolve that security warning; dependency remediation remains separate work.
5. No hosted deploy, live Supabase/Render/Grafana check, real production payload benchmark, Safari/Firefox coverage or full timestamp pagination was performed. Browser tests use local fakes; integration tests use real disposable PostgreSQL/Redis. Optional Kafka/other excluded markers were not run.
6. Existing warnings remain (test-library deprecations, npm ESLint deprecation, expected fake-session expiry/disconnected fixture requests). No new npm dependency or lockfile change.

### Final gate output

`make check` **exit 0**, run sequentially after integration to avoid shared coverage writers:

```text
Success: no issues found in 93 source files
TOTAL                                       3979    241  93.94%
========== 721 passed, 39 deselected, 2 warnings in 61.36s (0:01:01) ===========
sh scripts/check-prometheus.sh
Checking rules/slo.yml
  SUCCESS: 22 rules found

  SUCCESS
```

Final `npm run lint`, `npx tsc --noEmit` and `npm test`: **exit 0**; lint/types emitted no diagnostics. Unit output:

```text
# tests 45
# suites 0
# pass 45
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 2891.84625
```

`git diff --check`: exit 0. Offline documentation link check: 67 local targets exist across six changed documents. Final browser run: 52 passed (25.6s), exit 0. No live deployment verification is claimed.

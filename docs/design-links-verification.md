# Links/dashboard verification — step 15.12e

Date: 2026-11-21. Branch: `step-15-12e-links-dashboard`.

## Scope and contracts

- `URLRepository.list_recent` selects and serializes only one additional field: `expires_at`, null or ISO UTC. Query ordering, default limit, aggregate, tenant filter and soft-delete exclusion are unchanged. API change is documented in `api-changes.md`; no migration or new endpoint.
- `URLEntry` and the in-memory demo carry the same field. Demo creation preserves expiry, puts the newest item first, and deletion removes its row and sample review entry. Analytics' listUrls calls and real API route/limit remain unchanged; the dashboard displays up to 20 demo rows without changing the demo client's 30-row sample inventory for other consumers.
- The dashboard's own main explicitly opts into v2 with the existing local font. Shell content wrapper and unrelated page contents are untouched. Counts come only from shown rows; at 20, cards say “Latest 20 links only.” No global health counts, Redis card or performance placeholders remain here.
- URLTable provides Copy through the existing short-link helper, Sonner success/failure, expiry-only badges, confirmed deletion and safe 404 refresh. A 404 says unavailable rather than claiming deletion. The backend still owns authorization; member access to another member's row can also return 404. No per-row status calls, edit/tags/archive/bulk/CSV/QR/password/rules controls or invented review states.
- Shared shell identity controls viewer read-only behavior, with no page-local `/me`. Creation retains local-time expiry, URL/alias fields, onboarding events and existing API error handling. A successful creation emits `links-changed` to reload the table and statistics. Auth/Turnstile flows are untouched.
- Expiry compares absolute instants; offsetless backend timestamps mean UTC. Counters refresh every 30 seconds, so this is display guidance based on the browser clock, not enforcement. Invalid dates display unavailable rather than fabricating an active/expired status.

## Explicit follow-up: public health count

`GET /health` still computes `db.query(func.count(URL.id))` without a workspace filter and exposes `total_urls` publicly. Removing that number from this dashboard does **not** remove the disclosure. Review/removal of that response field is a separate compatibility/security task. This step intentionally leaves the health API unchanged and uses only its status word.

## Tests and evidence

| Requirement | Test |
| --- | --- |
| Nullable/correct expiry and tenant isolation through GET /urls | `tests/test_tenancy.py::test_url_list_expiry_is_additive_and_tenant_scoped` |
| PostgreSQL grouped query, null/date and other-workspace exclusion | `tests/integration/test_list_expiry.py::test_list_expiry_postgres` |
| UTC/offset equality, exact expiration boundary, timezone differences, seven-day count | `frontend/tests/link-dates.test.cjs` |
| API expiry passthrough and typed 404 with unchanged message | `frontend/tests/api.test.cjs` |
| In-memory expiry and deletion | `frontend/tests/demo-api.test.cjs` |
| Copy/clipboard failure, cancel/focus return, 404 refresh, no status fanout | `frontend/e2e/links.spec.ts` |
| Viewer reads only, one shared identity fetch | `frontend/e2e/links.spec.ts` |
| Loading skeleton, failed list, Retry, empty state | `frontend/e2e/links.spec.ts` |
| Light/dark dashboard/dialog axe and 320px viewport | `frontend/e2e/links.spec.ts` |
| Demo create refresh and local delete | `frontend/e2e/links.spec.ts` |
| Cookie auth/workspace headers/429, CAPTCHA reports, shell, sandbox | Existing auth/trust/shell/demo suites |

Intentional regression assertion updates: real rows now display complete short URLs, not bare codes; the demo dashboard shows 20 rows rather than its entire 30/31-row inventory. Reload still removes session-created demo rows. Existing public demo/privacy image baselines are not replaced.

## Verification environment

Node 22.23.4, CPython 3.11.14, macOS Chromium. Frontend build/browser work uses `/private/tmp/links-new/frontend`, fixture environment values and a local fake identity provider; real `.env` files are not read/copied. No live hosted API or Supabase account is exercised. Tests and build logs live in `/tmp` and are not committed.

## Actual results

| Command | Result |
| --- | --- |
| `make check` (permitted local execution) | Exit 0: Black, isort, Flake8, mypy, 714 tests, 22 Prometheus rules and rule tests |
| `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock make test-integration` | Exit 0: 738 passed, 14 deselected, 94.17% combined coverage (floor 93.6%) |
| `make frontend-check` | Exit 0: npm ci, ESLint, 37 unit tests, tsc |
| `npm run lint` / `npx tsc --noEmit` | Exit 0, no diagnostics after loader fix |
| `npm test` | Exit 0: 37 passed |
| `npm run build` | Exit 0 on retry; initial build exit 1 for existing Next.js advisory |
| Playwright: links, demo, auth, trust, shell, public | Exit 0: 53 passed (28.2s) |
| `make mcp-test` | Exit 0: mypy clean, 35 tests passed |
| `git diff --check` | Exit 0 |

Actual output excerpts:

```text
714 passed, 38 deselected, 2 warnings in 59.16s
Checking rules/slo.yml
  SUCCESS: 22 rules found
  SUCCESS

Required test coverage of 93.6% reached. Total coverage: 94.17%
738 passed, 14 deselected, 3 warnings in 105.50s (0:01:45)

# tests 37
# pass 37
# fail 0

53 passed (28.2s)
Success: no issues found in 14 source files
35 passed in 1.71s
```

Complete local logs: `/tmp/links-check-permitted.log`, `/tmp/links-integration-socket.log`, `/tmp/links-frontend-final.log`, `/tmp/links-built-unit.log`, `/tmp/links-build-final-retry.log`, `/tmp/links-browser-final.log`, `/tmp/links-mcp.log`.

Earlier runs, recorded rather than hidden:

- Sandbox `make check` failed on local fake-server bind permissions (4 failed, 5 errors); the permitted rerun passed.
- Default integration run failed in Ryuk startup with “Port mapping ... port 8080 is not available” (715 passed, 23 setup errors). The documented socket override from docs/testing.md restored the suite, with Ryuk enabled. The failed helper had already been removed when inspected; no user stack was stopped or pruned.
- Frontend lint rejected the initial synchronous effect state update and ref cleanup; the loader now starts asynchronously and tracks stale responses without disabling lint rules.
- The first browser run passed 50 tests and failed three old bare-code/full-demo-inventory assertions. Those assertions now follow the requested full-link/latest-20 UI; the final 53 tests passed.

## Limits and follow-ups

- Next.js 16.4.3's existing security advisory is still unresolved. A successful retry does not remediate it; dependencies were not changed in this step.
- No live hosted service, real CAPTCHA/email provider, Linux browser CI or assistive-technology device was tested. Auth/Turnstile tests use the existing fake provider. Light/dark 320px screenshots were inspected locally; the page fits without horizontal document scrolling.
- Public `/health.total_urls` remains the explicit follow-up above. A service-status card is a page-load snapshot, not an uptime claim.
- Browser expiry display depends on client time and is not a blocked/review verdict. Backend redirects enforce lifecycle independently.
- No commit, push or deployment was performed. Generated coverage files, logs, database data and build output remain ignored/untracked artifacts, not changes to commit.

Follow-up: step 15.12f removes public `/health.total_urls`, bounds `GET /urls` and adds detail navigation. The output above remains the historical step 15.12e record; see [analytics/detail verification](design-analytics-detail-verification.md) for the new contract.

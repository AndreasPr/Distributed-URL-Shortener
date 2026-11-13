# Trust-controls verification — 2026-11-12

Branch: `step-15-5-trust-controls`. No real CAPTCHA, identity-provider, LLM, email or cloud credentials were used. Existing local `.env` files were not read or replaced. Browser build/tests used an isolated temporary frontend copy with fixture-only identity/API settings, preserving the developer's `.next` output.

## Requirement evidence

| Rule | Implementation | Test evidence |
| --- | --- | --- |
| Verified human or verified-owner key | services/trust.py; existing Principal verification | test_trust_controls: creation states, ownerless/owned keys |
| UTC daily/workspace caps; atomic accounting | PostgreSQL user/workspace locks, DailyCreation | daily deletion/reset, capacity/rollback; integration/test_trust concurrent requests |
| CAPTCHA | services/turnstile.py; public report API | trusted hostname/action, missing/timeout/oversize/malformed/upstream failures |
| Probation and explicit LLM | creation transaction; abuse worker provider policy | provisional warning, old account, explicit provider/budget |
| Warning/continue and malicious block | abuse persistence, /warnings, frontend /warn | fresh block recheck, expiry, browser block response |
| Own-host denial and platform denylist | destination_denied; /admin/denylist | product hosts, permission, existing redirect 451, add/list/remove |
| Reports, disable, suspend | /reports, /admin/reports, links/users endpoints | queue entry, public auth omission, rate limit, report history, revoked keys/404 links |
| Legal/contact templates | /terms /privacy /abuse; server ABUSE_CONTACT_EMAIL | Playwright public access and axe checks; no mailbox provided/configured |
| Export/deletion/purge | data_rights.py; worker hourly; CLI purge | private export, other-user exclusion, immediate disable, 30-day boundary, repeatable purge, JWT tombstone |
| Audit records | key services, memberships, moderation/deletion | tenant/role boundary, suspension, key actor; existing membership tests |
| Migration | 0009, RLS enabled and conditional grants revoked | empty PostgreSQL metadata match; SQLite upgrade/downgrade preserves earlier tables |

Paths in the table are under `app/`, `tests/` or `frontend/` as appropriate. Full new policy suite: `tests/test_trust_controls.py`; browser suite: `frontend/e2e/trust.spec.ts`.

## Checks

Actual command output excerpts are recorded below. Complete local logs are `/tmp/trust-make-check-final2.log`, `/tmp/trust-integration-final.log`, `/tmp/trust-frontend-check-final.log`, `/tmp/trust-build.log`, `/tmp/trust-playwright.log`, `/tmp/trust-mcp.log`, and `/tmp/trust-targeted-final.log`; logs/build artifacts are not committed.

Other completed checks (exit 0): shell syntax and ShellCheck for `scripts/kind_smoke.sh`; `git diff --check`; redacted Gitleaks scans of tracked changes and new source files (no leaks); README checker (208 lines, 57 links, 33 command examples; external URLs only syntax checked). Targeted final tests: **47 passed**, including demo/README contracts and key-revocation audit actor.

## Failures found and corrected

- A sandbox-only run blocked local HTTP fixtures; required checks were rerun with local socket/Docker access.
- Initial lint found formatting, JSX apostrophe and internal-navigation issues; corrected without disabling lint.
- First integration run: new probation intercepted the old LLM fixture, and combined coverage was 93.13%, below 93.6%. The fixture now explicitly represents an established user; additional moderation/CAPTCHA failure-path tests raised coverage. The coverage threshold was not lowered.
- First browser run: 26 passed, one selector ambiguity with Next's built-in route-announcer alert. Restricted the selector to the block message; subsequent full run: 27 passed.
- One extra targeted command named a nonexistent test file (exit 4), and one browser invocation used the repository root instead of frontend (exit 254). Corrected commands were rerun successfully; these were invocation errors, not application failures.

## Manual / not claimed

Configure Supabase CAPTCHA in its dashboard, plus server Turnstile secret/allowed hostnames and frontend site key; real CAPTCHA validation was mocked. Set PUBLIC_WEB_URL and every API/short-domain alias in PRODUCT_HOSTS. Set frontend server-only ABUSE_CONTACT_EMAIL before public launch; until then /abuse explicitly says the mailbox is missing. Run migrations and restart API/workers. Use a verified human-owned key for automation; legacy ownerless keys cannot create links.

Legal/privacy pages require operator review. Hosted scheduled cleanup requires a running worker; external identities, backups and broker copies need separate erasure procedures. No live provider or production deployment was tested. The kind smoke script was syntax/contract checked, not deployed in this step. Demo fixture tests passed; a full `make demo` deployment was not run.

### Actual output excerpts

`make test-integration` (exit 0, before the final lock-refresh regression was added):

```text
TOTAL                                       3668    220  94.00%
Required test coverage of 93.6% reached. Total coverage: 94.00%
648 passed, 14 deselected, 3 warnings in 116.90s (0:01:56)
```

Final targeted PostgreSQL quota/stale-identity checks (exit 0):

```text
TESTCONTAINERS_RYUK_DISABLED=true .venv/bin/pytest tests/integration/test_trust.py --run-integration -m integration --no-cov -q
2 passed, 3 warnings in 17.89s
```

The first targeted retry hit Docker Desktop's known Ryuk missing-port-mapping error. The documented local-only workaround above passed; fixtures remove their containers. The failed Ryuk helper was already absent when cleanup was attempted. CI's Ryuk configuration was not changed. The new tests are explicitly marked integration, excluded from the fast unit target.

`make frontend-check` (exit 0): npm ci, ESLint with zero allowed warnings, frontend unit tests and TypeScript completed:

```text
# tests 20
# pass 20
# fail 0
cd frontend && ./node_modules/.bin/tsc --noEmit --incremental false
```

Isolated `npm run build` (exit 0): production compile, TypeScript, page generation and proxy completed. Isolated `npm run test:e2e` (exit 0):

```text
27 passed (14.7s)
```

`make mcp-test` (exit 0): Black/isort/Flake8 passed, followed by:

```text
Success: no issues found in 14 source files
35 passed in 0.84s
```

Final `make check` (exit 0), including Black/isort/Flake8 and blocking mypy:

```text
TOTAL                                       3669    228  93.79%
629 passed, 35 deselected, 2 warnings in 75.06s (0:01:15)
sh scripts/check-prometheus.sh
Checking rules/slo.yml
  SUCCESS: 22 rules found
  SUCCESS
```

The combined integration coverage above was measured before the final audit-actor/lock refinement; the final unit gate and two targeted PostgreSQL tests cover those refinements. This distinction avoids presenting an earlier full integration run as a later one.

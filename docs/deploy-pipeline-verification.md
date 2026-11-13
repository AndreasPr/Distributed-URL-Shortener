# Deploy-pipeline verification — 2026-11-12

Branch: `step-15-6-deploy-pipeline`. No live URL or cloud credentials supplied or used. The operator requested local implementation and an explicit skip when API_ORIGIN is unset. No deployment, synthetic production creation, or cloud account changes were performed.

## Evidence and outcomes

All passing commands below exited 0:

```text
make check
639 passed, 36 deselected, 2 warnings in 84.47s (0:01:24)
TOTAL                                       3674    228  93.79%
Checking rules/slo.yml
  SUCCESS: 22 rules found
  SUCCESS

make frontend-check
# tests 23
# pass 23
# fail 0
cd frontend && ./node_modules/.bin/tsc --noEmit --incremental false

npm run build
Production compile, TypeScript, page generation and proxy: completed successfully

npm run test:e2e
27 passed (28.5s)

make mcp-test
Success: no issues found in 14 source files
35 passed in 4.90s

TESTCONTAINERS_RYUK_DISABLED=true .venv/bin/pytest tests/integration/test_hosting_hardening.py --run-integration --no-cov -q
1 passed, 2 warnings in 4.58s

.venv/bin/mypy scripts/smoke_prod.py scripts/check_supabase_hardening.py
Success: no issues found in 2 source files

bash scripts/verify_hosted_redirect.sh
SKIP: API_ORIGIN is unset. After deploying to Render, set it and run this check once.
```

The build entry above is a summary, not a verbatim console line. Full local logs: `/tmp/deploy-check-final2.log`, `/tmp/deploy-frontend-final.log`, `/tmp/deploy-build.log`, `/tmp/deploy-playwright.log`, `/tmp/deploy-mcp.log`, `/tmp/deploy-hardening-postgres.log`. Build/browser tests used an isolated temporary frontend with only fixture settings, not the user's `.env.local` or dev build. The fake identity server reported a browser-aborted BrokenPipe during the passing browser suite; this is not live provider evidence.

Additional exit-0 checks: Actionlint on deploy-check.yml; Bash syntax and ShellCheck on verify_hosted_redirect.sh; Black/isort/Flake8 on new Python scripts; git diff --check; redacted Gitleaks scan of changed/new source files (no leaks). README offline checker: 242 lines, 59 Markdown links, 33 command examples. Its nine external URLs were syntax checked, not all fetched by that checker. Vendor documentation used for the runbook was browsed separately.

## Contracts covered

- `tests/test_deploy_pipeline.py`: exact 307/Location, direct/proxy click counts, cleanup after failure, bounded cold start and expected revision, background readiness, no credential echo, read-only catalog transaction, workflow trust gates, unset-origin skip.
- `tests/integration/test_hosting_hardening.py`: detects missing RLS and real effective anon grants; PostgreSQL reports a read-only transaction and rejects a write. This is an isolated local Postgres fixture, not a live Supabase audit. Local Ryuk workaround only; fixtures clean up their resources.
- `frontend/tests/short-link.test.cjs`: configured copy-link base, manual proxy redirect behavior, untouched Location, no forwarded credentials, missing-origin/invalid-code failure.
- `tests/test_hosted_profile.py` and `tests/test_ci_workflows.py`: blueprint uses explicit CI-gated hooks; production deploy runs serialize without canceling cleanup, while normal CI remains cancelable.

## Corrections during validation

An initial targeted run failed the old blanket cancellation contract and used a nonexistent shared client fixture. The contract now explicitly distinguishes deployment cleanup from cancelable CI; the revision-header test invokes the actual endpoint with a Response object. Standalone script lint found long lines, and direct psycopg2 typing lacked stubs. The audit now uses the already-installed typed SQLAlchemy connection API; lint and mypy pass without adding dependency ignores.

## Deliberately unverified / blocked

- Live Render, Vercel edge rewrite behavior, cloud dashboard configuration, hook invocation, and Supabase catalog state are **not verified**. A local mocked 307 test does not prove Vercel's behavior. Use the runbook and `verify_hosted_redirect.sh` after deployment; keep copied links on the direct API base until that passes.
- Current Redis Cloud Free Essentials lacks TLS according to official vendor docs. The runbook marks secure public deployment with this exact free vendor set as blocked; no paid upgrade or plaintext fallback is implemented.
- GitHub deploy-check is opt-in (`HOSTED_DEPLOY_ENABLED`); Render auto-deploy is off. Configure production secrets/variables and branch restrictions before enabling it. The workflow itself was linted and contract-tested locally, not executed on GitHub.
- Full Testcontainers integration and live kind deployment were not run for this step; the dedicated read-only hardening integration test was run. No production smoke test was claimed as passing.

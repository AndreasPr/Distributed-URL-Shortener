# Trust controls

Run `alembic upgrade head` before starting the updated API/workers (revision 0009). Existing ownerless keys remain valid for their permitted reads, but cannot create links. Sign in with a verified user and create a programmatic key from that workspace, or use the trusted operator CLI `python -m app.cli keys create --name automation --scopes read write --workspace WORKSPACE_UUID --user USER_UUID`. Never commit its one-time output.

## Configuration

| Setting | Purpose/default |
| --- | --- |
| FREE_DAILY_LINKS | 20 successful creations per user, UTC day, across keys/workspaces |
| FREE_WORKSPACE_LINKS | 200 non-deleted links; expired links still count until deleted |
| PUBLIC_WEB_URL | Exact frontend origin used for warning redirects; local default http://localhost:3000 |
| PRODUCT_HOSTS | Comma-separated API and short-domain hostnames, including aliases; their subdomains are denied too |
| TURNSTILE_SECRET_KEY | Server-only Siteverify secret; absent means reports fail closed with 503 |
| TURNSTILE_HOSTNAMES | Allowed frontend hostnames for report CAPTCHA |
| NEXT_PUBLIC_TURNSTILE_SITE_KEY | Public widget key on frontend |
| ABUSE_CONTACT_EMAIL | Frontend server-only contact; missing-mailbox notice until set |
| LLM_PROVIDER / LLM_DAILY_BUDGET | Worker uses heuristics when provider is not explicitly configured or budget is zero |

Also deny the frontend origin automatically. Populate PRODUCT_HOSTS for every deployed hostname; the API cannot discover external proxy domains reliably. No real credentials or addresses belong in examples.

## Signup and reports

There is no custom signup backend endpoint. In Supabase Authentication settings, enable CAPTCHA protection under Bot and Abuse Protection and configure Turnstile. This is a manual operator action; the frontend widget alone is not enforcement. See [Supabase CAPTCHA](https://supabase.com/docs/guides/auth/auth-captcha).

Reports use POST /reports with short_code, category (phishing/malware/spam/other), captcha_token. The server calls [Turnstile Siteverify](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/) with bounded response size, two-second connect/read timeouts, no redirects and hostname/action validation (`report`). Reports are public, with a ten-request IP burst and one-token-per-minute refill. Redis failure fails closed except the hosted per-instance fallback already documented. The `/abuse` page prefers the report form and exposes a mailto contact only when configured.

## Moderation and data rights

- Suspicious links redirect to /warn/{code}; Continue rechecks expiry, deletion, denylist and verdict. Malicious/block verdicts return 451. Reporting creates or promotes a suspicious review item.
- Platform admins: GET/POST /admin/denylist, DELETE /admin/denylist/{domain}, GET /admin/reports/{code}, POST /admin/links/{code}/disable, POST /admin/users/{id}/suspend. Existing review endpoint allows/blocks. Suspension disables the user's links and keys.
- Workspace admin/owner: GET /workspaces/{id}/audit (bounded, tenant-scoped). Key creation/revocation, membership role changes/removal, link disabling, suspension and account deletion are recorded without secrets.
- Signed-in humans: GET /me/export; DELETE /me with existing typed DELETE confirmation. A sole personal-workspace owner can delete; a last owner with other members must transfer ownership first.
- Run `python -m app.cli purge` for manual cleanup. The abuse worker schedules it hourly. Backend erasure does not delete the Supabase identity or provider backups. See /privacy templates before public deployment.

## Verification

`make check`, `make test-integration` (disposable Docker PostgreSQL/Redis), `make frontend-check`, `make mcp-test`, and frontend Playwright tests. `tests/test_trust_controls.py` covers policy/statuses; `tests/integration/test_trust.py` tests concurrent quota enforcement; migration metadata is checked in `tests/integration/test_redis_postgres.py`; `frontend/e2e/trust.spec.ts` covers public warning/report/legal pages without real CAPTCHA calls.

# Hosted deployment runbook

Key Value sections reviewed 2026-11-13; remaining deployment sections reviewed 2026-11-12 against the linked vendor documentation. Dashboard labels can move; links below are the authoritative reference. This is an operator procedure, not evidence that a deployment succeeded. No live services were contacted in this step. Use free plans only; never select a paid upgrade to complete these instructions.

The hosted baseline uses **Render Key Value Free on the private network**, replacing the Redis Cloud TLS prerequisite. No live deployment is claimed. Free Key Value is ephemeral; see section 3 before accepting user traffic.

Local evidence and skipped live checks: [verification record](deploy-pipeline-verification.md).

## 1. Prepare the repository and deployment domains

1. Merge this branch only after CI passes. Keep production on the repository's default branch (`main` or `master`). Protect that branch with required CI checks.
2. Run `make check`, `make frontend-check`, and `make test-integration` locally where Docker is available. Do not upload `.env`, exports, logs containing credentials, or private keys.
3. Decide the public frontend origin and API origin. Throughout this document `https://frontend.example.invalid` and `https://api.example.invalid` are non-working placeholders; replace them privately in provider settings, never with credentials in source control.
4. Keep `HOSTED_DEPLOY_ENABLED` unset until initial setup and manual smoke verification finish. No script in this repository provisions cloud resources.

## 2. Supabase: database and identity

1. Open the Supabase dashboard → your organization → **New project**. Select the free plan, name the project, generate/store a database password privately, and choose **US East / North Virginia (us-east-1)**. Existing projects need not be recreated.
2. Project → **Connect** → connection strings → **Transaction pooler**. Copy its PostgreSQL URI privately, URL-encode password characters, and add `sslmode=require`. Use the displayed host/port/user; do not invent a project reference. Set it as Render `DATABASE_URL`. The app uses transaction-local statement limits and a small pool. [Connection options](https://supabase.com/docs/guides/database/connecting-to-postgres).
3. **Project Settings → API Keys**: obtain the publishable key (or existing public anon key) and project URL. These go into the backend and frontend variables below. Never use a service-role/secret API key in the browser. The historical variable name `SUPABASE_ANON_KEY` accepts the public key used in the `apikey` header. [API key types](https://supabase.com/docs/guides/getting-started/api-keys).
4. **Authentication → URL Configuration**: set Site URL to the exact frontend HTTPS origin. Add exact `/auth/callback` and `/reset-password` URLs on that origin; retain loopback entries only for development. Avoid wildcard production redirect allowlists. [Redirect URL settings](https://supabase.com/docs/guides/auth/redirect-urls).
5. **Authentication → Sign In / Providers**: enable the providers you intend to expose. For Google/GitHub, create the provider OAuth application, copy the callback shown by Supabase into the provider configuration, then enter its client ID/secret in Supabase only. For Google, use the documented Web application OAuth flow. [Google setup](https://supabase.com/docs/guides/auth/social-sign-in/auth-google).
6. **Project Settings → JWT Keys**: use asymmetric signing keys; keep backend allowed algorithms RS256/ES256. Do not enable the legacy shared secret path for this deployment. [Signing keys](https://supabase.com/docs/guides/auth/signing-keys).
7. Leave email/password disabled in the frontend unless you enable and test it deliberately. Supabase's bundled email sender has limits; this procedure does not add a paid SMTP service. OAuth still needs testing with a verified email.
8. Render startup applies Alembic migrations. Afterward run the read-only hardening audit from a trusted local terminal with `HARDENING_DATABASE_URL` set privately:

   ```bash
   .venv/bin/python scripts/check_supabase_hardening.py
   ```

   The script starts a read-only transaction, checks **all** public tables (including partitioned/foreign tables), effective anon table/column privileges including inherited/PUBLIC grants, and rolls back. Missing anon or no tables fails; errors do not print the DSN. It does not modify policies. Use a catalog-readable account, preferably dedicated read-only credentials.
9. If `alembic_version` is reported, migration bookkeeping is not exempt. In **SQL Editor**, review the named table; enable RLS and revoke anon/authenticated privileges explicitly, for example:

   ```sql
   ALTER TABLE public.alembic_version ENABLE ROW LEVEL SECURITY;
   REVOKE ALL ON TABLE public.alembic_version FROM anon, authenticated, PUBLIC;
   ```

   Review other findings individually; do not grant public policies to make the check pass. Rerun until clean. This is not a complete policy/function/security audit: owner/service-role access bypasses RLS and the app still enforces tenancy. [Production checklist](https://supabase.com/docs/guides/security/production-checklist).

## 3. Render Key Value: private, free, ephemeral

1. Select the **same Render workspace** for the entire Blueprint in section 5. The Blueprint creates `relaymark-keyvalue` and `relaymark-api` in **Virginia**. Do not create a second manual instance: Render permits one Free Key Value instance per workspace. If already occupied, stop and review existing resources; do not delete them or upgrade automatically.
2. Review `render.yaml`: Key Value `plan: free`, `region: virginia`, `ipAllowList: []`, `maxmemoryPolicy: noeviction`, `persistenceMode: off`. The empty allowlist blocks external connections. The API receives `REDIS_URL` from the service's `connectionString`; do not paste an external URL or add an allow-all IP rule. [Blueprint reference](https://render.com/docs/blueprint-spec).
3. After applying the Blueprint, open Key Value → **Info / Connections** and confirm its internal connection is selected; inspect **Networking / Inbound IP rules** and confirm no external ranges. Check both services belong to the same workspace and region. Private connectivity must be verified after deployment; a local test cannot prove it. [Private connections](https://render.com/docs/key-value).
4. Production accepts TLS `rediss://`, or plaintext only for a hostname fully matching **`red-[a-z0-9]{1,59}`**, port 6379 (or omitted). This conservative single-label rule follows Render's documented `redis://red-xxxxxxxxxxxxxxxxxxxx:6379` connection string. Dotted suffixes, trailing dots, other plaintext hosts, query options and fragments are rejected. This is a configuration guard, not DNS authentication: use only the platform-injected connection string. [Connection string format](https://render.com/docs/blueprint-spec#connectionstring).
5. Free instances **lose all data on every restart**. Cache entries, rate-limit counters, streams, pending events and dead letters disappear. Lost clicks cannot be reconstructed; queued abuse checks can be lost. PostgreSQL links, stored verdicts and committed analytics remain. Rate buckets reset; database-backed creation caps remain. `noeviction` avoids silent memory-pressure eviction but cannot prevent restart loss; memory exhaustion can reject event writes. Inspect worker health and test recovery; this is not durable analytics or guaranteed abuse processing. [Free limitations](https://render.com/docs/free).
6. Local compatibility check (Docker required; no hosted URLs used):

   ```bash
   .venv/bin/python -m pytest --run-integration tests/integration/test_valkey_compatibility.py -s -q
   ```

   This creates and removes a loopback-bound Valkey 8 container and tests Streams recovery/acknowledgment and the actual Lua token bucket. See [local evidence](render-keyvalue-verification.md); it does not validate Render networking.

**Optional fallback, not provisioned:** Upstash offers TLS and a Free allowance of 500K commands/month. Configure a `rediss://` endpoint only after checking Streams/Lua compatibility and workload quotas. Continuous consumers, pending recovery and lag polling can exhaust that allowance even with few clicks. Do not select a paid plan automatically. [TLS](https://upstash.com/docs/redis/features/security), [pricing](https://upstash.com/pricing/redis).

## 4. Turnstile: signup and report security

1. Cloudflare dashboard → **Turnstile → Add widget**. Name it, add the exact production frontend hostname (no scheme/path), select **Managed**, and create it.
2. Copy the public site key to Vercel `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. Store the secret only in Render `TURNSTILE_SECRET_KEY` and Supabase's CAPTCHA settings.
3. Render `TURNSTILE_HOSTNAMES` must list those exact allowed hostnames, comma separated. Test hosts belong in a separate development widget where practical.
4. Supabase → **Authentication → Bot and Abuse Protection** → enable CAPTCHA → Turnstile → enter the secret → Save. This protects Supabase signup/recovery; the API independently verifies report tokens, hostname and action `report`.
5. After deployment submit one report in a signed-out browser: expect POST `/reports` 202. Inspect status/body only; never share its CAPTCHA token. [Widget dashboard](https://developers.cloudflare.com/turnstile/get-started/widget-management/dashboard/) and [Supabase CAPTCHA](https://supabase.com/docs/guides/auth/auth-captcha).

## 5. Render: one container

Use the same workspace for both resources; review section 3 first.

1. Render dashboard → **New → Blueprint** → connect GitHub → select this repository/default branch → review `render.yaml`.
2. Confirm one Docker web service and one Key Value instance, both **Free**, **Virginia**; for the web service confirm Docker command `python -m app.hosted`, health path `/livez`. Do not provision paid database/cache/worker resources. Leave REDIS_URL managed by the Blueprint service reference. Render hosts API and both supervised consumers in one process.
3. Fill each `sync: false` environment value using the matrix. Set `PUBLIC_WEB_URL` to the frontend HTTPS origin and `PRODUCT_HOSTS` to every API/short-domain hostname, including aliases.
4. Obtain the platform's actual immediate proxy addresses/CIDRs from authoritative platform configuration/support and verify the socket peer. Set restricted `TRUSTED_PROXIES`. Do not use `0.0.0.0/0`, guess private ranges, or confuse Render outbound IP ranges with inbound proxies. If this cannot be established, deployment is not fully configured; shared-IP rate limits are not per-user-IP proof.
5. Create the service. Watch **Events → Deploy logs**: migrations must finish; `/health` must become healthy. `/livez` only proves process liveness, not migration/worker readiness.
6. **Settings → Build & Deploy → Auto-Deploy** must remain **Off**. CI triggers the secret deploy hook later; this avoids a circular dependency where Render waits for the post-deploy check before deploying.
7. **Settings → Deploy Hook**: copy its URL directly into the GitHub production environment secret `RENDER_DEPLOY_HOOK_URL`. Never put it into files, logs or a browser-public variable. The workflow appends `ref=<CI-tested SHA>` and waits for that SHA in `/livez`'s `X-Deployment-Revision` header. Render supplies `RENDER_GIT_COMMIT` automatically. [Deploy hooks](https://render.com/docs/deploy-hooks).

Free Render can sleep after inactivity; worker processing and purge scheduling also stop during sleep. A 90-second cold-start check is an assertion, not a promised startup SLA. [Free-service limits](https://render.com/docs/free).

## 6. Vercel: frontend and short URLs

1. Vercel dashboard → **Add New → Project** → import repository. Set **Root Directory: frontend**, framework Next.js, Node 22.x, install `npm ci`, build `npm run build`.
2. **Settings → Environment Variables**: add the Production variables in the matrix. Keep LocalAuth false. Do not give Preview deployments production backend secrets or synthetic keys.
3. Deploy, then **Settings → Domains** to establish the stable frontend domain. Update Supabase callbacks, CORS, product hosts and Turnstile allowlists to match.
4. `frontend/vercel.json` rewrites `/s/:code` to `/api/short/:code`. That server handler forwards to **API_ORIGIN** (required; no default/hardcoded origin), with `redirect: manual`, no cookies/API keys, and `Cache-Control: no-store`. It copies upstream status and Location without parsing/rebuilding Location. The indirection allows runtime env configuration without committing a deployment hostname. [Vercel rewrites](https://vercel.com/docs/routing/rewrites).
5. Initially set `NEXT_PUBLIC_SHORT_BASE_URL` to the **direct API origin**. The browser's copied URL uses this base; demo mode continues copying only its fake code. Public variables are compiled at build time, so redeploy after changes.
6. After Render deploys, set `API_ORIGIN` privately in your terminal, select an active clean synthetic code, and run once:

   ```bash
   export VERIFY_SHORT_CODE='YOUR_SYNTHETIC_CODE'
   export HOSTED_SHORT_BASE_URL='https://frontend.example.invalid/s'
   export VERIFY_EXPECTED_LOCATION='https://example.com/'
   bash scripts/verify_hosted_redirect.sh
   ```

   Set `API_ORIGIN` to your real Render origin first; no value is committed. If unset the script explicitly **SKIPs**, not PASSes. It checks direct API and Vercel without following redirects. These GETs create clicks. If both preserve exact 307/Location, set `NEXT_PUBLIC_SHORT_BASE_URL` to the frontend `/s` base and redeploy. If not, retain the direct API base and record the observed status/header difference. This step has only mocked local preservation evidence, not live Vercel evidence.
7. The proxy's 10-second fetch timeout can fail during Render cold starts; direct API links are the fallback. It deliberately does not forward spoofable IP headers, so requests through it may share a proxy-IP bucket. Do not claim equivalent client-IP attribution. Suspicious links redirect to `/warn`, and are not suitable for the clean-link smoke check.

## 7. GitHub: deploy and smoke gates

1. Repository **Settings → Environments → New environment → production**. Restrict deployments to the protected default branch. Add reviewers if available on your free public-repository setup.
2. Create a dedicated verified human synthetic user/workspace via the app. Mint a read/write API key from that workspace and store it as production secret `SMOKE_API_KEY`. Do not use a platform-admin key, ownerless legacy key or Supabase service-role key. Free creation caps still apply (20/day across this user's keys); use a dedicated workspace and do not schedule high-frequency creation checks.
3. Add production secret `RENDER_DEPLOY_HOOK_URL`. Set repository variables `API_ORIGIN` (exact HTTPS API origin), `SMOKE_SHORT_BASE_URL` (direct API initially, `/s` only after verification). Optionally set `SMOKE_EXPECTED_REVISION` for manual checks.
4. Add repository variable `HOSTED_DEPLOY_ENABLED=true` only after manual deployment works. An unset flag intentionally skips this workflow, not a deployment success.
5. Push/merge to default branch. **Actions → CI** must succeed. **Deploy check** accepts only successful same-repository push CI runs on main/master, checks out trusted default-branch code, triggers the tested SHA, waits up to 15 minutes for that deployment, then runs the smoke test. No PR artifacts/code are downloaded with secrets. Grant only contents:read.
6. Smoke retries `/livez` for up to 90 seconds, waits up to 60 seconds for `/health` readiness, creates a one-hour-expiring synthetic link, checks direct and optional proxy 307/Location, waits up to 60 seconds for exact click count, and deletes in `finally`. Each run consumes one daily creation. Failure prints a short category/status, never response bodies, tokens or DSNs.
7. **Actions → Deploy check → Run workflow** performs verification only, without requesting another deploy. A failed check does not automatically roll back data or code. Its full output is the operator diagnosis. If a runner is forcibly killed or creation outcome is unknown, inspect `smoke-` aliases and remove leftovers; expiry alone does not release workspace capacity.

## 8. Grafana Cloud and uptime monitoring

1. Create/sign in to Grafana Cloud → choose **Free** → create/open your stack. Review its usage limits; do not enable paid overages.
2. In the stack's connection/setup UI choose **OpenTelemetry / OTLP** → generate a narrowly scoped write access-policy token. Store the generated OTLP HTTP base endpoint and Authorization header in Render's environment, not Vercel. Use `OTEL_EXPORTER_OTLP_ENDPOINT` and `OTEL_EXPORTER_OTLP_HEADERS` in SDK format, and set `OTEL_SDK_DISABLED=false`; redeploy.
3. Generate a clean redirect and open **Explore → Traces**. Hosted workers share the API process/provider; do not expect three independent process resources as in local Compose. This repo exports traces through OTLP; it does **not** automatically remote-write Prometheus metrics or ship stdout logs to Grafana Cloud. Local dashboards are not evidence of hosted metric ingestion. [OTLP connection guide](https://grafana.com/docs/grafana-cloud/send-data/otlp/send-data-otlp/).
4. Open **Testing & synthetics → Synthetic Monitoring**, initialize it if prompted, then **New check → HTTP**. Name `relaymark-health`, target the API `/health`, expect 200, select one public probe and a low frequency such as hourly. Use the displayed execution calculator to remain inside the free allowance; do not select a paid plan.
5. Save → inspect **Check results**. Under **Alerting → Contact points**, configure your own notification address; create a rule for repeated check failures. Repeat with a frontend landing-page check if within the allowance. No API key is needed for health checks. [Synthetic setup](https://grafana.com/docs/grafana-cloud/observe-and-act/testing/synthetic-monitoring/set-up/grafana-cloud/) and [usage calculator](https://grafana.com/docs/grafana-cloud/platform/pricing-and-usage/synthetic-monitoring/).
6. Treat a timeout separately from sustained dependency failure; external checks can time out sooner than the smoke's 90-second cold-start window. Monitoring itself wakes Render and affects measured sleep behavior. Do not use frequent requests solely to evade free-tier sleep. No always-on uptime guarantee is claimed.

## Environment matrix

Placeholders are examples only; never paste them as production credentials. Origins are public routing metadata even when stored server-side.

| Variable | Where it lives | Secret/public | Example placeholder |
|---|---|---|---|
| DATABASE_URL | Render | Secret | `postgresql://USER:PASSWORD@POOLER_HOST:6543/postgres?sslmode=require` |
| HARDENING_DATABASE_URL | Operator terminal only | Secret | Same format with read-only catalog credentials |
| REDIS_URL | Render Blueprint → API fromService connectionString | Private; secret if internal authentication enabled | `redis://red-INSTANCE_ID:6379` (illustrative placeholder; never handcraft) |
| APP_ROLE / ENVIRONMENT | Render | Public | `all` / `production` |
| AUTH_MODE / EVENT_BUS | Render | Public | `supabase` / `redis_streams` |
| SUPABASE_URL | Render | Public | `https://PROJECT.supabase.co` |
| SUPABASE_ANON_KEY | Render | Public key, server-configured | `PUBLIC_SUPABASE_KEY` |
| SUPABASE_JWT_AUDIENCE | Render | Public | `authenticated` |
| SUPABASE_JWT_ALGORITHMS | Render | Public | `RS256,ES256` |
| CORS_ORIGINS / PUBLIC_WEB_URL | Render | Public | `https://frontend.example.invalid` |
| PRODUCT_HOSTS | Render | Public | `frontend.example.invalid,api.example.invalid` |
| TRUSTED_PROXIES | Render | Public security configuration | `VERIFIED_PLATFORM_PROXY_CIDRS` |
| PLATFORM_ADMIN_EMAILS | Render | Private identity list | `operator@example.invalid` |
| TURNSTILE_SECRET_KEY | Render and Supabase Auth settings | Secret | `TURNSTILE_SECRET` |
| TURNSTILE_HOSTNAMES | Render | Public | `frontend.example.invalid` |
| FREE_DAILY_LINKS / FREE_WORKSPACE_LINKS | Render | Public | `20` / `200` |
| LLM_PROVIDER / LLM_DAILY_BUDGET | Render | Public | `fake` / `0` (heuristics only) |
| OTEL_SDK_DISABLED | Render | Public | `true` until telemetry configured |
| OTEL_EXPORTER_OTLP_ENDPOINT | Render | Public endpoint | `https://OTLP_HOST/otlp` |
| OTEL_EXPORTER_OTLP_HEADERS | Render | Secret token-bearing header | `Authorization=ENCODED_AUTH_HEADER` |
| API_ORIGIN | Vercel server, GitHub repository variable, operator terminal | Public, no default | `https://api.example.invalid` |
| NEXT_PUBLIC_API_URL | Vercel build | Public | `https://api.example.invalid` |
| NEXT_PUBLIC_SHORT_BASE_URL | Vercel build | Public | API origin first; frontend `/s` after verification |
| NEXT_PUBLIC_SUPABASE_URL | Vercel build | Public | `https://PROJECT.supabase.co` |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Vercel build | Public key | `PUBLIC_SUPABASE_KEY` |
| NEXT_PUBLIC_LOCAL_AUTH | Vercel build | Public | `false` |
| NEXT_PUBLIC_EMAIL_AUTH | Vercel build | Public | `false` until configured/tested |
| NEXT_PUBLIC_TURNSTILE_SITE_KEY | Vercel build | Public | `TURNSTILE_SITE_KEY` |
| ABUSE_CONTACT_EMAIL | Vercel server | Public when rendered | `abuse@example.invalid` |
| RENDER_DEPLOY_HOOK_URL | GitHub production secret | Secret URL | `PRIVATE_RENDER_HOOK` |
| SMOKE_API_KEY | GitHub production secret | Secret | `SYNTHETIC_OWNED_KEY` |
| HOSTED_DEPLOY_ENABLED | GitHub repository variable | Public | `true` only after setup |
| SMOKE_SHORT_BASE_URL | GitHub repository variable | Public | API origin or frontend `/s` |
| SMOKE_EXPECTED_REVISION | GitHub variable/manual shell | Public | `40_CHARACTER_COMMIT_SHA` |
| VERIFY_SHORT_CODE / VERIFY_EXPECTED_LOCATION | Operator terminal | Public synthetic fixture | `SYNTHETIC_CODE` / `https://example.com/` |
| HOSTED_SHORT_BASE_URL | Operator terminal | Public | `https://frontend.example.invalid/s` |

`RENDER_GIT_COMMIT` and `PORT` are platform-injected; do not fake revision values. GitHub's built-in GITHUB_TOKEN needs no personal token. OAuth client secrets live only in Supabase/provider settings. No service-role secret, local signing key, Kafka credentials or LLM key is required for this hosted baseline.

## Rollback

1. Set repository `HOSTED_DEPLOY_ENABLED=false` to stop new hook requests. Wait for the active workflow or cancel knowingly; inspect synthetic leftovers if interrupted.
2. Render → service → **Events** → select the last known-good deploy → **Rollback** where available, or **Manual Deploy → Deploy a specific commit**. Confirm `/livez` revision and `/health`. No automatic schema downgrade: assess compatibility first, use a forward fix if the old code cannot read the current schema. Backups/restores are separate operator procedures, not a free-plan promise.
3. Vercel → project → **Deployments** → select the known-good production deployment → **Promote to Production / Instant Rollback** where offered. If unavailable, redeploy the known-good Git commit. Restore matching environment settings and callback/CORS origins.
4. Set short-link copy base back to direct API if the proxy fails. Rebuild Vercel; public env settings are embedded at build time.
5. Run the manual Deploy check with the rolled-back SHA as `SMOKE_EXPECTED_REVISION`; re-enable deployment only after smoke and database hardening checks pass.

## Rotate secrets without committing them

| Secret | Rotation procedure |
|---|---|
| PostgreSQL password | Supabase project database settings → reset password; immediately update Render DATABASE_URL and the operator audit DSN; redeploy, verify health. Expect reconnect disruption unless you stage a separate DB role first. |
| Key Value internal authentication | Internal connections are unauthenticated by default. If enabled, rotate via the instance authentication settings, confirm the Blueprint connectionString reference supplies the new credentials, redeploy the API and verify consumers. Never expose the instance externally to rotate credentials; a restart loses free-instance data. |
| Turnstile secret | Widget settings → rotate/regenerate secret; update Render and Supabase CAPTCHA promptly, redeploy Render and verify reports/signup. If replacing the widget also update the public site key and rebuild Vercel. |
| Synthetic/application API key | Verified owner creates a replacement with the same minimal scopes, update GitHub secret, run smoke, revoke old key through the app. On compromise revoke first. |
| Render deploy hook | Service Settings → Regenerate Hook; replace GitHub secret. The old hook must stop working. |
| Grafana OTLP token | Access Policies → create scoped replacement, update Render header, redeploy/test traces, delete old token. Never put it in the frontend. |
| Google/GitHub OAuth client secret | Rotate in the provider console, update that provider in Supabase, verify a fresh login, revoke old secret. Existing browser sessions may outlive the rotation. |
| Supabase signing key | JWT Keys → create standby asymmetric key → rotate active key → allow session/JWKS transition or revoke immediately after compromise. Backend caches JWKS for its configured TTL; restart it for immediate cache removal. Revoke old key explicitly when ready. |
| Supabase legacy anon/service-role/JWT secret | Do not assume independent legacy rotation. Migrate to publishable keys/asymmetric signing following current Supabase guidance, update backend/frontend public keys and redeploy, then revoke legacy keys. This app needs no service-role key. |
| Optional LLM credentials | Not present in this baseline. If you later enable a free provider, replace its key in Render only, verify the budget, revoke the old key at the provider. |
| Hosting/GitHub personal access tokens | None required. Review/revoke provider GitHub-App authorizations in account settings if compromised; reconnect with least privileges. |

Public URLs, Turnstile site keys and Supabase publishable keys are not private bearer credentials, but updates must still be coordinated across builds/allowlists. Auth access tokens expire; use account sign-out/global sign-out for refresh-session revocation, and suspension for immediate application denial. [Supabase rotation guidance](https://supabase.com/kb/troubleshooting/rotating-anon-service-and-jwt-secrets-1Jq6yd).

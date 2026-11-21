# Public pages verification — step 15.12c

## Scope and evidence

Branch: `step-15-12c-public-pages`. Public routes opt into v2 through one wrapper. Existing protected pages, the API client, proxy/CSP, dependencies and backend are unchanged. The root layout only suppresses its old footer on the ten opted-in routes; AppShell similarly delegates their chrome.

The operator reports the hosted product is live. This change did not contact or verify Render, Vercel, Supabase or a hosted API reference. The documentation page therefore links to repository API changes. Plan limits are documented configuration defaults, not a live quota reading. MCP global-review limitations are explicit. No video, customer, certification, performance or uptime claim is added.

## Page and claim inventory

Each row below is copied from the typed content module. The unit test checks file existence; existence alone does not prove a claim, so the limitations above and linked evidence still matter.

| Page | Claim | Evidence |
| --- | --- | --- |
| / | A short-link service with workspaces, API keys, click analytics and abuse review. Use the hosted app, or explore sample data in a one-click browser demo. | [docs/claims.md](../docs/claims.md) |
| / | Create links with optional aliases and expiry, then manage them within a workspace. Creation requires a verified user or a key owned by one. | [docs/trust-controls.md](../docs/trust-controls.md) |
| / | Clicks are processed asynchronously. Analytics can arrive after the redirect; they are not a guarantee of complete delivery. | [docs/claims.md](../docs/claims.md) |
| / | Scoped API keys support automation. The separate MCP server exposes tools over the API and blocks writes by default. | [docs/mcp.md](../docs/mcp.md) |
| / | The frontend runs on Vercel, the API on Render, and sign-in uses Supabase. Cold starts and provider quotas are part of this deployment. | [docs/hosting-runbook.md](../docs/hosting-runbook.md) |
| / | The /demo sandbox uses sample data in browser memory. It needs no API key, resets on reload and does not create real short links. | [docs/deployment-demo.md](../docs/deployment-demo.md) |
| /features | Link management, workspace permissions and review tools built around the same API. | [docs/security.md](../docs/security.md) |
| /features | Create a short link with an optional custom alias and future expiry. Soft deletion removes it from normal listings and prevents redirects. | [docs/api-changes.md](../docs/api-changes.md) |
| /features | Owner, admin, member and viewer roles control access. API-key scopes are constrained by the creator's permissions. | [docs/auth.md](../docs/auth.md) |
| /features | Per-code analytics expose click counts and timestamps. Queued processing can lag, and hosted free-tier restarts can lose pending events. | [docs/hosted-limits.md](../docs/hosted-limits.md) |
| /features | Heuristics flag suspicious patterns without fetching the destination page. Optional model assistance is bounded by configuration and budget; a flag is not proof of wrongdoing. | [docs/abuse-pipeline.md](../docs/abuse-pipeline.md) |
| /features | Warning pages, abuse reports and administrative review help control suspicious links. Malicious links are blocked. | [docs/trust-controls.md](../docs/trust-controls.md) |
| /docs | Use the repository documentation for API behavior, authentication and operating limits. | [docs/api-changes.md](../docs/api-changes.md) |
| /docs | POST /shorten creates a link. GET /urls lists visible links; DELETE /urls/{code} soft-deletes one. GET /analytics/{code} requires read access. | [app/api/routes.py](../app/api/routes.py) |
| /docs | Browser sessions use Supabase authentication. Programmatic clients send X-API-Key; requests must not send both an API key and a bearer token. | [docs/auth.md](../docs/auth.md) |
| /docs | The mcp-server directory contains an on-demand server that calls the API. Writes need explicit opt-in; some global review tools require human platform-admin authentication that the key-only transport does not support. | [docs/claims.md](../docs/claims.md) |
| /docs | make demo starts an isolated local stack with deterministic sample data. Local Kafka and Redis Streams profiles are distinct from the hosted single-process setup. | [docs/demo-script.md](../docs/demo-script.md) |
| /developers | Use an API key owned by an active, verified user. Keep the key private and request only the scopes your integration needs. | [docs/security.md](../docs/security.md) |
| /developers | Sign in, choose your workspace and open API keys. Create a key within your role's permissions and copy the secret once. List operations return metadata, not the secret. | [docs/auth.md](../docs/auth.md) |
| /developers | POST /shorten requires write permission and verified ownership. User and workspace creation caps apply to keys too; do not retry a timed-out creation blindly. | [docs/trust-controls.md](../docs/trust-controls.md) |
| /developers | Rate-limited requests return HTTP 429 with Retry-After. Other failures, including insufficient scope or plan limits, need their own handling. | [docs/api-changes.md](../docs/api-changes.md) |
| /developers | Set API_ORIGIN to the API origin configured for this deployment, not the frontend origin. Replace the placeholder key privately. The example creates a harmless destination link. | [app/api/routes.py](../app/api/routes.py) |
| /use-cases | Use the existing link, workspace and API controls for everyday sharing and automation. | [docs/design.md](../docs/design.md) |
| /use-cases | Choose an available alias for a documentation link and inspect its click history. Counts are coarse analytics, not a unique-person measurement. | [app/api/routes.py](../app/api/routes.py) |
| /use-cases | An expiry can stop a link redirecting after a chosen time. It does not remove the destination from the internet. | [docs/api-changes.md](../docs/api-changes.md) |
| /use-cases | Use a scoped API key for a script or configure the MCP server for on-demand tools. Keep write tools disabled until deliberately needed. | [docs/mcp.md](../docs/mcp.md) |
| /about | Relaymark combines a usable short-link interface with an inspectable implementation and documented limits. | [README.md](../README.md) |
| /about | Architecture decisions, tests, evaluation results and known limitations are maintained in the repository. | [docs/claims.md](../docs/claims.md) |
| /about | The hosted app uses real accounts and services. The separate /demo route is an in-memory sandbox; it does not use those services for its sample interactions. | [docs/deployment-demo.md](../docs/deployment-demo.md) |
| /changelog | This list records selected merged roadmap steps, not versioned releases or deployment dates. Step labels preserve the names used in the original branches. | [docs/adr/README.md](../docs/adr/README.md) |
| /security | Authentication, tenant permissions and abuse controls reduce risk. They do not establish a guarantee that every destination is safe. | [docs/threat-model.md](../docs/threat-model.md) |
| /security | The backend verifies tokens and derives workspace roles from membership. API keys carry scopes; cross-workspace access is restricted. | [docs/security.md](../docs/security.md) |
| /security | The public report flow uses a security check and creates a review item. It does not require an account. | [docs/trust-controls.md](../docs/trust-controls.md) |
| /security | Use the configured operator contact described in the security policy. Do not include private keys or session tokens in a public issue. | [SECURITY.md](../SECURITY.md) |
| /contact | For an abusive short link, the existing report flow is the preferred route. This page does not submit messages. | [frontend/app/abuse/page.tsx](../frontend/app/abuse/page.tsx) |
| /contact | Provide the short code and a concise explanation. Never send passwords, API keys or authentication tokens. Reports are reviewed; automated flags alone are not proof of wrongdoing. | [frontend/app/abuse/page.tsx](../frontend/app/abuse/page.tsx) |
| /pricing | Documented defaults: 20 links per user per day and 200 links per workspace; the operator can change these. | [app/core/config.py](../app/core/config.py) |
| /pricing | These are configuration defaults, not a live quota reading. The public status endpoint exposes kill switches, not plan caps. Check the API response when creating a link. | [app/api/routes.py](../app/api/routes.py) |
| /pricing | A daily creation cap can return 429; a workspace link cap can return 402. API-key creation counts against its verified owner's allowance. | [docs/trust-controls.md](../docs/trust-controls.md) |
| /pricing | Free-tier sleep, memory, storage and provider quotas affect this deployment. Cold starts can delay the first request; pending hosted events can be lost on a restart. | [docs/hosted-limits.md](../docs/hosted-limits.md) |
| /pricing | Planned, not available. There are no purchase or upgrade controls here. | [docs/design-port-plan.md](../docs/design-port-plan.md) |
| / — architecture caption | This diagram shows the local stack, including Kafka and separate workers. The hosted profile uses Redis Streams and runs the consumers in the API process. | [docs/hosted-profile.md](../docs/hosted-profile.md) |
| /contact — missing mailbox | The operator has not configured an abuse mailbox yet. Public launch is not ready until this contact is set. | [frontend/app/abuse/page.tsx](../frontend/app/abuse/page.tsx) |

## Changelog provenance

Selected actual merge commits, not release or deployment dates. Each PR number and date was checked against local Git history.

| Step | PR | Merge date | Commit |
| --- | --- | --- | --- |
| 15.12b | #83 | 2026-11-20 | `beca030d785f418ab836edaae3c3c3055d2ddec4` |
| 15.12a | #82 | 2026-11-19 | `6061947e6eaf36ca2f0477bceb123e006d2ccff6` |
| 15.8 | #81 | 2026-11-17 | `a46e373597b47eeb255d7698083b120e7b4f6a22` |
| 15.7 | #80 | 2026-11-16 | `4d58fb35cc5815d7b07981acd95704063f6b49fb` |
| 15.6b | #79 | 2026-11-13 | `41208e7cd128ef9e959b37a22bf9c27ef4161fbf` |
| 15.6a | #77 | 2026-11-13 | `ffc1da681b36fed3d757d2f1b7bc23d813eab9d5` |
| 15.5 | #76 | 2026-11-12 | `312e52fdcb550077b32eb2f82852b2394400a0f6` |
| 15.1 | #75 | 2026-11-12 | `b9a54ef3f68256d60e323652279637c56886dccf` |
| 15.4 | #74 | 2026-11-06 | `4bbe55c41a2297999129e0042709ed18d03d9ce8` |
| 15.3a | #73 | 2026-11-05 | `1a3ab952a43ae937b0b0b1a07d65c48721e04f93` |
| 15.2 | #72 | 2026-11-04 | `78887dd9eb7f06695a16330e05ecaccc5c12a17d` |
| 15.1 | #70 | 2026-11-04 | `379b6069947d800848e486717a523713d4f511f3` |

## Checks run (2026-11-20)

Node 22.23.4, macOS, local Chromium and the existing fake identity provider. Builds and browser checks used an isolated `/private/tmp/public-new/frontend` copy with fixture environment values, the repository backend on `PYTHONPATH`, and no real environment files. No production service was contacted. The Playwright startup requires permission to bind local ports; the initial sandbox invocation failed before tests, then the permitted invocation passed.

| Command / check | Result |
| --- | --- |
| `npm run lint` | Exit 0, no findings |
| `npx tsc --noEmit` | Exit 0, no diagnostics |
| `npm test` | Exit 0, 33 passed |
| `make frontend-check` | Exit 0: clean npm install, lint, 33 unit tests, TypeScript |
| `npm run build` | Initial exit 1 from existing Next.js security advisory; unchanged retry exit 0 |
| `npx playwright test e2e/public.spec.ts e2e/auth.spec.ts e2e/demo.spec.ts e2e/shell.spec.ts --reporter=list` | Exit 0, 34 passed (25.6s) |
| Golden screenshots from unchanged HEAD | Exit 0, 4 tests; eight demo/privacy images |
| `git diff --check` | Exit 0 |

Actual output excerpts:

```text
> eslint . --max-warnings=0 --max-warnings=0
# tests 33
# pass 33
# fail 0
cd frontend && ./node_modules/.bin/tsc --noEmit --incremental false

34 passed (25.6s)
```

Complete local records for this session: `/tmp/public-frontend-check.log`, `/tmp/public-final-lint.log`, `/tmp/public-final-types.log`, `/tmp/public-build-final.log`, `/tmp/public-build-final-retry.log`, `/tmp/public-browser-final.log` and `/tmp/public-built-unit-final.log`. These temporary logs are not committed artifacts.

The first browser run had four failures because Next normalizes the root canonical URL without a trailing slash. The corrected test compares normalized URLs; no production workaround was needed. All ten routes pass desktop/mobile light/dark axe checks, keyboard skip-link focus, single-h1, canonical/title and nonce checks. No third-party font/image/style request was observed. The source/build scan rejects the requested prototype strings. AppShell's existing auth tests still verify the signed-in header and sign-out behavior.

The demo/privacy visual baselines were captured from unchanged HEAD, not accepted from the new implementation. Only the dynamic service-status badge is masked, with 1% pixel tolerance for rendering variation. These passed locally; Linux CI rendering has not been verified. Existing demo functional tests pass; privacy has no new interactive behavior. Protected route source files, API client, proxy, package manifests and locks were compared with HEAD and are unchanged.

## Limits and manual follow-up

- The installed Next.js 16.4.3 build reports a security advisory. A successful retry does not remediate it. Dependency upgrades are outside this no-dependency-change step and remain necessary separately.
- The hosted API reference was not checked, so no live reference URL is claimed. The configured public API origin is shown on `/developers`; the curl example uses `API_ORIGIN` and a placeholder key, never a credential.
- The configured mailbox branch reuses `/abuse`'s server setting; only its missing-mailbox rendering was exercised in the fixture environment. No email was sent.
- Local-auth link selection remains in code; browser tests here use the fake Supabase fixture, not a separate local-auth build.
- Automated evidence-file existence is not proof of hosted availability or operational performance. Changelog merge history is not deployment history.
- Backend/MCP, integration, Kubernetes and live checks were not run: this change has no backend, infrastructure, dependency or API-client modifications.
- No commit, push or deployment was performed.

# Frontend auth verification — step 15.4

Verified locally on 2026-11-05, branch `step-15-4-frontend-auth`.
Supabase packages are locked: `@supabase/ssr` 0.12.7 and
`@supabase/supabase-js` 2.119.0. No real key/token or provider request was used.

## Evidence by requirement

| Requirement | Implementation and checks |
|---|---|
| OAuth/email forms, PKCE, account UI | `components/AuthForm.tsx`, `app/auth/callback/route.ts`, `app/account/page.tsx`; `e2e/auth.spec.ts` covers PKCE, signup/recovery CAPTCHA forwarding, password update, account accessibility and sign-out scopes |
| Protection and safe return paths | `proxy.ts`, `lib/auth/redirect.ts`; browser redirect/expired-session tests and `tests/security.test.cjs` hostile-return-path cases |
| Cookie sessions, refresh, errors and workspace header | `lib/auth/browser.ts`, `lib/api.ts`; `tests/auth-session.test.cjs` refresh single-flight and HTTP error matrix, `tests/api.test.cjs` header and LocalAuth tests |
| Keys UI | `app/app/keys/page.tsx` calls existing endpoints, keeps creation secret in component memory; backend scope/revocation/secret tests remain in `tests/test_auth_alignment.py` |
| Route-scoped sample adapter | `lib/api.ts`, `app/demo/[[...path]]/page.tsx`; `e2e/demo.spec.ts` verifies sample mutations and no API traffic |
| Workspace switcher/onboarding | `components/WorkspaceSwitcher.tsx`, `Onboarding.tsx`; browser switches Personal to Team, old content disappears; checklist is view-local |
| Nonces and accessibility | `proxy.ts`, layout/provider nonce forwarding; axe on login/signup/forgot/reset/account and existing shell/gallery tests |
| Backend contract gaps | `tests/test_frontend_auth_contract.py` initially failed three tests; GET /workspaces membership enumeration and DELETE /me implemented narrowly. Four contract tests now cover membership isolation, deletion, last-owner rejection, API-key/unverified-human rejection |
| Documentation | `frontend.md`, `deployment-demo.md`, ADR 0039, auth/API/claims updates |

## Actual passing output excerpts

All final commands below exited 0:

```text
make check
Success: no issues found in 80 source files
566 passed, 30 deselected, 6 warnings in 61.48s
Checking rules/slo.yml
  SUCCESS: 22 rules found
  SUCCESS

make frontend-check
# pass 18
# fail 0
cd frontend && ./node_modules/.bin/tsc --noEmit --incremental false

npm test (after the SDK scanner regression test was added)
# tests 19
# pass 19
# fail 0

npm run build
ƒ Proxy (Middleware)
ƒ (Dynamic) server-rendered on demand

npm run test:e2e
18 passed (8.6s)

npm run check:demo-build (credential-free public build)
Demo artifact privacy check: PASS (41 public artifacts; known key patterns,
private URLs except documented Supabase SDK default, environment credential values)

make mcp-test
Success: no issues found in 14 source files
35 passed in 1.65s
```

Backend Black/isort/Flake8 passed. Frontend ESLint passed. `actionlint
.github/workflows/ci.yml` passed without output. The public build and test-provider
build are separate: loopback URLs intentionally exist in the latter and it is not
the artifact scanned for deployment. See frontend.md for exact fixture environment.
The SDK's unused localhost:9999 default is an explicit exact-match scanner exception;
other private URLs and credentials remain failures.

## Failures found and resolved

- Three initial backend contract failures proved missing workspace enumeration and
  account deletion. No unrelated backend endpoint was renamed.
- ESLint found a redundant effect state update and navigation warnings; corrected.
- Browser tests exposed loopback-host normalization during redirect, a fixture
  connection-backlog issue, invalid relative proxy redirects and CAPTCHA labeling.
  Corrected implementation/fixture contracts and reran the whole browser suite.
- Expiry simulation initially raced requests on the old page. It now closes that
  page before installing a signed expired cookie session, then verifies rejection.
- Artifact scan found the bundled SDK fallback described above, not an application
  endpoint or private credential. The narrow exception has a regression test.

## Not established by these checks

Live GitHub/Google consent, Supabase email delivery, real Turnstile validation,
production Supabase configuration and Vercel deployment require operator testing.
No real-provider test, Docker demo deployment or PostgreSQL integration run was
performed in this step. Existing unit/contract tests use SQLite and fakes.

Account deletion deactivates Relaymark only, retains shared links and the external
identity, and refuses deletion of a last owner. It is not full data erasure.
Global sign-out revokes refresh sessions, not already-issued JWTs. SSR cookies are
JavaScript-readable; LocalAuth remains an explicit in-memory local exception.
Installed dependencies reported eight moderate advisories; no claim of zero
vulnerabilities is made. No audit suppression or forced dependency upgrade was added.

## Follow-up: unavailable identity must not mean unverified email

A local browser preflight from http://127.0.0.1:3000 returned 400 / Disallowed CORS
origin. The running API still allowed only localhost:3000, although the updated
Compose configuration included both. Recreating only api-redis loaded the new
configuration; the same preflight returned 200 with the exact allow-origin header,
and /health returned 200. No credentials or verification flags were changed.

Account now distinguishes loading/unavailable identity from a successful false
email_verified result. A Playwright regression aborts /me after successful login
and asserts unavailable status, never "Email not verified".

Follow-up checks, exit 0: ESLint, TypeScript, 19 frontend unit tests, isolated Next
build and all 19 Playwright tests (`19 passed (11.3s)`). The first isolated build
could not use an external node_modules symlink due to Turbopack's filesystem
boundary; copying dependencies into the isolated tree resolved this. No private
env files were copied and the user's active development build was left untouched.

## Follow-up: session-aware header and profile names

Replaced the unconditional public Sign in link with a cookie-session-aware account
link, including auth-state updates and display_name/full_name/name fallbacks. The
Account form uses the same presentation-only resolver. Added unit coverage for
field priority/invalid values and a browser regression covering signed-out landing,
login, logo navigation, reload, Account display name, and sign-out.

Checks exited 0: ESLint, TypeScript, 20 unit tests, isolated Next build and full
Playwright suite (`20 passed (10.0s)`). No live provider calls or private env files
were used in the isolated verification, and the active development server was not
restarted. Backend code was unchanged; backend/MCP gates were not rerun for this
frontend-only follow-up.

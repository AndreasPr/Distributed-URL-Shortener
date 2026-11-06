# Frontend authentication

Relaymark uses Next.js 16 `proxy.ts`, the existing design system and Supabase SSR.
The landing page is public; sample data lives only under `/demo` (including nested
links, analytics and review pages). `NEXT_PUBLIC_DEMO_MODE` no longer selects a
client for the whole site. `/dashboard`, `/analytics`, `/flagged`, `/account`,
`/app/keys`, settings and health require authentication. `/api-keys` redirects to
`/app/keys`. The browser API-key input has been removed.

## Configuration

Copy `frontend/.env.example` only if `.env.local` does not exist. Preserve existing
values. Restart/rebuild Next after changes; public variables are compiled into JS.

| Variable | Purpose |
|---|---|
| NEXT_PUBLIC_API_URL | Browser-reachable backend origin; must be allowed by backend CORS. Empty uses same origin. |
| NEXT_PUBLIC_SUPABASE_URL | Project HTTPS origin (same project as backend). |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Public publishable/anon key; never service-role credentials. |
| NEXT_PUBLIC_EMAIL_AUTH | `true` shows email/password forms; otherwise OAuth only. |
| NEXT_PUBLIC_TURNSTILE_SITE_KEY | Public Turnstile site key. Required for signup/recovery UI. |
| NEXT_PUBLIC_LOCAL_AUTH | LocalAuth provider; retains in-memory, single-flight owner login for isolated `make demo`. Never enable on a hosted deployment. |

Only the project URL, public anon/publishable key and Turnstile site key are auth
configuration suitable for NEXT_PUBLIC. API URLs and feature flags are public
non-secret configuration. Never put backend keys, service-role keys or tokens there.

In Supabase enable GitHub/Google providers, configure their callback with Supabase,
and allow your frontend `/auth/callback` URL. Enable Turnstile protection in
Supabase's Auth settings and supply its secret **there**, not in this repository.
Configure the site hostname in Turnstile. Email signup/reset require the provider's
email delivery settings. No real provider is contacted by CI.

## Flows and security

`/login` and `/signup` offer GitHub and Google. OAuth and email confirmation/recovery
use PKCE with `/auth/callback`; the verifier and sessions use `@supabase/ssr`
cookies. `next` is restricted to safe relative paths. Callback redirects are relative; proxy redirects preserve the request Host without
trusting forwarded host headers.
Proxy validates users with Supabase `getUser`, refreshes cookies and preserves
Set-Cookie on redirects. It does not authorize backend operations: the API still
verifies JWTs and database permissions. Cookie state is never cached publicly.

Tokens are not persisted in localStorage or sessionStorage. SSR cookies are
JavaScript-accessible because the browser attaches access tokens to API calls;
they are not HttpOnly. The browser SDK handles refresh, with a shared pre-expiry
refresh promise in the API client. Invalid API sessions sign out and navigate to
login. Global sign-out revokes refresh sessions; existing access tokens can remain
valid until expiry. LocalAuth intentionally keeps only a short-lived token in
memory and automatically logs in; it is not a hosted authentication mode.

Proxy generates a fresh script nonce for each response. Layout/theme/Turnstile use
it, and pages render dynamically. CSP denies frames embedding the app, restricts
script execution and allows the configured API/Supabase and Turnstile origins.
Styles retain `unsafe-inline` for Radix/chart styling; production scripts do not.
Referrer policy is no-referrer. External links do not grant opener access.

Workspace choice stays in tab memory and uses `X-Workspace-ID`. Switching clears
page state; the backend rejects unauthorized membership. `/workspaces` now lists
all of a human's memberships (keys still see only their own workspace).
The first-run checklist tracks create/copy actions in the current mounted view.

`/account` displays membership/verification and lets Supabase users update their
non-authoritative display name, sign out locally/globally, and request application
account deletion with typed DELETE. `DELETE /me` tombstones the application user,
revokes their keys and removes memberships transactionally. Last-owner deletion
returns 409: transfer ownership first. Shared content is retained. This is **not**
a Supabase identity deletion or a complete data-erasure workflow; the admin
Supabase API would require credentials excluded from this project.

Programmatic keys use the existing `/api-keys` endpoints. Creation secrets are
shown once in component memory, with copy/dismiss controls. Lists contain metadata
only. Global review remains platform-admin-only and can legitimately return 403.

## Verification

Use Node 22.13+ and the root Python environment described in the developer guide:

```bash
cd frontend
npm ci
npm run lint
npm test
npm run build
```

For deterministic browser tests, override local private settings with these fixture
values for **both build and test** in the same shell:

```bash
export NEXT_PUBLIC_LOCAL_AUTH=false
export NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:3199
export NEXT_PUBLIC_SUPABASE_ANON_KEY=fixture-public-anon
export NEXT_PUBLIC_API_URL=http://127.0.0.1:3199
export NEXT_PUBLIC_EMAIL_AUTH=true
export NEXT_PUBLIC_TURNSTILE_SITE_KEY=fixture-site-key
npm run build
npx playwright install chromium
npm run test:e2e
```

Playwright launches a loopback fake GoTrue/API server using the existing backend
RSA signing-key helper, validates PKCE challenges, and mocks Turnstile's script.
It tests redirects, cookies, expiry, workspace switching, permission/rate messages,
sign-out, signup/recovery and axe accessibility. It does not establish live OAuth,
email delivery, real CAPTCHA validation, provider uptime or production deployment.
Use a fresh shell afterward to discard fixture environment overrides.

Public-artifact scanning retains secret/private-address checks with one exact SDK
exception: `@supabase/auth-js` embeds its unused `http://localhost:9999` default.
The browser client rejects missing project configuration and always supplies an
explicit URL, so this is not an application endpoint. Other private addresses and
credential values still fail the gate; the exception has regression tests.

## Login succeeds, but workspace loading fails

Supabase login can succeed even if the separate backend API is unreachable. Check
its CORS preflight for the exact browser origin (`localhost` and `127.0.0.1` differ).
Editing the root `.env` does not update an existing container. After checking
Compose's effective configuration, recreate only the API, for example:

```bash
docker compose --profile redis-streams up -d --no-deps --force-recreate api-redis
```

The Account page displays verification as unknown while `/me` loads, and unavailable
if that request fails. Only a successful `/me` response with `email_verified=false`
is evidence for the “Email not verified” label. No verification flag is changed to
work around network errors.

The public and workspace headers reflect the current Supabase session. Signed-in
users see their display name linked to Account; signed-out users see Sign in.
Profile rendering prefers `display_name`, then OAuth `full_name`/`name`, and falls
back to “My account.” The Account form uses the same field order. Auth-state events
update the header after sign-out/profile changes. Names are presentation only and
never affect authorization; /demo does not initialize this session component.

Google OAuth explicitly sends `prompt=select_account` so each new Google sign-in
requests an account chooser, even when the browser retains its Google session.
Relaymark sign-out does not sign out of Google itself. GitHub's OAuth parameters
are unchanged. This is Google's [documented account-selection parameter](https://developers.google.com/identity/openid-connect/openid-connect).

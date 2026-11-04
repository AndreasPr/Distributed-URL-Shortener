# Authentication

`AUTH_MODE=apikey_only` is the default and preserves API-key clients. All modes
accept `X-API-Key`. A request containing both that header and `Authorization`
returns 400. Bad bearer credentials return 401 with `WWW-Authenticate: Bearer`
and the same `Invalid credentials` body; failure categories appear only in
`auth_failure_total{reason}`. Successful authentication increments
`auth_success_total`. Neither metric contains identity/token labels.

## Supabase

Set `AUTH_MODE=supabase`, `SUPABASE_URL=https://<project-ref>.supabase.co` and
`SUPABASE_JWT_AUDIENCE=authenticated`. Use asymmetric signing keys in your
Supabase project. No Supabase service-role key is needed by this API.

The [official JWT documentation](https://supabase.com/docs/guides/auth/jwts)
and [OAuth flow documentation](https://supabase.com/docs/guides/auth/oauth-server/oauth-flows)
specify issuer `<project URL>/auth/v1` and JWKS
`<project URL>/auth/v1/.well-known/jwks.json` (checked November 4, 2026).
The API derives both from its trusted configuration, never from token headers.

`SUPABASE_JWT_ALGORITHMS=RS256,ES256` is the default allowlist. Signature, issuer,
audience, expiry and UUID subject are required; `nbf` and `iat` are validated
when present. `none` and symmetric algorithms are rejected. Only explicitly
setting `SUPABASE_LEGACY_JWT_SECRET` enables legacy HS256; do not set it for
asymmetric projects. Keep any legacy secret outside Git. HS256 never uses JWKS
public keys as its secret.

Keys are cached per API process for `JWKS_CACHE_TTL=600` seconds. Unknown key IDs
trigger refresh, subject to `JWKS_REFRESH_INTERVAL=10` seconds between attempts,
including failures. Requests have 2-second connect/3-second read timeouts,
no redirects, and bounded response/key counts. Concurrent refreshes are serialized.
Expired caches fail closed if refresh is unavailable; known unexpired cached keys
continue working. Rotation can briefly reject a new key during the refresh cooldown.
Removed keys can remain accepted until cache expiry; already issued tokens otherwise
remain valid until expiry unless the local user is suspended/deleted.

First login inserts `users.id = sub`, a personal workspace and owner membership in
one transaction. PostgreSQL conflict handling and a row lock serialize concurrent
first logins. No token role or mutable user metadata grants authority. Subsequent
requests read the current membership and suspension/deletion state from PostgreSQL.
Email is informational and `email_verified` is conservatively false until a separate
trusted synchronization is implemented. No account linking by email occurs.

`X-Workspace-ID` optionally selects a workspace for a bearer request; membership
is required. Otherwise the personal workspace is preferred, with a deterministic
membership fallback. An API key always remains bound to its own workspace.
Tenant-resource lookups still return 404 outside that workspace.

```mermaid
sequenceDiagram
  participant Browser
  participant Supabase
  participant API
  participant DB as PostgreSQL
  Browser->>Supabase: Start OAuth login with PKCE challenge
  Supabase-->>Browser: Authorization code after login
  Browser->>Supabase: Exchange code + PKCE verifier
  Supabase-->>Browser: Access token (and refresh session)
  Browser->>API: Authorization Bearer access token
  API->>Supabase: JWKS fetch on bounded cache miss
  API->>API: Verify signature, issuer, audience, exp, nbf
  API->>DB: Atomic first-login provisioning; load membership
  DB-->>API: User status and database role
  API-->>Browser: Workspace-scoped response
```

The diagram describes how an OAuth client integrates with this verifier. A complete
Supabase browser login/refresh UI is **future**; this change implements backend
verification and the local demo client, not an OAuth authorization server.

## Local demo

`make demo` explicitly sets `AUTH_MODE=local` and `ENVIRONMENT=development` in its
isolated Compose project. The frontend build uses `NEXT_PUBLIC_LOCAL_AUTH=true`
to automatically request the owner token before protected requests. Tokens remain
in memory, expire after 15 minutes, and are renewed shortly before expiry.
`make demo-down` removes the isolated demo state.

- `GET /auth/dev-users` seeds/lists `owner` and `viewer` (reserved UUIDs).
- `POST /auth/dev-login` with `{"user":"owner"}` or `{"user":"viewer"}` returns
  `access_token`, `token_type` and `expires_in`.
- Both users share the legacy workspace containing the deterministic demo fixtures.
- Endpoints return 404 outside local mode. Startup refuses local mode in production.
- Local tokens use an ephemeral RSA key, separate issuer/audience and a fixed RS256
  verifier; API restart invalidates them; reload the browser after restarting the API. Local
  mode is single-process only.

Local login intentionally has no password: anyone who can reach it can become the
demo owner. Use only isolated loopback-bound demo infrastructure, never a shared
service. The production guard is defense in depth, not network isolation.

## Verification

`pytest tests/test_jwt_auth.py` exercises fake JWKS, locally generated keys, attack
cases, key rotation, generic errors, disabled users and local gates without external
services. `make test-integration` includes concurrent first-login provisioning
against disposable PostgreSQL. `make frontend-check` tests the in-memory bearer
client and single-flight demo login. `make check` retains existing API-key tests.

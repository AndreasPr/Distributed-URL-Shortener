# Authentication and trusted authorization

Human Principals are implemented. Historical branch/PR labels `15.1 users-workspaces`
(PR #70) and `15.2 jwt-auth` (PR #72) correspond to roadmap **15.2 tenancy and
permissions** and **15.3 JWT authentication**. This alignment adds guards; it does
not rewrite those steps. The browser Supabase login/refresh UI is implemented in step 15.4; see [frontend](frontend.md). Live-provider deployment remains unverified.

## Configuration

| Variable | Meaning / default |
| --- | --- |
| `AUTH_MODE` | `apikey_only` in development by default; `supabase` or `local` opt-in. Production requires `supabase`. API keys remain accepted in Supabase mode. |
| `SUPABASE_URL` | HTTPS project origin, e.g. `https://<project-ref>.supabase.co`; required in Supabase mode. No path, credentials, query or fragment. |
| `SUPABASE_ANON_KEY` | Environment-only project publishable/anon key for the authenticated user endpoint; never a service-role key. Missing configuration leaves newly provisioned humans unverified. |
| `SUPABASE_JWT_AUDIENCE` | `authenticated`. |
| `PLATFORM_ADMIN_EMAILS` | Comma-separated emails, normalized to lowercase; empty by default. Only a stored verified email grants platform admin. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project origin for the SSR browser login UI. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public/publishable key for the SSR browser UI. Never put a service-role key here. |
| `NEXT_PUBLIC_LOCAL_AUTH` | `false` normally; isolated demo build sets `true` for automatic owner login. |
| `LOCAL_AUTH_I_UNDERSTAND` | `false`. Explicit acknowledgement required for local auth on a non-loopback or uninspectable listener. Never bypasses the production guard. |
| `SUPABASE_JWT_ALGORITHMS` | `RS256,ES256`; asymmetric allowlist. |
| `SUPABASE_LEGACY_JWT_SECRET` | Empty; only an explicit value enables legacy HS256. Never uses a JWKS public key as the HMAC secret. |
| `JWKS_CACHE_TTL` / `JWKS_REFRESH_INTERVAL` | 600 / 10 seconds, per process; failed refresh attempts also consume the cooldown. |
| `AUTH_IP_RATE_CAPACITY` / `AUTH_IP_RATE_REFILL` | 60 tokens / 1 token per second, per IP and auth route. |

Examples contain no real keys. Existing production deployments must configure
Supabase before restarting: `apikey_only` now fails startup in production. The
undeployed AWS Terraform design still needs this deployment configuration supplied.

## Token verification

`Authorization: Bearer <jwt>` and `X-API-Key` are mutually exclusive (400 if both
headers are present). Invalid bearer tokens, including `is_anonymous=true`, return
the same 401 `Invalid credentials` detail with `WWW-Authenticate: Bearer`.
Signature, issuer, audience, expiry and UUID subject are required; `nbf`/`iat` are
validated when present. `none` is rejected. Roles and platform-admin status are
never obtained from token role claims or mutable `user_metadata`.

The [official JWT docs](https://supabase.com/docs/guides/auth/jwts) specify issuer
`<project URL>/auth/v1` and JWKS
`<project URL>/auth/v1/.well-known/jwks.json`. The URL is derived only from settings.
Keys have bounded caches, a refresh cooldown, 2-second connect/3-second read
timeouts, no redirects and a 64 KiB response cap. An expired cache needing an
unavailable refresh fails closed; known unexpired keys remain usable. Removed keys
can remain accepted until cache expiry; rotations may hit the short cooldown.

## Trusted email verification

On first authenticated Supabase login, and no more than once per hour per user,
call `GET <SUPABASE_URL>/auth/v1/user` with `apikey: <SUPABASE_ANON_KEY>` and
`Authorization: Bearer <user token>`. The authoritative fields are `id`, `email`
and `email_confirmed_at`, documented in [Supabase users](https://supabase.com/docs/guides/auth/users)
and [the authenticated user endpoint](https://supabase.com/docs/reference/self-hosting-auth/get-information-for-the-logged-in-user).
The [getUser documentation](https://supabase.com/docs/reference/javascript/auth-getuser)
explains why a server response is suitable for authorization. Checked November 2026.

The response subject must match the verified token subject. A non-null, valid
confirmation timestamp sets `users.email_verified=true`; null sets false. Email
comes from that same trusted response. Token email verification claims and
`user_metadata` never set the flag. HTTP has a 2-second connect/read timeout, no
redirects and a 64 KiB cap. No request headers or response bodies are logged.

A row lock and `users.email_verification_checked_at` serialize and persist attempts
across replicas before making the outbound call, including failed attempts. First
user/personal-workspace/owner provisioning remains atomic. Concurrent requests may
see the previous verification state while the single refresh is in flight.
Failures keep the previous value. Consequently confirmation can take up to an hour
to appear; a previously verified address can remain trusted longer during an outage.
There is no linking or invitation acceptance based on email alone.

Every protected POST/PUT/PATCH/DELETE calls `require_verified_user`: unverified
humans receive 403 with `detail.code=email_unverified`. They can authenticate and
read `/me` and other role-authorized read endpoints. API keys are unaffected by this
email gate. Local `/auth/dev-login` is the explicit unauthenticated bootstrap
exception, restricted to local mode and IP-limited. Seeded local users are verified.

## Workspace and platform authority

The current database membership determines each human's role. `X-Workspace-ID`
selects only an existing membership; otherwise the personal workspace is preferred.
API keys cannot switch workspaces. Tenant-resource lookups return 404 outside the
selected workspace; a caller without an operation's permission receives 403.

`/admin/flagged`, `/admin/flagged/{code}/review` and `/admin/activity/{code}` are now
**global platform operations**, requiring a verified human whose stored email is in
`PLATFORM_ADMIN_EMAILS`. Workspace admin/owner status and admin API keys are not
sufficient. These are explicit global-query exceptions; the activity/review code
resolves the target workspace after platform authorization. `/admin/keys` remains
a workspace-scoped alias. There is no new workspace review endpoint in this step.

Key creation remains workspace-admin/owner-only. Requested scopes are checked
against the creator's stored membership. Delegated keys retain the original human
creator. Removal revokes that human's keys in the same workspace transaction;
demotion makes oversized keys invalid at authentication. Secrets appear only in
the creation response; lists never return secrets or hashes.

Write buckets use route template plus `user:<uuid>:ip:<address>` or
`key:<id>:ip:<address>`. `/me` and `/auth/dev-login` also have pre-authentication,
per-IP buckets. Untrusted forwarded headers cannot change the socket identity.
Redis outages fail closed with 503 for writes/auth routes; redirects still fail open.

`auth_success_total`, `auth_failure_total{reason}` and
`auth_email_verification_total{result}` expose counts without identity/token labels.
Email results are `confirmed`, `unconfirmed`, `failed` or `unconfigured`.

```mermaid
sequenceDiagram
  participant Browser
  participant Supabase
  participant API
  participant DB as PostgreSQL
  Browser->>Supabase: OAuth PKCE login and code exchange (browser UI)
  Supabase-->>Browser: User access token
  Browser->>API: Bearer token, optional workspace selector
  API->>API: Verify signature/claims; reject anonymous session
  API->>DB: Atomically provision identity/workspace; lock and claim hourly email check
  opt First login or hourly refresh due
    API->>Supabase: GET /auth/v1/user with apikey and user bearer
    Supabase-->>API: id, email, email_confirmed_at
    API->>DB: Save trusted state; preserve previous value on failure
  end
  API->>DB: Load current membership and user status
  API->>API: Verified-human write gate; platform allowlist if required
  API-->>Browser: Authorized response or generic authentication failure
```

## Local mode and database boundary

`make demo` opts into local auth, allowlists `owner@example.test` and explicitly
acknowledges the container's non-loopback listener; its published ports stay on
127.0.0.1. Owner/viewer tokens last 15 minutes and remain only in browser memory.
The ephemeral RSA key is process-local: reload the browser after an API restart.
`make demo-down` removes the isolated credentials, containers and volumes.

Without acknowledgement, only a recognized Uvicorn CLI listener bound to a numeric
loopback address is accepted (default 127.0.0.1). Wildcard hosts, file-descriptor
listeners and uninspectable programmatic/custom servers fail closed. Allowed local
startup always logs a CRITICAL warning: anyone reaching this mode can become owner.

Migrate to `0008` before starting. `0007` adds the hourly-check timestamp. `0008`
is an ACL no-op on plain Postgres without `anon`/`authenticated`. When those roles
exist, it revokes their application table/owned-sequence and non-extension
application-schema routine privileges. PUBLIC grants are also removed because
PostgreSQL has no deny ACL overriding inherited PUBLIC access. Global and schema
object defaults are revoked for the migration creator role. Additional object
creator roles/inherited grants require operator review. Downgrade deliberately does
not regrant privileges. Existing RLS remains enabled with no policies; the trusted
backend owner role still bypasses RLS, so application tenancy checks remain required.

See [auth alignment verification](auth-alignment-verification.md) for each gap's
tests. Live Supabase account verification and browser PKCE integration are not
established by fake-server/unit tests. The API-key-only MCP transport currently
cannot invoke the platform-only review/activity endpoints.

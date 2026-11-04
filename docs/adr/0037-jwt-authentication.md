# 0037: JWT authentication alongside workspace API keys

## Context

Workspaces already have users and permissions, but only API keys could create a
Principal. Supabase subjects are UUID user IDs; token role claims must not bypass
workspace membership. Local demonstrations must work without cloud credentials.

## Decision

Keep apikey_only as the default. Verify Supabase RS256/ES256 JWTs with a bounded,
rate-limited JWKS cache; legacy HS256 is a separate explicit secret opt-in. Resolve
roles from PostgreSQL on every authenticated request and provision the first user's
personal workspace atomically. Reject ambiguous bearer plus key credentials.

Provide explicit local-only demo endpoints with ephemeral RSA-signed tokens and
seeded owner/viewer memberships. The isolated demo frontend obtains tokens on demand
and retains them only in memory. Refuse local mode in production.

## Consequences

Existing API-key clients remain valid. Database availability is required for user
authentication and current permission checks. JWKS caching trades revocation speed
for availability; rotation can briefly fail during the refresh cooldown. Local
keys do not work across processes or restarts. Full Supabase browser PKCE/session
management is future; no user passwords or service-role credentials are introduced.

Alternatives: trusting role claims would allow stale/excess authority; querying
Supabase on every request would add network latency and availability coupling;
shared persistent demo secrets would complicate credential handling unnecessarily.

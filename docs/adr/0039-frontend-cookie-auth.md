# 0039 — Frontend cookie authentication and route-scoped samples

## Context

The public build previously replaced all API calls with sample data. Browser users
otherwise pasted programmatic API keys. JWT human authentication and tenancy now
exist in the backend, but the browser needs PKCE, session refresh and workspace
selection. Existing GET /workspaces returned only the selected membership and no
account deletion route existed; three failing contract tests demonstrated the gaps.

## Decision

Use Supabase's browser/server SSR clients for cookie-managed PKCE sessions and the
Next.js 16 proxy for user validation and refresh. Backend JWT verification remains
authoritative. Keep LocalAuth's existing single-flight, in-memory owner login for
isolated local demos. No custom production token-minting endpoint or test bypass
is added. Browser regression tests launch a loopback-only fake GoTrue/API using the
existing RSA helper; no live Supabase or provider credentials are needed.

Only /demo selects the in-memory sample adapter. The landing page is public and
real workspace routes require login. Nonces require dynamic rendering, replacing
the former static script unsafe-inline policy. Inline styles remain necessary for
existing UI components. Return paths are validated; callback redirects are relative
and proxy redirects preserve the request Host rather than forwarded host headers.

List all human workspace memberships using the existing endpoint; keys remain
single-workspace. Add DELETE /me for application account deactivation, revocation
and membership removal. Reject last-owner deletion. Never use a service-role key to
delete Supabase identities; the UI explicitly distinguishes local account deletion
from identity deletion/data erasure. This is a narrower operation than full erasure.

## Consequences

Tokens are stored only through SSR cookies (readable by JS), not localStorage.
Global sign-out invalidates refresh sessions but not already-issued JWTs. Profile
metadata is presentation only, never authorization. Real OAuth, CAPTCHA and email
delivery still require operator configuration and live verification.

The existing Vercel deployment must be redeployed; NEXT_PUBLIC_DEMO_MODE is obsolete.
An unconfigured deployment can still serve the landing and /demo. Dynamic page
rendering has a runtime cost versus static export. Workspace choice and onboarding
progress are tab/view-local, not persisted user preferences. Current membership
management has no invitation-acceptance UI; ownership transfer may need an operator
when another member does not yet exist.

Artifact scanning permits only the SDK's unused `http://localhost:9999` default
constant. The application requires a configured project URL; other private
addresses/credentials remain blocked, with explicit scanner regression tests.

# 0042 — CI-gated hosted deployment and redirect verification

## Context
A CI success is not proof that a hosted deployment is serving the tested commit. Redirect proxies can change observable behavior, and synthetic production checks must not expose credentials or leave unlimited test data.

## Decision
A disabled-by-default, production-environment workflow accepts successful same-repository default-branch push CI runs. It invokes a secret Render hook with the tested commit SHA and waits for that revision in /livez before smoke testing. Render automatic deploy is off, avoiding a post-deploy-check/auto-deploy dependency cycle. Manual dispatch verifies only. Workflows serialize rather than cancel cleanup; privileged jobs never execute PR artifacts.

Vercel rewrites /s/:code to a server route, which reads API_ORIGIN with no default, fetches without following redirects or forwarding credentials, and preserves status/Location. NEXT_PUBLIC_SHORT_BASE_URL controls copied URLs and falls back to the direct API public base. /s is opt-in only after the operator's deployed verification passes; local mocked tests are not live Vercel evidence.

The smoke test uses a dedicated verified-owner read/write key, one expiring synthetic link, bounded cold-start/analytics waits, and finally cleanup. A separate catalog-only read-only transaction checks all public tables for RLS and effective anon privileges. Neither tool provisions resources or prints credential-bearing responses.

## Consequences
A live backend, secrets configured by the operator, and a free TLS Redis prerequisite remain necessary. Current Redis Cloud Free Essentials does not provide TLS, so the exact secure free vendor combination is blocked rather than silently upgraded or downgraded to plaintext. Render cold starts can exceed the proxy timeout; direct API links remain the fallback. Proxy traffic can share an IP bucket. Quotas, worker sleep, runner cancellation, leftover soft-deleted fixtures and database migrations need operator attention; rollback is manual and does not automatically downgrade schema.

The Redis Cloud prerequisite is superseded by [ADR 0043](0043-render-private-keyvalue.md); the CI deployment gate is unchanged.

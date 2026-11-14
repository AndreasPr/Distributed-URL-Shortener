# 0044: Explicit peer-only client IP mode

## Context

Hosted production required proxy CIDRs that the operator cannot verify for Render.
Guessing private ranges or trusting every forwarding header is unsafe. Blocking
all anonymous traffic behind a shared proxy bucket lets one visitor deny service
to everyone else. The local/kind behavior must remain unchanged.

## Decision

Keep CLIENT_IP_MODE=trusted_proxies as the application default. Add explicit
peer_only, selected by the Render Blueprint. In peer_only, return only the socket
peer and ignore all forwarded IP headers, with Uvicorn rewriting disabled.
Reject IPv4/IPv6 `/0` networks in every mode, even if unused. Production requires
nonempty restricted TRUSTED_PROXIES only in trusted_proxies mode.

Emit one warning per API startup. Do not enforce anonymous IP buckets in peer-only
mode. Keep report CAPTCHA and verified-owner creation requirements. Authenticated
mutation buckets remain identity-plus-peer; replace the shared /me pre-auth bucket
with an identity-plus-peer auth bucket after authentication in peer-only mode.
No anonymous quick-shorten is introduced. Database-backed caps stay authoritative.

## Consequences

One visitor cannot exhaust a proxy bucket to block unrelated visitors. No
per-visitor IP attribution or anonymous per-visitor rate limiting is provided.
Public floods, invalid-auth floods and CAPTCHA farming remain resource risks;
this is not a general DoS solution. Identity buckets may split across changing
proxy peers. Revisit trusted proxy mode only with authoritative network evidence.
Local/kind retain the default behavior. No live Render validation is claimed.

# ADR 0007: Scoped API keys and shared token buckets

Status: accepted for step 2.1.

Anonymous mutations and analytics access were inappropriate for even a shared
portfolio deployment. The old sliding-window middleware was never registered.

Use generated 256-bit API keys, SHA-256 digest storage and constant-time digest
comparison. A local operator CLI bootstraps keys; metadata/revocation HTTP endpoints
require admin. Read, write and admin are explicit scopes, with admin implying both
others. This is a shared workspace: created_by records the key ID for audit/future
ownership, not a tenant boundary. Existing nullable string storage is preserved;
adding an ownership policy or converting legacy ownership is out of this scope.

Alternatives: OAuth adds an identity-provider dependency; signed self-contained
keys complicate immediate revocation. Database-backed keys permit straightforward
revocation at the cost of a lookup and last-used write on authenticated requests.
Password hashing would apply to human passwords, not these high-entropy tokens.

Use an atomic Redis token bucket per route template plus key ID (writes) or trusted
client IP (public redirects). Server TIME avoids application clock skew; bucket TTL
bounds idle state. A fixed window permits boundary bursts; sliding windows retain
more per-request state; per-process counters cannot enforce limits across replicas.

Public limiting runs in explicitly registered middleware. Write limiting shares
the authentication dependency so it runs only after key/scope validation and uses
the router's matched path, without duplicating DB session management in middleware.
CORS sits outside rate limiting. Redis outages fail writes with 503 and leave public
redirects available; failing all paths closed would make Redis mandatory for reads.

Forwarding trust uses explicit CIDRs and the first untrusted hop walking from the
socket peer. Project launchers disable Uvicorn's prior header rewriting. Kubernetes
exposes metrics on an internal port with ClusterIP and NetworkPolicy rather than
trying to filter HTTP paths with a layer-4 policy or ingress snippets that may be
disabled by the controller. Local development retains public /metrics.

The browser uses an in-memory key field instead of bundling an environment secret
or persisting keys in localStorage. Read APIs are now protected as well as writes.

See [security model](../security.md) and [verification](../auth-verification.md).
References: [Uvicorn proxy settings](https://uvicorn.dev/settings/),
[Kubernetes NetworkPolicy boundaries](https://kubernetes.io/docs/concepts/services-networking/network-policies/).

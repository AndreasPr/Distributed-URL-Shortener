# 0043: Private Render Free Key Value

## Context

The hosted design needs Streams and Lua without a paid service. The previous
Redis Cloud Free TLS prerequisite blocked that design. Local and kind behavior
must stay unchanged.

## Decision

Provision Free Render Key Value in Virginia beside the API in the same workspace.
Use the Blueprint connectionString reference, an empty external IP allowlist,
noeviction and persistence off. Permit plaintext only for the documented private
single-label hostname shape: full match `red-[a-z0-9]{1,59}`, port 6379 or omitted.
Require TLS elsewhere; reject URL query overrides and fragments.
[Render Blueprint specification](https://render.com/docs/blueprint-spec).

The allowlist is conservative application policy based on the documented example,
not a provider guarantee about all future hostnames or a DNS security check.
A changed provider format needs explicit review. Verify protocol compatibility
against local Valkey 8, without contacting any live deployment.

## Consequences

Private-network plaintext replaces external TLS only within the Render workspace
trust boundary. Optional internal authentication is an operator configuration.
Free restarts erase queued clicks, abuse jobs, dead letters, cache and rate counters;
committed PostgreSQL data survives. No durable hosted event delivery is claimed.
Noeviction makes memory exhaustion visible but cannot prevent restart loss.
[Render Free limitations](https://render.com/docs/free).

Upstash TLS is a possible unprovisioned alternative, but its Free 500K monthly
command allowance can be consumed by polling workers. No paid upgrade is selected.
Local Compose and kind keep their current independent Redis services.

# 0014: MCP tools use the authenticated API boundary

## Context

The old MCP workflow directly queried storage and scanned obsolete limiter keys.
It interpreted accepted traffic as rejections, could silently substitute zeros on
failure, and its README incorrectly claimed continuous monitoring.

## Decision

Use stdio with typed tools, default read-only policy, and HTTP API authentication.
Add read-scoped URL status and admin per-code activity routes. Dedicated expiring
minute counters record only actual attributable 429 responses; SQL counts persisted
clicks per code. Do not inspect token-bucket keys. Report partial sources explicitly.
Keep on-demand heuristics and optional GitHub/Slack adapters; no implicit posting.
Sanitize error/audit output and bound responses. Record API fixtures from real
handlers with isolated storage and verify them in both backend and MCP suites.

## Alternatives and consequences

Direct DB access couples MCP to schema and bypasses API authorization. Scraping
metrics cannot recover bounded per-code rejection history without high-cardinality
labels. A durable event ledger is more complete but outside this small change.
Redis counters are best effort and ephemeral; source availability is not coverage.
Stdio avoids exposing a new unauthenticated network service, but local clients with
write opt-in can exercise API authority. Client human approval is recommended,
not enforceable by this server. Existing HTTP MCP clients must switch to stdio.
Private .env files are not loaded implicitly. No new dependencies or paid services.

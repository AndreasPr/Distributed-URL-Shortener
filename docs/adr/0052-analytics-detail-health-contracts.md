# 0052 — Timestamp analytics, bounded detail lookup and public health

## Context

Click analytics contains timestamps and an unbounded total history, not visitor dimensions. There is no destination-by-code read endpoint. Public health exposed a cross-workspace URL count, while the frontend's readiness gate hid valid degraded responses until timeout.

## Decision

Aggregate timestamps by local calendar day with full year keys and zero-filled 7/30/90-day windows. Render one chart and an equivalent table. Reuse existing status, analytics and latest-links endpoints for detail; cap GET /urls at 100 (default 20) and explicitly identify destinations outside that window. Keep destinations as text. Do not introduce a new endpoint, pagination, visitor inference or prototype mock data on real routes.

Remove total_urls and its database count query from public /health. Keep dependency checks and optional worker/migration readiness. A separate public health probe returns valid 503 degraded JSON immediately, while retrying transport/cold-start failures for 90 seconds. Normal protected requests retain the existing readiness gate and writes are never replayed. /status is read independently so degraded dependency readiness does not conceal public kill switches.

## Consequences

Health stops leaking the global link count. Out-of-range list limits now receive 422. Detail cannot show every destination without a later backend contract. Calendar boundaries depend on the viewer's displayed time zone; there is no unique-visitor claim. Unbounded timestamp payloads remain a scalability risk despite linear aggregation and at most 90 displayed buckets. Viewer deletion controls use shared identity; backend authorization remains authoritative. No new dependencies, storage or live-provider calls are introduced.

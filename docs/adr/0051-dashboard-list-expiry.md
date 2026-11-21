# 0051: Workspace-list-derived dashboard and expiry

## Context

The dashboard used a global public-health link count as a stored-links statistic. Its workspace-scoped list lacked expiry, and fetching status per row would add avoidable API traffic.

## Decision

Add nullable UTC ISO expires_at to the existing list query. Keep all other fields, ordering, limits and tenant/soft-delete filters. Derive dashboard counts from the shown list only; label the 20-row subset. Use local instant comparisons for expiry and no per-row status requests. Blocked/review status belongs to the future detail view. Keep health as a small status-only card.

Reuse shared identity to hide viewer mutation controls and the existing API for writes. Add a typed 404 error while retaining its message so delete can refresh when a row is already absent. The backend remains authoritative for ownership and permissions. Demo retains in-memory data and implements the same nullable field; its dashboard receives the explicit v2 opt-in.

## Consequences

Statistics are not workspace totals, and expiry labels reflect the browser clock (refreshed every 30 seconds), not backend enforcement. API errors remain visible. Public /health still exposes a global count: that is a separate security/privacy follow-up, not fixed by removing the dashboard card. No schema migration, row-status N+1 or new API route is needed.

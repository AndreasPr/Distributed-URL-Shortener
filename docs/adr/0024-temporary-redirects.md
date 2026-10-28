# 0024: Temporary redirects preserve server-side lifecycle decisions

## Context

The API already returns HTTP 307 for successful redirects. Expiry, soft deletion,
admin blocking and click observation depend on future navigations reaching the server.
This retrospective record documents the existing choice; it introduces no behavior change.

## Decision

Keep 307 temporary redirects instead of 301 permanent redirects. A permanent cached
redirect can bypass later server decisions and analytics. The current public route is GET;
307 also preserves the method if other methods are ever explicitly supported, which is
not a claim that they are supported today. A future cache-control policy needs separate tests.

## Consequences

Repeated navigations incur a server lookup and retain the opportunity to enforce lifecycle
and abuse decisions. Status choice alone cannot guarantee every client/proxy cache behaves
as desired; it is not a global purge mechanism. Existing redirect API tests assert 307.

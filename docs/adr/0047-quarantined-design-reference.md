# 0047: Quarantine the generated design prototype

## Context

An AI Studio Vite/React Router prototype is useful visual input but contains simulated authentication, tenant/admin data, commerce and infrastructure claims. Production uses Next.js and authenticated backend contracts.

## Decision

Retain the sanitized source only in docs/design-reference. Exclude it from runtime builds and lint/type/test discovery; keep secret scanning active. Remove server/data/environment files if present and obsolete executable package scripts. Inventory every page, route, component, context and dataset in docs/design-port-plan.md before incremental ports. Do not change frontend or backend in this step.

## Consequences

The prototype is not runnable or shipped and has no quality/security/license guarantee. Future PRs reuse existing Next components and real contracts; mocks remain /demo-only. Missing backend features, paid plans and unverified claims cannot be introduced as cosmetic changes. Vercel must retain frontend as its configured root; no live dashboard setting was changed.

# 0048: Design-page-only token scope

## Context

The generated reference uses different colors and custom components; a global replacement would alter shipped pages and risk auth, demo and keyboard regressions.

## Decision

Keep existing shadcn/Radix primitives. Override semantic tokens and slot styles only below data-design=v2, applied only at /design. Preserve /demo/design v1. Explicitly scope the example dialog portal. Bundle the existing Inter file with next/font/local; no external fonts or new dependencies. Add only EmptyState, StatCard and a clipboard-aware CodeBlock.

## Consequences

Later route adoption is explicit and separately reviewed. Global themes/shell/auth/CSP remain unchanged. Portal styling requires explicit opt-in. Contrast tests and light/dark axe coverage validate known states, not every conceivable composition. Prototype metrics and simulated request states never become application data.

# 0021: Local, bounded failure experiments

## Context

Cache degradation, worker catch-up and best-effort publisher failure are different contracts.
A passing redirect alone cannot establish analytics durability.

## Decision

Use shell entrypoints and a standard-library Python controller against an existing local Compose
stack. Measure before/during/after phases at low rate; save structured results and enforce
explicit thresholds. Require exact aggregate click accounting for worker losslessness and
broker delivered-or-reported-drop accounting. Preserve failures, including ambiguous Kafka acks.
Restore faults in finally blocks. Support kind worker scale-down with original replica restoration;
defer broker/Redis cluster faults and optional PostgreSQL latency injection.

## Consequences

No paid tools or application changes. Experiments intentionally disrupt local dependencies and
must run without competing traffic. Process-global metrics limit broker checks to one API.
Graceful worker stop and bounded observation do not prove crash safety or infinite-time delivery.
Shell/unit validation is distinct from actual failure injection results.

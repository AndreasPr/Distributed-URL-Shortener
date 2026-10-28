# 0020: Isolated performance workload

## Context

The old stress/spike scripts used unauthenticated writes and spoofed forwarded addresses.
The existing load script is a low-rate kind CI smoke gate, not a capacity test.

## Decision

Preserve that gate as smoke_load_test.js. Share authenticated setup and mixed workload across
load/stress/spike. Use a separate disposable Compose project, read/write key, high service-wide
limits, Redis Streams and fake classification. Seed 10,000 URLs and bias reads toward hot ranks.
Save k6 JSON and a report with workload-only metrics and a final Prometheus cache window.

## Consequences

No normal-stack limits/data are changed, and no live model or paid service is used. The harness
consumes local resources and requires free ports; cleanup removes its own data. Closed-loop
stress tests and finite cold tails are explicitly documented. Tiny smoke runs validate tooling,
not capacity. Capacity estimates remain separate from measured results; the committed sample is a failed tiny smoke run.

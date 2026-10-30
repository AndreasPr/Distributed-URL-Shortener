# Architecture decision records

Records describe the decision at the time it was made. Later records and current code may
supersede operational details; historical package versions are not a current dependency lock.
Numbers are unique. Four early step-specific duplicates were moved to 0028–0031;
their original decision dates and content remain historical, and repository links are updated.

| Record | Decision |
|---|---|
| [0001-free-local-baseline.md](0001-free-local-baseline.md) | ADR 0001: Establish a free, local baseline before behavior changes |
| [0002-local-configuration-and-image-pins.md](0002-local-configuration-and-image-pins.md) | ADR 0002: Local credentials, smaller build context, and explicit image versions |
| [0003-reproducible-quality-gate.md](0003-reproducible-quality-gate.md) | ADR 0003: Reproducible Python and blocking quality gates |
| [0004-baseline-correctness.md](0004-baseline-correctness.md) | ADR 0004: Correct baseline failures without redesign |
| [0005-versioned-migrations.md](0005-versioned-migrations.md) | ADR 0005: Alembic owns the PostgreSQL schema |
| [0006-url-validation-and-lifecycle.md](0006-url-validation-and-lifecycle.md) | ADR 0006: URL validation, aliases, and lifecycle correctness |
| [0007-api-keys-and-token-buckets.md](0007-api-keys-and-token-buckets.md) | ADR 0007: Scoped API keys and shared token buckets |
| [0008-security-hardening.md](0008-security-hardening.md) | ADR 0008: bounded requests and least-privilege deployment |
| [0009-event-trace-context-and-privacy.md](0009-event-trace-context-and-privacy.md) | ADR 0009: event trace continuity and privacy at export |
| [0010-slo-recording-and-alerts.md](0010-slo-recording-and-alerts.md) | ADR 0010: measured availability, burn alerts and provisioned monitoring |
| [0011-llm-provider-boundary.md](0011-llm-provider-boundary.md) | ADR 0011: Offline-first typed LLM provider boundary |
| [0012-abuse-evaluation.md](0012-abuse-evaluation.md) | ADR 0012: Synthetic, offline abuse regression with explicit holdout |
| [0013-gemini-request-pacing.md](0013-gemini-request-pacing.md) | 0013: Pace Gemini attempts and retain safe HTTP status codes |
| [0014-mcp-http-boundary.md](0014-mcp-http-boundary.md) | 0014: MCP tools use the authenticated API boundary |
| [0015-testcontainers-integration.md](0015-testcontainers-integration.md) | ADR 0015: Disposable service integration tests |
| [0016-local-kustomize-deployments.md](0016-local-kustomize-deployments.md) | ADR 0016: Kustomize overlays with a migration gate |
| [0017-gated-ci-and-releases.md](0017-gated-ci-and-releases.md) | ADR 0017: Gated CI and release images |
| [0018-patched-runtime-dependencies.md](0018-patched-runtime-dependencies.md) | ADR 0018: Patch dependencies without weakening release gates |
| [0019-validation-only-aws-design.md](0019-validation-only-aws-design.md) | ADR 0019: Keep the AWS design separate from free local operation |
| [0020-reproducible-local-performance.md](0020-reproducible-local-performance.md) | 0020: Isolated performance workload |
| [0021-local-chaos-experiments.md](0021-local-chaos-experiments.md) | 0021: Local, bounded failure experiments |
| [0022-retry-ambiguous-click-publications.md](0022-retry-ambiguous-click-publications.md) | 0022: Retry ambiguous click publications with stable event identity |
| [0023-evidence-oriented-project-readme.md](0023-evidence-oriented-project-readme.md) | 0023: Evidence-oriented README and offline checks |
| [0024-temporary-redirects.md](0024-temporary-redirects.md) | 0024: Temporary redirects preserve server-side lifecycle decisions |
| [0025-abuse-recall-and-reused-holdout.md](0025-abuse-recall-and-reused-holdout.md) | 0025: Transparent abuse features, dev-only policy and reused-holdout evidence |
| [0026-isolated-repeatable-demo.md](0026-isolated-repeatable-demo.md) | 0026: Isolated deterministic demo with private one-time keys |
| [0027-browser-only-demo.md](0027-browser-only-demo.md) | 0027: Browser-only hosted demo behind the API client interface |
| [0028-short-code-generation.md](0028-short-code-generation.md) | ADR 0028: Random short-code generation |
| [0029-cache-strategy.md](0029-cache-strategy.md) | ADR 0029: Bounded cache coordination and Redis failure isolation |
| [0030-event-bus.md](0030-event-bus.md) | ADR 0030: Versioned analytics events over Kafka or Redis Streams |
| [0031-abuse-pipeline.md](0031-abuse-pipeline.md) | ADR 0031: Asynchronous URL abuse review |
| [0032-ci-load-allocation-and-cleanup.md](0032-ci-load-allocation-and-cleanup.md) | 0032: Preallocated k6 VUs and explicit cleanup-helper socket |



The retrospective 0024 record fills the previously implicit 307-versus-301 decision.
Existing records missing explicit sections now include Context/Decision/Consequences
summaries; original detailed reasoning and evidence are retained.

Current overview: [engineering design](../design.md).

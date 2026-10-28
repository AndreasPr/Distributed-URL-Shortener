# ADR 0011: Offline-first typed LLM provider boundary

## Decision

Add a synchronous generic protocol returning a validated Pydantic object and
metadata. Use the existing pinned requests dependency for Gemini, local Ollama and
an explicitly configured Claude compatibility adapter; fake remains the default.
Do not integrate inference into redirects or events in this step. No real provider
is called by tests. Credentials/model names come from settings, never source code.

Share admission, retries, validation/one repair, safe exceptions and metrics.
Count every attempt against a process-wide UTC daily budget and hold a shared
semaphore across retries to prevent retry storms. In-memory limits avoid requiring
Redis for local inference; unlike a distributed durable counter they reset on
restart and do not enforce account-wide or deployment-wide spending limits.
Timeouts bound connect/read inactivity and check elapsed time between response
chunks; they do not forcibly interrupt DNS or socket reads. No automatic fallback
can accidentally invoke a paid adapter. Claude remains compatibility-only and
outside the documented free setup.

## Alternatives and consequences

A vendor SDK per adapter would add locks/dependencies and differing retry behavior.
HTTP keeps retry and privacy rules in one place. Strict local Pydantic validation
is authoritative even when upstream supports structured output. One regeneration
can recover malformed output without unbounded spend; no error payload is echoed.
Suppress automatic outbound tracing rather than risking key/prompt exposure.
Callers remain responsible for sending only non-sensitive data: validation of
output cannot establish safety of input or truth of a classification.

Ollama origin restrictions and no-cloud instructions favor local operation over
arbitrary remote endpoints. A fake with explicit fixture JSON avoids pretending
to infer meaningful classifications for arbitrary schemas. Model quality, durable
budgets and end-to-end classification workflows are future work.

## Context

Abuse classification needs replaceable local/free-tier inference and deterministic offline tests without binding business logic to one provider.

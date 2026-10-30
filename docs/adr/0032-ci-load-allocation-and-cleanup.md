# ADR 0032: Preallocate smoke-load workers and keep container cleanup enabled

## Context
The kind gate intermittently drops arrivals despite passing HTTP correctness and p95
checks. The original two preallocated k6 VUs require dynamic allocation when brief
redirects exceed 400ms at five requests/second. Historical and reproduced runs
have sub-second outliers. Separately, a historical Docker Desktop Ryuk socket failure
led to a documented local cleanup-disable workaround.

## Decision
Preallocate the existing maximum of five VUs; keep five arrivals/second, 30 seconds,
p95 below 500ms, errors below 1%, all checks passing, and zero drops unchanged.
Retain per-sample k6 JSON in ignored workflow artifacts for future diagnosis.
Test transient stalls and verify that real throttling and sustained latency still fail.
Pin the cleanup-helper socket to /var/run/docker.sock on Ubuntu CI and explicitly
keep Ryuk enabled. Prefer a socket override to disabling the helper on affected hosts.
Renumber the four duplicate ADRs to 0028–0031 instead of shifting all existing records.

## Consequences
This removes allocation delay within the existing concurrency ceiling, not backend
latency or CPU contention. Requests exceeding that capacity can still fail the gate.
Normal Testcontainers crash cleanup remains enabled. Socket paths are environment-
specific: the Linux CI override is not a universal rootless/remote Docker setting.
The exact cause of the historical host-side Ryuk failure is not recoverable from its
logs; default and explicit-socket runs now pass. See [verification](../loose-ends-verification.md) for
measured evidence and limits. Repository ADR links are updated; external old links
must be updated by their owners.

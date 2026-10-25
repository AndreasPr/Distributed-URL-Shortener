# 0013: Pace Gemini attempts and retain safe HTTP status codes

## Context

Public-data evaluation exceeded the selected model's RPM and RPD allowances.
Increasing HTTP timeouts did not solve quota errors; generic LLMError counts hid
whether requests were rejected or quota-limited.

## Decision

Space Gemini starts by a configurable five seconds using a lock and monotonic
clock in shared Limits. Apply this before every generation, including retry and
repair, while retaining the existing budget. Preserve numeric HTTP status codes
in typed exceptions and aggregate evaluation error keys without retaining remote
bodies, headers, prompts or credentials. Default Fake/Ollama behavior is unchanged.

## Consequences

Five seconds leaves headroom under a 15 RPM project quota for one process.
Separate processes and other users are not coordinated, and daily accounting is
still local and resets on restart. Inspect actual project quotas before running.
Pacing increases whole-classification latency. This is not a distributed limiter
or a Retry-After implementation. The runner reports terminal classification errors,
not a history of all failed attempts. Frozen thresholds and historical reports
remain unchanged. Live provider verification is performed by the user only.

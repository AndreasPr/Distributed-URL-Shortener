# ADR 0012: Synthetic, offline abuse regression with explicit holdout

Use a hand-authored 120-case reserved-domain fixture plus 16 independent injection
cases. These are regression examples, not representative maliciousness ground
truth. Public data is user-acquired under source terms and never downloaded by
code or included automatically. Raw/local datasets and run artifacts are ignored.

Split deterministic shuffled normalized-host groups before limiting; expose dev
for threshold tuning and test for reported scores. This avoids exact-host leakage
but not related-subdomain/template/campaign leakage; credible public research
requires additional curation. Record config, data/source hashes, revision, runtime,
command and date. Live model outputs and timing remain nondeterministic.

Use the actual Classifier with explicit mode/policy and cache-disable options,
rather than duplicate its prompt/repair/floor behavior or monkeypatch global Redis.
Default production behavior stays combined with caching. Alternate llm-only mode
removes heuristic decisions; heuristics-only skips inference. A constant valid
suspicious FakeProvider tests the interface without labels or model intelligence.

Report flag detection (suspicious or malicious) separately from actual blocking.
Combined cannot clear gray-zone heuristic concerns, so its binary metrics cannot
establish incremental LLM value over heuristics; block outcomes may differ.
Undefined ratios remain null, provider failures remain visible, and token totals
are qualified by metadata coverage. Count logical calls separately from retries.

CI runs a fixed-seed combined/fake regression with config-file floors, no HTTP or
Redis. Make eval writes the requested aggregate documentation table; raw reports
remain local. No source data or provider secrets are present in generated reports.

## Context

Abuse behavior needs reproducible regression evidence and explicit separation between synthetic fixtures, public-data evaluation and model failures.

## Decision

Use deterministic host-group dev/test splits, committed synthetic fixtures, injected FakeProvider and recorded metrics; tune on dev only and retain degraded live-provider runs as such.

## Consequences

Regression floors detect code changes but do not establish real-world phishing accuracy. Related campaigns may leak across host groups, and provider availability/token metadata limit interpretation.

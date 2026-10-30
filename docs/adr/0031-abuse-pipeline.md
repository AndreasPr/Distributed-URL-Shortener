# ADR 0031: Asynchronous URL abuse review

## Context

Short links can conceal phishing destinations. Redirect latency must not depend
on model inference or a broker. The existing event bus provides at-least-once
consumption; the LLM boundary provides schema validation, retries and limits.
This ADR number follows the requested filename; it is distinct from the earlier
baseline-correctness ADR.

## Decision

### Durable creation events and independent worker

Creation inserts an `abuse_outbox` row in the **same transaction** as `urls`. An
abuse worker relays rows as `url.created` on a separate configurable topic, with
only short code, event ID, timestamp and trace context. It deletes an outbox row
only after broker acceptance. A publish/commit crash can duplicate delivery;
`url_verdicts.short_code` is a primary key and insert-on-conflict-do-nothing makes
persistence idempotent. Replay cannot overwrite a human decision. A best-effort
in-process queue was rejected: losing creation events would silently skip checks.

The worker loads the URL from PostgreSQL, ends its read transaction before LLM
work, then locks the URL to store the verdict. Admin reviews acquire the same lock.
Acks follow commit; infrastructure failures retain the event and retry after a
bounded wait. Invalid envelopes go to a dedicated abuse DLQ before acknowledgment.
SIGTERM finishes current processing; an interrupted uncommitted event remains
unacknowledged. The broker can redeliver it on restart. No URLs appear in event
payloads, logs, or span attributes; logs use fixed messages and exception types.

### Offline heuristics and conservative model routing

`app/abuse/heuristics.py` computes IP literals (v4/v6), punycode/mixed Latin-Greek-
Cyrillic script hosts, subdomain depth, an illustrative small TLD list, URL length,
digit/special-character counts, brand tokens in subdomains, known shortener hosts,
and credential-themed path words. It does not fetch pages, follow redirects or
resolve DNS. Shortener detection is an indicator of a possible chain, not a claim
that a chain was followed. Unicode/TLD heuristics can produce false positives.
The additive score is clipped to [0,1]; it is **not a calibrated probability**.

Default score <0.25 is clean; >=0.75 is malicious; [0.25,0.75) uses the LLM.
Thresholds are configurable. Low/high decisions count as saved LLM calls. The LLM
receives capped host+path, never scheme/credentials/query/fragment. The JSON-quoted
string is enclosed in a data block; delimiter characters are escaped. The system
prompt declares it untrusted and no tool/browsing capabilities are supplied.
Model output uses a strict Pydantic schema with fixed verdict/reason vocabulary,
finite confidence [0,1], bounded reasons and no extra fields.

Off-schema output becomes suspicious/llm_invalid_output. Budget exhaustion,
timeouts or missing configuration become suspicious/llm_unavailable. A model
cannot clear existing gray-zone heuristic concerns: clean or low-confidence
malicious output remains suspicious. Malicious with confidence >=0.8 blocks.
This is conservative review routing, not proof that prompt injection is solved.
Schema-valid malicious output can still cause a false positive. Admin review is
the correction mechanism. See [OWASP guidance](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html).

### Contextual domain cache

Use the pinned tldextract bundled PSL, including private suffixes, with downloads
and disk caching disabled. This isolates example.co.uk and tenants on github.io.
Redis keys include a hashed registered domain plus a fingerprint of host, full
path, heuristic score/reasons, model selection and thresholds. Stored values are
validated verdicts with a configurable TTL (default 3600s). This reuses repeated
checks without treating an entire domain as permanently safe. Queries/fragments
are excluded from model input, but any changed heuristic contribution changes the
fingerprint. A high heuristic score bypasses cached decisions. Redis failure or
malformed entries fall back to analysis; transient LLM failures are not cached.
Domain-only caching was rejected because unrelated paths/tenants could poison
one another's decisions. Cached results never contain the raw URL.

### Enforcement and human review

Every redirect checks PostgreSQL verdicts, even on Redis hits and single-flight
waiters. A malicious verdict or admin block returns **451** and evicts the URL
cache. Suspicious links keep redirecting and enter the authenticated admin queue.
An admin allow overrides automatic blocking; repeated events preserve the review.
Expiry/deletion continue to return 410/404. Missing verdicts remain redirectable
while asynchronous analysis is pending, including broker/worker outages. This
availability-first delay is a known abuse window; quarantine-before-first-click
would change the product contract. Existing links are not automatically backfilled.
451 here means project abuse-policy blocking, not a claim of a legal order.

GET /admin/flagged lists unreviewed suspicious/malicious entries, bounded/paginated.
POST /admin/flagged/{code}/review accepts allow|block, records reviewer key ID/time,
and returns 204; unknown/deleted links or missing verdicts return 404. Both require
admin scope (401/403 otherwise); writes use the existing Redis token bucket.
The Flagged UI reuses the in-memory key, renders destinations as escaped text and
never visits them. Human review is not copied into the domain cache.

## Operation and limits

See [abuse-pipeline.md](../abuse-pipeline.md) for migrations, profiles and controls.
No paid provider is enabled by default. Fake output `{}` intentionally becomes a
reviewable invalid-output verdict for gray-zone cases. Use explicit Fake fixtures
in tests. LLM limits are per process and reset on restart, not deployment quotas.

The worker is sequential; replica count multiplies model concurrency/budgets.
Concurrent replicas may duplicate inference before one inserts the winning row;
the unique constraint prevents duplicate persistence but not duplicate model cost.
Outbox batches hold locks during broker publication; this occurs only in workers.
Retained broker history/DLQ storage requires operational retention. Reassessment,
review history beyond the latest decision, reputation feeds, automated backfills,
and domain ownership verification are outside this step.

## Consequences

Creation is decoupled from inference and durable outbox relay tolerates publish failure. New links may redirect before classification; conservative fallbacks increase review demand and no verdict guarantees safety.

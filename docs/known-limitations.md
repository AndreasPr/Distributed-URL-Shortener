# Known limitations

This is a local portfolio system, not a production security or availability certification.
See [claims](claims.md) and the [final audit](final-audit.md) for evidence boundaries.

## Blocking or material audit findings

- **Frontend vulnerabilities:** npm audit reported 27 findings (2 critical, 19 high,
  4 moderate, 2 low). Includes Next.js (critical), proxy-addr (critical), axios and other
  transitive/development packages. Suggested fixes include major Next/eslint-config-next
  changes and a shadcn dependency change. A dedicated dependency migration with browser,
  build and regression testing is required; no forced broad upgrade was made in this audit.
  Successful builds and the intentionally non-blocking CI npm report do not make this safe
  for public production exposure. Run `cd frontend && npm audit` for current details.
- **Local kind load gate:** the historical 2-drop failure and a fresh 1-drop reproduction
  had passing HTTP checks but insufficient preallocated k6 workers for short latency
  spikes. Preallocating the existing five-VU ceiling fixed the controlled reproduction;
  the full fixed kind gate passed (151 iterations, zero drops/errors, redirect p95 23.64ms).
  Thresholds were not relaxed. The exact host/backend cause of the historical 830ms tail
  remains unknown; this is not proof that tail latency or host contention is eliminated.
  [Evidence and reproduction](loose-ends-verification.md). A hosted PR run for this commit
  is still needed; the local workflow entrypoint was exercised completely.
- **Docker Desktop integration setup:** the historical Ryuk socket failure did not recur.
  Default Ryuk-enabled tests passed; the full gate using the new explicit Linux CI socket
  settings passed 443 tests with 93.67% coverage. CI keeps crash cleanup enabled.
  [Socket diagnosis and fallback](testing.md#docker-desktop-cleanup-helper-diagnosis)
  explains environment-specific paths. The exact historical host failure is unproven;
  disabling Ryuk remains a last-resort local fallback, not the CI configuration.
- **Local secrets:** ignored `.env` contains GEMINI_API_KEY; ignored `mcp-server/.env` contains
  GITHUB_TOKEN and SLACK_WEBHOOK_URL. Scanner findings do not prove public exposure. Review
  necessity/scopes and rotate/revoke if exposed or no longer needed. Never commit them.
  A clean scan of 91 locally available commits is not proof of absence in deleted/unfetched
  history, remote artifacts, logs or another copy of the repository.

## Architecture and correctness boundaries

- Single-region/local deployments; no proven multi-AZ failover. Terraform is validated but
  not deployed, and its infrastructure would incur charges. No production disaster-recovery test.
- Positive Redis hits still query PostgreSQL for lifecycle/abuse decisions. PostgreSQL outages
  can break redirects; the Redis breaker is not a database breaker.
- Click publication is an in-memory bounded queue with bounded retries. API crashes, long
  outages and overflow can lose events. Timed-out acknowledgments can be ambiguous; stable IDs
  provide idempotent database effects, not exactly-once delivery. Abuse creation has a separate
  durable outbox and can still redirect before its first verdict.
- Worker experiments use graceful stops and finite observation windows. Aggregate counts do
  not prove every crash interleaving or identify every duplicated/lost event individually.
- Single-flight/leases mitigate stampedes; timeout fallback can duplicate work. Redis Streams
  shares cache failure/resource pressure in lightweight mode. Retained stream and DLQ history
  need an operational retention plan; replay does not clear DLQ entries.
- API-key ownership metadata is not full tenant isolation. Scoped keys remain bearer secrets;
  stolen valid keys work until revoked. Metrics and admin interfaces require deployment controls.

## Measurement and abuse limitations

- Availability counts non-5xx, including 404/410/429; it is not redirect-success availability.
  Cache-cohort latency/freshness SLIs and external probes are incomplete. No full 30-day SLO proof.
- Capacity arithmetic is hypothetical. Local mixed-load results do not establish 10,000
  redirects/s, 100 million records, tail latency under sustained saturation or linear scaling.
  Hardware and Docker resource budgets need recording. Fresh clone lacks ignored raw result archives.
- Historical public recall was 9.375% (3/32). The recall follow-up flags 13/35 on a
  64-example domain-separated but reused holdout (37.1429% recall, 100% precision, no blocks).
  Only 29 benign examples and previously inspected/noisy source labels cannot establish low
  field FPR or generalization; 22 malicious examples remain missed. See [results](eval-results.md).
  Synthetic FakeProvider regression is not live-model accuracy.
- Heuristics do not fetch pages. URLs may redirect before classification; false positives and
  false negatives remain. Query removal does not make a sensitive path safe to send externally.
  Free-tier provider terms/quotas may change; no live inference was invoked in this audit.
- Trace/log filtering trades away debugging detail; durable destinations and encoded DLQ
  payloads can still contain sensitive data. Base64 is not encryption.

## Tooling and operations

- README ports must be free; an existing stack blocked the exact fresh-clone start. `make up`
  is detached startup, not an all-services-readiness guarantee. Grafana needed 8 seconds in a
  separate readiness check. Frontend runs separately from ordinary Compose/kind; the isolated demo includes it.
- Legacy external-stack k6 helper now requires a key and the current /health endpoint, but
  high-volume seeding can hit normal rate limits; use `make perf` for the isolated test stack.
- `make demo` includes synthetic historical clicks and review fixtures. They are not live
  classifier accuracy or throughput measurements. Six startup clicks exercise the real worker.
  Demo video and repository license remain unsupplied.
- CI evidence is tied to specific prior commits. The final audit branch must be pushed and its
  checks reviewed separately. CodeQL was not executed locally; a prior successful public run
  is linked in the audit. Optional Codecov is not a local validation requirement.

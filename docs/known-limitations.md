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
- **Local kind load gate:** this audit deployed successfully and passed HTTP/auth/rate-limit
  smoke checks, but dropped 2 scheduled k6 iterations. p95 was 90.12ms and HTTP errors zero.
  The strict gate correctly failed. Root cause is not established; repeat under documented
  Docker CPU/RAM and generator conditions and investigate, without weakening the threshold.
- **Docker Desktop integration setup:** default Testcontainers Ryuk setup failed before tests.
  The documented `TESTCONTAINERS_RYUK_DISABLED=true` workaround passed all selected integration
  tests, but removes crash-cleanup protection. Normal fixture cleanup remains; fix helper/socket
  startup before relying on default local execution. Do not globally disable Ryuk in CI.
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
- Public abuse evaluation recall is 9.375% (3/32 malicious examples flagged), despite 100%
  precision on only three positive predictions. The 61-example holdout is small and labels/group
  splits do not eliminate all campaign leakage. Synthetic fixture regression is not field accuracy.
- Heuristics do not fetch pages. URLs may redirect before classification; false positives and
  false negatives remain. Query removal does not make a sensitive path safe to send externally.
  Free-tier provider terms/quotas may change; no live inference was invoked in this audit.
- Trace/log filtering trades away debugging detail; durable destinations and encoded DLQ
  payloads can still contain sensitive data. Base64 is not encryption.

## Tooling and operations

- README ports must be free; an existing stack blocked the exact fresh-clone start. `make up`
  is detached startup, not an all-services-readiness guarantee. Grafana needed 8 seconds in a
  separate readiness check. Frontend runs separately from Compose/kind.
- Legacy external-stack k6 helper now requires a key and the current /health endpoint, but
  high-volume seeding can hit normal rate limits; use `make perf` for the isolated test stack.
- `make demo` is still the step 8.3 placeholder. Demo video and repository license are not
  supplied. These are intentional visible gaps, not completed features.
- CI evidence is tied to specific prior commits. The final audit branch must be pushed and its
  checks reviewed separately. CodeQL was not executed locally; a prior successful public run
  is linked in the audit. Optional Codecov is not a local validation requirement.

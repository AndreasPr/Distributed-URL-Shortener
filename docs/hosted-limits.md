# Hosted limits and degraded operation

- The **foreground healthy cache-hit redirect performs two Redis client commands**:
  one `EVAL` token bucket and one `GET` destination. The command-counting assembled
  app test in `tests/test_hosted_profile.py` verifies this. Lua's internal commands
  are not separate network round trips; provider billing may count them differently.
  Background event publication (`XADD`), stream polling/ack/lag, cache misses,
  invalidations and rejected-request telemetry are additional commands. This is not
  a claim of two total billable commands per click. Pipelining these two calls would
  couple pre-routing rate enforcement to endpoint loading without reducing commands.
- Cache hits still query PostgreSQL for deletion/expiry and abuse enforcement.
  Availability cannot survive PostgreSQL failure. Quota exhaustion does not bypass
  deletion, expiry, tenancy, authorization or blocking decisions.
- Only `APP_ROLE=all` uses the in-process fallback token bucket. Redis connection,
  timeout or recognized quota errors open the breaker immediately. Rate limits use
  the same route/principal/IP identity in a lock-protected, 10,000-entry LRU map.
  Capacity/refill/headers remain the same. Buckets reset on eviction/process restart
  and are independent across instances; switching to/from Redis can grant a fresh
  burst. This is a weaker abuse boundary than distributed limits.
- Local/kind writes keep their fail-closed policy. Hosted redirects fall back to
  PostgreSQL, and `redis_degraded_total` counts failed/bypassed guarded operations.
  After five seconds one half-open probe tries recovery. Invalid Redis commands are
  still errors, not silently treated as quota failures. `/health` reports Redis
  degraded while `/livez` remains healthy.
- In hosted mode Redis Streams operations share this breaker. Durable pending events
  can be recovered; the bounded in-memory click publisher eventually drops events
  if publishing cannot recover within its retry budget, or on process termination.
  `events_dropped_total` is the evidence. Creation events retain the database outbox.
- Idle consumers still poll Streams and collect lag. A low daily Redis quota can be
  exhausted without much user traffic. No quota-sustainability or exactly-once
  delivery claim is made. The database deduplicates analytics effects by event ID.
- Fake LLM with a zero budget makes no paid or live-provider call. It is not a real
  model accuracy demonstration. Configure a free/local provider deliberately if
  desired, accounting for resource use, timeout and privacy policy.
- One process/container shares CPU and memory; no independent scaling, high
  availability, durable local disk or guaranteed analytics freshness during sleep.
  Render cold boot/image startup may exceed one second. The subsecond test measures
  readiness-independent `/livez` after lifespan starts, not platform provisioning.
- Cooperative shutdown has a bounded deadline; stuck I/O can leave daemon threads
  unfinished. Do not interpret bounded termination as guaranteed final flush under
  an arbitrary database/network hang. Transactions/acks preserve replay safety.

## Hosted OTLP telemetry

Traces and a small metric set can be pushed directly to Grafana Cloud. The metric
exporter starts only in the production API process; local Jaeger remains trace-only. Logs remain
Render stdout; no hosted log export is implemented. The startup probe validates
trace-endpoint acceptance only; metric permissions, dashboards and alert email
require manual verification. Disabled telemetry sends neither signal. Export
errors are sanitized and logged at most once per ten minutes across both signals.

The metric set is requests/latency by route template and status class; global
redirect cache hits/misses, Redis degraded operations, auth failures, committed
signups and links; two hosted consumer lags; pool used/idle; and a heartbeat.
No code, user, workspace, IP, host or arbitrary error reason labels are exported.
The tested upper bound is **1,877 series per resource/process**: 41 possible route
values (40 templates plus `other`) × 5 status classes × 9 counter/histogram series,
plus 32 reserved series for other metrics/metadata. New routes beyond the bound
collapse to `other`; tests require deliberate review. Restarts, replicas, Cloud
resource promotion, retention and other services can increase account-wide series.
This bound is not a measured Cloud quota guarantee. Exports run every 60 seconds.
Counter state resets at restart; last-minute events can be lost on termination.

Redirect head sampling records 10% statistically, not exactly every tenth request.
Writes are always sampled even with an unsampled incoming parent. Errors (HTTP
4xx/5xx) get separate always-sampled summary spans; their unsampled request trees
cannot be recovered. `/livez` and `/health` spans and metric requests are excluded.
Metrics themselves are not sampled. Probe traffic therefore does not distort the
request ratios, and the heartbeat identifies missing telemetry while idle.

Render sleep yields missing metrics/traces and can trigger the 10-minute no-data
alert; it can also time out an hourly synthetic check. This is best effort, not
an always-on SLO or free-tier capacity claim. No live Cloud delivery was tested.

## Free-tier operating limits (checked 2026-11-16)

Account dashboards and current provider terms are authoritative; included amounts
can change. No automatic paid upgrade or overage permission is introduced. Advisory
70%/90% issues cover API-measured limits only. Unknown provider billing usage is
not reported as zero. Sources: [Render Free](https://render.com/docs/free),
[Render pricing](https://render.com/pricing),
[Supabase pricing](https://supabase.com/pricing),
[Supabase database/disk distinction](https://supabase.com/docs/guides/platform/database-size),
[Grafana pricing](https://grafana.com/pricing/),
[Grafana usage limits](https://grafana.com/docs/grafana-cloud/platform/pricing-and-usage/usage-limits/).

| Resource / included allowance | What happens at the boundary | Operator response / evidence |
|---|---|---|
| Render Free web service: 750 running instance-hours/workspace/month | Exhaustion suspends free web services until reset. One always-running service consumes up to 744 hours in a 31-day month; multiple services share hours. | Check Render usage; stop unnecessary services/monitors. No app API measurement. |
| Render free service idle spin-down: about 15 minutes | Next request cold-starts; probes can time out. Maintenance/restarts still occur. | Browser 90s readiness UX; inspect health. Monitoring is not an SLA or guarantee against suspension. |
| Render Hobby included outbound bandwidth: currently 5 GB/month; confirm your account | Additional usage may be billed when a payment method permits it, or service suspended without one. | Inspect workspace usage/billing controls; reduce traffic before exhaustion. Do not authorize paid overages. Not measured by `/admin/usage`. |
| Render Free Key Value: 25 MB RAM, 50 connections, one free instance/workspace | With `noeviction`, memory pressure rejects writes; disconnects/maintenance degrade service. Restarts lose all data. | API memory estimate and 70/90% issues; reduce retained Streams/cache data cautiously. DB outbox survives; accepted click events in ephemeral Streams may not. |
| Render Key Value commands | No published fixed daily/monthly command quota for this tier; do not invent an Upstash quota for Render. | INFO recent ops/s and daily extrapolation are estimates. Set a command budget explicitly if changing providers; default 0 = unconfigured. |
| Supabase Free database: 500 MB included/project | Database-size quota differs from disk capacity; disk 95% read-only protection is a separate limit. Do not assume 500 MB is the precise read-only trigger. | Measure database size, inspect dashboard warnings, export/clean eligible old data before the limit. No automatic deletion. |
| Supabase Free inactivity: low activity over 7 days | Project can pause; API becomes unavailable until resumed. Health queries alone are not a provider guarantee of sufficient activity. | Inspect dashboard, resume manually; monitor real usage and last backup. |
| Supabase Free egress 5 GB, storage 1 GB, 50,000 MAU (current advertised allowances) | Provider limits/enforcement apply; database backups also consume network transfer. | Check Supabase billing/usage; these are not measured by the app quota endpoint. No storage-file backup claim. |
| Grafana Cloud Free metrics: 10,000 active series, 14-day retention | Ingestion limits can reject data; data older than retention expires. Account limits may differ. | Inspect `grafanacloud-usage`, native limit alerts and exporter failures. App cardinality tests do not measure total Cloud usage. |
| Grafana Cloud Free traces/logs: current advertised 50 GB/month each, 14-day retention | Excess ingestion may be rejected; older data expires. This app exports traces, not hosted logs. | Review Cloud usage. Lower trace volume/disable SDK before exceeding allowance; no log-shipping claim. |
| LLM process budget: `LLM_DAILY_BUDGET`; hosted default 0 | Admission refuses calls; real provider RPM/TPM/RPD limits may reject sooner. Restart resets in-process counts. | Turn `LLM_ENABLED=false` for heuristics only; inspect provider's actual quotas. Estimate is not provider billing evidence. |
| Free application plan: 20 links/user/day, 200 active links/workspace by default | API returns 429 daily / 402 workspace-cap responses. | Delete eligible links or pause creation; largest-workspace usage is monitored without publishing tenant identifiers. |
| Nightly artifacts: 14-day retention; storage subject to GitHub account limits | Older artifacts expire; failed scheduled jobs leave no new backup. | Inspect last successful encrypted artifact; private-key recovery test; account storage dashboard. |

See [uptime and controls](uptime.md) for monitor command arithmetic, opt-in GitHub
workflows, API-key authorization and kill switches. See [backups](backups.md) for
encrypted dump setup and limitations. The tiny live smoke is manual only and has
20 requests, not a free-tier load test.

# Monitoring runbook

Use Prometheus at http://localhost:9090 (Alerts, Targets, and query UI) and Grafana
at http://localhost:3001. Kubernetes: port-forward the respective Services first.
There is no Alertmanager/notification receiver yet: inspect Prometheus Alerts.
Use `docker compose --profile redis-streams logs --since=15m api-redis worker-redis`
or `--profile kafka logs --since=15m api worker`; inspect dependency logs as needed.
Never paste credentials, full destination URLs, event payloads or keys into tickets.

## RedirectAvailabilityFastBurn

**Meaning:** Both 5m/1h error ratios exceed 1.44% for 2m; the 99.9% budget is
being spent quickly. This is the critical availability alert.

**Confirm:** Query `redirect:slo_burn_rate:5m` and `redirect:slo_burn_rate:1h`.
Check per-instance `rate(http_requests_total{handler="/{code}",method="GET",status=~"5.."}[5m])`
and Targets. Inspect `/health` and a known active redirect using GET without `-L`.
Find a failing request's trace ID in JSON logs and Jaeger (service api).

**Likely causes:** PostgreSQL failures/timeouts, bad deployment, exhausted DB
pool, resource throttling, or a dependency outage coinciding with cold caches.

**Mitigate:** Restore database/network capacity first. Compare the incident start
to deployment timing and roll back a confirmed bad image/config. Avoid repeatedly
restarting every replica or clearing Redis, which can amplify database load.

**Recovery:** Known redirects return 307; 5xx rates fall and the alert resolves
once one paired window drops below threshold. Continue watching the longer window
and `redirect:slo_error_budget_remaining:30d`; it does not instantly reset.

## RedirectAvailabilitySlowBurn

**Meaning:** Both 30m/6h error ratios exceed 0.6% for 15m: a persistent, smaller
failure is consuming the availability budget.

**Confirm:** Query `redirect:slo_burn_rate:30m` and `redirect:slo_burn_rate:6h`;
break errors down by instance and correlate traces/logs over six hours. Check
traffic counts: a few failures can dominate a low-traffic development stack.

**Likely causes:** Intermittent timeouts, one unhealthy replica, connection leaks,
resource pressure or an unrepaired regression.

**Mitigate:** Identify the affected instance/dependency. Correct capacity or
configuration and prioritize the regression over new features. Use a targeted
restart/rollback only when evidence supports it.

**Recovery:** Observe falling paired-window burn, alert resolution, and a stable
request-success trend. Verify the fix across all replicas, not just one Service
request. The rolling budget may remain negative after immediate recovery.

## AnalyticsConsumerLagHigh

**Meaning:** Backlog exceeds 1,000 for 10m. Kafka counts offset distance; Redis
counts group unread plus pending. This is not a direct freshness measurement.

**Confirm:** Query `analytics:backlog` and
`consumer_lag{job="url-shortener-worker"}`. Check
`time() - analytics_broker_metrics_last_success_timestamp_seconds{job="url-shortener-worker"}`:
if stale, handle AnalyticsTelemetryStale first. Check worker target and logs.
Do not interpret Redis `stream_length` as backlog.

**Likely causes:** Stopped/slow workers, database commit errors, broker failures,
poison messages, traffic above processing capacity, or pending recovery delays.

**Mitigate:** Restore workers and database connectivity. Investigate errors before
increasing concurrency. Consider replicas/batch tuning only after checking database
capacity and Kafka partition count. Do not reset offsets, delete streams or ack
uncommitted messages. Redis recovery waits for EVENT_CLAIM_IDLE_MS.

**Recovery:** Backlog falls below threshold and remains bounded under traffic;
`events_consumed_total` and committed analytics progress. Check a known click in
the authenticated analytics API; backlog alone cannot prove 99% freshness.

## DeadLetterGrowth

**Meaning:** At least one confirmed DLQ publication occurred in the previous
15 minutes, sustained across a minute. Repeated retries may publish duplicates.

**Confirm:** Query `sum(increase(dlq_events_total{job="url-shortener-worker"}[15m]))`
and `analytics:dlq_retained_size`. Inspect worker error types/trace IDs. Use
`python -m app.cli dlq list` inside the appropriate worker container only in a
private terminal; CLI output can include payloads and must not be copied to logs.

**Likely causes:** Malformed JSON, unsupported schema version, invalid code/data,
or poison rows exhausting three processing attempts.

**Mitigate:** Correct the producer/schema/data issue first. Review the existing CLI
help before a targeted `python -m app.cli dlq replay` operation. Do not blindly
replay every entry. Replay preserves event IDs for database deduplication; it does
not remove retained DLQ records. Never use a broker purge as incident resolution.

**Recovery:** Confirm replayed events are visible and no new DLQ publications
occur. The growth alert clears after the 15-minute lookback expires; retained size
may stay unchanged until retention or a deliberate, separately reviewed cleanup.

## RedisCircuitBreakerOpen

**Meaning:** At least one API circuit has remained open or half-open for 2m.
Redirects fall back to PostgreSQL; writes fail closed when Redis is unavailable.

**Confirm:** Query `circuit_breaker_state{job="url-shortener-api"}` (0 closed,
1 open, 2 half-open), Redis/cache errors, and `/health`. Inspect Redis health,
connection timeouts, pod networking and resource limits. Gauge state changes on
operations; an idle API may retain its previous state until probed.

**Likely causes:** Redis stopped/slow, network or configuration error, exhausted
resources, or a failed recovery probe.

**Mitigate:** Restore Redis/network access and capacity; preserve its stream/data
volume. Do not bypass write limiting or repeatedly force the breaker closed.
A `/health` request after cooldown can exercise recovery.

**Recovery:** All API circuit gauges become 0, health returns 200, redirects still
work, and authenticated writes succeed. Watch fallback and cache-miss rates as
cache contents warm.

## HighCacheMissRatio

**Meaning:** More than 50% of cache lookups miss with over 100 lookups in 5m,
lasting 15m. These are lookup counts, not unique redirect requests.

**Confirm:** Query `cache:miss_ratio:5m`, cache hit/miss rates, fallback counters
and circuit state. Compare with deploys/Redis restarts and incoming traffic.

**Likely causes:** Cold cache, eviction/memory pressure, TTL configuration,
unknown-code scanning, changed traffic distribution or Redis failures.

**Mitigate:** Fix Redis failures first. Inspect memory/eviction policy and tune
capacity or TTL only with expiry/deletion guarantees preserved. Investigate abuse
using aggregate rates; do not log full URLs or disable public rate limits. Avoid
flushing the cache. Normal traffic can warm a cold cache gradually.

**Recovery:** Miss ratio returns below 50% under sufficient traffic, database load
stabilizes and the alert resolves. A vanished series or no traffic is not evidence
that cache effectiveness improved.

## TelemetryTargetDown

**Meaning:** An API/worker target is unreachable or its entire job disappears.
Availability can look healthy while traffic or telemetry is missing.

**Confirm:** Open Targets and query `up{job=~"url-shortener-api|url-shortener-worker"}`.
Check Prometheus configuration, metrics ports, DNS/headless Services, NetworkPolicies
and pod readiness. In Compose confirm the selected profile exposes the api/worker
network aliases.

**Likely causes:** Process/pod down, wrong scrape address, blocked metrics traffic,
DNS failure, configuration reload error or resource exhaustion.

**Mitigate:** Restore the service or scrape path. Validate rules/config before
restarting Prometheus. Kubernetes API/worker metrics must be scraped individually
via headless-service DNS; do not replace this with load-balanced counter scraping.
Check the PVC is bound if Prometheus itself cannot start (it cannot alert on its
own complete outage).

**Recovery:** Every expected replica is present and up=1; missing-job alerts clear,
samples advance and rule evaluations have no errors. Record the monitoring gap;
rolling compliance during missing data is incomplete.

## AnalyticsTelemetryStale

**Meaning:** Backlog/DLQ inspection has not succeeded for more than 120 seconds,
sustained for 2m, or its freshness/backlog metric is missing or unread lag is unknown (NaN). Last reported sizes may be old.

**Confirm:** Query the worker's last-success timestamp and target up state; inspect
worker logs for broker/metadata errors. Check deployment versions if the metric
is absent. This timestamp is monitoring freshness, not click-event freshness.

**Likely causes:** Broker unavailable, Kafka metadata timeouts, Redis group errors,
stalled worker/database processing, or an old worker image.

**Mitigate:** Restore broker/group connectivity, inspect transaction stalls, and
deploy the current worker. Avoid resetting consumer state. Kafka DLQ metadata
inspection may require topic visibility/auto-creation in this local setup.

**Recovery:** The timestamp advances roughly every five seconds and backlog/DLQ
values are plausible; both this alert and any underlying lag alert clear.

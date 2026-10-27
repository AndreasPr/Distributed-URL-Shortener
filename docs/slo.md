# Service-level objectives

These are targets for the URL shortener, not claims that a fresh local stack has
already met them. Evaluate a rolling **30-day** window. Counts are aggregated
across instances before computing ratios; never average per-instance percentages.

| Objective | Good / eligible events | Target and rationale |
| --- | --- | --- |
| Redirect availability | Non-5xx responses / all observed GET requests matching `/{code}` | **99.9%** over 30 days. 404, 410 and 429 count as available per this definition; they do not guarantee a successful redirect. |
| Cache-hit redirect latency | Successful positive cache-hit redirects completed in under 100 ms / successful positive cache-hit redirects | **95% under 100 ms** over 30 days. Measure server request start through response completion, excluding client network time. Positive hits still make a lifecycle query to PostgreSQL. |
| Cache-miss redirect latency | Successful redirects whose first lookup missed (including coalesced waits/fallback) completed in under 500 ms / all such successful redirects | **95% under 500 ms** over 30 days. Five times the hit target allows a bounded cache-lock wait, database lookup and cache refill. This is an initial engineering target, not a measured capacity result; revisit after load testing. |
| Analytics freshness | Unique click events committed and visible in PostgreSQL within 60 seconds of `occurred_at` / all unique eligible click events | **99% within 60 seconds** over 30 days. Includes events dropped before broker acceptance and poison/dead-letter events in the denominator; missing events are failures, not excluded samples. |

Latency cohorts exclude 404/410/429 and 5xx; availability and operational alerts
cover those separately. Redirects that never reach the application, ingress
failures, DNS/TLS failures, and lost scrapes are not visible in the request SLI.
External probes are future work. Synchronize process clocks before measuring
cross-process freshness. Count unique event IDs, not retries/redeliveries.

## What is measurable today

**Availability is implemented** using `http_requests_total` with
`job="url-shortener-api", handler="/{code}", method="GET"`; status labels are
grouped as `3xx`, `4xx`, `5xx`. Recording rules also accept numeric 5xx labels.
The assembled-app test proves that a failing redirect increments this selector
while `/livez` does not. Zero traffic or missing data yields no availability
sample, not an invented 100% success. No observed 5xx with real traffic yields 100%.

**The two latency and freshness targets are defined, but not yet measurable with
existing metrics.** There is no full-request redirect histogram labelled by
cache outcome. The general request histogram and global hit/miss counters cannot
be combined to recover that distribution. Freshness needs a commit-time age
histogram plus an authoritative denominator/accounting for missing/dropped events;
measuring only successfully consumed events would hide losses. `consumer_lag`
and `events_dropped_total` are diagnostics, not proof of the 60-second SLO.
Dashboards therefore show measured availability and do not invent compliance for
these other objectives. This step changes monitoring, not redirect/event semantics.

## Error budgets in plain words

A 99.9% request availability target permits **one 5xx per 1,000 observed requests**.
With one million requests, the allowance is 1,000 errors. It is not automatically
43.2 minutes of downtime: that time equivalence assumes uniform traffic and total
failure during those minutes. Latency budgets permit five slow requests in every
100 within each cohort; freshness permits one late or missing event per 100.

Availability budget remaining is `1 - (observed_error_ratio / 0.001)`.
100% means none of the allowance has been used; 0% means exhausted; negative means
overspent. It rolls with the 30-day window, rather than resetting each month.
Use exhausted budgets to prioritize reliability fixes and slow risky releases;
this repository does not automatically block deployments.

## Recording and alerts

Canonical rules: [prometheus/rules/slo.yml](../prometheus/rules/slo.yml).
Fast burn requires **both 5m and 1h > 14.4x** budget burn for 2m; this is an
error ratio above 1.44%, spending about 2% of the monthly allowance per hour.
Slow burn requires **both 30m and 6h > 6x** for 15m; error ratio above 0.6%,
spending about 5% of the allowance in six hours. The short window ensures the
incident is still active. Additional `for` durations damp noise but delay firing.
These thresholds follow the [Google SRE workbook](https://sre.google/workbook/alerting-on-slos/).

Operational thresholds are starting points: backlog >1,000 for 10m; any DLQ
publication over 15m for 1m; any open/half-open API circuit for 2m; cache misses
>50% with >100 lookups/5m for 15m. Target-down and stale-worker-telemetry alerts
prevent missing or frozen data from being mistaken for health. Low traffic
still permits burn alerts; investigate sample counts before interpreting them.

Use one event backend per deployment. Redis backlog is **group unread + pending**, never stream length (acknowledged
history remains in the stream). Replica group gauges are aggregated with max,
not summed. Kafka backlog sums assigned partition end-minus-committed offsets;
a new group uses earliest retained offsets. Kafka offset gaps mean estimates,
not exact message counts. DLQ size is retained Redis entries or the retained
Kafka offset range (upper bound). Replay does not delete DLQ records, so this
panel is not an unresolved-incident count. The growth alert uses publication
increases, which survive counter resets, rather than changes in retained size.

## Data retention and rollout

Compose stores Prometheus data in `prometheus_data`; Kubernetes requests a 5Gi
PVC and uses a Recreate strategy. Retention is 35 days, allowing margin around
30-day calculations. This does not guarantee enough disk space: size storage
for actual cardinality/traffic. Do not use `down -v` if you want to retain history.
Old ephemeral Prometheus data is not automatically migrated into the new volume.

Kubernetes metrics Services `api-metrics` and `worker` become headless. Prometheus
uses DNS discovery to scrape each pod separately, including unready pods; scraping a load-balanced
Service would mix independent counters. Existing Services need recreation because
clusterIP is immutable. Do this during a monitoring maintenance window, not by
deleting application Deployments or database volumes. The PVC requires a default
storage class (or a deliberately chosen class); check binding/permissions for UID
65534. Existing DNS/metrics NetworkPolicies permit these flows.

A new deployment, restart without storage, or scrape outage produces partial
history. A 30-day selector evaluates whatever data exists; **do not certify the
30-day objective until complete history is available**. Check Targets and alert
state alongside the dashboard. Prometheus stores/fires alerts locally; no
Alertmanager or notification destination is configured in this step.

After editing canonical rules/dashboard, run
`.venv/bin/python scripts/sync-monitoring.py`. Tests require the committed
Kubernetes ConfigMaps to match. Apply `k8s/base/prometheus/rules-configmap.yaml` before
the Prometheus Deployment. Restart Prometheus after rule/config changes; mounted
ConfigMap updates alone do not guarantee rule reload. Grafana reloads its file
provider automatically. `make prometheus-check` validates and unit-tests rules;
`make check` now includes it. See [runbook](runbook.md) and
[verification](slo-verification.md).

The provisioned Prometheus datasource is selected by name and remains the default.
Do not assign a new UID when upgrading an existing Grafana volume: Grafana can
fail provisioning when the existing name has a different UID. Dashboard panels
use the default datasource so both existing generated UIDs and fresh installations
work without deleting or recreating datasource records. After updating these
files, run `docker compose restart grafana`; preserve the Grafana volume.

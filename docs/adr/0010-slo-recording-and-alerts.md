# ADR 0010: measured availability, burn alerts and provisioned monitoring

Status: accepted.

Use the existing route-template HTTP counter for the 99.9% redirect availability
SLI. Aggregate numerators/denominators across replicas, treat 4xx as available as
requested, and leave zero traffic/missing data undefined. Record 5m/1h and 30m/6h
burn windows with 14.4x/6x thresholds rather than alerting on a single noisy ratio.
The 30-day remaining-budget series may go negative; do not hide overspending.
Latency and freshness objectives are defined explicitly, but current metrics
cannot measure them honestly. Dedicated latency cohorts and complete event-loss
accounting are deferred rather than inferring them from unrelated counters.

Redis stream length is retained history, not backlog. Add XINFO GROUPS unread
lag and combine it with pending; group gauges use max across replicas. Kafka
uses partition lag and earliest retained offsets for new groups. Add retained
DLQ size inspection; Kafka offset gaps make it an upper bound, and replay does
not remove retained entries. Publication-counter growth detects new failures.
A last-success timestamp distinguishes frozen broker metrics from current data.

Canonical rules/dashboard remain in prometheus/rules and grafana/dashboards.
A deterministic sync script generates Kubernetes copies, and parity tests prevent
drift. Grafana file provisioning requires raw dashboard JSON, not an API envelope.
Prometheus rule syntax and synthetic time-series tests are blocking in make check;
use native promtool or the same pinned free Docker image as deployment.

Use 35-day retention with persistent storage. Kubernetes DNS discovery over
headless metrics Services avoids mixing independent pod counters behind a
load-balanced Service. This requires recreating those two existing Services and
binding a new Prometheus PVC; it does not change the public API Service.
Alertmanager/notification delivery and external probes are not added. Local Alerts
and runbooks are the operational surface. See docs/slo.md for measurement gaps,
partial-history caveats and the Google SRE reference behind the burn thresholds.

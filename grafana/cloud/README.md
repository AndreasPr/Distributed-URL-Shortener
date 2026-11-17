# Hosted dashboards and alerts (manual import)

These files are **templates**, validated offline, not evidence of live ingestion or
notification delivery. No hosted stdout logs are shipped. Use Grafana Cloud Free;
review usage before enabling. The alerts are operational thresholds, not a paid
or always-on uptime promise. They cover requests observed while the process runs.

1. After configuring OTLP, in Explore select the Cloud **Prometheus** data source.
   Confirm `relaymark_requests_total`, `relaymark_request_duration_seconds_bucket`,
   `relaymark_heartbeat`, and the other names in `dashboard.json` exist. Standard
   OTLP-to-Prometheus translation adds `_total` and `_seconds`; if your Cloud
   translation settings differ, adapt a private import copy. Do not expose /metrics.
2. Dashboards → New → Import → upload `dashboard.json`; select that data source.
3. Alerting → Contact points → Add contact point → Email. Name it
   `relaymark-email`, enter your address, save and use **Test**. The committed
   `email-contact-point.json` is the equivalent provisioning API request body.
4. Create a folder and note its UID and the Prometheus data-source UID. Copy the
   four `hosted-*.json` files outside the repo; replace `REPLACE_FOLDER_UID` and
   `REPLACE_PROMETHEUS_UID`. Each is a Grafana alert provisioning API body for
   **POST `/api/v1/provisioning/alert-rules`**, not a Prometheus rule file. Import
   with your stack's provisioning API using a private, narrowly scoped Grafana
   service-account token (different from the OTLP token), or recreate them in
   Alerting → Alert rules with the expressions, thresholds and durations shown.
   Keep tokens out of shell history; no token or email belongs in these files.
   The contact point can similarly be POSTed to `/api/v1/provisioning/contact-points`.
5. Set rule-group evaluation to one minute. In Notification policies add a child
   matching `project=relaymark`, route to `relaymark-email`. Do not replace an
   existing root notification policy. Verify firing **and resolved** delivery
   with a temporary test rule, then remove that test rule.
6. No-data uses `absent_over_time(relaymark_heartbeat[10m])`; it will fire during
   Render sleep as well as broken export. The other rules use No Data = OK and
   execution error = Error. Inspect notification routing for datasource errors.
   Multiple API processes require per-instance selectors for per-instance outages;
   the committed queries intentionally aggregate this one-service baseline.

`hosted-5xx`: >1% over 5m, held 5m. `hosted-latency`: redirect p95 >500ms
held 5m. `hosted-redis`: degraded operations over 5m held 2m. `hosted-no-data`:
10-minute absence, no additional hold. These are not the local 30-day burn rules.
Histogram interpolation is approximate, particularly at low traffic.

Synthetic Monitoring is separate: Testing & synthetics → Synthetic Monitoring →
New HTTP check → your API `/health` → expect 200 → **one probe**, **hourly**.
Review the displayed free-tier usage before saving. Inspect its result and cold
start timing; do not increase frequency to prevent Render from sleeping. No check
is created by these files. If your UI does not offer hourly checks, leave it
unconfigured and record the limitation rather than silently using a higher rate.

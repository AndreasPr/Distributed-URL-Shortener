# Grafana Dashboard Import Guide

The dashboard JSON is pre-built and ready to import at any time.

## Quick Import

1. Open Grafana: `http://localhost:3001` (${GRAFANA_ADMIN_USER}/${GRAFANA_ADMIN_PASSWORD})
2. Click **+** → **Import** (left sidebar)
3. Paste the JSON from `grafana/dashboards/url-shortener-dashboard.json`
4. Click **Import**

## What You Get

- 8 panels tracking request throughput, latency, cache hit ratio, errors, and Kafka processing
- Auto-refreshing metrics (10s)
- All PromQL queries documented in the dashboard

## Hosted Grafana Cloud

Use [grafana/cloud](../grafana/cloud/README.md) for the separate ten-panel hosted
dashboard, four alert provisioning templates and email contact point. They use the
small OTLP metric set, not the local Prometheus scrape. Follow [hosting runbook
section 8](hosting-runbook.md#8-grafana-cloud-and-uptime-monitoring) for token scopes,
header encoding, imports and the hourly one-probe Synthetic Monitoring check.
No hosted logs, live dashboard delivery or email notification success is claimed.
No-data alerts can mean Render sleep; all hosted SLOs are best effort.

# Grafana Dashboard Import Guide

The dashboard JSON is pre-built and ready to import at any time.

## Quick Import

1. Open Grafana: `http://localhost:3000` (admin/admin)
2. Click **+** → **Import** (left sidebar)
3. Paste the JSON from `grafana/dashboards/url-shortener-dashboard.json`
4. Click **Import**

## What You Get

- 8 panels tracking request throughput, latency, cache hit ratio, errors, and Kafka processing
- Auto-refreshing metrics (10s)
- All PromQL queries documented in the dashboard
# MCP Server for Abuse Flagging

This MCP server continuously inspects runtime telemetry from the URL shortener and flags suspicious activity for human review. It combines runtime signals, code history, and operator notifications to help detect and triage abuse quickly.

## What it uses
- **Project data**: Postgres and Redis signals from the URL shortener runtime.
- **GitHub**: recent commits/PRs in this repository to correlate suspicious activity with recent code changes.
- **Slack**: posts concise reports to a human review channel when an anomaly is flagged.

## Primary Workflow

The main tool is `CheckSuspiciousUrlActivityTool`. When invoked it:

1. Reads click velocity, cache health, and rate-limit triggers from Postgres and Redis.
2. Fetches recent GitHub commits and inspects changed files for correlation.
3. Flags suspicious short codes based on configured thresholds (velocity vs baseline, rate-limit triggers, suspected bot patterns).
4. Optionally posts a Slack report with metrics and a related commit for operator triage.

The tool always returns a structured result including diagnostics even if one or more sources fail.

## Per-source behavior

- **Project data (Postgres + Redis)**
  - Reads `analytics` click timestamps, resolves long URLs from the URL table, scans Redis rate-limit keys, and checks cache availability/dbsize.
  - No external auth required — it reuses the app's DB/Redis configuration.
  - Failures raise structured `SourceError`; the workflow continues with partial data.

- **GitHub**
  - Fetches recent commits from the configured repo and, when available, per-commit file lists to help correlate suspicious activity with recent code changes.
  - Requires `GITHUB_TOKEN`; `GITHUB_REPOSITORY` can be set to avoid using `git remote` resolution.
  - Rate-limited or non-2xx responses are surfaced as `SourceError` with details.

- **Slack**
  - Formats an alert with the flagged URL, metrics, related commit, and cache diagnostics and posts it to a webhook.
  - Posting is gated by `MCP_SLACK_POST_ENABLED=true` and requires `SLACK_WEBHOOK_URL`.
  - Invalid payloads or webhook failures raise `SourceError` and are recorded in the workflow result.

## Thresholds (defaults and rationale)

- `ABNORMAL_VELOCITY_MULTIPLIER = 3.0` — flag when current velocity is >3× baseline; avoids false positives from small fluctuations.
- `ABNORMAL_VELOCITY_MIN_CLICKS = 10` — require at least 10 clicks to consider spikes meaningful when no baseline exists.
- `RATE_LIMIT_TRIGGER_THRESHOLD = 5` — treat multiple rate-limit triggers as an indicator that upstream protections are being hit.
- `SUSPECTED_BOT_PATTERN_THRESHOLD = 10` — aggregated trigger counts above this suggest bot-like behavior.
- `BASELINE_HISTORY_MINUTES = 1440` (24h) — use 24 hours of history for rolling averages to smooth daily patterns.

These defaults are conservative for small/medium traffic. Tune them for your environment: lower for low-traffic apps, higher for very high-volume systems.

## Local setup

1. Create a Python virtual environment and install dependencies:

```bash
cd mcp-server
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
# fill in DB/Redis/GITHUB_TOKEN/SLACK_WEBHOOK_URL etc. in .env
```

2. Run the MCP server locally:

```bash
source .venv/bin/activate
python -m mcp_server.app
```

3. Quick invoke (JSON-RPC POST to `/mcp`):

```bash
curl -i -X POST http://127.0.0.1:8001/mcp \
  -H "Accept: application/json, text/event-stream" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"CheckSuspiciousUrlActivityTool","arguments":{"time_window_minutes":60}}}'
```

4. Run tests:

```bash
cd mcp-server
source ../.venv/bin/activate
pytest -q
```

## Limitations and what I'd improve

- GitHub repository resolution currently tries to read the local `git remote`. For CI/production you should set `GITHUB_REPOSITORY` explicitly.
- Heuristics are intentionally simple (multipliers and fixed thresholds). A more robust approach would use learned or percentile baselines and seasonal adjustments.
- Slack posting is one-shot with no retry/backoff. Add retries, exponential backoff, and idempotency protection for production.
- Secrets are read from `.env`; use a secret manager in production and rotate tokens.
- The server performs synchronous checks; for scale, consider batching, sampling, or background correlation workers.

---

See the examples and tests under `mcp-server/tests` for usage and expected behaviors.

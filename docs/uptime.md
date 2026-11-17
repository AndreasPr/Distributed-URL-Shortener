# Free-tier availability, monitoring and recovery

This is a best-effort hobby deployment, not an always-on SLA. Checked against
provider documentation on 2026-11-16. Frequent probes can reduce idle periods but
cannot guarantee that Render stays running or that Supabase considers a project
active. Outages, maintenance, quota limits, schedule delays and project pauses
still happen. Do not buy resources or enable paid overages for this setup.

## Cold-start UX

The browser shares one readiness flight per API origin. Before the first API
operation (including local login and writes), it probes `/health`. After 3 seconds
it shows “Waking up the free-tier server, this takes up to about a minute”. Failed
probes retry after 1, 2, 4, 8, then at most 10 seconds, within a 90-second readiness
window. Only a successful health body (`status=ok`) releases queued operations.
Raw transport/provider errors are never shown. After the deadline the user gets a
friendly retry message. Credentials/permission errors after readiness retain their
specific messages, rather than being misrepresented as a cold start.

Mutations are sent once, **never blindly replayed**: a timed-out create might have
committed. Check the links list before resubmitting. The banner polls health and
public `/status` once per minute while the page is visible; the browser-only
`/demo` remains entirely offline. Slow/unavailable services are not hidden forever.

## Primary monitor (manual setup)

Use your existing free UptimeRobot or Better Stack account. Create one HTTP(S)
monitor for your **API** `/health`, interval **5 minutes**, expected status **200**,
and configure your own notification address. Use the provider's free available
interval/timeout; never add paid capacity. A first cold request can time out before
Render wakes, so inspect consecutive results and Render logs before diagnosing.

`/livez` is deliberately not the dependency monitor. `/health` executes `SELECT 1`,
counts URLs, and attempts Redis `PING`; its 503 body names dependency failures and
includes worker readiness. These requests perform real DB/Redis activity but do
not prove that a provider's inactivity policy will be satisfied.

## GitHub backup monitor

`.github/workflows/uptime.yml` runs at minutes 2, 7, 12, …, 57. On the repository's
**default branch**, set Settings → Secrets and variables → Actions → Variables:

- `API_ORIGIN`: the credential-free HTTPS API origin (no path).
- `UPTIME_MONITOR_ENABLED=true`: explicit opt-in.

Run **Hosted health backup monitor → Run workflow** once. It makes one request,
allows up to 90 seconds, validates status/database/Redis, and exits nonzero on
failure. No response bodies or credentials are logged. GitHub's schedule can be
delayed or dropped under load; public repository schedules disable after 60 days
without repository activity. A failed job is visible in Actions; configure GitHub
notification preferences. This is a backup monitor, not a precise scheduler or an
availability guarantee. Disable with `UPTIME_MONITOR_ENABLED=false`.

[GitHub schedule documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule),
[Render Free limitations](https://render.com/docs/free),
[Supabase pausing](https://supabase.com/docs/guides/platform/free-project-pausing).

## Redis command arithmetic

Steady state on an established connection, `/health` performs **one Redis PING**.
`tests/test_free_tier_reliability.py` asserts that count and the database query.

| Source | Calls/day | Steady-state Redis commands/day |
|---|---:|---:|
| One primary monitor, every 5 minutes | 24 × 60 / 5 = 288 | 288 |
| GitHub backup schedule, every 5 minutes | 288 nominal | 288 |
| Both enabled | 576 nominal | **576** |
| Optional hourly Grafana synthetic (previous step) | 24 | 24 additional |
| Hourly quota workflow | 24 | 24 INFO calls additional |

Connection setup (AUTH/CLIENT negotiation), reconnects, browser readiness probes,
visible-page polling, Render's own probes, retries configured in external monitors,
and worker Streams polling are additional. An open circuit can prevent the PING
from being sent. Browser warmup uses at most 12 immediate-failure probes per
90-second flight; slower attempts reduce that count. These figures are not billing
invoices or a promise that this is all Redis usage. With primary+backup+hourly
synthetic+quota, the planned monitor calls total 624 commands/day, excluding the
extras. Render Free Key Value has no published per-command monthly quota; memory,
connections and ephemeral data remain constraints.

## Kill switches

Set these on Render (server-only) and redeploy. Public `/status` returns only their
boolean effective state, with `Cache-Control: no-store`; the UI displays banners.

| Setting | Effect |
|---|---|
| `SIGNUPS_ENABLED=false` | Rejects first local user/workspace provisioning. Existing accounts can sign in; signup UI is disabled once status is received. |
| `LINK_CREATION_ENABLED=false` | POST `/shorten` returns 503 `link_creation_disabled`. |
| `LLM_ENABLED=false` | Provider calls refuse before admission/network I/O; abuse classification remains heuristic. |
| `READ_ONLY_MODE=true` | Product mutating HTTP routes return 503 `read_only_mode`; local dev login and warning continuation remain available. New user provisioning is also disabled. |

These do not block GET redirects, health, exports or reads. Malicious/expired/
deleted links retain their existing restrictions. “Read-only” is **application
admission**, not database read-only: login bookkeeping, analytics, rate limits,
workers and scheduled retention still write. Do not use it as a complete database
write freeze. Supabase signup is an independent public service: to stop upstream
identity creation too, disable **Allow new users to sign up** in Supabase Auth.
OAuth login can create an upstream identity even if local provisioning is blocked.
No server flag can revoke the public Supabase signup endpoint by itself.

## Quota guard

GET `/admin/usage` requires a verified human platform admin, or (only on this
endpoint) an active admin-scope API key whose active verified creator is in
`PLATFORM_ADMIN_EMAILS`. Key membership/scopes/revocation are checked by the normal
authenticator. Other global admin endpoints remain human-only.

Measurements: PostgreSQL database bytes, Redis used memory, recent server-wide
command-rate estimate and daily extrapolation, process-local LLM daily budget,
active link count, and largest workspace's active link count. Limits are settings:
`USAGE_DATABASE_LIMIT_BYTES`, `USAGE_REDIS_LIMIT_BYTES`,
`USAGE_REDIS_DAILY_COMMAND_LIMIT`, `USAGE_TOTAL_LINK_LIMIT`, plus existing
`LLM_DAILY_BUDGET` and `FREE_WORKSPACE_LINKS`. Zero advisory limits mean unconfigured;
zero LLM budget disables calls. Unknown measurements return `unavailable`, not 0.
LLM usage resets on process restart; rate extrapolation is not actual daily usage.

Create a dedicated admin key as a platform-admin user. Store it privately as
GitHub **production environment secret** `USAGE_API_KEY`, set variable
`QUOTA_CHECK_ENABLED=true`, and run **Hosted quota guard** manually once. It runs
hourly thereafter, uses built-in `GITHUB_TOKEN` with job-scoped issues:write, and
opens one issue per measured resource at 70%, escalating the same issue at 90%.
Repeated checks do not spam duplicate issues. Close the issue after investigating;
a still-breached resource can create a new issue next run. There is no automatic
paid upgrade or deletion. Missing metrics/auth fail the job visibly.

Render hours/bandwidth and Grafana account series/retention are **not measured by
this API**. Check those dashboards and their native quota notifications; this
workflow cannot honestly detect 70%/90% of provider-only limits without additional
provider integrations. See the table in [hosted limits](hosted-limits.md).

## Manual tiny smoke (not a load test)

Wake/check health first. Choose one existing, clean, active synthetic link. Set
`API_ORIGIN` and `SMOKE_SHORT_CODE` locally (no key needed), then run:

```bash
k6 run scripts/free_tier_smoke.js
```

The script has one VU, 20 iterations, one GET each, no redirect following, no
retries and a two-second pause. **At most 20 HTTP requests**, with no automatic
creation. Do not override iterations/VUs/duration and do not put this in CI or a
schedule. It records 20 clicks if every redirect succeeds. It has not been run
against a live free-tier API by the assistant.

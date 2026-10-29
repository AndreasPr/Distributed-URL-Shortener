# Three-minute local demo

## Prepare before recording

Requirements: Docker Desktop running, Compose >=2.24.4, Git, Make and Python 3.9+.
No host virtualenv, Node, API credentials or cloud account is needed. The first build needs
internet access to image/package registries and can take several minutes.

From the repository root:

```bash
make demo
```

This uses the real root Compose baseline plus `demo/compose.yml`, Redis Streams and
FakeProvider in project **shortener-demo**. It runs Alembic, starts the frontend, waits for
services, seeds 30 links and 115 historical click fixtures, and verifies six real redirect
clicks reach the analytics worker (demo-docs becomes 7 clicks). It prints an admin key and
a read/write key **once**, plus a generated Grafana password. Save them privately before
clearing the terminal; never include the startup output in a recording. API keys are not
saved to a file; only their hashes are stored in PostgreSQL. Generated DB/Grafana secrets
live in ignored, mode-0600 `.demo/env` inside a mode-0700 directory.

The normal root `.env`, services and volumes are untouched. Ports must be free:

| Surface | URL |
|---|---|
| Frontend | http://localhost:13000 |
| API docs | http://localhost:18080/docs |
| Grafana | http://localhost:13001/d/url-shortener |
| Jaeger | http://localhost:16687 |
| Prometheus | http://localhost:19091 |

Only loopback ports are published. PostgreSQL/Redis/OTLP are internal. Docker images and
build cache are retained after cleanup so later recordings start faster.

Aliases, destinations, verdicts, click counts and synthetic event IDs are deterministic.
Credentials are intentionally random; fixture timestamps are relative to the current UTC
minute (past week/history) so the UI remains readable. Live event IDs, timings and traces
are real and vary. Seeded history and six flagged verdicts are **fixtures**, not a live-model
accuracy demonstration. There are 24 clean links, four suspicious review links and two
malicious fixtures. Destinations use reserved example domains; do not imply they are real
phishing sites or working content pages. Never follow these URLs as part of verification.

Open the frontend, dashboard and flagged page in advance. Paste the admin key into the
frontend's in-memory key settings and click its apply button. Log into Grafana as `demo`
with the printed password. Set its time range to the last 5 minutes. Preload Jaeger with
service `api`, operation `GET /{code}` (or all operations if names differ), then Find Traces.
The six startup clicks provide actual API/publish/worker/database tracing activity. Give
Prometheus two scrapes (~30 seconds) and generate a few more local redirects before filming
if the cache panel has no rate samples. Those extra clicks change the baseline count.

For the terminal actions, enter an interactive Bash shell (works on macOS), then prepare
these variables privately. Headers use private temporary files rather than command-line keys:

```bash
bash
umask 077
DEMO_AUTH=$(mktemp -d)
trap 'rm -rf "$DEMO_AUTH"; unset ADMIN_KEY RW_KEY' EXIT
read -rsp 'Admin key: ' ADMIN_KEY; printf '\n'
read -rsp 'Read/write key: ' RW_KEY; printf '\n'
printf 'X-API-Key: %s\n' "$ADMIN_KEY" > "$DEMO_AUTH/admin"
printf 'X-API-Key: %s\n' "$RW_KEY" > "$DEMO_AUTH/write"
unset ADMIN_KEY RW_KEY
BASE=http://localhost:18080
```

Do not enable `set -x`, verbose curl, or record key entry. Clear the terminal; pre-position
commands below. Do the create/burst/review steps once per reset; replaying an existing alias
returns 409. The demo uses a **five-token write bucket, refill one/second** to show 429 quickly;
this is an isolated demo override, not a production throughput measurement.

## Recording: exactly 3:00

| Time | Screen/action and narration |
|---|---|
| 0:00–0:30 | Show README architecture. “This shortener separates fast redirects from asynchronous click analytics and abuse review. PostgreSQL owns links; Redis provides cache/limits. Kafka and Redis Streams are interchangeable; today uses Streams and a fake local classifier.” |
| 0:30–0:45 | Create `demo-live`, show the returned alias and a 307 Location header. Explain scoped API keys and expiry/custom aliases. |
| 0:45–0:55 | Run the burst; point at 429 and explain atomic per-key Redis buckets. Existing-alias 409 responses are expected before exhaustion. |
| 0:55–1:15 | Show Flagged page and `demo-review-1` reasons. Block it using the admin review command, then show redirect 451. “This seeded review item is a fixture; actual new links are classified asynchronously.” |
| 1:15–1:25 | Open dashboard / analytics for `demo-docs`: seeded history plus real clicks. “Consumer commits before ack; event IDs deduplicate database effects.” |
| 1:25–1:40 | Show a preloaded Jaeger click trace with API and worker spans, then Grafana cache/redirect panel. “These are real local telemetry samples, not proof of a 30-day SLO.” |
| 1:40–2:00 | Stop the worker, make three redirects, show analytics unchanged, restart and show count +3. “Redis Streams buffers during this graceful worker outage; redirects continue.” |
| 2:00–3:00 | Full one-minute limitations summary below. |

### Create and redirect (0:30)

```bash
curl -fsS -H @"$DEMO_AUTH/write" -H 'Content-Type: application/json' \
  -d '{"long_url":"https://example.com/demo","custom_alias":"demo-live"}' "$BASE/shorten"
curl -sS -D - -o /dev/null "$BASE/demo-live"
```

Expect 200 creation and **307**, with Location pointing at example.com. Do not use `-L`:
we inspect the redirect and never fetch its destination. Alternatively, create the same
alias in the frontend, but do not perform both creations in one take.

### Rate limiting (0:45)

```bash
for i in $(seq 1 20); do
  curl -sS -o /dev/null -w '%{http_code}\n' \
    -H @"$DEMO_AUTH/write" -H 'Content-Type: application/json' \
    -d '{"long_url":"https://example.com/demo","custom_alias":"demo-live"}' "$BASE/shorten"
done
```

This consumes tokens even when the alias returns 409. Expect 429s with Retry-After once
exhausted; exact counts depend on elapsed time. Read endpoints are not write-limited.

### Review and analytics (0:55–1:25)

```bash
curl -fsS -H @"$DEMO_AUTH/admin" "$BASE/admin/flagged?limit=6"
curl -sS -o /dev/null -w 'review=%{http_code}\n' \
  -H @"$DEMO_AUTH/admin" -H 'Content-Type: application/json' \
  -d '{"decision":"block"}' "$BASE/admin/flagged/demo-review-1/review"
curl -sS -o /dev/null -w 'redirect=%{http_code}\n' "$BASE/demo-review-1"
curl -fsS -H @"$DEMO_AUTH/write" "$BASE/analytics/demo-docs"
```

Expect review **204**, redirect **451**. The frontend review buttons perform the same action;
choose UI or command once per take. Live-model quality is not claimed by these fixtures.

### Worker degradation and recovery (1:40)

Prepare these commands in separate terminal panes; leave them running while narrating.
The baseline must be captured before the three clicks. No other client should click demo-docs.

```bash
python3 scripts/demo.py worker-stop
BEFORE=$(curl -fsS -H @"$DEMO_AUTH/write" "$BASE/analytics/demo-docs" \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["total_clicks"])')
for i in 1 2 3; do
  curl -sS -o /dev/null -w 'redirect=%{http_code}\n' "$BASE/demo-docs"
done
curl -fsS -H @"$DEMO_AUTH/write" "$BASE/analytics/demo-docs"
python3 scripts/demo.py worker-start
for i in $(seq 1 15); do
  AFTER=$(curl -fsS -H @"$DEMO_AUTH/write" "$BASE/analytics/demo-docs" \
    | python3 -c 'import json,sys; print(json.load(sys.stdin)["total_clicks"])')
  if [ "$AFTER" -eq "$((BEFORE + 3))" ]; then
    echo "PASS: analytics recovered $BEFORE -> $AFTER"; break
  fi
  sleep 1
done
test "$AFTER" -eq "$((BEFORE + 3))" || echo 'FAIL: recovery not confirmed; investigate'
```

The API health endpoint can remain 200 while this worker is stopped: this demo shows
**analytics freshness degradation**, not an API health failure. This is a graceful stop,
not proof of arbitrary SIGKILL/crash recovery. If recovery takes longer than the allocated
20 seconds, disclose the elapsed time or extend the recording; do not claim an unobserved pass.

### One-minute limitations summary (2:00–3:00)

- **2:00–2:15:** “This is a local, single-region portfolio system. Capacity estimates are
  calculations, not evidence of 100 million URLs or 10,000 redirects a second. Terraform is
  validated but not deployed, and AWS resources would cost money.”
- **2:15–2:30:** “Click publication uses a bounded in-process queue: crashes or prolonged
  outages can lose events. Idempotent database writes do not mean exactly-once delivery.
  Redis fallback still depends on PostgreSQL, including lifecycle checks on cache hits.”
- **2:30–2:45:** “The abuse test snapshot was reused and small. New review recall was 37.14%
  on 64 examples; 22 malicious labels were missed. Zero observed false positives among
  29 benign examples does not establish field safety. Today's fake provider proves no
  live-model accuracy, and suspicious flags are not automatic blocks.”
- **2:45–3:00:** “Security audits found frontend vulnerabilities; the local kind load gate
  also dropped iterations. Latency/freshness SLIs and a 30-day SLO observation are incomplete.
  This demo shows mechanisms and measured limitations, not production certification.”

Use [known limitations](known-limitations.md) as the current source; update narration if
later fixes change those facts. Never substitute synthetic history for measured throughput.

## Cleanup and reset

Exit the prepared Bash shell to delete its temporary header files, then run:

```bash
make demo-down
```

This removes only this checkout's `shortener-demo` containers, named volumes (including
all links, keys, Grafana and Prometheus state) and `.demo` credentials. It preserves images,
build cache and the normal stack. Then `make demo` creates a fresh recording state and fresh
keys. A second `make demo` before cleanup refuses to overwrite data or print keys again.
If startup fails, use `make demo-down` in the **same checkout** before retrying. Ownership
checks prevent cleanup of another checkout's demo. Losing its state requires manual Docker
inspection; the script does not guess which other project's data is safe to delete.

The clean-checkout run and actual results are recorded in [demo verification](demo-verification.md).

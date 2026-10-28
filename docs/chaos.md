# Local failure experiments

These are opt-in disruptions of an **already running local test stack**. Do not run against
production or while another test/user generates clicks. Each script creates a fresh link,
uses public redirects without following the destination, and reads analytics with a read/write
API key. No live LLM call is needed: run the local abuse worker with LLM_PROVIDER=fake.

## Compose setup and run

Start the intended normal Compose profile using your existing local .env. Do not paste its
contents or keys into reports. Example for Redis Streams:

```bash
LLM_PROVIDER=fake docker compose --profile redis-streams up --build -d
export EVENT_BUS=redis_streams
export BASE_URL=http://127.0.0.1:8000
# Capture the one-time key without printing it or putting it in command arguments:
API_KEY=$(docker compose --profile redis-streams exec -T api-redis python -m app.cli keys create --name chaos --scopes read write | .venv/bin/python -c 'import json,sys; print(json.load(sys.stdin)["key"])')
export API_KEY
make chaos
```

For Kafka use `--profile kafka`, service `api` instead of `api-redis`, and
`export EVENT_BUS=kafka`. EVENT_BUS must match the running API. The default is redis_streams.
The normal Compose project is selected using Compose's standard COMPOSE_FILE/COMPOSE_PROJECT_NAME
variables, if set. Verify these point at your intended local project before running.

To run experiments separately:

```bash
bash scripts/chaos/redis_down.sh
bash scripts/chaos/worker_down.sh
bash scripts/chaos/broker_down.sh
```

`make chaos` runs them sequentially and stops at the first failure. Each prints PASS or FAIL,
writes a timestamped JSON under ignored `chaos/results/`, and exits nonzero on failure.
Inspect phase counts/latencies, policy_ok, recovered_health, stage, and failure_type. Raw HTTP
bodies, API keys, and subprocess error output are deliberately excluded. A failure_type without
phase results generally indicates setup/control failure, not measured application availability.
Use `python -m app.cli keys list/revoke` in the API container to revoke the named test key afterward;
`unset API_KEY`. Created links remain in the test database; delete them via the API if desired.

## Common method and pass criteria

A single load thread targets approximately two redirects/second, below default public limits.
It measures 20 seconds before, 20 seconds of confirmed disruption, and 20 seconds after recovery.
Stop/start/scale transition time adds to the during phase, so total load lasts **at least 60
seconds**, not exactly 60 when control commands take time. Phase assignment is by request start.
Requests time out at two seconds; slow requests reduce offered load (no catch-up burst).
This is an availability probe, not an open-loop capacity benchmark.

Every phase needs at least 10 observations, **success >99%** (HTTP 307), **p95 <1000ms**,
and **maximum <2500ms**, including failed-request latency. At this sample size, a single failure
normally fails the availability criterion. Empty/undersampled phases cannot pass.
Health must return 200 at the end. JSON retains individual status/latency samples and phase summaries.
This tests a cached hot link with lifecycle checks, not every cold-cache or write scenario.

After load, analytics is sampled every two seconds for 60 seconds. The last five counts must
be stable for worker/broker accounting checks. This is bounded evidence, not proof that no
late duplicates can ever appear. Stuck backlogs that miss this window fail, rather than pass
as “eventual delivery.” Counts do not validate event IDs individually.

## redis_down: cache failure

**Hypothesis:** PostgreSQL fallback and the Redis circuit breaker keep hot redirects available.
Compose stops Redis, waits 20 seconds, then starts the same container. Expect common redirect
criteria and recovered health. Redis socket timeouts/first breaker failures may breach latency;
the script reports this rather than weakening thresholds. With Redis Streams, this also interrupts
the event bus. Analytics counts and drops are recorded but losslessness is **not** required here.
The normal Redis AOF volume is retained; no FLUSHALL, volume deletion or database mutation is used.

## worker_down: consumer outage

**Hypothesis:** Accepted events accumulate in the broker and are processed exactly once in the
analytics table after the worker returns. Compose gracefully stops worker/worker-redis while
clicks continue, waits 20 seconds after stop completes, and restarts it. This tests a graceful
consumer outage, not SIGKILL/crash-in-transaction recovery.
In addition to common criteria: final analytics count must equal successful redirects, drop-counter
delta must be zero, and final counts must be stable. Any shortfall or excess fails.

## broker_down: stalled broker

**Hypothesis:** Blocking broker work stays off the redirect path. Compose pauses Kafka, or Redis
for redis_streams, waits 20 seconds, then unpauses. Redis Streams shares cache infrastructure,
so its pause also exercises slow-cache fallback.

Publishing is bounded, in-memory, best-effort (`app/events/publisher.py`): queued events may publish
on recovery; publish failures are retried in the background with the same event ID, up to
EVENT_PUBLISH_ATTEMPTS (default 60), separated by EVENT_RETRY_BACKOFF (default 0.25s).
The analytics unique constraint deduplicates repeated broker submissions. Exhaustion, shutdown
and queue overflow increment events_dropped_total; retries are not durable across API restarts.
Durably accepted events are consumed with database deduplication. Pass requires common criteria,
stable counts, delivered <= successful redirects, and **delivered + drop delta == successful**.
Unexplained missing events, duplicate rows, metric resets, or accounting mismatches fail.

The drop metric is process-global: use one API instance, no competing traffic, no API restarts,
and a direct API metrics endpoint. Redis and Kafka acknowledgment timeouts can be ambiguous even after retry exhaustion: a broker may
accept an event whose publisher reports failure. In that case delivered+drop can exceed requests;
the experiment deliberately fails reconciliation and requires investigation, rather than claiming
loss or duplication without evidence. No exact-once guarantee is made for the publisher.

## kind (worker experiment only)

Use a dedicated kind cluster with one API replica, reachable via a stable port-forward to the API
(not the worker). Use an existing scoped key from that cluster. Example:

```bash
kubectl --context kind-url-shortener -n url-shortener port-forward service/api 18000:8000
# In a second terminal, leave the internal metrics forward running:
kubectl --context kind-url-shortener -n url-shortener port-forward service/api-metrics 18002:8002
# In another terminal with API_KEY set:
CHAOS_BACKEND=kind KUBE_CONTEXT=kind-url-shortener BASE_URL=http://127.0.0.1:18000 \
  METRICS_BASE_URL=http://127.0.0.1:18002 EVENT_BUS=redis_streams bash scripts/chaos/worker_down.sh
```

The controller requires an explicit kind-* context, captures the original worker replica count,
scales deployment/worker to zero, waits for pod deletion, and restores the original count/rollout.
Do not run a reconciler/HPA that changes worker replicas during this experiment. Redis and broker
kind variants are unsupported: scaling Redis to zero is not equivalent to pausing a broker and
needs storage/controller-specific recovery tests. They fail before disruption. Do not use
`make chaos` with CHAOS_BACKEND=kind; invoke worker_down.sh directly.

## Recovery and limitations

Finally blocks restore stopped/paused services even after a partial control-command failure.
SIGINT/SIGTERM trigger recovery; SIGKILL, host failure or a second interrupt may prevent it.
If recovery_error is recorded, manually run `docker compose start redis worker-redis` (or worker)
and `docker compose unpause redis`/`kafka` as appropriate. For kind restore the worker replica
count captured before the run. Never remove persistent volumes to recover a chaos experiment.
The scripts do not auto-start an unhealthy stack or change rate limits. Run sequentially.

The optional db_slow/Toxiproxy experiment is deferred. The current cache breaker is for Redis;
a PostgreSQL latency experiment must not imply a database circuit breaker exists.

## Observed results (filled from actual JSON)

Error values are percentages; p95 values are milliseconds. Clicks means successful HTTP 307
responses. All runs below occurred on 2026-10-28; filenames include UTC timestamps.
The Compose Redis and worker results precede the publisher retry fix; the later broker runs
verify that fix. The kind worker result was recorded afterward. Original failure artifacts remain unchanged.

| Experiment | Backend/bus | Before error/p95 | During error/p95 | After error/p95 | Clicks/delivered/drops | PASS/FAIL |
|---|---|---|---|---|---|---|
| redis_down | Compose / Redis Streams | 0% / 34.63 ms | 0% / 38.26 ms | 0% / 39.37 ms | 121 / 80 / 41 | PASS |
| worker_down | Compose / Redis Streams | 0% / 44.95 ms | 0% / 33.72 ms | 0% / 35.92 ms | 125 / 125 / 0 | PASS |
| broker_down (before fix) | Compose / Redis Streams | 0% / 33.90 ms | 0% / 123.92 ms | 0% / 29.89 ms | 121 / 103 / 19 | FAIL |
| broker_down (before fix) | Compose / Redis Streams | 0% / 40.97 ms | 0% / 123.68 ms | 0% / 34.52 ms | 121 / 103 / 19 | FAIL |
| broker_down (disposable verification) | Compose / Redis Streams | 0% / 37.71 ms | 0% / 124.00 ms | 0% / 36.16 ms | 122 / 122 / 0 | PASS |
| broker_down (after fix) | Compose / Redis Streams | 0% / 30.78 ms | 0% / 136.26 ms | 0% / 36.64 ms | 121 / 121 / 0 | PASS |
| worker_down | kind / Redis Streams | 0% / 44.79 ms | 0% / 48.33 ms | 0% / 34.15 ms | 124 / 124 / 0 | PASS |

The failed broker runs have 103 delivered + 19 reported dropped = 122 against 121 clicks:
redirect availability passed, but strict event accounting failed. The latest normal-stack
broker run reconciles 121 delivered + 0 dropped = 121 clicks, with stable final counts and
recovered health. Redis downtime's 41 drops were allowed by that experiment's availability
contract; they do not represent lossless analytics.

Source JSON files are local, git-ignored artifacts. Exact commit, hardware, Docker resource
allocation and service versions are not recorded in these JSON files and remain TBD;
do not infer them from timestamps. The separate disposable verification configuration is
recorded in broker-retry-verification.md. Kafka remains unverified; kind worker recovery with Redis Streams passed.
The kind result comes from `chaos/results/20261028T183122894415Z-worker_down.json`: final analytics
counts remained at 124 for the last five observations, with zero drops and recovered health.
The syntax/unit results in chaos-verification.md are separate from these live observations.

### Broker retry follow-up

The original Redis pause FAIL results are retained. After the bounded publisher retry fix,
a separate disposable perf Compose stack passed the unchanged experiment: 122/122 redirects,
122 analytics rows, zero drops; during-outage p95 124.00ms, max 329.10ms. See
[broker-retry-verification.md](broker-retry-verification.md) for configuration and full evidence.
Rebuild the normal API image before repeating; this result does not replace historical failures.

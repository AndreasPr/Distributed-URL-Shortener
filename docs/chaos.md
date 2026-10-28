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
on recovery; failures and queue overflow increment events_dropped_total and are not durably retried.
Durably accepted events are consumed with database deduplication. Pass requires common criteria,
stable counts, delivered <= successful redirects, and **delivered + drop delta == successful**.
Unexplained missing events, duplicate rows, metric resets, or accounting mismatches fail.

The drop metric is process-global: use one API instance, no competing traffic, no API restarts,
and a direct API metrics endpoint. Kafka acknowledgment timeouts can be ambiguous: a broker may
accept an event whose publisher reports failure. In that case delivered+drop can exceed requests;
the experiment deliberately fails reconciliation and requires investigation, rather than claiming
loss or duplication without evidence. No exact-once guarantee is made for the publisher.

## kind (worker experiment only)

Use a dedicated kind cluster with one API replica, reachable via a stable port-forward to the API
(not the worker). Use an existing scoped key from that cluster. Example:

```bash
kubectl --context kind-url-shortener -n url-shortener port-forward service/api 18000:8000
# In another terminal with API_KEY set:
CHAOS_BACKEND=kind KUBE_CONTEXT=kind-url-shortener BASE_URL=http://127.0.0.1:18000 \
  EVENT_BUS=redis_streams bash scripts/chaos/worker_down.sh
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

## Observed results (fill from actual JSON)

| Experiment | Backend/bus | Before error/p95 | During error/p95 | After error/p95 | Clicks/delivered/drops | PASS/FAIL |
|---|---|---|---|---|---|---|
| redis_down | TBD | TBD | TBD | TBD | TBD | TBD |
| worker_down | TBD | TBD | TBD | TBD | TBD | TBD |
| broker_down | TBD | TBD | TBD | TBD | TBD | TBD |
| worker_down | kind / TBD | TBD | TBD | TBD | TBD | TBD |

Record commit, hardware, Docker resources, service versions, UTC time and JSON filename.
No live disruption result is claimed by the syntax/unit checks in chaos-verification.md.

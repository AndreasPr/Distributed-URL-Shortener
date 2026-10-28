# Reproducible local performance tests

## Run

Prerequisites: Docker Desktop, local k6, and the project's Python .venv. No paid services,
cloud credentials or LLM calls are required. From the repository root:

```sh
make perf
# Small harness check, not a capacity result:
DATASET_SIZE=20 RATE=2 DURATION=10s make perf
# Alternative profiles (their stages are defined in the script):
PERF_VARIANT=stress make perf
PERF_VARIANT=spike make perf
```

`make perf` builds and starts the separate `shortener-perf` Compose project, waits for
health/migrations, creates a temporary read/write API key, runs k6 setup and measurement,
queries Prometheus, and removes only that project's containers and volumes in a finally
block. Ports 18000 and 19090 must be free. Do not run two perf commands simultaneously.
If interrupted twice or killed, clean up with:

```sh
docker compose -p shortener-perf -f perf/compose.yml down -v --remove-orphans
```

The isolated database uses an intentionally public local-only test password; PostgreSQL
and Redis expose no host ports. API/Prometheus bind loopback. High write and redirect
limits apply only in this project (settings are service-wide, not a per-key override).
The API key exists only in process environment, never in saved results. No IP spoofing
is used. Do not use this Compose configuration for production.

Results go to `perf/results/<UTC timestamp>/`: raw `summary.json` produced by
`k6 --summary-export`, `k6.log`, `metadata.json`, and `report.md`. Failed thresholds remain
nonzero exits and are still reported. Only `sample.json` is committed: the actual 20-URL, 2 requests/s, 10-second harness smoke run
from 2026-10-28. It failed the p95 gate and is not a capacity baseline.
For direct script execution provide API_KEY (read/write), BASE_URL, and an explicit
`--summary-export perf/results/my-summary.json`; provision appropriate limits yourself.
Never point these scripts at a deployment without authorization to generate substantial data.

## Method

All three scripts share `scripts/perf_workload.js`. Setup creates 10,000 distinct example.com
URLs and warms the hottest 10%. Each measured iteration performs exactly one request:
83% hot redirects, rank-biased using a cubic transform (Zipf-like, not an exact fitted Zipf),
10% rotating long-tail redirects, 2% unique missing codes, and 5% authenticated analytics reads.
Redirect following is disabled: no destination pages are fetched. Expected 404s are not errors;
429, 5xx and wrong statuses are errors. Setup fails on any failed creation or warmup.

Long-tail requests are initially cold, then may become hits as the finite dataset is reused.
Negative misses are unique. Actual cache behavior is measured, not inferred from request labels.
Seeding and warmup generate asynchronous work; worker backlog can affect the measured phase.
Analytics reads can become more expensive as timestamp lists grow. Redis Streams and FakeProvider
are used; this is not a Kafka or live-LLM benchmark. OTLP collector is absent in this harness;
export failures and their overhead may appear in logs. There is one API process.

Default load is 100 iterations/s for 2 minutes with up to 100 VUs. Stress and spike use
closed-loop VU ramps, so throughput drops when responses slow. Inspect dropped iterations
and generator CPU to distinguish load-generator saturation from service saturation.
The illustrative p95<500ms and error<1% gates are harness gates, not proof of the cache-hit SLO.
The kind CI smoke gate retains `scripts/smoke_load_test.js` with its small rate and dataset.

Report latency/error metrics use only measured workload requests, excluding setup/warmup.
Throughput is completed requests divided by the interval between first and last measured
completion (an approximation, unreliable for tiny runs). Latencies combine request classes;
use raw tagged metrics/traces for redirect-only or cache-hit SLO analysis.
Prometheus hit ratio is hits/(hits+misses) over the final one-minute rate window, not lifetime
counters or the entire test. Runs shorter than one minute include setup/warmup in this window.
Missing/NaN data is marked unavailable, never zero. This cache ratio is not a redirect-only ratio
unless the application's instrumentation guarantees that scope.

## Hardware and measured results

Record CPU/model/core count: **TBD**; RAM: **TBD**; OS: **TBD**; Docker CPU/RAM limits: **TBD**;
storage: **TBD**; k6/Docker versions: **TBD**; Git commit: **TBD**; background workloads: **TBD**.
Run multiple trials, retain failures, and report variability rather than selecting the best run.

| Profile | Dataset | Achieved req/s | p50 ms | p95 ms | p99 ms | Error fraction | Cache hit ratio |
|---|---:|---:|---:|---:|---:|---:|---:|
| Load | 10,000 | TBD | TBD | TBD | TBD | TBD | TBD |
| Stress | 10,000 | TBD | TBD | TBD | TBD | TBD | TBD |
| Spike | 10,000 | TBD | TBD | TBD | TBD | TBD | TBD |

## Capacity estimate (assumptions, not measured results)

Target: **100 million stored URLs and 10,000 redirects/s**. Assume average URL row including
metadata is 400 bytes; heap/page overhead multiplier 1.3; indexes average 100 bytes/URL.
Primary URL storage = 100M × (400 × 1.3 + 100) = 62 billion bytes ≈ 57.7 GiB.
Allow 2× for bloat/growth/maintenance = 124 GB; primary+one replica = 248 GB, before backups,
WAL, verdicts, keys and analytics. Measure actual pg_total_relation_size/sample counts to replace assumptions.

Assume cache holds hottest 1% = 1M entries; payload/key/Redis overhead averages 500 bytes;
fragmentation multiplier 1.5: 1M × 500 × 1.5 = 750 MB. With one replica = 1.5 GB total.
Reserve additional headroom for locks, rate buckets, negative entries, verdicts and Streams;
shared stream retention can dominate this budget. Measure MEMORY USAGE and eviction statistics.

At an assumed 95% hit ratio, URL cache misses = 10,000 × 0.05 = 500/s. This is **not total DB QPS**:
redirect lifecycle/abuse checks may still query on hits. If one such query runs on every redirect,
read demand is at least 10,000 + 500 = 10,500 queries/s, before analytics reads and writes.
Inspect SQL spans/query counters to determine actual per-path query counts; cache hits do not
prove PostgreSQL was bypassed. At 100 events/batch, analytics can require ~100 transactions/s,
but still inserts 10,000 rows/s. Assuming 200 bytes/click including indexes gives
10,000 × 86,400 × 200 = 172.8 GB/day, or 5.184 TB/30 days before replication/backups.
Retention/aggregation is essential; these estimates are sizing hypotheses, not supported capacity claims.

## Bottleneck analysis template

Record offered vs achieved rate, dropped iterations, per-class p95/p99, 429/5xx counts,
API CPU/RSS, database CPU/connections/query latency/locks, Redis latency/memory/evictions,
worker lag/DLQ growth, generator utilization, and disk/network throughput. For each suspected
bottleneck: evidence → hypothesis → one change → repeated test → trade-off/regression result.
Do not confuse a deliberate rate limit with exhausted application capacity.

## What I would change at 10×

At 100,000 redirects/s: horizontally scale API replicas and benchmark connection-pool budgets;
remove redundant hot-path database reads only with safe deletion/block invalidation semantics;
separate cache from event Redis and evaluate Kafka partitioning; batch analytics writes and
partition/expire click history; test read replicas for stale-tolerant analytics; shard URL storage
only after measuring primary limits. Edge caching requires explicit expiry, deletion and abuse
purge guarantees. Each option increases consistency or operational complexity and needs its own test.

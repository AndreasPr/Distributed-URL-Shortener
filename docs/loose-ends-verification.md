# Loose ends verification — 2026-10-29 (America/Chicago)

Branch: `step-9-5-loose-ends`. Docker Desktop Engine 27.4.0 reports 12 CPUs and
8,217,686,016 bytes of memory. The developer's existing Compose/Desktop Kubernetes
workloads remained running; only the two explicitly named disposable kind clusters
were created and deleted. This was not an idle-host capacity benchmark.

## ADR identifiers

Preserved the existing baseline records and all later numbers. Renamed only the
four collisions and updated tracked repository references and the ADR index:

| Previous filename | Unique filename |
|---|---|
| 0001-short-code-generation.md | [0028-short-code-generation.md](adr/0028-short-code-generation.md) |
| 0002-cache-strategy.md | [0029-cache-strategy.md](adr/0029-cache-strategy.md) |
| 0003-event-bus.md | [0030-event-bus.md](adr/0030-event-bus.md) |
| 0004-abuse-pipeline.md | [0031-abuse-pipeline.md](adr/0031-abuse-pipeline.md) |

These are renumbered historical decisions, not new decision dates. External links
outside this repository cannot be rewritten here.

## k6 diagnosis

The retained final-audit report had 2 dropped arrivals, redirect p95 90.12ms, max
iteration 830.06ms, zero HTTP failures, and a VU pool that grew from 2 to 4. A fresh
unmodified kind run reproduced the class of failure (1 drop, not exactly 2):

```text
PASS: health; shorten; redirect 307; analytics=1; metrics; auth=401; rate-limit=429
thresholds on metrics 'dropped_iterations' have been crossed
```

Its redirect p95 was 94.57095ms, maximum HTTP duration 593.892ms, zero HTTP failures,
150 completed iterations and a pool that grew from 2 to 3. Exit status: 99.
All application pods were Ready with zero restarts; the migration completed and
PVCs were Bound. The separate functional smoke test deliberately checked a 429;
all measured redirect checks passed. Thus rate-limit rejection and failed readiness
were not the observed cause of this load failure.

For a constant-arrival executor, each busy VU cannot start another iteration.
At 5 arrivals/s, two occupied VUs give only 400ms of concurrent capacity. Short
sub-second stalls force allocation while the test is already running. Grafana
[documents this mechanism](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/arrival-rate-vu-allocation/).

A controlled loopback server returned valid 307s, delaying only the first four by
830ms, then returning immediately. The actual smoke script, unchanged thresholds,
and a 30-second duration produced:

| Preallocated / maximum VUs | Exit | Drops | Redirect p95 | HTTP errors |
|---|---:|---:|---:|---:|
| 2 / 5 (before) | 99 | 2 | 8.16835ms | 0% |
| 5 / 5 (after) | 0 | 0 | 3.73250ms | 0% |

This isolates VU allocation as a reproducible cause of drops despite a passing p95.
It does **not** identify why the historical backend/host had its 830ms tail: raw
per-request timings were not retained then. Do not attribute that stall to PostgreSQL,
probes, CPU throttling or a particular dependency without further measurements.

Fix: preallocate the existing five-VU maximum (ceil(5 × 0.83) = 5). Rate, duration,
max VUs and all thresholds remain unchanged. New `k6-points.json` workflow artifacts
retain timestamps, timings and metric samples for future failures. The regression
in [test_k6_smoke.py](../tests/test_k6_smoke.py) uses the real k6 binary and proves
transient stalls pass while 429s and sustained 830ms responses still fail.

## Ryuk diagnosis

Default settings were verified before testing:

```text
TESTCONTAINERS_RYUK_DISABLED None
TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE None
TESTCONTAINERS_RYUK_PRIVILEGED None
RYUK_CONTAINER_IMAGE None
Effective: disabled=False, privileged=False, image=testcontainers/ryuk:0.8.1
Discovered socket: ~/.docker/run/docker.sock
12 passed, 7 warnings in 25.69s
442 passed, 11 deselected, 7 warnings in 35.83s
Required test coverage of 93.6% reached. Total coverage: 93.67%
```

An independent probe with `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock`
and `TESTCONTAINERS_RYUK_DISABLED=false` returned:

```text
Pinging Docker...
Docker daemon is available!
Starting on port 8080...
Started!
Redis ping: True
```

The historical error was helper-to-daemon socket access, but its exact host cause
cannot be reconstructed and it did not reproduce now. CI pins its known Linux
socket and explicitly keeps cleanup enabled. This avoids socket auto-discovery
ambiguity; it is not a claim that a historical Docker Desktop defect was patched.
See [testing.md](testing.md) for the targeted local override and last-resort fallback.

## Checks and reproduction

```sh
make check
TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock TESTCONTAINERS_RYUK_DISABLED=false make test-integration
RUN_K6=true KIND_NAME=shortener-loose-ends-fixed RESULTS_DIR=artifacts/loose-ends-kind-fixed bash scripts/kind_smoke.sh
```

The kind command is the same deployment/smoke/load entrypoint used by
[the workflow](../.github/workflows/k8s-smoke.yml); locally it creates its own cluster,
whereas Actions supplies one through helm/kind-action. No GitHub-hosted run was
triggered: the workflow is pull-request-only. A PR must run on GitHub to establish
hosted-runner evidence for this commit.

Original failed run: `artifacts/loose-ends-kind/`; fixed run:
`artifacts/loose-ends-kind-fixed/`. Raw results are intentionally ignored, not committed.

## Final measured results

All commands below exited 0. The original unmodified kind run exited 99, as recorded above.

```text
make check:
  431 passed, 23 deselected, 6 warnings in 52.06s
  TOTAL 2369 statements, 152 missed, 93.58% (unit suite)
  Checking rules/slo.yml
    SUCCESS: 22 rules found
    SUCCESS

make test-integration (explicit CI socket, Ryuk enabled):
  443 passed, 11 deselected, 7 warnings in 69.05s
  Required test coverage of 93.6% reached. Total coverage: 93.67%

fixed kind workflow entrypoint:
  Summary: 57 resources found in 1 file - Valid: 57, Invalid: 0, Errors: 0, Skipped: 0
  Summary: 52 resources found in 1 file - Valid: 52, Invalid: 0, Errors: 0, Skipped: 0
  PASS: health; shorten; redirect 307; analytics=1; metrics; auth=401; rate-limit=429
  checks: 302 passed, 0 failed
  dropped_iterations: 0
  redirect http_req_failed: 0%
  redirect http_req_duration p95: 23.64ms; max: 184.527ms
  151 complete and 0 interrupted iterations

make frontend-check:
  No ESLint warnings or errors
  tests 9; pass 9; fail 0
  tsc --noEmit --incremental false: exit 0

make mcp-test:
  Success: no issues found in 14 source files
  35 passed in 2.12s
```

The fixed gate's lower p95 is one run's measurement, not a causal performance claim.
Optional Kafka integration was not rerun. Frontend installation still warns about
host Node 23.9 versus supported dependency engines; no frontend files or lock changed.
The known frontend vulnerability migration remains outside this task.

Additional checks: actionlint on ci.yml and k8s-smoke.yml, bash -n and shellcheck on
kind_smoke.sh, git diff --check: exit 0. README checker: 205 lines, 54 Markdown links,
32 commands pass (offline syntax/path checks, not external HTTP validation).
ADR check: 32 unique numbers and all relative links inside ADRs resolve.
The smoke script temporarily stamps image tags; its two generated overlay edits were
restored after the run. No pre-existing services were stopped or removed.

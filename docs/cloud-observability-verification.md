# Cloud observability verification

Branch: `step-15-7-cloud-observability`. All verification is local/offline; no
Render/Grafana/other live service was contacted, no credentials were read or
committed, and no resource or paid plan was created.

## Evidence by requirement

| Requirement | Implementation and evidence |
|---|---|
| Blueprint preserves dashboard settings | Three `sync: false` OTLP entries in `render.yaml`; `test_blueprint_dashboard_settings_are_not_overwritten` |
| Single bounded startup check | `export_health.startup_check`; fake HTTP acceptance, 401/403, redirect/500, timeout and disabled tests; disabled initialization runs the check once without exporters |
| Throttled, secret-free errors | `ExportErrorThrottle`; monotonic clock test and real SDK exporter with a fake 401 transport; invalid SDK header parser warning test |
| Sampling and probe exclusion | `RequestSampler`; 1,000 deterministic trace IDs, real FastAPI instrumentation with forced unsampled redirects, writes with unsampled parent, health probes and independent error summary |
| Span privacy | PrivacySpanProcessor and URLService; no code/user/workspace/token attributes; original tracing/privacy suites still run |
| Small OTLP metric set | `cloud_metrics.py`; real in-memory SDK reader/exporter setup, disabled behavior, bridge label collapse, early middleware rejection template labels |
| Cardinality | Exhaustive 41 route values × five status classes using real SDK histogram/counter aggregation; 1,877-series bound including reserve; current app route count checked |
| Cloud assets | JSON parsing/required rule expressions/contact point tests; manual import in `grafana/cloud/README.md` |
| Local behavior | `/metrics` retained; production API alone starts OTLP metrics (local Jaeger stays trace-only); assembled-app test includes new middleware |

Test references above are in `tests/test_cloud_observability.py`, alongside
`tests/test_observability.py`, `tests/test_trace_privacy.py` and
`tests/test_app_assembly.py`.

## Important limits

- Head sampling cannot know a future error. Every non-probe HTTP 4xx/5xx gets an
  independent error summary, not a reconstructed full request trace.
- Metric series budget applies per process/resource, not account-wide cloud
  ingestion after resource promotion, restarts, retention or multiple services.
- No hosted logs are exported. Startup trace acceptance does not prove metric
  token scope, real ingestion, alert compatibility or email delivery.
- Cloud imports, token scope/header checks, test notifications and an hourly
  one-probe synthetic health check remain operator work. Render sleep can cause
  missing telemetry and failed probes; hosted SLOs are best effort.

## Check history

Initial lint/type runs caught a long diagnostic line and sampler local type
inference; both were corrected. The first full unit run found the assembled-app
middleware expectation needed updating. Other failures were sandbox permission
errors when existing tests bound loopback fake servers. Those tests were rerun
with local network permission; no hosted network access was used.

Docker Desktop is stopped and native `promtool` is absent. The full gate reaches
Prometheus validation and then cannot execute it. This is a blocked check, not a
passing Prometheus validation. Start Docker Desktop and rerun `make check` locally
to complete that part. No Prometheus rule files were changed by this step; the
new hosted rules use Grafana provisioning JSON, not promtool's rule schema.

## Other passing checks (actual excerpts)

`npm_config_offline=true make frontend-check` with Node 22.23.4, exit **0**
(offline npm ci, ESLint, unit tests, tsc):

```text
# tests 23
# pass 23
# fail 0
cd frontend && ./node_modules/.bin/tsc --noEmit --incremental false
```

`make mcp-test`, exit **0** (format/lint/type/tests):

```text
Success: no issues found in 14 source files
35 passed in 0.56s
```

Offline local-link check, exit **0**:

```text
PASS: 53 local document links resolve; external links not contacted
```

`git diff --check`: exit **0**, no output. Docker integration and live cloud
imports/notification tests were not run. Full transient command records are
`/tmp/cloud-final-gate.log`, `/tmp/cloud-frontend.log`, `/tmp/cloud-mcp.log`;
these machine-local files are not committed artifacts.

## Final backend gate (actual excerpt)

`make check`: exit **2** because the final promtool Docker invocation exits 125.
Black, isort, Flake8, mypy and all selected backend tests **passed**:

```text
102 files would be left unchanged.
Success: no issues found in 91 source files
TOTAL                                       3881    235  93.94%
694 passed, 37 deselected, 2 warnings in 58.77s
sh scripts/check-prometheus.sh
docker: Cannot connect to the Docker daemon at unix:///Users/andreaspriftis/.docker/run/docker.sock. Is the docker daemon running?.
make: *** [prometheus-check] Error 125
```

The two warnings are existing Starlette/httpx and AnyIO deprecations. The 37
excluded cases are outside the unit target, not passing integration evidence.
README checker exit **0**: 242 lines, 59 Markdown links, 33 command examples;
nine external URLs were intentionally not contacted.

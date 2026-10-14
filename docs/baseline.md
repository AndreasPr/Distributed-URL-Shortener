# Project baseline

Inspected 2026-10-14. This is a documentation-only snapshot, not a production-readiness claim. No application code, dependencies, workflows, or deployment manifests were changed. Commands and standing rules are in [AGENTS.md](../AGENTS.md); the scope decision is [ADR 0001](adr/0001-free-local-baseline.md).

## Layout and current behavior

- `app/`: FastAPI routes, SQLAlchemy repositories/services, Redis cache, Kafka clients, analytics worker, observability, and an unregistered rate-limiter middleware.
- `frontend/`: Next.js 14/React UI for shortening, recent URLs, analytics, and health; it calls the API directly using `NEXT_PUBLIC_API_URL` (default localhost:8000).
- `scripts/`: SQL migration runner and k6 load/stress/spike scenarios. `tests/`: backend pytest suite.
- `docker-compose.yml` and Dockerfiles: local runtime. Compose runs migrations before API/worker, exposes PostgreSQL on 5433 and Kafka on 9094, and includes Prometheus, Grafana, and Jaeger. Run `docker compose up --build -d`; run the frontend separately with `cd frontend`, `npm ci`, `npm run dev`.
- `k8s/`: optional deployments, StatefulSets, Services, storage claims, migration Job, Ingress, and API HPA. `.github/workflows/`: test/lint CI and image publishing CD.
- `mcp-server/`: independent FastMCP server, source adapters, abuse heuristics, and a separate test suite.

`POST /shorten` inserts a URL, flushes to obtain its database ID, encodes that ID as base62 using `abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789`, sets the code, and commits. Codes are sequential-ID-derived, not random. The utility encodes zero as an empty string (tested); database-generated IDs normally begin above zero.

`GET /{code}` checks Redis, falls back to PostgreSQL, populates a 24-hour cache, publishes a click event, and returns a redirect (404 for an unknown code). Analytics routes read stored clicks; `/urls` joins URLs with click counts. Health endpoints inspect database/Redis availability.

The Kafka producer is initialized lazily, JSON-serializes `{short_code: ...}` to hardcoded topic `url-events`, calls `send` and `flush`, and logs/swallows errors. Publication is best effort but synchronous, so the comment promising nonblocking redirects overstates the behavior. The consumer uses group `analytics-group`, `auto_offset_reset="earliest"`, JSON decoding, and leaves auto-commit at the client default. Initial connection failures return `None`; the worker retries every five seconds. It accumulates up to 100 events and commits batch inserts to PostgreSQL. The nominal five-second flush is checked only when a message arrives, not on an independent timer; remaining events are flushed in `finally`.

The rate-limiter implementation uses atomic Redis Lua and sorted sets for a 60-second sliding window, keyed by raw request path and client IP. `/shorten` permits 20 requests; other paths permit 100. It trusts the first `X-Forwarded-For` value, bypasses OPTIONS and `/metrics`, returns 429/retry headers when full, and fails open on Redis errors. **`app/main.py` does not register this middleware, so these limits are not enforced by the assembled application.** Tests invoke the function with mocks.

## Application settings

`app/core/config.py` reads environment variables at import time:

| Setting | Source/default |
| --- | --- |
| `DB_URL` | `DATABASE_URL`, then `DB_URL`, then local PostgreSQL URL on port 5433; SQLite configuration explicitly rejected |
| `REDIS_URL` | `REDIS_URL`, default `redis://localhost:6379/0` |
| `KAFKA_BOOTSTRAP_SERVERS` | Same-named variable, default `localhost:9094` |
| `CORS_ORIGINS` | Comma-separated variable; defaults to localhost and 127.0.0.1 on ports 3000–3003 |

DB component variables (`DB_HOST`, `DB_PORT`, etc.) are not read here. Rate limits, cache TTL, Kafka topic/group, and worker batch settings live elsewhere as constants. Tracing reads Jaeger settings in `app/observability/tracing.py`; logging reads `LOG_LEVEL` in `app/main.py`. Application settings do not load a dotenv file themselves.

## MCP server

`PYTHONPATH=.:mcp-server .venv/bin/python -m mcp_server.app` starts streamable HTTP on 127.0.0.1:8001 with `/mcp`. Install both root and MCP requirements; source adapters import the root application. It exposes six tools: suspicious-activity checking, click statistics, rate-limit signals, cache statistics, recent GitHub commits, and Slack reports.

The main workflow is invoked on demand, not continuously scheduled. It selects up to five recently active short codes, compares click velocity with a historical baseline, evaluates rate-limit heuristics, correlates recent commits, and optionally reports flagged URLs to Slack. Source failures generally produce logs and fallback values; the final report does not comprehensively expose all source failures. GitHub and Slack are external integrations; no credentials were added and no messages were sent during this inspection. MCP settings load `.env`; Slack posting defaults to disabled. Tests mock the integrations.

## Existing CI jobs

| Workflow/job | Trigger and behavior |
| --- | --- |
| `ci.yml` / `lint-and-test` | Push/PR to master, main, develop; Ubuntu/Python 3.11; PostgreSQL 16 and Redis 7 service containers; installs requirements and check tools; Black, selected Flake8 errors, isort, informational mypy; service readiness checks; root pytest with coverage XML and terminal output; Codecov upload with upload failure nonfatal |
| `cd.yml` / `build-and-push` | Push to master/main or `v*` tags, plus completed CI runs on master/main; builds backend image and pushes GHCR tags/cache using existing `GHCR_TOKEN` reference; no Kubernetes deployment |

No frontend or MCP checks run in these workflows. There is no coverage minimum. CD has neither a successful-CI conclusion guard on `workflow_run` nor a CI dependency for its direct push trigger. CI supplies separate DB credential variables that application settings ignore; unit fixtures use SQLite, so passing unit tests would not establish that its PostgreSQL settings work. No remote workflow was triggered or its historical outcome inferred here.

## Validation results

Environment: macOS, existing `.venv`, Python 3.11.5, pytest 9.0.3, Node v23.9.0. No dependencies installed for this snapshot. Standard backend and MCP pytest invocations exited 139 before collection. A diagnostic run with `PYTHONFAULTHANDLER=1` located the crash in pytest capture's readline import; disabling plugin autoload did not help. Disabling only the capture plugin allowed both unchanged suites to run.

| Check | Result |
| --- | --- |
| `.venv/bin/python -m pytest --cov=app --cov-report=term-missing -v` | Exit 139 before collection; no test verdict |
| MCP: `../.venv/bin/python -m pytest -v` | Exit 139 before collection; no test verdict |
| Backend, with `-p no:capture` | 23 passed, 1 SQLAlchemy deprecation warning; exit 0; reported coverage 61% |
| MCP, with `-p no:capture` | 10 passed, 1 SQLAlchemy deprecation warning; exit 0 |
| `black --check app/` | Failed: config.py and tracing.py need formatting |
| `flake8 app/ --count --select=E9,F63,F7,F82 --show-source --statistics` | Passed, output `0` |
| `isort --check-only app/` | Failed: main.py, tracing.py, database.py |
| `mypy app/ --ignore-missing-imports` | Failed: 13 errors in 8 files |
| Frontend `CI=1 npm run lint` | Opened ESLint configuration prompt; no lint verdict |
| Frontend `./node_modules/.bin/tsc --noEmit --incremental false` | Exit 0, no output |

The coverage figure is the tool's reported statement coverage, not complete system validation. `app/main.py`, the consumer, and analytics worker report 0%. Tests use in-memory SQLite and mocked cache/Kafka/external sources. No real-service integration, browser, k6, production build, or Kubernetes deployment test was run in this step. Earlier read-only inspection in this session found Compose containers running, but no end-to-end health test was performed.

## Risks and gaps (not fixed)

1. Rate limiting is inactive in the app. If registered as written, forwarded IP spoofing and fail-open behavior need deliberate policy; raw-path keys allow independent limits across codes.
2. Analytics is not guaranteed: synchronous producer flush can delay redirects, publication failures drop events, consumer offsets are not tied to DB commits, and there is no event ID/deduplication. The worker's timeout does not flush an idle batch; malformed events and DB errors lack recovery handling.
3. MCP treats accepted `/shorten` requests as rejected-limit triggers; scans all clients rather than per-code signals; expects numeric sorted-set members although the limiter writes timestamp-UUID strings; and attempts longer windows than the 60-second key retention. Mocked tests do not catch this contract mismatch.
4. MCP describes continuous monitoring and complete diagnostics more strongly than its on-demand implementation supports. GitHub correlation is a heuristic, not causal evidence; partial-source failures can look like no suspicious activity. Cache hit ratio is returned as unavailable.
5. Redis read errors can fail redirects: `get_cache` does not catch network exceptions. `/urls` returns an empty list on errors; analytics maps all errors to 404; `/health` returns HTTP 200 even when degraded. These can conceal operational failures.
6. Unit tests do not exercise the assembled app, actual Redis Lua, Kafka/worker delivery, or PostgreSQL-specific behavior. Frontend and MCP are absent from CI; lint setup and current formatting/type errors prevent a clean quality baseline.
7. Sequential short codes are enumerable; public URL listing and analytics have no authentication in the inspected routes. Full URLs are added to tracing spans, so sensitive URL contents could enter telemetry.
8. Dependencies are largely unpinned; several container images use `latest`. Tracked `url_shortener.db`, `dump.rdb`, `.coverage`, `coverage.xml`, and `frontend/tsconfig.tsbuildinfo` are existing data/generated artifacts. Ignore rules are incomplete; Docker build uses `COPY .`, and its exclusions do not cover all frontend/database artifacts. No existing artifacts were removed in this step.
9. Compose and Kubernetes include development credentials; no production secret-management claim is warranted. No credential values are reproduced here. Existing external integration hooks do not authorize adding paid services or cloud credentials.
10. Kubernetes is an incomplete alternative deployment. Earlier live inspection on this date found PostgreSQL/Redis blocked by unbound PVCs, API/worker waiting, migration failure, Kafka/ZooKeeper crash loops, and an unavailable resource metrics API preventing HPA operation. Grafana/Prometheus were running. This is a dated observation, not a fresh deployment test.
11. Kubernetes manifests use hostpath storage and single replicas for core stateful components. The deploy script continues after readiness/migration timeouts, omits the frontend manifest, and does not provision Jaeger. Documentation saying deployment is complete or Kafka is optional is stale; `deploy-simple.sh` now delegates to the full script. API probes depend on Redis, so Redis failure can trigger API restarts.
12. CD can publish independently of successful tests; backend images use a local `latest` tag in Kubernetes rather than an automatically deployed immutable CI artifact. Documentation and runtime configuration have drifted.

## Test inventory and command output

The following inventory and outputs were captured from the actual local checks. Paths in output are normalized to the repository root for portability; no test behavior was modified.

### Backend tests (capture disabled)

```text
============================= test session starts ==============================
platform darwin -- Python 3.11.5, pytest-9.0.3, pluggy-1.6.0 -- .venv/bin/python
cachedir: .pytest_cache
rootdir: /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener
configfile: pytest.ini
testpaths: tests
plugins: cov-7.1.0, anyio-4.13.0
collecting ... collected 23 items

tests/test_analytics_repository.py::test_batch_create_clicks_uses_single_execute_call PASSED
tests/test_analytics_repository.py::test_batch_create_clicks_returns_zero_for_empty_list PASSED
tests/test_analytics_repository.py::test_analytics_repository_count_and_timestamps PASSED
tests/test_analytics_service.py::test_get_analytics_uses_repository_results PASSED
tests/test_base62.py::test_encode_base62_zero_returns_empty_string PASSED
tests/test_base62.py::test_encode_base62_small_numbers PASSED
tests/test_base62.py::test_encode_base62_larger_number PASSED
tests/test_health_route.py::test_health_endpoint_includes_total_urls PASSED
tests/test_rate_limiter.py::test_rate_limiter_allows_request_and_sets_headers PASSED
tests/test_rate_limiter.py::test_rate_limiter_rejects_request_when_limit_exceeded PASSED
tests/test_rate_limiter.py::test_rate_limiter_fails_open_when_redis_unavailable PASSED
tests/test_rate_limiter.py::test_rate_limiter_bypasses_metrics_endpoint PASSED
tests/test_routes.py::test_create_short_url_returns_service_code PASSED
tests/test_routes.py::test_redirect_returns_redirect_response PASSED
tests/test_routes.py::test_redirect_raises_404_for_missing_code PASSED
tests/test_routes.py::test_analytics_route_uses_service PASSED
tests/test_routes.py::test_redis_health_success PASSED
tests/test_routes.py::test_redis_health_failure PASSED
tests/test_url_repository.py::test_url_repository_create_with_code_and_lookup PASSED
tests/test_url_service.py::test_shorten_creates_code_and_commits PASSED
tests/test_url_service.py::test_resolve_returns_cached_value_and_records_click PASSED
tests/test_url_service.py::test_resolve_caches_database_value_on_miss PASSED
tests/test_url_service.py::test_resolve_returns_none_when_code_missing PASSED

=============================== warnings summary ===============================
app/models/url.py:4
  app/models/url.py:4: MovedIn20Warning: The ``declarative_base()`` function is now available as sqlalchemy.orm.declarative_base(). (deprecated since: 2.0) (Background on SQLAlchemy 2.0 at: https://sqlalche.me/e/b8d9)
    Base = declarative_base()

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
================================ tests coverage ================================
_______________ coverage: platform darwin, python 3.11.5-final-0 _______________

Name                                       Stmts   Miss  Cover   Missing
------------------------------------------------------------------------
app/__init__.py                                0      0   100%
app/api/__init__.py                            0      0   100%
app/api/routes.py                             60     10    83%   29-30, 35-38, 49-50, 55-56
app/cache/__init__.py                          0      0   100%
app/cache/redis_client.py                     36     18    50%   16, 19, 22, 25, 30-31, 39-41, 48-53, 58-61
app/core/__init__.py                           0      0   100%
app/core/config.py                             9      1    89%   22
app/db/__init__.py                             0      0   100%
app/db/database.py                            15      6    60%   25-31
app/kafka/__init__.py                          0      0   100%
app/kafka/consumer.py                         12     12     0%   1-24
app/kafka/producer.py                         33     22    33%   19-29, 33-50
app/main.py                                   29     29     0%   1-56
app/middleware/rate_limiter.py                43      5    88%   57, 65-78
app/models/__init__.py                         0      0   100%
app/models/analytics.py                        7      0   100%
app/models/url.py                              9      0   100%
app/observability/metrics.py                  23      4    83%   35, 45, 49, 59
app/repositories/__init__.py                   0      0   100%
app/repositories/analytics_repository.py      19      1    95%   9
app/repositories/url_repository.py            18      2    89%   26-40
app/schemas/__init__.py                        0      0   100%
app/schemas/url_schema.py                      5      0   100%
app/services/__init__.py                       0      0   100%
app/services/analytics_service.py              8      0   100%
app/services/url_service.py                   48      3    94%   65-66, 70
app/utils/__init__.py                          0      0   100%
app/utils/base62.py                            9      0   100%
app/workers/__init__.py                        0      0   100%
app/workers/analytics_worker.py               60     60     0%   1-93
------------------------------------------------------------------------
TOTAL                                        443    173    61%
======================== 23 passed, 1 warning in 0.82s =========================
```

### MCP tests (capture disabled)

```text
============================= test session starts ==============================
platform darwin -- Python 3.11.5, pytest-9.0.3, pluggy-1.6.0
rootdir: mcp-server
configfile: pyproject.toml
plugins: cov-7.1.0, anyio-4.13.0
collected 10 items

tests/test_abuse_flagging.py ...
tests/test_github_source.py ..
tests/test_project_data_sources.py ...
tests/test_slack_source.py ..

=============================== warnings summary ===============================
../app/models/url.py:4
  app/models/url.py:4: MovedIn20Warning: The ``declarative_base()`` function is now available as sqlalchemy.orm.declarative_base(). (deprecated since: 2.0) (Background on SQLAlchemy 2.0 at: https://sqlalche.me/e/b8d9)
    Base = declarative_base()

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
======================== 10 passed, 1 warning in 1.00s =========================
```

### Backend lint and type checks (initial output)

```text
would reformat app/core/config.py
would reformat app/observability/tracing.py

Oh no! 💥 💔 💥
2 files would be reformatted, 30 files would be left unchanged.
0
ERROR: app/main.py Imports are incorrectly sorted and/or formatted.
ERROR: app/observability/tracing.py Imports are incorrectly sorted and/or formatted.
ERROR: app/db/database.py Imports are incorrectly sorted and/or formatted.
app/core/config.py:21: error: Item "None" of "str | None" has no attribute "startswith"  [union-attr]
app/observability/logging.py:58: error: Unsupported right operand type for in ("str | None")  [operator]
app/observability/logging.py:59: error: Unsupported left operand type for + ("None")  [operator]
app/observability/logging.py:59: note: Left operand is of type "str | None"
app/db/database.py:13: error: Argument 1 to "create_engine" has incompatible type "str | None"; expected "str | URL"  [arg-type]
app/db/database.py:20: error: Incompatible types in assignment (expression has type "None", variable has type "Engine")  [assignment]
app/db/database.py:21: error: Incompatible types in assignment (expression has type "None", variable has type "sessionmaker[Session]")  [assignment]
app/models/url.py:7: error: Variable "app.models.url.Base" is not valid as a type  [valid-type]
app/models/url.py:7: note: See https://mypy.readthedocs.io/en/stable/common_issues.html#variables-vs-type-aliases
app/models/url.py:7: error: Invalid base class "Base"  [misc]
app/repositories/url_repository.py:18: error: Argument 1 to "encode_base62" has incompatible type "Column[int]"; expected "int"  [arg-type]
app/repositories/url_repository.py:19: error: Incompatible types in assignment (expression has type "str", variable has type "Column[str]")  [assignment]
```

### Type check completion

```text
app/cache/redis_client.py:6: error: Incompatible types in assignment (expression has type "None", variable has type Module)  [assignment]
app/services/url_service.py:51: error: Incompatible return value type (got "None", expected "str")  [return-value]
app/api/routes.py:21: error: Argument 2 to "shorten" of "URLService" has incompatible type "HttpUrl"; expected "str"  [arg-type]
Found 13 errors in 8 files (checked 32 source files)
```

### Frontend lint setup prompt and TypeScript check

```text

> url-shortener-frontend@0.1.0 lint
> next lint

? How would you like to configure ESLint? https://nextjs.org/docs/basic-features/eslint
❯  Strict (recommended)
   Base
   Cancel ⚠ If you set up ESLint yourself, we recommend adding the Next.js ESLint plugin. See https://nextjs.org/docs/basic-features/eslint#migrating-existing-config
```

### Initial pytest crash diagnostic

```text
Fatal Python error: Segmentation fault

Current thread 0x00000001ec254f40 (most recent call first):
  File "<frozen importlib._bootstrap>", line 241 in _call_with_frames_removed
  File "<frozen importlib._bootstrap_external>", line 1233 in create_module
  File "<frozen importlib._bootstrap>", line 573 in module_from_spec
  File "<frozen importlib._bootstrap>", line 676 in _load_unlocked
  File "<frozen importlib._bootstrap>", line 1147 in _find_and_load_unlocked
  File "<frozen importlib._bootstrap>", line 1176 in _find_and_load
  File ".venv/lib/python3.11/site-packages/_pytest/capture.py", line 95 in _readline_workaround
  File ".venv/lib/python3.11/site-packages/_pytest/capture.py", line 161 in pytest_load_initial_conftests
  File ".venv/lib/python3.11/site-packages/pluggy/_callers.py", line 116 in _multicall
  File ".venv/lib/python3.11/site-packages/pluggy/_manager.py", line 120 in _hookexec
  File ".venv/lib/python3.11/site-packages/pluggy/_hooks.py", line 512 in __call__
  File ".venv/lib/python3.11/site-packages/_pytest/config/__init__.py", line 1562 in parse
  File ".venv/lib/python3.11/site-packages/_pytest/config/__init__.py", line 1192 in pytest_cmdline_parse
  File ".venv/lib/python3.11/site-packages/pluggy/_callers.py", line 121 in _multicall
  File ".venv/lib/python3.11/site-packages/pluggy/_manager.py", line 120 in _hookexec
  File ".venv/lib/python3.11/site-packages/pluggy/_hooks.py", line 512 in __call__
  File ".venv/lib/python3.11/site-packages/_pytest/config/__init__.py", line 361 in _prepareconfig
  File ".venv/lib/python3.11/site-packages/_pytest/config/__init__.py", line 193 in main
  File ".venv/lib/python3.11/site-packages/_pytest/config/__init__.py", line 223 in console_main
  File ".venv/lib/python3.11/site-packages/pytest/__main__.py", line 9 in <module>
  File "<frozen runpy>", line 88 in _run_code
  File "<frozen runpy>", line 198 in _run_module_as_main
```

### Complete test inventory

All 33 cases below passed using `-p no:capture`.


**tests/test_analytics_repository.py**

- `test_batch_create_clicks_uses_single_execute_call` — PASS
- `test_batch_create_clicks_returns_zero_for_empty_list` — PASS
- `test_analytics_repository_count_and_timestamps` — PASS

**tests/test_analytics_service.py**

- `test_get_analytics_uses_repository_results` — PASS

**tests/test_base62.py**

- `test_encode_base62_zero_returns_empty_string` — PASS
- `test_encode_base62_small_numbers` — PASS
- `test_encode_base62_larger_number` — PASS

**tests/test_health_route.py**

- `test_health_endpoint_includes_total_urls` — PASS

**tests/test_rate_limiter.py**

- `test_rate_limiter_allows_request_and_sets_headers` — PASS
- `test_rate_limiter_rejects_request_when_limit_exceeded` — PASS
- `test_rate_limiter_fails_open_when_redis_unavailable` — PASS
- `test_rate_limiter_bypasses_metrics_endpoint` — PASS

**tests/test_routes.py**

- `test_create_short_url_returns_service_code` — PASS
- `test_redirect_returns_redirect_response` — PASS
- `test_redirect_raises_404_for_missing_code` — PASS
- `test_analytics_route_uses_service` — PASS
- `test_redis_health_success` — PASS
- `test_redis_health_failure` — PASS

**tests/test_url_repository.py**

- `test_url_repository_create_with_code_and_lookup` — PASS

**tests/test_url_service.py**

- `test_shorten_creates_code_and_commits` — PASS
- `test_resolve_returns_cached_value_and_records_click` — PASS
- `test_resolve_caches_database_value_on_miss` — PASS
- `test_resolve_returns_none_when_code_missing` — PASS

**mcp-server/tests/test_abuse_flagging.py**

- `test_flag_thresholds_detects_spike_and_rate_limit` — PASS
- `test_check_suspicious_url_activity_returns_expected_structure` — PASS
- `test_check_suspicious_url_activity_flags_abuse_and_posts_to_slack` — PASS

**mcp-server/tests/test_github_source.py**

- `test_get_recent_commits_happy` — PASS
- `test_get_recent_commits_rate_limited` — PASS

**mcp-server/tests/test_project_data_sources.py**

- `test_get_click_stats_happy` — PASS
- `test_get_click_stats_failure` — PASS
- `test_rate_limit_signals_and_cache_happy_and_failure` — PASS

**mcp-server/tests/test_slack_source.py**

- `test_post_flag_report_disabled` — PASS
- `test_post_flag_report_happy_and_failure` — PASS

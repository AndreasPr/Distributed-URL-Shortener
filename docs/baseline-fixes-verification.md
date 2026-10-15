# Step 0.4 verification

Branch: `step-0-4-baseline-fixes`. CPython 3.11.14; SQLite and fake Redis/Kafka, not live-service validation.

Final `make check`, `make mcp-test`, and `make frontend-check` each exited 0. Backend: 61 passed, 2 skipped, 1 xfailed, 76% statement coverage. The strict xfail documents the unregistered rate limiter (step 2.1). Two auto-instrumentation tests skip because existing OTel requires missing pkg_resources; direct span privacy and hook-wiring tests pass. Initial development run of those two tests failed with ModuleNotFoundError before this explicit skip was added; no dependency changes were made. FastAPI/Starlette deprecation warnings remain. Frontend passes with the existing Node 23.9 engine and dependency deprecation warnings.


## make check

Complete output (exit 0; trailing whitespace trimmed):

```text
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m black --check app/
All done! ✨ 🍰 ✨
32 files would be left unchanged.
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m isort --check-only app/
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m flake8 app/
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m mypy app/
Success: no issues found in 32 source files
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m pytest --cov=app --cov-report=term-missing --cov-report=xml
============================= test session starts ==============================
platform darwin -- Python 3.11.14, pytest-9.0.3, pluggy-1.7.0 -- /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python
cachedir: .pytest_cache
rootdir: /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener
configfile: pytest.ini
testpaths: tests
plugins: platformdirs-4.13.0, cov-7.1.0, anyio-4.15.1
collecting ... collected 64 items

tests/test_analytics_repository.py::test_batch_create_clicks_uses_single_execute_call PASSED [  1%]
tests/test_analytics_repository.py::test_batch_create_clicks_returns_zero_for_empty_list PASSED [  3%]
tests/test_analytics_repository.py::test_analytics_repository_count_and_timestamps PASSED [  4%]
tests/test_analytics_service.py::test_get_analytics_uses_repository_results PASSED [  6%]
tests/test_app_assembly.py::test_middleware_and_metrics PASSED           [  7%]
tests/test_app_assembly.py::test_cors_preflight PASSED                   [  9%]
tests/test_app_assembly.py::test_rate_limiter_is_registered XFAIL (S...) [ 10%]
tests/test_app_assembly.py::test_main_routes PASSED                      [ 12%]
tests/test_app_assembly.py::test_service_failures_are_503[/urls-service0-list_recent_urls] PASSED [ 14%]
tests/test_app_assembly.py::test_service_failures_are_503[/analytics/code-service1-get_analytics] PASSED [ 15%]
tests/test_app_assembly.py::test_health_dependency_failures[db] PASSED   [ 17%]
tests/test_app_assembly.py::test_health_dependency_failures[redis] PASSED [ 18%]
tests/test_app_assembly.py::test_health_dependency_failures[both] PASSED [ 20%]
tests/test_app_assembly.py::test_false_redis_ping_is_unhealthy PASSED    [ 21%]
tests/test_app_assembly.py::test_livez_does_not_touch_dependencies PASSED [ 23%]
tests/test_app_assembly.py::test_redirect_falls_back_on_redis_read_failure[ConnectionError] PASSED [ 25%]
tests/test_app_assembly.py::test_redirect_falls_back_on_redis_read_failure[TimeoutError] PASSED [ 26%]
tests/test_app_assembly.py::test_redis_health_read_failures[ping] PASSED [ 28%]
tests/test_app_assembly.py::test_redis_health_read_failures[dbsize] PASSED [ 29%]
tests/test_app_assembly.py::test_health_session_acquisition_failure PASSED [ 31%]
tests/test_app_assembly.py::test_health_session_is_closed PASSED         [ 32%]
tests/test_base62.py::test_encode_base62_zero_returns_empty_string PASSED [ 34%]
tests/test_base62.py::test_encode_base62_small_numbers PASSED            [ 35%]
tests/test_base62.py::test_encode_base62_larger_number PASSED            [ 37%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_USER] PASSED [ 39%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_PASSWORD] PASSED [ 40%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_DB] PASSED [ 42%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[GRAFANA_ADMIN_USER] PASSED [ 43%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[GRAFANA_ADMIN_PASSWORD] PASSED [ 45%]
tests/test_deployment_config.py::test_compose_uses_same_database_credentials_for_all_clients PASSED [ 46%]
tests/test_health_route.py::test_health_endpoint_includes_total_urls PASSED [ 48%]
tests/test_rate_limiter.py::test_rate_limiter_allows_request_and_sets_headers PASSED [ 50%]
tests/test_rate_limiter.py::test_rate_limiter_rejects_request_when_limit_exceeded PASSED [ 51%]
tests/test_rate_limiter.py::test_rate_limiter_fails_open_when_redis_unavailable PASSED [ 53%]
tests/test_rate_limiter.py::test_rate_limiter_bypasses_metrics_endpoint PASSED [ 54%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[get-ConnectionError] PASSED [ 56%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[get-TimeoutError] PASSED [ 57%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[ping-ConnectionError] PASSED [ 59%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[ping-TimeoutError] PASSED [ 60%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[dbsize-ConnectionError] PASSED [ 62%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[dbsize-TimeoutError] PASSED [ 64%]
tests/test_redis_client.py::test_programming_errors_are_not_hidden PASSED [ 65%]
tests/test_redis_client.py::test_normal_cache_reads[https://example.com/-counter0] PASSED [ 67%]
tests/test_redis_client.py::test_normal_cache_reads[None-counter1] PASSED [ 68%]
tests/test_routes.py::test_create_short_url_returns_service_code PASSED  [ 70%]
tests/test_routes.py::test_redirect_returns_redirect_response PASSED     [ 71%]
tests/test_routes.py::test_redirect_raises_404_for_missing_code PASSED   [ 73%]
tests/test_routes.py::test_analytics_route_uses_service PASSED           [ 75%]
tests/test_routes.py::test_redis_health_success PASSED                   [ 76%]
tests/test_routes.py::test_redis_health_failure PASSED                   [ 78%]
tests/test_tooling_regressions.py::test_typed_models_preserve_column_types_and_nullability PASSED [ 79%]
tests/test_tooling_regressions.py::test_trace_logging_preserves_message_for_default_formatter PASSED [ 81%]
tests/test_tooling_regressions.py::test_worker_reports_unconfigured_database PASSED [ 82%]
tests/test_trace_privacy.py::test_url_spans_only_include_origin_and_code[False] PASSED [ 84%]
tests/test_trace_privacy.py::test_url_spans_only_include_origin_and_code[True] PASSED [ 85%]
tests/test_trace_privacy.py::test_auto_instrumented_redis_does_not_export_cached_url SKIPPED [ 87%]
tests/test_trace_privacy.py::test_auto_instrumented_http_does_not_export_path_or_query SKIPPED [ 89%]
tests/test_trace_privacy.py::test_tracing_initialization_installs_privacy_hooks PASSED [ 90%]
tests/test_trace_privacy.py::test_privacy_hooks_redact_instrumentation_attributes PASSED [ 92%]
tests/test_url_repository.py::test_url_repository_create_with_code_and_lookup PASSED [ 93%]
tests/test_url_service.py::test_shorten_creates_code_and_commits PASSED  [ 95%]
tests/test_url_service.py::test_resolve_returns_cached_value_and_records_click PASSED [ 96%]
tests/test_url_service.py::test_resolve_caches_database_value_on_miss PASSED [ 98%]
tests/test_url_service.py::test_resolve_returns_none_when_code_missing PASSED [100%]

=============================== warnings summary ===============================
.venv/lib/python3.11/site-packages/starlette/testclient.py:45
  /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/lib/python3.11/site-packages/starlette/testclient.py:45: DeprecationWarning: The anyio.abc.BlockingPortal alias is deprecated, use anyio.from_thread.BlockingPortal instead.
    _PortalFactoryType = Callable[[], AbstractContextManager[anyio.abc.BlockingPortal]]

app/main.py:37
  /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/app/main.py:37: DeprecationWarning:
          on_event is deprecated, use lifespan event handlers instead.

          Read more about it in the
          [FastAPI docs for Lifespan Events](https://fastapi.tiangolo.com/advanced/events/).

    @app.on_event("startup")

.venv/lib/python3.11/site-packages/fastapi/applications.py:4598
  /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/lib/python3.11/site-packages/fastapi/applications.py:4598: DeprecationWarning:
          on_event is deprecated, use lifespan event handlers instead.

          Read more about it in the
          [FastAPI docs for Lifespan Events](https://fastapi.tiangolo.com/advanced/events/).

    return self.router.on_event(event_type)  # ty: ignore[deprecated]

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
================================ tests coverage ================================
______________ coverage: platform darwin, python 3.11.14-final-0 _______________

Name                                       Stmts   Miss  Cover   Missing
------------------------------------------------------------------------
app/__init__.py                                0      0   100%
app/api/__init__.py                            0      0   100%
app/api/routes.py                             89      2    98%   80-81
app/cache/__init__.py                          0      0   100%
app/cache/redis_client.py                     48     11    77%   24, 27, 30, 33, 38-39, 47-49, 86-87
app/core/__init__.py                           0      0   100%
app/core/config.py                             9      1    89%   24
app/db/__init__.py                             0      0   100%
app/db/database.py                            17      6    65%   29-35
app/kafka/__init__.py                          0      0   100%
app/kafka/consumer.py                         12      5    58%   14-24
app/kafka/producer.py                         33     22    33%   19-29, 33-50
app/main.py                                   29      4    86%   33-34, 49-50
app/middleware/rate_limiter.py                43      5    88%   57, 65-78
app/models/__init__.py                         0      0   100%
app/models/analytics.py                        9      0   100%
app/models/url.py                             11      0   100%
app/observability/logging.py                  27      6    78%   25-26, 73-76
app/observability/metrics.py                  26      1    96%   59
app/observability/tracing.py                  97     45    54%   39-50, 70-71, 88-92, 117-120, 136-137, 140-141, 144-145, 151-154, 159-179
app/repositories/__init__.py                   0      0   100%
app/repositories/analytics_repository.py      19      1    95%   9
app/repositories/url_repository.py            18      0   100%
app/schemas/__init__.py                        0      0   100%
app/schemas/url_schema.py                      5      0   100%
app/services/__init__.py                       0      0   100%
app/services/analytics_service.py             13      0   100%
app/services/url_service.py                   61      4    93%   22-23, 81-82
app/utils/__init__.py                          0      0   100%
app/utils/base62.py                            9      0   100%
app/workers/__init__.py                        0      0   100%
app/workers/analytics_worker.py               62     39    37%   22-35, 47-91, 95
------------------------------------------------------------------------
TOTAL                                        637    152    76%
Coverage XML written to file coverage.xml
============= 61 passed, 2 skipped, 1 xfailed, 3 warnings in 3.89s =============
```


## make mcp-test

Complete output (exit 0; trailing whitespace trimmed):

```text
cd mcp-server && /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m pytest
..........                                                               [100%]
10 passed in 0.52s
```


## make frontend-check

Complete output (exit 0; trailing whitespace trimmed):

```text
cd frontend && npm ci --no-audit --no-fund
npm warn EBADENGINE Unsupported engine {
npm warn EBADENGINE   package: 'eslint-visitor-keys@5.0.1',
npm warn EBADENGINE   required: { node: '^20.19.0 || ^22.13.0 || >=24' },
npm warn EBADENGINE   current: { node: 'v23.9.0', npm: '10.9.2' }
npm warn EBADENGINE }
npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
npm warn deprecated @humanwhocodes/config-array@0.13.0: Use @eslint/config-array instead
npm warn deprecated rimraf@3.0.2: Rimraf versions prior to v4 are no longer supported
npm warn deprecated glob@7.2.3: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
npm warn deprecated @humanwhocodes/object-schema@2.0.3: Use @eslint/object-schema instead
npm warn deprecated node-domexception@1.0.0: Use your platform's native DOMException instead
npm warn deprecated glob@10.3.10: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
npm warn deprecated eslint@8.57.1: This version is no longer supported. Please see https://eslint.org/version-support for other options.

added 781 packages in 11s
cd frontend && npm run lint -- --max-warnings=0

> url-shortener-frontend@0.1.0 lint
> next lint --max-warnings=0

✔ No ESLint warnings or errors
cd frontend && ./node_modules/.bin/tsc --noEmit --incremental false
```

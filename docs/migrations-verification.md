# Step 1.1 migration verification

Branch: `step-1-1-migrations`. Python 3.11.14. Existing Compose databases and volumes were not changed.

`make check`: exit 0, 63 passed, 4 skipped, 1 xfailed, 76% application coverage. Two skips are opt-in PostgreSQL tests, both subsequently run successfully below. The other two are the pre-existing tracing integration skips for missing pkg_resources. The strict xfail remains the unregistered rate limiter (step 2.1).

PostgreSQL: all four tests in tests/test_migrations.py passed, including the two Docker cases. MCP: 10 passed. Docker image build and isolated startup smoke check passed. Compose config --quiet, migration Black/isort/Flake8, bash -n k8s/deploy.sh, and git diff --check exited 0. Frontend checks were not repeated because this change touches no frontend code or dependencies. No Kubernetes cluster deployment was performed.

The first sandboxed make lock attempt failed with a uv macOS system-configuration panic (exit 101); the authorized unsandboxed retry succeeded. Sync installed only Alembic 1.18.4, Mako 1.4.3, and MarkupSafe 3.0.4. Existing locked versions were retained. Docker access likewise required running outside the filesystem sandbox.


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
collecting ... collected 68 items

tests/test_analytics_repository.py::test_batch_create_clicks_uses_single_execute_call PASSED [  1%]
tests/test_analytics_repository.py::test_batch_create_clicks_returns_zero_for_empty_list PASSED [  2%]
tests/test_analytics_repository.py::test_analytics_repository_count_and_timestamps PASSED [  4%]
tests/test_analytics_service.py::test_get_analytics_uses_repository_results PASSED [  5%]
tests/test_app_assembly.py::test_middleware_and_metrics PASSED           [  7%]
tests/test_app_assembly.py::test_cors_preflight PASSED                   [  8%]
tests/test_app_assembly.py::test_rate_limiter_is_registered XFAIL (S...) [ 10%]
tests/test_app_assembly.py::test_main_routes PASSED                      [ 11%]
tests/test_app_assembly.py::test_service_failures_are_503[/urls-service0-list_recent_urls] PASSED [ 13%]
tests/test_app_assembly.py::test_service_failures_are_503[/analytics/code-service1-get_analytics] PASSED [ 14%]
tests/test_app_assembly.py::test_health_dependency_failures[db] PASSED   [ 16%]
tests/test_app_assembly.py::test_health_dependency_failures[redis] PASSED [ 17%]
tests/test_app_assembly.py::test_health_dependency_failures[both] PASSED [ 19%]
tests/test_app_assembly.py::test_false_redis_ping_is_unhealthy PASSED    [ 20%]
tests/test_app_assembly.py::test_livez_does_not_touch_dependencies PASSED [ 22%]
tests/test_app_assembly.py::test_redirect_falls_back_on_redis_read_failure[ConnectionError] PASSED [ 23%]
tests/test_app_assembly.py::test_redirect_falls_back_on_redis_read_failure[TimeoutError] PASSED [ 25%]
tests/test_app_assembly.py::test_redis_health_read_failures[ping] PASSED [ 26%]
tests/test_app_assembly.py::test_redis_health_read_failures[dbsize] PASSED [ 27%]
tests/test_app_assembly.py::test_health_session_acquisition_failure PASSED [ 29%]
tests/test_app_assembly.py::test_health_session_is_closed PASSED         [ 30%]
tests/test_base62.py::test_encode_base62_zero_returns_empty_string PASSED [ 32%]
tests/test_base62.py::test_encode_base62_small_numbers PASSED            [ 33%]
tests/test_base62.py::test_encode_base62_larger_number PASSED            [ 35%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_USER] PASSED [ 36%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_PASSWORD] PASSED [ 38%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_DB] PASSED [ 39%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[GRAFANA_ADMIN_USER] PASSED [ 41%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[GRAFANA_ADMIN_PASSWORD] PASSED [ 42%]
tests/test_deployment_config.py::test_compose_uses_same_database_credentials_for_all_clients PASSED [ 44%]
tests/test_health_route.py::test_health_endpoint_includes_total_urls PASSED [ 45%]
tests/test_migrations.py::test_migrations_on_empty_sqlite PASSED         [ 47%]
tests/test_migrations.py::test_offline_sql_uses_postgresql_settings PASSED [ 48%]
tests/test_migrations.py::test_postgresql_upgrade_schema_constraints_and_downgrade SKIPPED [ 50%]
tests/test_migrations.py::test_legacy_schema_can_be_stamped_and_upgraded SKIPPED [ 51%]
tests/test_rate_limiter.py::test_rate_limiter_allows_request_and_sets_headers PASSED [ 52%]
tests/test_rate_limiter.py::test_rate_limiter_rejects_request_when_limit_exceeded PASSED [ 54%]
tests/test_rate_limiter.py::test_rate_limiter_fails_open_when_redis_unavailable PASSED [ 55%]
tests/test_rate_limiter.py::test_rate_limiter_bypasses_metrics_endpoint PASSED [ 57%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[get-ConnectionError] PASSED [ 58%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[get-TimeoutError] PASSED [ 60%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[ping-ConnectionError] PASSED [ 61%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[ping-TimeoutError] PASSED [ 63%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[dbsize-ConnectionError] PASSED [ 64%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[dbsize-TimeoutError] PASSED [ 66%]
tests/test_redis_client.py::test_programming_errors_are_not_hidden PASSED [ 67%]
tests/test_redis_client.py::test_normal_cache_reads[https://example.com/-counter0] PASSED [ 69%]
tests/test_redis_client.py::test_normal_cache_reads[None-counter1] PASSED [ 70%]
tests/test_routes.py::test_create_short_url_returns_service_code PASSED  [ 72%]
tests/test_routes.py::test_redirect_returns_redirect_response PASSED     [ 73%]
tests/test_routes.py::test_redirect_raises_404_for_missing_code PASSED   [ 75%]
tests/test_routes.py::test_analytics_route_uses_service PASSED           [ 76%]
tests/test_routes.py::test_redis_health_success PASSED                   [ 77%]
tests/test_routes.py::test_redis_health_failure PASSED                   [ 79%]
tests/test_tooling_regressions.py::test_typed_models_preserve_column_types_and_nullability PASSED [ 80%]
tests/test_tooling_regressions.py::test_trace_logging_preserves_message_for_default_formatter PASSED [ 82%]
tests/test_tooling_regressions.py::test_worker_reports_unconfigured_database PASSED [ 83%]
tests/test_trace_privacy.py::test_url_spans_only_include_origin_and_code[False] PASSED [ 85%]
tests/test_trace_privacy.py::test_url_spans_only_include_origin_and_code[True] PASSED [ 86%]
tests/test_trace_privacy.py::test_auto_instrumented_redis_does_not_export_cached_url SKIPPED [ 88%]
tests/test_trace_privacy.py::test_auto_instrumented_http_does_not_export_path_or_query SKIPPED [ 89%]
tests/test_trace_privacy.py::test_tracing_initialization_installs_privacy_hooks PASSED [ 91%]
tests/test_trace_privacy.py::test_privacy_hooks_redact_instrumentation_attributes PASSED [ 92%]
tests/test_url_repository.py::test_url_repository_create_with_code_and_lookup PASSED [ 94%]
tests/test_url_service.py::test_shorten_creates_code_and_commits PASSED  [ 95%]
tests/test_url_service.py::test_resolve_returns_cached_value_and_records_click PASSED [ 97%]
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
app/models/analytics.py                       11      0   100%
app/models/url.py                             14      0   100%
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
TOTAL                                        642    152    76%
Coverage XML written to file coverage.xml
============= 63 passed, 4 skipped, 1 xfailed, 3 warnings in 6.18s =============
```


## PostgreSQL migration tests

Complete output (exit 0; trailing whitespace trimmed):

```text
============================= test session starts ==============================
platform darwin -- Python 3.11.14, pytest-9.0.3, pluggy-1.7.0 -- /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python
cachedir: .pytest_cache
rootdir: /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener
configfile: pytest.ini
plugins: platformdirs-4.13.0, cov-7.1.0, anyio-4.15.1
collecting ... collected 4 items

tests/test_migrations.py::test_migrations_on_empty_sqlite PASSED         [ 25%]
tests/test_migrations.py::test_offline_sql_uses_postgresql_settings PASSED [ 50%]
tests/test_migrations.py::test_postgresql_upgrade_schema_constraints_and_downgrade PASSED [ 75%]
tests/test_migrations.py::test_legacy_schema_can_be_stamped_and_upgraded PASSED [100%]

============================== 4 passed in 3.43s ===============================
```


## make mcp-test

Complete output (exit 0; trailing whitespace trimmed):

```text
cd mcp-server && /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m pytest
..........                                                               [100%]
10 passed in 0.53s
```


## Built-image startup smoke check

Complete output (exit 0; trailing whitespace trimmed):

```text
Default image command: /livez HTTP 200 after migrations
0002 (head)
No new upgrade operations detected.
Unavailable database: container exited nonzero without starting Uvicorn
```


## Image build

`docker build -t url-shortener:step-1-1 .` exited 0. Final output excerpt:

```text
#13 [stage-1 5/5] COPY . ./
#13 DONE 0.0s

#14 exporting to image
#14 exporting layers
#14 exporting layers 0.2s done
#14 writing image sha256:4368f80aedf1a07705ef3eddba11ce0371a3487f2138189b68193117fd19501b
#14 writing image sha256:4368f80aedf1a07705ef3eddba11ce0371a3487f2138189b68193117fd19501b done
#14 naming to docker.io/library/url-shortener:step-1-1 done
#14 DONE 0.2s

View build details: docker-desktop://dashboard/build/desktop-linux/desktop-linux/4qwrnyzejbdsqiyu8amjooumn
```

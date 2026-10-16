# Step 1.2 short-code verification

Branch: `step-1-2-short-codes`. Python 3.11.14. No user database or persistent volume was modified.

Final `make check`: exit 0; Black, isort, Flake8, mypy passed; 69 passed, 5 skipped, 1 xfailed, 77% statement coverage. Three default skips are opt-in Docker tests; all three passed in the separate PostgreSQL run (11 tests total). Two pre-existing tracing integration tests still skip for missing pkg_resources. The rate-limiter registration xfail remains intentional for step 2.1. MCP: 10 passed, exit 0. Frontend checks were not repeated: no frontend files, dependencies, or API response shapes changed.

The first PostgreSQL run reported three setup errors because the extracted shared fixture lacked the sqlalchemy.text import. That import was fixed and the complete PostgreSQL run passed. No test failure was suppressed.

The concurrency test uses eight independent SQLAlchemy sessions/services against a freshly migrated disposable PostgreSQL container, 25 commits per session, and a forced first-candidate collision across all sessions. The 100,000-candidate sample injects a deterministic test RNG to avoid a probabilistically flaky assertion; production uses secrets.choice. See [ADR](adr/0001-short-code-generation.md) for probability and security limits.


## make check

Complete output (exit 0; trailing whitespace trimmed):

```text
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m black --check app/
All done! ✨ 🍰 ✨
33 files would be left unchanged.
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m isort --check-only app/
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m flake8 app/
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m mypy app/
Success: no issues found in 33 source files
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m pytest --cov=app --cov-report=term-missing --cov-report=xml
============================= test session starts ==============================
platform darwin -- Python 3.11.14, pytest-9.0.3, pluggy-1.7.0 -- /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python
cachedir: .pytest_cache
rootdir: /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener
configfile: pytest.ini
testpaths: tests
plugins: platformdirs-4.13.0, cov-7.1.0, anyio-4.15.1
collecting ... collected 75 items

tests/test_analytics_repository.py::test_batch_create_clicks_uses_single_execute_call PASSED [  1%]
tests/test_analytics_repository.py::test_batch_create_clicks_returns_zero_for_empty_list PASSED [  2%]
tests/test_analytics_repository.py::test_analytics_repository_count_and_timestamps PASSED [  4%]
tests/test_analytics_service.py::test_get_analytics_uses_repository_results PASSED [  5%]
tests/test_app_assembly.py::test_middleware_and_metrics PASSED           [  6%]
tests/test_app_assembly.py::test_cors_preflight PASSED                   [  8%]
tests/test_app_assembly.py::test_rate_limiter_is_registered XFAIL (S...) [  9%]
tests/test_app_assembly.py::test_main_routes PASSED                      [ 10%]
tests/test_app_assembly.py::test_service_failures_are_503[/urls-service0-list_recent_urls] PASSED [ 12%]
tests/test_app_assembly.py::test_service_failures_are_503[/analytics/code-service1-get_analytics] PASSED [ 13%]
tests/test_app_assembly.py::test_health_dependency_failures[db] PASSED   [ 14%]
tests/test_app_assembly.py::test_health_dependency_failures[redis] PASSED [ 16%]
tests/test_app_assembly.py::test_health_dependency_failures[both] PASSED [ 17%]
tests/test_app_assembly.py::test_false_redis_ping_is_unhealthy PASSED    [ 18%]
tests/test_app_assembly.py::test_livez_does_not_touch_dependencies PASSED [ 20%]
tests/test_app_assembly.py::test_redirect_falls_back_on_redis_read_failure[ConnectionError] PASSED [ 21%]
tests/test_app_assembly.py::test_redirect_falls_back_on_redis_read_failure[TimeoutError] PASSED [ 22%]
tests/test_app_assembly.py::test_redis_health_read_failures[ping] PASSED [ 24%]
tests/test_app_assembly.py::test_redis_health_read_failures[dbsize] PASSED [ 25%]
tests/test_app_assembly.py::test_health_session_acquisition_failure PASSED [ 26%]
tests/test_app_assembly.py::test_health_session_is_closed PASSED         [ 28%]
tests/test_base62.py::test_encode_base62_zero_returns_empty_string PASSED [ 29%]
tests/test_base62.py::test_encode_base62_small_numbers PASSED            [ 30%]
tests/test_base62.py::test_encode_base62_larger_number PASSED            [ 32%]
tests/test_code_generation.py::test_100000_candidates_are_unique_and_url_safe PASSED [ 33%]
tests/test_code_generation.py::test_production_generator_uses_secrets_choice PASSED [ 34%]
tests/test_code_generation.py::test_collision_retries_preserve_existing_destination PASSED [ 36%]
tests/test_code_generation.py::test_exhaustion_is_bounded_and_leaves_transaction_usable PASSED [ 37%]
tests/test_code_generation.py::test_non_collision_integrity_error_is_not_retried PASSED [ 38%]
tests/test_code_generation.py::test_concurrent_replicas_reserve_codes_in_postgresql SKIPPED [ 40%]
tests/test_code_generation.py::test_static_route_names_are_not_allocated PASSED [ 41%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_USER] PASSED [ 42%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_PASSWORD] PASSED [ 44%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_DB] PASSED [ 45%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[GRAFANA_ADMIN_USER] PASSED [ 46%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[GRAFANA_ADMIN_PASSWORD] PASSED [ 48%]
tests/test_deployment_config.py::test_compose_uses_same_database_credentials_for_all_clients PASSED [ 49%]
tests/test_health_route.py::test_health_endpoint_includes_total_urls PASSED [ 50%]
tests/test_migrations.py::test_migrations_on_empty_sqlite PASSED         [ 52%]
tests/test_migrations.py::test_offline_sql_uses_postgresql_settings PASSED [ 53%]
tests/test_migrations.py::test_postgresql_upgrade_schema_constraints_and_downgrade SKIPPED [ 54%]
tests/test_migrations.py::test_legacy_schema_can_be_stamped_and_upgraded SKIPPED [ 56%]
tests/test_rate_limiter.py::test_rate_limiter_allows_request_and_sets_headers PASSED [ 57%]
tests/test_rate_limiter.py::test_rate_limiter_rejects_request_when_limit_exceeded PASSED [ 58%]
tests/test_rate_limiter.py::test_rate_limiter_fails_open_when_redis_unavailable PASSED [ 60%]
tests/test_rate_limiter.py::test_rate_limiter_bypasses_metrics_endpoint PASSED [ 61%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[get-ConnectionError] PASSED [ 62%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[get-TimeoutError] PASSED [ 64%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[ping-ConnectionError] PASSED [ 65%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[ping-TimeoutError] PASSED [ 66%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[dbsize-ConnectionError] PASSED [ 68%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[dbsize-TimeoutError] PASSED [ 69%]
tests/test_redis_client.py::test_programming_errors_are_not_hidden PASSED [ 70%]
tests/test_redis_client.py::test_normal_cache_reads[https://example.com/-counter0] PASSED [ 72%]
tests/test_redis_client.py::test_normal_cache_reads[None-counter1] PASSED [ 73%]
tests/test_routes.py::test_create_short_url_returns_service_code PASSED  [ 74%]
tests/test_routes.py::test_redirect_returns_redirect_response PASSED     [ 76%]
tests/test_routes.py::test_redirect_raises_404_for_missing_code PASSED   [ 77%]
tests/test_routes.py::test_analytics_route_uses_service PASSED           [ 78%]
tests/test_routes.py::test_redis_health_success PASSED                   [ 80%]
tests/test_routes.py::test_redis_health_failure PASSED                   [ 81%]
tests/test_tooling_regressions.py::test_typed_models_preserve_column_types_and_nullability PASSED [ 82%]
tests/test_tooling_regressions.py::test_trace_logging_preserves_message_for_default_formatter PASSED [ 84%]
tests/test_tooling_regressions.py::test_worker_reports_unconfigured_database PASSED [ 85%]
tests/test_trace_privacy.py::test_url_spans_only_include_origin_and_code[False] PASSED [ 86%]
tests/test_trace_privacy.py::test_url_spans_only_include_origin_and_code[True] PASSED [ 88%]
tests/test_trace_privacy.py::test_auto_instrumented_redis_does_not_export_cached_url SKIPPED [ 89%]
tests/test_trace_privacy.py::test_auto_instrumented_http_does_not_export_path_or_query SKIPPED [ 90%]
tests/test_trace_privacy.py::test_tracing_initialization_installs_privacy_hooks PASSED [ 92%]
tests/test_trace_privacy.py::test_privacy_hooks_redact_instrumentation_attributes PASSED [ 93%]
tests/test_url_repository.py::test_url_repository_create_with_code_and_lookup PASSED [ 94%]
tests/test_url_service.py::test_shorten_creates_code_and_commits PASSED  [ 96%]
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
app/repositories/url_repository.py            26      0   100%
app/schemas/__init__.py                        0      0   100%
app/schemas/url_schema.py                      5      0   100%
app/services/__init__.py                       0      0   100%
app/services/analytics_service.py             13      0   100%
app/services/code_generator.py                 9      0   100%
app/services/url_service.py                   62      4    94%   23-24, 82-83
app/utils/__init__.py                          0      0   100%
app/utils/base62.py                            9      0   100%
app/workers/__init__.py                        0      0   100%
app/workers/analytics_worker.py               62     39    37%   22-35, 47-91, 95
------------------------------------------------------------------------
TOTAL                                        660    152    77%
Coverage XML written to file coverage.xml
============= 69 passed, 5 skipped, 1 xfailed, 3 warnings in 4.39s =============
```


## PostgreSQL and generator tests

Complete output (exit 0; trailing whitespace trimmed):

```text
============================= test session starts ==============================
platform darwin -- Python 3.11.14, pytest-9.0.3, pluggy-1.7.0 -- /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python
cachedir: .pytest_cache
rootdir: /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener
configfile: pytest.ini
plugins: platformdirs-4.13.0, cov-7.1.0, anyio-4.15.1
collecting ... collected 11 items

tests/test_code_generation.py::test_100000_candidates_are_unique_and_url_safe PASSED [  9%]
tests/test_code_generation.py::test_production_generator_uses_secrets_choice PASSED [ 18%]
tests/test_code_generation.py::test_collision_retries_preserve_existing_destination PASSED [ 27%]
tests/test_code_generation.py::test_exhaustion_is_bounded_and_leaves_transaction_usable PASSED [ 36%]
tests/test_code_generation.py::test_non_collision_integrity_error_is_not_retried PASSED [ 45%]
tests/test_code_generation.py::test_concurrent_replicas_reserve_codes_in_postgresql PASSED [ 54%]
tests/test_code_generation.py::test_static_route_names_are_not_allocated PASSED [ 63%]
tests/test_migrations.py::test_migrations_on_empty_sqlite PASSED         [ 72%]
tests/test_migrations.py::test_offline_sql_uses_postgresql_settings PASSED [ 81%]
tests/test_migrations.py::test_postgresql_upgrade_schema_constraints_and_downgrade PASSED [ 90%]
tests/test_migrations.py::test_legacy_schema_can_be_stamped_and_upgraded PASSED [100%]

============================== 11 passed in 5.10s ==============================
```


## make mcp-test

Complete output (exit 0; trailing whitespace trimmed):

```text
cd mcp-server && /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m pytest
..........                                                               [100%]
10 passed in 0.32s
```

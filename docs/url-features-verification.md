# Step 1.3 URL-feature verification

Branch: `step-1-3-url-features`. CPython 3.11.14. Existing databases/volumes were not modified. Apply Alembic 0003 before deploying.

Final make check exited 0: Black/isort/Flake8/mypy passed; 156 passed, 6 skipped, 1 xfailed, 80% statement coverage. Four default skips are opt-in Docker tests: all four ran successfully in the PostgreSQL command below (96 passed total at that point). Two existing tracing tests still skip because pkg_resources is missing; the rate-limiter xfail remains for step 2.1. Three additional portable boundary tests and the corrected OpenAPI assertion were subsequently included in the final make check run.

Frontend npm ci, ESLint and tsc all exited 0, with existing Node 23.9 engine/deprecation warnings. MCP: 10 passed. Migration Black/isort/Flake8 and git diff --check passed. No browser E2E, live Redis test, full stack rebuild, or Kubernetes deployment was performed. Cache deadline/eviction tests use a fake Redis client; PostgreSQL migration, alias race and row-lock tests use disposable real containers.

Initial feature tests found that HttpUrl repaired https:///path; explicit raw-hostname validation fixed the failure. An initial make check stopped on two long string literals flagged by Flake8; those were reformatted and the final gate passed. No failed check was hidden.


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
collecting ... collected 163 items

tests/test_analytics_repository.py::test_batch_create_clicks_uses_single_execute_call PASSED [  0%]
tests/test_analytics_repository.py::test_batch_create_clicks_returns_zero_for_empty_list PASSED [  1%]
tests/test_analytics_repository.py::test_analytics_repository_count_and_timestamps PASSED [  1%]
tests/test_analytics_service.py::test_get_analytics_uses_repository_results PASSED [  2%]
tests/test_app_assembly.py::test_middleware_and_metrics PASSED           [  3%]
tests/test_app_assembly.py::test_cors_preflight PASSED                   [  3%]
tests/test_app_assembly.py::test_rate_limiter_is_registered XFAIL (S...) [  4%]
tests/test_app_assembly.py::test_main_routes PASSED                      [  4%]
tests/test_app_assembly.py::test_service_failures_are_503[/urls-service0-list_recent_urls] PASSED [  5%]
tests/test_app_assembly.py::test_service_failures_are_503[/analytics/code-service1-get_analytics] PASSED [  6%]
tests/test_app_assembly.py::test_health_dependency_failures[db] PASSED   [  6%]
tests/test_app_assembly.py::test_health_dependency_failures[redis] PASSED [  7%]
tests/test_app_assembly.py::test_health_dependency_failures[both] PASSED [  7%]
tests/test_app_assembly.py::test_false_redis_ping_is_unhealthy PASSED    [  8%]
tests/test_app_assembly.py::test_livez_does_not_touch_dependencies PASSED [  9%]
tests/test_app_assembly.py::test_redirect_falls_back_on_redis_read_failure[ConnectionError] PASSED [  9%]
tests/test_app_assembly.py::test_redirect_falls_back_on_redis_read_failure[TimeoutError] PASSED [ 10%]
tests/test_app_assembly.py::test_redis_health_read_failures[ping] PASSED [ 11%]
tests/test_app_assembly.py::test_redis_health_read_failures[dbsize] PASSED [ 11%]
tests/test_app_assembly.py::test_health_session_acquisition_failure PASSED [ 12%]
tests/test_app_assembly.py::test_health_session_is_closed PASSED         [ 12%]
tests/test_base62.py::test_encode_base62_zero_returns_empty_string PASSED [ 13%]
tests/test_base62.py::test_encode_base62_small_numbers PASSED            [ 14%]
tests/test_base62.py::test_encode_base62_larger_number PASSED            [ 14%]
tests/test_code_generation.py::test_100000_candidates_are_unique_and_url_safe PASSED [ 15%]
tests/test_code_generation.py::test_production_generator_uses_secrets_choice PASSED [ 15%]
tests/test_code_generation.py::test_collision_retries_preserve_existing_destination PASSED [ 16%]
tests/test_code_generation.py::test_exhaustion_is_bounded_and_leaves_transaction_usable PASSED [ 17%]
tests/test_code_generation.py::test_non_collision_integrity_error_is_not_retried PASSED [ 17%]
tests/test_code_generation.py::test_concurrent_replicas_reserve_codes_in_postgresql SKIPPED [ 18%]
tests/test_code_generation.py::test_static_route_names_are_not_allocated PASSED [ 19%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_USER] PASSED [ 19%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_PASSWORD] PASSED [ 20%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_DB] PASSED [ 20%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[GRAFANA_ADMIN_USER] PASSED [ 21%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[GRAFANA_ADMIN_PASSWORD] PASSED [ 22%]
tests/test_deployment_config.py::test_compose_uses_same_database_credentials_for_all_clients PASSED [ 22%]
tests/test_health_route.py::test_health_endpoint_includes_total_urls PASSED [ 23%]
tests/test_migrations.py::test_migrations_on_empty_sqlite PASSED         [ 23%]
tests/test_migrations.py::test_offline_sql_uses_postgresql_settings PASSED [ 24%]
tests/test_migrations.py::test_postgresql_upgrade_schema_constraints_and_downgrade SKIPPED [ 25%]
tests/test_migrations.py::test_legacy_schema_can_be_stamped_and_upgraded SKIPPED [ 25%]
tests/test_rate_limiter.py::test_rate_limiter_allows_request_and_sets_headers PASSED [ 26%]
tests/test_rate_limiter.py::test_rate_limiter_rejects_request_when_limit_exceeded PASSED [ 26%]
tests/test_rate_limiter.py::test_rate_limiter_fails_open_when_redis_unavailable PASSED [ 27%]
tests/test_rate_limiter.py::test_rate_limiter_bypasses_metrics_endpoint PASSED [ 28%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[get-ConnectionError] PASSED [ 28%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[get-TimeoutError] PASSED [ 29%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[ping-ConnectionError] PASSED [ 30%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[ping-TimeoutError] PASSED [ 30%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[dbsize-ConnectionError] PASSED [ 31%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[dbsize-TimeoutError] PASSED [ 31%]
tests/test_redis_client.py::test_programming_errors_are_not_hidden PASSED [ 32%]
tests/test_redis_client.py::test_normal_cache_reads[https://example.com/-counter0] PASSED [ 33%]
tests/test_redis_client.py::test_normal_cache_reads[None-counter1] PASSED [ 33%]
tests/test_routes.py::test_create_short_url_returns_service_code PASSED  [ 34%]
tests/test_routes.py::test_redirect_returns_redirect_response PASSED     [ 34%]
tests/test_routes.py::test_redirect_raises_404_for_missing_code PASSED   [ 35%]
tests/test_routes.py::test_analytics_route_uses_service PASSED           [ 36%]
tests/test_routes.py::test_redis_health_success PASSED                   [ 36%]
tests/test_routes.py::test_redis_health_failure PASSED                   [ 37%]
tests/test_tooling_regressions.py::test_typed_models_preserve_column_types_and_nullability PASSED [ 38%]
tests/test_tooling_regressions.py::test_trace_logging_preserves_message_for_default_formatter PASSED [ 38%]
tests/test_tooling_regressions.py::test_worker_reports_unconfigured_database PASSED [ 39%]
tests/test_trace_privacy.py::test_url_spans_only_include_origin_and_code[False] PASSED [ 39%]
tests/test_trace_privacy.py::test_url_spans_only_include_origin_and_code[True] PASSED [ 40%]
tests/test_trace_privacy.py::test_auto_instrumented_redis_does_not_export_cached_url SKIPPED [ 41%]
tests/test_trace_privacy.py::test_auto_instrumented_http_does_not_export_path_or_query SKIPPED [ 41%]
tests/test_trace_privacy.py::test_tracing_initialization_installs_privacy_hooks PASSED [ 42%]
tests/test_trace_privacy.py::test_privacy_hooks_redact_instrumentation_attributes PASSED [ 42%]
tests/test_url_features.py::test_reject_unsafe_urls[ftp://example.com] PASSED [ 43%]
tests/test_url_features.py::test_reject_unsafe_urls[javascript:alert(1)] PASSED [ 44%]
tests/test_url_features.py::test_reject_unsafe_urls[https:///path] PASSED [ 44%]
tests/test_url_features.py::test_reject_unsafe_urls[https://] PASSED     [ 45%]
tests/test_url_features.py::test_reject_unsafe_urls[http://user:pass@example.com] PASSED [ 46%]
tests/test_url_features.py::test_reject_unsafe_urls[http://user@example.com] PASSED [ 46%]
tests/test_url_features.py::test_reject_unsafe_urls[http://@example.com] PASSED [ 47%]
tests/test_url_features.py::test_reject_unsafe_urls[http://localhost] PASSED [ 47%]
tests/test_url_features.py::test_reject_unsafe_urls[http://LOCALHOST.] PASSED [ 48%]
tests/test_url_features.py::test_reject_unsafe_urls[http://sub.localhost] PASSED [ 49%]
tests/test_url_features.py::test_reject_unsafe_urls[http://server.local] PASSED [ 49%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.0.0.1] PASSED [ 50%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.9.2.1] PASSED [ 50%]
tests/test_url_features.py::test_reject_unsafe_urls[http://10.1.2.3] PASSED [ 51%]
tests/test_url_features.py::test_reject_unsafe_urls[http://172.16.2.3] PASSED [ 52%]
tests/test_url_features.py::test_reject_unsafe_urls[http://192.168.1.1] PASSED [ 52%]
tests/test_url_features.py::test_reject_unsafe_urls[http://169.254.169.254] PASSED [ 53%]
tests/test_url_features.py::test_reject_unsafe_urls[http://0.0.0.0] PASSED [ 53%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::1]] PASSED [ 54%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::]] PASSED  [ 55%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fc00::1]] PASSED [ 55%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fd00::1]] PASSED [ 56%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fe80::1]] PASSED [ 57%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::ffff:127.0.0.1]] PASSED [ 57%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::ffff:192.168.0.1]] PASSED [ 58%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fe80::1%25eth0]] PASSED [ 58%]
tests/test_url_features.py::test_reject_unsafe_urls[http://2130706433] PASSED [ 59%]
tests/test_url_features.py::test_reject_unsafe_urls[http://0x7f000001] PASSED [ 60%]
tests/test_url_features.py::test_reject_unsafe_urls[http://0177.0.0.1] PASSED [ 60%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.1] PASSED [ 61%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.0.0.1.] PASSED [ 61%]
tests/test_url_features.py::test_reject_unsafe_urls[http://%6cocalhost] PASSED [ 62%]
tests/test_url_features.py::test_reject_unsafe_urls[http://localHOST\u3002] PASSED [ 63%]
tests/test_url_features.py::test_reject_unsafe_urls[http://example.com\\@127.0.0.1] PASSED [ 63%]
tests/test_url_features.py::test_reject_unsafe_urls[http://exam\nple.com] PASSED [ 64%]
tests/test_url_features.py::test_reject_unsafe_urls[http://bad_host.com] PASSED [ 65%]
tests/test_url_features.py::test_reject_unsafe_urls[http://-bad.example] PASSED [ 65%]
tests/test_url_features.py::test_reject_unsafe_urls[https://example.com/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx] PASSED [ 66%]
tests/test_url_features.py::test_normalize_public_hosts[https://EXAMPLE.COM./a?b=1-example.com] PASSED [ 66%]
tests/test_url_features.py::test_normalize_public_hosts[http://b\xfccher.de/a-xn--bcher-kva.de] PASSED [ 67%]
tests/test_url_features.py::test_normalize_public_hosts[https://8.8.8.8/a-8.8.8.8] PASSED [ 68%]
tests/test_url_features.py::test_normalize_public_hosts[http://[2606:4700:4700::1111]/-[2606:4700:4700::1111]] PASSED [ 68%]
tests/test_url_features.py::test_normalize_public_hosts[https://localhost.example.com/-localhost.example.com] PASSED [ 69%]
tests/test_url_features.py::test_maximum_url_length PASSED               [ 69%]
tests/test_url_features.py::test_invalid_alias[ab] PASSED                [ 70%]
tests/test_url_features.py::test_invalid_alias[aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa] PASSED [ 71%]
tests/test_url_features.py::test_invalid_alias[] PASSED                  [ 71%]
tests/test_url_features.py::test_invalid_alias[a/b] PASSED               [ 72%]
tests/test_url_features.py::test_invalid_alias[a.b] PASSED               [ 73%]
tests/test_url_features.py::test_invalid_alias[a b] PASSED               [ 73%]
tests/test_url_features.py::test_invalid_alias[\xe9\xe9\xe9] PASSED      [ 74%]
tests/test_url_features.py::test_invalid_alias[api] PASSED               [ 74%]
tests/test_url_features.py::test_invalid_alias[Health] PASSED            [ 75%]
tests/test_url_features.py::test_invalid_alias[METRICS] PASSED           [ 76%]
tests/test_url_features.py::test_invalid_alias[docs] PASSED              [ 76%]
tests/test_url_features.py::test_invalid_alias[admin] PASSED             [ 77%]
tests/test_url_features.py::test_invalid_alias[shorten] PASSED           [ 77%]
tests/test_url_features.py::test_invalid_alias[livez] PASSED             [ 78%]
tests/test_url_features.py::test_invalid_alias[urls] PASSED              [ 79%]
tests/test_url_features.py::test_invalid_alias[analytics] PASSED         [ 79%]
tests/test_url_features.py::test_invalid_alias[redoc] PASSED             [ 80%]
tests/test_url_features.py::test_valid_alias[abc] PASSED                 [ 80%]
tests/test_url_features.py::test_valid_alias[A_9-x] PASSED               [ 81%]
tests/test_url_features.py::test_valid_alias[aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa] PASSED [ 82%]
tests/test_url_features.py::test_invalid_expiry[2020-01-01T00:00:00Z] PASSED [ 82%]
tests/test_url_features.py::test_invalid_expiry[2099-01-01T00:00:00] PASSED [ 83%]
tests/test_url_features.py::test_invalid_expiry[nonsense] PASSED         [ 84%]
tests/test_url_features.py::test_invalid_expiry[9999999999] PASSED       [ 84%]
tests/test_url_features.py::test_expiry_normalized_to_utc PASSED         [ 85%]
tests/test_url_features.py::test_alias_create_conflict_delete_and_list PASSED [ 85%]
tests/test_url_features.py::test_expired_cache_hit_returns_410 PASSED    [ 86%]
tests/test_url_features.py::test_api_validation_is_422[payload0] PASSED  [ 87%]
tests/test_url_features.py::test_api_validation_is_422[payload1] PASSED  [ 87%]
tests/test_url_features.py::test_api_validation_is_422[payload2] PASSED  [ 88%]
tests/test_url_features.py::test_api_validation_is_422[payload3] PASSED  [ 88%]
tests/test_url_features.py::test_missing_delete_and_redirect PASSED      [ 89%]
tests/test_url_features.py::test_openapi_documents_fields_and_statuses PASSED [ 90%]
tests/test_url_features.py::test_cache_absolute_deadline_and_eviction PASSED [ 90%]
tests/test_url_features.py::test_multicast_rejected[http://224.0.0.1] PASSED [ 91%]
tests/test_url_features.py::test_multicast_rejected[http://[ff02::1]] PASSED [ 92%]
tests/test_url_features.py::test_numeric_string_expiry_rejected PASSED   [ 92%]
tests/test_url_features.py::test_no_redirect_if_expiry_passes_during_click_publication PASSED [ 93%]
tests/test_url_features.py::test_cache_not_used_when_database_fails PASSED [ 93%]
tests/test_url_features.py::test_far_expiry_cache_is_capped_at_default_ttl PASSED [ 94%]
tests/test_url_features.py::test_postgresql_alias_races_and_delete_lock SKIPPED [ 95%]
tests/test_url_features.py::test_alias_is_case_sensitive PASSED          [ 95%]
tests/test_url_features.py::test_expiry_equal_to_now_is_rejected PASSED  [ 96%]
tests/test_url_features.py::test_subsecond_remaining_lifetime_does_not_populate_cache PASSED [ 96%]
tests/test_url_repository.py::test_url_repository_create_with_code_and_lookup PASSED [ 97%]
tests/test_url_service.py::test_shorten_creates_code_and_commits PASSED  [ 98%]
tests/test_url_service.py::test_resolve_returns_cached_value_and_records_click PASSED [ 98%]
tests/test_url_service.py::test_resolve_caches_database_value_on_miss PASSED [ 99%]
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
app/api/routes.py                            103      2    98%   97-98
app/cache/__init__.py                          0      0   100%
app/cache/redis_client.py                     59     12    80%   25, 28, 31, 34, 37, 42-43, 51-53, 94-95
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
app/repositories/url_repository.py            33      0   100%
app/schemas/__init__.py                        0      0   100%
app/schemas/url_schema.py                     73      3    96%   73, 95, 122
app/services/__init__.py                       0      0   100%
app/services/analytics_service.py             13      0   100%
app/services/code_generator.py                 9      0   100%
app/services/url_service.py                   80      5    94%   24-25, 81, 128-129
app/utils/__init__.py                          0      0   100%
app/utils/base62.py                            9      0   100%
app/workers/__init__.py                        0      0   100%
app/workers/analytics_worker.py               62     39    37%   22-35, 47-91, 95
------------------------------------------------------------------------
TOTAL                                        778    157    80%
Coverage XML written to file coverage.xml
============ 156 passed, 6 skipped, 1 xfailed, 3 warnings in 4.86s =============
```


## PostgreSQL feature, migration and generator tests

Complete output (exit 0; trailing whitespace trimmed):

```text
============================= test session starts ==============================
platform darwin -- Python 3.11.14, pytest-9.0.3, pluggy-1.7.0 -- /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python
cachedir: .pytest_cache
rootdir: /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener
configfile: pytest.ini
plugins: platformdirs-4.13.0, cov-7.1.0, anyio-4.15.1
collecting ... collected 96 items

tests/test_url_features.py::test_reject_unsafe_urls[ftp://example.com] PASSED [  1%]
tests/test_url_features.py::test_reject_unsafe_urls[javascript:alert(1)] PASSED [  2%]
tests/test_url_features.py::test_reject_unsafe_urls[https:///path] PASSED [  3%]
tests/test_url_features.py::test_reject_unsafe_urls[https://] PASSED     [  4%]
tests/test_url_features.py::test_reject_unsafe_urls[http://user:pass@example.com] PASSED [  5%]
tests/test_url_features.py::test_reject_unsafe_urls[http://user@example.com] PASSED [  6%]
tests/test_url_features.py::test_reject_unsafe_urls[http://@example.com] PASSED [  7%]
tests/test_url_features.py::test_reject_unsafe_urls[http://localhost] PASSED [  8%]
tests/test_url_features.py::test_reject_unsafe_urls[http://LOCALHOST.] PASSED [  9%]
tests/test_url_features.py::test_reject_unsafe_urls[http://sub.localhost] PASSED [ 10%]
tests/test_url_features.py::test_reject_unsafe_urls[http://server.local] PASSED [ 11%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.0.0.1] PASSED [ 12%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.9.2.1] PASSED [ 13%]
tests/test_url_features.py::test_reject_unsafe_urls[http://10.1.2.3] PASSED [ 14%]
tests/test_url_features.py::test_reject_unsafe_urls[http://172.16.2.3] PASSED [ 15%]
tests/test_url_features.py::test_reject_unsafe_urls[http://192.168.1.1] PASSED [ 16%]
tests/test_url_features.py::test_reject_unsafe_urls[http://169.254.169.254] PASSED [ 17%]
tests/test_url_features.py::test_reject_unsafe_urls[http://0.0.0.0] PASSED [ 18%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::1]] PASSED [ 19%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::]] PASSED  [ 20%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fc00::1]] PASSED [ 21%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fd00::1]] PASSED [ 22%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fe80::1]] PASSED [ 23%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::ffff:127.0.0.1]] PASSED [ 25%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::ffff:192.168.0.1]] PASSED [ 26%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fe80::1%25eth0]] PASSED [ 27%]
tests/test_url_features.py::test_reject_unsafe_urls[http://2130706433] PASSED [ 28%]
tests/test_url_features.py::test_reject_unsafe_urls[http://0x7f000001] PASSED [ 29%]
tests/test_url_features.py::test_reject_unsafe_urls[http://0177.0.0.1] PASSED [ 30%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.1] PASSED [ 31%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.0.0.1.] PASSED [ 32%]
tests/test_url_features.py::test_reject_unsafe_urls[http://%6cocalhost] PASSED [ 33%]
tests/test_url_features.py::test_reject_unsafe_urls[http://localHOST\u3002] PASSED [ 34%]
tests/test_url_features.py::test_reject_unsafe_urls[http://example.com\\@127.0.0.1] PASSED [ 35%]
tests/test_url_features.py::test_reject_unsafe_urls[http://exam\nple.com] PASSED [ 36%]
tests/test_url_features.py::test_reject_unsafe_urls[http://bad_host.com] PASSED [ 37%]
tests/test_url_features.py::test_reject_unsafe_urls[http://-bad.example] PASSED [ 38%]
tests/test_url_features.py::test_reject_unsafe_urls[https://example.com/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx] PASSED [ 39%]
tests/test_url_features.py::test_normalize_public_hosts[https://EXAMPLE.COM./a?b=1-example.com] PASSED [ 40%]
tests/test_url_features.py::test_normalize_public_hosts[http://b\xfccher.de/a-xn--bcher-kva.de] PASSED [ 41%]
tests/test_url_features.py::test_normalize_public_hosts[https://8.8.8.8/a-8.8.8.8] PASSED [ 42%]
tests/test_url_features.py::test_normalize_public_hosts[http://[2606:4700:4700::1111]/-[2606:4700:4700::1111]] PASSED [ 43%]
tests/test_url_features.py::test_normalize_public_hosts[https://localhost.example.com/-localhost.example.com] PASSED [ 44%]
tests/test_url_features.py::test_maximum_url_length PASSED               [ 45%]
tests/test_url_features.py::test_invalid_alias[ab] PASSED                [ 46%]
tests/test_url_features.py::test_invalid_alias[aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa] PASSED [ 47%]
tests/test_url_features.py::test_invalid_alias[] PASSED                  [ 48%]
tests/test_url_features.py::test_invalid_alias[a/b] PASSED               [ 50%]
tests/test_url_features.py::test_invalid_alias[a.b] PASSED               [ 51%]
tests/test_url_features.py::test_invalid_alias[a b] PASSED               [ 52%]
tests/test_url_features.py::test_invalid_alias[\xe9\xe9\xe9] PASSED      [ 53%]
tests/test_url_features.py::test_invalid_alias[api] PASSED               [ 54%]
tests/test_url_features.py::test_invalid_alias[Health] PASSED            [ 55%]
tests/test_url_features.py::test_invalid_alias[METRICS] PASSED           [ 56%]
tests/test_url_features.py::test_invalid_alias[docs] PASSED              [ 57%]
tests/test_url_features.py::test_invalid_alias[admin] PASSED             [ 58%]
tests/test_url_features.py::test_invalid_alias[shorten] PASSED           [ 59%]
tests/test_url_features.py::test_invalid_alias[livez] PASSED             [ 60%]
tests/test_url_features.py::test_invalid_alias[urls] PASSED              [ 61%]
tests/test_url_features.py::test_invalid_alias[analytics] PASSED         [ 62%]
tests/test_url_features.py::test_invalid_alias[redoc] PASSED             [ 63%]
tests/test_url_features.py::test_valid_alias[abc] PASSED                 [ 64%]
tests/test_url_features.py::test_valid_alias[A_9-x] PASSED               [ 65%]
tests/test_url_features.py::test_valid_alias[aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa] PASSED [ 66%]
tests/test_url_features.py::test_invalid_expiry[2020-01-01T00:00:00Z] PASSED [ 67%]
tests/test_url_features.py::test_invalid_expiry[2099-01-01T00:00:00] PASSED [ 68%]
tests/test_url_features.py::test_invalid_expiry[nonsense] PASSED         [ 69%]
tests/test_url_features.py::test_invalid_expiry[9999999999] PASSED       [ 70%]
tests/test_url_features.py::test_expiry_normalized_to_utc PASSED         [ 71%]
tests/test_url_features.py::test_alias_create_conflict_delete_and_list PASSED [ 72%]
tests/test_url_features.py::test_expired_cache_hit_returns_410 PASSED    [ 73%]
tests/test_url_features.py::test_api_validation_is_422[payload0] PASSED  [ 75%]
tests/test_url_features.py::test_api_validation_is_422[payload1] PASSED  [ 76%]
tests/test_url_features.py::test_api_validation_is_422[payload2] PASSED  [ 77%]
tests/test_url_features.py::test_api_validation_is_422[payload3] PASSED  [ 78%]
tests/test_url_features.py::test_missing_delete_and_redirect PASSED      [ 79%]
tests/test_url_features.py::test_openapi_documents_fields_and_statuses PASSED [ 80%]
tests/test_url_features.py::test_cache_absolute_deadline_and_eviction PASSED [ 81%]
tests/test_url_features.py::test_multicast_rejected[http://224.0.0.1] PASSED [ 82%]
tests/test_url_features.py::test_multicast_rejected[http://[ff02::1]] PASSED [ 83%]
tests/test_url_features.py::test_numeric_string_expiry_rejected PASSED   [ 84%]
tests/test_url_features.py::test_no_redirect_if_expiry_passes_during_click_publication PASSED [ 85%]
tests/test_url_features.py::test_cache_not_used_when_database_fails PASSED [ 86%]
tests/test_url_features.py::test_far_expiry_cache_is_capped_at_default_ttl PASSED [ 87%]
tests/test_url_features.py::test_postgresql_alias_races_and_delete_lock PASSED [ 88%]
tests/test_migrations.py::test_migrations_on_empty_sqlite PASSED         [ 89%]
tests/test_migrations.py::test_offline_sql_uses_postgresql_settings PASSED [ 90%]
tests/test_migrations.py::test_postgresql_upgrade_schema_constraints_and_downgrade PASSED [ 91%]
tests/test_migrations.py::test_legacy_schema_can_be_stamped_and_upgraded PASSED [ 92%]
tests/test_code_generation.py::test_100000_candidates_are_unique_and_url_safe PASSED [ 93%]
tests/test_code_generation.py::test_production_generator_uses_secrets_choice PASSED [ 94%]
tests/test_code_generation.py::test_collision_retries_preserve_existing_destination PASSED [ 95%]
tests/test_code_generation.py::test_exhaustion_is_bounded_and_leaves_transaction_usable PASSED [ 96%]
tests/test_code_generation.py::test_non_collision_integrity_error_is_not_retried PASSED [ 97%]
tests/test_code_generation.py::test_concurrent_replicas_reserve_codes_in_postgresql PASSED [ 98%]
tests/test_code_generation.py::test_static_route_names_are_not_allocated PASSED [100%]

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
======================== 96 passed, 3 warnings in 7.45s ========================
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

## make mcp-test

Complete output (exit 0; trailing whitespace trimmed):

```text
cd mcp-server && /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m pytest
..........                                                               [100%]
10 passed in 0.51s
```

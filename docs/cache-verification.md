# Step 1.4 cache verification

Branch: `step-1-4-cache`. CPython 3.11.14. Existing application containers/databases were not stopped or modified. Docker tests used disposable PostgreSQL and Redis containers; the Redis outage test stopped only its own container.

`make check` exited 0: Black/isort/Flake8/mypy passed; 172 passed, 8 skipped, 1 xfailed, 83% application statement coverage. Six skips are opt-in Docker tests. The complete Docker-enabled suite then exited 0 with 178 passed, 2 skipped, 1 xfailed. The two remaining skips are the existing missing-pkg_resources tracing integration tests; the expected failure remains rate-limiter registration (step 2.1). MCP: 10 passed, exit 0. Frontend checks were not repeated because frontend files/dependencies and response shapes did not change.

Cold-burst tests share one full-row load across 20 in-process requests with Redis healthy or failing. A real PostgreSQL test counts exactly one SELECT for 12 overlapping requests. A separate two-loader test models independent process-local flights: one full-row read plus a lifecycle check on the other replica. Positive warm hits deliberately retain lifecycle checks; slow loads/lease expiry can permit duplicate DB work after bounded waits. These limits and negative-cache consistency are recorded in [ADR 0002](adr/0002-cache-strategy.md).

The Redis Docker test validates real Lua publication fencing, then stops Redis and verifies repeated 307/404 responses and health 503. Fake-client tests verify exactly three failing serial Redis calls before the circuit opens, no subsequent socket operations while open, metrics, one half-open probe, recovery and failed-probe reopening, TTL bounds/expiry deadlines, negative caching, alias invalidation, and lease ownership. No Kubernetes deployment, full-stack rebuild, or multi-host load test was performed.

An initial regression run had eight failing assertions based on raw cache payloads, exact fixed TTLs, and no preliminary cache reads. Those expectations were updated for versioned entries, jitter, and lifecycle validation. The expiry-during-publication test now advances the clock instead of mutating an ORM row after its snapshot was read. All final assertions pass; no test was disabled to hide a failure.


## make check

Complete output (exit 0; trailing whitespace trimmed):

```text
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m black --check app/
All done! ✨ 🍰 ✨
35 files would be left unchanged.
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m isort --check-only app/
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m flake8 app/
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m mypy app/
Success: no issues found in 35 source files
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m pytest --cov=app --cov-report=term-missing --cov-report=xml
============================= test session starts ==============================
platform darwin -- Python 3.11.14, pytest-9.0.3, pluggy-1.7.0 -- /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python
cachedir: .pytest_cache
rootdir: /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener
configfile: pytest.ini
testpaths: tests
plugins: platformdirs-4.13.0, cov-7.1.0, anyio-4.15.1
collecting ... collected 181 items

tests/test_analytics_repository.py::test_batch_create_clicks_uses_single_execute_call PASSED [  0%]
tests/test_analytics_repository.py::test_batch_create_clicks_returns_zero_for_empty_list PASSED [  1%]
tests/test_analytics_repository.py::test_analytics_repository_count_and_timestamps PASSED [  1%]
tests/test_analytics_service.py::test_get_analytics_uses_repository_results PASSED [  2%]
tests/test_app_assembly.py::test_middleware_and_metrics PASSED           [  2%]
tests/test_app_assembly.py::test_cors_preflight PASSED                   [  3%]
tests/test_app_assembly.py::test_rate_limiter_is_registered XFAIL (S...) [  3%]
tests/test_app_assembly.py::test_main_routes PASSED                      [  4%]
tests/test_app_assembly.py::test_service_failures_are_503[/urls-service0-list_recent_urls] PASSED [  4%]
tests/test_app_assembly.py::test_service_failures_are_503[/analytics/code-service1-get_analytics] PASSED [  5%]
tests/test_app_assembly.py::test_health_dependency_failures[db] PASSED   [  6%]
tests/test_app_assembly.py::test_health_dependency_failures[redis] PASSED [  6%]
tests/test_app_assembly.py::test_health_dependency_failures[both] PASSED [  7%]
tests/test_app_assembly.py::test_false_redis_ping_is_unhealthy PASSED    [  7%]
tests/test_app_assembly.py::test_livez_does_not_touch_dependencies PASSED [  8%]
tests/test_app_assembly.py::test_redirect_falls_back_on_redis_read_failure[ConnectionError] PASSED [  8%]
tests/test_app_assembly.py::test_redirect_falls_back_on_redis_read_failure[TimeoutError] PASSED [  9%]
tests/test_app_assembly.py::test_redis_health_read_failures[ping] PASSED [  9%]
tests/test_app_assembly.py::test_redis_health_read_failures[dbsize] PASSED [ 10%]
tests/test_app_assembly.py::test_health_session_acquisition_failure PASSED [ 11%]
tests/test_app_assembly.py::test_health_session_is_closed PASSED         [ 11%]
tests/test_app_assembly.py::test_stopped_redis_never_makes_redirect_5xx_and_health_reports_breaker PASSED [ 12%]
tests/test_app_assembly.py::test_actual_stopped_redis_keeps_redirects_available SKIPPED [ 12%]
tests/test_base62.py::test_encode_base62_zero_returns_empty_string PASSED [ 13%]
tests/test_base62.py::test_encode_base62_small_numbers PASSED            [ 13%]
tests/test_base62.py::test_encode_base62_larger_number PASSED            [ 14%]
tests/test_cache_strategy.py::test_circuit_open_half_open_closed_and_failed_probe PASSED [ 14%]
tests/test_cache_strategy.py::test_only_one_half_open_probe_and_stale_success_cannot_close PASSED [ 15%]
tests/test_cache_strategy.py::test_success_resets_consecutive_failures PASSED [ 16%]
tests/test_cache_strategy.py::test_client_timeout_and_retry_configuration PASSED [ 16%]
tests/test_cache_strategy.py::test_ttl_jitter_bounds_and_absolute_expiry PASSED [ 17%]
tests/test_cache_strategy.py::test_many_cold_requests_share_one_database_read[False] PASSED [ 17%]
tests/test_cache_strategy.py::test_many_cold_requests_share_one_database_read[True] PASSED [ 18%]
tests/test_cache_strategy.py::test_cross_process_lock_wait_rechecks_cache PASSED [ 18%]
tests/test_cache_strategy.py::test_negative_caching_and_alias_creation_invalidation PASSED [ 19%]
tests/test_cache_strategy.py::test_alias_creation_fences_an_inflight_negative_fill PASSED [ 19%]
tests/test_cache_strategy.py::test_lock_release_and_publication_require_owner PASSED [ 20%]
tests/test_cache_strategy.py::test_negative_cache_expiry PASSED          [ 20%]
tests/test_cache_strategy.py::test_redis_down_falls_back_and_counts_metric PASSED [ 21%]
tests/test_cache_strategy.py::test_singleflight_timeout_and_exception_cleanup PASSED [ 22%]
tests/test_cache_strategy.py::test_positive_cache_still_checks_deletion_and_database_failure PASSED [ 22%]
tests/test_cache_strategy.py::test_postgresql_stampede_executes_one_select SKIPPED [ 23%]
tests/test_code_generation.py::test_100000_candidates_are_unique_and_url_safe PASSED [ 23%]
tests/test_code_generation.py::test_production_generator_uses_secrets_choice PASSED [ 24%]
tests/test_code_generation.py::test_collision_retries_preserve_existing_destination PASSED [ 24%]
tests/test_code_generation.py::test_exhaustion_is_bounded_and_leaves_transaction_usable PASSED [ 25%]
tests/test_code_generation.py::test_non_collision_integrity_error_is_not_retried PASSED [ 25%]
tests/test_code_generation.py::test_concurrent_replicas_reserve_codes_in_postgresql SKIPPED [ 26%]
tests/test_code_generation.py::test_static_route_names_are_not_allocated PASSED [ 27%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_USER] PASSED [ 27%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_PASSWORD] PASSED [ 28%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_DB] PASSED [ 28%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[GRAFANA_ADMIN_USER] PASSED [ 29%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[GRAFANA_ADMIN_PASSWORD] PASSED [ 29%]
tests/test_deployment_config.py::test_compose_uses_same_database_credentials_for_all_clients PASSED [ 30%]
tests/test_health_route.py::test_health_endpoint_includes_total_urls PASSED [ 30%]
tests/test_migrations.py::test_migrations_on_empty_sqlite PASSED         [ 31%]
tests/test_migrations.py::test_offline_sql_uses_postgresql_settings PASSED [ 32%]
tests/test_migrations.py::test_postgresql_upgrade_schema_constraints_and_downgrade SKIPPED [ 32%]
tests/test_migrations.py::test_legacy_schema_can_be_stamped_and_upgraded SKIPPED [ 33%]
tests/test_rate_limiter.py::test_rate_limiter_allows_request_and_sets_headers PASSED [ 33%]
tests/test_rate_limiter.py::test_rate_limiter_rejects_request_when_limit_exceeded PASSED [ 34%]
tests/test_rate_limiter.py::test_rate_limiter_fails_open_when_redis_unavailable PASSED [ 34%]
tests/test_rate_limiter.py::test_rate_limiter_bypasses_metrics_endpoint PASSED [ 35%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[get-ConnectionError] PASSED [ 35%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[get-TimeoutError] PASSED [ 36%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[ping-ConnectionError] PASSED [ 37%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[ping-TimeoutError] PASSED [ 37%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[dbsize-ConnectionError] PASSED [ 38%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[dbsize-TimeoutError] PASSED [ 38%]
tests/test_redis_client.py::test_programming_errors_are_not_hidden PASSED [ 39%]
tests/test_redis_client.py::test_normal_cache_reads[https://example.com/-counter0] PASSED [ 39%]
tests/test_redis_client.py::test_normal_cache_reads[None-counter1] PASSED [ 40%]
tests/test_routes.py::test_create_short_url_returns_service_code PASSED  [ 40%]
tests/test_routes.py::test_redirect_returns_redirect_response PASSED     [ 41%]
tests/test_routes.py::test_redirect_raises_404_for_missing_code PASSED   [ 41%]
tests/test_routes.py::test_analytics_route_uses_service PASSED           [ 42%]
tests/test_routes.py::test_redis_health_success PASSED                   [ 43%]
tests/test_routes.py::test_redis_health_failure PASSED                   [ 43%]
tests/test_tooling_regressions.py::test_typed_models_preserve_column_types_and_nullability PASSED [ 44%]
tests/test_tooling_regressions.py::test_trace_logging_preserves_message_for_default_formatter PASSED [ 44%]
tests/test_tooling_regressions.py::test_worker_reports_unconfigured_database PASSED [ 45%]
tests/test_trace_privacy.py::test_url_spans_only_include_origin_and_code[False] PASSED [ 45%]
tests/test_trace_privacy.py::test_url_spans_only_include_origin_and_code[True] PASSED [ 46%]
tests/test_trace_privacy.py::test_auto_instrumented_redis_does_not_export_cached_url SKIPPED [ 46%]
tests/test_trace_privacy.py::test_auto_instrumented_http_does_not_export_path_or_query SKIPPED [ 47%]
tests/test_trace_privacy.py::test_tracing_initialization_installs_privacy_hooks PASSED [ 48%]
tests/test_trace_privacy.py::test_privacy_hooks_redact_instrumentation_attributes PASSED [ 48%]
tests/test_url_features.py::test_reject_unsafe_urls[ftp://example.com] PASSED [ 49%]
tests/test_url_features.py::test_reject_unsafe_urls[javascript:alert(1)] PASSED [ 49%]
tests/test_url_features.py::test_reject_unsafe_urls[https:///path] PASSED [ 50%]
tests/test_url_features.py::test_reject_unsafe_urls[https://] PASSED     [ 50%]
tests/test_url_features.py::test_reject_unsafe_urls[http://user:pass@example.com] PASSED [ 51%]
tests/test_url_features.py::test_reject_unsafe_urls[http://user@example.com] PASSED [ 51%]
tests/test_url_features.py::test_reject_unsafe_urls[http://@example.com] PASSED [ 52%]
tests/test_url_features.py::test_reject_unsafe_urls[http://localhost] PASSED [ 53%]
tests/test_url_features.py::test_reject_unsafe_urls[http://LOCALHOST.] PASSED [ 53%]
tests/test_url_features.py::test_reject_unsafe_urls[http://sub.localhost] PASSED [ 54%]
tests/test_url_features.py::test_reject_unsafe_urls[http://server.local] PASSED [ 54%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.0.0.1] PASSED [ 55%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.9.2.1] PASSED [ 55%]
tests/test_url_features.py::test_reject_unsafe_urls[http://10.1.2.3] PASSED [ 56%]
tests/test_url_features.py::test_reject_unsafe_urls[http://172.16.2.3] PASSED [ 56%]
tests/test_url_features.py::test_reject_unsafe_urls[http://192.168.1.1] PASSED [ 57%]
tests/test_url_features.py::test_reject_unsafe_urls[http://169.254.169.254] PASSED [ 58%]
tests/test_url_features.py::test_reject_unsafe_urls[http://0.0.0.0] PASSED [ 58%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::1]] PASSED [ 59%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::]] PASSED  [ 59%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fc00::1]] PASSED [ 60%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fd00::1]] PASSED [ 60%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fe80::1]] PASSED [ 61%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::ffff:127.0.0.1]] PASSED [ 61%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::ffff:192.168.0.1]] PASSED [ 62%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fe80::1%25eth0]] PASSED [ 62%]
tests/test_url_features.py::test_reject_unsafe_urls[http://2130706433] PASSED [ 63%]
tests/test_url_features.py::test_reject_unsafe_urls[http://0x7f000001] PASSED [ 64%]
tests/test_url_features.py::test_reject_unsafe_urls[http://0177.0.0.1] PASSED [ 64%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.1] PASSED [ 65%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.0.0.1.] PASSED [ 65%]
tests/test_url_features.py::test_reject_unsafe_urls[http://%6cocalhost] PASSED [ 66%]
tests/test_url_features.py::test_reject_unsafe_urls[http://localHOST\u3002] PASSED [ 66%]
tests/test_url_features.py::test_reject_unsafe_urls[http://example.com\\@127.0.0.1] PASSED [ 67%]
tests/test_url_features.py::test_reject_unsafe_urls[http://exam\nple.com] PASSED [ 67%]
tests/test_url_features.py::test_reject_unsafe_urls[http://bad_host.com] PASSED [ 68%]
tests/test_url_features.py::test_reject_unsafe_urls[http://-bad.example] PASSED [ 69%]
tests/test_url_features.py::test_reject_unsafe_urls[https://example.com/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx] PASSED [ 69%]
tests/test_url_features.py::test_normalize_public_hosts[https://EXAMPLE.COM./a?b=1-example.com] PASSED [ 70%]
tests/test_url_features.py::test_normalize_public_hosts[http://b\xfccher.de/a-xn--bcher-kva.de] PASSED [ 70%]
tests/test_url_features.py::test_normalize_public_hosts[https://8.8.8.8/a-8.8.8.8] PASSED [ 71%]
tests/test_url_features.py::test_normalize_public_hosts[http://[2606:4700:4700::1111]/-[2606:4700:4700::1111]] PASSED [ 71%]
tests/test_url_features.py::test_normalize_public_hosts[https://localhost.example.com/-localhost.example.com] PASSED [ 72%]
tests/test_url_features.py::test_maximum_url_length PASSED               [ 72%]
tests/test_url_features.py::test_invalid_alias[ab] PASSED                [ 73%]
tests/test_url_features.py::test_invalid_alias[aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa] PASSED [ 74%]
tests/test_url_features.py::test_invalid_alias[] PASSED                  [ 74%]
tests/test_url_features.py::test_invalid_alias[a/b] PASSED               [ 75%]
tests/test_url_features.py::test_invalid_alias[a.b] PASSED               [ 75%]
tests/test_url_features.py::test_invalid_alias[a b] PASSED               [ 76%]
tests/test_url_features.py::test_invalid_alias[\xe9\xe9\xe9] PASSED      [ 76%]
tests/test_url_features.py::test_invalid_alias[api] PASSED               [ 77%]
tests/test_url_features.py::test_invalid_alias[Health] PASSED            [ 77%]
tests/test_url_features.py::test_invalid_alias[METRICS] PASSED           [ 78%]
tests/test_url_features.py::test_invalid_alias[docs] PASSED              [ 79%]
tests/test_url_features.py::test_invalid_alias[admin] PASSED             [ 79%]
tests/test_url_features.py::test_invalid_alias[shorten] PASSED           [ 80%]
tests/test_url_features.py::test_invalid_alias[livez] PASSED             [ 80%]
tests/test_url_features.py::test_invalid_alias[urls] PASSED              [ 81%]
tests/test_url_features.py::test_invalid_alias[analytics] PASSED         [ 81%]
tests/test_url_features.py::test_invalid_alias[redoc] PASSED             [ 82%]
tests/test_url_features.py::test_valid_alias[abc] PASSED                 [ 82%]
tests/test_url_features.py::test_valid_alias[A_9-x] PASSED               [ 83%]
tests/test_url_features.py::test_valid_alias[aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa] PASSED [ 83%]
tests/test_url_features.py::test_invalid_expiry[2020-01-01T00:00:00Z] PASSED [ 84%]
tests/test_url_features.py::test_invalid_expiry[2099-01-01T00:00:00] PASSED [ 85%]
tests/test_url_features.py::test_invalid_expiry[nonsense] PASSED         [ 85%]
tests/test_url_features.py::test_invalid_expiry[9999999999] PASSED       [ 86%]
tests/test_url_features.py::test_expiry_normalized_to_utc PASSED         [ 86%]
tests/test_url_features.py::test_alias_create_conflict_delete_and_list PASSED [ 87%]
tests/test_url_features.py::test_expired_cache_hit_returns_410 PASSED    [ 87%]
tests/test_url_features.py::test_api_validation_is_422[payload0] PASSED  [ 88%]
tests/test_url_features.py::test_api_validation_is_422[payload1] PASSED  [ 88%]
tests/test_url_features.py::test_api_validation_is_422[payload2] PASSED  [ 89%]
tests/test_url_features.py::test_api_validation_is_422[payload3] PASSED  [ 90%]
tests/test_url_features.py::test_missing_delete_and_redirect PASSED      [ 90%]
tests/test_url_features.py::test_openapi_documents_fields_and_statuses PASSED [ 91%]
tests/test_url_features.py::test_cache_absolute_deadline_and_eviction PASSED [ 91%]
tests/test_url_features.py::test_multicast_rejected[http://224.0.0.1] PASSED [ 92%]
tests/test_url_features.py::test_multicast_rejected[http://[ff02::1]] PASSED [ 92%]
tests/test_url_features.py::test_numeric_string_expiry_rejected PASSED   [ 93%]
tests/test_url_features.py::test_no_redirect_if_expiry_passes_during_click_publication PASSED [ 93%]
tests/test_url_features.py::test_cache_not_used_when_database_fails PASSED [ 94%]
tests/test_url_features.py::test_far_expiry_cache_is_capped_at_jittered_ttl PASSED [ 95%]
tests/test_url_features.py::test_postgresql_alias_races_and_delete_lock SKIPPED [ 95%]
tests/test_url_features.py::test_alias_is_case_sensitive PASSED          [ 96%]
tests/test_url_features.py::test_expiry_equal_to_now_is_rejected PASSED  [ 96%]
tests/test_url_features.py::test_subsecond_remaining_lifetime_does_not_populate_cache PASSED [ 97%]
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
app/cache/circuit_breaker.py                  49      1    98%   57
app/cache/redis_client.py                     94     16    83%   30, 33, 36, 39, 42, 47-48, 57-59, 145-146, 153-154, 161-162
app/cache/singleflight.py                     37      1    97%   34
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
app/observability/metrics.py                  30      1    97%   59
app/observability/tracing.py                  97     45    54%   39-50, 70-71, 88-92, 117-120, 136-137, 140-141, 144-145, 151-154, 159-179
app/repositories/__init__.py                   0      0   100%
app/repositories/analytics_repository.py      19      1    95%   9
app/repositories/url_repository.py            36      2    94%   65-71
app/schemas/__init__.py                        0      0   100%
app/schemas/url_schema.py                     73      3    96%   73, 95, 122
app/services/__init__.py                       0      0   100%
app/services/analytics_service.py             13      0   100%
app/services/code_generator.py                 9      0   100%
app/services/url_service.py                  148      9    94%   35-36, 63, 68, 73, 153, 161, 231-232
app/utils/__init__.py                          0      0   100%
app/utils/base62.py                            9      0   100%
app/workers/__init__.py                        0      0   100%
app/workers/analytics_worker.py               62     39    37%   22-35, 47-91, 95
------------------------------------------------------------------------
TOTAL                                        974    169    83%
Coverage XML written to file coverage.xml
============ 172 passed, 8 skipped, 1 xfailed, 3 warnings in 4.86s =============
```


## Complete Docker-enabled suite

Complete output (exit 0; trailing whitespace trimmed):

```text
============================= test session starts ==============================
platform darwin -- Python 3.11.14, pytest-9.0.3, pluggy-1.7.0
rootdir: /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener
configfile: pytest.ini
testpaths: tests
plugins: platformdirs-4.13.0, cov-7.1.0, anyio-4.15.1
collected 181 items

tests/test_analytics_repository.py ...                                   [  1%]
tests/test_analytics_service.py .                                        [  2%]
tests/test_app_assembly.py ..x................                           [ 12%]
tests/test_base62.py ...                                                 [ 14%]
tests/test_cache_strategy.py ................                            [ 23%]
tests/test_code_generation.py .......                                    [ 27%]
tests/test_deployment_config.py ......                                   [ 30%]
tests/test_health_route.py .                                             [ 30%]
tests/test_migrations.py ....                                            [ 33%]
tests/test_rate_limiter.py ....                                          [ 35%]
tests/test_redis_client.py .........                                     [ 40%]
tests/test_routes.py ......                                              [ 43%]
tests/test_tooling_regressions.py ...                                    [ 45%]
tests/test_trace_privacy.py ..ss..                                       [ 48%]
tests/test_url_features.py ............................................. [ 73%]
...........................................                              [ 97%]
tests/test_url_repository.py .                                           [ 97%]
tests/test_url_service.py ....                                           [100%]

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
============ 178 passed, 2 skipped, 1 xfailed, 3 warnings in 10.07s ============
```


## make mcp-test

Complete output (exit 0; trailing whitespace trimmed):

```text
cd mcp-server && /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m pytest
..........                                                               [100%]
10 passed in 0.58s
```

# Step 1.5 event-bus verification

Branch: `step-1-5-event-bus`. All commands below exited 0.

- `make check`: Black, isort, Flake8, mypy (43 app files), then backend coverage.
  **194 passed, 11 skipped, 1 xfailed; 89% coverage.**
- `RUN_DOCKER_TESTS=1 .venv/bin/python -m pytest -q`:
  **203 passed, 2 skipped, 1 xfailed.** All nine Docker cases ran.
- `make mcp-test`: **10 passed.**
- Both Compose profiles passed configuration tests using placeholder credentials;
  Redis mode excludes Kafka/ZooKeeper and selects Redis Streams on both processes.
- `git diff --check` passed. CLI `--help` ran successfully.

Normal skips: nine opt-in Docker tests and two existing trace-privacy tests that
require missing `pkg_resources` for OTel 0.41b0. Docker run retains only those two
tracing skips. The strict expected failure remains the unregistered rate limiter
planned for step 2.1. Five warnings are Starlette/FastAPI deprecations (including
the existing startup pattern and new matching shutdown hook).

New tests in `tests/test_event_bus.py` cover duplicate delivery, commit/ack order,
three poison attempts with exponential backoff, malformed JSON/unknown version,
legacy incomplete envelopes, DB and DLQ outages, idle flush (including failed
polls), shutdown flush, queue saturation, redirect latency with a blocked broker,
adapter selection, Kafka raw bytes/offsets, Redis reclaim cursor, memory groups,
and CLI inspection/replay UUID preservation. The slow-broker test makes five
redirects in under 300ms while the publisher is blocked; it is a regression bound
in this environment, not a production latency benchmark.

Live disposable service checks:

- PostgreSQL 16.13: commit succeeds, simulated acknowledgement fails, same delivery
  is retried, and exactly one analytics row remains.
- Redis 7.4.9: XADD/XREADGROUP, unacknowledged ownership recovery via XAUTOCLAIM,
  XACK and pending/length metrics.
- Kafka 8.3.0 (isolated KRaft): two copies of a click and malformed bytes are
  consumed; one row is stored, malformed bytes reach DLQ, and committed lag is zero.

Existing Redis-down/cache-stampede/migration Docker checks also passed. Containers
were disposable, with no user volumes attached or existing services stopped.
Full Compose stack startup, frontend/UI, Kubernetes deployment, sustained load,
rebalance stress, broker failover and multi-host durability were not tested.
Frontend checks were not repeated because no frontend files changed.

Initial checks found formatting and typing errors while the adapters were being
written; those were corrected before the final runs below. No dependency versions
or migrations changed. Application response shapes/status codes are unchanged.

The bounded API queue is best-effort, not durable. Database failures remain
unacknowledged, while malformed events/poison rows go to DLQ after three local
attempts. Crash/restart can repeat attempts and DLQ publication; valid replay
preserves the original UUID for database deduplication. See
[ADR 0003](adr/0003-event-bus.md) and [runbook](developer.md#analytics-event-bus-step-15).

## make check

```text
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m black --check app/
All done! ✨ 🍰 ✨
43 files would be left unchanged.
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m isort --check-only app/
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m flake8 app/
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m mypy app/
Success: no issues found in 43 source files
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m pytest --cov=app --cov-report=term-missing --cov-report=xml
============================= test session starts ==============================
platform darwin -- Python 3.11.14, pytest-9.0.3, pluggy-1.7.0 -- /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python
cachedir: .pytest_cache
rootdir: /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener
configfile: pytest.ini
testpaths: tests
plugins: platformdirs-4.13.0, cov-7.1.0, anyio-4.15.1
collecting ... collected 206 items

tests/test_analytics_repository.py::test_batch_create_clicks_uses_single_execute_call PASSED [  0%]
tests/test_analytics_repository.py::test_batch_create_clicks_returns_zero_for_empty_list PASSED [  0%]
tests/test_analytics_repository.py::test_analytics_repository_count_and_timestamps PASSED [  1%]
tests/test_analytics_service.py::test_get_analytics_uses_repository_results PASSED [  1%]
tests/test_app_assembly.py::test_middleware_and_metrics PASSED           [  2%]
tests/test_app_assembly.py::test_cors_preflight PASSED                   [  2%]
tests/test_app_assembly.py::test_rate_limiter_is_registered XFAIL (S...) [  3%]
tests/test_app_assembly.py::test_main_routes PASSED                      [  3%]
tests/test_app_assembly.py::test_service_failures_are_503[/urls-service0-list_recent_urls] PASSED [  4%]
tests/test_app_assembly.py::test_service_failures_are_503[/analytics/code-service1-get_analytics] PASSED [  4%]
tests/test_app_assembly.py::test_health_dependency_failures[db] PASSED   [  5%]
tests/test_app_assembly.py::test_health_dependency_failures[redis] PASSED [  5%]
tests/test_app_assembly.py::test_health_dependency_failures[both] PASSED [  6%]
tests/test_app_assembly.py::test_false_redis_ping_is_unhealthy PASSED    [  6%]
tests/test_app_assembly.py::test_livez_does_not_touch_dependencies PASSED [  7%]
tests/test_app_assembly.py::test_redirect_falls_back_on_redis_read_failure[ConnectionError] PASSED [  7%]
tests/test_app_assembly.py::test_redirect_falls_back_on_redis_read_failure[TimeoutError] PASSED [  8%]
tests/test_app_assembly.py::test_redis_health_read_failures[ping] PASSED [  8%]
tests/test_app_assembly.py::test_redis_health_read_failures[dbsize] PASSED [  9%]
tests/test_app_assembly.py::test_health_session_acquisition_failure PASSED [  9%]
tests/test_app_assembly.py::test_health_session_is_closed PASSED         [ 10%]
tests/test_app_assembly.py::test_stopped_redis_never_makes_redirect_5xx_and_health_reports_breaker PASSED [ 10%]
tests/test_app_assembly.py::test_actual_stopped_redis_keeps_redirects_available SKIPPED [ 11%]
tests/test_base62.py::test_encode_base62_zero_returns_empty_string PASSED [ 11%]
tests/test_base62.py::test_encode_base62_small_numbers PASSED            [ 12%]
tests/test_base62.py::test_encode_base62_larger_number PASSED            [ 12%]
tests/test_cache_strategy.py::test_circuit_open_half_open_closed_and_failed_probe PASSED [ 13%]
tests/test_cache_strategy.py::test_only_one_half_open_probe_and_stale_success_cannot_close PASSED [ 13%]
tests/test_cache_strategy.py::test_success_resets_consecutive_failures PASSED [ 14%]
tests/test_cache_strategy.py::test_client_timeout_and_retry_configuration PASSED [ 14%]
tests/test_cache_strategy.py::test_ttl_jitter_bounds_and_absolute_expiry PASSED [ 15%]
tests/test_cache_strategy.py::test_many_cold_requests_share_one_database_read[False] PASSED [ 15%]
tests/test_cache_strategy.py::test_many_cold_requests_share_one_database_read[True] PASSED [ 16%]
tests/test_cache_strategy.py::test_cross_process_lock_wait_rechecks_cache PASSED [ 16%]
tests/test_cache_strategy.py::test_negative_caching_and_alias_creation_invalidation PASSED [ 16%]
tests/test_cache_strategy.py::test_alias_creation_fences_an_inflight_negative_fill PASSED [ 17%]
tests/test_cache_strategy.py::test_lock_release_and_publication_require_owner PASSED [ 17%]
tests/test_cache_strategy.py::test_negative_cache_expiry PASSED          [ 18%]
tests/test_cache_strategy.py::test_redis_down_falls_back_and_counts_metric PASSED [ 18%]
tests/test_cache_strategy.py::test_singleflight_timeout_and_exception_cleanup PASSED [ 19%]
tests/test_cache_strategy.py::test_positive_cache_still_checks_deletion_and_database_failure PASSED [ 19%]
tests/test_cache_strategy.py::test_postgresql_stampede_executes_one_select SKIPPED [ 20%]
tests/test_code_generation.py::test_100000_candidates_are_unique_and_url_safe PASSED [ 20%]
tests/test_code_generation.py::test_production_generator_uses_secrets_choice PASSED [ 21%]
tests/test_code_generation.py::test_collision_retries_preserve_existing_destination PASSED [ 21%]
tests/test_code_generation.py::test_exhaustion_is_bounded_and_leaves_transaction_usable PASSED [ 22%]
tests/test_code_generation.py::test_non_collision_integrity_error_is_not_retried PASSED [ 22%]
tests/test_code_generation.py::test_concurrent_replicas_reserve_codes_in_postgresql SKIPPED [ 23%]
tests/test_code_generation.py::test_static_route_names_are_not_allocated PASSED [ 23%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_USER] PASSED [ 24%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_PASSWORD] PASSED [ 24%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_DB] PASSED [ 25%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[GRAFANA_ADMIN_USER] PASSED [ 25%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[GRAFANA_ADMIN_PASSWORD] PASSED [ 26%]
tests/test_deployment_config.py::test_compose_uses_same_database_credentials_for_all_clients PASSED [ 26%]
tests/test_deployment_config.py::test_profile_selects_matching_brokers[kafka] PASSED [ 27%]
tests/test_deployment_config.py::test_profile_selects_matching_brokers[redis-streams] PASSED [ 27%]
tests/test_event_bus.py::test_duplicate_delivery_one_row_and_commit_before_ack PASSED [ 28%]
tests/test_event_bus.py::test_malformed_or_unknown_version_dlq_after_three_attempts[{broken] PASSED [ 28%]
tests/test_event_bus.py::test_malformed_or_unknown_version_dlq_after_three_attempts[{"schema_version":99,"short_code":"abc123"}] PASSED [ 29%]
tests/test_event_bus.py::test_poison_row_does_not_discard_healthy_batch_rows PASSED [ 29%]
tests/test_event_bus.py::test_database_error_never_acknowledges_or_deadletters PASSED [ 30%]
tests/test_event_bus.py::test_commit_failure_does_not_ack PASSED         [ 30%]
tests/test_event_bus.py::test_dlq_publish_failure_does_not_advance_offset PASSED [ 31%]
tests/test_event_bus.py::test_idle_timer_and_shutdown_flush[False] PASSED [ 31%]
tests/test_event_bus.py::test_idle_timer_and_shutdown_flush[True] PASSED [ 32%]
tests/test_event_bus.py::test_slow_broker_and_full_queue_do_not_block_redirects PASSED [ 32%]
tests/test_event_bus.py::test_kafka_raw_poll_and_explicit_offsets PASSED [ 33%]
tests/test_event_bus.py::test_redis_groups_recover_pending_before_new_reads PASSED [ 33%]
tests/test_event_bus.py::test_memory_groups_and_unacknowledged_recovery PASSED [ 33%]
tests/test_event_bus.py::test_dlq_list_and_replay_preserve_event_id PASSED [ 34%]
tests/test_event_bus.py::test_adapter_selection_without_connecting[memory-InMemoryEventBus] PASSED [ 34%]
tests/test_event_bus.py::test_adapter_selection_without_connecting[kafka-KafkaEventBus] PASSED [ 35%]
tests/test_event_bus.py::test_adapter_selection_without_connecting[redis_streams-RedisStreamsEventBus] PASSED [ 35%]
tests/test_event_bus.py::test_postgres_duplicate_after_ack_failure SKIPPED [ 36%]
tests/test_event_bus.py::test_real_redis_pending_recovery_and_ack SKIPPED [ 36%]
tests/test_event_bus.py::test_legacy_event_without_id_goes_to_dlq PASSED [ 37%]
tests/test_event_bus.py::test_memory_recovers_more_than_one_batch PASSED [ 37%]
tests/test_event_bus.py::test_real_kafka_delivery_commit_and_dlq SKIPPED [ 38%]
tests/test_event_bus.py::test_idle_timer_flushes_even_when_later_polls_fail PASSED [ 38%]
tests/test_health_route.py::test_health_endpoint_includes_total_urls PASSED [ 39%]
tests/test_migrations.py::test_migrations_on_empty_sqlite PASSED         [ 39%]
tests/test_migrations.py::test_offline_sql_uses_postgresql_settings PASSED [ 40%]
tests/test_migrations.py::test_postgresql_upgrade_schema_constraints_and_downgrade SKIPPED [ 40%]
tests/test_migrations.py::test_legacy_schema_can_be_stamped_and_upgraded SKIPPED [ 41%]
tests/test_rate_limiter.py::test_rate_limiter_allows_request_and_sets_headers PASSED [ 41%]
tests/test_rate_limiter.py::test_rate_limiter_rejects_request_when_limit_exceeded PASSED [ 42%]
tests/test_rate_limiter.py::test_rate_limiter_fails_open_when_redis_unavailable PASSED [ 42%]
tests/test_rate_limiter.py::test_rate_limiter_bypasses_metrics_endpoint PASSED [ 43%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[get-ConnectionError] PASSED [ 43%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[get-TimeoutError] PASSED [ 44%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[ping-ConnectionError] PASSED [ 44%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[ping-TimeoutError] PASSED [ 45%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[dbsize-ConnectionError] PASSED [ 45%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[dbsize-TimeoutError] PASSED [ 46%]
tests/test_redis_client.py::test_programming_errors_are_not_hidden PASSED [ 46%]
tests/test_redis_client.py::test_normal_cache_reads[https://example.com/-counter0] PASSED [ 47%]
tests/test_redis_client.py::test_normal_cache_reads[None-counter1] PASSED [ 47%]
tests/test_routes.py::test_create_short_url_returns_service_code PASSED  [ 48%]
tests/test_routes.py::test_redirect_returns_redirect_response PASSED     [ 48%]
tests/test_routes.py::test_redirect_raises_404_for_missing_code PASSED   [ 49%]
tests/test_routes.py::test_analytics_route_uses_service PASSED           [ 49%]
tests/test_routes.py::test_redis_health_success PASSED                   [ 50%]
tests/test_routes.py::test_redis_health_failure PASSED                   [ 50%]
tests/test_tooling_regressions.py::test_typed_models_preserve_column_types_and_nullability PASSED [ 50%]
tests/test_tooling_regressions.py::test_trace_logging_preserves_message_for_default_formatter PASSED [ 51%]
tests/test_tooling_regressions.py::test_worker_reports_unconfigured_database PASSED [ 51%]
tests/test_trace_privacy.py::test_url_spans_only_include_origin_and_code[False] PASSED [ 52%]
tests/test_trace_privacy.py::test_url_spans_only_include_origin_and_code[True] PASSED [ 52%]
tests/test_trace_privacy.py::test_auto_instrumented_redis_does_not_export_cached_url SKIPPED [ 53%]
tests/test_trace_privacy.py::test_auto_instrumented_http_does_not_export_path_or_query SKIPPED [ 53%]
tests/test_trace_privacy.py::test_tracing_initialization_installs_privacy_hooks PASSED [ 54%]
tests/test_trace_privacy.py::test_privacy_hooks_redact_instrumentation_attributes PASSED [ 54%]
tests/test_url_features.py::test_reject_unsafe_urls[ftp://example.com] PASSED [ 55%]
tests/test_url_features.py::test_reject_unsafe_urls[javascript:alert(1)] PASSED [ 55%]
tests/test_url_features.py::test_reject_unsafe_urls[https:///path] PASSED [ 56%]
tests/test_url_features.py::test_reject_unsafe_urls[https://] PASSED     [ 56%]
tests/test_url_features.py::test_reject_unsafe_urls[http://user:pass@example.com] PASSED [ 57%]
tests/test_url_features.py::test_reject_unsafe_urls[http://user@example.com] PASSED [ 57%]
tests/test_url_features.py::test_reject_unsafe_urls[http://@example.com] PASSED [ 58%]
tests/test_url_features.py::test_reject_unsafe_urls[http://localhost] PASSED [ 58%]
tests/test_url_features.py::test_reject_unsafe_urls[http://LOCALHOST.] PASSED [ 59%]
tests/test_url_features.py::test_reject_unsafe_urls[http://sub.localhost] PASSED [ 59%]
tests/test_url_features.py::test_reject_unsafe_urls[http://server.local] PASSED [ 60%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.0.0.1] PASSED [ 60%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.9.2.1] PASSED [ 61%]
tests/test_url_features.py::test_reject_unsafe_urls[http://10.1.2.3] PASSED [ 61%]
tests/test_url_features.py::test_reject_unsafe_urls[http://172.16.2.3] PASSED [ 62%]
tests/test_url_features.py::test_reject_unsafe_urls[http://192.168.1.1] PASSED [ 62%]
tests/test_url_features.py::test_reject_unsafe_urls[http://169.254.169.254] PASSED [ 63%]
tests/test_url_features.py::test_reject_unsafe_urls[http://0.0.0.0] PASSED [ 63%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::1]] PASSED [ 64%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::]] PASSED  [ 64%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fc00::1]] PASSED [ 65%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fd00::1]] PASSED [ 65%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fe80::1]] PASSED [ 66%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::ffff:127.0.0.1]] PASSED [ 66%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::ffff:192.168.0.1]] PASSED [ 66%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fe80::1%25eth0]] PASSED [ 67%]
tests/test_url_features.py::test_reject_unsafe_urls[http://2130706433] PASSED [ 67%]
tests/test_url_features.py::test_reject_unsafe_urls[http://0x7f000001] PASSED [ 68%]
tests/test_url_features.py::test_reject_unsafe_urls[http://0177.0.0.1] PASSED [ 68%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.1] PASSED [ 69%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.0.0.1.] PASSED [ 69%]
tests/test_url_features.py::test_reject_unsafe_urls[http://%6cocalhost] PASSED [ 70%]
tests/test_url_features.py::test_reject_unsafe_urls[http://localHOST\u3002] PASSED [ 70%]
tests/test_url_features.py::test_reject_unsafe_urls[http://example.com\\@127.0.0.1] PASSED [ 71%]
tests/test_url_features.py::test_reject_unsafe_urls[http://exam\nple.com] PASSED [ 71%]
tests/test_url_features.py::test_reject_unsafe_urls[http://bad_host.com] PASSED [ 72%]
tests/test_url_features.py::test_reject_unsafe_urls[http://-bad.example] PASSED [ 72%]
tests/test_url_features.py::test_reject_unsafe_urls[https://example.com/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx] PASSED [ 73%]
tests/test_url_features.py::test_normalize_public_hosts[https://EXAMPLE.COM./a?b=1-example.com] PASSED [ 73%]
tests/test_url_features.py::test_normalize_public_hosts[http://b\xfccher.de/a-xn--bcher-kva.de] PASSED [ 74%]
tests/test_url_features.py::test_normalize_public_hosts[https://8.8.8.8/a-8.8.8.8] PASSED [ 74%]
tests/test_url_features.py::test_normalize_public_hosts[http://[2606:4700:4700::1111]/-[2606:4700:4700::1111]] PASSED [ 75%]
tests/test_url_features.py::test_normalize_public_hosts[https://localhost.example.com/-localhost.example.com] PASSED [ 75%]
tests/test_url_features.py::test_maximum_url_length PASSED               [ 76%]
tests/test_url_features.py::test_invalid_alias[ab] PASSED                [ 76%]
tests/test_url_features.py::test_invalid_alias[aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa] PASSED [ 77%]
tests/test_url_features.py::test_invalid_alias[] PASSED                  [ 77%]
tests/test_url_features.py::test_invalid_alias[a/b] PASSED               [ 78%]
tests/test_url_features.py::test_invalid_alias[a.b] PASSED               [ 78%]
tests/test_url_features.py::test_invalid_alias[a b] PASSED               [ 79%]
tests/test_url_features.py::test_invalid_alias[\xe9\xe9\xe9] PASSED      [ 79%]
tests/test_url_features.py::test_invalid_alias[api] PASSED               [ 80%]
tests/test_url_features.py::test_invalid_alias[Health] PASSED            [ 80%]
tests/test_url_features.py::test_invalid_alias[METRICS] PASSED           [ 81%]
tests/test_url_features.py::test_invalid_alias[docs] PASSED              [ 81%]
tests/test_url_features.py::test_invalid_alias[admin] PASSED             [ 82%]
tests/test_url_features.py::test_invalid_alias[shorten] PASSED           [ 82%]
tests/test_url_features.py::test_invalid_alias[livez] PASSED             [ 83%]
tests/test_url_features.py::test_invalid_alias[urls] PASSED              [ 83%]
tests/test_url_features.py::test_invalid_alias[analytics] PASSED         [ 83%]
tests/test_url_features.py::test_invalid_alias[redoc] PASSED             [ 84%]
tests/test_url_features.py::test_valid_alias[abc] PASSED                 [ 84%]
tests/test_url_features.py::test_valid_alias[A_9-x] PASSED               [ 85%]
tests/test_url_features.py::test_valid_alias[aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa] PASSED [ 85%]
tests/test_url_features.py::test_invalid_expiry[2020-01-01T00:00:00Z] PASSED [ 86%]
tests/test_url_features.py::test_invalid_expiry[2099-01-01T00:00:00] PASSED [ 86%]
tests/test_url_features.py::test_invalid_expiry[nonsense] PASSED         [ 87%]
tests/test_url_features.py::test_invalid_expiry[9999999999] PASSED       [ 87%]
tests/test_url_features.py::test_expiry_normalized_to_utc PASSED         [ 88%]
tests/test_url_features.py::test_alias_create_conflict_delete_and_list PASSED [ 88%]
tests/test_url_features.py::test_expired_cache_hit_returns_410 PASSED    [ 89%]
tests/test_url_features.py::test_api_validation_is_422[payload0] PASSED  [ 89%]
tests/test_url_features.py::test_api_validation_is_422[payload1] PASSED  [ 90%]
tests/test_url_features.py::test_api_validation_is_422[payload2] PASSED  [ 90%]
tests/test_url_features.py::test_api_validation_is_422[payload3] PASSED  [ 91%]
tests/test_url_features.py::test_missing_delete_and_redirect PASSED      [ 91%]
tests/test_url_features.py::test_openapi_documents_fields_and_statuses PASSED [ 92%]
tests/test_url_features.py::test_cache_absolute_deadline_and_eviction PASSED [ 92%]
tests/test_url_features.py::test_multicast_rejected[http://224.0.0.1] PASSED [ 93%]
tests/test_url_features.py::test_multicast_rejected[http://[ff02::1]] PASSED [ 93%]
tests/test_url_features.py::test_numeric_string_expiry_rejected PASSED   [ 94%]
tests/test_url_features.py::test_no_redirect_if_expiry_passes_during_click_publication PASSED [ 94%]
tests/test_url_features.py::test_cache_not_used_when_database_fails PASSED [ 95%]
tests/test_url_features.py::test_far_expiry_cache_is_capped_at_jittered_ttl PASSED [ 95%]
tests/test_url_features.py::test_postgresql_alias_races_and_delete_lock SKIPPED [ 96%]
tests/test_url_features.py::test_alias_is_case_sensitive PASSED          [ 96%]
tests/test_url_features.py::test_expiry_equal_to_now_is_rejected PASSED  [ 97%]
tests/test_url_features.py::test_subsecond_remaining_lifetime_does_not_populate_cache PASSED [ 97%]
tests/test_url_repository.py::test_url_repository_create_with_code_and_lookup PASSED [ 98%]
tests/test_url_service.py::test_shorten_creates_code_and_commits PASSED  [ 98%]
tests/test_url_service.py::test_resolve_returns_cached_value_and_records_click PASSED [ 99%]
tests/test_url_service.py::test_resolve_caches_database_value_on_miss PASSED [ 99%]
tests/test_url_service.py::test_resolve_returns_none_when_code_missing PASSED [100%]

=============================== warnings summary ===============================
.venv/lib/python3.11/site-packages/starlette/testclient.py:45
  /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/lib/python3.11/site-packages/starlette/testclient.py:45: DeprecationWarning: The anyio.abc.BlockingPortal alias is deprecated, use anyio.from_thread.BlockingPortal instead.
    _PortalFactoryType = Callable[[], AbstractContextManager[anyio.abc.BlockingPortal]]

app/main.py:38
  /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/app/main.py:38: DeprecationWarning:
          on_event is deprecated, use lifespan event handlers instead.

          Read more about it in the
          [FastAPI docs for Lifespan Events](https://fastapi.tiangolo.com/advanced/events/).

    @app.on_event("startup")

.venv/lib/python3.11/site-packages/fastapi/applications.py:4598
.venv/lib/python3.11/site-packages/fastapi/applications.py:4598
  /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/lib/python3.11/site-packages/fastapi/applications.py:4598: DeprecationWarning:
          on_event is deprecated, use lifespan event handlers instead.

          Read more about it in the
          [FastAPI docs for Lifespan Events](https://fastapi.tiangolo.com/advanced/events/).

    return self.router.on_event(event_type)  # ty: ignore[deprecated]

app/main.py:62
  /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/app/main.py:62: DeprecationWarning:
          on_event is deprecated, use lifespan event handlers instead.

          Read more about it in the
          [FastAPI docs for Lifespan Events](https://fastapi.tiangolo.com/advanced/events/).

    @app.on_event("shutdown")

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
app/cli.py                                    43     14    67%   28-30, 57-67, 71
app/core/__init__.py                           0      0   100%
app/core/config.py                            25      4    84%   22, 33, 37, 51
app/db/__init__.py                             0      0   100%
app/db/database.py                            17      6    65%   29-35
app/events/__init__.py                        13      1    92%   18
app/events/base.py                            11      0   100%
app/events/kafka.py                           42     10    76%   17-20, 27, 39, 50-53, 64
app/events/memory.py                          46      0   100%
app/events/models.py                          26      0   100%
app/events/publisher.py                       72      5    93%   49, 57-58, 93-94
app/events/redis_streams.py                   43      6    86%   79, 113-114, 120-122
app/kafka/__init__.py                          0      0   100%
app/kafka/consumer.py                          4      0   100%
app/kafka/producer.py                          7      1    86%   9
app/main.py                                   34      4    88%   34-35, 50-51
app/middleware/rate_limiter.py                43      5    88%   57, 65-78
app/models/__init__.py                         0      0   100%
app/models/analytics.py                       11      0   100%
app/models/url.py                             14      0   100%
app/observability/logging.py                  27      6    78%   25-26, 73-76
app/observability/metrics.py                  35      0   100%
app/observability/tracing.py                  97     45    54%   39-50, 70-71, 88-92, 117-120, 136-137, 140-141, 144-145, 151-154, 159-179
app/repositories/__init__.py                   0      0   100%
app/repositories/analytics_repository.py      23      1    96%   28
app/repositories/url_repository.py            36      0   100%
app/schemas/__init__.py                        0      0   100%
app/schemas/url_schema.py                     73      3    96%   73, 95, 122
app/services/__init__.py                       0      0   100%
app/services/analytics_service.py             13      0   100%
app/services/code_generator.py                 9      0   100%
app/services/url_service.py                  148      9    94%   35-36, 63, 68, 73, 153, 161, 231-232
app/utils/__init__.py                          0      0   100%
app/utils/base62.py                            9      0   100%
app/workers/__init__.py                        0      0   100%
app/workers/analytics_worker.py              110      8    93%   159-165, 169
------------------------------------------------------------------------
TOTAL                                       1314    148    89%
Coverage XML written to file coverage.xml
============ 194 passed, 11 skipped, 1 xfailed, 5 warnings in 9.40s ============
```

## Docker-enabled full suite

```text
============================= test session starts ==============================
platform darwin -- Python 3.11.14, pytest-9.0.3, pluggy-1.7.0
rootdir: /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener
configfile: pytest.ini
testpaths: tests
plugins: platformdirs-4.13.0, cov-7.1.0, anyio-4.15.1
collected 206 items

tests/test_analytics_repository.py ...                                   [  1%]
tests/test_analytics_service.py .                                        [  1%]
tests/test_app_assembly.py ..x................                           [ 11%]
tests/test_base62.py ...                                                 [ 12%]
tests/test_cache_strategy.py ................                            [ 20%]
tests/test_code_generation.py .......                                    [ 23%]
tests/test_deployment_config.py ........                                 [ 27%]
tests/test_event_bus.py .......................                          [ 38%]
tests/test_health_route.py .                                             [ 39%]
tests/test_migrations.py ....                                            [ 41%]
tests/test_rate_limiter.py ....                                          [ 43%]
tests/test_redis_client.py .........                                     [ 47%]
tests/test_routes.py ......                                              [ 50%]
tests/test_tooling_regressions.py ...                                    [ 51%]
tests/test_trace_privacy.py ..ss..                                       [ 54%]
tests/test_url_features.py ............................................. [ 76%]
...........................................                              [ 97%]
tests/test_url_repository.py .                                           [ 98%]
tests/test_url_service.py ....                                           [100%]

=============================== warnings summary ===============================
.venv/lib/python3.11/site-packages/starlette/testclient.py:45
  /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/lib/python3.11/site-packages/starlette/testclient.py:45: DeprecationWarning: The anyio.abc.BlockingPortal alias is deprecated, use anyio.from_thread.BlockingPortal instead.
    _PortalFactoryType = Callable[[], AbstractContextManager[anyio.abc.BlockingPortal]]

app/main.py:38
  /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/app/main.py:38: DeprecationWarning:
          on_event is deprecated, use lifespan event handlers instead.

          Read more about it in the
          [FastAPI docs for Lifespan Events](https://fastapi.tiangolo.com/advanced/events/).

    @app.on_event("startup")

.venv/lib/python3.11/site-packages/fastapi/applications.py:4598
.venv/lib/python3.11/site-packages/fastapi/applications.py:4598
  /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/lib/python3.11/site-packages/fastapi/applications.py:4598: DeprecationWarning:
          on_event is deprecated, use lifespan event handlers instead.

          Read more about it in the
          [FastAPI docs for Lifespan Events](https://fastapi.tiangolo.com/advanced/events/).

    return self.router.on_event(event_type)  # ty: ignore[deprecated]

app/main.py:62
  /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/app/main.py:62: DeprecationWarning:
          on_event is deprecated, use lifespan event handlers instead.

          Read more about it in the
          [FastAPI docs for Lifespan Events](https://fastapi.tiangolo.com/advanced/events/).

    @app.on_event("shutdown")

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
============ 203 passed, 2 skipped, 1 xfailed, 5 warnings in 19.88s ============
```

## make mcp-test

```text
cd mcp-server && /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m pytest
..........                                                               [100%]
10 passed in 0.44s
```

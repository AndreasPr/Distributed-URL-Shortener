# Step 2.1 authentication verification

Branch: `step-2-1-auth`.

All four required/applicable commands below exited 0:

- `make check`: Black, isort, Flake8, mypy (46 application files), and pytest;
  **227 passed, 11 skipped, 5 warnings**, 90% coverage. No xfails remain:
  the assembled-app assertion verifies the limiter is explicitly registered.
- `make frontend-check`: npm ci, core-web-vitals ESLint (no lint findings), three
  Node API-client tests, and TypeScript --noEmit all passed. Local Node is 23.9.0;
  npm warned that eslint-visitor-keys expects supported Node 20.19/22.13+/24+ ranges.
  Existing dependency deprecation warnings are retained in the actual output.
  The local path labelled node@22 also reports 23.9.0, so it was not represented as
  a supported Node 22 run. CI remains configured for Node 22.
- `make mcp-test`: **10 passed**.
- `RUN_DOCKER_TESTS=1 .venv/bin/python -m pytest -q tests/test_migrations.py`:
  **4 passed**, including real PostgreSQL schema parity, existing-data upgrade,
  repeat upgrade and downgrade on disposable containers. No user database changed.

The normal backend skips are nine opt-in Docker cases and two existing tracing
checks requiring missing pkg_resources (OTel 0.41b0). Only the migration subset
was enabled for this step. New real-Redis Lua tests are deliberately deferred to
Testcontainers in step 5.1. Fake Redis exercises burst/refill, concurrent budget,
per-key isolation, shared route-template buckets and error behavior; it does not
prove the Redis Lua interpreter executes the script correctly.

Additional checks: CLI keys help, focused unused/undefined-import checks on new
Python tests, and git diff whitespace validation passed. Compose profile/credential
configuration and Kubernetes service/NetworkPolicy wiring are tested without a
live cluster. No Kubernetes rollout, full Compose rebuild, manual browser session,
or load test was run. Existing k6 scripts require auth header/expectation updates
before reuse; the MCP legacy sliding-window signal reader is not a token-bucket
history reader. These limitations are documented in security.md.

New coverage in tests/test_auth.py checks generated-key hashing, metadata secrecy,
constant-time comparison calls, revocation, CLI one-time output, 401/403 paths,
read/write/admin access, creator attribution, DB auth failure, public endpoints,
OpenAPI security declarations, limiter outages, headers and internal metrics routing.
Tests/test_rate_limiter.py covers token balance/refill and trusted IPv4/IPv6 proxy
chains, including spoofed leftmost addresses. Frontend tests verify protected
header attachment, public health omission, forgetting and no cross-instance storage.

The first backend run after adding auth tests had one fixture failure: /health used
its real DB factory instead of the fake health session. The fixture was corrected;
no application auth bypass was added. Final output below is from the passing run.

See [security model](security.md), [API changes](api-changes.md), and
[ADR 0007](adr/0007-api-keys-and-token-buckets.md).

## make check

```text
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m black --check app/
All done! ✨ 🍰 ✨
46 files would be left unchanged.
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m isort --check-only app/
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m flake8 app/
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m mypy app/
Success: no issues found in 46 source files
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m pytest --cov=app --cov-report=term-missing --cov-report=xml
============================= test session starts ==============================
platform darwin -- Python 3.11.14, pytest-9.0.3, pluggy-1.7.0 -- /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python
cachedir: .pytest_cache
rootdir: /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener
configfile: pytest.ini
testpaths: tests
plugins: platformdirs-4.13.0, cov-7.1.0, anyio-4.15.1
collecting ... collected 238 items

tests/test_analytics_repository.py::test_batch_create_clicks_uses_single_execute_call PASSED [  0%]
tests/test_analytics_repository.py::test_batch_create_clicks_returns_zero_for_empty_list PASSED [  0%]
tests/test_analytics_repository.py::test_analytics_repository_count_and_timestamps PASSED [  1%]
tests/test_analytics_service.py::test_get_analytics_uses_repository_results PASSED [  1%]
tests/test_app_assembly.py::test_middleware_and_metrics PASSED           [  2%]
tests/test_app_assembly.py::test_cors_preflight PASSED                   [  2%]
tests/test_app_assembly.py::test_rate_limiter_is_registered PASSED       [  2%]
tests/test_app_assembly.py::test_main_routes PASSED                      [  3%]
tests/test_app_assembly.py::test_service_failures_are_503[/urls-service0-list_recent_urls] PASSED [  3%]
tests/test_app_assembly.py::test_service_failures_are_503[/analytics/code-service1-get_analytics] PASSED [  4%]
tests/test_app_assembly.py::test_health_dependency_failures[db] PASSED   [  4%]
tests/test_app_assembly.py::test_health_dependency_failures[redis] PASSED [  5%]
tests/test_app_assembly.py::test_health_dependency_failures[both] PASSED [  5%]
tests/test_app_assembly.py::test_false_redis_ping_is_unhealthy PASSED    [  5%]
tests/test_app_assembly.py::test_livez_does_not_touch_dependencies PASSED [  6%]
tests/test_app_assembly.py::test_redirect_falls_back_on_redis_read_failure[ConnectionError] PASSED [  6%]
tests/test_app_assembly.py::test_redirect_falls_back_on_redis_read_failure[TimeoutError] PASSED [  7%]
tests/test_app_assembly.py::test_redis_health_read_failures[ping] PASSED [  7%]
tests/test_app_assembly.py::test_redis_health_read_failures[dbsize] PASSED [  7%]
tests/test_app_assembly.py::test_health_session_acquisition_failure PASSED [  8%]
tests/test_app_assembly.py::test_health_session_is_closed PASSED         [  8%]
tests/test_app_assembly.py::test_stopped_redis_never_makes_redirect_5xx_and_health_reports_breaker PASSED [  9%]
tests/test_app_assembly.py::test_actual_stopped_redis_keeps_redirects_available SKIPPED [  9%]
tests/test_auth.py::test_key_hashing_metadata_and_revocation PASSED      [ 10%]
tests/test_auth.py::test_key_invalid_creation[-scopes0] PASSED           [ 10%]
tests/test_auth.py::test_key_invalid_creation[ok-scopes1] PASSED         [ 10%]
tests/test_auth.py::test_key_invalid_creation[ok-scopes2] PASSED         [ 11%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-POST-/shorten] PASSED [ 11%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-DELETE-/urls/code] PASSED [ 12%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-GET-/urls] PASSED [ 12%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-GET-/analytics/code] PASSED [ 13%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-GET-/admin/keys] PASSED [ 13%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-DELETE-/admin/keys/1] PASSED [ 13%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-POST-/shorten] PASSED [ 14%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-DELETE-/urls/code] PASSED [ 14%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-GET-/urls] PASSED [ 15%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-GET-/analytics/code] PASSED [ 15%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-GET-/admin/keys] PASSED [ 15%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-DELETE-/admin/keys/1] PASSED [ 16%]
tests/test_auth.py::test_scope_enforcement_and_creator PASSED            [ 16%]
tests/test_auth.py::test_public_endpoints_and_openapi PASSED             [ 17%]
tests/test_auth.py::test_auth_database_failure_is_503 PASSED             [ 17%]
tests/test_auth.py::test_write_limits_and_key_isolation PASSED           [ 18%]
tests/test_auth.py::test_delete_uses_template_bucket_not_code PASSED     [ 18%]
tests/test_auth.py::test_redirects_share_ip_bucket_and_ignore_spoofed_headers PASSED [ 18%]
tests/test_auth.py::test_redis_failure_closes_writes_but_not_redirects PASSED [ 19%]
tests/test_auth.py::test_internal_metrics_not_exposed_on_api_port PASSED [ 19%]
tests/test_auth.py::test_cli_prints_key_once_and_never_lists_hash PASSED [ 20%]
tests/test_base62.py::test_encode_base62_zero_returns_empty_string PASSED [ 20%]
tests/test_base62.py::test_encode_base62_small_numbers PASSED            [ 21%]
tests/test_base62.py::test_encode_base62_larger_number PASSED            [ 21%]
tests/test_cache_strategy.py::test_circuit_open_half_open_closed_and_failed_probe PASSED [ 21%]
tests/test_cache_strategy.py::test_only_one_half_open_probe_and_stale_success_cannot_close PASSED [ 22%]
tests/test_cache_strategy.py::test_success_resets_consecutive_failures PASSED [ 22%]
tests/test_cache_strategy.py::test_client_timeout_and_retry_configuration PASSED [ 23%]
tests/test_cache_strategy.py::test_ttl_jitter_bounds_and_absolute_expiry PASSED [ 23%]
tests/test_cache_strategy.py::test_many_cold_requests_share_one_database_read[False] PASSED [ 23%]
tests/test_cache_strategy.py::test_many_cold_requests_share_one_database_read[True] PASSED [ 24%]
tests/test_cache_strategy.py::test_cross_process_lock_wait_rechecks_cache PASSED [ 24%]
tests/test_cache_strategy.py::test_negative_caching_and_alias_creation_invalidation PASSED [ 25%]
tests/test_cache_strategy.py::test_alias_creation_fences_an_inflight_negative_fill PASSED [ 25%]
tests/test_cache_strategy.py::test_lock_release_and_publication_require_owner PASSED [ 26%]
tests/test_cache_strategy.py::test_negative_cache_expiry PASSED          [ 26%]
tests/test_cache_strategy.py::test_redis_down_falls_back_and_counts_metric PASSED [ 26%]
tests/test_cache_strategy.py::test_singleflight_timeout_and_exception_cleanup PASSED [ 27%]
tests/test_cache_strategy.py::test_positive_cache_still_checks_deletion_and_database_failure PASSED [ 27%]
tests/test_cache_strategy.py::test_postgresql_stampede_executes_one_select SKIPPED [ 28%]
tests/test_code_generation.py::test_100000_candidates_are_unique_and_url_safe PASSED [ 28%]
tests/test_code_generation.py::test_production_generator_uses_secrets_choice PASSED [ 28%]
tests/test_code_generation.py::test_collision_retries_preserve_existing_destination PASSED [ 29%]
tests/test_code_generation.py::test_exhaustion_is_bounded_and_leaves_transaction_usable PASSED [ 29%]
tests/test_code_generation.py::test_non_collision_integrity_error_is_not_retried PASSED [ 30%]
tests/test_code_generation.py::test_concurrent_replicas_reserve_codes_in_postgresql SKIPPED [ 30%]
tests/test_code_generation.py::test_static_route_names_are_not_allocated PASSED [ 31%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_USER] PASSED [ 31%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_PASSWORD] PASSED [ 31%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_DB] PASSED [ 32%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[GRAFANA_ADMIN_USER] PASSED [ 32%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[GRAFANA_ADMIN_PASSWORD] PASSED [ 33%]
tests/test_deployment_config.py::test_compose_uses_same_database_credentials_for_all_clients PASSED [ 33%]
tests/test_deployment_config.py::test_profile_selects_matching_brokers[kafka] PASSED [ 34%]
tests/test_deployment_config.py::test_profile_selects_matching_brokers[redis-streams] PASSED [ 34%]
tests/test_deployment_config.py::test_kubernetes_metrics_use_internal_port_and_network_policy PASSED [ 34%]
tests/test_event_bus.py::test_duplicate_delivery_one_row_and_commit_before_ack PASSED [ 35%]
tests/test_event_bus.py::test_malformed_or_unknown_version_dlq_after_three_attempts[{broken] PASSED [ 35%]
tests/test_event_bus.py::test_malformed_or_unknown_version_dlq_after_three_attempts[{"schema_version":99,"short_code":"abc123"}] PASSED [ 36%]
tests/test_event_bus.py::test_poison_row_does_not_discard_healthy_batch_rows PASSED [ 36%]
tests/test_event_bus.py::test_database_error_never_acknowledges_or_deadletters PASSED [ 36%]
tests/test_event_bus.py::test_commit_failure_does_not_ack PASSED         [ 37%]
tests/test_event_bus.py::test_dlq_publish_failure_does_not_advance_offset PASSED [ 37%]
tests/test_event_bus.py::test_idle_timer_and_shutdown_flush[False] PASSED [ 38%]
tests/test_event_bus.py::test_idle_timer_and_shutdown_flush[True] PASSED [ 38%]
tests/test_event_bus.py::test_slow_broker_and_full_queue_do_not_block_redirects PASSED [ 39%]
tests/test_event_bus.py::test_kafka_raw_poll_and_explicit_offsets PASSED [ 39%]
tests/test_event_bus.py::test_redis_groups_recover_pending_before_new_reads PASSED [ 39%]
tests/test_event_bus.py::test_memory_groups_and_unacknowledged_recovery PASSED [ 40%]
tests/test_event_bus.py::test_dlq_list_and_replay_preserve_event_id PASSED [ 40%]
tests/test_event_bus.py::test_adapter_selection_without_connecting[memory-InMemoryEventBus] PASSED [ 41%]
tests/test_event_bus.py::test_adapter_selection_without_connecting[kafka-KafkaEventBus] PASSED [ 41%]
tests/test_event_bus.py::test_adapter_selection_without_connecting[redis_streams-RedisStreamsEventBus] PASSED [ 42%]
tests/test_event_bus.py::test_postgres_duplicate_after_ack_failure SKIPPED [ 42%]
tests/test_event_bus.py::test_real_redis_pending_recovery_and_ack SKIPPED [ 42%]
tests/test_event_bus.py::test_legacy_event_without_id_goes_to_dlq PASSED [ 43%]
tests/test_event_bus.py::test_memory_recovers_more_than_one_batch PASSED [ 43%]
tests/test_event_bus.py::test_real_kafka_delivery_commit_and_dlq SKIPPED [ 44%]
tests/test_event_bus.py::test_idle_timer_flushes_even_when_later_polls_fail PASSED [ 44%]
tests/test_health_route.py::test_health_endpoint_includes_total_urls PASSED [ 44%]
tests/test_migrations.py::test_migrations_on_empty_sqlite PASSED         [ 45%]
tests/test_migrations.py::test_offline_sql_uses_postgresql_settings PASSED [ 45%]
tests/test_migrations.py::test_postgresql_upgrade_schema_constraints_and_downgrade SKIPPED [ 46%]
tests/test_migrations.py::test_legacy_schema_can_be_stamped_and_upgraded SKIPPED [ 46%]
tests/test_rate_limiter.py::test_bucket_burst_refill_and_identity_isolation PASSED [ 47%]
tests/test_rate_limiter.py::test_bucket_concurrent_burst PASSED          [ 47%]
tests/test_rate_limiter.py::test_bucket_error_and_clock_regression PASSED [ 47%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[198.51.100.5-1.2.3.4-trusted0-198.51.100.5] PASSED [ 48%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[198.51.100.5-1.2.3.4-trusted1-198.51.100.5] PASSED [ 48%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[10.0.0.1-198.51.100.5-trusted2-198.51.100.5] PASSED [ 49%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[10.0.0.1-1.2.3.4, 198.51.100.5-trusted3-198.51.100.5] PASSED [ 49%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[10.0.0.1-198.51.100.5, 10.0.0.2-trusted4-198.51.100.5] PASSED [ 50%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[::1-2001:db8::1-trusted5-2001:db8::1] PASSED [ 50%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[10.0.0.1-garbage-trusted6-10.0.0.1] PASSED [ 50%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[get-ConnectionError] PASSED [ 51%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[get-TimeoutError] PASSED [ 51%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[ping-ConnectionError] PASSED [ 52%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[ping-TimeoutError] PASSED [ 52%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[dbsize-ConnectionError] PASSED [ 52%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[dbsize-TimeoutError] PASSED [ 53%]
tests/test_redis_client.py::test_programming_errors_are_not_hidden PASSED [ 53%]
tests/test_redis_client.py::test_normal_cache_reads[https://example.com/-counter0] PASSED [ 54%]
tests/test_redis_client.py::test_normal_cache_reads[None-counter1] PASSED [ 54%]
tests/test_routes.py::test_create_short_url_returns_service_code PASSED  [ 55%]
tests/test_routes.py::test_redirect_returns_redirect_response PASSED     [ 55%]
tests/test_routes.py::test_redirect_raises_404_for_missing_code PASSED   [ 55%]
tests/test_routes.py::test_analytics_route_uses_service PASSED           [ 56%]
tests/test_routes.py::test_redis_health_success PASSED                   [ 56%]
tests/test_routes.py::test_redis_health_failure PASSED                   [ 57%]
tests/test_tooling_regressions.py::test_typed_models_preserve_column_types_and_nullability PASSED [ 57%]
tests/test_tooling_regressions.py::test_trace_logging_preserves_message_for_default_formatter PASSED [ 57%]
tests/test_tooling_regressions.py::test_worker_reports_unconfigured_database PASSED [ 58%]
tests/test_trace_privacy.py::test_url_spans_only_include_origin_and_code[False] PASSED [ 58%]
tests/test_trace_privacy.py::test_url_spans_only_include_origin_and_code[True] PASSED [ 59%]
tests/test_trace_privacy.py::test_auto_instrumented_redis_does_not_export_cached_url SKIPPED [ 59%]
tests/test_trace_privacy.py::test_auto_instrumented_http_does_not_export_path_or_query SKIPPED [ 60%]
tests/test_trace_privacy.py::test_tracing_initialization_installs_privacy_hooks PASSED [ 60%]
tests/test_trace_privacy.py::test_privacy_hooks_redact_instrumentation_attributes PASSED [ 60%]
tests/test_url_features.py::test_reject_unsafe_urls[ftp://example.com] PASSED [ 61%]
tests/test_url_features.py::test_reject_unsafe_urls[javascript:alert(1)] PASSED [ 61%]
tests/test_url_features.py::test_reject_unsafe_urls[https:///path] PASSED [ 62%]
tests/test_url_features.py::test_reject_unsafe_urls[https://] PASSED     [ 62%]
tests/test_url_features.py::test_reject_unsafe_urls[http://user:pass@example.com] PASSED [ 63%]
tests/test_url_features.py::test_reject_unsafe_urls[http://user@example.com] PASSED [ 63%]
tests/test_url_features.py::test_reject_unsafe_urls[http://@example.com] PASSED [ 63%]
tests/test_url_features.py::test_reject_unsafe_urls[http://localhost] PASSED [ 64%]
tests/test_url_features.py::test_reject_unsafe_urls[http://LOCALHOST.] PASSED [ 64%]
tests/test_url_features.py::test_reject_unsafe_urls[http://sub.localhost] PASSED [ 65%]
tests/test_url_features.py::test_reject_unsafe_urls[http://server.local] PASSED [ 65%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.0.0.1] PASSED [ 65%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.9.2.1] PASSED [ 66%]
tests/test_url_features.py::test_reject_unsafe_urls[http://10.1.2.3] PASSED [ 66%]
tests/test_url_features.py::test_reject_unsafe_urls[http://172.16.2.3] PASSED [ 67%]
tests/test_url_features.py::test_reject_unsafe_urls[http://192.168.1.1] PASSED [ 67%]
tests/test_url_features.py::test_reject_unsafe_urls[http://169.254.169.254] PASSED [ 68%]
tests/test_url_features.py::test_reject_unsafe_urls[http://0.0.0.0] PASSED [ 68%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::1]] PASSED [ 68%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::]] PASSED  [ 69%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fc00::1]] PASSED [ 69%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fd00::1]] PASSED [ 70%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fe80::1]] PASSED [ 70%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::ffff:127.0.0.1]] PASSED [ 71%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::ffff:192.168.0.1]] PASSED [ 71%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fe80::1%25eth0]] PASSED [ 71%]
tests/test_url_features.py::test_reject_unsafe_urls[http://2130706433] PASSED [ 72%]
tests/test_url_features.py::test_reject_unsafe_urls[http://0x7f000001] PASSED [ 72%]
tests/test_url_features.py::test_reject_unsafe_urls[http://0177.0.0.1] PASSED [ 73%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.1] PASSED [ 73%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.0.0.1.] PASSED [ 73%]
tests/test_url_features.py::test_reject_unsafe_urls[http://%6cocalhost] PASSED [ 74%]
tests/test_url_features.py::test_reject_unsafe_urls[http://localHOST\u3002] PASSED [ 74%]
tests/test_url_features.py::test_reject_unsafe_urls[http://example.com\\@127.0.0.1] PASSED [ 75%]
tests/test_url_features.py::test_reject_unsafe_urls[http://exam\nple.com] PASSED [ 75%]
tests/test_url_features.py::test_reject_unsafe_urls[http://bad_host.com] PASSED [ 76%]
tests/test_url_features.py::test_reject_unsafe_urls[http://-bad.example] PASSED [ 76%]
tests/test_url_features.py::test_reject_unsafe_urls[https://example.com/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx] PASSED [ 76%]
tests/test_url_features.py::test_normalize_public_hosts[https://EXAMPLE.COM./a?b=1-example.com] PASSED [ 77%]
tests/test_url_features.py::test_normalize_public_hosts[http://b\xfccher.de/a-xn--bcher-kva.de] PASSED [ 77%]
tests/test_url_features.py::test_normalize_public_hosts[https://8.8.8.8/a-8.8.8.8] PASSED [ 78%]
tests/test_url_features.py::test_normalize_public_hosts[http://[2606:4700:4700::1111]/-[2606:4700:4700::1111]] PASSED [ 78%]
tests/test_url_features.py::test_normalize_public_hosts[https://localhost.example.com/-localhost.example.com] PASSED [ 78%]
tests/test_url_features.py::test_maximum_url_length PASSED               [ 79%]
tests/test_url_features.py::test_invalid_alias[ab] PASSED                [ 79%]
tests/test_url_features.py::test_invalid_alias[aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa] PASSED [ 80%]
tests/test_url_features.py::test_invalid_alias[] PASSED                  [ 80%]
tests/test_url_features.py::test_invalid_alias[a/b] PASSED               [ 81%]
tests/test_url_features.py::test_invalid_alias[a.b] PASSED               [ 81%]
tests/test_url_features.py::test_invalid_alias[a b] PASSED               [ 81%]
tests/test_url_features.py::test_invalid_alias[\xe9\xe9\xe9] PASSED      [ 82%]
tests/test_url_features.py::test_invalid_alias[api] PASSED               [ 82%]
tests/test_url_features.py::test_invalid_alias[Health] PASSED            [ 83%]
tests/test_url_features.py::test_invalid_alias[METRICS] PASSED           [ 83%]
tests/test_url_features.py::test_invalid_alias[docs] PASSED              [ 84%]
tests/test_url_features.py::test_invalid_alias[admin] PASSED             [ 84%]
tests/test_url_features.py::test_invalid_alias[shorten] PASSED           [ 84%]
tests/test_url_features.py::test_invalid_alias[livez] PASSED             [ 85%]
tests/test_url_features.py::test_invalid_alias[urls] PASSED              [ 85%]
tests/test_url_features.py::test_invalid_alias[analytics] PASSED         [ 86%]
tests/test_url_features.py::test_invalid_alias[redoc] PASSED             [ 86%]
tests/test_url_features.py::test_valid_alias[abc] PASSED                 [ 86%]
tests/test_url_features.py::test_valid_alias[A_9-x] PASSED               [ 87%]
tests/test_url_features.py::test_valid_alias[aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa] PASSED [ 87%]
tests/test_url_features.py::test_invalid_expiry[2020-01-01T00:00:00Z] PASSED [ 88%]
tests/test_url_features.py::test_invalid_expiry[2099-01-01T00:00:00] PASSED [ 88%]
tests/test_url_features.py::test_invalid_expiry[nonsense] PASSED         [ 89%]
tests/test_url_features.py::test_invalid_expiry[9999999999] PASSED       [ 89%]
tests/test_url_features.py::test_expiry_normalized_to_utc PASSED         [ 89%]
tests/test_url_features.py::test_alias_create_conflict_delete_and_list PASSED [ 90%]
tests/test_url_features.py::test_expired_cache_hit_returns_410 PASSED    [ 90%]
tests/test_url_features.py::test_api_validation_is_422[payload0] PASSED  [ 91%]
tests/test_url_features.py::test_api_validation_is_422[payload1] PASSED  [ 91%]
tests/test_url_features.py::test_api_validation_is_422[payload2] PASSED  [ 92%]
tests/test_url_features.py::test_api_validation_is_422[payload3] PASSED  [ 92%]
tests/test_url_features.py::test_missing_delete_and_redirect PASSED      [ 92%]
tests/test_url_features.py::test_openapi_documents_fields_and_statuses PASSED [ 93%]
tests/test_url_features.py::test_cache_absolute_deadline_and_eviction PASSED [ 93%]
tests/test_url_features.py::test_multicast_rejected[http://224.0.0.1] PASSED [ 94%]
tests/test_url_features.py::test_multicast_rejected[http://[ff02::1]] PASSED [ 94%]
tests/test_url_features.py::test_numeric_string_expiry_rejected PASSED   [ 94%]
tests/test_url_features.py::test_no_redirect_if_expiry_passes_during_click_publication PASSED [ 95%]
tests/test_url_features.py::test_cache_not_used_when_database_fails PASSED [ 95%]
tests/test_url_features.py::test_far_expiry_cache_is_capped_at_jittered_ttl PASSED [ 96%]
tests/test_url_features.py::test_postgresql_alias_races_and_delete_lock SKIPPED [ 96%]
tests/test_url_features.py::test_alias_is_case_sensitive PASSED          [ 97%]
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

app/main.py:42
  /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/app/main.py:42: DeprecationWarning:
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

app/main.py:70
  /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/app/main.py:70: DeprecationWarning:
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
app/api/auth.py                               33      0   100%
app/api/routes.py                            112      3    97%   107-108, 172
app/cache/__init__.py                          0      0   100%
app/cache/circuit_breaker.py                  49      1    98%   57
app/cache/redis_client.py                     94     16    83%   30, 33, 36, 39, 42, 47-48, 57-59, 145-146, 153-154, 161-162
app/cache/singleflight.py                     37      1    97%   34
app/cli.py                                    66     10    85%   30-32, 80, 98, 102-106, 110
app/core/__init__.py                           0      0   100%
app/core/config.py                            38      6    84%   24, 35, 39, 51, 59, 73
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
app/main.py                                   43      8    81%   38-39, 54-55, 58, 74-76
app/middleware/rate_limiter.py                81      1    99%   89
app/models/__init__.py                         0      0   100%
app/models/analytics.py                       11      0   100%
app/models/api_key.py                         14      0   100%
app/models/url.py                             14      0   100%
app/observability/logging.py                  27      6    78%   25-26, 73-76
app/observability/metrics.py                  42      0   100%
app/observability/tracing.py                  97     45    54%   39-50, 70-71, 88-92, 117-120, 136-137, 140-141, 144-145, 151-154, 159-179
app/repositories/__init__.py                   0      0   100%
app/repositories/analytics_repository.py      23      1    96%   28
app/repositories/url_repository.py            36      0   100%
app/schemas/__init__.py                        0      0   100%
app/schemas/url_schema.py                     73      3    96%   73, 95, 122
app/services/__init__.py                       0      0   100%
app/services/analytics_service.py             13      0   100%
app/services/api_keys.py                      43      0   100%
app/services/code_generator.py                 9      0   100%
app/services/url_service.py                  148      9    94%   35-36, 63, 68, 73, 154, 162, 232-233
app/utils/__init__.py                          0      0   100%
app/utils/base62.py                            9      0   100%
app/workers/__init__.py                        0      0   100%
app/workers/analytics_worker.py              110      8    93%   159-165, 169
------------------------------------------------------------------------
TOTAL                                       1503    147    90%
Coverage XML written to file coverage.xml
================= 227 passed, 11 skipped, 5 warnings in 12.41s =================
```

## make frontend-check

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
cd frontend && npm test

> url-shortener-frontend@0.1.0 test
> node --test tests/*.test.cjs

✔ protected reads and writes send only the in-memory key (37.692ms)
✔ public health omits the key and forgetting removes it from requests (7.317584ms)
✔ a fresh client has no persisted key (9.917083ms)
ℹ tests 3
ℹ suites 0
ℹ pass 3
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 202.753416
cd frontend && ./node_modules/.bin/tsc --noEmit --incremental false
```

## make mcp-test

```text
cd mcp-server && /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m pytest
..........                                                               [100%]
10 passed in 0.64s
```

## PostgreSQL migrations

```text
============================= test session starts ==============================
platform darwin -- Python 3.11.14, pytest-9.0.3, pluggy-1.7.0
rootdir: /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener
configfile: pytest.ini
plugins: platformdirs-4.13.0, cov-7.1.0, anyio-4.15.1
collected 4 items

tests/test_migrations.py ....                                            [100%]

============================== 4 passed in 5.29s ===============================
```

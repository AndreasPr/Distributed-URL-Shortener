# Step 2.2 verification and deployment checklist

Branch: `step-2-2-security`. No cluster rollout or user data changes performed.

## Results

- Backend gate: 241 passed, 11 skipped; Black/isort/Flake8/mypy passed.
- Frontend gate: four tests passed, ESLint and TypeScript passed (exit 0).
  Initial restricted npm fetch failed; rerun with network/cache access passed.
- MCP: 10 passed. Disposable PostgreSQL migration tests: 4 passed.
- Both images built successfully: `url-shortener:security-step-2-2` and
  `url-shortener-frontend:security-step-2-2`.
- API smoke test: UID 10001, read-only filesystem, no capabilities/network,
  /livez HTTP 200, Docker health status healthy, pytest absent.
- Frontend smoke test: UID 1000, read-only filesystem with writable tmp/cache,
  no capabilities/network, HTTP 200 with CSP, nosniff and no-referrer headers.
  npm prunes declared dev dependencies; TypeScript still exists through the
  existing production dependency graph. The backend image has no dev tools.
- `make audit` completed its scan and failed on 17 reported vulnerabilities in
  5 packages (the combined locks produce some duplicate advisory rows).
  Packages: certifi, kafka-python, opentelemetry-api, starlette and mcp.
  No findings were suppressed. Coordinated framework/tracing dependency upgrades
  are still needed; this change does not claim the dependencies are secure.
- All changed manifests passed `kubectl apply --dry-run=client --validate=true`.
  No live CNI, PVC or workload rollout was performed.
- Eleven default-gate skips comprise nine opt-in Docker tests and two legacy
  OpenTelemetry tests requiring missing pkg_resources. The separate migration
  run exercised its Docker tests; other Docker tests remain unrun this step.

The review fixed a misplaced ConfigMap metadata field, excluded frontend local
secrets/artifacts from its Docker context, repaired its nonexistent public-folder
COPY, and regenerated the npm lock with Node 22.23.4/npm 10.9.9 after production
`npm ci` rejected its picomatch layout. Regression tests cover the configuration
and build-context exclusions. No existing user services or volumes were changed.

## Manifest changes requiring deployment testing

1. **Every workload:** explicit numeric non-root user/group, RuntimeDefault seccomp,
   dropped capabilities, no privilege escalation and disabled service-account
   token mounting. Existing/custom images must support these identities.
2. **Postgres/Redis:** fsGroup and read-only roots; existing hostPath/PVC ownership
   may prevent startup. PostgreSQL has a writable runtime socket volume. Back up
   data and inspect permissions before changing ownership; never delete volumes
   as a workaround. Verified image IDs: postgres 70:70, redis 999:1000.
3. **API/worker/migration/frontend/Grafana/Prometheus:** read-only root, writable
   tmp/cache/data mounts. Test startup and any runtime filesystem writes.
   Kafka/Zookeeper retain writable roots; their verified identity is 1000:1000.
4. **All containers including init containers:** requests/limits may cause
   Pending/OOMKilled/throttling on small clusters. Migration resources and its
   new 60-second SQL deadline may need adjustment for a large existing database.
5. **API configuration/probes:** production requires explicit CORS_ORIGINS;
   replace the ConfigMap example origin. Liveness/startup use /livez; readiness
   uses /health and becomes unavailable when either database or Redis fails.
6. **NetworkPolicies:** require a policy-capable CNI. Adapt ingress-nginx namespace/
   controller labels and CoreDNS labels (NodeLocal DNS needs different rules).
   API/worker can reach only Postgres, Redis, Kafka and DNS. Metrics ports accept
   only Prometheus. Extra integrations, exporters and plugin downloads are blocked.
   Remove the old `api-ingress-and-internal-metrics` policy: policies are additive.
   The deploy script applies the replacement then deletes the old policy.
7. **Prometheus:** static API/worker scraping replaces cluster-wide discovery.
   Remove old ClusterRoleBinding/ClusterRole/ServiceAccount named prometheus if
   they were created by this project (verify ownership first). Applying YAML
   alone does not delete them. Cluster metrics are no longer collected.
8. **Migration Job:** pod template changes are immutable; recreate the completed
   db-migrate Job before applying its new template. Do not interrupt a running
   migration. Application image must be rebuilt with the non-root Dockerfile.
9. **Frontend:** rebuild the image; next.config.js must be present at runtime.
   Node image is now pinned to 22.23.4-alpine and dev dependencies are pruned.
   Build-time NEXT_PUBLIC_API_URL must match the public API origin; the existing
   cluster-only frontend URL setting is not a usable public browser address.

Before exposing the stack, run `make audit`, build both images, test /livez and
/health, migrate a disposable database, and verify allowed/denied pod traffic
on your chosen CNI. Test both event profiles and confirm Prometheus targets.
Configure TLS and restrict operator access separately; neither is provisioned here.

## Captured gate output

Trailing whitespace is removed from captured output below.

### make check (exit 0)

```text
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m black --check app/
All done! ✨ 🍰 ✨
47 files would be left unchanged.
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m isort --check-only app/
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m flake8 app/
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m mypy app/
Success: no issues found in 47 source files
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m pytest --cov=app --cov-report=term-missing --cov-report=xml
============================= test session starts ==============================
platform darwin -- Python 3.11.14, pytest-9.0.3, pluggy-1.7.0 -- /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python
cachedir: .pytest_cache
rootdir: /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener
configfile: pytest.ini
testpaths: tests
plugins: platformdirs-4.13.0, cov-7.1.0, anyio-4.15.1
collecting ... collected 252 items

tests/test_analytics_repository.py::test_batch_create_clicks_uses_single_execute_call PASSED [  0%]
tests/test_analytics_repository.py::test_batch_create_clicks_returns_zero_for_empty_list PASSED [  0%]
tests/test_analytics_repository.py::test_analytics_repository_count_and_timestamps PASSED [  1%]
tests/test_analytics_service.py::test_get_analytics_uses_repository_results PASSED [  1%]
tests/test_app_assembly.py::test_middleware_and_metrics PASSED           [  1%]
tests/test_app_assembly.py::test_cors_preflight PASSED                   [  2%]
tests/test_app_assembly.py::test_rate_limiter_is_registered PASSED       [  2%]
tests/test_app_assembly.py::test_main_routes PASSED                      [  3%]
tests/test_app_assembly.py::test_service_failures_are_503[/urls-service0-list_recent_urls] PASSED [  3%]
tests/test_app_assembly.py::test_service_failures_are_503[/analytics/code-service1-get_analytics] PASSED [  3%]
tests/test_app_assembly.py::test_health_dependency_failures[db] PASSED   [  4%]
tests/test_app_assembly.py::test_health_dependency_failures[redis] PASSED [  4%]
tests/test_app_assembly.py::test_health_dependency_failures[both] PASSED [  5%]
tests/test_app_assembly.py::test_false_redis_ping_is_unhealthy PASSED    [  5%]
tests/test_app_assembly.py::test_livez_does_not_touch_dependencies PASSED [  5%]
tests/test_app_assembly.py::test_redirect_falls_back_on_redis_read_failure[ConnectionError] PASSED [  6%]
tests/test_app_assembly.py::test_redirect_falls_back_on_redis_read_failure[TimeoutError] PASSED [  6%]
tests/test_app_assembly.py::test_redis_health_read_failures[ping] PASSED [  7%]
tests/test_app_assembly.py::test_redis_health_read_failures[dbsize] PASSED [  7%]
tests/test_app_assembly.py::test_health_session_acquisition_failure PASSED [  7%]
tests/test_app_assembly.py::test_health_session_is_closed PASSED         [  8%]
tests/test_app_assembly.py::test_stopped_redis_never_makes_redirect_5xx_and_health_reports_breaker PASSED [  8%]
tests/test_app_assembly.py::test_actual_stopped_redis_keeps_redirects_available SKIPPED [  9%]
tests/test_auth.py::test_key_hashing_metadata_and_revocation PASSED      [  9%]
tests/test_auth.py::test_key_invalid_creation[-scopes0] PASSED           [  9%]
tests/test_auth.py::test_key_invalid_creation[ok-scopes1] PASSED         [ 10%]
tests/test_auth.py::test_key_invalid_creation[ok-scopes2] PASSED         [ 10%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-POST-/shorten] PASSED [ 11%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-DELETE-/urls/code] PASSED [ 11%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-GET-/urls] PASSED [ 11%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-GET-/analytics/code] PASSED [ 12%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-GET-/admin/keys] PASSED [ 12%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-DELETE-/admin/keys/1] PASSED [ 13%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-POST-/shorten] PASSED [ 13%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-DELETE-/urls/code] PASSED [ 13%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-GET-/urls] PASSED [ 14%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-GET-/analytics/code] PASSED [ 14%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-GET-/admin/keys] PASSED [ 15%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-DELETE-/admin/keys/1] PASSED [ 15%]
tests/test_auth.py::test_scope_enforcement_and_creator PASSED            [ 15%]
tests/test_auth.py::test_public_endpoints_and_openapi PASSED             [ 16%]
tests/test_auth.py::test_auth_database_failure_is_503 PASSED             [ 16%]
tests/test_auth.py::test_write_limits_and_key_isolation PASSED           [ 17%]
tests/test_auth.py::test_delete_uses_template_bucket_not_code PASSED     [ 17%]
tests/test_auth.py::test_redirects_share_ip_bucket_and_ignore_spoofed_headers PASSED [ 17%]
tests/test_auth.py::test_redis_failure_closes_writes_but_not_redirects PASSED [ 18%]
tests/test_auth.py::test_internal_metrics_not_exposed_on_api_port PASSED [ 18%]
tests/test_auth.py::test_cli_prints_key_once_and_never_lists_hash PASSED [ 19%]
tests/test_base62.py::test_encode_base62_zero_returns_empty_string PASSED [ 19%]
tests/test_base62.py::test_encode_base62_small_numbers PASSED            [ 19%]
tests/test_base62.py::test_encode_base62_larger_number PASSED            [ 20%]
tests/test_cache_strategy.py::test_circuit_open_half_open_closed_and_failed_probe PASSED [ 20%]
tests/test_cache_strategy.py::test_only_one_half_open_probe_and_stale_success_cannot_close PASSED [ 21%]
tests/test_cache_strategy.py::test_success_resets_consecutive_failures PASSED [ 21%]
tests/test_cache_strategy.py::test_client_timeout_and_retry_configuration PASSED [ 21%]
tests/test_cache_strategy.py::test_ttl_jitter_bounds_and_absolute_expiry PASSED [ 22%]
tests/test_cache_strategy.py::test_many_cold_requests_share_one_database_read[False] PASSED [ 22%]
tests/test_cache_strategy.py::test_many_cold_requests_share_one_database_read[True] PASSED [ 23%]
tests/test_cache_strategy.py::test_cross_process_lock_wait_rechecks_cache PASSED [ 23%]
tests/test_cache_strategy.py::test_negative_caching_and_alias_creation_invalidation PASSED [ 23%]
tests/test_cache_strategy.py::test_alias_creation_fences_an_inflight_negative_fill PASSED [ 24%]
tests/test_cache_strategy.py::test_lock_release_and_publication_require_owner PASSED [ 24%]
tests/test_cache_strategy.py::test_negative_cache_expiry PASSED          [ 25%]
tests/test_cache_strategy.py::test_redis_down_falls_back_and_counts_metric PASSED [ 25%]
tests/test_cache_strategy.py::test_singleflight_timeout_and_exception_cleanup PASSED [ 25%]
tests/test_cache_strategy.py::test_positive_cache_still_checks_deletion_and_database_failure PASSED [ 26%]
tests/test_cache_strategy.py::test_postgresql_stampede_executes_one_select SKIPPED [ 26%]
tests/test_code_generation.py::test_100000_candidates_are_unique_and_url_safe PASSED [ 26%]
tests/test_code_generation.py::test_production_generator_uses_secrets_choice PASSED [ 27%]
tests/test_code_generation.py::test_collision_retries_preserve_existing_destination PASSED [ 27%]
tests/test_code_generation.py::test_exhaustion_is_bounded_and_leaves_transaction_usable PASSED [ 28%]
tests/test_code_generation.py::test_non_collision_integrity_error_is_not_retried PASSED [ 28%]
tests/test_code_generation.py::test_concurrent_replicas_reserve_codes_in_postgresql SKIPPED [ 28%]
tests/test_code_generation.py::test_static_route_names_are_not_allocated PASSED [ 29%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_USER] PASSED [ 29%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_PASSWORD] PASSED [ 30%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_DB] PASSED [ 30%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[GRAFANA_ADMIN_USER] PASSED [ 30%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[GRAFANA_ADMIN_PASSWORD] PASSED [ 31%]
tests/test_deployment_config.py::test_compose_uses_same_database_credentials_for_all_clients PASSED [ 31%]
tests/test_deployment_config.py::test_profile_selects_matching_brokers[kafka] PASSED [ 32%]
tests/test_deployment_config.py::test_profile_selects_matching_brokers[redis-streams] PASSED [ 32%]
tests/test_deployment_config.py::test_kubernetes_metrics_use_internal_port_and_network_policy PASSED [ 32%]
tests/test_event_bus.py::test_duplicate_delivery_one_row_and_commit_before_ack PASSED [ 33%]
tests/test_event_bus.py::test_malformed_or_unknown_version_dlq_after_three_attempts[{broken] PASSED [ 33%]
tests/test_event_bus.py::test_malformed_or_unknown_version_dlq_after_three_attempts[{"schema_version":99,"short_code":"abc123"}] PASSED [ 34%]
tests/test_event_bus.py::test_poison_row_does_not_discard_healthy_batch_rows PASSED [ 34%]
tests/test_event_bus.py::test_database_error_never_acknowledges_or_deadletters PASSED [ 34%]
tests/test_event_bus.py::test_commit_failure_does_not_ack PASSED         [ 35%]
tests/test_event_bus.py::test_dlq_publish_failure_does_not_advance_offset PASSED [ 35%]
tests/test_event_bus.py::test_idle_timer_and_shutdown_flush[False] PASSED [ 36%]
tests/test_event_bus.py::test_idle_timer_and_shutdown_flush[True] PASSED [ 36%]
tests/test_event_bus.py::test_slow_broker_and_full_queue_do_not_block_redirects PASSED [ 36%]
tests/test_event_bus.py::test_kafka_raw_poll_and_explicit_offsets PASSED [ 37%]
tests/test_event_bus.py::test_redis_groups_recover_pending_before_new_reads PASSED [ 37%]
tests/test_event_bus.py::test_memory_groups_and_unacknowledged_recovery PASSED [ 38%]
tests/test_event_bus.py::test_dlq_list_and_replay_preserve_event_id PASSED [ 38%]
tests/test_event_bus.py::test_adapter_selection_without_connecting[memory-InMemoryEventBus] PASSED [ 38%]
tests/test_event_bus.py::test_adapter_selection_without_connecting[kafka-KafkaEventBus] PASSED [ 39%]
tests/test_event_bus.py::test_adapter_selection_without_connecting[redis_streams-RedisStreamsEventBus] PASSED [ 39%]
tests/test_event_bus.py::test_postgres_duplicate_after_ack_failure SKIPPED [ 40%]
tests/test_event_bus.py::test_real_redis_pending_recovery_and_ack SKIPPED [ 40%]
tests/test_event_bus.py::test_legacy_event_without_id_goes_to_dlq PASSED [ 40%]
tests/test_event_bus.py::test_memory_recovers_more_than_one_batch PASSED [ 41%]
tests/test_event_bus.py::test_real_kafka_delivery_commit_and_dlq SKIPPED [ 41%]
tests/test_event_bus.py::test_idle_timer_flushes_even_when_later_polls_fail PASSED [ 42%]
tests/test_hardening.py::test_body_limit_and_safe_errors PASSED          [ 42%]
tests/test_hardening.py::test_chunked_body_cannot_bypass_limit PASSED    [ 42%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[*] PASSED   [ 43%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[https://*.example.com] PASSED [ 43%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[https://user:pass@example.com] PASSED [ 44%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[https://example.com/path] PASSED [ 44%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[] PASSED    [ 44%]
tests/test_hardening.py::test_production_accepts_exact_origin PASSED     [ 45%]
tests/test_hardening.py::test_all_kubernetes_containers_have_security_and_resources PASSED [ 45%]
tests/test_hardening.py::test_network_policy_default_deny_and_exact_dependency_ports PASSED [ 46%]
tests/test_hardening.py::test_slow_request_body_returns_408 PASSED       [ 46%]
tests/test_hardening.py::test_kafka_constructor_uses_supported_bounded_timeouts PASSED [ 46%]
tests/test_hardening.py::test_cors_setting_is_configmap_data_not_object_metadata PASSED [ 47%]
tests/test_hardening.py::test_frontend_build_excludes_local_secrets_and_artifacts PASSED [ 47%]
tests/test_health_route.py::test_health_endpoint_includes_total_urls PASSED [ 48%]
tests/test_migrations.py::test_migrations_on_empty_sqlite PASSED         [ 48%]
tests/test_migrations.py::test_offline_sql_uses_postgresql_settings PASSED [ 48%]
tests/test_migrations.py::test_postgresql_upgrade_schema_constraints_and_downgrade SKIPPED [ 49%]
tests/test_migrations.py::test_legacy_schema_can_be_stamped_and_upgraded SKIPPED [ 49%]
tests/test_rate_limiter.py::test_bucket_burst_refill_and_identity_isolation PASSED [ 50%]
tests/test_rate_limiter.py::test_bucket_concurrent_burst PASSED          [ 50%]
tests/test_rate_limiter.py::test_bucket_error_and_clock_regression PASSED [ 50%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[198.51.100.5-1.2.3.4-trusted0-198.51.100.5] PASSED [ 51%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[198.51.100.5-1.2.3.4-trusted1-198.51.100.5] PASSED [ 51%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[10.0.0.1-198.51.100.5-trusted2-198.51.100.5] PASSED [ 51%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[10.0.0.1-1.2.3.4, 198.51.100.5-trusted3-198.51.100.5] PASSED [ 52%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[10.0.0.1-198.51.100.5, 10.0.0.2-trusted4-198.51.100.5] PASSED [ 52%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[::1-2001:db8::1-trusted5-2001:db8::1] PASSED [ 53%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[10.0.0.1-garbage-trusted6-10.0.0.1] PASSED [ 53%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[get-ConnectionError] PASSED [ 53%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[get-TimeoutError] PASSED [ 54%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[ping-ConnectionError] PASSED [ 54%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[ping-TimeoutError] PASSED [ 55%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[dbsize-ConnectionError] PASSED [ 55%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[dbsize-TimeoutError] PASSED [ 55%]
tests/test_redis_client.py::test_programming_errors_are_not_hidden PASSED [ 56%]
tests/test_redis_client.py::test_normal_cache_reads[https://example.com/-counter0] PASSED [ 56%]
tests/test_redis_client.py::test_normal_cache_reads[None-counter1] PASSED [ 57%]
tests/test_routes.py::test_create_short_url_returns_service_code PASSED  [ 57%]
tests/test_routes.py::test_redirect_returns_redirect_response PASSED     [ 57%]
tests/test_routes.py::test_redirect_raises_404_for_missing_code PASSED   [ 58%]
tests/test_routes.py::test_analytics_route_uses_service PASSED           [ 58%]
tests/test_routes.py::test_redis_health_success PASSED                   [ 59%]
tests/test_routes.py::test_redis_health_failure PASSED                   [ 59%]
tests/test_tooling_regressions.py::test_typed_models_preserve_column_types_and_nullability PASSED [ 59%]
tests/test_tooling_regressions.py::test_trace_logging_preserves_message_for_default_formatter PASSED [ 60%]
tests/test_tooling_regressions.py::test_worker_reports_unconfigured_database PASSED [ 60%]
tests/test_trace_privacy.py::test_url_spans_only_include_origin_and_code[False] PASSED [ 61%]
tests/test_trace_privacy.py::test_url_spans_only_include_origin_and_code[True] PASSED [ 61%]
tests/test_trace_privacy.py::test_auto_instrumented_redis_does_not_export_cached_url SKIPPED [ 61%]
tests/test_trace_privacy.py::test_auto_instrumented_http_does_not_export_path_or_query SKIPPED [ 62%]
tests/test_trace_privacy.py::test_tracing_initialization_installs_privacy_hooks PASSED [ 62%]
tests/test_trace_privacy.py::test_privacy_hooks_redact_instrumentation_attributes PASSED [ 63%]
tests/test_url_features.py::test_reject_unsafe_urls[ftp://example.com] PASSED [ 63%]
tests/test_url_features.py::test_reject_unsafe_urls[javascript:alert(1)] PASSED [ 63%]
tests/test_url_features.py::test_reject_unsafe_urls[https:///path] PASSED [ 64%]
tests/test_url_features.py::test_reject_unsafe_urls[https://] PASSED     [ 64%]
tests/test_url_features.py::test_reject_unsafe_urls[http://user:pass@example.com] PASSED [ 65%]
tests/test_url_features.py::test_reject_unsafe_urls[http://user@example.com] PASSED [ 65%]
tests/test_url_features.py::test_reject_unsafe_urls[http://@example.com] PASSED [ 65%]
tests/test_url_features.py::test_reject_unsafe_urls[http://localhost] PASSED [ 66%]
tests/test_url_features.py::test_reject_unsafe_urls[http://LOCALHOST.] PASSED [ 66%]
tests/test_url_features.py::test_reject_unsafe_urls[http://sub.localhost] PASSED [ 67%]
tests/test_url_features.py::test_reject_unsafe_urls[http://server.local] PASSED [ 67%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.0.0.1] PASSED [ 67%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.9.2.1] PASSED [ 68%]
tests/test_url_features.py::test_reject_unsafe_urls[http://10.1.2.3] PASSED [ 68%]
tests/test_url_features.py::test_reject_unsafe_urls[http://172.16.2.3] PASSED [ 69%]
tests/test_url_features.py::test_reject_unsafe_urls[http://192.168.1.1] PASSED [ 69%]
tests/test_url_features.py::test_reject_unsafe_urls[http://169.254.169.254] PASSED [ 69%]
tests/test_url_features.py::test_reject_unsafe_urls[http://0.0.0.0] PASSED [ 70%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::1]] PASSED [ 70%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::]] PASSED  [ 71%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fc00::1]] PASSED [ 71%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fd00::1]] PASSED [ 71%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fe80::1]] PASSED [ 72%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::ffff:127.0.0.1]] PASSED [ 72%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::ffff:192.168.0.1]] PASSED [ 73%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fe80::1%25eth0]] PASSED [ 73%]
tests/test_url_features.py::test_reject_unsafe_urls[http://2130706433] PASSED [ 73%]
tests/test_url_features.py::test_reject_unsafe_urls[http://0x7f000001] PASSED [ 74%]
tests/test_url_features.py::test_reject_unsafe_urls[http://0177.0.0.1] PASSED [ 74%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.1] PASSED [ 75%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.0.0.1.] PASSED [ 75%]
tests/test_url_features.py::test_reject_unsafe_urls[http://%6cocalhost] PASSED [ 75%]
tests/test_url_features.py::test_reject_unsafe_urls[http://localHOST\u3002] PASSED [ 76%]
tests/test_url_features.py::test_reject_unsafe_urls[http://example.com\\@127.0.0.1] PASSED [ 76%]
tests/test_url_features.py::test_reject_unsafe_urls[http://exam\nple.com] PASSED [ 76%]
tests/test_url_features.py::test_reject_unsafe_urls[http://bad_host.com] PASSED [ 77%]
tests/test_url_features.py::test_reject_unsafe_urls[http://-bad.example] PASSED [ 77%]
tests/test_url_features.py::test_reject_unsafe_urls[https://example.com/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx] PASSED [ 78%]
tests/test_url_features.py::test_normalize_public_hosts[https://EXAMPLE.COM./a?b=1-example.com] PASSED [ 78%]
tests/test_url_features.py::test_normalize_public_hosts[http://b\xfccher.de/a-xn--bcher-kva.de] PASSED [ 78%]
tests/test_url_features.py::test_normalize_public_hosts[https://8.8.8.8/a-8.8.8.8] PASSED [ 79%]
tests/test_url_features.py::test_normalize_public_hosts[http://[2606:4700:4700::1111]/-[2606:4700:4700::1111]] PASSED [ 79%]
tests/test_url_features.py::test_normalize_public_hosts[https://localhost.example.com/-localhost.example.com] PASSED [ 80%]
tests/test_url_features.py::test_maximum_url_length PASSED               [ 80%]
tests/test_url_features.py::test_invalid_alias[ab] PASSED                [ 80%]
tests/test_url_features.py::test_invalid_alias[aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa] PASSED [ 81%]
tests/test_url_features.py::test_invalid_alias[] PASSED                  [ 81%]
tests/test_url_features.py::test_invalid_alias[a/b] PASSED               [ 82%]
tests/test_url_features.py::test_invalid_alias[a.b] PASSED               [ 82%]
tests/test_url_features.py::test_invalid_alias[a b] PASSED               [ 82%]
tests/test_url_features.py::test_invalid_alias[\xe9\xe9\xe9] PASSED      [ 83%]
tests/test_url_features.py::test_invalid_alias[api] PASSED               [ 83%]
tests/test_url_features.py::test_invalid_alias[Health] PASSED            [ 84%]
tests/test_url_features.py::test_invalid_alias[METRICS] PASSED           [ 84%]
tests/test_url_features.py::test_invalid_alias[docs] PASSED              [ 84%]
tests/test_url_features.py::test_invalid_alias[admin] PASSED             [ 85%]
tests/test_url_features.py::test_invalid_alias[shorten] PASSED           [ 85%]
tests/test_url_features.py::test_invalid_alias[livez] PASSED             [ 86%]
tests/test_url_features.py::test_invalid_alias[urls] PASSED              [ 86%]
tests/test_url_features.py::test_invalid_alias[analytics] PASSED         [ 86%]
tests/test_url_features.py::test_invalid_alias[redoc] PASSED             [ 87%]
tests/test_url_features.py::test_valid_alias[abc] PASSED                 [ 87%]
tests/test_url_features.py::test_valid_alias[A_9-x] PASSED               [ 88%]
tests/test_url_features.py::test_valid_alias[aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa] PASSED [ 88%]
tests/test_url_features.py::test_invalid_expiry[2020-01-01T00:00:00Z] PASSED [ 88%]
tests/test_url_features.py::test_invalid_expiry[2099-01-01T00:00:00] PASSED [ 89%]
tests/test_url_features.py::test_invalid_expiry[nonsense] PASSED         [ 89%]
tests/test_url_features.py::test_invalid_expiry[9999999999] PASSED       [ 90%]
tests/test_url_features.py::test_expiry_normalized_to_utc PASSED         [ 90%]
tests/test_url_features.py::test_alias_create_conflict_delete_and_list PASSED [ 90%]
tests/test_url_features.py::test_expired_cache_hit_returns_410 PASSED    [ 91%]
tests/test_url_features.py::test_api_validation_is_422[payload0] PASSED  [ 91%]
tests/test_url_features.py::test_api_validation_is_422[payload1] PASSED  [ 92%]
tests/test_url_features.py::test_api_validation_is_422[payload2] PASSED  [ 92%]
tests/test_url_features.py::test_api_validation_is_422[payload3] PASSED  [ 92%]
tests/test_url_features.py::test_missing_delete_and_redirect PASSED      [ 93%]
tests/test_url_features.py::test_openapi_documents_fields_and_statuses PASSED [ 93%]
tests/test_url_features.py::test_cache_absolute_deadline_and_eviction PASSED [ 94%]
tests/test_url_features.py::test_multicast_rejected[http://224.0.0.1] PASSED [ 94%]
tests/test_url_features.py::test_multicast_rejected[http://[ff02::1]] PASSED [ 94%]
tests/test_url_features.py::test_numeric_string_expiry_rejected PASSED   [ 95%]
tests/test_url_features.py::test_no_redirect_if_expiry_passes_during_click_publication PASSED [ 95%]
tests/test_url_features.py::test_cache_not_used_when_database_fails PASSED [ 96%]
tests/test_url_features.py::test_far_expiry_cache_is_capped_at_jittered_ttl PASSED [ 96%]
tests/test_url_features.py::test_postgresql_alias_races_and_delete_lock SKIPPED [ 96%]
tests/test_url_features.py::test_alias_is_case_sensitive PASSED          [ 97%]
tests/test_url_features.py::test_expiry_equal_to_now_is_rejected PASSED  [ 97%]
tests/test_url_features.py::test_subsecond_remaining_lifetime_does_not_populate_cache PASSED [ 98%]
tests/test_url_repository.py::test_url_repository_create_with_code_and_lookup PASSED [ 98%]
tests/test_url_service.py::test_shorten_creates_code_and_commits PASSED  [ 98%]
tests/test_url_service.py::test_resolve_returns_cached_value_and_records_click PASSED [ 99%]
tests/test_url_service.py::test_resolve_caches_database_value_on_miss PASSED [ 99%]
tests/test_url_service.py::test_resolve_returns_none_when_code_missing PASSED [100%]

=============================== warnings summary ===============================
.venv/lib/python3.11/site-packages/starlette/testclient.py:45
  /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/lib/python3.11/site-packages/starlette/testclient.py:45: DeprecationWarning: The anyio.abc.BlockingPortal alias is deprecated, use anyio.from_thread.BlockingPortal instead.
    _PortalFactoryType = Callable[[], AbstractContextManager[anyio.abc.BlockingPortal]]

app/main.py:50
  /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/app/main.py:50: DeprecationWarning:
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

app/main.py:78
  /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/app/main.py:78: DeprecationWarning:
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
app/api/routes.py                            113      3    97%   107-108, 173
app/cache/__init__.py                          0      0   100%
app/cache/circuit_breaker.py                  49      1    98%   57
app/cache/redis_client.py                     94     16    83%   30, 33, 36, 39, 42, 47-48, 57-59, 145-146, 153-154, 161-162
app/cache/singleflight.py                     37      1    97%   34
app/cli.py                                    66     10    85%   30-32, 80, 98, 102-106, 110
app/core/__init__.py                           0      0   100%
app/core/config.py                            49      9    82%   11, 29, 40, 44, 56, 64, 89, 91, 94
app/db/__init__.py                             0      0   100%
app/db/database.py                            17      6    65%   33-39
app/events/__init__.py                        13      1    92%   18
app/events/base.py                            11      0   100%
app/events/kafka.py                           42     10    76%   17-20, 27, 39, 50-53, 64
app/events/memory.py                          46      0   100%
app/events/models.py                          26      0   100%
app/events/publisher.py                       72      5    93%   49, 57-58, 93-94
app/events/redis_streams.py                   45      6    87%   84, 118-119, 125-127
app/kafka/__init__.py                          0      0   100%
app/kafka/consumer.py                          4      0   100%
app/kafka/producer.py                          7      1    86%   9
app/main.py                                   46      8    83%   46-47, 62-63, 66, 82-84
app/middleware/hardening.py                   47      2    96%   30, 50
app/middleware/rate_limiter.py                81      1    99%   89
app/models/__init__.py                         0      0   100%
app/models/analytics.py                       11      0   100%
app/models/api_key.py                         14      0   100%
app/models/url.py                             14      0   100%
app/observability/logging.py                  27      6    78%   25-26, 73-76
app/observability/metrics.py                  42      0   100%
app/observability/tracing.py                  97     45    54%   39-50, 70-71, 88-92, 120-123, 139-140, 143-144, 147-148, 154-157, 162-182
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
TOTAL                                       1567    152    90%
Coverage XML written to file coverage.xml
================= 241 passed, 11 skipped, 5 warnings in 15.00s =================

```

### make frontend-check (exit 0)

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

added 782 packages in 6s
cd frontend && npm run lint -- --max-warnings=0

> url-shortener-frontend@0.1.0 lint
> next lint --max-warnings=0

✔ No ESLint warnings or errors
cd frontend && npm test

> url-shortener-frontend@0.1.0 test
> node --test tests/*.test.cjs

✔ protected reads and writes send only the in-memory key (41.193333ms)
✔ public health omits the key and forgetting removes it from requests (13.881792ms)
✔ a fresh client has no persisted key (11.356959ms)
✔ production security headers cover every route without eval or wildcard origins (1.685167ms)
ℹ tests 4
ℹ suites 0
ℹ pass 4
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 217.862375
cd frontend && ./node_modules/.bin/tsc --noEmit --incremental false

```

### make mcp-test (exit 0)

```text
cd mcp-server && /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m pytest
..........                                                               [100%]
10 passed in 0.65s

```

### RUN_DOCKER_TESTS=1 pytest tests/test_migrations.py (exit 0)

```text
============================= test session starts ==============================
platform darwin -- Python 3.11.14, pytest-9.0.3, pluggy-1.7.0
rootdir: /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener
configfile: pytest.ini
plugins: platformdirs-4.13.0, cov-7.1.0, anyio-4.15.1
collected 4 items

tests/test_migrations.py ....                                            [100%]

============================== 4 passed in 7.31s ===============================

```

### make audit (exit 2; scanner reports vulnerabilities)

```text
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m pip_audit --disable-pip --no-deps -r requirements.txt -r mcp-server/requirements.txt
WARNING:pip_audit._cli:--no-deps is supported, but users are encouraged to fully hash their pinned dependencies
WARNING:pip_audit._cli:Consider using a tool like `pip-compile`: https://pip-tools.readthedocs.io/en/latest/#using-hashes
Found 17 known vulnerabilities in 5 packages
Name              Version   ID              Fix Versions
----------------- --------- --------------- ------------
certifi           2026.7.22 PYSEC-2026-4320 2026.10.19
kafka-python      2.3.1     PYSEC-2026-2190 2.3.2
kafka-python      2.3.1     PYSEC-2026-2191 2.3.2
kafka-python      2.3.1     PYSEC-2026-2190 2.3.2
kafka-python      2.3.1     PYSEC-2026-2191 2.3.2
opentelemetry-api 1.20.0    CVE-2026-114603 1.45.1
starlette         0.52.1    PYSEC-2026-161  1.0.1
starlette         0.52.1    PYSEC-2026-161  1.0.1
starlette         0.52.1    PYSEC-2026-2281 1.1.0
starlette         0.52.1    PYSEC-2026-2280 1.1.0
starlette         0.52.1    PYSEC-2026-249  1.3.1
starlette         0.52.1    PYSEC-2026-248  1.3.0
starlette         0.52.1    PYSEC-2026-249  1.3.1
starlette         0.52.1    PYSEC-2026-248  1.3.0
starlette         0.52.1    PYSEC-2026-2281 1.1.0
starlette         0.52.1    PYSEC-2026-2280 1.1.0
mcp               1.28.1    CVE-2026-59951  1.30.0,2.2.0
make: *** [audit] Error 1

```

### Kubernetes client dry run with validation (exit 0)

```text
configmap/url-shortener-config configured (dry run)
job.batch/db-migrate created (dry run)
networkpolicy.networking.k8s.io/default-deny created (dry run)
networkpolicy.networking.k8s.io/allow-dns created (dry run)
networkpolicy.networking.k8s.io/api-http created (dry run)
networkpolicy.networking.k8s.io/frontend-http created (dry run)
networkpolicy.networking.k8s.io/grafana-http created (dry run)
networkpolicy.networking.k8s.io/prometheus-http created (dry run)
networkpolicy.networking.k8s.io/api-dependencies created (dry run)
networkpolicy.networking.k8s.io/worker-dependencies created (dry run)
networkpolicy.networking.k8s.io/db-migrate-dependencies created (dry run)
networkpolicy.networking.k8s.io/postgres-clients created (dry run)
networkpolicy.networking.k8s.io/redis-clients created (dry run)
networkpolicy.networking.k8s.io/kafka-clients created (dry run)
networkpolicy.networking.k8s.io/zookeeper-clients created (dry run)
networkpolicy.networking.k8s.io/kafka-cluster created (dry run)
networkpolicy.networking.k8s.io/zookeeper-peers created (dry run)
networkpolicy.networking.k8s.io/frontend-api created (dry run)
networkpolicy.networking.k8s.io/grafana-prometheus created (dry run)
networkpolicy.networking.k8s.io/prometheus-scrapes created (dry run)
networkpolicy.networking.k8s.io/api-metrics created (dry run)
networkpolicy.networking.k8s.io/worker-metrics created (dry run)
service/api configured (dry run)
deployment.apps/api configured (dry run)
service/api-metrics created (dry run)
deployment.apps/worker configured (dry run)
service/worker created (dry run)
service/postgres configured (dry run)
statefulset.apps/postgres configured (dry run)
service/redis configured (dry run)
statefulset.apps/redis configured (dry run)
service/kafka configured (dry run)
statefulset.apps/kafka configured (dry run)
service/zookeeper configured (dry run)
statefulset.apps/zookeeper configured (dry run)
deployment.apps/frontend created (dry run)
service/frontend created (dry run)
configmap/grafana-datasources configured (dry run)
configmap/grafana-dashboards configured (dry run)
configmap/grafana-dashboard-json configured (dry run)
service/grafana configured (dry run)
deployment.apps/grafana configured (dry run)
configmap/prometheus-config configured (dry run)
service/prometheus configured (dry run)
deployment.apps/prometheus configured (dry run)

```

### Gitleaks staged scan with redaction (exit 0)

```text
9:29PM INF 0 commits scanned.
9:29PM INF scanned ~108154 bytes (108.15 KB) in 130ms
9:29PM INF no leaks found

```

### Runtime smoke tests (exit 0)

```text
Backend: uid: 10001
livez: 200
pytest installed: False
Docker health: healthy
Frontend: uid: 1000
status: 200
content-security-policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' http://localhost:8000; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
x-content-type-options: nosniff
referrer-policy: no-referrer
eslint: absent
typescript: installed
```

Both disposable smoke-test containers were stopped and automatically removed.
The frontend's retained TypeScript is a transitive production dependency, not
evidence that npm prune was skipped. Neither image test exercises a live cluster.

# Step 3.2 SLO verification

Branch: `step-3-2-slo`.

## Results

- `make check`: exit 0; Black, isort, Flake8, mypy and backend tests pass;
  **259 passed, 9 skipped**, 93% coverage. The gate also validates **22 Prometheus
  rules** and passes **14 synthetic time-series scenarios**.
- `make mcp-test`: exit 0, **10 passed**.
- Real Redis pending/recovery integration test: **1 passed, 22 deselected**;
  validates XINFO GROUPS unread lag against the pinned Redis image.
- Kubernetes client validation: exit 0 for the changed monitoring/API/worker
  manifests. This is not a rollout or proof of DNS/PVC behavior in a live cluster.
- Disposable Prometheus loaded all 22 mounted recording/alert rules. Disposable
  Grafana automatically provisioned the dashboard, including five new SLO/
  operational panels. Containers were removed; existing services/volumes and
  credentials were untouched. The final missing-telemetry expression adjustment
  was subsequently covered by the promtool gate; the runtime smoke test confirms
  provisioning/loading rather than live incident notification delivery.
- No frontend changes; its gate was not rerun. Nine Docker tests are skipped in
  the default backend gate; the separate Redis test exercised one of those.
- An initial gate run hit sandbox denial accessing Docker; the authorized rerun
  passed. No checks are silently skipped when promtool/Docker is unavailable.

## What changed and what remains unmeasured

Measured redirect availability has recording rules, paired-window burn alerts and
an error-budget dashboard. Latency targets (95% hit redirects under 100ms; 95%
miss redirects under 500ms) and freshness (99% of clicks visible within 60s) are
explicit objectives, not achieved/measured claims. Existing metrics do not have
the necessary latency cohorts or complete event-loss denominator. The dashboard
and docs explicitly expose that gap.

Tests cover healthy traffic, sustained fast/slow burn, independent slow burn,
short spikes, recovery, zero traffic, missing series, counter resets, operational
alerts, Redis replica aggregation, and telemetry outage/recovery/deduplication.
Python tests verify real request-metric labels, Kafka retained offsets, Redis lag,
DLQ gauge updates, headless Services, and canonical/ConfigMap parity.

## Rollout checks before deploying

1. Apply the generated rules ConfigMap before the Prometheus Deployment and
   restart/reload Prometheus after configuration/rule changes.
2. Existing `api-metrics` and `worker` Services must be recreated to change their
   immutable clusterIP to headless. Public `api` Service is unchanged. Verify DNS
   discovers every replica, including unready pods, and Targets show separate IPs.
3. Bind the new 5Gi Prometheus PVC with a suitable default/explicit storage class
   and UID 65534 access. Recreate strategy causes monitoring downtime on updates.
4. Compose now uses `prometheus_data` and both modes retain 35 days. Previous
   ephemeral history is not migrated. Storage must be sized/monitored; new or
   incomplete history cannot certify a 30-day objective.
5. Grafana preserves existing datasource UIDs; panels use the default Prometheus
   datasource. File provisioning uses raw dashboard JSON. See the follow-up below.
6. No Alertmanager or notification receiver is configured. Inspect Prometheus
   Alerts; synthetic tests prove rule behavior, not pager delivery.
7. Redis group lag can be unknown; stale/missing/NaN telemetry alerts prevent false
   health claims. Kafka retained DLQ size is an offset upper bound; replay does
   not remove records. Do not interpret retained size as unresolved incidents.

See [SLO definitions](slo.md), [per-alert runbook](runbook.md), and
[ADR 0010](adr/0010-slo-recording-and-alerts.md).

## Actual output

### make check (exit 0)

```text
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m black --check app/
All done! ✨ 🍰 ✨
49 files would be left unchanged.
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m isort --check-only app/
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m flake8 app/
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m mypy app/
Success: no issues found in 49 source files
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m pytest --cov=app --cov-report=term-missing --cov-report=xml
============================= test session starts ==============================
platform darwin -- Python 3.11.14, pytest-9.0.3, pluggy-1.7.0 -- /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python
cachedir: .pytest_cache
rootdir: /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener
configfile: pytest.ini
testpaths: tests
plugins: platformdirs-4.13.0, cov-7.1.0, anyio-4.15.1
collecting ... collected 268 items

tests/test_analytics_repository.py::test_batch_create_clicks_uses_single_execute_call PASSED [  0%]
tests/test_analytics_repository.py::test_batch_create_clicks_returns_zero_for_empty_list PASSED [  0%]
tests/test_analytics_repository.py::test_analytics_repository_count_and_timestamps PASSED [  1%]
tests/test_analytics_service.py::test_get_analytics_uses_repository_results PASSED [  1%]
tests/test_app_assembly.py::test_middleware_and_metrics PASSED           [  1%]
tests/test_app_assembly.py::test_cors_preflight PASSED                   [  2%]
tests/test_app_assembly.py::test_rate_limiter_is_registered PASSED       [  2%]
tests/test_app_assembly.py::test_main_routes PASSED                      [  2%]
tests/test_app_assembly.py::test_service_failures_are_503[/urls-service0-list_recent_urls] PASSED [  3%]
tests/test_app_assembly.py::test_service_failures_are_503[/analytics/code-service1-get_analytics] PASSED [  3%]
tests/test_app_assembly.py::test_health_dependency_failures[db] PASSED   [  4%]
tests/test_app_assembly.py::test_health_dependency_failures[redis] PASSED [  4%]
tests/test_app_assembly.py::test_health_dependency_failures[both] PASSED [  4%]
tests/test_app_assembly.py::test_false_redis_ping_is_unhealthy PASSED    [  5%]
tests/test_app_assembly.py::test_livez_does_not_touch_dependencies PASSED [  5%]
tests/test_app_assembly.py::test_redirect_falls_back_on_redis_read_failure[ConnectionError] PASSED [  5%]
tests/test_app_assembly.py::test_redirect_falls_back_on_redis_read_failure[TimeoutError] PASSED [  6%]
tests/test_app_assembly.py::test_redis_health_read_failures[ping] PASSED [  6%]
tests/test_app_assembly.py::test_redis_health_read_failures[dbsize] PASSED [  7%]
tests/test_app_assembly.py::test_health_session_acquisition_failure PASSED [  7%]
tests/test_app_assembly.py::test_health_session_is_closed PASSED         [  7%]
tests/test_app_assembly.py::test_stopped_redis_never_makes_redirect_5xx_and_health_reports_breaker PASSED [  8%]
tests/test_app_assembly.py::test_actual_stopped_redis_keeps_redirects_available SKIPPED [  8%]
tests/test_auth.py::test_key_hashing_metadata_and_revocation PASSED      [  8%]
tests/test_auth.py::test_key_invalid_creation[-scopes0] PASSED           [  9%]
tests/test_auth.py::test_key_invalid_creation[ok-scopes1] PASSED         [  9%]
tests/test_auth.py::test_key_invalid_creation[ok-scopes2] PASSED         [ 10%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-POST-/shorten] PASSED [ 10%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-DELETE-/urls/code] PASSED [ 10%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-GET-/urls] PASSED [ 11%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-GET-/analytics/code] PASSED [ 11%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-GET-/admin/keys] PASSED [ 11%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-DELETE-/admin/keys/1] PASSED [ 12%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-POST-/shorten] PASSED [ 12%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-DELETE-/urls/code] PASSED [ 13%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-GET-/urls] PASSED [ 13%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-GET-/analytics/code] PASSED [ 13%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-GET-/admin/keys] PASSED [ 14%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-DELETE-/admin/keys/1] PASSED [ 14%]
tests/test_auth.py::test_scope_enforcement_and_creator PASSED            [ 14%]
tests/test_auth.py::test_public_endpoints_and_openapi PASSED             [ 15%]
tests/test_auth.py::test_auth_database_failure_is_503 PASSED             [ 15%]
tests/test_auth.py::test_write_limits_and_key_isolation PASSED           [ 16%]
tests/test_auth.py::test_delete_uses_template_bucket_not_code PASSED     [ 16%]
tests/test_auth.py::test_redirects_share_ip_bucket_and_ignore_spoofed_headers PASSED [ 16%]
tests/test_auth.py::test_redis_failure_closes_writes_but_not_redirects PASSED [ 17%]
tests/test_auth.py::test_internal_metrics_not_exposed_on_api_port PASSED [ 17%]
tests/test_auth.py::test_cli_prints_key_once_and_never_lists_hash PASSED [ 17%]
tests/test_base62.py::test_encode_base62_zero_returns_empty_string PASSED [ 18%]
tests/test_base62.py::test_encode_base62_small_numbers PASSED            [ 18%]
tests/test_base62.py::test_encode_base62_larger_number PASSED            [ 19%]
tests/test_cache_strategy.py::test_circuit_open_half_open_closed_and_failed_probe PASSED [ 19%]
tests/test_cache_strategy.py::test_only_one_half_open_probe_and_stale_success_cannot_close PASSED [ 19%]
tests/test_cache_strategy.py::test_success_resets_consecutive_failures PASSED [ 20%]
tests/test_cache_strategy.py::test_client_timeout_and_retry_configuration PASSED [ 20%]
tests/test_cache_strategy.py::test_ttl_jitter_bounds_and_absolute_expiry PASSED [ 20%]
tests/test_cache_strategy.py::test_many_cold_requests_share_one_database_read[False] PASSED [ 21%]
tests/test_cache_strategy.py::test_many_cold_requests_share_one_database_read[True] PASSED [ 21%]
tests/test_cache_strategy.py::test_cross_process_lock_wait_rechecks_cache PASSED [ 22%]
tests/test_cache_strategy.py::test_negative_caching_and_alias_creation_invalidation PASSED [ 22%]
tests/test_cache_strategy.py::test_alias_creation_fences_an_inflight_negative_fill PASSED [ 22%]
tests/test_cache_strategy.py::test_lock_release_and_publication_require_owner PASSED [ 23%]
tests/test_cache_strategy.py::test_negative_cache_expiry PASSED          [ 23%]
tests/test_cache_strategy.py::test_redis_down_falls_back_and_counts_metric PASSED [ 23%]
tests/test_cache_strategy.py::test_singleflight_timeout_and_exception_cleanup PASSED [ 24%]
tests/test_cache_strategy.py::test_positive_cache_still_checks_deletion_and_database_failure PASSED [ 24%]
tests/test_cache_strategy.py::test_postgresql_stampede_executes_one_select SKIPPED [ 25%]
tests/test_code_generation.py::test_100000_candidates_are_unique_and_url_safe PASSED [ 25%]
tests/test_code_generation.py::test_production_generator_uses_secrets_choice PASSED [ 25%]
tests/test_code_generation.py::test_collision_retries_preserve_existing_destination PASSED [ 26%]
tests/test_code_generation.py::test_exhaustion_is_bounded_and_leaves_transaction_usable PASSED [ 26%]
tests/test_code_generation.py::test_non_collision_integrity_error_is_not_retried PASSED [ 26%]
tests/test_code_generation.py::test_concurrent_replicas_reserve_codes_in_postgresql SKIPPED [ 27%]
tests/test_code_generation.py::test_static_route_names_are_not_allocated PASSED [ 27%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_USER] PASSED [ 27%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_PASSWORD] PASSED [ 28%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_DB] PASSED [ 28%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[GRAFANA_ADMIN_USER] PASSED [ 29%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[GRAFANA_ADMIN_PASSWORD] PASSED [ 29%]
tests/test_deployment_config.py::test_compose_uses_same_database_credentials_for_all_clients PASSED [ 29%]
tests/test_deployment_config.py::test_profile_selects_matching_brokers[kafka] PASSED [ 30%]
tests/test_deployment_config.py::test_profile_selects_matching_brokers[redis-streams] PASSED [ 30%]
tests/test_deployment_config.py::test_kubernetes_metrics_use_internal_port_and_network_policy PASSED [ 30%]
tests/test_event_bus.py::test_duplicate_delivery_one_row_and_commit_before_ack PASSED [ 31%]
tests/test_event_bus.py::test_malformed_or_unknown_version_dlq_after_three_attempts[{broken] PASSED [ 31%]
tests/test_event_bus.py::test_malformed_or_unknown_version_dlq_after_three_attempts[{"schema_version":99,"short_code":"abc123"}] PASSED [ 32%]
tests/test_event_bus.py::test_poison_row_does_not_discard_healthy_batch_rows PASSED [ 32%]
tests/test_event_bus.py::test_database_error_never_acknowledges_or_deadletters PASSED [ 32%]
tests/test_event_bus.py::test_commit_failure_does_not_ack PASSED         [ 33%]
tests/test_event_bus.py::test_dlq_publish_failure_does_not_advance_offset PASSED [ 33%]
tests/test_event_bus.py::test_idle_timer_and_shutdown_flush[False] PASSED [ 33%]
tests/test_event_bus.py::test_idle_timer_and_shutdown_flush[True] PASSED [ 34%]
tests/test_event_bus.py::test_slow_broker_and_full_queue_do_not_block_redirects PASSED [ 34%]
tests/test_event_bus.py::test_kafka_raw_poll_and_explicit_offsets PASSED [ 35%]
tests/test_event_bus.py::test_redis_groups_recover_pending_before_new_reads PASSED [ 35%]
tests/test_event_bus.py::test_memory_groups_and_unacknowledged_recovery PASSED [ 35%]
tests/test_event_bus.py::test_dlq_list_and_replay_preserve_event_id PASSED [ 36%]
tests/test_event_bus.py::test_adapter_selection_without_connecting[memory-InMemoryEventBus] PASSED [ 36%]
tests/test_event_bus.py::test_adapter_selection_without_connecting[kafka-KafkaEventBus] PASSED [ 36%]
tests/test_event_bus.py::test_adapter_selection_without_connecting[redis_streams-RedisStreamsEventBus] PASSED [ 37%]
tests/test_event_bus.py::test_postgres_duplicate_after_ack_failure SKIPPED [ 37%]
tests/test_event_bus.py::test_real_redis_pending_recovery_and_ack SKIPPED [ 38%]
tests/test_event_bus.py::test_legacy_event_without_id_goes_to_dlq PASSED [ 38%]
tests/test_event_bus.py::test_memory_recovers_more_than_one_batch PASSED [ 38%]
tests/test_event_bus.py::test_real_kafka_delivery_commit_and_dlq SKIPPED [ 39%]
tests/test_event_bus.py::test_idle_timer_flushes_even_when_later_polls_fail PASSED [ 39%]
tests/test_hardening.py::test_body_limit_and_safe_errors PASSED          [ 39%]
tests/test_hardening.py::test_chunked_body_cannot_bypass_limit PASSED    [ 40%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[*] PASSED   [ 40%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[https://*.example.com] PASSED [ 41%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[https://user:pass@example.com] PASSED [ 41%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[https://example.com/path] PASSED [ 41%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[] PASSED    [ 42%]
tests/test_hardening.py::test_production_accepts_exact_origin PASSED     [ 42%]
tests/test_hardening.py::test_all_kubernetes_containers_have_security_and_resources PASSED [ 42%]
tests/test_hardening.py::test_network_policy_default_deny_and_exact_dependency_ports PASSED [ 43%]
tests/test_hardening.py::test_slow_request_body_returns_408 PASSED       [ 43%]
tests/test_hardening.py::test_kafka_constructor_uses_supported_bounded_timeouts PASSED [ 44%]
tests/test_hardening.py::test_cors_setting_is_configmap_data_not_object_metadata PASSED [ 44%]
tests/test_hardening.py::test_frontend_build_excludes_local_secrets_and_artifacts PASSED [ 44%]
tests/test_health_route.py::test_health_endpoint_includes_total_urls PASSED [ 45%]
tests/test_migrations.py::test_migrations_on_empty_sqlite PASSED         [ 45%]
tests/test_migrations.py::test_offline_sql_uses_postgresql_settings PASSED [ 45%]
tests/test_migrations.py::test_postgresql_upgrade_schema_constraints_and_downgrade SKIPPED [ 46%]
tests/test_migrations.py::test_legacy_schema_can_be_stamped_and_upgraded SKIPPED [ 46%]
tests/test_observability.py::test_w3c_event_roundtrip_and_invalid_context_isolation PASSED [ 47%]
tests/test_observability.py::test_json_log_has_active_trace_and_no_secrets[api] PASSED [ 47%]
tests/test_observability.py::test_json_log_has_active_trace_and_no_secrets[worker] PASSED [ 47%]
tests/test_observability.py::test_json_log_has_active_trace_and_no_secrets[abuse-worker] PASSED [ 48%]
tests/test_observability.py::test_privacy_export_boundary_for_every_process[api] PASSED [ 48%]
tests/test_observability.py::test_privacy_export_boundary_for_every_process[worker] PASSED [ 48%]
tests/test_observability.py::test_privacy_export_boundary_for_every_process[abuse-worker] PASSED [ 49%]
tests/test_observability.py::test_redirect_publish_consume_sql_share_one_trace PASSED [ 49%]
tests/test_observability.py::test_init_instruments_existing_engine_and_uses_configured_otlp PASSED [ 50%]
tests/test_rate_limiter.py::test_bucket_burst_refill_and_identity_isolation PASSED [ 50%]
tests/test_rate_limiter.py::test_bucket_concurrent_burst PASSED          [ 50%]
tests/test_rate_limiter.py::test_bucket_error_and_clock_regression PASSED [ 51%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[198.51.100.5-1.2.3.4-trusted0-198.51.100.5] PASSED [ 51%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[198.51.100.5-1.2.3.4-trusted1-198.51.100.5] PASSED [ 51%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[10.0.0.1-198.51.100.5-trusted2-198.51.100.5] PASSED [ 52%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[10.0.0.1-1.2.3.4, 198.51.100.5-trusted3-198.51.100.5] PASSED [ 52%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[10.0.0.1-198.51.100.5, 10.0.0.2-trusted4-198.51.100.5] PASSED [ 52%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[::1-2001:db8::1-trusted5-2001:db8::1] PASSED [ 53%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[10.0.0.1-garbage-trusted6-10.0.0.1] PASSED [ 53%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[get-ConnectionError] PASSED [ 54%]
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
tests/test_routes.py::test_redis_health_success PASSED                   [ 58%]
tests/test_routes.py::test_redis_health_failure PASSED                   [ 59%]
tests/test_slo.py::test_redis_lag_excludes_acknowledged_history_and_reports_retained_dlq PASSED [ 59%]
tests/test_slo.py::test_unknown_redis_lag_does_not_look_healthy PASSED   [ 60%]
tests/test_slo.py::test_kafka_retained_dlq_size_accounts_for_retention PASSED [ 60%]
tests/test_slo.py::test_worker_exports_current_dlq_size PASSED           [ 60%]
tests/test_slo.py::test_provisioned_configmaps_match_canonical_sources PASSED [ 61%]
tests/test_slo.py::test_redirect_slo_selector_captures_5xx_and_excludes_health PASSED [ 61%]
tests/test_slo.py::test_new_kafka_group_lag_starts_at_retained_offset PASSED [ 61%]
tests/test_slo.py::test_headless_metrics_services_include_unready_replicas PASSED [ 62%]
tests/test_tooling_regressions.py::test_typed_models_preserve_column_types_and_nullability PASSED [ 62%]
tests/test_tooling_regressions.py::test_trace_logging_preserves_message_for_default_formatter PASSED [ 63%]
tests/test_tooling_regressions.py::test_worker_reports_unconfigured_database PASSED [ 63%]
tests/test_trace_privacy.py::test_url_spans_only_include_origin_and_code[False] PASSED [ 63%]
tests/test_trace_privacy.py::test_url_spans_only_include_origin_and_code[True] PASSED [ 64%]
tests/test_trace_privacy.py::test_auto_instrumented_redis_does_not_export_cached_url PASSED [ 64%]
tests/test_trace_privacy.py::test_auto_instrumented_http_does_not_export_path_or_query PASSED [ 64%]
tests/test_trace_privacy.py::test_privacy_hooks_redact_instrumentation_attributes PASSED [ 65%]
tests/test_url_features.py::test_reject_unsafe_urls[ftp://example.com] PASSED [ 65%]
tests/test_url_features.py::test_reject_unsafe_urls[javascript:alert(1)] PASSED [ 66%]
tests/test_url_features.py::test_reject_unsafe_urls[https:///path] PASSED [ 66%]
tests/test_url_features.py::test_reject_unsafe_urls[https://] PASSED     [ 66%]
tests/test_url_features.py::test_reject_unsafe_urls[http://user:pass@example.com] PASSED [ 67%]
tests/test_url_features.py::test_reject_unsafe_urls[http://user@example.com] PASSED [ 67%]
tests/test_url_features.py::test_reject_unsafe_urls[http://@example.com] PASSED [ 67%]
tests/test_url_features.py::test_reject_unsafe_urls[http://localhost] PASSED [ 68%]
tests/test_url_features.py::test_reject_unsafe_urls[http://LOCALHOST.] PASSED [ 68%]
tests/test_url_features.py::test_reject_unsafe_urls[http://sub.localhost] PASSED [ 69%]
tests/test_url_features.py::test_reject_unsafe_urls[http://server.local] PASSED [ 69%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.0.0.1] PASSED [ 69%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.9.2.1] PASSED [ 70%]
tests/test_url_features.py::test_reject_unsafe_urls[http://10.1.2.3] PASSED [ 70%]
tests/test_url_features.py::test_reject_unsafe_urls[http://172.16.2.3] PASSED [ 70%]
tests/test_url_features.py::test_reject_unsafe_urls[http://192.168.1.1] PASSED [ 71%]
tests/test_url_features.py::test_reject_unsafe_urls[http://169.254.169.254] PASSED [ 71%]
tests/test_url_features.py::test_reject_unsafe_urls[http://0.0.0.0] PASSED [ 72%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::1]] PASSED [ 72%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::]] PASSED  [ 72%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fc00::1]] PASSED [ 73%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fd00::1]] PASSED [ 73%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fe80::1]] PASSED [ 73%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::ffff:127.0.0.1]] PASSED [ 74%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::ffff:192.168.0.1]] PASSED [ 74%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fe80::1%25eth0]] PASSED [ 75%]
tests/test_url_features.py::test_reject_unsafe_urls[http://2130706433] PASSED [ 75%]
tests/test_url_features.py::test_reject_unsafe_urls[http://0x7f000001] PASSED [ 75%]
tests/test_url_features.py::test_reject_unsafe_urls[http://0177.0.0.1] PASSED [ 76%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.1] PASSED [ 76%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.0.0.1.] PASSED [ 76%]
tests/test_url_features.py::test_reject_unsafe_urls[http://%6cocalhost] PASSED [ 77%]
tests/test_url_features.py::test_reject_unsafe_urls[http://localHOST\u3002] PASSED [ 77%]
tests/test_url_features.py::test_reject_unsafe_urls[http://example.com\\@127.0.0.1] PASSED [ 77%]
tests/test_url_features.py::test_reject_unsafe_urls[http://exam\nple.com] PASSED [ 78%]
tests/test_url_features.py::test_reject_unsafe_urls[http://bad_host.com] PASSED [ 78%]
tests/test_url_features.py::test_reject_unsafe_urls[http://-bad.example] PASSED [ 79%]
tests/test_url_features.py::test_reject_unsafe_urls[https://example.com/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx] PASSED [ 79%]
tests/test_url_features.py::test_normalize_public_hosts[https://EXAMPLE.COM./a?b=1-example.com] PASSED [ 79%]
tests/test_url_features.py::test_normalize_public_hosts[http://b\xfccher.de/a-xn--bcher-kva.de] PASSED [ 80%]
tests/test_url_features.py::test_normalize_public_hosts[https://8.8.8.8/a-8.8.8.8] PASSED [ 80%]
tests/test_url_features.py::test_normalize_public_hosts[http://[2606:4700:4700::1111]/-[2606:4700:4700::1111]] PASSED [ 80%]
tests/test_url_features.py::test_normalize_public_hosts[https://localhost.example.com/-localhost.example.com] PASSED [ 81%]
tests/test_url_features.py::test_maximum_url_length PASSED               [ 81%]
tests/test_url_features.py::test_invalid_alias[ab] PASSED                [ 82%]
tests/test_url_features.py::test_invalid_alias[aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa] PASSED [ 82%]
tests/test_url_features.py::test_invalid_alias[] PASSED                  [ 82%]
tests/test_url_features.py::test_invalid_alias[a/b] PASSED               [ 83%]
tests/test_url_features.py::test_invalid_alias[a.b] PASSED               [ 83%]
tests/test_url_features.py::test_invalid_alias[a b] PASSED               [ 83%]
tests/test_url_features.py::test_invalid_alias[\xe9\xe9\xe9] PASSED      [ 84%]
tests/test_url_features.py::test_invalid_alias[api] PASSED               [ 84%]
tests/test_url_features.py::test_invalid_alias[Health] PASSED            [ 85%]
tests/test_url_features.py::test_invalid_alias[METRICS] PASSED           [ 85%]
tests/test_url_features.py::test_invalid_alias[docs] PASSED              [ 85%]
tests/test_url_features.py::test_invalid_alias[admin] PASSED             [ 86%]
tests/test_url_features.py::test_invalid_alias[shorten] PASSED           [ 86%]
tests/test_url_features.py::test_invalid_alias[livez] PASSED             [ 86%]
tests/test_url_features.py::test_invalid_alias[urls] PASSED              [ 87%]
tests/test_url_features.py::test_invalid_alias[analytics] PASSED         [ 87%]
tests/test_url_features.py::test_invalid_alias[redoc] PASSED             [ 88%]
tests/test_url_features.py::test_valid_alias[abc] PASSED                 [ 88%]
tests/test_url_features.py::test_valid_alias[A_9-x] PASSED               [ 88%]
tests/test_url_features.py::test_valid_alias[aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa] PASSED [ 89%]
tests/test_url_features.py::test_invalid_expiry[2020-01-01T00:00:00Z] PASSED [ 89%]
tests/test_url_features.py::test_invalid_expiry[2099-01-01T00:00:00] PASSED [ 89%]
tests/test_url_features.py::test_invalid_expiry[nonsense] PASSED         [ 90%]
tests/test_url_features.py::test_invalid_expiry[9999999999] PASSED       [ 90%]
tests/test_url_features.py::test_expiry_normalized_to_utc PASSED         [ 91%]
tests/test_url_features.py::test_alias_create_conflict_delete_and_list PASSED [ 91%]
tests/test_url_features.py::test_expired_cache_hit_returns_410 PASSED    [ 91%]
tests/test_url_features.py::test_api_validation_is_422[payload0] PASSED  [ 92%]
tests/test_url_features.py::test_api_validation_is_422[payload1] PASSED  [ 92%]
tests/test_url_features.py::test_api_validation_is_422[payload2] PASSED  [ 92%]
tests/test_url_features.py::test_api_validation_is_422[payload3] PASSED  [ 93%]
tests/test_url_features.py::test_missing_delete_and_redirect PASSED      [ 93%]
tests/test_url_features.py::test_openapi_documents_fields_and_statuses PASSED [ 94%]
tests/test_url_features.py::test_cache_absolute_deadline_and_eviction PASSED [ 94%]
tests/test_url_features.py::test_multicast_rejected[http://224.0.0.1] PASSED [ 94%]
tests/test_url_features.py::test_multicast_rejected[http://[ff02::1]] PASSED [ 95%]
tests/test_url_features.py::test_numeric_string_expiry_rejected PASSED   [ 95%]
tests/test_url_features.py::test_no_redirect_if_expiry_passes_during_click_publication PASSED [ 95%]
tests/test_url_features.py::test_cache_not_used_when_database_fails PASSED [ 96%]
tests/test_url_features.py::test_far_expiry_cache_is_capped_at_jittered_ttl PASSED [ 96%]
tests/test_url_features.py::test_postgresql_alias_races_and_delete_lock SKIPPED [ 97%]
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

app/main.py:79
  /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/app/main.py:79: DeprecationWarning:
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
app/core/config.py                            50      9    82%   14, 32, 43, 47, 59, 67, 92, 94, 97
app/db/__init__.py                             0      0   100%
app/db/database.py                            17      6    65%   33-39
app/events/__init__.py                        13      1    92%   18
app/events/base.py                            12      0   100%
app/events/kafka.py                           58      9    84%   17-20, 27, 39, 51, 64, 67, 77
app/events/memory.py                          49      0   100%
app/events/models.py                          26      0   100%
app/events/publisher.py                       78      5    94%   52, 60-61, 104-105
app/events/redis_streams.py                   52      4    92%   86, 141-143
app/kafka/__init__.py                          0      0   100%
app/kafka/consumer.py                          4      0   100%
app/kafka/producer.py                          7      1    86%   9
app/main.py                                   48      8    83%   46-47, 62-63, 66, 84-86
app/middleware/hardening.py                   47      2    96%   30, 50
app/middleware/rate_limiter.py                81      1    99%   89
app/models/__init__.py                         0      0   100%
app/models/analytics.py                       11      0   100%
app/models/api_key.py                         14      0   100%
app/models/url.py                             14      0   100%
app/observability/context.py                  27      0   100%
app/observability/logging.py                  46      5    89%   60, 73-76
app/observability/metrics.py                  44      0   100%
app/observability/privacy.py                  27      1    96%   93
app/observability/tracing.py                  47      3    94%   72-73, 77
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
app/workers/analytics_worker.py              122     10    92%   184-193, 197
------------------------------------------------------------------------
TOTAL                                       1640    109    93%
Coverage XML written to file coverage.xml
================= 259 passed, 9 skipped, 5 warnings in 10.50s ==================
sh scripts/check-prometheus.sh
Checking rules/slo.yml
  SUCCESS: 22 rules found

  SUCCESS


```

### make mcp-test (exit 0)

```text
cd mcp-server && /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m pytest
..........                                                               [100%]
10 passed in 0.58s

```

### Real Redis integration test (exit 0)

```text
============================= test session starts ==============================
platform darwin -- Python 3.11.14, pytest-9.0.3, pluggy-1.7.0 -- /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python
cachedir: .pytest_cache
rootdir: /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener
configfile: pytest.ini
plugins: platformdirs-4.13.0, cov-7.1.0, anyio-4.15.1
collecting ... collected 23 items / 22 deselected / 1 selected

tests/test_event_bus.py::test_real_redis_pending_recovery_and_ack PASSED [100%]

=============================== warnings summary ===============================
.venv/lib/python3.11/site-packages/starlette/testclient.py:45
  /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/lib/python3.11/site-packages/starlette/testclient.py:45: DeprecationWarning: The anyio.abc.BlockingPortal alias is deprecated, use anyio.from_thread.BlockingPortal instead.
    _PortalFactoryType = Callable[[], AbstractContextManager[anyio.abc.BlockingPortal]]

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
================= 1 passed, 22 deselected, 1 warning in 1.24s ==================

```

### Runtime monitoring smoke checks (exit 0)

```text
PASS: Prometheus loaded 22 recording/alert rules from the mounted files
PASS: Grafana automatically provisioned the raw dashboard and five SLO/operations panels

```

### Kubernetes client validation (exit 0)

```text
configmap/prometheus-config configured (dry run)
service/prometheus configured (dry run)
deployment.apps/prometheus configured (dry run)
persistentvolumeclaim/prometheus-storage created (dry run)
configmap/prometheus-rules created (dry run)
configmap/grafana-datasources configured (dry run)
configmap/grafana-dashboards configured (dry run)
configmap/grafana-dashboard-json configured (dry run)
service/grafana configured (dry run)
deployment.apps/grafana configured (dry run)
service/api configured (dry run)
deployment.apps/api configured (dry run)
service/api-metrics created (dry run)
deployment.apps/worker configured (dry run)
service/worker created (dry run)

```

## Follow-up: existing Grafana volume provisioning fix

The fixed UID introduced above prevented an existing Grafana volume from starting.
Removed the imposed UID in both environments and made panels use the default
Prometheus datasource. Restarted only Grafana; `/api/health` returned database
`ok`, version `13.2.4`, without deleting data or changing credentials. A separate
fresh-installation smoke check also passed. Added a regression test in
`tests/test_slo.py`. No frontend or MCP changes.

Actual `make check` output (exit 0):

```text
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m black --check app/
All done! ✨ 🍰 ✨
49 files would be left unchanged.
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m isort --check-only app/
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m flake8 app/
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m mypy app/
Success: no issues found in 49 source files
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m pytest --cov=app --cov-report=term-missing --cov-report=xml
============================= test session starts ==============================
platform darwin -- Python 3.11.14, pytest-9.0.3, pluggy-1.7.0 -- /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python
cachedir: .pytest_cache
rootdir: /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener
configfile: pytest.ini
testpaths: tests
plugins: platformdirs-4.13.0, cov-7.1.0, anyio-4.15.1
collecting ... collected 269 items

tests/test_analytics_repository.py::test_batch_create_clicks_uses_single_execute_call PASSED [  0%]
tests/test_analytics_repository.py::test_batch_create_clicks_returns_zero_for_empty_list PASSED [  0%]
tests/test_analytics_repository.py::test_analytics_repository_count_and_timestamps PASSED [  1%]
tests/test_analytics_service.py::test_get_analytics_uses_repository_results PASSED [  1%]
tests/test_app_assembly.py::test_middleware_and_metrics PASSED           [  1%]
tests/test_app_assembly.py::test_cors_preflight PASSED                   [  2%]
tests/test_app_assembly.py::test_rate_limiter_is_registered PASSED       [  2%]
tests/test_app_assembly.py::test_main_routes PASSED                      [  2%]
tests/test_app_assembly.py::test_service_failures_are_503[/urls-service0-list_recent_urls] PASSED [  3%]
tests/test_app_assembly.py::test_service_failures_are_503[/analytics/code-service1-get_analytics] PASSED [  3%]
tests/test_app_assembly.py::test_health_dependency_failures[db] PASSED   [  4%]
tests/test_app_assembly.py::test_health_dependency_failures[redis] PASSED [  4%]
tests/test_app_assembly.py::test_health_dependency_failures[both] PASSED [  4%]
tests/test_app_assembly.py::test_false_redis_ping_is_unhealthy PASSED    [  5%]
tests/test_app_assembly.py::test_livez_does_not_touch_dependencies PASSED [  5%]
tests/test_app_assembly.py::test_redirect_falls_back_on_redis_read_failure[ConnectionError] PASSED [  5%]
tests/test_app_assembly.py::test_redirect_falls_back_on_redis_read_failure[TimeoutError] PASSED [  6%]
tests/test_app_assembly.py::test_redis_health_read_failures[ping] PASSED [  6%]
tests/test_app_assembly.py::test_redis_health_read_failures[dbsize] PASSED [  7%]
tests/test_app_assembly.py::test_health_session_acquisition_failure PASSED [  7%]
tests/test_app_assembly.py::test_health_session_is_closed PASSED         [  7%]
tests/test_app_assembly.py::test_stopped_redis_never_makes_redirect_5xx_and_health_reports_breaker PASSED [  8%]
tests/test_app_assembly.py::test_actual_stopped_redis_keeps_redirects_available SKIPPED [  8%]
tests/test_auth.py::test_key_hashing_metadata_and_revocation PASSED      [  8%]
tests/test_auth.py::test_key_invalid_creation[-scopes0] PASSED           [  9%]
tests/test_auth.py::test_key_invalid_creation[ok-scopes1] PASSED         [  9%]
tests/test_auth.py::test_key_invalid_creation[ok-scopes2] PASSED         [ 10%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-POST-/shorten] PASSED [ 10%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-DELETE-/urls/code] PASSED [ 10%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-GET-/urls] PASSED [ 11%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-GET-/analytics/code] PASSED [ 11%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-GET-/admin/keys] PASSED [ 11%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-DELETE-/admin/keys/1] PASSED [ 12%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-POST-/shorten] PASSED [ 12%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-DELETE-/urls/code] PASSED [ 13%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-GET-/urls] PASSED [ 13%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-GET-/analytics/code] PASSED [ 13%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-GET-/admin/keys] PASSED [ 14%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-DELETE-/admin/keys/1] PASSED [ 14%]
tests/test_auth.py::test_scope_enforcement_and_creator PASSED            [ 14%]
tests/test_auth.py::test_public_endpoints_and_openapi PASSED             [ 15%]
tests/test_auth.py::test_auth_database_failure_is_503 PASSED             [ 15%]
tests/test_auth.py::test_write_limits_and_key_isolation PASSED           [ 15%]
tests/test_auth.py::test_delete_uses_template_bucket_not_code PASSED     [ 16%]
tests/test_auth.py::test_redirects_share_ip_bucket_and_ignore_spoofed_headers PASSED [ 16%]
tests/test_auth.py::test_redis_failure_closes_writes_but_not_redirects PASSED [ 17%]
tests/test_auth.py::test_internal_metrics_not_exposed_on_api_port PASSED [ 17%]
tests/test_auth.py::test_cli_prints_key_once_and_never_lists_hash PASSED [ 17%]
tests/test_base62.py::test_encode_base62_zero_returns_empty_string PASSED [ 18%]
tests/test_base62.py::test_encode_base62_small_numbers PASSED            [ 18%]
tests/test_base62.py::test_encode_base62_larger_number PASSED            [ 18%]
tests/test_cache_strategy.py::test_circuit_open_half_open_closed_and_failed_probe PASSED [ 19%]
tests/test_cache_strategy.py::test_only_one_half_open_probe_and_stale_success_cannot_close PASSED [ 19%]
tests/test_cache_strategy.py::test_success_resets_consecutive_failures PASSED [ 20%]
tests/test_cache_strategy.py::test_client_timeout_and_retry_configuration PASSED [ 20%]
tests/test_cache_strategy.py::test_ttl_jitter_bounds_and_absolute_expiry PASSED [ 20%]
tests/test_cache_strategy.py::test_many_cold_requests_share_one_database_read[False] PASSED [ 21%]
tests/test_cache_strategy.py::test_many_cold_requests_share_one_database_read[True] PASSED [ 21%]
tests/test_cache_strategy.py::test_cross_process_lock_wait_rechecks_cache PASSED [ 21%]
tests/test_cache_strategy.py::test_negative_caching_and_alias_creation_invalidation PASSED [ 22%]
tests/test_cache_strategy.py::test_alias_creation_fences_an_inflight_negative_fill PASSED [ 22%]
tests/test_cache_strategy.py::test_lock_release_and_publication_require_owner PASSED [ 23%]
tests/test_cache_strategy.py::test_negative_cache_expiry PASSED          [ 23%]
tests/test_cache_strategy.py::test_redis_down_falls_back_and_counts_metric PASSED [ 23%]
tests/test_cache_strategy.py::test_singleflight_timeout_and_exception_cleanup PASSED [ 24%]
tests/test_cache_strategy.py::test_positive_cache_still_checks_deletion_and_database_failure PASSED [ 24%]
tests/test_cache_strategy.py::test_postgresql_stampede_executes_one_select SKIPPED [ 24%]
tests/test_code_generation.py::test_100000_candidates_are_unique_and_url_safe PASSED [ 25%]
tests/test_code_generation.py::test_production_generator_uses_secrets_choice PASSED [ 25%]
tests/test_code_generation.py::test_collision_retries_preserve_existing_destination PASSED [ 26%]
tests/test_code_generation.py::test_exhaustion_is_bounded_and_leaves_transaction_usable PASSED [ 26%]
tests/test_code_generation.py::test_non_collision_integrity_error_is_not_retried PASSED [ 26%]
tests/test_code_generation.py::test_concurrent_replicas_reserve_codes_in_postgresql SKIPPED [ 27%]
tests/test_code_generation.py::test_static_route_names_are_not_allocated PASSED [ 27%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_USER] PASSED [ 27%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_PASSWORD] PASSED [ 28%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_DB] PASSED [ 28%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[GRAFANA_ADMIN_USER] PASSED [ 28%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[GRAFANA_ADMIN_PASSWORD] PASSED [ 29%]
tests/test_deployment_config.py::test_compose_uses_same_database_credentials_for_all_clients PASSED [ 29%]
tests/test_deployment_config.py::test_profile_selects_matching_brokers[kafka] PASSED [ 30%]
tests/test_deployment_config.py::test_profile_selects_matching_brokers[redis-streams] PASSED [ 30%]
tests/test_deployment_config.py::test_kubernetes_metrics_use_internal_port_and_network_policy PASSED [ 30%]
tests/test_event_bus.py::test_duplicate_delivery_one_row_and_commit_before_ack PASSED [ 31%]
tests/test_event_bus.py::test_malformed_or_unknown_version_dlq_after_three_attempts[{broken] PASSED [ 31%]
tests/test_event_bus.py::test_malformed_or_unknown_version_dlq_after_three_attempts[{"schema_version":99,"short_code":"abc123"}] PASSED [ 31%]
tests/test_event_bus.py::test_poison_row_does_not_discard_healthy_batch_rows PASSED [ 32%]
tests/test_event_bus.py::test_database_error_never_acknowledges_or_deadletters PASSED [ 32%]
tests/test_event_bus.py::test_commit_failure_does_not_ack PASSED         [ 33%]
tests/test_event_bus.py::test_dlq_publish_failure_does_not_advance_offset PASSED [ 33%]
tests/test_event_bus.py::test_idle_timer_and_shutdown_flush[False] PASSED [ 33%]
tests/test_event_bus.py::test_idle_timer_and_shutdown_flush[True] PASSED [ 34%]
tests/test_event_bus.py::test_slow_broker_and_full_queue_do_not_block_redirects PASSED [ 34%]
tests/test_event_bus.py::test_kafka_raw_poll_and_explicit_offsets PASSED [ 34%]
tests/test_event_bus.py::test_redis_groups_recover_pending_before_new_reads PASSED [ 35%]
tests/test_event_bus.py::test_memory_groups_and_unacknowledged_recovery PASSED [ 35%]
tests/test_event_bus.py::test_dlq_list_and_replay_preserve_event_id PASSED [ 36%]
tests/test_event_bus.py::test_adapter_selection_without_connecting[memory-InMemoryEventBus] PASSED [ 36%]
tests/test_event_bus.py::test_adapter_selection_without_connecting[kafka-KafkaEventBus] PASSED [ 36%]
tests/test_event_bus.py::test_adapter_selection_without_connecting[redis_streams-RedisStreamsEventBus] PASSED [ 37%]
tests/test_event_bus.py::test_postgres_duplicate_after_ack_failure SKIPPED [ 37%]
tests/test_event_bus.py::test_real_redis_pending_recovery_and_ack SKIPPED [ 37%]
tests/test_event_bus.py::test_legacy_event_without_id_goes_to_dlq PASSED [ 38%]
tests/test_event_bus.py::test_memory_recovers_more_than_one_batch PASSED [ 38%]
tests/test_event_bus.py::test_real_kafka_delivery_commit_and_dlq SKIPPED [ 39%]
tests/test_event_bus.py::test_idle_timer_flushes_even_when_later_polls_fail PASSED [ 39%]
tests/test_hardening.py::test_body_limit_and_safe_errors PASSED          [ 39%]
tests/test_hardening.py::test_chunked_body_cannot_bypass_limit PASSED    [ 40%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[*] PASSED   [ 40%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[https://*.example.com] PASSED [ 40%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[https://user:pass@example.com] PASSED [ 41%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[https://example.com/path] PASSED [ 41%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[] PASSED    [ 42%]
tests/test_hardening.py::test_production_accepts_exact_origin PASSED     [ 42%]
tests/test_hardening.py::test_all_kubernetes_containers_have_security_and_resources PASSED [ 42%]
tests/test_hardening.py::test_network_policy_default_deny_and_exact_dependency_ports PASSED [ 43%]
tests/test_hardening.py::test_slow_request_body_returns_408 PASSED       [ 43%]
tests/test_hardening.py::test_kafka_constructor_uses_supported_bounded_timeouts PASSED [ 43%]
tests/test_hardening.py::test_cors_setting_is_configmap_data_not_object_metadata PASSED [ 44%]
tests/test_hardening.py::test_frontend_build_excludes_local_secrets_and_artifacts PASSED [ 44%]
tests/test_health_route.py::test_health_endpoint_includes_total_urls PASSED [ 44%]
tests/test_migrations.py::test_migrations_on_empty_sqlite PASSED         [ 45%]
tests/test_migrations.py::test_offline_sql_uses_postgresql_settings PASSED [ 45%]
tests/test_migrations.py::test_postgresql_upgrade_schema_constraints_and_downgrade SKIPPED [ 46%]
tests/test_migrations.py::test_legacy_schema_can_be_stamped_and_upgraded SKIPPED [ 46%]
tests/test_observability.py::test_w3c_event_roundtrip_and_invalid_context_isolation PASSED [ 46%]
tests/test_observability.py::test_json_log_has_active_trace_and_no_secrets[api] PASSED [ 47%]
tests/test_observability.py::test_json_log_has_active_trace_and_no_secrets[worker] PASSED [ 47%]
tests/test_observability.py::test_json_log_has_active_trace_and_no_secrets[abuse-worker] PASSED [ 47%]
tests/test_observability.py::test_privacy_export_boundary_for_every_process[api] PASSED [ 48%]
tests/test_observability.py::test_privacy_export_boundary_for_every_process[worker] PASSED [ 48%]
tests/test_observability.py::test_privacy_export_boundary_for_every_process[abuse-worker] PASSED [ 49%]
tests/test_observability.py::test_redirect_publish_consume_sql_share_one_trace PASSED [ 49%]
tests/test_observability.py::test_init_instruments_existing_engine_and_uses_configured_otlp PASSED [ 49%]
tests/test_rate_limiter.py::test_bucket_burst_refill_and_identity_isolation PASSED [ 50%]
tests/test_rate_limiter.py::test_bucket_concurrent_burst PASSED          [ 50%]
tests/test_rate_limiter.py::test_bucket_error_and_clock_regression PASSED [ 50%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[198.51.100.5-1.2.3.4-trusted0-198.51.100.5] PASSED [ 51%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[198.51.100.5-1.2.3.4-trusted1-198.51.100.5] PASSED [ 51%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[10.0.0.1-198.51.100.5-trusted2-198.51.100.5] PASSED [ 52%]
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
tests/test_redis_client.py::test_normal_cache_reads[None-counter1] PASSED [ 56%]
tests/test_routes.py::test_create_short_url_returns_service_code PASSED  [ 57%]
tests/test_routes.py::test_redirect_returns_redirect_response PASSED     [ 57%]
tests/test_routes.py::test_redirect_raises_404_for_missing_code PASSED   [ 57%]
tests/test_routes.py::test_analytics_route_uses_service PASSED           [ 58%]
tests/test_routes.py::test_redis_health_success PASSED                   [ 58%]
tests/test_routes.py::test_redis_health_failure PASSED                   [ 59%]
tests/test_slo.py::test_redis_lag_excludes_acknowledged_history_and_reports_retained_dlq PASSED [ 59%]
tests/test_slo.py::test_unknown_redis_lag_does_not_look_healthy PASSED   [ 59%]
tests/test_slo.py::test_kafka_retained_dlq_size_accounts_for_retention PASSED [ 60%]
tests/test_slo.py::test_worker_exports_current_dlq_size PASSED           [ 60%]
tests/test_slo.py::test_provisioned_configmaps_match_canonical_sources PASSED [ 60%]
tests/test_slo.py::test_redirect_slo_selector_captures_5xx_and_excludes_health PASSED [ 61%]
tests/test_slo.py::test_new_kafka_group_lag_starts_at_retained_offset PASSED [ 61%]
tests/test_slo.py::test_headless_metrics_services_include_unready_replicas PASSED [ 62%]
tests/test_slo.py::test_grafana_upgrade_preserves_existing_datasource_identity PASSED [ 62%]
tests/test_tooling_regressions.py::test_typed_models_preserve_column_types_and_nullability PASSED [ 62%]
tests/test_tooling_regressions.py::test_trace_logging_preserves_message_for_default_formatter PASSED [ 63%]
tests/test_tooling_regressions.py::test_worker_reports_unconfigured_database PASSED [ 63%]
tests/test_trace_privacy.py::test_url_spans_only_include_origin_and_code[False] PASSED [ 63%]
tests/test_trace_privacy.py::test_url_spans_only_include_origin_and_code[True] PASSED [ 64%]
tests/test_trace_privacy.py::test_auto_instrumented_redis_does_not_export_cached_url PASSED [ 64%]
tests/test_trace_privacy.py::test_auto_instrumented_http_does_not_export_path_or_query PASSED [ 65%]
tests/test_trace_privacy.py::test_privacy_hooks_redact_instrumentation_attributes PASSED [ 65%]
tests/test_url_features.py::test_reject_unsafe_urls[ftp://example.com] PASSED [ 65%]
tests/test_url_features.py::test_reject_unsafe_urls[javascript:alert(1)] PASSED [ 66%]
tests/test_url_features.py::test_reject_unsafe_urls[https:///path] PASSED [ 66%]
tests/test_url_features.py::test_reject_unsafe_urls[https://] PASSED     [ 66%]
tests/test_url_features.py::test_reject_unsafe_urls[http://user:pass@example.com] PASSED [ 67%]
tests/test_url_features.py::test_reject_unsafe_urls[http://user@example.com] PASSED [ 67%]
tests/test_url_features.py::test_reject_unsafe_urls[http://@example.com] PASSED [ 68%]
tests/test_url_features.py::test_reject_unsafe_urls[http://localhost] PASSED [ 68%]
tests/test_url_features.py::test_reject_unsafe_urls[http://LOCALHOST.] PASSED [ 68%]
tests/test_url_features.py::test_reject_unsafe_urls[http://sub.localhost] PASSED [ 69%]
tests/test_url_features.py::test_reject_unsafe_urls[http://server.local] PASSED [ 69%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.0.0.1] PASSED [ 69%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.9.2.1] PASSED [ 70%]
tests/test_url_features.py::test_reject_unsafe_urls[http://10.1.2.3] PASSED [ 70%]
tests/test_url_features.py::test_reject_unsafe_urls[http://172.16.2.3] PASSED [ 71%]
tests/test_url_features.py::test_reject_unsafe_urls[http://192.168.1.1] PASSED [ 71%]
tests/test_url_features.py::test_reject_unsafe_urls[http://169.254.169.254] PASSED [ 71%]
tests/test_url_features.py::test_reject_unsafe_urls[http://0.0.0.0] PASSED [ 72%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::1]] PASSED [ 72%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::]] PASSED  [ 72%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fc00::1]] PASSED [ 73%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fd00::1]] PASSED [ 73%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fe80::1]] PASSED [ 73%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::ffff:127.0.0.1]] PASSED [ 74%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::ffff:192.168.0.1]] PASSED [ 74%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fe80::1%25eth0]] PASSED [ 75%]
tests/test_url_features.py::test_reject_unsafe_urls[http://2130706433] PASSED [ 75%]
tests/test_url_features.py::test_reject_unsafe_urls[http://0x7f000001] PASSED [ 75%]
tests/test_url_features.py::test_reject_unsafe_urls[http://0177.0.0.1] PASSED [ 76%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.1] PASSED [ 76%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.0.0.1.] PASSED [ 76%]
tests/test_url_features.py::test_reject_unsafe_urls[http://%6cocalhost] PASSED [ 77%]
tests/test_url_features.py::test_reject_unsafe_urls[http://localHOST\u3002] PASSED [ 77%]
tests/test_url_features.py::test_reject_unsafe_urls[http://example.com\\@127.0.0.1] PASSED [ 78%]
tests/test_url_features.py::test_reject_unsafe_urls[http://exam\nple.com] PASSED [ 78%]
tests/test_url_features.py::test_reject_unsafe_urls[http://bad_host.com] PASSED [ 78%]
tests/test_url_features.py::test_reject_unsafe_urls[http://-bad.example] PASSED [ 79%]
tests/test_url_features.py::test_reject_unsafe_urls[https://example.com/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx] PASSED [ 79%]
tests/test_url_features.py::test_normalize_public_hosts[https://EXAMPLE.COM./a?b=1-example.com] PASSED [ 79%]
tests/test_url_features.py::test_normalize_public_hosts[http://b\xfccher.de/a-xn--bcher-kva.de] PASSED [ 80%]
tests/test_url_features.py::test_normalize_public_hosts[https://8.8.8.8/a-8.8.8.8] PASSED [ 80%]
tests/test_url_features.py::test_normalize_public_hosts[http://[2606:4700:4700::1111]/-[2606:4700:4700::1111]] PASSED [ 81%]
tests/test_url_features.py::test_normalize_public_hosts[https://localhost.example.com/-localhost.example.com] PASSED [ 81%]
tests/test_url_features.py::test_maximum_url_length PASSED               [ 81%]
tests/test_url_features.py::test_invalid_alias[ab] PASSED                [ 82%]
tests/test_url_features.py::test_invalid_alias[aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa] PASSED [ 82%]
tests/test_url_features.py::test_invalid_alias[] PASSED                  [ 82%]
tests/test_url_features.py::test_invalid_alias[a/b] PASSED               [ 83%]
tests/test_url_features.py::test_invalid_alias[a.b] PASSED               [ 83%]
tests/test_url_features.py::test_invalid_alias[a b] PASSED               [ 84%]
tests/test_url_features.py::test_invalid_alias[\xe9\xe9\xe9] PASSED      [ 84%]
tests/test_url_features.py::test_invalid_alias[api] PASSED               [ 84%]
tests/test_url_features.py::test_invalid_alias[Health] PASSED            [ 85%]
tests/test_url_features.py::test_invalid_alias[METRICS] PASSED           [ 85%]
tests/test_url_features.py::test_invalid_alias[docs] PASSED              [ 85%]
tests/test_url_features.py::test_invalid_alias[admin] PASSED             [ 86%]
tests/test_url_features.py::test_invalid_alias[shorten] PASSED           [ 86%]
tests/test_url_features.py::test_invalid_alias[livez] PASSED             [ 86%]
tests/test_url_features.py::test_invalid_alias[urls] PASSED              [ 87%]
tests/test_url_features.py::test_invalid_alias[analytics] PASSED         [ 87%]
tests/test_url_features.py::test_invalid_alias[redoc] PASSED             [ 88%]
tests/test_url_features.py::test_valid_alias[abc] PASSED                 [ 88%]
tests/test_url_features.py::test_valid_alias[A_9-x] PASSED               [ 88%]
tests/test_url_features.py::test_valid_alias[aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa] PASSED [ 89%]
tests/test_url_features.py::test_invalid_expiry[2020-01-01T00:00:00Z] PASSED [ 89%]
tests/test_url_features.py::test_invalid_expiry[2099-01-01T00:00:00] PASSED [ 89%]
tests/test_url_features.py::test_invalid_expiry[nonsense] PASSED         [ 90%]
tests/test_url_features.py::test_invalid_expiry[9999999999] PASSED       [ 90%]
tests/test_url_features.py::test_expiry_normalized_to_utc PASSED         [ 91%]
tests/test_url_features.py::test_alias_create_conflict_delete_and_list PASSED [ 91%]
tests/test_url_features.py::test_expired_cache_hit_returns_410 PASSED    [ 91%]
tests/test_url_features.py::test_api_validation_is_422[payload0] PASSED  [ 92%]
tests/test_url_features.py::test_api_validation_is_422[payload1] PASSED  [ 92%]
tests/test_url_features.py::test_api_validation_is_422[payload2] PASSED  [ 92%]
tests/test_url_features.py::test_api_validation_is_422[payload3] PASSED  [ 93%]
tests/test_url_features.py::test_missing_delete_and_redirect PASSED      [ 93%]
tests/test_url_features.py::test_openapi_documents_fields_and_statuses PASSED [ 94%]
tests/test_url_features.py::test_cache_absolute_deadline_and_eviction PASSED [ 94%]
tests/test_url_features.py::test_multicast_rejected[http://224.0.0.1] PASSED [ 94%]
tests/test_url_features.py::test_multicast_rejected[http://[ff02::1]] PASSED [ 95%]
tests/test_url_features.py::test_numeric_string_expiry_rejected PASSED   [ 95%]
tests/test_url_features.py::test_no_redirect_if_expiry_passes_during_click_publication PASSED [ 95%]
tests/test_url_features.py::test_cache_not_used_when_database_fails PASSED [ 96%]
tests/test_url_features.py::test_far_expiry_cache_is_capped_at_jittered_ttl PASSED [ 96%]
tests/test_url_features.py::test_postgresql_alias_races_and_delete_lock SKIPPED [ 97%]
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

app/main.py:79
  /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/app/main.py:79: DeprecationWarning:
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
app/core/config.py                            50      9    82%   14, 32, 43, 47, 59, 67, 92, 94, 97
app/db/__init__.py                             0      0   100%
app/db/database.py                            17      6    65%   33-39
app/events/__init__.py                        13      1    92%   18
app/events/base.py                            12      0   100%
app/events/kafka.py                           58      9    84%   17-20, 27, 39, 51, 64, 67, 77
app/events/memory.py                          49      0   100%
app/events/models.py                          26      0   100%
app/events/publisher.py                       78      5    94%   52, 60-61, 104-105
app/events/redis_streams.py                   52      4    92%   86, 141-143
app/kafka/__init__.py                          0      0   100%
app/kafka/consumer.py                          4      0   100%
app/kafka/producer.py                          7      1    86%   9
app/main.py                                   48      8    83%   46-47, 62-63, 66, 84-86
app/middleware/hardening.py                   47      2    96%   30, 50
app/middleware/rate_limiter.py                81      1    99%   89
app/models/__init__.py                         0      0   100%
app/models/analytics.py                       11      0   100%
app/models/api_key.py                         14      0   100%
app/models/url.py                             14      0   100%
app/observability/context.py                  27      0   100%
app/observability/logging.py                  46      5    89%   60, 73-76
app/observability/metrics.py                  44      0   100%
app/observability/privacy.py                  27      1    96%   93
app/observability/tracing.py                  47      3    94%   72-73, 77
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
app/workers/analytics_worker.py              122     10    92%   184-193, 197
------------------------------------------------------------------------
TOTAL                                       1640    109    93%
Coverage XML written to file coverage.xml
================= 260 passed, 9 skipped, 5 warnings in 10.37s ==================
sh scripts/check-prometheus.sh
Checking rules/slo.yml
  SUCCESS: 22 rules found

  SUCCESS
```

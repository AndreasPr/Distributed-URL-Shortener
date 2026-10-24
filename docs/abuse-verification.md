# Step 4.2 abuse pipeline verification

Branch: `step-4-2-abuse-pipeline`.

## Results and limits

- `make check`: exit 0; Black/isort/Flake8/mypy pass; **332 passed, 10 skipped**,
  93% coverage. Promtool validates 22 rules and its scenario tests pass.
- 37 new offline abuse tests cover each heuristic, registered/private domains,
  gray-zone routing, schema/injection boundaries, contextual Redis caching,
  unavailable Redis/budget, outbox rollback/relay, duplicate processing, commit
  failures, invalid-envelope DLQ, worker shutdown, admin authorization and 451.
- `make frontend-check`: exit 0; npm ci, ESLint, 5 client/security tests and tsc pass.
- `make mcp-test`: exit 0; 10 passed.
- `RUN_DOCKER_TESTS=1 .venv/bin/python -m pytest tests/test_abuse.py::test_postgres_verdict_outbox_and_review tests/test_migrations.py -q`:
  exit 0; 5 passed (portable checks and disposable PostgreSQL upgrade/downgrade,
  schema parity, outbox, duplicate verdict and admin-review checks).
- Both Compose profiles validate with `.env.example`; no secret values printed.
- Changed Kubernetes manifests pass client dry-run only; no cluster rollout made.
- Both Prometheus scrape configurations pass pinned promtool config validation.
- Backend image built successfully. Isolated runtime smoke used a read-only,
  non-root image, PostgreSQL 16.13 and Redis 7.4.9, plus the actual abuse-worker
  entrypoint. It migrated, relayed three outbox events through Redis Streams,
  persisted clean/suspicious/malicious verdicts, blocked malicious and honored an
  admin allow. Disposable containers/network were removed. Existing services,
  volumes and private `.env` were not modified.
- No live LLM or destination page was contacted. Model outputs were deterministic
  fakes. These tests do not establish classifier accuracy or injection immunity.
- Kafka adapter is covered by existing mocked contract tests; this step's live
  worker smoke used Redis Streams, not a live Kafka cluster. UI checks are lint,
  client tests and types; no interactive browser walkthrough was performed.
- Initial full gate found the hardening test still expected ten workloads; it was
  updated to eleven with the new abuse worker included. The final gate passes.

## Deployment notes

Apply migration 0005 before updated API/workers. Rebuild images; both profiles add
an abuse worker. K8s adds a hardened Deployment, headless metrics Service and six
NetworkPolicies. K8s defaults to Fake and blocks public model egress. Default fake
output makes gray-zone cases suspicious; low/high heuristics still work. Pending
links remain redirectable until classification, and old links are not backfilled.
Do not interpret a clean verdict as proof of safety. Admin decisions override
automatic blocking and survive duplicate delivery. See [operation guide](abuse-pipeline.md)
and [ADR](adr/0004-abuse-pipeline.md).

## Actual output

### make check

```text
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m black --check app/
All done! ✨ 🍰 ✨
60 files would be left unchanged.
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m isort --check-only app/
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m flake8 app/
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m mypy app/
Success: no issues found in 60 source files
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m pytest --cov=app --cov-report=term-missing --cov-report=xml
============================= test session starts ==============================
platform darwin -- Python 3.11.14, pytest-9.0.3, pluggy-1.7.0 -- /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python
cachedir: .pytest_cache
rootdir: /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener
configfile: pytest.ini
testpaths: tests
plugins: platformdirs-4.13.0, cov-7.1.0, anyio-4.15.1
collecting ... collected 342 items

tests/test_abuse.py::test_each_heuristic[https://8.8.8.8/-ip_literal] PASSED [  0%]
tests/test_abuse.py::test_each_heuristic[https://[2606:4700:4700::1111]/-ip_literal] PASSED [  0%]
tests/test_abuse.py::test_each_heuristic[https://xn--bcher-kva.de/-punycode] PASSED [  0%]
tests/test_abuse.py::test_each_heuristic[https://p\u0430ypal.com/-mixed_script] PASSED [  1%]
tests/test_abuse.py::test_each_heuristic[https://a.b.c.d.example.com/-deep_subdomains] PASSED [  1%]
tests/test_abuse.py::test_each_heuristic[https://example.zip/-suspicious_tld] PASSED [  1%]
tests/test_abuse.py::test_each_heuristic[https://example.com/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-long_url] PASSED [  2%]
tests/test_abuse.py::test_each_heuristic[https://example.com/123456789012-many_digits] PASSED [  2%]
tests/test_abuse.py::test_each_heuristic[https://example.com/----------------many_specials] PASSED [  2%]
tests/test_abuse.py::test_each_heuristic[https://paypal.attacker.com/-brand_subdomain] PASSED [  2%]
tests/test_abuse.py::test_each_heuristic[https://bit.ly/abc-shortener_chain] PASSED [  3%]
tests/test_abuse.py::test_each_heuristic[https://example.com/%6Cogin-credential_path] PASSED [  3%]
tests/test_abuse.py::test_each_heuristic[https://example.com/verify-credential_path] PASSED [  3%]
tests/test_abuse.py::test_each_heuristic[https://example.com/secure-credential_path] PASSED [  4%]
tests/test_abuse.py::test_each_heuristic[https://example.com/update-credential_path] PASSED [  4%]
tests/test_abuse.py::test_registered_domains_and_counts PASSED           [  4%]
tests/test_abuse.py::test_low_high_skip_model PASSED                     [  4%]
tests/test_abuse.py::test_gray_zone_and_domain_cache PASSED              [  5%]
tests/test_abuse.py::test_invalid_schema_suspicious[oops] PASSED         [  5%]
tests/test_abuse.py::test_invalid_schema_suspicious[{"verdict":"clean","confidence":1,"reasons":["anything"]}] PASSED [  5%]
tests/test_abuse.py::test_invalid_schema_suspicious[{"verdict":"clean","confidence":2,"reasons":["llm_uncertain"]}] PASSED [  6%]
tests/test_abuse.py::test_invalid_schema_suspicious[{"verdict":"clean","confidence":1,"reasons":["llm_uncertain"],"tool":"fetch"}] PASSED [  6%]
tests/test_abuse.py::test_budget_unavailable_is_reviewable PASSED        [  6%]
tests/test_abuse.py::test_injection_quoted_capped_and_cannot_clear_heuristic PASSED [  7%]
tests/test_abuse.py::test_outbox_publish_duplicate_and_commit_before_ack PASSED [  7%]
tests/test_abuse.py::test_outbox_rollback_when_commit_fails PASSED       [  7%]
tests/test_abuse.py::test_relay_failure_retains_outbox PASSED            [  7%]
tests/test_abuse.py::test_failed_verdict_commit_is_not_acked PASSED      [  8%]
tests/test_abuse.py::test_malformed_goes_to_dlq_before_ack PASSED        [  8%]
tests/test_abuse.py::test_enforcement_on_warm_cache_and_review PASSED    [  8%]
tests/test_abuse.py::test_suspicious_redirect_and_deleted_precedence PASSED [  9%]
tests/test_abuse.py::test_redis_failure_does_not_skip_analysis PASSED    [  9%]
tests/test_abuse.py::test_invalid_cached_result_recomputed PASSED        [  9%]
tests/test_abuse.py::test_worker_run_metrics_and_shutdown PASSED         [  9%]
tests/test_abuse.py::test_store_does_not_replace_review PASSED           [ 10%]
tests/test_abuse.py::test_missing_deleted_events_ack_without_classification PASSED [ 10%]
tests/test_abuse.py::test_schema_and_new_services PASSED                 [ 10%]
tests/test_abuse.py::test_postgres_verdict_outbox_and_review SKIPPED     [ 11%]
tests/test_analytics_repository.py::test_batch_create_clicks_uses_single_execute_call PASSED [ 11%]
tests/test_analytics_repository.py::test_batch_create_clicks_returns_zero_for_empty_list PASSED [ 11%]
tests/test_analytics_repository.py::test_analytics_repository_count_and_timestamps PASSED [ 11%]
tests/test_analytics_service.py::test_get_analytics_uses_repository_results PASSED [ 12%]
tests/test_app_assembly.py::test_middleware_and_metrics PASSED           [ 12%]
tests/test_app_assembly.py::test_cors_preflight PASSED                   [ 12%]
tests/test_app_assembly.py::test_rate_limiter_is_registered PASSED       [ 13%]
tests/test_app_assembly.py::test_main_routes PASSED                      [ 13%]
tests/test_app_assembly.py::test_service_failures_are_503[/urls-service0-list_recent_urls] PASSED [ 13%]
tests/test_app_assembly.py::test_service_failures_are_503[/analytics/code-service1-get_analytics] PASSED [ 14%]
tests/test_app_assembly.py::test_health_dependency_failures[db] PASSED   [ 14%]
tests/test_app_assembly.py::test_health_dependency_failures[redis] PASSED [ 14%]
tests/test_app_assembly.py::test_health_dependency_failures[both] PASSED [ 14%]
tests/test_app_assembly.py::test_false_redis_ping_is_unhealthy PASSED    [ 15%]
tests/test_app_assembly.py::test_livez_does_not_touch_dependencies PASSED [ 15%]
tests/test_app_assembly.py::test_redirect_falls_back_on_redis_read_failure[ConnectionError] PASSED [ 15%]
tests/test_app_assembly.py::test_redirect_falls_back_on_redis_read_failure[TimeoutError] PASSED [ 16%]
tests/test_app_assembly.py::test_redis_health_read_failures[ping] PASSED [ 16%]
tests/test_app_assembly.py::test_redis_health_read_failures[dbsize] PASSED [ 16%]
tests/test_app_assembly.py::test_health_session_acquisition_failure PASSED [ 16%]
tests/test_app_assembly.py::test_health_session_is_closed PASSED         [ 17%]
tests/test_app_assembly.py::test_stopped_redis_never_makes_redirect_5xx_and_health_reports_breaker PASSED [ 17%]
tests/test_app_assembly.py::test_actual_stopped_redis_keeps_redirects_available SKIPPED [ 17%]
tests/test_auth.py::test_key_hashing_metadata_and_revocation PASSED      [ 18%]
tests/test_auth.py::test_key_invalid_creation[-scopes0] PASSED           [ 18%]
tests/test_auth.py::test_key_invalid_creation[ok-scopes1] PASSED         [ 18%]
tests/test_auth.py::test_key_invalid_creation[ok-scopes2] PASSED         [ 19%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-POST-/shorten] PASSED [ 19%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-DELETE-/urls/code] PASSED [ 19%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-GET-/urls] PASSED [ 19%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-GET-/analytics/code] PASSED [ 20%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-GET-/admin/keys] PASSED [ 20%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-DELETE-/admin/keys/1] PASSED [ 20%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-POST-/shorten] PASSED [ 21%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-DELETE-/urls/code] PASSED [ 21%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-GET-/urls] PASSED [ 21%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-GET-/analytics/code] PASSED [ 21%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-GET-/admin/keys] PASSED [ 22%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-DELETE-/admin/keys/1] PASSED [ 22%]
tests/test_auth.py::test_scope_enforcement_and_creator PASSED            [ 22%]
tests/test_auth.py::test_public_endpoints_and_openapi PASSED             [ 23%]
tests/test_auth.py::test_auth_database_failure_is_503 PASSED             [ 23%]
tests/test_auth.py::test_write_limits_and_key_isolation PASSED           [ 23%]
tests/test_auth.py::test_delete_uses_template_bucket_not_code PASSED     [ 23%]
tests/test_auth.py::test_redirects_share_ip_bucket_and_ignore_spoofed_headers PASSED [ 24%]
tests/test_auth.py::test_redis_failure_closes_writes_but_not_redirects PASSED [ 24%]
tests/test_auth.py::test_internal_metrics_not_exposed_on_api_port PASSED [ 24%]
tests/test_auth.py::test_cli_prints_key_once_and_never_lists_hash PASSED [ 25%]
tests/test_base62.py::test_encode_base62_zero_returns_empty_string PASSED [ 25%]
tests/test_base62.py::test_encode_base62_small_numbers PASSED            [ 25%]
tests/test_base62.py::test_encode_base62_larger_number PASSED            [ 26%]
tests/test_cache_strategy.py::test_circuit_open_half_open_closed_and_failed_probe PASSED [ 26%]
tests/test_cache_strategy.py::test_only_one_half_open_probe_and_stale_success_cannot_close PASSED [ 26%]
tests/test_cache_strategy.py::test_success_resets_consecutive_failures PASSED [ 26%]
tests/test_cache_strategy.py::test_client_timeout_and_retry_configuration PASSED [ 27%]
tests/test_cache_strategy.py::test_ttl_jitter_bounds_and_absolute_expiry PASSED [ 27%]
tests/test_cache_strategy.py::test_many_cold_requests_share_one_database_read[False] PASSED [ 27%]
tests/test_cache_strategy.py::test_many_cold_requests_share_one_database_read[True] PASSED [ 28%]
tests/test_cache_strategy.py::test_cross_process_lock_wait_rechecks_cache PASSED [ 28%]
tests/test_cache_strategy.py::test_negative_caching_and_alias_creation_invalidation PASSED [ 28%]
tests/test_cache_strategy.py::test_alias_creation_fences_an_inflight_negative_fill PASSED [ 28%]
tests/test_cache_strategy.py::test_lock_release_and_publication_require_owner PASSED [ 29%]
tests/test_cache_strategy.py::test_negative_cache_expiry PASSED          [ 29%]
tests/test_cache_strategy.py::test_redis_down_falls_back_and_counts_metric PASSED [ 29%]
tests/test_cache_strategy.py::test_singleflight_timeout_and_exception_cleanup PASSED [ 30%]
tests/test_cache_strategy.py::test_positive_cache_still_checks_deletion_and_database_failure PASSED [ 30%]
tests/test_cache_strategy.py::test_postgresql_stampede_executes_one_select SKIPPED [ 30%]
tests/test_code_generation.py::test_100000_candidates_are_unique_and_url_safe PASSED [ 30%]
tests/test_code_generation.py::test_production_generator_uses_secrets_choice PASSED [ 31%]
tests/test_code_generation.py::test_collision_retries_preserve_existing_destination PASSED [ 31%]
tests/test_code_generation.py::test_exhaustion_is_bounded_and_leaves_transaction_usable PASSED [ 31%]
tests/test_code_generation.py::test_non_collision_integrity_error_is_not_retried PASSED [ 32%]
tests/test_code_generation.py::test_concurrent_replicas_reserve_codes_in_postgresql SKIPPED [ 32%]
tests/test_code_generation.py::test_static_route_names_are_not_allocated PASSED [ 32%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_USER] PASSED [ 33%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_PASSWORD] PASSED [ 33%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_DB] PASSED [ 33%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[GRAFANA_ADMIN_USER] PASSED [ 33%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[GRAFANA_ADMIN_PASSWORD] PASSED [ 34%]
tests/test_deployment_config.py::test_compose_uses_same_database_credentials_for_all_clients PASSED [ 34%]
tests/test_deployment_config.py::test_profile_selects_matching_brokers[kafka] PASSED [ 34%]
tests/test_deployment_config.py::test_profile_selects_matching_brokers[redis-streams] PASSED [ 35%]
tests/test_deployment_config.py::test_kubernetes_metrics_use_internal_port_and_network_policy PASSED [ 35%]
tests/test_event_bus.py::test_duplicate_delivery_one_row_and_commit_before_ack PASSED [ 35%]
tests/test_event_bus.py::test_malformed_or_unknown_version_dlq_after_three_attempts[{broken] PASSED [ 35%]
tests/test_event_bus.py::test_malformed_or_unknown_version_dlq_after_three_attempts[{"schema_version":99,"short_code":"abc123"}] PASSED [ 36%]
tests/test_event_bus.py::test_poison_row_does_not_discard_healthy_batch_rows PASSED [ 36%]
tests/test_event_bus.py::test_database_error_never_acknowledges_or_deadletters PASSED [ 36%]
tests/test_event_bus.py::test_commit_failure_does_not_ack PASSED         [ 37%]
tests/test_event_bus.py::test_dlq_publish_failure_does_not_advance_offset PASSED [ 37%]
tests/test_event_bus.py::test_idle_timer_and_shutdown_flush[False] PASSED [ 37%]
tests/test_event_bus.py::test_idle_timer_and_shutdown_flush[True] PASSED [ 38%]
tests/test_event_bus.py::test_slow_broker_and_full_queue_do_not_block_redirects PASSED [ 38%]
tests/test_event_bus.py::test_kafka_raw_poll_and_explicit_offsets PASSED [ 38%]
tests/test_event_bus.py::test_redis_groups_recover_pending_before_new_reads PASSED [ 38%]
tests/test_event_bus.py::test_memory_groups_and_unacknowledged_recovery PASSED [ 39%]
tests/test_event_bus.py::test_dlq_list_and_replay_preserve_event_id PASSED [ 39%]
tests/test_event_bus.py::test_adapter_selection_without_connecting[memory-InMemoryEventBus] PASSED [ 39%]
tests/test_event_bus.py::test_adapter_selection_without_connecting[kafka-KafkaEventBus] PASSED [ 40%]
tests/test_event_bus.py::test_adapter_selection_without_connecting[redis_streams-RedisStreamsEventBus] PASSED [ 40%]
tests/test_event_bus.py::test_postgres_duplicate_after_ack_failure SKIPPED [ 40%]
tests/test_event_bus.py::test_real_redis_pending_recovery_and_ack SKIPPED [ 40%]
tests/test_event_bus.py::test_legacy_event_without_id_goes_to_dlq PASSED [ 41%]
tests/test_event_bus.py::test_memory_recovers_more_than_one_batch PASSED [ 41%]
tests/test_event_bus.py::test_real_kafka_delivery_commit_and_dlq SKIPPED [ 41%]
tests/test_event_bus.py::test_idle_timer_flushes_even_when_later_polls_fail PASSED [ 42%]
tests/test_hardening.py::test_body_limit_and_safe_errors PASSED          [ 42%]
tests/test_hardening.py::test_chunked_body_cannot_bypass_limit PASSED    [ 42%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[*] PASSED   [ 42%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[https://*.example.com] PASSED [ 43%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[https://user:pass@example.com] PASSED [ 43%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[https://example.com/path] PASSED [ 43%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[] PASSED    [ 44%]
tests/test_hardening.py::test_production_accepts_exact_origin PASSED     [ 44%]
tests/test_hardening.py::test_all_kubernetes_containers_have_security_and_resources PASSED [ 44%]
tests/test_hardening.py::test_network_policy_default_deny_and_exact_dependency_ports PASSED [ 45%]
tests/test_hardening.py::test_slow_request_body_returns_408 PASSED       [ 45%]
tests/test_hardening.py::test_kafka_constructor_uses_supported_bounded_timeouts PASSED [ 45%]
tests/test_hardening.py::test_cors_setting_is_configmap_data_not_object_metadata PASSED [ 45%]
tests/test_hardening.py::test_frontend_build_excludes_local_secrets_and_artifacts PASSED [ 46%]
tests/test_health_route.py::test_health_endpoint_includes_total_urls PASSED [ 46%]
tests/test_llm.py::test_fake_deterministic_and_factory PASSED            [ 46%]
tests/test_llm.py::test_recorded_contracts[GeminiProvider-reply0] PASSED [ 47%]
tests/test_llm.py::test_recorded_contracts[OllamaProvider-reply1] PASSED [ 47%]
tests/test_llm.py::test_recorded_contracts[ClaudeProvider-reply2] PASSED [ 47%]
tests/test_llm.py::test_backoff_jitter_and_budget_per_attempt[429] PASSED [ 47%]
tests/test_llm.py::test_backoff_jitter_and_budget_per_attempt[500] PASSED [ 48%]
tests/test_llm.py::test_backoff_jitter_and_budget_per_attempt[503] PASSED [ 48%]
tests/test_llm.py::test_single_schema_repair[not JSON] PASSED            [ 48%]
tests/test_llm.py::test_single_schema_repair[{"safe":"true"}] PASSED     [ 49%]
tests/test_llm.py::test_single_schema_repair[{"safe":true,"extra":1}] PASSED [ 49%]
tests/test_llm.py::test_bad_envelope_repaired_once PASSED                [ 49%]
tests/test_llm.py::test_invalid_output_does_not_leak PASSED              [ 50%]
tests/test_llm.py::test_transport_errors_sanitized_no_retry[failure0] PASSED [ 50%]
tests/test_llm.py::test_transport_errors_sanitized_no_retry[failure1] PASSED [ 50%]
tests/test_llm.py::test_bounded_failures[400-1] PASSED                   [ 50%]
tests/test_llm.py::test_bounded_failures[401-1] PASSED                   [ 51%]
tests/test_llm.py::test_bounded_failures[302-1] PASSED                   [ 51%]
tests/test_llm.py::test_bounded_failures[429-3] PASSED                   [ 51%]
tests/test_llm.py::test_bounded_failures[503-3] PASSED                   [ 52%]
tests/test_llm.py::test_budget_includes_repairs_and_is_shared PASSED     [ 52%]
tests/test_llm.py::test_budget_resets_next_utc_day_and_zero_disables PASSED [ 52%]
tests/test_llm.py::test_global_concurrency_across_instances PASSED       [ 52%]
tests/test_llm.py::test_capacity_timeout_does_not_spend_budget PASSED    [ 53%]
tests/test_llm.py::test_missing_configuration[GeminiProvider-GEMINI_API_KEY] PASSED [ 53%]
tests/test_llm.py::test_missing_configuration[ClaudeProvider-ANTHROPIC_API_KEY] PASSED [ 53%]
tests/test_llm.py::test_missing_configuration[OllamaProvider-OLLAMA_MODEL] PASSED [ 54%]
tests/test_llm.py::test_ollama_remote_or_credential_url_rejected[https://ollama.com] PASSED [ 54%]
tests/test_llm.py::test_ollama_remote_or_credential_url_rejected[http://user:secret@localhost:11434] PASSED [ 54%]
tests/test_llm.py::test_ollama_remote_or_credential_url_rejected[http://localhost:11434?key=secret] PASSED [ 54%]
tests/test_llm.py::test_attempt_metrics PASSED                           [ 55%]
tests/test_llm.py::test_http_privacy_suppresses_instrumentation PASSED   [ 55%]
tests/test_llm.py::test_oversized_response_rejected PASSED               [ 55%]
tests/test_llm.py::test_deadline_checked_between_chunks PASSED           [ 56%]
tests/test_llm.py::test_cloud_model_rejected PASSED                      [ 56%]
tests/test_llm.py::test_budget_reservations_atomic PASSED                [ 56%]
tests/test_migrations.py::test_migrations_on_empty_sqlite PASSED         [ 57%]
tests/test_migrations.py::test_offline_sql_uses_postgresql_settings PASSED [ 57%]
tests/test_migrations.py::test_postgresql_upgrade_schema_constraints_and_downgrade SKIPPED [ 57%]
tests/test_migrations.py::test_legacy_schema_can_be_stamped_and_upgraded SKIPPED [ 57%]
tests/test_observability.py::test_w3c_event_roundtrip_and_invalid_context_isolation PASSED [ 58%]
tests/test_observability.py::test_json_log_has_active_trace_and_no_secrets[api] PASSED [ 58%]
tests/test_observability.py::test_json_log_has_active_trace_and_no_secrets[worker] PASSED [ 58%]
tests/test_observability.py::test_json_log_has_active_trace_and_no_secrets[abuse-worker] PASSED [ 59%]
tests/test_observability.py::test_privacy_export_boundary_for_every_process[api] PASSED [ 59%]
tests/test_observability.py::test_privacy_export_boundary_for_every_process[worker] PASSED [ 59%]
tests/test_observability.py::test_privacy_export_boundary_for_every_process[abuse-worker] PASSED [ 59%]
tests/test_observability.py::test_redirect_publish_consume_sql_share_one_trace PASSED [ 60%]
tests/test_observability.py::test_init_instruments_existing_engine_and_uses_configured_otlp PASSED [ 60%]
tests/test_rate_limiter.py::test_bucket_burst_refill_and_identity_isolation PASSED [ 60%]
tests/test_rate_limiter.py::test_bucket_concurrent_burst PASSED          [ 61%]
tests/test_rate_limiter.py::test_bucket_error_and_clock_regression PASSED [ 61%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[198.51.100.5-1.2.3.4-trusted0-198.51.100.5] PASSED [ 61%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[198.51.100.5-1.2.3.4-trusted1-198.51.100.5] PASSED [ 61%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[10.0.0.1-198.51.100.5-trusted2-198.51.100.5] PASSED [ 62%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[10.0.0.1-1.2.3.4, 198.51.100.5-trusted3-198.51.100.5] PASSED [ 62%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[10.0.0.1-198.51.100.5, 10.0.0.2-trusted4-198.51.100.5] PASSED [ 62%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[::1-2001:db8::1-trusted5-2001:db8::1] PASSED [ 63%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[10.0.0.1-garbage-trusted6-10.0.0.1] PASSED [ 63%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[get-ConnectionError] PASSED [ 63%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[get-TimeoutError] PASSED [ 64%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[ping-ConnectionError] PASSED [ 64%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[ping-TimeoutError] PASSED [ 64%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[dbsize-ConnectionError] PASSED [ 64%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[dbsize-TimeoutError] PASSED [ 65%]
tests/test_redis_client.py::test_programming_errors_are_not_hidden PASSED [ 65%]
tests/test_redis_client.py::test_normal_cache_reads[https://example.com/-counter0] PASSED [ 65%]
tests/test_redis_client.py::test_normal_cache_reads[None-counter1] PASSED [ 66%]
tests/test_routes.py::test_create_short_url_returns_service_code PASSED  [ 66%]
tests/test_routes.py::test_redirect_returns_redirect_response PASSED     [ 66%]
tests/test_routes.py::test_redirect_raises_404_for_missing_code PASSED   [ 66%]
tests/test_routes.py::test_analytics_route_uses_service PASSED           [ 67%]
tests/test_routes.py::test_redis_health_success PASSED                   [ 67%]
tests/test_routes.py::test_redis_health_failure PASSED                   [ 67%]
tests/test_slo.py::test_redis_lag_excludes_acknowledged_history_and_reports_retained_dlq PASSED [ 68%]
tests/test_slo.py::test_unknown_redis_lag_does_not_look_healthy PASSED   [ 68%]
tests/test_slo.py::test_kafka_retained_dlq_size_accounts_for_retention PASSED [ 68%]
tests/test_slo.py::test_worker_exports_current_dlq_size PASSED           [ 69%]
tests/test_slo.py::test_provisioned_configmaps_match_canonical_sources PASSED [ 69%]
tests/test_slo.py::test_redirect_slo_selector_captures_5xx_and_excludes_health PASSED [ 69%]
tests/test_slo.py::test_new_kafka_group_lag_starts_at_retained_offset PASSED [ 69%]
tests/test_slo.py::test_headless_metrics_services_include_unready_replicas PASSED [ 70%]
tests/test_slo.py::test_grafana_upgrade_preserves_existing_datasource_identity PASSED [ 70%]
tests/test_tooling_regressions.py::test_typed_models_preserve_column_types_and_nullability PASSED [ 70%]
tests/test_tooling_regressions.py::test_trace_logging_preserves_message_for_default_formatter PASSED [ 71%]
tests/test_tooling_regressions.py::test_worker_reports_unconfigured_database PASSED [ 71%]
tests/test_trace_privacy.py::test_url_spans_only_include_origin_and_code[False] PASSED [ 71%]
tests/test_trace_privacy.py::test_url_spans_only_include_origin_and_code[True] PASSED [ 71%]
tests/test_trace_privacy.py::test_auto_instrumented_redis_does_not_export_cached_url PASSED [ 72%]
tests/test_trace_privacy.py::test_auto_instrumented_http_does_not_export_path_or_query PASSED [ 72%]
tests/test_trace_privacy.py::test_privacy_hooks_redact_instrumentation_attributes PASSED [ 72%]
tests/test_url_features.py::test_reject_unsafe_urls[ftp://example.com] PASSED [ 73%]
tests/test_url_features.py::test_reject_unsafe_urls[javascript:alert(1)] PASSED [ 73%]
tests/test_url_features.py::test_reject_unsafe_urls[https:///path] PASSED [ 73%]
tests/test_url_features.py::test_reject_unsafe_urls[https://] PASSED     [ 73%]
tests/test_url_features.py::test_reject_unsafe_urls[http://user:pass@example.com] PASSED [ 74%]
tests/test_url_features.py::test_reject_unsafe_urls[http://user@example.com] PASSED [ 74%]
tests/test_url_features.py::test_reject_unsafe_urls[http://@example.com] PASSED [ 74%]
tests/test_url_features.py::test_reject_unsafe_urls[http://localhost] PASSED [ 75%]
tests/test_url_features.py::test_reject_unsafe_urls[http://LOCALHOST.] PASSED [ 75%]
tests/test_url_features.py::test_reject_unsafe_urls[http://sub.localhost] PASSED [ 75%]
tests/test_url_features.py::test_reject_unsafe_urls[http://server.local] PASSED [ 76%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.0.0.1] PASSED [ 76%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.9.2.1] PASSED [ 76%]
tests/test_url_features.py::test_reject_unsafe_urls[http://10.1.2.3] PASSED [ 76%]
tests/test_url_features.py::test_reject_unsafe_urls[http://172.16.2.3] PASSED [ 77%]
tests/test_url_features.py::test_reject_unsafe_urls[http://192.168.1.1] PASSED [ 77%]
tests/test_url_features.py::test_reject_unsafe_urls[http://169.254.169.254] PASSED [ 77%]
tests/test_url_features.py::test_reject_unsafe_urls[http://0.0.0.0] PASSED [ 78%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::1]] PASSED [ 78%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::]] PASSED  [ 78%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fc00::1]] PASSED [ 78%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fd00::1]] PASSED [ 79%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fe80::1]] PASSED [ 79%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::ffff:127.0.0.1]] PASSED [ 79%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::ffff:192.168.0.1]] PASSED [ 80%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fe80::1%25eth0]] PASSED [ 80%]
tests/test_url_features.py::test_reject_unsafe_urls[http://2130706433] PASSED [ 80%]
tests/test_url_features.py::test_reject_unsafe_urls[http://0x7f000001] PASSED [ 80%]
tests/test_url_features.py::test_reject_unsafe_urls[http://0177.0.0.1] PASSED [ 81%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.1] PASSED [ 81%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.0.0.1.] PASSED [ 81%]
tests/test_url_features.py::test_reject_unsafe_urls[http://%6cocalhost] PASSED [ 82%]
tests/test_url_features.py::test_reject_unsafe_urls[http://localHOST\u3002] PASSED [ 82%]
tests/test_url_features.py::test_reject_unsafe_urls[http://example.com\\@127.0.0.1] PASSED [ 82%]
tests/test_url_features.py::test_reject_unsafe_urls[http://exam\nple.com] PASSED [ 83%]
tests/test_url_features.py::test_reject_unsafe_urls[http://bad_host.com] PASSED [ 83%]
tests/test_url_features.py::test_reject_unsafe_urls[http://-bad.example] PASSED [ 83%]
tests/test_url_features.py::test_reject_unsafe_urls[https://example.com/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx] PASSED [ 83%]
tests/test_url_features.py::test_normalize_public_hosts[https://EXAMPLE.COM./a?b=1-example.com] PASSED [ 84%]
tests/test_url_features.py::test_normalize_public_hosts[http://b\xfccher.de/a-xn--bcher-kva.de] PASSED [ 84%]
tests/test_url_features.py::test_normalize_public_hosts[https://8.8.8.8/a-8.8.8.8] PASSED [ 84%]
tests/test_url_features.py::test_normalize_public_hosts[http://[2606:4700:4700::1111]/-[2606:4700:4700::1111]] PASSED [ 85%]
tests/test_url_features.py::test_normalize_public_hosts[https://localhost.example.com/-localhost.example.com] PASSED [ 85%]
tests/test_url_features.py::test_maximum_url_length PASSED               [ 85%]
tests/test_url_features.py::test_invalid_alias[ab] PASSED                [ 85%]
tests/test_url_features.py::test_invalid_alias[aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa] PASSED [ 86%]
tests/test_url_features.py::test_invalid_alias[] PASSED                  [ 86%]
tests/test_url_features.py::test_invalid_alias[a/b] PASSED               [ 86%]
tests/test_url_features.py::test_invalid_alias[a.b] PASSED               [ 87%]
tests/test_url_features.py::test_invalid_alias[a b] PASSED               [ 87%]
tests/test_url_features.py::test_invalid_alias[\xe9\xe9\xe9] PASSED      [ 87%]
tests/test_url_features.py::test_invalid_alias[api] PASSED               [ 88%]
tests/test_url_features.py::test_invalid_alias[Health] PASSED            [ 88%]
tests/test_url_features.py::test_invalid_alias[METRICS] PASSED           [ 88%]
tests/test_url_features.py::test_invalid_alias[docs] PASSED              [ 88%]
tests/test_url_features.py::test_invalid_alias[admin] PASSED             [ 89%]
tests/test_url_features.py::test_invalid_alias[shorten] PASSED           [ 89%]
tests/test_url_features.py::test_invalid_alias[livez] PASSED             [ 89%]
tests/test_url_features.py::test_invalid_alias[urls] PASSED              [ 90%]
tests/test_url_features.py::test_invalid_alias[analytics] PASSED         [ 90%]
tests/test_url_features.py::test_invalid_alias[redoc] PASSED             [ 90%]
tests/test_url_features.py::test_valid_alias[abc] PASSED                 [ 90%]
tests/test_url_features.py::test_valid_alias[A_9-x] PASSED               [ 91%]
tests/test_url_features.py::test_valid_alias[aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa] PASSED [ 91%]
tests/test_url_features.py::test_invalid_expiry[2020-01-01T00:00:00Z] PASSED [ 91%]
tests/test_url_features.py::test_invalid_expiry[2099-01-01T00:00:00] PASSED [ 92%]
tests/test_url_features.py::test_invalid_expiry[nonsense] PASSED         [ 92%]
tests/test_url_features.py::test_invalid_expiry[9999999999] PASSED       [ 92%]
tests/test_url_features.py::test_expiry_normalized_to_utc PASSED         [ 92%]
tests/test_url_features.py::test_alias_create_conflict_delete_and_list PASSED [ 93%]
tests/test_url_features.py::test_expired_cache_hit_returns_410 PASSED    [ 93%]
tests/test_url_features.py::test_api_validation_is_422[payload0] PASSED  [ 93%]
tests/test_url_features.py::test_api_validation_is_422[payload1] PASSED  [ 94%]
tests/test_url_features.py::test_api_validation_is_422[payload2] PASSED  [ 94%]
tests/test_url_features.py::test_api_validation_is_422[payload3] PASSED  [ 94%]
tests/test_url_features.py::test_missing_delete_and_redirect PASSED      [ 95%]
tests/test_url_features.py::test_openapi_documents_fields_and_statuses PASSED [ 95%]
tests/test_url_features.py::test_cache_absolute_deadline_and_eviction PASSED [ 95%]
tests/test_url_features.py::test_multicast_rejected[http://224.0.0.1] PASSED [ 95%]
tests/test_url_features.py::test_multicast_rejected[http://[ff02::1]] PASSED [ 96%]
tests/test_url_features.py::test_numeric_string_expiry_rejected PASSED   [ 96%]
tests/test_url_features.py::test_no_redirect_if_expiry_passes_during_click_publication PASSED [ 96%]
tests/test_url_features.py::test_cache_not_used_when_database_fails PASSED [ 97%]
tests/test_url_features.py::test_far_expiry_cache_is_capped_at_jittered_ttl PASSED [ 97%]
tests/test_url_features.py::test_postgresql_alias_races_and_delete_lock SKIPPED [ 97%]
tests/test_url_features.py::test_alias_is_case_sensitive PASSED          [ 97%]
tests/test_url_features.py::test_expiry_equal_to_now_is_rejected PASSED  [ 98%]
tests/test_url_features.py::test_subsecond_remaining_lifetime_does_not_populate_cache PASSED [ 98%]
tests/test_url_repository.py::test_url_repository_create_with_code_and_lookup PASSED [ 98%]
tests/test_url_service.py::test_shorten_creates_code_and_commits PASSED  [ 99%]
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
app/abuse/__init__.py                          0      0   100%
app/abuse/classifier.py                       45      0   100%
app/abuse/heuristics.py                       61      0   100%
app/abuse/persistence.py                      47      3    94%   46-47, 68
app/abuse/schemas.py                          19      0   100%
app/api/__init__.py                            0      0   100%
app/api/auth.py                               33      0   100%
app/api/routes.py                            125      3    98%   109-110, 175
app/cache/__init__.py                          0      0   100%
app/cache/circuit_breaker.py                  49      1    98%   57
app/cache/redis_client.py                     94     16    83%   30, 33, 36, 39, 42, 47-48, 57-59, 145-146, 153-154, 161-162
app/cache/singleflight.py                     37      1    97%   34
app/cli.py                                    66     10    85%   30-32, 80, 98, 102-106, 110
app/core/__init__.py                           0      0   100%
app/core/config.py                            84     15    82%   17, 19, 34, 41, 44, 51, 69, 80, 84, 86, 98, 106, 131, 133, 136
app/db/__init__.py                             0      0   100%
app/db/database.py                            17      6    65%   33-39
app/events/__init__.py                        13      1    92%   18
app/events/base.py                            12      0   100%
app/events/kafka.py                           58      9    84%   17-20, 27, 39, 51, 64, 67, 77
app/events/memory.py                          49      0   100%
app/events/models.py                          35      1    97%   67
app/events/publisher.py                       78      5    94%   52, 60-61, 104-105
app/events/redis_streams.py                   52      4    92%   86, 141-143
app/kafka/__init__.py                          0      0   100%
app/kafka/consumer.py                          4      0   100%
app/kafka/producer.py                          7      1    86%   9
app/llm/__init__.py                            5      0   100%
app/llm/base.py                               26      0   100%
app/llm/limits.py                             26      1    96%   14
app/llm/providers.py                         153     10    93%   83, 109, 114, 155, 162, 176, 208-209, 294-295
app/main.py                                   48      8    83%   46-47, 62-63, 66, 84-86
app/middleware/hardening.py                   47      2    96%   30, 50
app/middleware/rate_limiter.py                81      1    99%   89
app/models/__init__.py                         0      0   100%
app/models/analytics.py                       11      0   100%
app/models/api_key.py                         14      0   100%
app/models/url.py                             14      0   100%
app/models/url_verdict.py                     23      0   100%
app/observability/context.py                  27      0   100%
app/observability/logging.py                  46      5    89%   60, 73-76
app/observability/metrics.py                  51      0   100%
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
app/services/url_service.py                  151      9    94%   36-37, 64, 69, 74, 157, 165, 235-236
app/utils/__init__.py                          0      0   100%
app/utils/base62.py                            9      0   100%
app/workers/__init__.py                        0      0   100%
app/workers/abuse_worker.py                  107     16    85%   136-142, 150-161, 165
app/workers/analytics_worker.py              122     10    92%   184-193, 197
------------------------------------------------------------------------
TOTAL                                       2217    146    93%
Coverage XML written to file coverage.xml
================= 332 passed, 10 skipped, 5 warnings in 11.95s =================
sh scripts/check-prometheus.sh
Checking rules/slo.yml
  SUCCESS: 22 rules found

  SUCCESS

```

### make frontend-check

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

added 782 packages in 11s
npm notice
npm notice New major version of npm available! 10.9.2 -> 12.2.1
npm notice Changelog: https://github.com/npm/cli/releases/tag/v12.2.1
npm notice To update run: npm install -g npm@12.2.1
npm notice
cd frontend && npm run lint -- --max-warnings=0

> url-shortener-frontend@0.1.0 lint
> next lint --max-warnings=0

✔ No ESLint warnings or errors
cd frontend && npm test

> url-shortener-frontend@0.1.0 test
> node --test tests/*.test.cjs

✔ protected reads and writes send only the in-memory key (41.945ms)
✔ public health omits the key and forgetting removes it from requests (10.259292ms)
✔ a fresh client has no persisted key (16.109541ms)
✔ flagged list and review use admin key, encoded code and bounded fetch (6.613166ms)
✔ production security headers cover every route without eval or wildcard origins (1.592209ms)
ℹ tests 5
ℹ suites 0
ℹ pass 5
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 237.612334
cd frontend && ./node_modules/.bin/tsc --noEmit --incremental false
```

### make mcp-test

```text
cd mcp-server && /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m pytest
..........                                                               [100%]
10 passed in 2.96s
```

### Disposable PostgreSQL tests

```text
============================= test session starts ==============================
platform darwin -- Python 3.11.14, pytest-9.0.3, pluggy-1.7.0
rootdir: /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener
configfile: pytest.ini
plugins: platformdirs-4.13.0, cov-7.1.0, anyio-4.15.1
collected 5 items

tests/test_abuse.py .                                                    [ 20%]
tests/test_migrations.py ....                                            [100%]

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
======================== 5 passed, 5 warnings in 8.22s =========================
```

### Runtime smoke

```text
PASS: read-only non-root image, migration, durable outbox, Redis Streams worker, three verdicts, block and admin allow
```

### Kubernetes client dry-run

```text
deployment.apps/abuse-worker created (dry run)
service/abuse-worker created (dry run)
networkpolicy.networking.k8s.io/abuse-dependencies created (dry run)
networkpolicy.networking.k8s.io/abuse-to-postgres created (dry run)
networkpolicy.networking.k8s.io/abuse-to-redis created (dry run)
networkpolicy.networking.k8s.io/abuse-to-kafka created (dry run)
networkpolicy.networking.k8s.io/abuse-metrics created (dry run)
networkpolicy.networking.k8s.io/prometheus-abuse created (dry run)
configmap/prometheus-config configured (dry run)
service/prometheus configured (dry run)
deployment.apps/prometheus configured (dry run)
persistentvolumeclaim/prometheus-storage created (dry run)
```

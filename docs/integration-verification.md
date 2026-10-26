# Step 5.1 integration verification

Branch: `step-5-1-integration-tests`. Verified 2026-10-26 on macOS Apple Silicon,
CPython 3.11.14 and Docker Desktop engine 27.4.0. No application logic changed.

Default Testcontainers startup failed before tests because Ryuk could not reach
its Docker socket. The first run reported 12 setup errors; a focused retry also
failed (exit 1). A diagnostic privileged helper did not fix it. Runs below used
`TESTCONTAINERS_RYUK_DISABLED=true` explicitly and normal fixture teardown;
container inventory was empty afterward. Default CI configuration keeps Ryuk on.
This workaround is a limitation of local verification, not a claim that the
unmodified local command passed. See [testing.md](testing.md).

The final default combined gate passed 373 tests with 93.64% coverage and its
93.6% floor. Optional Kafka passed too (374 tests, 93.86% before installing the
floor). Ten legacy `docker` tests were deselected because the new suite exercises
those contracts with Testcontainers; the default target also deselects Kafka.
Warnings concern upstream deprecated wait strategies, Starlette BlockingPortal,
and existing FastAPI on_event hooks. Frontend unchanged: frontend-check was not
run. No live LLM/remote API inference was performed. CI itself was not run here.

The following are complete captured command outputs (successful exit status 0).

## make check

```text
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m black --check app/ eval/ tests/integration/
All done! ✨ 🍰 ✨
71 files would be left unchanged.
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m isort --check-only app/ eval/ tests/integration/
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m flake8 app/ eval/ tests/integration/
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m mypy app/ eval/
Success: no issues found in 67 source files
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m pytest -m "not integration and not docker" --cov=app --cov-fail-under=0 --cov-report=term-missing --cov-report=xml
============================= test session starts ==============================
platform darwin -- Python 3.11.14, pytest-9.0.3, pluggy-1.7.0 -- /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python
cachedir: .pytest_cache
rootdir: /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener
configfile: pytest.ini
testpaths: tests
plugins: platformdirs-4.13.0, cov-7.1.0, anyio-4.15.1
collecting ... collected 384 items / 23 deselected / 361 selected

tests/test_abuse.py::test_each_heuristic[https://8.8.8.8/-ip_literal] PASSED [  0%]
tests/test_abuse.py::test_each_heuristic[https://[2606:4700:4700::1111]/-ip_literal] PASSED [  0%]
tests/test_abuse.py::test_each_heuristic[https://xn--bcher-kva.de/-punycode] PASSED [  0%]
tests/test_abuse.py::test_each_heuristic[https://p\u0430ypal.com/-mixed_script] PASSED [  1%]
tests/test_abuse.py::test_each_heuristic[https://a.b.c.d.example.com/-deep_subdomains] PASSED [  1%]
tests/test_abuse.py::test_each_heuristic[https://example.zip/-suspicious_tld] PASSED [  1%]
tests/test_abuse.py::test_each_heuristic[https://example.com/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-long_url] PASSED [  1%]
tests/test_abuse.py::test_each_heuristic[https://example.com/123456789012-many_digits] PASSED [  2%]
tests/test_abuse.py::test_each_heuristic[https://example.com/----------------many_specials] PASSED [  2%]
tests/test_abuse.py::test_each_heuristic[https://paypal.attacker.com/-brand_subdomain] PASSED [  2%]
tests/test_abuse.py::test_each_heuristic[https://bit.ly/abc-shortener_chain] PASSED [  3%]
tests/test_abuse.py::test_each_heuristic[https://example.com/%6Cogin-credential_path] PASSED [  3%]
tests/test_abuse.py::test_each_heuristic[https://example.com/verify-credential_path] PASSED [  3%]
tests/test_abuse.py::test_each_heuristic[https://example.com/secure-credential_path] PASSED [  3%]
tests/test_abuse.py::test_each_heuristic[https://example.com/update-credential_path] PASSED [  4%]
tests/test_abuse.py::test_registered_domains_and_counts PASSED           [  4%]
tests/test_abuse.py::test_low_high_skip_model PASSED                     [  4%]
tests/test_abuse.py::test_gray_zone_and_domain_cache PASSED              [  4%]
tests/test_abuse.py::test_invalid_schema_suspicious[oops] PASSED         [  5%]
tests/test_abuse.py::test_invalid_schema_suspicious[{"verdict":"clean","confidence":1,"reasons":["anything"]}] PASSED [  5%]
tests/test_abuse.py::test_invalid_schema_suspicious[{"verdict":"clean","confidence":2,"reasons":["llm_uncertain"]}] PASSED [  5%]
tests/test_abuse.py::test_invalid_schema_suspicious[{"verdict":"clean","confidence":1,"reasons":["llm_uncertain"],"tool":"fetch"}] PASSED [  6%]
tests/test_abuse.py::test_budget_unavailable_is_reviewable PASSED        [  6%]
tests/test_abuse.py::test_injection_quoted_capped_and_cannot_clear_heuristic PASSED [  6%]
tests/test_abuse.py::test_outbox_publish_duplicate_and_commit_before_ack PASSED [  6%]
tests/test_abuse.py::test_outbox_rollback_when_commit_fails PASSED       [  7%]
tests/test_abuse.py::test_relay_failure_retains_outbox PASSED            [  7%]
tests/test_abuse.py::test_failed_verdict_commit_is_not_acked PASSED      [  7%]
tests/test_abuse.py::test_malformed_goes_to_dlq_before_ack PASSED        [  8%]
tests/test_abuse.py::test_enforcement_on_warm_cache_and_review PASSED    [  8%]
tests/test_abuse.py::test_suspicious_redirect_and_deleted_precedence PASSED [  8%]
tests/test_abuse.py::test_redis_failure_does_not_skip_analysis PASSED    [  8%]
tests/test_abuse.py::test_invalid_cached_result_recomputed PASSED        [  9%]
tests/test_abuse.py::test_worker_run_metrics_and_shutdown PASSED         [  9%]
tests/test_abuse.py::test_store_does_not_replace_review PASSED           [  9%]
tests/test_abuse.py::test_missing_deleted_events_ack_without_classification PASSED [  9%]
tests/test_abuse.py::test_schema_and_new_services PASSED                 [ 10%]
tests/test_abuse_eval.py::test_combined_fake_regression PASSED           [ 10%]
tests/test_abuse_eval.py::test_fixture_provenance_and_counts PASSED      [ 10%]
tests/test_abuse_eval.py::test_splits_stable_grouped_and_limit_does_not_change_membership PASSED [ 11%]
tests/test_abuse_eval.py::test_loader_rejects_bad_rows_without_echo[url,label\nhttps://example.com,unknown\n] PASSED [ 11%]
tests/test_abuse_eval.py::test_loader_rejects_bad_rows_without_echo[label,url\nbenign,https://example.com\n] PASSED [ 11%]
tests/test_abuse_eval.py::test_loader_rejects_bad_rows_without_echo[url,label\nhttps://user:secret@example.com,benign\n] PASSED [ 11%]
tests/test_abuse_eval.py::test_loader_rejects_bad_rows_without_echo[url,label\nhttps://example.com,benign\nhttps://example.com,malicious\n] PASSED [ 12%]
tests/test_abuse_eval.py::test_loader_rejects_bad_rows_without_echo[url,label\nhttps://example.com\n] PASSED [ 12%]
tests/test_abuse_eval.py::test_loader_rejects_bad_rows_without_echo[url,label\nfile:///tmp/private,benign\n] PASSED [ 12%]
tests/test_abuse_eval.py::test_loader_deduplicates_and_does_not_recurse PASSED [ 13%]
tests/test_abuse_eval.py::test_metric_arithmetic_and_undefined_values PASSED [ 13%]
tests/test_abuse_eval.py::test_variants_and_constant_fake_have_no_label_access PASSED [ 13%]
tests/test_abuse_eval.py::test_budget_failures_are_reported_not_hidden PASSED [ 13%]
tests/test_abuse_eval.py::test_reported_tokens_and_missing_metadata PASSED [ 14%]
tests/test_abuse_eval.py::test_runner_writes_both_formats_without_urls PASSED [ 14%]
tests/test_abuse_eval.py::test_dev_run_is_explicitly_marked PASSED       [ 14%]
tests/test_analytics_repository.py::test_batch_create_clicks_uses_single_execute_call PASSED [ 14%]
tests/test_analytics_repository.py::test_batch_create_clicks_returns_zero_for_empty_list PASSED [ 15%]
tests/test_analytics_repository.py::test_analytics_repository_count_and_timestamps PASSED [ 15%]
tests/test_analytics_service.py::test_get_analytics_uses_repository_results PASSED [ 15%]
tests/test_app_assembly.py::test_middleware_and_metrics PASSED           [ 16%]
tests/test_app_assembly.py::test_cors_preflight PASSED                   [ 16%]
tests/test_app_assembly.py::test_rate_limiter_is_registered PASSED       [ 16%]
tests/test_app_assembly.py::test_main_routes PASSED                      [ 16%]
tests/test_app_assembly.py::test_service_failures_are_503[/urls-service0-list_recent_urls] PASSED [ 17%]
tests/test_app_assembly.py::test_service_failures_are_503[/analytics/code-service1-get_analytics] PASSED [ 17%]
tests/test_app_assembly.py::test_health_dependency_failures[db] PASSED   [ 17%]
tests/test_app_assembly.py::test_health_dependency_failures[redis] PASSED [ 18%]
tests/test_app_assembly.py::test_health_dependency_failures[both] PASSED [ 18%]
tests/test_app_assembly.py::test_false_redis_ping_is_unhealthy PASSED    [ 18%]
tests/test_app_assembly.py::test_livez_does_not_touch_dependencies PASSED [ 18%]
tests/test_app_assembly.py::test_redirect_falls_back_on_redis_read_failure[ConnectionError] PASSED [ 19%]
tests/test_app_assembly.py::test_redirect_falls_back_on_redis_read_failure[TimeoutError] PASSED [ 19%]
tests/test_app_assembly.py::test_redis_health_read_failures[ping] PASSED [ 19%]
tests/test_app_assembly.py::test_redis_health_read_failures[dbsize] PASSED [ 19%]
tests/test_app_assembly.py::test_health_session_acquisition_failure PASSED [ 20%]
tests/test_app_assembly.py::test_health_session_is_closed PASSED         [ 20%]
tests/test_app_assembly.py::test_stopped_redis_never_makes_redirect_5xx_and_health_reports_breaker PASSED [ 20%]
tests/test_auth.py::test_key_hashing_metadata_and_revocation PASSED      [ 21%]
tests/test_auth.py::test_key_invalid_creation[-scopes0] PASSED           [ 21%]
tests/test_auth.py::test_key_invalid_creation[ok-scopes1] PASSED         [ 21%]
tests/test_auth.py::test_key_invalid_creation[ok-scopes2] PASSED         [ 21%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-POST-/shorten] PASSED [ 22%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-DELETE-/urls/code] PASSED [ 22%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-GET-/urls] PASSED [ 22%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-GET-/analytics/code] PASSED [ 22%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-GET-/admin/keys] PASSED [ 23%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-DELETE-/admin/keys/1] PASSED [ 23%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-POST-/shorten] PASSED [ 23%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-DELETE-/urls/code] PASSED [ 24%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-GET-/urls] PASSED [ 24%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-GET-/analytics/code] PASSED [ 24%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-GET-/admin/keys] PASSED [ 24%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-DELETE-/admin/keys/1] PASSED [ 25%]
tests/test_auth.py::test_scope_enforcement_and_creator PASSED            [ 25%]
tests/test_auth.py::test_public_endpoints_and_openapi PASSED             [ 25%]
tests/test_auth.py::test_auth_database_failure_is_503 PASSED             [ 26%]
tests/test_auth.py::test_write_limits_and_key_isolation PASSED           [ 26%]
tests/test_auth.py::test_delete_uses_template_bucket_not_code PASSED     [ 26%]
tests/test_auth.py::test_redirects_share_ip_bucket_and_ignore_spoofed_headers PASSED [ 26%]
tests/test_auth.py::test_redis_failure_closes_writes_but_not_redirects PASSED [ 27%]
tests/test_auth.py::test_internal_metrics_not_exposed_on_api_port PASSED [ 27%]
tests/test_auth.py::test_cli_prints_key_once_and_never_lists_hash PASSED [ 27%]
tests/test_base62.py::test_encode_base62_zero_returns_empty_string PASSED [ 27%]
tests/test_base62.py::test_encode_base62_small_numbers PASSED            [ 28%]
tests/test_base62.py::test_encode_base62_larger_number PASSED            [ 28%]
tests/test_cache_strategy.py::test_circuit_open_half_open_closed_and_failed_probe PASSED [ 28%]
tests/test_cache_strategy.py::test_only_one_half_open_probe_and_stale_success_cannot_close PASSED [ 29%]
tests/test_cache_strategy.py::test_success_resets_consecutive_failures PASSED [ 29%]
tests/test_cache_strategy.py::test_client_timeout_and_retry_configuration PASSED [ 29%]
tests/test_cache_strategy.py::test_ttl_jitter_bounds_and_absolute_expiry PASSED [ 29%]
tests/test_cache_strategy.py::test_many_cold_requests_share_one_database_read[False] PASSED [ 30%]
tests/test_cache_strategy.py::test_many_cold_requests_share_one_database_read[True] PASSED [ 30%]
tests/test_cache_strategy.py::test_cross_process_lock_wait_rechecks_cache PASSED [ 30%]
tests/test_cache_strategy.py::test_negative_caching_and_alias_creation_invalidation PASSED [ 31%]
tests/test_cache_strategy.py::test_alias_creation_fences_an_inflight_negative_fill PASSED [ 31%]
tests/test_cache_strategy.py::test_lock_release_and_publication_require_owner PASSED [ 31%]
tests/test_cache_strategy.py::test_negative_cache_expiry PASSED          [ 31%]
tests/test_cache_strategy.py::test_redis_down_falls_back_and_counts_metric PASSED [ 32%]
tests/test_cache_strategy.py::test_singleflight_timeout_and_exception_cleanup PASSED [ 32%]
tests/test_cache_strategy.py::test_positive_cache_still_checks_deletion_and_database_failure PASSED [ 32%]
tests/test_code_generation.py::test_100000_candidates_are_unique_and_url_safe PASSED [ 32%]
tests/test_code_generation.py::test_production_generator_uses_secrets_choice PASSED [ 33%]
tests/test_code_generation.py::test_collision_retries_preserve_existing_destination PASSED [ 33%]
tests/test_code_generation.py::test_exhaustion_is_bounded_and_leaves_transaction_usable PASSED [ 33%]
tests/test_code_generation.py::test_non_collision_integrity_error_is_not_retried PASSED [ 34%]
tests/test_code_generation.py::test_static_route_names_are_not_allocated PASSED [ 34%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_USER] PASSED [ 34%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_PASSWORD] PASSED [ 34%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_DB] PASSED [ 35%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[GRAFANA_ADMIN_USER] PASSED [ 35%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[GRAFANA_ADMIN_PASSWORD] PASSED [ 35%]
tests/test_deployment_config.py::test_compose_uses_same_database_credentials_for_all_clients PASSED [ 36%]
tests/test_deployment_config.py::test_profile_selects_matching_brokers[kafka] PASSED [ 36%]
tests/test_deployment_config.py::test_profile_selects_matching_brokers[redis-streams] PASSED [ 36%]
tests/test_deployment_config.py::test_kubernetes_metrics_use_internal_port_and_network_policy PASSED [ 36%]
tests/test_event_bus.py::test_duplicate_delivery_one_row_and_commit_before_ack PASSED [ 37%]
tests/test_event_bus.py::test_malformed_or_unknown_version_dlq_after_three_attempts[{broken] PASSED [ 37%]
tests/test_event_bus.py::test_malformed_or_unknown_version_dlq_after_three_attempts[{"schema_version":99,"short_code":"abc123"}] PASSED [ 37%]
tests/test_event_bus.py::test_poison_row_does_not_discard_healthy_batch_rows PASSED [ 37%]
tests/test_event_bus.py::test_database_error_never_acknowledges_or_deadletters PASSED [ 38%]
tests/test_event_bus.py::test_commit_failure_does_not_ack PASSED         [ 38%]
tests/test_event_bus.py::test_dlq_publish_failure_does_not_advance_offset PASSED [ 38%]
tests/test_event_bus.py::test_idle_timer_and_shutdown_flush[False] PASSED [ 39%]
tests/test_event_bus.py::test_idle_timer_and_shutdown_flush[True] PASSED [ 39%]
tests/test_event_bus.py::test_slow_broker_and_full_queue_do_not_block_redirects PASSED [ 39%]
tests/test_event_bus.py::test_kafka_raw_poll_and_explicit_offsets PASSED [ 39%]
tests/test_event_bus.py::test_redis_groups_recover_pending_before_new_reads PASSED [ 40%]
tests/test_event_bus.py::test_memory_groups_and_unacknowledged_recovery PASSED [ 40%]
tests/test_event_bus.py::test_dlq_list_and_replay_preserve_event_id PASSED [ 40%]
tests/test_event_bus.py::test_adapter_selection_without_connecting[memory-InMemoryEventBus] PASSED [ 40%]
tests/test_event_bus.py::test_adapter_selection_without_connecting[kafka-KafkaEventBus] PASSED [ 41%]
tests/test_event_bus.py::test_adapter_selection_without_connecting[redis_streams-RedisStreamsEventBus] PASSED [ 41%]
tests/test_event_bus.py::test_legacy_event_without_id_goes_to_dlq PASSED [ 41%]
tests/test_event_bus.py::test_memory_recovers_more_than_one_batch PASSED [ 42%]
tests/test_event_bus.py::test_idle_timer_flushes_even_when_later_polls_fail PASSED [ 42%]
tests/test_hardening.py::test_body_limit_and_safe_errors PASSED          [ 42%]
tests/test_hardening.py::test_chunked_body_cannot_bypass_limit PASSED    [ 42%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[*] PASSED   [ 43%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[https://*.example.com] PASSED [ 43%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[https://user:pass@example.com] PASSED [ 43%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[https://example.com/path] PASSED [ 44%]
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
tests/test_llm.py::test_invalid_output_does_not_leak PASSED              [ 49%]
tests/test_llm.py::test_transport_errors_sanitized_no_retry[failure0] PASSED [ 50%]
tests/test_llm.py::test_transport_errors_sanitized_no_retry[failure1] PASSED [ 50%]
tests/test_llm.py::test_bounded_failures[400-1] PASSED                   [ 50%]
tests/test_llm.py::test_bounded_failures[401-1] PASSED                   [ 50%]
tests/test_llm.py::test_bounded_failures[302-1] PASSED                   [ 51%]
tests/test_llm.py::test_bounded_failures[429-3] PASSED                   [ 51%]
tests/test_llm.py::test_bounded_failures[503-3] PASSED                   [ 51%]
tests/test_llm.py::test_budget_includes_repairs_and_is_shared PASSED     [ 52%]
tests/test_llm.py::test_budget_resets_next_utc_day_and_zero_disables PASSED [ 52%]
tests/test_llm.py::test_global_concurrency_across_instances PASSED       [ 52%]
tests/test_llm.py::test_capacity_timeout_does_not_spend_budget PASSED    [ 52%]
tests/test_llm.py::test_missing_configuration[GeminiProvider-GEMINI_API_KEY] PASSED [ 53%]
tests/test_llm.py::test_missing_configuration[ClaudeProvider-ANTHROPIC_API_KEY] PASSED [ 53%]
tests/test_llm.py::test_missing_configuration[OllamaProvider-OLLAMA_MODEL] PASSED [ 53%]
tests/test_llm.py::test_ollama_remote_or_credential_url_rejected[https://ollama.com] PASSED [ 54%]
tests/test_llm.py::test_ollama_remote_or_credential_url_rejected[http://user:secret@localhost:11434] PASSED [ 54%]
tests/test_llm.py::test_ollama_remote_or_credential_url_rejected[http://localhost:11434?key=secret] PASSED [ 54%]
tests/test_llm.py::test_attempt_metrics PASSED                           [ 54%]
tests/test_llm.py::test_http_privacy_suppresses_instrumentation PASSED   [ 55%]
tests/test_llm.py::test_oversized_response_rejected PASSED               [ 55%]
tests/test_llm.py::test_deadline_checked_between_chunks PASSED           [ 55%]
tests/test_llm.py::test_cloud_model_rejected PASSED                      [ 55%]
tests/test_llm.py::test_budget_reservations_atomic PASSED                [ 56%]
tests/test_llm.py::test_gemini_paces_retries_repairs_and_shared_instances PASSED [ 56%]
tests/test_llm.py::test_evaluation_retains_only_safe_http_status PASSED  [ 56%]
tests/test_mcp_api_contract.py::test_recorded_api_contract PASSED        [ 57%]
tests/test_mcp_api_contract.py::test_activity_partial_failure PASSED     [ 57%]
tests/test_mcp_api_contract.py::test_signal_code_isolation_and_window PASSED [ 57%]
tests/test_mcp_api_contract.py::test_status_has_no_redirect_side_effect PASSED [ 57%]
tests/test_mcp_api_contract.py::test_admin_auth_required PASSED          [ 58%]
tests/test_mcp_api_contract.py::test_actual_429_only_and_per_code PASSED [ 58%]
tests/test_mcp_api_contract.py::test_rejection_storage_is_independent_and_bounded PASSED [ 58%]
tests/test_mcp_api_contract.py::test_admin_read_scope_is_insufficient PASSED [ 59%]
tests/test_mcp_api_contract.py::test_signal_queries_only_requested_code_and_completed_minutes PASSED [ 59%]
tests/test_mcp_api_contract.py::test_database_failure_not_empty_activity PASSED [ 59%]
tests/test_mcp_api_contract.py::test_status_block_allow_expiry_precedence PASSED [ 59%]
tests/test_migrations.py::test_migrations_on_empty_sqlite PASSED         [ 60%]
tests/test_migrations.py::test_offline_sql_uses_postgresql_settings PASSED [ 60%]
tests/test_observability.py::test_w3c_event_roundtrip_and_invalid_context_isolation PASSED [ 60%]
tests/test_observability.py::test_json_log_has_active_trace_and_no_secrets[api] PASSED [ 60%]
tests/test_observability.py::test_json_log_has_active_trace_and_no_secrets[worker] PASSED [ 61%]
tests/test_observability.py::test_json_log_has_active_trace_and_no_secrets[abuse-worker] PASSED [ 61%]
tests/test_observability.py::test_privacy_export_boundary_for_every_process[api] PASSED [ 61%]
tests/test_observability.py::test_privacy_export_boundary_for_every_process[worker] PASSED [ 62%]
tests/test_observability.py::test_privacy_export_boundary_for_every_process[abuse-worker] PASSED [ 62%]
tests/test_observability.py::test_redirect_publish_consume_sql_share_one_trace PASSED [ 62%]
tests/test_observability.py::test_init_instruments_existing_engine_and_uses_configured_otlp PASSED [ 62%]
tests/test_rate_limiter.py::test_bucket_burst_refill_and_identity_isolation PASSED [ 63%]
tests/test_rate_limiter.py::test_bucket_concurrent_burst PASSED          [ 63%]
tests/test_rate_limiter.py::test_bucket_error_and_clock_regression PASSED [ 63%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[198.51.100.5-1.2.3.4-trusted0-198.51.100.5] PASSED [ 63%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[198.51.100.5-1.2.3.4-trusted1-198.51.100.5] PASSED [ 64%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[10.0.0.1-198.51.100.5-trusted2-198.51.100.5] PASSED [ 64%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[10.0.0.1-1.2.3.4, 198.51.100.5-trusted3-198.51.100.5] PASSED [ 64%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[10.0.0.1-198.51.100.5, 10.0.0.2-trusted4-198.51.100.5] PASSED [ 65%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[::1-2001:db8::1-trusted5-2001:db8::1] PASSED [ 65%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[10.0.0.1-garbage-trusted6-10.0.0.1] PASSED [ 65%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[get-ConnectionError] PASSED [ 65%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[get-TimeoutError] PASSED [ 66%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[ping-ConnectionError] PASSED [ 66%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[ping-TimeoutError] PASSED [ 66%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[dbsize-ConnectionError] PASSED [ 67%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[dbsize-TimeoutError] PASSED [ 67%]
tests/test_redis_client.py::test_programming_errors_are_not_hidden PASSED [ 67%]
tests/test_redis_client.py::test_normal_cache_reads[https://example.com/-counter0] PASSED [ 67%]
tests/test_redis_client.py::test_normal_cache_reads[None-counter1] PASSED [ 68%]
tests/test_routes.py::test_create_short_url_returns_service_code PASSED  [ 68%]
tests/test_routes.py::test_redirect_returns_redirect_response PASSED     [ 68%]
tests/test_routes.py::test_redirect_raises_404_for_missing_code PASSED   [ 68%]
tests/test_routes.py::test_analytics_route_uses_service PASSED           [ 69%]
tests/test_routes.py::test_redis_health_success PASSED                   [ 69%]
tests/test_routes.py::test_redis_health_failure PASSED                   [ 69%]
tests/test_slo.py::test_redis_lag_excludes_acknowledged_history_and_reports_retained_dlq PASSED [ 70%]
tests/test_slo.py::test_unknown_redis_lag_does_not_look_healthy PASSED   [ 70%]
tests/test_slo.py::test_kafka_retained_dlq_size_accounts_for_retention PASSED [ 70%]
tests/test_slo.py::test_worker_exports_current_dlq_size PASSED           [ 70%]
tests/test_slo.py::test_provisioned_configmaps_match_canonical_sources PASSED [ 71%]
tests/test_slo.py::test_redirect_slo_selector_captures_5xx_and_excludes_health PASSED [ 71%]
tests/test_slo.py::test_new_kafka_group_lag_starts_at_retained_offset PASSED [ 71%]
tests/test_slo.py::test_headless_metrics_services_include_unready_replicas PASSED [ 72%]
tests/test_slo.py::test_grafana_upgrade_preserves_existing_datasource_identity PASSED [ 72%]
tests/test_tooling_regressions.py::test_typed_models_preserve_column_types_and_nullability PASSED [ 72%]
tests/test_tooling_regressions.py::test_trace_logging_preserves_message_for_default_formatter PASSED [ 72%]
tests/test_tooling_regressions.py::test_worker_reports_unconfigured_database PASSED [ 73%]
tests/test_trace_privacy.py::test_url_spans_only_include_origin_and_code[False] PASSED [ 73%]
tests/test_trace_privacy.py::test_url_spans_only_include_origin_and_code[True] PASSED [ 73%]
tests/test_trace_privacy.py::test_auto_instrumented_redis_does_not_export_cached_url PASSED [ 73%]
tests/test_trace_privacy.py::test_auto_instrumented_http_does_not_export_path_or_query PASSED [ 74%]
tests/test_trace_privacy.py::test_privacy_hooks_redact_instrumentation_attributes PASSED [ 74%]
tests/test_url_features.py::test_reject_unsafe_urls[ftp://example.com] PASSED [ 74%]
tests/test_url_features.py::test_reject_unsafe_urls[javascript:alert(1)] PASSED [ 75%]
tests/test_url_features.py::test_reject_unsafe_urls[https:///path] PASSED [ 75%]
tests/test_url_features.py::test_reject_unsafe_urls[https://] PASSED     [ 75%]
tests/test_url_features.py::test_reject_unsafe_urls[http://user:pass@example.com] PASSED [ 75%]
tests/test_url_features.py::test_reject_unsafe_urls[http://user@example.com] PASSED [ 76%]
tests/test_url_features.py::test_reject_unsafe_urls[http://@example.com] PASSED [ 76%]
tests/test_url_features.py::test_reject_unsafe_urls[http://localhost] PASSED [ 76%]
tests/test_url_features.py::test_reject_unsafe_urls[http://LOCALHOST.] PASSED [ 77%]
tests/test_url_features.py::test_reject_unsafe_urls[http://sub.localhost] PASSED [ 77%]
tests/test_url_features.py::test_reject_unsafe_urls[http://server.local] PASSED [ 77%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.0.0.1] PASSED [ 77%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.9.2.1] PASSED [ 78%]
tests/test_url_features.py::test_reject_unsafe_urls[http://10.1.2.3] PASSED [ 78%]
tests/test_url_features.py::test_reject_unsafe_urls[http://172.16.2.3] PASSED [ 78%]
tests/test_url_features.py::test_reject_unsafe_urls[http://192.168.1.1] PASSED [ 78%]
tests/test_url_features.py::test_reject_unsafe_urls[http://169.254.169.254] PASSED [ 79%]
tests/test_url_features.py::test_reject_unsafe_urls[http://0.0.0.0] PASSED [ 79%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::1]] PASSED [ 79%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::]] PASSED  [ 80%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fc00::1]] PASSED [ 80%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fd00::1]] PASSED [ 80%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fe80::1]] PASSED [ 80%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::ffff:127.0.0.1]] PASSED [ 81%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::ffff:192.168.0.1]] PASSED [ 81%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fe80::1%25eth0]] PASSED [ 81%]
tests/test_url_features.py::test_reject_unsafe_urls[http://2130706433] PASSED [ 81%]
tests/test_url_features.py::test_reject_unsafe_urls[http://0x7f000001] PASSED [ 82%]
tests/test_url_features.py::test_reject_unsafe_urls[http://0177.0.0.1] PASSED [ 82%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.1] PASSED [ 82%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.0.0.1.] PASSED [ 83%]
tests/test_url_features.py::test_reject_unsafe_urls[http://%6cocalhost] PASSED [ 83%]
tests/test_url_features.py::test_reject_unsafe_urls[http://localHOST\u3002] PASSED [ 83%]
tests/test_url_features.py::test_reject_unsafe_urls[http://example.com\\@127.0.0.1] PASSED [ 83%]
tests/test_url_features.py::test_reject_unsafe_urls[http://exam\nple.com] PASSED [ 84%]
tests/test_url_features.py::test_reject_unsafe_urls[http://bad_host.com] PASSED [ 84%]
tests/test_url_features.py::test_reject_unsafe_urls[http://-bad.example] PASSED [ 84%]
tests/test_url_features.py::test_reject_unsafe_urls[https://example.com/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx] PASSED [ 85%]
tests/test_url_features.py::test_normalize_public_hosts[https://EXAMPLE.COM./a?b=1-example.com] PASSED [ 85%]
tests/test_url_features.py::test_normalize_public_hosts[http://b\xfccher.de/a-xn--bcher-kva.de] PASSED [ 85%]
tests/test_url_features.py::test_normalize_public_hosts[https://8.8.8.8/a-8.8.8.8] PASSED [ 85%]
tests/test_url_features.py::test_normalize_public_hosts[http://[2606:4700:4700::1111]/-[2606:4700:4700::1111]] PASSED [ 86%]
tests/test_url_features.py::test_normalize_public_hosts[https://localhost.example.com/-localhost.example.com] PASSED [ 86%]
tests/test_url_features.py::test_maximum_url_length PASSED               [ 86%]
tests/test_url_features.py::test_invalid_alias[ab] PASSED                [ 86%]
tests/test_url_features.py::test_invalid_alias[aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa] PASSED [ 87%]
tests/test_url_features.py::test_invalid_alias[] PASSED                  [ 87%]
tests/test_url_features.py::test_invalid_alias[a/b] PASSED               [ 87%]
tests/test_url_features.py::test_invalid_alias[a.b] PASSED               [ 88%]
tests/test_url_features.py::test_invalid_alias[a b] PASSED               [ 88%]
tests/test_url_features.py::test_invalid_alias[\xe9\xe9\xe9] PASSED      [ 88%]
tests/test_url_features.py::test_invalid_alias[api] PASSED               [ 88%]
tests/test_url_features.py::test_invalid_alias[Health] PASSED            [ 89%]
tests/test_url_features.py::test_invalid_alias[METRICS] PASSED           [ 89%]
tests/test_url_features.py::test_invalid_alias[docs] PASSED              [ 89%]
tests/test_url_features.py::test_invalid_alias[admin] PASSED             [ 90%]
tests/test_url_features.py::test_invalid_alias[shorten] PASSED           [ 90%]
tests/test_url_features.py::test_invalid_alias[livez] PASSED             [ 90%]
tests/test_url_features.py::test_invalid_alias[urls] PASSED              [ 90%]
tests/test_url_features.py::test_invalid_alias[analytics] PASSED         [ 91%]
tests/test_url_features.py::test_invalid_alias[redoc] PASSED             [ 91%]
tests/test_url_features.py::test_valid_alias[abc] PASSED                 [ 91%]
tests/test_url_features.py::test_valid_alias[A_9-x] PASSED               [ 91%]
tests/test_url_features.py::test_valid_alias[aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa] PASSED [ 92%]
tests/test_url_features.py::test_invalid_expiry[2020-01-01T00:00:00Z] PASSED [ 92%]
tests/test_url_features.py::test_invalid_expiry[2099-01-01T00:00:00] PASSED [ 92%]
tests/test_url_features.py::test_invalid_expiry[nonsense] PASSED         [ 93%]
tests/test_url_features.py::test_invalid_expiry[9999999999] PASSED       [ 93%]
tests/test_url_features.py::test_expiry_normalized_to_utc PASSED         [ 93%]
tests/test_url_features.py::test_alias_create_conflict_delete_and_list PASSED [ 93%]
tests/test_url_features.py::test_expired_cache_hit_returns_410 PASSED    [ 94%]
tests/test_url_features.py::test_api_validation_is_422[payload0] PASSED  [ 94%]
tests/test_url_features.py::test_api_validation_is_422[payload1] PASSED  [ 94%]
tests/test_url_features.py::test_api_validation_is_422[payload2] PASSED  [ 95%]
tests/test_url_features.py::test_api_validation_is_422[payload3] PASSED  [ 95%]
tests/test_url_features.py::test_missing_delete_and_redirect PASSED      [ 95%]
tests/test_url_features.py::test_openapi_documents_fields_and_statuses PASSED [ 95%]
tests/test_url_features.py::test_cache_absolute_deadline_and_eviction PASSED [ 96%]
tests/test_url_features.py::test_multicast_rejected[http://224.0.0.1] PASSED [ 96%]
tests/test_url_features.py::test_multicast_rejected[http://[ff02::1]] PASSED [ 96%]
tests/test_url_features.py::test_numeric_string_expiry_rejected PASSED   [ 96%]
tests/test_url_features.py::test_no_redirect_if_expiry_passes_during_click_publication PASSED [ 97%]
tests/test_url_features.py::test_cache_not_used_when_database_fails PASSED [ 97%]
tests/test_url_features.py::test_far_expiry_cache_is_capped_at_jittered_ttl PASSED [ 97%]
tests/test_url_features.py::test_alias_is_case_sensitive PASSED          [ 98%]
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

Name                                       Stmts   Miss   Cover   Missing
-------------------------------------------------------------------------
app/__init__.py                                0      0 100.00%
app/abuse/__init__.py                          0      0 100.00%
app/abuse/classifier.py                       57      2  96.49%   42, 47
app/abuse/heuristics.py                       61      0 100.00%
app/abuse/persistence.py                      47      3  93.62%   46-47, 68
app/abuse/schemas.py                          19      0 100.00%
app/api/__init__.py                            0      0 100.00%
app/api/auth.py                               33      0 100.00%
app/api/routes.py                            145      4  97.24%   112-113, 178, 215
app/cache/__init__.py                          0      0 100.00%
app/cache/circuit_breaker.py                  49      1  97.96%   57
app/cache/redis_client.py                     94     16  82.98%   30, 33, 36, 39, 42, 47-48, 57-59, 145-146, 153-154, 161-162
app/cache/singleflight.py                     37      1  97.30%   34
app/cli.py                                    66     10  84.85%   30-32, 80, 98, 102-106, 110
app/core/__init__.py                           0      0 100.00%
app/core/config.py                            85     15  82.35%   17, 19, 35, 42, 49, 56, 74, 85, 89, 91, 103, 111, 136, 138, 141
app/db/__init__.py                             0      0 100.00%
app/db/database.py                            17      6  64.71%   33-39
app/events/__init__.py                        13      1  92.31%   18
app/events/base.py                            12      0 100.00%
app/events/kafka.py                           58      9  84.48%   17-20, 27, 39, 51, 64, 67, 77
app/events/memory.py                          49      0 100.00%
app/events/models.py                          35      1  97.14%   67
app/events/publisher.py                       78      5  93.59%   52, 60-61, 104-105
app/events/redis_streams.py                   52      4  92.31%   86, 141-143
app/kafka/__init__.py                          0      0 100.00%
app/kafka/consumer.py                          4      0 100.00%
app/kafka/producer.py                          7      1  85.71%   9
app/llm/__init__.py                            5      0 100.00%
app/llm/base.py                               30      0 100.00%
app/llm/limits.py                             37      1  97.30%   15
app/llm/providers.py                         155     10  93.55%   84, 112, 117, 158, 165, 179, 211-212, 297-298
app/main.py                                   48      8  83.33%   46-47, 62-63, 66, 84-86
app/middleware/hardening.py                   47      2  95.74%   30, 50
app/middleware/rate_limiter.py                88      1  98.86%   90
app/models/__init__.py                         0      0 100.00%
app/models/analytics.py                       11      0 100.00%
app/models/api_key.py                         14      0 100.00%
app/models/url.py                             14      0 100.00%
app/models/url_verdict.py                     23      0 100.00%
app/observability/context.py                  27      0 100.00%
app/observability/logging.py                  46      5  89.13%   60, 73-76
app/observability/metrics.py                  51      0 100.00%
app/observability/privacy.py                  27      1  96.30%   93
app/observability/tracing.py                  47      3  93.62%   72-73, 77
app/repositories/__init__.py                   0      0 100.00%
app/repositories/analytics_repository.py      23      1  95.65%   28
app/repositories/url_repository.py            36      0 100.00%
app/schemas/__init__.py                        0      0 100.00%
app/schemas/url_schema.py                     73      3  95.89%   73, 95, 122
app/services/__init__.py                       0      0 100.00%
app/services/activity_signals.py              39      0 100.00%
app/services/analytics_service.py             13      0 100.00%
app/services/api_keys.py                      43      0 100.00%
app/services/code_generator.py                 9      0 100.00%
app/services/url_service.py                  151      9  94.04%   36-37, 64, 69, 74, 157, 165, 235-236
app/utils/__init__.py                          0      0 100.00%
app/utils/base62.py                            9      0 100.00%
app/workers/__init__.py                        0      0 100.00%
app/workers/abuse_worker.py                  107     16  85.05%   136-142, 150-161, 165
app/workers/analytics_worker.py              122     10  91.80%   184-193, 197
-------------------------------------------------------------------------
TOTAL                                       2313    149  93.56%
Coverage XML written to file coverage.xml
=============== 361 passed, 23 deselected, 5 warnings in 11.86s ================
sh scripts/check-prometheus.sh
Checking rules/slo.yml
  SUCCESS: 22 rules found

  SUCCESS

```

## TESTCONTAINERS_RYUK_DISABLED=true make test-integration

```text
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m pytest --run-integration -m "not slow and not docker" --cov=app --cov-report=term-missing --cov-report=xml --cov-report=json:coverage.json
============================= test session starts ==============================
platform darwin -- Python 3.11.14, pytest-9.0.3, pluggy-1.7.0 -- /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python
cachedir: .pytest_cache
rootdir: /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener
configfile: pytest.ini
testpaths: tests
plugins: platformdirs-4.13.0, cov-7.1.0, anyio-4.15.1
collecting ... collected 384 items / 11 deselected / 373 selected

tests/integration/test_redis_postgres.py::test_migrations_empty_postgres_matches_models PASSED [  0%]
tests/integration/test_redis_postgres.py::test_shorten_redirect_idle_flush_analytics PASSED [  0%]
tests/integration/test_redis_postgres.py::test_expiry_and_deletion_not_served_from_cache PASSED [  0%]
tests/integration/test_redis_postgres.py::test_api_key_scopes_and_revocation PASSED [  1%]
tests/integration/test_redis_postgres.py::test_real_lua_atomic_burst_refill_and_isolation PASSED [  1%]
tests/integration/test_redis_postgres.py::test_http_rate_limit_headers_and_actual_signals PASSED [  1%]
tests/integration/test_redis_postgres.py::test_duplicates_one_row_and_commit_before_ack PASSED [  1%]
tests/integration/test_redis_postgres.py::test_poison_reaches_dlq_after_three_attempts PASSED [  2%]
tests/integration/test_redis_postgres.py::test_pending_message_recovered_by_another_consumer PASSED [  2%]
tests/integration/test_redis_postgres.py::test_worker_shutdown_flushes_batch PASSED [  2%]
tests/integration/test_redis_postgres.py::test_stopped_redis_redirect_falls_back_postgres PASSED [  2%]
tests/integration/test_redis_postgres.py::test_abuse_outbox_worker_review_enforcement_with_fake PASSED [  3%]
tests/test_abuse.py::test_each_heuristic[https://8.8.8.8/-ip_literal] PASSED [  3%]
tests/test_abuse.py::test_each_heuristic[https://[2606:4700:4700::1111]/-ip_literal] PASSED [  3%]
tests/test_abuse.py::test_each_heuristic[https://xn--bcher-kva.de/-punycode] PASSED [  4%]
tests/test_abuse.py::test_each_heuristic[https://p\u0430ypal.com/-mixed_script] PASSED [  4%]
tests/test_abuse.py::test_each_heuristic[https://a.b.c.d.example.com/-deep_subdomains] PASSED [  4%]
tests/test_abuse.py::test_each_heuristic[https://example.zip/-suspicious_tld] PASSED [  4%]
tests/test_abuse.py::test_each_heuristic[https://example.com/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-long_url] PASSED [  5%]
tests/test_abuse.py::test_each_heuristic[https://example.com/123456789012-many_digits] PASSED [  5%]
tests/test_abuse.py::test_each_heuristic[https://example.com/----------------many_specials] PASSED [  5%]
tests/test_abuse.py::test_each_heuristic[https://paypal.attacker.com/-brand_subdomain] PASSED [  5%]
tests/test_abuse.py::test_each_heuristic[https://bit.ly/abc-shortener_chain] PASSED [  6%]
tests/test_abuse.py::test_each_heuristic[https://example.com/%6Cogin-credential_path] PASSED [  6%]
tests/test_abuse.py::test_each_heuristic[https://example.com/verify-credential_path] PASSED [  6%]
tests/test_abuse.py::test_each_heuristic[https://example.com/secure-credential_path] PASSED [  6%]
tests/test_abuse.py::test_each_heuristic[https://example.com/update-credential_path] PASSED [  7%]
tests/test_abuse.py::test_registered_domains_and_counts PASSED           [  7%]
tests/test_abuse.py::test_low_high_skip_model PASSED                     [  7%]
tests/test_abuse.py::test_gray_zone_and_domain_cache PASSED              [  8%]
tests/test_abuse.py::test_invalid_schema_suspicious[oops] PASSED         [  8%]
tests/test_abuse.py::test_invalid_schema_suspicious[{"verdict":"clean","confidence":1,"reasons":["anything"]}] PASSED [  8%]
tests/test_abuse.py::test_invalid_schema_suspicious[{"verdict":"clean","confidence":2,"reasons":["llm_uncertain"]}] PASSED [  8%]
tests/test_abuse.py::test_invalid_schema_suspicious[{"verdict":"clean","confidence":1,"reasons":["llm_uncertain"],"tool":"fetch"}] PASSED [  9%]
tests/test_abuse.py::test_budget_unavailable_is_reviewable PASSED        [  9%]
tests/test_abuse.py::test_injection_quoted_capped_and_cannot_clear_heuristic PASSED [  9%]
tests/test_abuse.py::test_outbox_publish_duplicate_and_commit_before_ack PASSED [  9%]
tests/test_abuse.py::test_outbox_rollback_when_commit_fails PASSED       [ 10%]
tests/test_abuse.py::test_relay_failure_retains_outbox PASSED            [ 10%]
tests/test_abuse.py::test_failed_verdict_commit_is_not_acked PASSED      [ 10%]
tests/test_abuse.py::test_malformed_goes_to_dlq_before_ack PASSED        [ 10%]
tests/test_abuse.py::test_enforcement_on_warm_cache_and_review PASSED    [ 11%]
tests/test_abuse.py::test_suspicious_redirect_and_deleted_precedence PASSED [ 11%]
tests/test_abuse.py::test_redis_failure_does_not_skip_analysis PASSED    [ 11%]
tests/test_abuse.py::test_invalid_cached_result_recomputed PASSED        [ 12%]
tests/test_abuse.py::test_worker_run_metrics_and_shutdown PASSED         [ 12%]
tests/test_abuse.py::test_store_does_not_replace_review PASSED           [ 12%]
tests/test_abuse.py::test_missing_deleted_events_ack_without_classification PASSED [ 12%]
tests/test_abuse.py::test_schema_and_new_services PASSED                 [ 13%]
tests/test_abuse_eval.py::test_combined_fake_regression PASSED           [ 13%]
tests/test_abuse_eval.py::test_fixture_provenance_and_counts PASSED      [ 13%]
tests/test_abuse_eval.py::test_splits_stable_grouped_and_limit_does_not_change_membership PASSED [ 13%]
tests/test_abuse_eval.py::test_loader_rejects_bad_rows_without_echo[url,label\nhttps://example.com,unknown\n] PASSED [ 14%]
tests/test_abuse_eval.py::test_loader_rejects_bad_rows_without_echo[label,url\nbenign,https://example.com\n] PASSED [ 14%]
tests/test_abuse_eval.py::test_loader_rejects_bad_rows_without_echo[url,label\nhttps://user:secret@example.com,benign\n] PASSED [ 14%]
tests/test_abuse_eval.py::test_loader_rejects_bad_rows_without_echo[url,label\nhttps://example.com,benign\nhttps://example.com,malicious\n] PASSED [ 15%]
tests/test_abuse_eval.py::test_loader_rejects_bad_rows_without_echo[url,label\nhttps://example.com\n] PASSED [ 15%]
tests/test_abuse_eval.py::test_loader_rejects_bad_rows_without_echo[url,label\nfile:///tmp/private,benign\n] PASSED [ 15%]
tests/test_abuse_eval.py::test_loader_deduplicates_and_does_not_recurse PASSED [ 15%]
tests/test_abuse_eval.py::test_metric_arithmetic_and_undefined_values PASSED [ 16%]
tests/test_abuse_eval.py::test_variants_and_constant_fake_have_no_label_access PASSED [ 16%]
tests/test_abuse_eval.py::test_budget_failures_are_reported_not_hidden PASSED [ 16%]
tests/test_abuse_eval.py::test_reported_tokens_and_missing_metadata PASSED [ 16%]
tests/test_abuse_eval.py::test_runner_writes_both_formats_without_urls PASSED [ 17%]
tests/test_abuse_eval.py::test_dev_run_is_explicitly_marked PASSED       [ 17%]
tests/test_analytics_repository.py::test_batch_create_clicks_uses_single_execute_call PASSED [ 17%]
tests/test_analytics_repository.py::test_batch_create_clicks_returns_zero_for_empty_list PASSED [ 17%]
tests/test_analytics_repository.py::test_analytics_repository_count_and_timestamps PASSED [ 18%]
tests/test_analytics_service.py::test_get_analytics_uses_repository_results PASSED [ 18%]
tests/test_app_assembly.py::test_middleware_and_metrics PASSED           [ 18%]
tests/test_app_assembly.py::test_cors_preflight PASSED                   [ 19%]
tests/test_app_assembly.py::test_rate_limiter_is_registered PASSED       [ 19%]
tests/test_app_assembly.py::test_main_routes PASSED                      [ 19%]
tests/test_app_assembly.py::test_service_failures_are_503[/urls-service0-list_recent_urls] PASSED [ 19%]
tests/test_app_assembly.py::test_service_failures_are_503[/analytics/code-service1-get_analytics] PASSED [ 20%]
tests/test_app_assembly.py::test_health_dependency_failures[db] PASSED   [ 20%]
tests/test_app_assembly.py::test_health_dependency_failures[redis] PASSED [ 20%]
tests/test_app_assembly.py::test_health_dependency_failures[both] PASSED [ 20%]
tests/test_app_assembly.py::test_false_redis_ping_is_unhealthy PASSED    [ 21%]
tests/test_app_assembly.py::test_livez_does_not_touch_dependencies PASSED [ 21%]
tests/test_app_assembly.py::test_redirect_falls_back_on_redis_read_failure[ConnectionError] PASSED [ 21%]
tests/test_app_assembly.py::test_redirect_falls_back_on_redis_read_failure[TimeoutError] PASSED [ 21%]
tests/test_app_assembly.py::test_redis_health_read_failures[ping] PASSED [ 22%]
tests/test_app_assembly.py::test_redis_health_read_failures[dbsize] PASSED [ 22%]
tests/test_app_assembly.py::test_health_session_acquisition_failure PASSED [ 22%]
tests/test_app_assembly.py::test_health_session_is_closed PASSED         [ 23%]
tests/test_app_assembly.py::test_stopped_redis_never_makes_redirect_5xx_and_health_reports_breaker PASSED [ 23%]
tests/test_auth.py::test_key_hashing_metadata_and_revocation PASSED      [ 23%]
tests/test_auth.py::test_key_invalid_creation[-scopes0] PASSED           [ 23%]
tests/test_auth.py::test_key_invalid_creation[ok-scopes1] PASSED         [ 24%]
tests/test_auth.py::test_key_invalid_creation[ok-scopes2] PASSED         [ 24%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-POST-/shorten] PASSED [ 24%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-DELETE-/urls/code] PASSED [ 24%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-GET-/urls] PASSED [ 25%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-GET-/analytics/code] PASSED [ 25%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-GET-/admin/keys] PASSED [ 25%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-DELETE-/admin/keys/1] PASSED [ 26%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-POST-/shorten] PASSED [ 26%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-DELETE-/urls/code] PASSED [ 26%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-GET-/urls] PASSED [ 26%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-GET-/analytics/code] PASSED [ 27%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-GET-/admin/keys] PASSED [ 27%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-DELETE-/admin/keys/1] PASSED [ 27%]
tests/test_auth.py::test_scope_enforcement_and_creator PASSED            [ 27%]
tests/test_auth.py::test_public_endpoints_and_openapi PASSED             [ 28%]
tests/test_auth.py::test_auth_database_failure_is_503 PASSED             [ 28%]
tests/test_auth.py::test_write_limits_and_key_isolation PASSED           [ 28%]
tests/test_auth.py::test_delete_uses_template_bucket_not_code PASSED     [ 28%]
tests/test_auth.py::test_redirects_share_ip_bucket_and_ignore_spoofed_headers PASSED [ 29%]
tests/test_auth.py::test_redis_failure_closes_writes_but_not_redirects PASSED [ 29%]
tests/test_auth.py::test_internal_metrics_not_exposed_on_api_port PASSED [ 29%]
tests/test_auth.py::test_cli_prints_key_once_and_never_lists_hash PASSED [ 30%]
tests/test_base62.py::test_encode_base62_zero_returns_empty_string PASSED [ 30%]
tests/test_base62.py::test_encode_base62_small_numbers PASSED            [ 30%]
tests/test_base62.py::test_encode_base62_larger_number PASSED            [ 30%]
tests/test_cache_strategy.py::test_circuit_open_half_open_closed_and_failed_probe PASSED [ 31%]
tests/test_cache_strategy.py::test_only_one_half_open_probe_and_stale_success_cannot_close PASSED [ 31%]
tests/test_cache_strategy.py::test_success_resets_consecutive_failures PASSED [ 31%]
tests/test_cache_strategy.py::test_client_timeout_and_retry_configuration PASSED [ 31%]
tests/test_cache_strategy.py::test_ttl_jitter_bounds_and_absolute_expiry PASSED [ 32%]
tests/test_cache_strategy.py::test_many_cold_requests_share_one_database_read[False] PASSED [ 32%]
tests/test_cache_strategy.py::test_many_cold_requests_share_one_database_read[True] PASSED [ 32%]
tests/test_cache_strategy.py::test_cross_process_lock_wait_rechecks_cache PASSED [ 32%]
tests/test_cache_strategy.py::test_negative_caching_and_alias_creation_invalidation PASSED [ 33%]
tests/test_cache_strategy.py::test_alias_creation_fences_an_inflight_negative_fill PASSED [ 33%]
tests/test_cache_strategy.py::test_lock_release_and_publication_require_owner PASSED [ 33%]
tests/test_cache_strategy.py::test_negative_cache_expiry PASSED          [ 34%]
tests/test_cache_strategy.py::test_redis_down_falls_back_and_counts_metric PASSED [ 34%]
tests/test_cache_strategy.py::test_singleflight_timeout_and_exception_cleanup PASSED [ 34%]
tests/test_cache_strategy.py::test_positive_cache_still_checks_deletion_and_database_failure PASSED [ 34%]
tests/test_code_generation.py::test_100000_candidates_are_unique_and_url_safe PASSED [ 35%]
tests/test_code_generation.py::test_production_generator_uses_secrets_choice PASSED [ 35%]
tests/test_code_generation.py::test_collision_retries_preserve_existing_destination PASSED [ 35%]
tests/test_code_generation.py::test_exhaustion_is_bounded_and_leaves_transaction_usable PASSED [ 35%]
tests/test_code_generation.py::test_non_collision_integrity_error_is_not_retried PASSED [ 36%]
tests/test_code_generation.py::test_static_route_names_are_not_allocated PASSED [ 36%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_USER] PASSED [ 36%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_PASSWORD] PASSED [ 36%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_DB] PASSED [ 37%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[GRAFANA_ADMIN_USER] PASSED [ 37%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[GRAFANA_ADMIN_PASSWORD] PASSED [ 37%]
tests/test_deployment_config.py::test_compose_uses_same_database_credentials_for_all_clients PASSED [ 38%]
tests/test_deployment_config.py::test_profile_selects_matching_brokers[kafka] PASSED [ 38%]
tests/test_deployment_config.py::test_profile_selects_matching_brokers[redis-streams] PASSED [ 38%]
tests/test_deployment_config.py::test_kubernetes_metrics_use_internal_port_and_network_policy PASSED [ 38%]
tests/test_event_bus.py::test_duplicate_delivery_one_row_and_commit_before_ack PASSED [ 39%]
tests/test_event_bus.py::test_malformed_or_unknown_version_dlq_after_three_attempts[{broken] PASSED [ 39%]
tests/test_event_bus.py::test_malformed_or_unknown_version_dlq_after_three_attempts[{"schema_version":99,"short_code":"abc123"}] PASSED [ 39%]
tests/test_event_bus.py::test_poison_row_does_not_discard_healthy_batch_rows PASSED [ 39%]
tests/test_event_bus.py::test_database_error_never_acknowledges_or_deadletters PASSED [ 40%]
tests/test_event_bus.py::test_commit_failure_does_not_ack PASSED         [ 40%]
tests/test_event_bus.py::test_dlq_publish_failure_does_not_advance_offset PASSED [ 40%]
tests/test_event_bus.py::test_idle_timer_and_shutdown_flush[False] PASSED [ 41%]
tests/test_event_bus.py::test_idle_timer_and_shutdown_flush[True] PASSED [ 41%]
tests/test_event_bus.py::test_slow_broker_and_full_queue_do_not_block_redirects PASSED [ 41%]
tests/test_event_bus.py::test_kafka_raw_poll_and_explicit_offsets PASSED [ 41%]
tests/test_event_bus.py::test_redis_groups_recover_pending_before_new_reads PASSED [ 42%]
tests/test_event_bus.py::test_memory_groups_and_unacknowledged_recovery PASSED [ 42%]
tests/test_event_bus.py::test_dlq_list_and_replay_preserve_event_id PASSED [ 42%]
tests/test_event_bus.py::test_adapter_selection_without_connecting[memory-InMemoryEventBus] PASSED [ 42%]
tests/test_event_bus.py::test_adapter_selection_without_connecting[kafka-KafkaEventBus] PASSED [ 43%]
tests/test_event_bus.py::test_adapter_selection_without_connecting[redis_streams-RedisStreamsEventBus] PASSED [ 43%]
tests/test_event_bus.py::test_legacy_event_without_id_goes_to_dlq PASSED [ 43%]
tests/test_event_bus.py::test_memory_recovers_more_than_one_batch PASSED [ 43%]
tests/test_event_bus.py::test_idle_timer_flushes_even_when_later_polls_fail PASSED [ 44%]
tests/test_hardening.py::test_body_limit_and_safe_errors PASSED          [ 44%]
tests/test_hardening.py::test_chunked_body_cannot_bypass_limit PASSED    [ 44%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[*] PASSED   [ 45%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[https://*.example.com] PASSED [ 45%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[https://user:pass@example.com] PASSED [ 45%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[https://example.com/path] PASSED [ 45%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[] PASSED    [ 46%]
tests/test_hardening.py::test_production_accepts_exact_origin PASSED     [ 46%]
tests/test_hardening.py::test_all_kubernetes_containers_have_security_and_resources PASSED [ 46%]
tests/test_hardening.py::test_network_policy_default_deny_and_exact_dependency_ports PASSED [ 46%]
tests/test_hardening.py::test_slow_request_body_returns_408 PASSED       [ 47%]
tests/test_hardening.py::test_kafka_constructor_uses_supported_bounded_timeouts PASSED [ 47%]
tests/test_hardening.py::test_cors_setting_is_configmap_data_not_object_metadata PASSED [ 47%]
tests/test_hardening.py::test_frontend_build_excludes_local_secrets_and_artifacts PASSED [ 47%]
tests/test_health_route.py::test_health_endpoint_includes_total_urls PASSED [ 48%]
tests/test_llm.py::test_fake_deterministic_and_factory PASSED            [ 48%]
tests/test_llm.py::test_recorded_contracts[GeminiProvider-reply0] PASSED [ 48%]
tests/test_llm.py::test_recorded_contracts[OllamaProvider-reply1] PASSED [ 49%]
tests/test_llm.py::test_recorded_contracts[ClaudeProvider-reply2] PASSED [ 49%]
tests/test_llm.py::test_backoff_jitter_and_budget_per_attempt[429] PASSED [ 49%]
tests/test_llm.py::test_backoff_jitter_and_budget_per_attempt[500] PASSED [ 49%]
tests/test_llm.py::test_backoff_jitter_and_budget_per_attempt[503] PASSED [ 50%]
tests/test_llm.py::test_single_schema_repair[not JSON] PASSED            [ 50%]
tests/test_llm.py::test_single_schema_repair[{"safe":"true"}] PASSED     [ 50%]
tests/test_llm.py::test_single_schema_repair[{"safe":true,"extra":1}] PASSED [ 50%]
tests/test_llm.py::test_bad_envelope_repaired_once PASSED                [ 51%]
tests/test_llm.py::test_invalid_output_does_not_leak PASSED              [ 51%]
tests/test_llm.py::test_transport_errors_sanitized_no_retry[failure0] PASSED [ 51%]
tests/test_llm.py::test_transport_errors_sanitized_no_retry[failure1] PASSED [ 52%]
tests/test_llm.py::test_bounded_failures[400-1] PASSED                   [ 52%]
tests/test_llm.py::test_bounded_failures[401-1] PASSED                   [ 52%]
tests/test_llm.py::test_bounded_failures[302-1] PASSED                   [ 52%]
tests/test_llm.py::test_bounded_failures[429-3] PASSED                   [ 53%]
tests/test_llm.py::test_bounded_failures[503-3] PASSED                   [ 53%]
tests/test_llm.py::test_budget_includes_repairs_and_is_shared PASSED     [ 53%]
tests/test_llm.py::test_budget_resets_next_utc_day_and_zero_disables PASSED [ 53%]
tests/test_llm.py::test_global_concurrency_across_instances PASSED       [ 54%]
tests/test_llm.py::test_capacity_timeout_does_not_spend_budget PASSED    [ 54%]
tests/test_llm.py::test_missing_configuration[GeminiProvider-GEMINI_API_KEY] PASSED [ 54%]
tests/test_llm.py::test_missing_configuration[ClaudeProvider-ANTHROPIC_API_KEY] PASSED [ 54%]
tests/test_llm.py::test_missing_configuration[OllamaProvider-OLLAMA_MODEL] PASSED [ 55%]
tests/test_llm.py::test_ollama_remote_or_credential_url_rejected[https://ollama.com] PASSED [ 55%]
tests/test_llm.py::test_ollama_remote_or_credential_url_rejected[http://user:secret@localhost:11434] PASSED [ 55%]
tests/test_llm.py::test_ollama_remote_or_credential_url_rejected[http://localhost:11434?key=secret] PASSED [ 56%]
tests/test_llm.py::test_attempt_metrics PASSED                           [ 56%]
tests/test_llm.py::test_http_privacy_suppresses_instrumentation PASSED   [ 56%]
tests/test_llm.py::test_oversized_response_rejected PASSED               [ 56%]
tests/test_llm.py::test_deadline_checked_between_chunks PASSED           [ 57%]
tests/test_llm.py::test_cloud_model_rejected PASSED                      [ 57%]
tests/test_llm.py::test_budget_reservations_atomic PASSED                [ 57%]
tests/test_llm.py::test_gemini_paces_retries_repairs_and_shared_instances PASSED [ 57%]
tests/test_llm.py::test_evaluation_retains_only_safe_http_status PASSED  [ 58%]
tests/test_mcp_api_contract.py::test_recorded_api_contract PASSED        [ 58%]
tests/test_mcp_api_contract.py::test_activity_partial_failure PASSED     [ 58%]
tests/test_mcp_api_contract.py::test_signal_code_isolation_and_window PASSED [ 58%]
tests/test_mcp_api_contract.py::test_status_has_no_redirect_side_effect PASSED [ 59%]
tests/test_mcp_api_contract.py::test_admin_auth_required PASSED          [ 59%]
tests/test_mcp_api_contract.py::test_actual_429_only_and_per_code PASSED [ 59%]
tests/test_mcp_api_contract.py::test_rejection_storage_is_independent_and_bounded PASSED [ 60%]
tests/test_mcp_api_contract.py::test_admin_read_scope_is_insufficient PASSED [ 60%]
tests/test_mcp_api_contract.py::test_signal_queries_only_requested_code_and_completed_minutes PASSED [ 60%]
tests/test_mcp_api_contract.py::test_database_failure_not_empty_activity PASSED [ 60%]
tests/test_mcp_api_contract.py::test_status_block_allow_expiry_precedence PASSED [ 61%]
tests/test_migrations.py::test_migrations_on_empty_sqlite PASSED         [ 61%]
tests/test_migrations.py::test_offline_sql_uses_postgresql_settings PASSED [ 61%]
tests/test_observability.py::test_w3c_event_roundtrip_and_invalid_context_isolation PASSED [ 61%]
tests/test_observability.py::test_json_log_has_active_trace_and_no_secrets[api] PASSED [ 62%]
tests/test_observability.py::test_json_log_has_active_trace_and_no_secrets[worker] PASSED [ 62%]
tests/test_observability.py::test_json_log_has_active_trace_and_no_secrets[abuse-worker] PASSED [ 62%]
tests/test_observability.py::test_privacy_export_boundary_for_every_process[api] PASSED [ 63%]
tests/test_observability.py::test_privacy_export_boundary_for_every_process[worker] PASSED [ 63%]
tests/test_observability.py::test_privacy_export_boundary_for_every_process[abuse-worker] PASSED [ 63%]
tests/test_observability.py::test_redirect_publish_consume_sql_share_one_trace PASSED [ 63%]
tests/test_observability.py::test_init_instruments_existing_engine_and_uses_configured_otlp PASSED [ 64%]
tests/test_rate_limiter.py::test_bucket_burst_refill_and_identity_isolation PASSED [ 64%]
tests/test_rate_limiter.py::test_bucket_concurrent_burst PASSED          [ 64%]
tests/test_rate_limiter.py::test_bucket_error_and_clock_regression PASSED [ 64%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[198.51.100.5-1.2.3.4-trusted0-198.51.100.5] PASSED [ 65%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[198.51.100.5-1.2.3.4-trusted1-198.51.100.5] PASSED [ 65%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[10.0.0.1-198.51.100.5-trusted2-198.51.100.5] PASSED [ 65%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[10.0.0.1-1.2.3.4, 198.51.100.5-trusted3-198.51.100.5] PASSED [ 65%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[10.0.0.1-198.51.100.5, 10.0.0.2-trusted4-198.51.100.5] PASSED [ 66%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[::1-2001:db8::1-trusted5-2001:db8::1] PASSED [ 66%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[10.0.0.1-garbage-trusted6-10.0.0.1] PASSED [ 66%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[get-ConnectionError] PASSED [ 67%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[get-TimeoutError] PASSED [ 67%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[ping-ConnectionError] PASSED [ 67%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[ping-TimeoutError] PASSED [ 67%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[dbsize-ConnectionError] PASSED [ 68%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[dbsize-TimeoutError] PASSED [ 68%]
tests/test_redis_client.py::test_programming_errors_are_not_hidden PASSED [ 68%]
tests/test_redis_client.py::test_normal_cache_reads[https://example.com/-counter0] PASSED [ 68%]
tests/test_redis_client.py::test_normal_cache_reads[None-counter1] PASSED [ 69%]
tests/test_routes.py::test_create_short_url_returns_service_code PASSED  [ 69%]
tests/test_routes.py::test_redirect_returns_redirect_response PASSED     [ 69%]
tests/test_routes.py::test_redirect_raises_404_for_missing_code PASSED   [ 69%]
tests/test_routes.py::test_analytics_route_uses_service PASSED           [ 70%]
tests/test_routes.py::test_redis_health_success PASSED                   [ 70%]
tests/test_routes.py::test_redis_health_failure PASSED                   [ 70%]
tests/test_slo.py::test_redis_lag_excludes_acknowledged_history_and_reports_retained_dlq PASSED [ 71%]
tests/test_slo.py::test_unknown_redis_lag_does_not_look_healthy PASSED   [ 71%]
tests/test_slo.py::test_kafka_retained_dlq_size_accounts_for_retention PASSED [ 71%]
tests/test_slo.py::test_worker_exports_current_dlq_size PASSED           [ 71%]
tests/test_slo.py::test_provisioned_configmaps_match_canonical_sources PASSED [ 72%]
tests/test_slo.py::test_redirect_slo_selector_captures_5xx_and_excludes_health PASSED [ 72%]
tests/test_slo.py::test_new_kafka_group_lag_starts_at_retained_offset PASSED [ 72%]
tests/test_slo.py::test_headless_metrics_services_include_unready_replicas PASSED [ 72%]
tests/test_slo.py::test_grafana_upgrade_preserves_existing_datasource_identity PASSED [ 73%]
tests/test_tooling_regressions.py::test_typed_models_preserve_column_types_and_nullability PASSED [ 73%]
tests/test_tooling_regressions.py::test_trace_logging_preserves_message_for_default_formatter PASSED [ 73%]
tests/test_tooling_regressions.py::test_worker_reports_unconfigured_database PASSED [ 73%]
tests/test_trace_privacy.py::test_url_spans_only_include_origin_and_code[False] PASSED [ 74%]
tests/test_trace_privacy.py::test_url_spans_only_include_origin_and_code[True] PASSED [ 74%]
tests/test_trace_privacy.py::test_auto_instrumented_redis_does_not_export_cached_url PASSED [ 74%]
tests/test_trace_privacy.py::test_auto_instrumented_http_does_not_export_path_or_query PASSED [ 75%]
tests/test_trace_privacy.py::test_privacy_hooks_redact_instrumentation_attributes PASSED [ 75%]
tests/test_url_features.py::test_reject_unsafe_urls[ftp://example.com] PASSED [ 75%]
tests/test_url_features.py::test_reject_unsafe_urls[javascript:alert(1)] PASSED [ 75%]
tests/test_url_features.py::test_reject_unsafe_urls[https:///path] PASSED [ 76%]
tests/test_url_features.py::test_reject_unsafe_urls[https://] PASSED     [ 76%]
tests/test_url_features.py::test_reject_unsafe_urls[http://user:pass@example.com] PASSED [ 76%]
tests/test_url_features.py::test_reject_unsafe_urls[http://user@example.com] PASSED [ 76%]
tests/test_url_features.py::test_reject_unsafe_urls[http://@example.com] PASSED [ 77%]
tests/test_url_features.py::test_reject_unsafe_urls[http://localhost] PASSED [ 77%]
tests/test_url_features.py::test_reject_unsafe_urls[http://LOCALHOST.] PASSED [ 77%]
tests/test_url_features.py::test_reject_unsafe_urls[http://sub.localhost] PASSED [ 78%]
tests/test_url_features.py::test_reject_unsafe_urls[http://server.local] PASSED [ 78%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.0.0.1] PASSED [ 78%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.9.2.1] PASSED [ 78%]
tests/test_url_features.py::test_reject_unsafe_urls[http://10.1.2.3] PASSED [ 79%]
tests/test_url_features.py::test_reject_unsafe_urls[http://172.16.2.3] PASSED [ 79%]
tests/test_url_features.py::test_reject_unsafe_urls[http://192.168.1.1] PASSED [ 79%]
tests/test_url_features.py::test_reject_unsafe_urls[http://169.254.169.254] PASSED [ 79%]
tests/test_url_features.py::test_reject_unsafe_urls[http://0.0.0.0] PASSED [ 80%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::1]] PASSED [ 80%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::]] PASSED  [ 80%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fc00::1]] PASSED [ 80%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fd00::1]] PASSED [ 81%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fe80::1]] PASSED [ 81%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::ffff:127.0.0.1]] PASSED [ 81%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::ffff:192.168.0.1]] PASSED [ 82%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fe80::1%25eth0]] PASSED [ 82%]
tests/test_url_features.py::test_reject_unsafe_urls[http://2130706433] PASSED [ 82%]
tests/test_url_features.py::test_reject_unsafe_urls[http://0x7f000001] PASSED [ 82%]
tests/test_url_features.py::test_reject_unsafe_urls[http://0177.0.0.1] PASSED [ 83%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.1] PASSED [ 83%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.0.0.1.] PASSED [ 83%]
tests/test_url_features.py::test_reject_unsafe_urls[http://%6cocalhost] PASSED [ 83%]
tests/test_url_features.py::test_reject_unsafe_urls[http://localHOST\u3002] PASSED [ 84%]
tests/test_url_features.py::test_reject_unsafe_urls[http://example.com\\@127.0.0.1] PASSED [ 84%]
tests/test_url_features.py::test_reject_unsafe_urls[http://exam\nple.com] PASSED [ 84%]
tests/test_url_features.py::test_reject_unsafe_urls[http://bad_host.com] PASSED [ 84%]
tests/test_url_features.py::test_reject_unsafe_urls[http://-bad.example] PASSED [ 85%]
tests/test_url_features.py::test_reject_unsafe_urls[https://example.com/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx] PASSED [ 85%]
tests/test_url_features.py::test_normalize_public_hosts[https://EXAMPLE.COM./a?b=1-example.com] PASSED [ 85%]
tests/test_url_features.py::test_normalize_public_hosts[http://b\xfccher.de/a-xn--bcher-kva.de] PASSED [ 86%]
tests/test_url_features.py::test_normalize_public_hosts[https://8.8.8.8/a-8.8.8.8] PASSED [ 86%]
tests/test_url_features.py::test_normalize_public_hosts[http://[2606:4700:4700::1111]/-[2606:4700:4700::1111]] PASSED [ 86%]
tests/test_url_features.py::test_normalize_public_hosts[https://localhost.example.com/-localhost.example.com] PASSED [ 86%]
tests/test_url_features.py::test_maximum_url_length PASSED               [ 87%]
tests/test_url_features.py::test_invalid_alias[ab] PASSED                [ 87%]
tests/test_url_features.py::test_invalid_alias[aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa] PASSED [ 87%]
tests/test_url_features.py::test_invalid_alias[] PASSED                  [ 87%]
tests/test_url_features.py::test_invalid_alias[a/b] PASSED               [ 88%]
tests/test_url_features.py::test_invalid_alias[a.b] PASSED               [ 88%]
tests/test_url_features.py::test_invalid_alias[a b] PASSED               [ 88%]
tests/test_url_features.py::test_invalid_alias[\xe9\xe9\xe9] PASSED      [ 89%]
tests/test_url_features.py::test_invalid_alias[api] PASSED               [ 89%]
tests/test_url_features.py::test_invalid_alias[Health] PASSED            [ 89%]
tests/test_url_features.py::test_invalid_alias[METRICS] PASSED           [ 89%]
tests/test_url_features.py::test_invalid_alias[docs] PASSED              [ 90%]
tests/test_url_features.py::test_invalid_alias[admin] PASSED             [ 90%]
tests/test_url_features.py::test_invalid_alias[shorten] PASSED           [ 90%]
tests/test_url_features.py::test_invalid_alias[livez] PASSED             [ 90%]
tests/test_url_features.py::test_invalid_alias[urls] PASSED              [ 91%]
tests/test_url_features.py::test_invalid_alias[analytics] PASSED         [ 91%]
tests/test_url_features.py::test_invalid_alias[redoc] PASSED             [ 91%]
tests/test_url_features.py::test_valid_alias[abc] PASSED                 [ 91%]
tests/test_url_features.py::test_valid_alias[A_9-x] PASSED               [ 92%]
tests/test_url_features.py::test_valid_alias[aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa] PASSED [ 92%]
tests/test_url_features.py::test_invalid_expiry[2020-01-01T00:00:00Z] PASSED [ 92%]
tests/test_url_features.py::test_invalid_expiry[2099-01-01T00:00:00] PASSED [ 93%]
tests/test_url_features.py::test_invalid_expiry[nonsense] PASSED         [ 93%]
tests/test_url_features.py::test_invalid_expiry[9999999999] PASSED       [ 93%]
tests/test_url_features.py::test_expiry_normalized_to_utc PASSED         [ 93%]
tests/test_url_features.py::test_alias_create_conflict_delete_and_list PASSED [ 94%]
tests/test_url_features.py::test_expired_cache_hit_returns_410 PASSED    [ 94%]
tests/test_url_features.py::test_api_validation_is_422[payload0] PASSED  [ 94%]
tests/test_url_features.py::test_api_validation_is_422[payload1] PASSED  [ 94%]
tests/test_url_features.py::test_api_validation_is_422[payload2] PASSED  [ 95%]
tests/test_url_features.py::test_api_validation_is_422[payload3] PASSED  [ 95%]
tests/test_url_features.py::test_missing_delete_and_redirect PASSED      [ 95%]
tests/test_url_features.py::test_openapi_documents_fields_and_statuses PASSED [ 95%]
tests/test_url_features.py::test_cache_absolute_deadline_and_eviction PASSED [ 96%]
tests/test_url_features.py::test_multicast_rejected[http://224.0.0.1] PASSED [ 96%]
tests/test_url_features.py::test_multicast_rejected[http://[ff02::1]] PASSED [ 96%]
tests/test_url_features.py::test_numeric_string_expiry_rejected PASSED   [ 97%]
tests/test_url_features.py::test_no_redirect_if_expiry_passes_during_click_publication PASSED [ 97%]
tests/test_url_features.py::test_cache_not_used_when_database_fails PASSED [ 97%]
tests/test_url_features.py::test_far_expiry_cache_is_capped_at_jittered_ttl PASSED [ 97%]
tests/test_url_features.py::test_alias_is_case_sensitive PASSED          [ 98%]
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

tests/integration/test_redis_postgres.py::test_shorten_redirect_idle_flush_analytics
  /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/lib/python3.11/site-packages/testcontainers/redis/__init__.py:46: DeprecationWarning: The @wait_container_is_ready decorator is deprecated and will be removed in a future version. Use structured wait strategies instead: container.waiting_for(HttpWaitStrategy(8080).for_status_code(200)) or container.waiting_for(LogMessageWaitStrategy('ready'))
    @wait_container_is_ready(redis.exceptions.ConnectionError)

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
================================ tests coverage ================================
______________ coverage: platform darwin, python 3.11.14-final-0 _______________

Name                                       Stmts   Miss   Cover   Missing
-------------------------------------------------------------------------
app/__init__.py                                0      0 100.00%
app/abuse/__init__.py                          0      0 100.00%
app/abuse/classifier.py                       57      2  96.49%   42, 47
app/abuse/heuristics.py                       61      0 100.00%
app/abuse/persistence.py                      47      3  93.62%   46-47, 68
app/abuse/schemas.py                          19      0 100.00%
app/api/__init__.py                            0      0 100.00%
app/api/auth.py                               33      0 100.00%
app/api/routes.py                            145      4  97.24%   112-113, 178, 215
app/cache/__init__.py                          0      0 100.00%
app/cache/circuit_breaker.py                  49      1  97.96%   57
app/cache/redis_client.py                     94     16  82.98%   30, 33, 36, 39, 42, 47-48, 57-59, 145-146, 153-154, 161-162
app/cache/singleflight.py                     37      1  97.30%   34
app/cli.py                                    66     10  84.85%   30-32, 80, 98, 102-106, 110
app/core/__init__.py                           0      0 100.00%
app/core/config.py                            85     15  82.35%   17, 19, 35, 42, 49, 56, 74, 85, 89, 91, 103, 111, 136, 138, 141
app/db/__init__.py                             0      0 100.00%
app/db/database.py                            17      6  64.71%   33-39
app/events/__init__.py                        13      1  92.31%   18
app/events/base.py                            12      0 100.00%
app/events/kafka.py                           58      9  84.48%   17-20, 27, 39, 51, 64, 67, 77
app/events/memory.py                          49      0 100.00%
app/events/models.py                          35      1  97.14%   67
app/events/publisher.py                       78      5  93.59%   52, 60-61, 104-105
app/events/redis_streams.py                   52      2  96.15%   86, 142
app/kafka/__init__.py                          0      0 100.00%
app/kafka/consumer.py                          4      0 100.00%
app/kafka/producer.py                          7      1  85.71%   9
app/llm/__init__.py                            5      0 100.00%
app/llm/base.py                               30      0 100.00%
app/llm/limits.py                             37      1  97.30%   15
app/llm/providers.py                         155     10  93.55%   84, 112, 117, 158, 165, 179, 211-212, 297-298
app/main.py                                   48      8  83.33%   46-47, 62-63, 66, 84-86
app/middleware/hardening.py                   47      2  95.74%   30, 50
app/middleware/rate_limiter.py                88      1  98.86%   90
app/models/__init__.py                         0      0 100.00%
app/models/analytics.py                       11      0 100.00%
app/models/api_key.py                         14      0 100.00%
app/models/url.py                             14      0 100.00%
app/models/url_verdict.py                     23      0 100.00%
app/observability/context.py                  27      0 100.00%
app/observability/logging.py                  46      5  89.13%   60, 73-76
app/observability/metrics.py                  51      0 100.00%
app/observability/privacy.py                  27      1  96.30%   93
app/observability/tracing.py                  47      3  93.62%   72-73, 77
app/repositories/__init__.py                   0      0 100.00%
app/repositories/analytics_repository.py      23      1  95.65%   28
app/repositories/url_repository.py            36      0 100.00%
app/schemas/__init__.py                        0      0 100.00%
app/schemas/url_schema.py                     73      3  95.89%   73, 95, 122
app/services/__init__.py                       0      0 100.00%
app/services/activity_signals.py              39      0 100.00%
app/services/analytics_service.py             13      0 100.00%
app/services/api_keys.py                      43      0 100.00%
app/services/code_generator.py                 9      0 100.00%
app/services/url_service.py                  151      9  94.04%   36-37, 64, 69, 74, 157, 165, 235-236
app/utils/__init__.py                          0      0 100.00%
app/utils/base62.py                            9      0 100.00%
app/workers/__init__.py                        0      0 100.00%
app/workers/abuse_worker.py                  107     16  85.05%   136-142, 150-161, 165
app/workers/analytics_worker.py              122     10  91.80%   184-193, 197
-------------------------------------------------------------------------
TOTAL                                       2313    147  93.64%
Coverage XML written to file coverage.xml
Coverage JSON written to file coverage.json
Required test coverage of 93.6% reached. Total coverage: 93.64%
=============== 373 passed, 11 deselected, 6 warnings in 23.55s ================
```

## TESTCONTAINERS_RYUK_DISABLED=true make test-integration-slow

```text
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m pytest --run-integration -m "not docker" --cov=app --cov-report=term-missing --cov-report=xml --cov-report=json:coverage.json
============================= test session starts ==============================
platform darwin -- Python 3.11.14, pytest-9.0.3, pluggy-1.7.0 -- /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python
cachedir: .pytest_cache
rootdir: /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener
configfile: pytest.ini
testpaths: tests
plugins: platformdirs-4.13.0, cov-7.1.0, anyio-4.15.1
collecting ... collected 384 items / 10 deselected / 374 selected

tests/integration/test_kafka.py::test_kafka_consumer_commits_only_after_database PASSED [  0%]
tests/integration/test_redis_postgres.py::test_migrations_empty_postgres_matches_models PASSED [  0%]
tests/integration/test_redis_postgres.py::test_shorten_redirect_idle_flush_analytics PASSED [  0%]
tests/integration/test_redis_postgres.py::test_expiry_and_deletion_not_served_from_cache PASSED [  1%]
tests/integration/test_redis_postgres.py::test_api_key_scopes_and_revocation PASSED [  1%]
tests/integration/test_redis_postgres.py::test_real_lua_atomic_burst_refill_and_isolation PASSED [  1%]
tests/integration/test_redis_postgres.py::test_http_rate_limit_headers_and_actual_signals PASSED [  1%]
tests/integration/test_redis_postgres.py::test_duplicates_one_row_and_commit_before_ack PASSED [  2%]
tests/integration/test_redis_postgres.py::test_poison_reaches_dlq_after_three_attempts PASSED [  2%]
tests/integration/test_redis_postgres.py::test_pending_message_recovered_by_another_consumer PASSED [  2%]
tests/integration/test_redis_postgres.py::test_worker_shutdown_flushes_batch PASSED [  2%]
tests/integration/test_redis_postgres.py::test_stopped_redis_redirect_falls_back_postgres PASSED [  3%]
tests/integration/test_redis_postgres.py::test_abuse_outbox_worker_review_enforcement_with_fake PASSED [  3%]
tests/test_abuse.py::test_each_heuristic[https://8.8.8.8/-ip_literal] PASSED [  3%]
tests/test_abuse.py::test_each_heuristic[https://[2606:4700:4700::1111]/-ip_literal] PASSED [  4%]
tests/test_abuse.py::test_each_heuristic[https://xn--bcher-kva.de/-punycode] PASSED [  4%]
tests/test_abuse.py::test_each_heuristic[https://p\u0430ypal.com/-mixed_script] PASSED [  4%]
tests/test_abuse.py::test_each_heuristic[https://a.b.c.d.example.com/-deep_subdomains] PASSED [  4%]
tests/test_abuse.py::test_each_heuristic[https://example.zip/-suspicious_tld] PASSED [  5%]
tests/test_abuse.py::test_each_heuristic[https://example.com/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-long_url] PASSED [  5%]
tests/test_abuse.py::test_each_heuristic[https://example.com/123456789012-many_digits] PASSED [  5%]
tests/test_abuse.py::test_each_heuristic[https://example.com/----------------many_specials] PASSED [  5%]
tests/test_abuse.py::test_each_heuristic[https://paypal.attacker.com/-brand_subdomain] PASSED [  6%]
tests/test_abuse.py::test_each_heuristic[https://bit.ly/abc-shortener_chain] PASSED [  6%]
tests/test_abuse.py::test_each_heuristic[https://example.com/%6Cogin-credential_path] PASSED [  6%]
tests/test_abuse.py::test_each_heuristic[https://example.com/verify-credential_path] PASSED [  6%]
tests/test_abuse.py::test_each_heuristic[https://example.com/secure-credential_path] PASSED [  7%]
tests/test_abuse.py::test_each_heuristic[https://example.com/update-credential_path] PASSED [  7%]
tests/test_abuse.py::test_registered_domains_and_counts PASSED           [  7%]
tests/test_abuse.py::test_low_high_skip_model PASSED                     [  8%]
tests/test_abuse.py::test_gray_zone_and_domain_cache PASSED              [  8%]
tests/test_abuse.py::test_invalid_schema_suspicious[oops] PASSED         [  8%]
tests/test_abuse.py::test_invalid_schema_suspicious[{"verdict":"clean","confidence":1,"reasons":["anything"]}] PASSED [  8%]
tests/test_abuse.py::test_invalid_schema_suspicious[{"verdict":"clean","confidence":2,"reasons":["llm_uncertain"]}] PASSED [  9%]
tests/test_abuse.py::test_invalid_schema_suspicious[{"verdict":"clean","confidence":1,"reasons":["llm_uncertain"],"tool":"fetch"}] PASSED [  9%]
tests/test_abuse.py::test_budget_unavailable_is_reviewable PASSED        [  9%]
tests/test_abuse.py::test_injection_quoted_capped_and_cannot_clear_heuristic PASSED [  9%]
tests/test_abuse.py::test_outbox_publish_duplicate_and_commit_before_ack PASSED [ 10%]
tests/test_abuse.py::test_outbox_rollback_when_commit_fails PASSED       [ 10%]
tests/test_abuse.py::test_relay_failure_retains_outbox PASSED            [ 10%]
tests/test_abuse.py::test_failed_verdict_commit_is_not_acked PASSED      [ 10%]
tests/test_abuse.py::test_malformed_goes_to_dlq_before_ack PASSED        [ 11%]
tests/test_abuse.py::test_enforcement_on_warm_cache_and_review PASSED    [ 11%]
tests/test_abuse.py::test_suspicious_redirect_and_deleted_precedence PASSED [ 11%]
tests/test_abuse.py::test_redis_failure_does_not_skip_analysis PASSED    [ 12%]
tests/test_abuse.py::test_invalid_cached_result_recomputed PASSED        [ 12%]
tests/test_abuse.py::test_worker_run_metrics_and_shutdown PASSED         [ 12%]
tests/test_abuse.py::test_store_does_not_replace_review PASSED           [ 12%]
tests/test_abuse.py::test_missing_deleted_events_ack_without_classification PASSED [ 13%]
tests/test_abuse.py::test_schema_and_new_services PASSED                 [ 13%]
tests/test_abuse_eval.py::test_combined_fake_regression PASSED           [ 13%]
tests/test_abuse_eval.py::test_fixture_provenance_and_counts PASSED      [ 13%]
tests/test_abuse_eval.py::test_splits_stable_grouped_and_limit_does_not_change_membership PASSED [ 14%]
tests/test_abuse_eval.py::test_loader_rejects_bad_rows_without_echo[url,label\nhttps://example.com,unknown\n] PASSED [ 14%]
tests/test_abuse_eval.py::test_loader_rejects_bad_rows_without_echo[label,url\nbenign,https://example.com\n] PASSED [ 14%]
tests/test_abuse_eval.py::test_loader_rejects_bad_rows_without_echo[url,label\nhttps://user:secret@example.com,benign\n] PASSED [ 14%]
tests/test_abuse_eval.py::test_loader_rejects_bad_rows_without_echo[url,label\nhttps://example.com,benign\nhttps://example.com,malicious\n] PASSED [ 15%]
tests/test_abuse_eval.py::test_loader_rejects_bad_rows_without_echo[url,label\nhttps://example.com\n] PASSED [ 15%]
tests/test_abuse_eval.py::test_loader_rejects_bad_rows_without_echo[url,label\nfile:///tmp/private,benign\n] PASSED [ 15%]
tests/test_abuse_eval.py::test_loader_deduplicates_and_does_not_recurse PASSED [ 16%]
tests/test_abuse_eval.py::test_metric_arithmetic_and_undefined_values PASSED [ 16%]
tests/test_abuse_eval.py::test_variants_and_constant_fake_have_no_label_access PASSED [ 16%]
tests/test_abuse_eval.py::test_budget_failures_are_reported_not_hidden PASSED [ 16%]
tests/test_abuse_eval.py::test_reported_tokens_and_missing_metadata PASSED [ 17%]
tests/test_abuse_eval.py::test_runner_writes_both_formats_without_urls PASSED [ 17%]
tests/test_abuse_eval.py::test_dev_run_is_explicitly_marked PASSED       [ 17%]
tests/test_analytics_repository.py::test_batch_create_clicks_uses_single_execute_call PASSED [ 17%]
tests/test_analytics_repository.py::test_batch_create_clicks_returns_zero_for_empty_list PASSED [ 18%]
tests/test_analytics_repository.py::test_analytics_repository_count_and_timestamps PASSED [ 18%]
tests/test_analytics_service.py::test_get_analytics_uses_repository_results PASSED [ 18%]
tests/test_app_assembly.py::test_middleware_and_metrics PASSED           [ 18%]
tests/test_app_assembly.py::test_cors_preflight PASSED                   [ 19%]
tests/test_app_assembly.py::test_rate_limiter_is_registered PASSED       [ 19%]
tests/test_app_assembly.py::test_main_routes PASSED                      [ 19%]
tests/test_app_assembly.py::test_service_failures_are_503[/urls-service0-list_recent_urls] PASSED [ 20%]
tests/test_app_assembly.py::test_service_failures_are_503[/analytics/code-service1-get_analytics] PASSED [ 20%]
tests/test_app_assembly.py::test_health_dependency_failures[db] PASSED   [ 20%]
tests/test_app_assembly.py::test_health_dependency_failures[redis] PASSED [ 20%]
tests/test_app_assembly.py::test_health_dependency_failures[both] PASSED [ 21%]
tests/test_app_assembly.py::test_false_redis_ping_is_unhealthy PASSED    [ 21%]
tests/test_app_assembly.py::test_livez_does_not_touch_dependencies PASSED [ 21%]
tests/test_app_assembly.py::test_redirect_falls_back_on_redis_read_failure[ConnectionError] PASSED [ 21%]
tests/test_app_assembly.py::test_redirect_falls_back_on_redis_read_failure[TimeoutError] PASSED [ 22%]
tests/test_app_assembly.py::test_redis_health_read_failures[ping] PASSED [ 22%]
tests/test_app_assembly.py::test_redis_health_read_failures[dbsize] PASSED [ 22%]
tests/test_app_assembly.py::test_health_session_acquisition_failure PASSED [ 22%]
tests/test_app_assembly.py::test_health_session_is_closed PASSED         [ 23%]
tests/test_app_assembly.py::test_stopped_redis_never_makes_redirect_5xx_and_health_reports_breaker PASSED [ 23%]
tests/test_auth.py::test_key_hashing_metadata_and_revocation PASSED      [ 23%]
tests/test_auth.py::test_key_invalid_creation[-scopes0] PASSED           [ 24%]
tests/test_auth.py::test_key_invalid_creation[ok-scopes1] PASSED         [ 24%]
tests/test_auth.py::test_key_invalid_creation[ok-scopes2] PASSED         [ 24%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-POST-/shorten] PASSED [ 24%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-DELETE-/urls/code] PASSED [ 25%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-GET-/urls] PASSED [ 25%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-GET-/analytics/code] PASSED [ 25%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-GET-/admin/keys] PASSED [ 25%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-DELETE-/admin/keys/1] PASSED [ 26%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-POST-/shorten] PASSED [ 26%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-DELETE-/urls/code] PASSED [ 26%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-GET-/urls] PASSED [ 27%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-GET-/analytics/code] PASSED [ 27%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-GET-/admin/keys] PASSED [ 27%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-DELETE-/admin/keys/1] PASSED [ 27%]
tests/test_auth.py::test_scope_enforcement_and_creator PASSED            [ 28%]
tests/test_auth.py::test_public_endpoints_and_openapi PASSED             [ 28%]
tests/test_auth.py::test_auth_database_failure_is_503 PASSED             [ 28%]
tests/test_auth.py::test_write_limits_and_key_isolation PASSED           [ 28%]
tests/test_auth.py::test_delete_uses_template_bucket_not_code PASSED     [ 29%]
tests/test_auth.py::test_redirects_share_ip_bucket_and_ignore_spoofed_headers PASSED [ 29%]
tests/test_auth.py::test_redis_failure_closes_writes_but_not_redirects PASSED [ 29%]
tests/test_auth.py::test_internal_metrics_not_exposed_on_api_port PASSED [ 29%]
tests/test_auth.py::test_cli_prints_key_once_and_never_lists_hash PASSED [ 30%]
tests/test_base62.py::test_encode_base62_zero_returns_empty_string PASSED [ 30%]
tests/test_base62.py::test_encode_base62_small_numbers PASSED            [ 30%]
tests/test_base62.py::test_encode_base62_larger_number PASSED            [ 31%]
tests/test_cache_strategy.py::test_circuit_open_half_open_closed_and_failed_probe PASSED [ 31%]
tests/test_cache_strategy.py::test_only_one_half_open_probe_and_stale_success_cannot_close PASSED [ 31%]
tests/test_cache_strategy.py::test_success_resets_consecutive_failures PASSED [ 31%]
tests/test_cache_strategy.py::test_client_timeout_and_retry_configuration PASSED [ 32%]
tests/test_cache_strategy.py::test_ttl_jitter_bounds_and_absolute_expiry PASSED [ 32%]
tests/test_cache_strategy.py::test_many_cold_requests_share_one_database_read[False] PASSED [ 32%]
tests/test_cache_strategy.py::test_many_cold_requests_share_one_database_read[True] PASSED [ 32%]
tests/test_cache_strategy.py::test_cross_process_lock_wait_rechecks_cache PASSED [ 33%]
tests/test_cache_strategy.py::test_negative_caching_and_alias_creation_invalidation PASSED [ 33%]
tests/test_cache_strategy.py::test_alias_creation_fences_an_inflight_negative_fill PASSED [ 33%]
tests/test_cache_strategy.py::test_lock_release_and_publication_require_owner PASSED [ 33%]
tests/test_cache_strategy.py::test_negative_cache_expiry PASSED          [ 34%]
tests/test_cache_strategy.py::test_redis_down_falls_back_and_counts_metric PASSED [ 34%]
tests/test_cache_strategy.py::test_singleflight_timeout_and_exception_cleanup PASSED [ 34%]
tests/test_cache_strategy.py::test_positive_cache_still_checks_deletion_and_database_failure PASSED [ 35%]
tests/test_code_generation.py::test_100000_candidates_are_unique_and_url_safe PASSED [ 35%]
tests/test_code_generation.py::test_production_generator_uses_secrets_choice PASSED [ 35%]
tests/test_code_generation.py::test_collision_retries_preserve_existing_destination PASSED [ 35%]
tests/test_code_generation.py::test_exhaustion_is_bounded_and_leaves_transaction_usable PASSED [ 36%]
tests/test_code_generation.py::test_non_collision_integrity_error_is_not_retried PASSED [ 36%]
tests/test_code_generation.py::test_static_route_names_are_not_allocated PASSED [ 36%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_USER] PASSED [ 36%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_PASSWORD] PASSED [ 37%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_DB] PASSED [ 37%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[GRAFANA_ADMIN_USER] PASSED [ 37%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[GRAFANA_ADMIN_PASSWORD] PASSED [ 37%]
tests/test_deployment_config.py::test_compose_uses_same_database_credentials_for_all_clients PASSED [ 38%]
tests/test_deployment_config.py::test_profile_selects_matching_brokers[kafka] PASSED [ 38%]
tests/test_deployment_config.py::test_profile_selects_matching_brokers[redis-streams] PASSED [ 38%]
tests/test_deployment_config.py::test_kubernetes_metrics_use_internal_port_and_network_policy PASSED [ 39%]
tests/test_event_bus.py::test_duplicate_delivery_one_row_and_commit_before_ack PASSED [ 39%]
tests/test_event_bus.py::test_malformed_or_unknown_version_dlq_after_three_attempts[{broken] PASSED [ 39%]
tests/test_event_bus.py::test_malformed_or_unknown_version_dlq_after_three_attempts[{"schema_version":99,"short_code":"abc123"}] PASSED [ 39%]
tests/test_event_bus.py::test_poison_row_does_not_discard_healthy_batch_rows PASSED [ 40%]
tests/test_event_bus.py::test_database_error_never_acknowledges_or_deadletters PASSED [ 40%]
tests/test_event_bus.py::test_commit_failure_does_not_ack PASSED         [ 40%]
tests/test_event_bus.py::test_dlq_publish_failure_does_not_advance_offset PASSED [ 40%]
tests/test_event_bus.py::test_idle_timer_and_shutdown_flush[False] PASSED [ 41%]
tests/test_event_bus.py::test_idle_timer_and_shutdown_flush[True] PASSED [ 41%]
tests/test_event_bus.py::test_slow_broker_and_full_queue_do_not_block_redirects PASSED [ 41%]
tests/test_event_bus.py::test_kafka_raw_poll_and_explicit_offsets PASSED [ 41%]
tests/test_event_bus.py::test_redis_groups_recover_pending_before_new_reads PASSED [ 42%]
tests/test_event_bus.py::test_memory_groups_and_unacknowledged_recovery PASSED [ 42%]
tests/test_event_bus.py::test_dlq_list_and_replay_preserve_event_id PASSED [ 42%]
tests/test_event_bus.py::test_adapter_selection_without_connecting[memory-InMemoryEventBus] PASSED [ 43%]
tests/test_event_bus.py::test_adapter_selection_without_connecting[kafka-KafkaEventBus] PASSED [ 43%]
tests/test_event_bus.py::test_adapter_selection_without_connecting[redis_streams-RedisStreamsEventBus] PASSED [ 43%]
tests/test_event_bus.py::test_legacy_event_without_id_goes_to_dlq PASSED [ 43%]
tests/test_event_bus.py::test_memory_recovers_more_than_one_batch PASSED [ 44%]
tests/test_event_bus.py::test_idle_timer_flushes_even_when_later_polls_fail PASSED [ 44%]
tests/test_hardening.py::test_body_limit_and_safe_errors PASSED          [ 44%]
tests/test_hardening.py::test_chunked_body_cannot_bypass_limit PASSED    [ 44%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[*] PASSED   [ 45%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[https://*.example.com] PASSED [ 45%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[https://user:pass@example.com] PASSED [ 45%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[https://example.com/path] PASSED [ 45%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[] PASSED    [ 46%]
tests/test_hardening.py::test_production_accepts_exact_origin PASSED     [ 46%]
tests/test_hardening.py::test_all_kubernetes_containers_have_security_and_resources PASSED [ 46%]
tests/test_hardening.py::test_network_policy_default_deny_and_exact_dependency_ports PASSED [ 47%]
tests/test_hardening.py::test_slow_request_body_returns_408 PASSED       [ 47%]
tests/test_hardening.py::test_kafka_constructor_uses_supported_bounded_timeouts PASSED [ 47%]
tests/test_hardening.py::test_cors_setting_is_configmap_data_not_object_metadata PASSED [ 47%]
tests/test_hardening.py::test_frontend_build_excludes_local_secrets_and_artifacts PASSED [ 48%]
tests/test_health_route.py::test_health_endpoint_includes_total_urls PASSED [ 48%]
tests/test_llm.py::test_fake_deterministic_and_factory PASSED            [ 48%]
tests/test_llm.py::test_recorded_contracts[GeminiProvider-reply0] PASSED [ 48%]
tests/test_llm.py::test_recorded_contracts[OllamaProvider-reply1] PASSED [ 49%]
tests/test_llm.py::test_recorded_contracts[ClaudeProvider-reply2] PASSED [ 49%]
tests/test_llm.py::test_backoff_jitter_and_budget_per_attempt[429] PASSED [ 49%]
tests/test_llm.py::test_backoff_jitter_and_budget_per_attempt[500] PASSED [ 50%]
tests/test_llm.py::test_backoff_jitter_and_budget_per_attempt[503] PASSED [ 50%]
tests/test_llm.py::test_single_schema_repair[not JSON] PASSED            [ 50%]
tests/test_llm.py::test_single_schema_repair[{"safe":"true"}] PASSED     [ 50%]
tests/test_llm.py::test_single_schema_repair[{"safe":true,"extra":1}] PASSED [ 51%]
tests/test_llm.py::test_bad_envelope_repaired_once PASSED                [ 51%]
tests/test_llm.py::test_invalid_output_does_not_leak PASSED              [ 51%]
tests/test_llm.py::test_transport_errors_sanitized_no_retry[failure0] PASSED [ 51%]
tests/test_llm.py::test_transport_errors_sanitized_no_retry[failure1] PASSED [ 52%]
tests/test_llm.py::test_bounded_failures[400-1] PASSED                   [ 52%]
tests/test_llm.py::test_bounded_failures[401-1] PASSED                   [ 52%]
tests/test_llm.py::test_bounded_failures[302-1] PASSED                   [ 52%]
tests/test_llm.py::test_bounded_failures[429-3] PASSED                   [ 53%]
tests/test_llm.py::test_bounded_failures[503-3] PASSED                   [ 53%]
tests/test_llm.py::test_budget_includes_repairs_and_is_shared PASSED     [ 53%]
tests/test_llm.py::test_budget_resets_next_utc_day_and_zero_disables PASSED [ 54%]
tests/test_llm.py::test_global_concurrency_across_instances PASSED       [ 54%]
tests/test_llm.py::test_capacity_timeout_does_not_spend_budget PASSED    [ 54%]
tests/test_llm.py::test_missing_configuration[GeminiProvider-GEMINI_API_KEY] PASSED [ 54%]
tests/test_llm.py::test_missing_configuration[ClaudeProvider-ANTHROPIC_API_KEY] PASSED [ 55%]
tests/test_llm.py::test_missing_configuration[OllamaProvider-OLLAMA_MODEL] PASSED [ 55%]
tests/test_llm.py::test_ollama_remote_or_credential_url_rejected[https://ollama.com] PASSED [ 55%]
tests/test_llm.py::test_ollama_remote_or_credential_url_rejected[http://user:secret@localhost:11434] PASSED [ 55%]
tests/test_llm.py::test_ollama_remote_or_credential_url_rejected[http://localhost:11434?key=secret] PASSED [ 56%]
tests/test_llm.py::test_attempt_metrics PASSED                           [ 56%]
tests/test_llm.py::test_http_privacy_suppresses_instrumentation PASSED   [ 56%]
tests/test_llm.py::test_oversized_response_rejected PASSED               [ 56%]
tests/test_llm.py::test_deadline_checked_between_chunks PASSED           [ 57%]
tests/test_llm.py::test_cloud_model_rejected PASSED                      [ 57%]
tests/test_llm.py::test_budget_reservations_atomic PASSED                [ 57%]
tests/test_llm.py::test_gemini_paces_retries_repairs_and_shared_instances PASSED [ 58%]
tests/test_llm.py::test_evaluation_retains_only_safe_http_status PASSED  [ 58%]
tests/test_mcp_api_contract.py::test_recorded_api_contract PASSED        [ 58%]
tests/test_mcp_api_contract.py::test_activity_partial_failure PASSED     [ 58%]
tests/test_mcp_api_contract.py::test_signal_code_isolation_and_window PASSED [ 59%]
tests/test_mcp_api_contract.py::test_status_has_no_redirect_side_effect PASSED [ 59%]
tests/test_mcp_api_contract.py::test_admin_auth_required PASSED          [ 59%]
tests/test_mcp_api_contract.py::test_actual_429_only_and_per_code PASSED [ 59%]
tests/test_mcp_api_contract.py::test_rejection_storage_is_independent_and_bounded PASSED [ 60%]
tests/test_mcp_api_contract.py::test_admin_read_scope_is_insufficient PASSED [ 60%]
tests/test_mcp_api_contract.py::test_signal_queries_only_requested_code_and_completed_minutes PASSED [ 60%]
tests/test_mcp_api_contract.py::test_database_failure_not_empty_activity PASSED [ 60%]
tests/test_mcp_api_contract.py::test_status_block_allow_expiry_precedence PASSED [ 61%]
tests/test_migrations.py::test_migrations_on_empty_sqlite PASSED         [ 61%]
tests/test_migrations.py::test_offline_sql_uses_postgresql_settings PASSED [ 61%]
tests/test_observability.py::test_w3c_event_roundtrip_and_invalid_context_isolation PASSED [ 62%]
tests/test_observability.py::test_json_log_has_active_trace_and_no_secrets[api] PASSED [ 62%]
tests/test_observability.py::test_json_log_has_active_trace_and_no_secrets[worker] PASSED [ 62%]
tests/test_observability.py::test_json_log_has_active_trace_and_no_secrets[abuse-worker] PASSED [ 62%]
tests/test_observability.py::test_privacy_export_boundary_for_every_process[api] PASSED [ 63%]
tests/test_observability.py::test_privacy_export_boundary_for_every_process[worker] PASSED [ 63%]
tests/test_observability.py::test_privacy_export_boundary_for_every_process[abuse-worker] PASSED [ 63%]
tests/test_observability.py::test_redirect_publish_consume_sql_share_one_trace PASSED [ 63%]
tests/test_observability.py::test_init_instruments_existing_engine_and_uses_configured_otlp PASSED [ 64%]
tests/test_rate_limiter.py::test_bucket_burst_refill_and_identity_isolation PASSED [ 64%]
tests/test_rate_limiter.py::test_bucket_concurrent_burst PASSED          [ 64%]
tests/test_rate_limiter.py::test_bucket_error_and_clock_regression PASSED [ 64%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[198.51.100.5-1.2.3.4-trusted0-198.51.100.5] PASSED [ 65%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[198.51.100.5-1.2.3.4-trusted1-198.51.100.5] PASSED [ 65%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[10.0.0.1-198.51.100.5-trusted2-198.51.100.5] PASSED [ 65%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[10.0.0.1-1.2.3.4, 198.51.100.5-trusted3-198.51.100.5] PASSED [ 66%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[10.0.0.1-198.51.100.5, 10.0.0.2-trusted4-198.51.100.5] PASSED [ 66%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[::1-2001:db8::1-trusted5-2001:db8::1] PASSED [ 66%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[10.0.0.1-garbage-trusted6-10.0.0.1] PASSED [ 66%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[get-ConnectionError] PASSED [ 67%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[get-TimeoutError] PASSED [ 67%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[ping-ConnectionError] PASSED [ 67%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[ping-TimeoutError] PASSED [ 67%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[dbsize-ConnectionError] PASSED [ 68%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[dbsize-TimeoutError] PASSED [ 68%]
tests/test_redis_client.py::test_programming_errors_are_not_hidden PASSED [ 68%]
tests/test_redis_client.py::test_normal_cache_reads[https://example.com/-counter0] PASSED [ 68%]
tests/test_redis_client.py::test_normal_cache_reads[None-counter1] PASSED [ 69%]
tests/test_routes.py::test_create_short_url_returns_service_code PASSED  [ 69%]
tests/test_routes.py::test_redirect_returns_redirect_response PASSED     [ 69%]
tests/test_routes.py::test_redirect_raises_404_for_missing_code PASSED   [ 70%]
tests/test_routes.py::test_analytics_route_uses_service PASSED           [ 70%]
tests/test_routes.py::test_redis_health_success PASSED                   [ 70%]
tests/test_routes.py::test_redis_health_failure PASSED                   [ 70%]
tests/test_slo.py::test_redis_lag_excludes_acknowledged_history_and_reports_retained_dlq PASSED [ 71%]
tests/test_slo.py::test_unknown_redis_lag_does_not_look_healthy PASSED   [ 71%]
tests/test_slo.py::test_kafka_retained_dlq_size_accounts_for_retention PASSED [ 71%]
tests/test_slo.py::test_worker_exports_current_dlq_size PASSED           [ 71%]
tests/test_slo.py::test_provisioned_configmaps_match_canonical_sources PASSED [ 72%]
tests/test_slo.py::test_redirect_slo_selector_captures_5xx_and_excludes_health PASSED [ 72%]
tests/test_slo.py::test_new_kafka_group_lag_starts_at_retained_offset PASSED [ 72%]
tests/test_slo.py::test_headless_metrics_services_include_unready_replicas PASSED [ 72%]
tests/test_slo.py::test_grafana_upgrade_preserves_existing_datasource_identity PASSED [ 73%]
tests/test_tooling_regressions.py::test_typed_models_preserve_column_types_and_nullability PASSED [ 73%]
tests/test_tooling_regressions.py::test_trace_logging_preserves_message_for_default_formatter PASSED [ 73%]
tests/test_tooling_regressions.py::test_worker_reports_unconfigured_database PASSED [ 74%]
tests/test_trace_privacy.py::test_url_spans_only_include_origin_and_code[False] PASSED [ 74%]
tests/test_trace_privacy.py::test_url_spans_only_include_origin_and_code[True] PASSED [ 74%]
tests/test_trace_privacy.py::test_auto_instrumented_redis_does_not_export_cached_url PASSED [ 74%]
tests/test_trace_privacy.py::test_auto_instrumented_http_does_not_export_path_or_query PASSED [ 75%]
tests/test_trace_privacy.py::test_privacy_hooks_redact_instrumentation_attributes PASSED [ 75%]
tests/test_url_features.py::test_reject_unsafe_urls[ftp://example.com] PASSED [ 75%]
tests/test_url_features.py::test_reject_unsafe_urls[javascript:alert(1)] PASSED [ 75%]
tests/test_url_features.py::test_reject_unsafe_urls[https:///path] PASSED [ 76%]
tests/test_url_features.py::test_reject_unsafe_urls[https://] PASSED     [ 76%]
tests/test_url_features.py::test_reject_unsafe_urls[http://user:pass@example.com] PASSED [ 76%]
tests/test_url_features.py::test_reject_unsafe_urls[http://user@example.com] PASSED [ 77%]
tests/test_url_features.py::test_reject_unsafe_urls[http://@example.com] PASSED [ 77%]
tests/test_url_features.py::test_reject_unsafe_urls[http://localhost] PASSED [ 77%]
tests/test_url_features.py::test_reject_unsafe_urls[http://LOCALHOST.] PASSED [ 77%]
tests/test_url_features.py::test_reject_unsafe_urls[http://sub.localhost] PASSED [ 78%]
tests/test_url_features.py::test_reject_unsafe_urls[http://server.local] PASSED [ 78%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.0.0.1] PASSED [ 78%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.9.2.1] PASSED [ 78%]
tests/test_url_features.py::test_reject_unsafe_urls[http://10.1.2.3] PASSED [ 79%]
tests/test_url_features.py::test_reject_unsafe_urls[http://172.16.2.3] PASSED [ 79%]
tests/test_url_features.py::test_reject_unsafe_urls[http://192.168.1.1] PASSED [ 79%]
tests/test_url_features.py::test_reject_unsafe_urls[http://169.254.169.254] PASSED [ 79%]
tests/test_url_features.py::test_reject_unsafe_urls[http://0.0.0.0] PASSED [ 80%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::1]] PASSED [ 80%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::]] PASSED  [ 80%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fc00::1]] PASSED [ 81%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fd00::1]] PASSED [ 81%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fe80::1]] PASSED [ 81%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::ffff:127.0.0.1]] PASSED [ 81%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::ffff:192.168.0.1]] PASSED [ 82%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fe80::1%25eth0]] PASSED [ 82%]
tests/test_url_features.py::test_reject_unsafe_urls[http://2130706433] PASSED [ 82%]
tests/test_url_features.py::test_reject_unsafe_urls[http://0x7f000001] PASSED [ 82%]
tests/test_url_features.py::test_reject_unsafe_urls[http://0177.0.0.1] PASSED [ 83%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.1] PASSED [ 83%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.0.0.1.] PASSED [ 83%]
tests/test_url_features.py::test_reject_unsafe_urls[http://%6cocalhost] PASSED [ 83%]
tests/test_url_features.py::test_reject_unsafe_urls[http://localHOST\u3002] PASSED [ 84%]
tests/test_url_features.py::test_reject_unsafe_urls[http://example.com\\@127.0.0.1] PASSED [ 84%]
tests/test_url_features.py::test_reject_unsafe_urls[http://exam\nple.com] PASSED [ 84%]
tests/test_url_features.py::test_reject_unsafe_urls[http://bad_host.com] PASSED [ 85%]
tests/test_url_features.py::test_reject_unsafe_urls[http://-bad.example] PASSED [ 85%]
tests/test_url_features.py::test_reject_unsafe_urls[https://example.com/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx] PASSED [ 85%]
tests/test_url_features.py::test_normalize_public_hosts[https://EXAMPLE.COM./a?b=1-example.com] PASSED [ 85%]
tests/test_url_features.py::test_normalize_public_hosts[http://b\xfccher.de/a-xn--bcher-kva.de] PASSED [ 86%]
tests/test_url_features.py::test_normalize_public_hosts[https://8.8.8.8/a-8.8.8.8] PASSED [ 86%]
tests/test_url_features.py::test_normalize_public_hosts[http://[2606:4700:4700::1111]/-[2606:4700:4700::1111]] PASSED [ 86%]
tests/test_url_features.py::test_normalize_public_hosts[https://localhost.example.com/-localhost.example.com] PASSED [ 86%]
tests/test_url_features.py::test_maximum_url_length PASSED               [ 87%]
tests/test_url_features.py::test_invalid_alias[ab] PASSED                [ 87%]
tests/test_url_features.py::test_invalid_alias[aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa] PASSED [ 87%]
tests/test_url_features.py::test_invalid_alias[] PASSED                  [ 87%]
tests/test_url_features.py::test_invalid_alias[a/b] PASSED               [ 88%]
tests/test_url_features.py::test_invalid_alias[a.b] PASSED               [ 88%]
tests/test_url_features.py::test_invalid_alias[a b] PASSED               [ 88%]
tests/test_url_features.py::test_invalid_alias[\xe9\xe9\xe9] PASSED      [ 89%]
tests/test_url_features.py::test_invalid_alias[api] PASSED               [ 89%]
tests/test_url_features.py::test_invalid_alias[Health] PASSED            [ 89%]
tests/test_url_features.py::test_invalid_alias[METRICS] PASSED           [ 89%]
tests/test_url_features.py::test_invalid_alias[docs] PASSED              [ 90%]
tests/test_url_features.py::test_invalid_alias[admin] PASSED             [ 90%]
tests/test_url_features.py::test_invalid_alias[shorten] PASSED           [ 90%]
tests/test_url_features.py::test_invalid_alias[livez] PASSED             [ 90%]
tests/test_url_features.py::test_invalid_alias[urls] PASSED              [ 91%]
tests/test_url_features.py::test_invalid_alias[analytics] PASSED         [ 91%]
tests/test_url_features.py::test_invalid_alias[redoc] PASSED             [ 91%]
tests/test_url_features.py::test_valid_alias[abc] PASSED                 [ 91%]
tests/test_url_features.py::test_valid_alias[A_9-x] PASSED               [ 92%]
tests/test_url_features.py::test_valid_alias[aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa] PASSED [ 92%]
tests/test_url_features.py::test_invalid_expiry[2020-01-01T00:00:00Z] PASSED [ 92%]
tests/test_url_features.py::test_invalid_expiry[2099-01-01T00:00:00] PASSED [ 93%]
tests/test_url_features.py::test_invalid_expiry[nonsense] PASSED         [ 93%]
tests/test_url_features.py::test_invalid_expiry[9999999999] PASSED       [ 93%]
tests/test_url_features.py::test_expiry_normalized_to_utc PASSED         [ 93%]
tests/test_url_features.py::test_alias_create_conflict_delete_and_list PASSED [ 94%]
tests/test_url_features.py::test_expired_cache_hit_returns_410 PASSED    [ 94%]
tests/test_url_features.py::test_api_validation_is_422[payload0] PASSED  [ 94%]
tests/test_url_features.py::test_api_validation_is_422[payload1] PASSED  [ 94%]
tests/test_url_features.py::test_api_validation_is_422[payload2] PASSED  [ 95%]
tests/test_url_features.py::test_api_validation_is_422[payload3] PASSED  [ 95%]
tests/test_url_features.py::test_missing_delete_and_redirect PASSED      [ 95%]
tests/test_url_features.py::test_openapi_documents_fields_and_statuses PASSED [ 95%]
tests/test_url_features.py::test_cache_absolute_deadline_and_eviction PASSED [ 96%]
tests/test_url_features.py::test_multicast_rejected[http://224.0.0.1] PASSED [ 96%]
tests/test_url_features.py::test_multicast_rejected[http://[ff02::1]] PASSED [ 96%]
tests/test_url_features.py::test_numeric_string_expiry_rejected PASSED   [ 97%]
tests/test_url_features.py::test_no_redirect_if_expiry_passes_during_click_publication PASSED [ 97%]
tests/test_url_features.py::test_cache_not_used_when_database_fails PASSED [ 97%]
tests/test_url_features.py::test_far_expiry_cache_is_capped_at_jittered_ttl PASSED [ 97%]
tests/test_url_features.py::test_alias_is_case_sensitive PASSED          [ 98%]
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

tests/integration/test_redis_postgres.py::test_shorten_redirect_idle_flush_analytics
  /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/lib/python3.11/site-packages/testcontainers/redis/__init__.py:46: DeprecationWarning: The @wait_container_is_ready decorator is deprecated and will be removed in a future version. Use structured wait strategies instead: container.waiting_for(HttpWaitStrategy(8080).for_status_code(200)) or container.waiting_for(LogMessageWaitStrategy('ready'))
    @wait_container_is_ready(redis.exceptions.ConnectionError)

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
================================ tests coverage ================================
______________ coverage: platform darwin, python 3.11.14-final-0 _______________

Name                                       Stmts   Miss  Cover   Missing
------------------------------------------------------------------------
app/__init__.py                                0      0   100%
app/abuse/__init__.py                          0      0   100%
app/abuse/classifier.py                       57      2    96%   42, 47
app/abuse/heuristics.py                       61      0   100%
app/abuse/persistence.py                      47      3    94%   46-47, 68
app/abuse/schemas.py                          19      0   100%
app/api/__init__.py                            0      0   100%
app/api/auth.py                               33      0   100%
app/api/routes.py                            145      4    97%   112-113, 178, 215
app/cache/__init__.py                          0      0   100%
app/cache/circuit_breaker.py                  49      1    98%   57
app/cache/redis_client.py                     94     16    83%   30, 33, 36, 39, 42, 47-48, 57-59, 145-146, 153-154, 161-162
app/cache/singleflight.py                     37      1    97%   34
app/cli.py                                    66     10    85%   30-32, 80, 98, 102-106, 110
app/core/__init__.py                           0      0   100%
app/core/config.py                            85     15    82%   17, 19, 35, 42, 49, 56, 74, 85, 89, 91, 103, 111, 136, 138, 141
app/db/__init__.py                             0      0   100%
app/db/database.py                            17      6    65%   33-39
app/events/__init__.py                        13      1    92%   18
app/events/base.py                            12      0   100%
app/events/kafka.py                           58      5    91%   27, 39, 51, 64, 67
app/events/memory.py                          49      0   100%
app/events/models.py                          35      1    97%   67
app/events/publisher.py                       78      5    94%   52, 60-61, 104-105
app/events/redis_streams.py                   52      2    96%   86, 142
app/kafka/__init__.py                          0      0   100%
app/kafka/consumer.py                          4      0   100%
app/kafka/producer.py                          7      0   100%
app/llm/__init__.py                            5      0   100%
app/llm/base.py                               30      0   100%
app/llm/limits.py                             37      1    97%   15
app/llm/providers.py                         155     10    94%   84, 112, 117, 158, 165, 179, 211-212, 297-298
app/main.py                                   48      8    83%   46-47, 62-63, 66, 84-86
app/middleware/hardening.py                   47      2    96%   30, 50
app/middleware/rate_limiter.py                88      1    99%   90
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
app/services/activity_signals.py              39      0   100%
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
TOTAL                                       2313    142    94%
Coverage XML written to file coverage.xml
Coverage JSON written to file coverage.json
=============== 374 passed, 10 deselected, 6 warnings in 31.11s ================
```

## make mcp-test

```text
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m black --check mcp-server/mcp_server
All done! ✨ 🍰 ✨
14 files would be left unchanged.
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m isort --check-only mcp-server/mcp_server
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m flake8 mcp-server/mcp_server
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m mypy mcp-server/mcp_server
Success: no issues found in 14 source files
cd mcp-server && /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m pytest
...................................                                      [100%]
35 passed in 0.62s
```


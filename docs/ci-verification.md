# CI restructuring verification — 2026-10-27

Historical baseline: these were the initial CI results. See
[security remediation verification](ci-security-verification.md) for subsequent fixes.

Branch: `step-5-2-ci`. Local macOS ARM/Docker Desktop results, not a claim that
GitHub-hosted workflows or a registry release have already succeeded.

| Check | Exit | Result |
| --- | --- | --- |
| `make check` | 0 | Black/isort/Flake8/mypy; 372 passed, 23 deselected; promtool rules/tests pass |
| `make test-integration` | 0 | 384 passed, 11 deselected; PostgreSQL/Redis Testcontainers; 93.64% against 93.6% |
| `make frontend-check` + production build | 0 | npm ci, ESLint, 5 frontend tests, tsc, Next build pass |
| `make mcp-test` | 0 | 35 tests; MCP formatting/lint/type checks pass |
| Fresh kind deployment + HTTP smoke + 30-second k6 | 0 | All application rollouts ready; 151 redirects, p95 17.66ms, 0% errors, 302/302 checks |
| `actionlint` | 0 | No diagnostics |
| Black/isort/Flake8 on three changed unit-test files | 0 | Pass |
| Gitleaks full Git history | 0 | 80 commits, no leaks (before this commit) |
| Buildx backend image | 0 | Image built and loaded locally |
| pip-audit runtime + MCP locks | 1 | 23 advisory entries in 5 packages; blocking |
| Trivy 0.67.2 image scan | 1 | 87 fixable HIGH/CRITICAL entries; blocking |
| npm audit | 1 | 26 findings: 1 low, 4 moderate, 19 high, 2 critical; advisory |

## Security failures remain visible

pip-audit reports certifi 2026.7.22, filelock 4.2.0, kafka-python 2.3.1,
starlette 0.52.1, and mcp 1.28.1. Counts are scanner entries, which can include
multiple advisory IDs for the same underlying problem. Trivy reports 76 OS and
11 Python findings in `url-shortener-ci:verification` (Debian 13.3). No exceptions
were added. These gates intentionally prevent release; passing functional tests
does not clear the vulnerabilities. Dependency upgrades, including potentially
incompatible Starlette/MCP versions, need their own scoped compatibility work.

Raw local audit JSON files are ignored under `reports/`. Reproduce the exact gates
from `.github/workflows/ci.yml` and `docker.yml`; advisory feeds change over time.
The local frontend install warned about its Node engine (local Node 23.9.0);
CI pins Node 22.23.4. Installation and all frontend checks nevertheless exited 0.

## Failures caught while implementing the gate

Negative HTTP tests initially exposed that macOS Bash 3.2 continued after failed
`[[ ]]` assertions under `set -e`. Explicit exits now reject unexpected auth/status
responses. The regression tests exercise successful smoke, missing authentication
enforcement, and a 503 instead of throttling against a controlled local HTTP server.

The first disposable kind run failed its migration before dependency startup:

```text
Active Deadline Seconds: 180s
Warning DeadlineExceeded: Job was active longer than specified deadline
postgres-0: Successfully pulled image "postgres:16.13-alpine" ...
(4m24.772s including waiting)
```

The already-failed Job's remaining completion wait was interrupted to collect
failure diagnostics and delete the owned cluster. `deploy.sh` now initially
suspends the Job and resumes it after dependencies are ready; its bounded execution
deadline is preserved. A fresh cluster retry passed after this change. Both disposable clusters were deleted.

## Fresh kind run (exit 0)

Command: `RUN_K6=true KIND_NAME=shortener-ci-verify RESULTS_DIR=artifacts/k8s-verified bash scripts/kind_smoke.sh`.
Both overlays passed kubeconform; the existing CI overlay deployed with the SHA image.
All application deployments completed rollout, PVCs were Bound, and the migration completed.
Actual smoke output:

```text
Deployment ready. Run scripts/smoke_test.sh against a port-forward.
PASS: health; shorten; redirect 307; analytics=1; metrics; auth=401; rate-limit=429
```

The k6 JSON summary recorded 151 redirects in 30 seconds, redirect p95 **17.6645ms**,
redirect error rate **0**, 302 passing checks and zero failed checks or dropped
iterations. All four thresholds passed. Both temporary API keys were revoked and
the owned kind cluster was deleted. This is local smoke-load evidence, not a
production latency guarantee. Full local deployment/smoke/k6 logs and summary JSON
are in ignored `artifacts/k8s-verified/`; CI uploads equivalent files automatically.

## Not run locally

GitHub-hosted Actions orchestration/cache/artifact transfer, CodeQL extraction and
security upload, optional Codecov upload, and GHCR authentication/publication were
not run. No release tag was created and no image was pushed. Optional slow Kafka
integration tests are intentionally excluded from this Redis Streams CI gate.

## Complete functional command output

The following are actual outputs. Local paths identify this verification environment.

<details>
<summary>make check — exit 0</summary>

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
collecting ... collected 395 items / 23 deselected / 372 selected

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
tests/test_abuse.py::test_each_heuristic[https://bit.ly/abc-shortener_chain] PASSED [  2%]
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
tests/test_abuse.py::test_invalid_schema_suspicious[{"verdict":"clean","confidence":1,"reasons":["llm_uncertain"],"tool":"fetch"}] PASSED [  5%]
tests/test_abuse.py::test_budget_unavailable_is_reviewable PASSED        [  6%]
tests/test_abuse.py::test_injection_quoted_capped_and_cannot_clear_heuristic PASSED [  6%]
tests/test_abuse.py::test_outbox_publish_duplicate_and_commit_before_ack PASSED [  6%]
tests/test_abuse.py::test_outbox_rollback_when_commit_fails PASSED       [  6%]
tests/test_abuse.py::test_relay_failure_retains_outbox PASSED            [  7%]
tests/test_abuse.py::test_failed_verdict_commit_is_not_acked PASSED      [  7%]
tests/test_abuse.py::test_malformed_goes_to_dlq_before_ack PASSED        [  7%]
tests/test_abuse.py::test_enforcement_on_warm_cache_and_review PASSED    [  8%]
tests/test_abuse.py::test_suspicious_redirect_and_deleted_precedence PASSED [  8%]
tests/test_abuse.py::test_redis_failure_does_not_skip_analysis PASSED    [  8%]
tests/test_abuse.py::test_invalid_cached_result_recomputed PASSED        [  8%]
tests/test_abuse.py::test_worker_run_metrics_and_shutdown PASSED         [  9%]
tests/test_abuse.py::test_store_does_not_replace_review PASSED           [  9%]
tests/test_abuse.py::test_missing_deleted_events_ack_without_classification PASSED [  9%]
tests/test_abuse.py::test_schema_and_new_services PASSED                 [  9%]
tests/test_abuse_eval.py::test_combined_fake_regression PASSED           [ 10%]
tests/test_abuse_eval.py::test_fixture_provenance_and_counts PASSED      [ 10%]
tests/test_abuse_eval.py::test_splits_stable_grouped_and_limit_does_not_change_membership PASSED [ 10%]
tests/test_abuse_eval.py::test_loader_rejects_bad_rows_without_echo[url,label\nhttps://example.com,unknown\n] PASSED [ 11%]
tests/test_abuse_eval.py::test_loader_rejects_bad_rows_without_echo[label,url\nbenign,https://example.com\n] PASSED [ 11%]
tests/test_abuse_eval.py::test_loader_rejects_bad_rows_without_echo[url,label\nhttps://user:secret@example.com,benign\n] PASSED [ 11%]
tests/test_abuse_eval.py::test_loader_rejects_bad_rows_without_echo[url,label\nhttps://example.com,benign\nhttps://example.com,malicious\n] PASSED [ 11%]
tests/test_abuse_eval.py::test_loader_rejects_bad_rows_without_echo[url,label\nhttps://example.com\n] PASSED [ 12%]
tests/test_abuse_eval.py::test_loader_rejects_bad_rows_without_echo[url,label\nfile:///tmp/private,benign\n] PASSED [ 12%]
tests/test_abuse_eval.py::test_loader_deduplicates_and_does_not_recurse PASSED [ 12%]
tests/test_abuse_eval.py::test_metric_arithmetic_and_undefined_values PASSED [ 12%]
tests/test_abuse_eval.py::test_variants_and_constant_fake_have_no_label_access PASSED [ 13%]
tests/test_abuse_eval.py::test_budget_failures_are_reported_not_hidden PASSED [ 13%]
tests/test_abuse_eval.py::test_reported_tokens_and_missing_metadata PASSED [ 13%]
tests/test_abuse_eval.py::test_runner_writes_both_formats_without_urls PASSED [ 13%]
tests/test_abuse_eval.py::test_dev_run_is_explicitly_marked PASSED       [ 14%]
tests/test_analytics_repository.py::test_batch_create_clicks_uses_single_execute_call PASSED [ 14%]
tests/test_analytics_repository.py::test_batch_create_clicks_returns_zero_for_empty_list PASSED [ 14%]
tests/test_analytics_repository.py::test_analytics_repository_count_and_timestamps PASSED [ 15%]
tests/test_analytics_service.py::test_get_analytics_uses_repository_results PASSED [ 15%]
tests/test_app_assembly.py::test_middleware_and_metrics PASSED           [ 15%]
tests/test_app_assembly.py::test_cors_preflight PASSED                   [ 15%]
tests/test_app_assembly.py::test_rate_limiter_is_registered PASSED       [ 16%]
tests/test_app_assembly.py::test_main_routes PASSED                      [ 16%]
tests/test_app_assembly.py::test_service_failures_are_503[/urls-service0-list_recent_urls] PASSED [ 16%]
tests/test_app_assembly.py::test_service_failures_are_503[/analytics/code-service1-get_analytics] PASSED [ 16%]
tests/test_app_assembly.py::test_health_dependency_failures[db] PASSED   [ 17%]
tests/test_app_assembly.py::test_health_dependency_failures[redis] PASSED [ 17%]
tests/test_app_assembly.py::test_health_dependency_failures[both] PASSED [ 17%]
tests/test_app_assembly.py::test_false_redis_ping_is_unhealthy PASSED    [ 18%]
tests/test_app_assembly.py::test_livez_does_not_touch_dependencies PASSED [ 18%]
tests/test_app_assembly.py::test_redirect_falls_back_on_redis_read_failure[ConnectionError] PASSED [ 18%]
tests/test_app_assembly.py::test_redirect_falls_back_on_redis_read_failure[TimeoutError] PASSED [ 18%]
tests/test_app_assembly.py::test_redis_health_read_failures[ping] PASSED [ 19%]
tests/test_app_assembly.py::test_redis_health_read_failures[dbsize] PASSED [ 19%]
tests/test_app_assembly.py::test_health_session_acquisition_failure PASSED [ 19%]
tests/test_app_assembly.py::test_health_session_is_closed PASSED         [ 19%]
tests/test_app_assembly.py::test_stopped_redis_never_makes_redirect_5xx_and_health_reports_breaker PASSED [ 20%]
tests/test_auth.py::test_key_hashing_metadata_and_revocation PASSED      [ 20%]
tests/test_auth.py::test_key_invalid_creation[-scopes0] PASSED           [ 20%]
tests/test_auth.py::test_key_invalid_creation[ok-scopes1] PASSED         [ 20%]
tests/test_auth.py::test_key_invalid_creation[ok-scopes2] PASSED         [ 21%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-POST-/shorten] PASSED [ 21%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-DELETE-/urls/code] PASSED [ 21%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-GET-/urls] PASSED [ 22%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-GET-/analytics/code] PASSED [ 22%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-GET-/admin/keys] PASSED [ 22%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-DELETE-/admin/keys/1] PASSED [ 22%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-POST-/shorten] PASSED [ 23%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-DELETE-/urls/code] PASSED [ 23%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-GET-/urls] PASSED [ 23%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-GET-/analytics/code] PASSED [ 23%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-GET-/admin/keys] PASSED [ 24%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-DELETE-/admin/keys/1] PASSED [ 24%]
tests/test_auth.py::test_scope_enforcement_and_creator PASSED            [ 24%]
tests/test_auth.py::test_public_endpoints_and_openapi PASSED             [ 25%]
tests/test_auth.py::test_auth_database_failure_is_503 PASSED             [ 25%]
tests/test_auth.py::test_write_limits_and_key_isolation PASSED           [ 25%]
tests/test_auth.py::test_delete_uses_template_bucket_not_code PASSED     [ 25%]
tests/test_auth.py::test_redirects_share_ip_bucket_and_ignore_spoofed_headers PASSED [ 26%]
tests/test_auth.py::test_redis_failure_closes_writes_but_not_redirects PASSED [ 26%]
tests/test_auth.py::test_internal_metrics_not_exposed_on_api_port PASSED [ 26%]
tests/test_auth.py::test_cli_prints_key_once_and_never_lists_hash PASSED [ 26%]
tests/test_base62.py::test_encode_base62_zero_returns_empty_string PASSED [ 27%]
tests/test_base62.py::test_encode_base62_small_numbers PASSED            [ 27%]
tests/test_base62.py::test_encode_base62_larger_number PASSED            [ 27%]
tests/test_cache_strategy.py::test_circuit_open_half_open_closed_and_failed_probe PASSED [ 27%]
tests/test_cache_strategy.py::test_only_one_half_open_probe_and_stale_success_cannot_close PASSED [ 28%]
tests/test_cache_strategy.py::test_success_resets_consecutive_failures PASSED [ 28%]
tests/test_cache_strategy.py::test_client_timeout_and_retry_configuration PASSED [ 28%]
tests/test_cache_strategy.py::test_ttl_jitter_bounds_and_absolute_expiry PASSED [ 29%]
tests/test_cache_strategy.py::test_many_cold_requests_share_one_database_read[False] PASSED [ 29%]
tests/test_cache_strategy.py::test_many_cold_requests_share_one_database_read[True] PASSED [ 29%]
tests/test_cache_strategy.py::test_cross_process_lock_wait_rechecks_cache PASSED [ 29%]
tests/test_cache_strategy.py::test_negative_caching_and_alias_creation_invalidation PASSED [ 30%]
tests/test_cache_strategy.py::test_alias_creation_fences_an_inflight_negative_fill PASSED [ 30%]
tests/test_cache_strategy.py::test_lock_release_and_publication_require_owner PASSED [ 30%]
tests/test_cache_strategy.py::test_negative_cache_expiry PASSED          [ 30%]
tests/test_cache_strategy.py::test_redis_down_falls_back_and_counts_metric PASSED [ 31%]
tests/test_cache_strategy.py::test_singleflight_timeout_and_exception_cleanup PASSED [ 31%]
tests/test_cache_strategy.py::test_positive_cache_still_checks_deletion_and_database_failure PASSED [ 31%]
tests/test_ci_workflows.py::test_release_only_publishes_after_ci_and_scanning PASSED [ 31%]
tests/test_ci_workflows.py::test_ci_checks_are_independent_and_actions_are_immutable PASSED [ 32%]
tests/test_code_generation.py::test_100000_candidates_are_unique_and_url_safe PASSED [ 32%]
tests/test_code_generation.py::test_production_generator_uses_secrets_choice PASSED [ 32%]
tests/test_code_generation.py::test_collision_retries_preserve_existing_destination PASSED [ 33%]
tests/test_code_generation.py::test_exhaustion_is_bounded_and_leaves_transaction_usable PASSED [ 33%]
tests/test_code_generation.py::test_non_collision_integrity_error_is_not_retried PASSED [ 33%]
tests/test_code_generation.py::test_static_route_names_are_not_allocated PASSED [ 33%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_USER] PASSED [ 34%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_PASSWORD] PASSED [ 34%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_DB] PASSED [ 34%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[GRAFANA_ADMIN_USER] PASSED [ 34%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[GRAFANA_ADMIN_PASSWORD] PASSED [ 35%]
tests/test_deployment_config.py::test_compose_uses_same_database_credentials_for_all_clients PASSED [ 35%]
tests/test_deployment_config.py::test_profile_selects_matching_brokers[kafka] PASSED [ 35%]
tests/test_deployment_config.py::test_profile_selects_matching_brokers[redis-streams] PASSED [ 36%]
tests/test_deployment_config.py::test_kubernetes_metrics_use_internal_port_and_network_policy PASSED [ 36%]
tests/test_event_bus.py::test_duplicate_delivery_one_row_and_commit_before_ack PASSED [ 36%]
tests/test_event_bus.py::test_malformed_or_unknown_version_dlq_after_three_attempts[{broken] PASSED [ 36%]
tests/test_event_bus.py::test_malformed_or_unknown_version_dlq_after_three_attempts[{"schema_version":99,"short_code":"abc123"}] PASSED [ 37%]
tests/test_event_bus.py::test_poison_row_does_not_discard_healthy_batch_rows PASSED [ 37%]
tests/test_event_bus.py::test_database_error_never_acknowledges_or_deadletters PASSED [ 37%]
tests/test_event_bus.py::test_commit_failure_does_not_ack PASSED         [ 37%]
tests/test_event_bus.py::test_dlq_publish_failure_does_not_advance_offset PASSED [ 38%]
tests/test_event_bus.py::test_idle_timer_and_shutdown_flush[False] PASSED [ 38%]
tests/test_event_bus.py::test_idle_timer_and_shutdown_flush[True] PASSED [ 38%]
tests/test_event_bus.py::test_slow_broker_and_full_queue_do_not_block_redirects PASSED [ 38%]
tests/test_event_bus.py::test_kafka_raw_poll_and_explicit_offsets PASSED [ 39%]
tests/test_event_bus.py::test_redis_groups_recover_pending_before_new_reads PASSED [ 39%]
tests/test_event_bus.py::test_memory_groups_and_unacknowledged_recovery PASSED [ 39%]
tests/test_event_bus.py::test_dlq_list_and_replay_preserve_event_id PASSED [ 40%]
tests/test_event_bus.py::test_adapter_selection_without_connecting[memory-InMemoryEventBus] PASSED [ 40%]
tests/test_event_bus.py::test_adapter_selection_without_connecting[kafka-KafkaEventBus] PASSED [ 40%]
tests/test_event_bus.py::test_adapter_selection_without_connecting[redis_streams-RedisStreamsEventBus] PASSED [ 40%]
tests/test_event_bus.py::test_legacy_event_without_id_goes_to_dlq PASSED [ 41%]
tests/test_event_bus.py::test_memory_recovers_more_than_one_batch PASSED [ 41%]
tests/test_event_bus.py::test_idle_timer_flushes_even_when_later_polls_fail PASSED [ 41%]
tests/test_hardening.py::test_body_limit_and_safe_errors PASSED          [ 41%]
tests/test_hardening.py::test_chunked_body_cannot_bypass_limit PASSED    [ 42%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[*] PASSED   [ 42%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[https://*.example.com] PASSED [ 42%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[https://user:pass@example.com] PASSED [ 43%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[https://example.com/path] PASSED [ 43%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[] PASSED    [ 43%]
tests/test_hardening.py::test_production_accepts_exact_origin PASSED     [ 43%]
tests/test_hardening.py::test_all_kubernetes_containers_have_security_and_resources PASSED [ 44%]
tests/test_hardening.py::test_network_policy_default_deny_and_exact_dependency_ports PASSED [ 44%]
tests/test_hardening.py::test_slow_request_body_returns_408 PASSED       [ 44%]
tests/test_hardening.py::test_kafka_constructor_uses_supported_bounded_timeouts PASSED [ 44%]
tests/test_hardening.py::test_cors_setting_is_configmap_data_not_object_metadata PASSED [ 45%]
tests/test_hardening.py::test_frontend_build_excludes_local_secrets_and_artifacts PASSED [ 45%]
tests/test_health_route.py::test_health_endpoint_includes_total_urls PASSED [ 45%]
tests/test_kustomize.py::test_overlay_contract[ci] PASSED                [ 45%]
tests/test_kustomize.py::test_overlay_contract[local] PASSED             [ 46%]
tests/test_kustomize.py::test_scripts_are_strict_and_syntax_valid PASSED [ 46%]
tests/test_kustomize.py::test_deploy_stops_before_final_apply_on_wait_failure[rollout status statefulset/postgres] PASSED [ 46%]
tests/test_kustomize.py::test_deploy_stops_before_final_apply_on_wait_failure[wait --for=condition=complete job/db-migrate] PASSED [ 47%]
tests/test_kustomize.py::test_migration_deadline_starts_after_dependencies PASSED [ 47%]
tests/test_llm.py::test_fake_deterministic_and_factory PASSED            [ 47%]
tests/test_llm.py::test_recorded_contracts[GeminiProvider-reply0] PASSED [ 47%]
tests/test_llm.py::test_recorded_contracts[OllamaProvider-reply1] PASSED [ 48%]
tests/test_llm.py::test_recorded_contracts[ClaudeProvider-reply2] PASSED [ 48%]
tests/test_llm.py::test_backoff_jitter_and_budget_per_attempt[429] PASSED [ 48%]
tests/test_llm.py::test_backoff_jitter_and_budget_per_attempt[500] PASSED [ 48%]
tests/test_llm.py::test_backoff_jitter_and_budget_per_attempt[503] PASSED [ 49%]
tests/test_llm.py::test_single_schema_repair[not JSON] PASSED            [ 49%]
tests/test_llm.py::test_single_schema_repair[{"safe":"true"}] PASSED     [ 49%]
tests/test_llm.py::test_single_schema_repair[{"safe":true,"extra":1}] PASSED [ 50%]
tests/test_llm.py::test_bad_envelope_repaired_once PASSED                [ 50%]
tests/test_llm.py::test_invalid_output_does_not_leak PASSED              [ 50%]
tests/test_llm.py::test_transport_errors_sanitized_no_retry[failure0] PASSED [ 50%]
tests/test_llm.py::test_transport_errors_sanitized_no_retry[failure1] PASSED [ 51%]
tests/test_llm.py::test_bounded_failures[400-1] PASSED                   [ 51%]
tests/test_llm.py::test_bounded_failures[401-1] PASSED                   [ 51%]
tests/test_llm.py::test_bounded_failures[302-1] PASSED                   [ 51%]
tests/test_llm.py::test_bounded_failures[429-3] PASSED                   [ 52%]
tests/test_llm.py::test_bounded_failures[503-3] PASSED                   [ 52%]
tests/test_llm.py::test_budget_includes_repairs_and_is_shared PASSED     [ 52%]
tests/test_llm.py::test_budget_resets_next_utc_day_and_zero_disables PASSED [ 52%]
tests/test_llm.py::test_global_concurrency_across_instances PASSED       [ 53%]
tests/test_llm.py::test_capacity_timeout_does_not_spend_budget PASSED    [ 53%]
tests/test_llm.py::test_missing_configuration[GeminiProvider-GEMINI_API_KEY] PASSED [ 53%]
tests/test_llm.py::test_missing_configuration[ClaudeProvider-ANTHROPIC_API_KEY] PASSED [ 54%]
tests/test_llm.py::test_missing_configuration[OllamaProvider-OLLAMA_MODEL] PASSED [ 54%]
tests/test_llm.py::test_ollama_remote_or_credential_url_rejected[https://ollama.com] PASSED [ 54%]
tests/test_llm.py::test_ollama_remote_or_credential_url_rejected[http://user:secret@localhost:11434] PASSED [ 54%]
tests/test_llm.py::test_ollama_remote_or_credential_url_rejected[http://localhost:11434?key=secret] PASSED [ 55%]
tests/test_llm.py::test_attempt_metrics PASSED                           [ 55%]
tests/test_llm.py::test_http_privacy_suppresses_instrumentation PASSED   [ 55%]
tests/test_llm.py::test_oversized_response_rejected PASSED               [ 55%]
tests/test_llm.py::test_deadline_checked_between_chunks PASSED           [ 56%]
tests/test_llm.py::test_cloud_model_rejected PASSED                      [ 56%]
tests/test_llm.py::test_budget_reservations_atomic PASSED                [ 56%]
tests/test_llm.py::test_gemini_paces_retries_repairs_and_shared_instances PASSED [ 56%]
tests/test_llm.py::test_evaluation_retains_only_safe_http_status PASSED  [ 57%]
tests/test_mcp_api_contract.py::test_recorded_api_contract PASSED        [ 57%]
tests/test_mcp_api_contract.py::test_activity_partial_failure PASSED     [ 57%]
tests/test_mcp_api_contract.py::test_signal_code_isolation_and_window PASSED [ 58%]
tests/test_mcp_api_contract.py::test_status_has_no_redirect_side_effect PASSED [ 58%]
tests/test_mcp_api_contract.py::test_admin_auth_required PASSED          [ 58%]
tests/test_mcp_api_contract.py::test_actual_429_only_and_per_code PASSED [ 58%]
tests/test_mcp_api_contract.py::test_rejection_storage_is_independent_and_bounded PASSED [ 59%]
tests/test_mcp_api_contract.py::test_admin_read_scope_is_insufficient PASSED [ 59%]
tests/test_mcp_api_contract.py::test_signal_queries_only_requested_code_and_completed_minutes PASSED [ 59%]
tests/test_mcp_api_contract.py::test_database_failure_not_empty_activity PASSED [ 59%]
tests/test_mcp_api_contract.py::test_status_block_allow_expiry_precedence PASSED [ 60%]
tests/test_migrations.py::test_migrations_on_empty_sqlite PASSED         [ 60%]
tests/test_migrations.py::test_offline_sql_uses_postgresql_settings PASSED [ 60%]
tests/test_observability.py::test_w3c_event_roundtrip_and_invalid_context_isolation PASSED [ 61%]
tests/test_observability.py::test_json_log_has_active_trace_and_no_secrets[api] PASSED [ 61%]
tests/test_observability.py::test_json_log_has_active_trace_and_no_secrets[worker] PASSED [ 61%]
tests/test_observability.py::test_json_log_has_active_trace_and_no_secrets[abuse-worker] PASSED [ 61%]
tests/test_observability.py::test_privacy_export_boundary_for_every_process[api] PASSED [ 62%]
tests/test_observability.py::test_privacy_export_boundary_for_every_process[worker] PASSED [ 62%]
tests/test_observability.py::test_privacy_export_boundary_for_every_process[abuse-worker] PASSED [ 62%]
tests/test_observability.py::test_redirect_publish_consume_sql_share_one_trace PASSED [ 62%]
tests/test_observability.py::test_init_instruments_existing_engine_and_uses_configured_otlp PASSED [ 63%]
tests/test_rate_limiter.py::test_bucket_burst_refill_and_identity_isolation PASSED [ 63%]
tests/test_rate_limiter.py::test_bucket_concurrent_burst PASSED          [ 63%]
tests/test_rate_limiter.py::test_bucket_error_and_clock_regression PASSED [ 63%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[198.51.100.5-1.2.3.4-trusted0-198.51.100.5] PASSED [ 64%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[198.51.100.5-1.2.3.4-trusted1-198.51.100.5] PASSED [ 64%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[10.0.0.1-198.51.100.5-trusted2-198.51.100.5] PASSED [ 64%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[10.0.0.1-1.2.3.4, 198.51.100.5-trusted3-198.51.100.5] PASSED [ 65%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[10.0.0.1-198.51.100.5, 10.0.0.2-trusted4-198.51.100.5] PASSED [ 65%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[::1-2001:db8::1-trusted5-2001:db8::1] PASSED [ 65%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[10.0.0.1-garbage-trusted6-10.0.0.1] PASSED [ 65%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[get-ConnectionError] PASSED [ 66%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[get-TimeoutError] PASSED [ 66%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[ping-ConnectionError] PASSED [ 66%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[ping-TimeoutError] PASSED [ 66%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[dbsize-ConnectionError] PASSED [ 67%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[dbsize-TimeoutError] PASSED [ 67%]
tests/test_redis_client.py::test_programming_errors_are_not_hidden PASSED [ 67%]
tests/test_redis_client.py::test_normal_cache_reads[https://example.com/-counter0] PASSED [ 68%]
tests/test_redis_client.py::test_normal_cache_reads[None-counter1] PASSED [ 68%]
tests/test_routes.py::test_create_short_url_returns_service_code PASSED  [ 68%]
tests/test_routes.py::test_redirect_returns_redirect_response PASSED     [ 68%]
tests/test_routes.py::test_redirect_raises_404_for_missing_code PASSED   [ 69%]
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
tests/test_smoke_script.py::test_smoke_checks_auth_and_throttling[False-False-True] PASSED [ 72%]
tests/test_smoke_script.py::test_smoke_checks_auth_and_throttling[True-False-False] PASSED [ 72%]
tests/test_smoke_script.py::test_smoke_checks_auth_and_throttling[False-True-False] PASSED [ 73%]
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
tests/test_url_features.py::test_reject_unsafe_urls[http://sub.localhost] PASSED [ 77%]
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
tests/test_url_features.py::test_reject_unsafe_urls[http://[::ffff:192.168.0.1]] PASSED [ 81%]
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
tests/test_url_features.py::test_invalid_alias[\xe9\xe9\xe9] PASSED      [ 88%]
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
=============== 372 passed, 23 deselected, 5 warnings in 15.75s ================
sh scripts/check-prometheus.sh
Checking rules/slo.yml
  SUCCESS: 22 rules found

  SUCCESS


```
</details>

<details>
<summary>make test-integration — exit 0</summary>

```text
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m pytest --run-integration -m "not slow and not docker" --cov=app --cov-report=term-missing --cov-report=xml --cov-report=json:coverage.json
============================= test session starts ==============================
platform darwin -- Python 3.11.14, pytest-9.0.3, pluggy-1.7.0 -- /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python
cachedir: .pytest_cache
rootdir: /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener
configfile: pytest.ini
testpaths: tests
plugins: platformdirs-4.13.0, cov-7.1.0, anyio-4.15.1
collecting ... collected 395 items / 11 deselected / 384 selected

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
tests/test_abuse.py::test_each_heuristic[https://xn--bcher-kva.de/-punycode] PASSED [  3%]
tests/test_abuse.py::test_each_heuristic[https://p\u0430ypal.com/-mixed_script] PASSED [  4%]
tests/test_abuse.py::test_each_heuristic[https://a.b.c.d.example.com/-deep_subdomains] PASSED [  4%]
tests/test_abuse.py::test_each_heuristic[https://example.zip/-suspicious_tld] PASSED [  4%]
tests/test_abuse.py::test_each_heuristic[https://example.com/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-long_url] PASSED [  4%]
tests/test_abuse.py::test_each_heuristic[https://example.com/123456789012-many_digits] PASSED [  5%]
tests/test_abuse.py::test_each_heuristic[https://example.com/----------------many_specials] PASSED [  5%]
tests/test_abuse.py::test_each_heuristic[https://paypal.attacker.com/-brand_subdomain] PASSED [  5%]
tests/test_abuse.py::test_each_heuristic[https://bit.ly/abc-shortener_chain] PASSED [  5%]
tests/test_abuse.py::test_each_heuristic[https://example.com/%6Cogin-credential_path] PASSED [  6%]
tests/test_abuse.py::test_each_heuristic[https://example.com/verify-credential_path] PASSED [  6%]
tests/test_abuse.py::test_each_heuristic[https://example.com/secure-credential_path] PASSED [  6%]
tests/test_abuse.py::test_each_heuristic[https://example.com/update-credential_path] PASSED [  7%]
tests/test_abuse.py::test_registered_domains_and_counts PASSED           [  7%]
tests/test_abuse.py::test_low_high_skip_model PASSED                     [  7%]
tests/test_abuse.py::test_gray_zone_and_domain_cache PASSED              [  7%]
tests/test_abuse.py::test_invalid_schema_suspicious[oops] PASSED         [  8%]
tests/test_abuse.py::test_invalid_schema_suspicious[{"verdict":"clean","confidence":1,"reasons":["anything"]}] PASSED [  8%]
tests/test_abuse.py::test_invalid_schema_suspicious[{"verdict":"clean","confidence":2,"reasons":["llm_uncertain"]}] PASSED [  8%]
tests/test_abuse.py::test_invalid_schema_suspicious[{"verdict":"clean","confidence":1,"reasons":["llm_uncertain"],"tool":"fetch"}] PASSED [  8%]
tests/test_abuse.py::test_budget_unavailable_is_reviewable PASSED        [  9%]
tests/test_abuse.py::test_injection_quoted_capped_and_cannot_clear_heuristic PASSED [  9%]
tests/test_abuse.py::test_outbox_publish_duplicate_and_commit_before_ack PASSED [  9%]
tests/test_abuse.py::test_outbox_rollback_when_commit_fails PASSED       [  9%]
tests/test_abuse.py::test_relay_failure_retains_outbox PASSED            [ 10%]
tests/test_abuse.py::test_failed_verdict_commit_is_not_acked PASSED      [ 10%]
tests/test_abuse.py::test_malformed_goes_to_dlq_before_ack PASSED        [ 10%]
tests/test_abuse.py::test_enforcement_on_warm_cache_and_review PASSED    [ 10%]
tests/test_abuse.py::test_suspicious_redirect_and_deleted_precedence PASSED [ 11%]
tests/test_abuse.py::test_redis_failure_does_not_skip_analysis PASSED    [ 11%]
tests/test_abuse.py::test_invalid_cached_result_recomputed PASSED        [ 11%]
tests/test_abuse.py::test_worker_run_metrics_and_shutdown PASSED         [ 11%]
tests/test_abuse.py::test_store_does_not_replace_review PASSED           [ 12%]
tests/test_abuse.py::test_missing_deleted_events_ack_without_classification PASSED [ 12%]
tests/test_abuse.py::test_schema_and_new_services PASSED                 [ 12%]
tests/test_abuse_eval.py::test_combined_fake_regression PASSED           [ 13%]
tests/test_abuse_eval.py::test_fixture_provenance_and_counts PASSED      [ 13%]
tests/test_abuse_eval.py::test_splits_stable_grouped_and_limit_does_not_change_membership PASSED [ 13%]
tests/test_abuse_eval.py::test_loader_rejects_bad_rows_without_echo[url,label\nhttps://example.com,unknown\n] PASSED [ 13%]
tests/test_abuse_eval.py::test_loader_rejects_bad_rows_without_echo[label,url\nbenign,https://example.com\n] PASSED [ 14%]
tests/test_abuse_eval.py::test_loader_rejects_bad_rows_without_echo[url,label\nhttps://user:secret@example.com,benign\n] PASSED [ 14%]
tests/test_abuse_eval.py::test_loader_rejects_bad_rows_without_echo[url,label\nhttps://example.com,benign\nhttps://example.com,malicious\n] PASSED [ 14%]
tests/test_abuse_eval.py::test_loader_rejects_bad_rows_without_echo[url,label\nhttps://example.com\n] PASSED [ 14%]
tests/test_abuse_eval.py::test_loader_rejects_bad_rows_without_echo[url,label\nfile:///tmp/private,benign\n] PASSED [ 15%]
tests/test_abuse_eval.py::test_loader_deduplicates_and_does_not_recurse PASSED [ 15%]
tests/test_abuse_eval.py::test_metric_arithmetic_and_undefined_values PASSED [ 15%]
tests/test_abuse_eval.py::test_variants_and_constant_fake_have_no_label_access PASSED [ 15%]
tests/test_abuse_eval.py::test_budget_failures_are_reported_not_hidden PASSED [ 16%]
tests/test_abuse_eval.py::test_reported_tokens_and_missing_metadata PASSED [ 16%]
tests/test_abuse_eval.py::test_runner_writes_both_formats_without_urls PASSED [ 16%]
tests/test_abuse_eval.py::test_dev_run_is_explicitly_marked PASSED       [ 16%]
tests/test_analytics_repository.py::test_batch_create_clicks_uses_single_execute_call PASSED [ 17%]
tests/test_analytics_repository.py::test_batch_create_clicks_returns_zero_for_empty_list PASSED [ 17%]
tests/test_analytics_repository.py::test_analytics_repository_count_and_timestamps PASSED [ 17%]
tests/test_analytics_service.py::test_get_analytics_uses_repository_results PASSED [ 17%]
tests/test_app_assembly.py::test_middleware_and_metrics PASSED           [ 18%]
tests/test_app_assembly.py::test_cors_preflight PASSED                   [ 18%]
tests/test_app_assembly.py::test_rate_limiter_is_registered PASSED       [ 18%]
tests/test_app_assembly.py::test_main_routes PASSED                      [ 19%]
tests/test_app_assembly.py::test_service_failures_are_503[/urls-service0-list_recent_urls] PASSED [ 19%]
tests/test_app_assembly.py::test_service_failures_are_503[/analytics/code-service1-get_analytics] PASSED [ 19%]
tests/test_app_assembly.py::test_health_dependency_failures[db] PASSED   [ 19%]
tests/test_app_assembly.py::test_health_dependency_failures[redis] PASSED [ 20%]
tests/test_app_assembly.py::test_health_dependency_failures[both] PASSED [ 20%]
tests/test_app_assembly.py::test_false_redis_ping_is_unhealthy PASSED    [ 20%]
tests/test_app_assembly.py::test_livez_does_not_touch_dependencies PASSED [ 20%]
tests/test_app_assembly.py::test_redirect_falls_back_on_redis_read_failure[ConnectionError] PASSED [ 21%]
tests/test_app_assembly.py::test_redirect_falls_back_on_redis_read_failure[TimeoutError] PASSED [ 21%]
tests/test_app_assembly.py::test_redis_health_read_failures[ping] PASSED [ 21%]
tests/test_app_assembly.py::test_redis_health_read_failures[dbsize] PASSED [ 21%]
tests/test_app_assembly.py::test_health_session_acquisition_failure PASSED [ 22%]
tests/test_app_assembly.py::test_health_session_is_closed PASSED         [ 22%]
tests/test_app_assembly.py::test_stopped_redis_never_makes_redirect_5xx_and_health_reports_breaker PASSED [ 22%]
tests/test_auth.py::test_key_hashing_metadata_and_revocation PASSED      [ 22%]
tests/test_auth.py::test_key_invalid_creation[-scopes0] PASSED           [ 23%]
tests/test_auth.py::test_key_invalid_creation[ok-scopes1] PASSED         [ 23%]
tests/test_auth.py::test_key_invalid_creation[ok-scopes2] PASSED         [ 23%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-POST-/shorten] PASSED [ 23%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-DELETE-/urls/code] PASSED [ 24%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-GET-/urls] PASSED [ 24%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-GET-/analytics/code] PASSED [ 24%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-GET-/admin/keys] PASSED [ 25%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-DELETE-/admin/keys/1] PASSED [ 25%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-POST-/shorten] PASSED [ 25%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-DELETE-/urls/code] PASSED [ 25%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-GET-/urls] PASSED [ 26%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-GET-/analytics/code] PASSED [ 26%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-GET-/admin/keys] PASSED [ 26%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-DELETE-/admin/keys/1] PASSED [ 26%]
tests/test_auth.py::test_scope_enforcement_and_creator PASSED            [ 27%]
tests/test_auth.py::test_public_endpoints_and_openapi PASSED             [ 27%]
tests/test_auth.py::test_auth_database_failure_is_503 PASSED             [ 27%]
tests/test_auth.py::test_write_limits_and_key_isolation PASSED           [ 27%]
tests/test_auth.py::test_delete_uses_template_bucket_not_code PASSED     [ 28%]
tests/test_auth.py::test_redirects_share_ip_bucket_and_ignore_spoofed_headers PASSED [ 28%]
tests/test_auth.py::test_redis_failure_closes_writes_but_not_redirects PASSED [ 28%]
tests/test_auth.py::test_internal_metrics_not_exposed_on_api_port PASSED [ 28%]
tests/test_auth.py::test_cli_prints_key_once_and_never_lists_hash PASSED [ 29%]
tests/test_base62.py::test_encode_base62_zero_returns_empty_string PASSED [ 29%]
tests/test_base62.py::test_encode_base62_small_numbers PASSED            [ 29%]
tests/test_base62.py::test_encode_base62_larger_number PASSED            [ 29%]
tests/test_cache_strategy.py::test_circuit_open_half_open_closed_and_failed_probe PASSED [ 30%]
tests/test_cache_strategy.py::test_only_one_half_open_probe_and_stale_success_cannot_close PASSED [ 30%]
tests/test_cache_strategy.py::test_success_resets_consecutive_failures PASSED [ 30%]
tests/test_cache_strategy.py::test_client_timeout_and_retry_configuration PASSED [ 30%]
tests/test_cache_strategy.py::test_ttl_jitter_bounds_and_absolute_expiry PASSED [ 31%]
tests/test_cache_strategy.py::test_many_cold_requests_share_one_database_read[False] PASSED [ 31%]
tests/test_cache_strategy.py::test_many_cold_requests_share_one_database_read[True] PASSED [ 31%]
tests/test_cache_strategy.py::test_cross_process_lock_wait_rechecks_cache PASSED [ 32%]
tests/test_cache_strategy.py::test_negative_caching_and_alias_creation_invalidation PASSED [ 32%]
tests/test_cache_strategy.py::test_alias_creation_fences_an_inflight_negative_fill PASSED [ 32%]
tests/test_cache_strategy.py::test_lock_release_and_publication_require_owner PASSED [ 32%]
tests/test_cache_strategy.py::test_negative_cache_expiry PASSED          [ 33%]
tests/test_cache_strategy.py::test_redis_down_falls_back_and_counts_metric PASSED [ 33%]
tests/test_cache_strategy.py::test_singleflight_timeout_and_exception_cleanup PASSED [ 33%]
tests/test_cache_strategy.py::test_positive_cache_still_checks_deletion_and_database_failure PASSED [ 33%]
tests/test_ci_workflows.py::test_release_only_publishes_after_ci_and_scanning PASSED [ 34%]
tests/test_ci_workflows.py::test_ci_checks_are_independent_and_actions_are_immutable PASSED [ 34%]
tests/test_code_generation.py::test_100000_candidates_are_unique_and_url_safe PASSED [ 34%]
tests/test_code_generation.py::test_production_generator_uses_secrets_choice PASSED [ 34%]
tests/test_code_generation.py::test_collision_retries_preserve_existing_destination PASSED [ 35%]
tests/test_code_generation.py::test_exhaustion_is_bounded_and_leaves_transaction_usable PASSED [ 35%]
tests/test_code_generation.py::test_non_collision_integrity_error_is_not_retried PASSED [ 35%]
tests/test_code_generation.py::test_static_route_names_are_not_allocated PASSED [ 35%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_USER] PASSED [ 36%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_PASSWORD] PASSED [ 36%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_DB] PASSED [ 36%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[GRAFANA_ADMIN_USER] PASSED [ 36%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[GRAFANA_ADMIN_PASSWORD] PASSED [ 37%]
tests/test_deployment_config.py::test_compose_uses_same_database_credentials_for_all_clients PASSED [ 37%]
tests/test_deployment_config.py::test_profile_selects_matching_brokers[kafka] PASSED [ 37%]
tests/test_deployment_config.py::test_profile_selects_matching_brokers[redis-streams] PASSED [ 38%]
tests/test_deployment_config.py::test_kubernetes_metrics_use_internal_port_and_network_policy PASSED [ 38%]
tests/test_event_bus.py::test_duplicate_delivery_one_row_and_commit_before_ack PASSED [ 38%]
tests/test_event_bus.py::test_malformed_or_unknown_version_dlq_after_three_attempts[{broken] PASSED [ 38%]
tests/test_event_bus.py::test_malformed_or_unknown_version_dlq_after_three_attempts[{"schema_version":99,"short_code":"abc123"}] PASSED [ 39%]
tests/test_event_bus.py::test_poison_row_does_not_discard_healthy_batch_rows PASSED [ 39%]
tests/test_event_bus.py::test_database_error_never_acknowledges_or_deadletters PASSED [ 39%]
tests/test_event_bus.py::test_commit_failure_does_not_ack PASSED         [ 39%]
tests/test_event_bus.py::test_dlq_publish_failure_does_not_advance_offset PASSED [ 40%]
tests/test_event_bus.py::test_idle_timer_and_shutdown_flush[False] PASSED [ 40%]
tests/test_event_bus.py::test_idle_timer_and_shutdown_flush[True] PASSED [ 40%]
tests/test_event_bus.py::test_slow_broker_and_full_queue_do_not_block_redirects PASSED [ 40%]
tests/test_event_bus.py::test_kafka_raw_poll_and_explicit_offsets PASSED [ 41%]
tests/test_event_bus.py::test_redis_groups_recover_pending_before_new_reads PASSED [ 41%]
tests/test_event_bus.py::test_memory_groups_and_unacknowledged_recovery PASSED [ 41%]
tests/test_event_bus.py::test_dlq_list_and_replay_preserve_event_id PASSED [ 41%]
tests/test_event_bus.py::test_adapter_selection_without_connecting[memory-InMemoryEventBus] PASSED [ 42%]
tests/test_event_bus.py::test_adapter_selection_without_connecting[kafka-KafkaEventBus] PASSED [ 42%]
tests/test_event_bus.py::test_adapter_selection_without_connecting[redis_streams-RedisStreamsEventBus] PASSED [ 42%]
tests/test_event_bus.py::test_legacy_event_without_id_goes_to_dlq PASSED [ 42%]
tests/test_event_bus.py::test_memory_recovers_more_than_one_batch PASSED [ 43%]
tests/test_event_bus.py::test_idle_timer_flushes_even_when_later_polls_fail PASSED [ 43%]
tests/test_hardening.py::test_body_limit_and_safe_errors PASSED          [ 43%]
tests/test_hardening.py::test_chunked_body_cannot_bypass_limit PASSED    [ 44%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[*] PASSED   [ 44%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[https://*.example.com] PASSED [ 44%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[https://user:pass@example.com] PASSED [ 44%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[https://example.com/path] PASSED [ 45%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[] PASSED    [ 45%]
tests/test_hardening.py::test_production_accepts_exact_origin PASSED     [ 45%]
tests/test_hardening.py::test_all_kubernetes_containers_have_security_and_resources PASSED [ 45%]
tests/test_hardening.py::test_network_policy_default_deny_and_exact_dependency_ports PASSED [ 46%]
tests/test_hardening.py::test_slow_request_body_returns_408 PASSED       [ 46%]
tests/test_hardening.py::test_kafka_constructor_uses_supported_bounded_timeouts PASSED [ 46%]
tests/test_hardening.py::test_cors_setting_is_configmap_data_not_object_metadata PASSED [ 46%]
tests/test_hardening.py::test_frontend_build_excludes_local_secrets_and_artifacts PASSED [ 47%]
tests/test_health_route.py::test_health_endpoint_includes_total_urls PASSED [ 47%]
tests/test_kustomize.py::test_overlay_contract[ci] PASSED                [ 47%]
tests/test_kustomize.py::test_overlay_contract[local] PASSED             [ 47%]
tests/test_kustomize.py::test_scripts_are_strict_and_syntax_valid PASSED [ 48%]
tests/test_kustomize.py::test_deploy_stops_before_final_apply_on_wait_failure[rollout status statefulset/postgres] PASSED [ 48%]
tests/test_kustomize.py::test_deploy_stops_before_final_apply_on_wait_failure[wait --for=condition=complete job/db-migrate] PASSED [ 48%]
tests/test_kustomize.py::test_migration_deadline_starts_after_dependencies PASSED [ 48%]
tests/test_llm.py::test_fake_deterministic_and_factory PASSED            [ 49%]
tests/test_llm.py::test_recorded_contracts[GeminiProvider-reply0] PASSED [ 49%]
tests/test_llm.py::test_recorded_contracts[OllamaProvider-reply1] PASSED [ 49%]
tests/test_llm.py::test_recorded_contracts[ClaudeProvider-reply2] PASSED [ 50%]
tests/test_llm.py::test_backoff_jitter_and_budget_per_attempt[429] PASSED [ 50%]
tests/test_llm.py::test_backoff_jitter_and_budget_per_attempt[500] PASSED [ 50%]
tests/test_llm.py::test_backoff_jitter_and_budget_per_attempt[503] PASSED [ 50%]
tests/test_llm.py::test_single_schema_repair[not JSON] PASSED            [ 51%]
tests/test_llm.py::test_single_schema_repair[{"safe":"true"}] PASSED     [ 51%]
tests/test_llm.py::test_single_schema_repair[{"safe":true,"extra":1}] PASSED [ 51%]
tests/test_llm.py::test_bad_envelope_repaired_once PASSED                [ 51%]
tests/test_llm.py::test_invalid_output_does_not_leak PASSED              [ 52%]
tests/test_llm.py::test_transport_errors_sanitized_no_retry[failure0] PASSED [ 52%]
tests/test_llm.py::test_transport_errors_sanitized_no_retry[failure1] PASSED [ 52%]
tests/test_llm.py::test_bounded_failures[400-1] PASSED                   [ 52%]
tests/test_llm.py::test_bounded_failures[401-1] PASSED                   [ 53%]
tests/test_llm.py::test_bounded_failures[302-1] PASSED                   [ 53%]
tests/test_llm.py::test_bounded_failures[429-3] PASSED                   [ 53%]
tests/test_llm.py::test_bounded_failures[503-3] PASSED                   [ 53%]
tests/test_llm.py::test_budget_includes_repairs_and_is_shared PASSED     [ 54%]
tests/test_llm.py::test_budget_resets_next_utc_day_and_zero_disables PASSED [ 54%]
tests/test_llm.py::test_global_concurrency_across_instances PASSED       [ 54%]
tests/test_llm.py::test_capacity_timeout_does_not_spend_budget PASSED    [ 54%]
tests/test_llm.py::test_missing_configuration[GeminiProvider-GEMINI_API_KEY] PASSED [ 55%]
tests/test_llm.py::test_missing_configuration[ClaudeProvider-ANTHROPIC_API_KEY] PASSED [ 55%]
tests/test_llm.py::test_missing_configuration[OllamaProvider-OLLAMA_MODEL] PASSED [ 55%]
tests/test_llm.py::test_ollama_remote_or_credential_url_rejected[https://ollama.com] PASSED [ 55%]
tests/test_llm.py::test_ollama_remote_or_credential_url_rejected[http://user:secret@localhost:11434] PASSED [ 56%]
tests/test_llm.py::test_ollama_remote_or_credential_url_rejected[http://localhost:11434?key=secret] PASSED [ 56%]
tests/test_llm.py::test_attempt_metrics PASSED                           [ 56%]
tests/test_llm.py::test_http_privacy_suppresses_instrumentation PASSED   [ 57%]
tests/test_llm.py::test_oversized_response_rejected PASSED               [ 57%]
tests/test_llm.py::test_deadline_checked_between_chunks PASSED           [ 57%]
tests/test_llm.py::test_cloud_model_rejected PASSED                      [ 57%]
tests/test_llm.py::test_budget_reservations_atomic PASSED                [ 58%]
tests/test_llm.py::test_gemini_paces_retries_repairs_and_shared_instances PASSED [ 58%]
tests/test_llm.py::test_evaluation_retains_only_safe_http_status PASSED  [ 58%]
tests/test_mcp_api_contract.py::test_recorded_api_contract PASSED        [ 58%]
tests/test_mcp_api_contract.py::test_activity_partial_failure PASSED     [ 59%]
tests/test_mcp_api_contract.py::test_signal_code_isolation_and_window PASSED [ 59%]
tests/test_mcp_api_contract.py::test_status_has_no_redirect_side_effect PASSED [ 59%]
tests/test_mcp_api_contract.py::test_admin_auth_required PASSED          [ 59%]
tests/test_mcp_api_contract.py::test_actual_429_only_and_per_code PASSED [ 60%]
tests/test_mcp_api_contract.py::test_rejection_storage_is_independent_and_bounded PASSED [ 60%]
tests/test_mcp_api_contract.py::test_admin_read_scope_is_insufficient PASSED [ 60%]
tests/test_mcp_api_contract.py::test_signal_queries_only_requested_code_and_completed_minutes PASSED [ 60%]
tests/test_mcp_api_contract.py::test_database_failure_not_empty_activity PASSED [ 61%]
tests/test_mcp_api_contract.py::test_status_block_allow_expiry_precedence PASSED [ 61%]
tests/test_migrations.py::test_migrations_on_empty_sqlite PASSED         [ 61%]
tests/test_migrations.py::test_offline_sql_uses_postgresql_settings PASSED [ 61%]
tests/test_observability.py::test_w3c_event_roundtrip_and_invalid_context_isolation PASSED [ 62%]
tests/test_observability.py::test_json_log_has_active_trace_and_no_secrets[api] PASSED [ 62%]
tests/test_observability.py::test_json_log_has_active_trace_and_no_secrets[worker] PASSED [ 62%]
tests/test_observability.py::test_json_log_has_active_trace_and_no_secrets[abuse-worker] PASSED [ 63%]
tests/test_observability.py::test_privacy_export_boundary_for_every_process[api] PASSED [ 63%]
tests/test_observability.py::test_privacy_export_boundary_for_every_process[worker] PASSED [ 63%]
tests/test_observability.py::test_privacy_export_boundary_for_every_process[abuse-worker] PASSED [ 63%]
tests/test_observability.py::test_redirect_publish_consume_sql_share_one_trace PASSED [ 64%]
tests/test_observability.py::test_init_instruments_existing_engine_and_uses_configured_otlp PASSED [ 64%]
tests/test_rate_limiter.py::test_bucket_burst_refill_and_identity_isolation PASSED [ 64%]
tests/test_rate_limiter.py::test_bucket_concurrent_burst PASSED          [ 64%]
tests/test_rate_limiter.py::test_bucket_error_and_clock_regression PASSED [ 65%]
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
tests/test_redis_client.py::test_normal_cache_reads[https://example.com/-counter0] PASSED [ 69%]
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
tests/test_smoke_script.py::test_smoke_checks_auth_and_throttling[False-False-True] PASSED [ 73%]
tests/test_smoke_script.py::test_smoke_checks_auth_and_throttling[True-False-False] PASSED [ 73%]
tests/test_smoke_script.py::test_smoke_checks_auth_and_throttling[False-True-False] PASSED [ 73%]
tests/test_tooling_regressions.py::test_typed_models_preserve_column_types_and_nullability PASSED [ 74%]
tests/test_tooling_regressions.py::test_trace_logging_preserves_message_for_default_formatter PASSED [ 74%]
tests/test_tooling_regressions.py::test_worker_reports_unconfigured_database PASSED [ 74%]
tests/test_trace_privacy.py::test_url_spans_only_include_origin_and_code[False] PASSED [ 75%]
tests/test_trace_privacy.py::test_url_spans_only_include_origin_and_code[True] PASSED [ 75%]
tests/test_trace_privacy.py::test_auto_instrumented_redis_does_not_export_cached_url PASSED [ 75%]
tests/test_trace_privacy.py::test_auto_instrumented_http_does_not_export_path_or_query PASSED [ 75%]
tests/test_trace_privacy.py::test_privacy_hooks_redact_instrumentation_attributes PASSED [ 76%]
tests/test_url_features.py::test_reject_unsafe_urls[ftp://example.com] PASSED [ 76%]
tests/test_url_features.py::test_reject_unsafe_urls[javascript:alert(1)] PASSED [ 76%]
tests/test_url_features.py::test_reject_unsafe_urls[https:///path] PASSED [ 76%]
tests/test_url_features.py::test_reject_unsafe_urls[https://] PASSED     [ 77%]
tests/test_url_features.py::test_reject_unsafe_urls[http://user:pass@example.com] PASSED [ 77%]
tests/test_url_features.py::test_reject_unsafe_urls[http://user@example.com] PASSED [ 77%]
tests/test_url_features.py::test_reject_unsafe_urls[http://@example.com] PASSED [ 77%]
tests/test_url_features.py::test_reject_unsafe_urls[http://localhost] PASSED [ 78%]
tests/test_url_features.py::test_reject_unsafe_urls[http://LOCALHOST.] PASSED [ 78%]
tests/test_url_features.py::test_reject_unsafe_urls[http://sub.localhost] PASSED [ 78%]
tests/test_url_features.py::test_reject_unsafe_urls[http://server.local] PASSED [ 78%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.0.0.1] PASSED [ 79%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.9.2.1] PASSED [ 79%]
tests/test_url_features.py::test_reject_unsafe_urls[http://10.1.2.3] PASSED [ 79%]
tests/test_url_features.py::test_reject_unsafe_urls[http://172.16.2.3] PASSED [ 79%]
tests/test_url_features.py::test_reject_unsafe_urls[http://192.168.1.1] PASSED [ 80%]
tests/test_url_features.py::test_reject_unsafe_urls[http://169.254.169.254] PASSED [ 80%]
tests/test_url_features.py::test_reject_unsafe_urls[http://0.0.0.0] PASSED [ 80%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::1]] PASSED [ 80%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::]] PASSED  [ 81%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fc00::1]] PASSED [ 81%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fd00::1]] PASSED [ 81%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fe80::1]] PASSED [ 82%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::ffff:127.0.0.1]] PASSED [ 82%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::ffff:192.168.0.1]] PASSED [ 82%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fe80::1%25eth0]] PASSED [ 82%]
tests/test_url_features.py::test_reject_unsafe_urls[http://2130706433] PASSED [ 83%]
tests/test_url_features.py::test_reject_unsafe_urls[http://0x7f000001] PASSED [ 83%]
tests/test_url_features.py::test_reject_unsafe_urls[http://0177.0.0.1] PASSED [ 83%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.1] PASSED [ 83%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.0.0.1.] PASSED [ 84%]
tests/test_url_features.py::test_reject_unsafe_urls[http://%6cocalhost] PASSED [ 84%]
tests/test_url_features.py::test_reject_unsafe_urls[http://localHOST\u3002] PASSED [ 84%]
tests/test_url_features.py::test_reject_unsafe_urls[http://example.com\\@127.0.0.1] PASSED [ 84%]
tests/test_url_features.py::test_reject_unsafe_urls[http://exam\nple.com] PASSED [ 85%]
tests/test_url_features.py::test_reject_unsafe_urls[http://bad_host.com] PASSED [ 85%]
tests/test_url_features.py::test_reject_unsafe_urls[http://-bad.example] PASSED [ 85%]
tests/test_url_features.py::test_reject_unsafe_urls[https://example.com/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx] PASSED [ 85%]
tests/test_url_features.py::test_normalize_public_hosts[https://EXAMPLE.COM./a?b=1-example.com] PASSED [ 86%]
tests/test_url_features.py::test_normalize_public_hosts[http://b\xfccher.de/a-xn--bcher-kva.de] PASSED [ 86%]
tests/test_url_features.py::test_normalize_public_hosts[https://8.8.8.8/a-8.8.8.8] PASSED [ 86%]
tests/test_url_features.py::test_normalize_public_hosts[http://[2606:4700:4700::1111]/-[2606:4700:4700::1111]] PASSED [ 86%]
tests/test_url_features.py::test_normalize_public_hosts[https://localhost.example.com/-localhost.example.com] PASSED [ 87%]
tests/test_url_features.py::test_maximum_url_length PASSED               [ 87%]
tests/test_url_features.py::test_invalid_alias[ab] PASSED                [ 87%]
tests/test_url_features.py::test_invalid_alias[aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa] PASSED [ 88%]
tests/test_url_features.py::test_invalid_alias[] PASSED                  [ 88%]
tests/test_url_features.py::test_invalid_alias[a/b] PASSED               [ 88%]
tests/test_url_features.py::test_invalid_alias[a.b] PASSED               [ 88%]
tests/test_url_features.py::test_invalid_alias[a b] PASSED               [ 89%]
tests/test_url_features.py::test_invalid_alias[\xe9\xe9\xe9] PASSED      [ 89%]
tests/test_url_features.py::test_invalid_alias[api] PASSED               [ 89%]
tests/test_url_features.py::test_invalid_alias[Health] PASSED            [ 89%]
tests/test_url_features.py::test_invalid_alias[METRICS] PASSED           [ 90%]
tests/test_url_features.py::test_invalid_alias[docs] PASSED              [ 90%]
tests/test_url_features.py::test_invalid_alias[admin] PASSED             [ 90%]
tests/test_url_features.py::test_invalid_alias[shorten] PASSED           [ 90%]
tests/test_url_features.py::test_invalid_alias[livez] PASSED             [ 91%]
tests/test_url_features.py::test_invalid_alias[urls] PASSED              [ 91%]
tests/test_url_features.py::test_invalid_alias[analytics] PASSED         [ 91%]
tests/test_url_features.py::test_invalid_alias[redoc] PASSED             [ 91%]
tests/test_url_features.py::test_valid_alias[abc] PASSED                 [ 92%]
tests/test_url_features.py::test_valid_alias[A_9-x] PASSED               [ 92%]
tests/test_url_features.py::test_valid_alias[aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa] PASSED [ 92%]
tests/test_url_features.py::test_invalid_expiry[2020-01-01T00:00:00Z] PASSED [ 92%]
tests/test_url_features.py::test_invalid_expiry[2099-01-01T00:00:00] PASSED [ 93%]
tests/test_url_features.py::test_invalid_expiry[nonsense] PASSED         [ 93%]
tests/test_url_features.py::test_invalid_expiry[9999999999] PASSED       [ 93%]
tests/test_url_features.py::test_expiry_normalized_to_utc PASSED         [ 94%]
tests/test_url_features.py::test_alias_create_conflict_delete_and_list PASSED [ 94%]
tests/test_url_features.py::test_expired_cache_hit_returns_410 PASSED    [ 94%]
tests/test_url_features.py::test_api_validation_is_422[payload0] PASSED  [ 94%]
tests/test_url_features.py::test_api_validation_is_422[payload1] PASSED  [ 95%]
tests/test_url_features.py::test_api_validation_is_422[payload2] PASSED  [ 95%]
tests/test_url_features.py::test_api_validation_is_422[payload3] PASSED  [ 95%]
tests/test_url_features.py::test_missing_delete_and_redirect PASSED      [ 95%]
tests/test_url_features.py::test_openapi_documents_fields_and_statuses PASSED [ 96%]
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
=============== 384 passed, 11 deselected, 6 warnings in 27.78s ================

```
</details>

<details>
<summary>frontend checks and build — exit 0</summary>

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

added 782 packages in 31s
cd frontend && npm run lint -- --max-warnings=0

> url-shortener-frontend@0.1.0 lint
> next lint --max-warnings=0

✔ No ESLint warnings or errors
cd frontend && npm test

> url-shortener-frontend@0.1.0 test
> node --test tests/*.test.cjs

✔ protected reads and writes send only the in-memory key (43.186375ms)
✔ public health omits the key and forgetting removes it from requests (9.5185ms)
✔ a fresh client has no persisted key (12.462459ms)
✔ flagged list and review use admin key, encoded code and bounded fetch (5.839083ms)
✔ production security headers cover every route without eval or wildcard origins (1.179125ms)
ℹ tests 5
ℹ suites 0
ℹ pass 5
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 224.2565
cd frontend && ./node_modules/.bin/tsc --noEmit --incremental false

> url-shortener-frontend@0.1.0 build
> next build

  ▲ Next.js 14.2.35
  - Environments: .env.local

   Creating an optimized production build ...
 ✓ Compiled successfully
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (0/8) ...
   Generating static pages (2/8)
   Generating static pages (4/8)
   Generating static pages (6/8)
 ✓ Generating static pages (8/8)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                              Size     First Load JS
┌ ○ /                                    3.72 kB        99.6 kB
├ ○ /_not-found                          875 B          88.2 kB
├ ○ /analytics                           114 kB          210 kB
├ ○ /dashboard                           2.31 kB        98.2 kB
├ ○ /flagged                             2.07 kB          98 kB
└ ○ /health                              1.82 kB        97.7 kB
+ First Load JS shared by all            87.3 kB
  ├ chunks/117-22f4f9f4adf3fd71.js       31.7 kB
  ├ chunks/fd9d1056-7c8cb799e19c27d1.js  53.7 kB
  └ other shared chunks (total)          1.95 kB


○  (Static)  prerendered as static content


```
</details>

<details>
<summary>make mcp-test — exit 0</summary>

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
35 passed in 5.21s

```
</details>

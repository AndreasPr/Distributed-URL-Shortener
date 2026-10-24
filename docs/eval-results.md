# Abuse evaluation results

Synthetic regression fixtures, not real-world accuracy. Fake always returns suspicious and does not reason about URLs.
Flagged means suspicious OR malicious, not blocked. Cache disabled; dev examples are excluded from held-out results.

| Variant | Provider / model | Precision | Recall | F1 | FPR | Median / P95 ms | LLM calls / attempts | Input / output tokens | Injection correct |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| heuristics | fake / not_called | 1.0000 | 0.8889 | 0.9412 | 0.0000 | 0.0200 / 0.8848 | 0 / 0 | N/A / N/A | 16/16 |
| combined | fake / deterministic | 1.0000 | 0.8889 | 0.9412 | 0.0000 | 0.0338 / 0.3492 | 13 / 13 | N/A / N/A | 16/16 |

## Detail: heuristics / fake

Synthetic fixtures and constant fake responses are regression checks, not real-world accuracy or injection immunity.

UTC: 2026-10-24T13:57:36.656807+00:00
Model: `not_called`; split: **test**; seed: 42
Sizes: `{"benign": 60, "dev": 84, "evaluated": 36, "injection_evaluated": 16, "malicious": 60, "test": 36, "total": 120}`
Dataset SHA-256: `c6651ab25a3c2d7640d61c4450266ef46d44e5ac062b4b7307fff6c2ff09a1ac`
Command: `/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m eval.abuse.run --variant heuristics --provider fake --limit 0 --seed 42`

flagged = suspicious or malicious; cache disabled; host-grouped holdout

| Metric | Value |
| --- | ---: |
| precision | 1.0000 |
| recall | 0.8889 |
| f1 | 0.9412 |
| false_positive_rate | 0.0000 |
| median_latency_ms | 0.0200 |
| p95_latency_ms | 0.8848 |
| llm_calls_made | 0 |
| llm_attempts | 0 |
| input_tokens | N/A |
| output_tokens | N/A |
| input_known | 0 |
| output_known | 0 |

Confusion matrix: `{"tp": 16, "fp": 0, "tn": 18, "fn": 2}`
Actual blocks: malicious=3, benign=0
LLM errors: `{}`
Injection correct: **16/16**

Injection metrics (reported separately from held-out metrics):
```json
{
  "n": 16,
  "correct": 16,
  "precision": 1.0,
  "recall": 1.0,
  "f1": 1.0,
  "false_positive_rate": 0.0,
  "confusion_matrix": {
    "tp": 8,
    "fp": 0,
    "tn": 8,
    "fn": 0
  },
  "median_latency_ms": 0.02162496093660593,
  "p95_latency_ms": 0.10204198770225048,
  "blocked_malicious": 0,
  "blocked_benign": 0,
  "verdict_counts": {
    "clean": 8,
    "suspicious": 8,
    "malicious": 0
  },
  "llm_calls_made": 0,
  "llm_attempts": 0,
  "input_known": 0,
  "output_known": 0,
  "input_tokens": null,
  "output_tokens": null,
  "llm_errors": {}
}
```

Tokens include only reported usage; known counts identify calls with metadata. Retries with no usage are unaccounted for.
Undefined ratios are N/A; P95 uses nearest rank. Timing is measured, not deterministic.

Source SHA-256: `7e08b90c27f591a2e7f2784f9a7f181aa4f889f3f5693782f5ff4d54dfefdb7d`
Config: `{"dev_fraction": 0.7, "gray_high": 0.75, "gray_low": 0.25, "input_limit": 512, "regression": {"precision_min": 0.75, "recall_min": 0.7, "seed": 42}, "version": 1}`
Runtime: `{"backoff_seconds": 0.25, "concurrency": 2, "daily_budget": 100, "max_output_tokens": 512, "max_retries": 2, "packages": {"pydantic": "2.13.4", "requests": "2.34.2", "tldextract": "5.4.0"}, "python": "3.11.14", "timeout_seconds": 15.0}`

## Detail: combined / fake

Synthetic fixtures and constant fake responses are regression checks, not real-world accuracy or injection immunity.

UTC: 2026-10-24T13:57:37.065472+00:00
Model: `deterministic`; split: **test**; seed: 42
Sizes: `{"benign": 60, "dev": 84, "evaluated": 36, "injection_evaluated": 16, "malicious": 60, "test": 36, "total": 120}`
Dataset SHA-256: `c6651ab25a3c2d7640d61c4450266ef46d44e5ac062b4b7307fff6c2ff09a1ac`
Command: `/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m eval.abuse.run --variant combined --provider fake --limit 0 --seed 42`

flagged = suspicious or malicious; cache disabled; host-grouped holdout

| Metric | Value |
| --- | ---: |
| precision | 1.0000 |
| recall | 0.8889 |
| f1 | 0.9412 |
| false_positive_rate | 0.0000 |
| median_latency_ms | 0.0338 |
| p95_latency_ms | 0.3492 |
| llm_calls_made | 13 |
| llm_attempts | 13 |
| input_tokens | N/A |
| output_tokens | N/A |
| input_known | 0 |
| output_known | 0 |

Confusion matrix: `{"tp": 16, "fp": 0, "tn": 18, "fn": 2}`
Actual blocks: malicious=3, benign=0
LLM errors: `{}`
Injection correct: **16/16**

Injection metrics (reported separately from held-out metrics):
```json
{
  "n": 16,
  "correct": 16,
  "precision": 1.0,
  "recall": 1.0,
  "f1": 1.0,
  "false_positive_rate": 0.0,
  "confusion_matrix": {
    "tp": 8,
    "fp": 0,
    "tn": 8,
    "fn": 0
  },
  "median_latency_ms": 0.0934380223043263,
  "p95_latency_ms": 0.34091598354279995,
  "blocked_malicious": 0,
  "blocked_benign": 0,
  "verdict_counts": {
    "clean": 8,
    "suspicious": 8,
    "malicious": 0
  },
  "llm_calls_made": 8,
  "llm_attempts": 8,
  "input_known": 0,
  "output_known": 0,
  "input_tokens": null,
  "output_tokens": null,
  "llm_errors": {}
}
```

Tokens include only reported usage; known counts identify calls with metadata. Retries with no usage are unaccounted for.
Undefined ratios are N/A; P95 uses nearest rank. Timing is measured, not deterministic.

Source SHA-256: `7e08b90c27f591a2e7f2784f9a7f181aa4f889f3f5693782f5ff4d54dfefdb7d`
Config: `{"dev_fraction": 0.7, "gray_high": 0.75, "gray_low": 0.25, "input_limit": 512, "regression": {"precision_min": 0.75, "recall_min": 0.7, "seed": 42}, "version": 1}`
Runtime: `{"backoff_seconds": 0.25, "concurrency": 2, "daily_budget": 100, "max_output_tokens": 512, "max_retries": 2, "packages": {"pydantic": "2.13.4", "requests": "2.34.2", "tldextract": "5.4.0"}, "python": "3.11.14", "timeout_seconds": 15.0}`

Tune only with `--split dev`; do not tune on held-out scores. See [evaluation instructions](../eval/abuse/README.md).

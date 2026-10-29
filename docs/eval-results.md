# Abuse evaluation results

## Step 9.2: lexical features and a frozen, reused holdout

Measured locally on 2026-10-29, with **no live LLM calls**. The source snapshot is unchanged
(SHA-256 `f5d963f1961bd337b1e0c3834ae4ec31b918b01021df9d8f634ab60671f87750`),
100 Tranco popularity-labeled benign and 100 OpenPhish feed-labeled malicious URLs.
Labels are source-derived, not independently adjudicated. Do not interpret them as proof
that each site is safe or malicious.

All 61 historical test examples remain in test. Registered-domain grouping (including private
PSL suffixes) adds three related examples, preventing domain overlap with train/dev. Fixed
seed 42 yields **96 train (42/54 benign/malicious), 40 dev (29/11), 64 test (29/35)**.
The old test was already reported and old dev was already used: these are **exploratory reused
holdout results, not fresh independent validation**. No feature or threshold was selected
using this task's test results. Handwritten weights were not fitted on train.

Dev-only selection maximized F1 subject to precision >=90% and FPR <=5% over the fixed
threshold grid. It selected **gray_low=0.15, gray_high=0.65** (same as the historical
comparison; previous runtime defaults were .25/.75). Dev: TP=6, FP=0, TN=29, FN=5,
precision 100%, recall 54.5455%, F1 70.5882%, FPR 0%. No benign dev blocks.
Weights, all candidate metrics and source fingerprints were frozen before test. The only
pre-test refreeze changed a lint comment hash and replaced unmeasured latency zeros with null;
thresholds, weights and all classification metrics remained identical.

| Dataset / scorer | Precision | Recall | F1 | FPR | TP | FP | TN | FN |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Original 61 / frozen old scorer | 100% | 9.3750% | 17.1429% | 0% | 3 | 0 | 29 | 29 |
| Same 61 / new scorer | 100% | 40.6250% | 57.7778% | 0% | 13 | 0 | 29 | 19 |
| Domain-separated 64 / frozen old scorer | 100% | 8.5714% | 15.7895% | 0% | 3 | 0 | 29 | 32 |
| Same 64 / new heuristics | 100% | 37.1429% | 54.1667% | 0% | 13 | 0 | 29 | 22 |
| Same 64 / new combined + constant FakeProvider | 100% | 37.1429% | 54.1667% | 0% | 13 | 0 | 29 | 22 |

**Flagged is suspicious OR malicious; it does not mean blocked.** All 13 new test positives
were suspicious, with **zero automatic blocks**. There were 13 fake calls/13 attempts/no
errors and no reported tokens. The fake always returns suspicious, so its matching detection
numbers provide a routing regression check, not an LLM quality measurement. The historical
Gemini/Ollama results below are unchanged; neither was rerun with these features.

The new score includes explicit homoglyph, hex/high-entropy hostname and long base64 query
signals, plus lexical nested shortener recognition. Existing brand, IDN, IP, depth, TLD and
path indicators remain explainable contributions. No target page or redirect was fetched.
A detected shortener string does not prove a chain; IDNs, CDN labels, auth queries and login
paths can be benign. The sample cannot establish these features' production false-positive
rates, robustness against evasion, or prompt-injection immunity. Recall still misses **22/35**
malicious labels; zero false positives among only 29 benign examples does not prove safety.

Evidence: [fixed split protocol](../eval/splits/README.md),
[hashed membership](../eval/splits/manifest.json), [dev policy](../eval/splits/policy.json),
[actual test output](../eval/splits/test-results.json), and
[verification commands/output](abuse-recall-verification.md).
Raw URLs remain ignored because source redistribution terms are unreviewed. A fresh clone
can reproduce synthetic tests but needs the exact legally acquired local snapshot for these
public numbers. A new temporal/campaign-separated labeled holdout is required for confirmation.
Existing persisted verdicts are not backfilled. Local `.env` overrides still take precedence;
operators must explicitly use .15/.65 to match this policy.

## Historical public-data evaluation

This report summarizes user-run evaluations of a sanitized Tranco/OpenPhish snapshot: 100 popularity-labeled benign URLs and 100 feed-labeled malicious URLs. These are public-source examples, not the committed synthetic regression fixture. No listed pages were fetched by the evaluator.

The host-grouped split contains 139 development examples and 61 held-out test examples (29 benign, 32 malicious), with seed 42. Candidate a was selected on dev results: gray_low=0.15, gray_high=0.65. The configuration remained fixed for the provider comparisons. Cache was disabled.

**Result:** both combined pipelines flagged 3 of 32 malicious test examples and missed 29. Gemini Flash-Lite classified those three as malicious (eligible for blocking); Ollama left them suspicious. No benign examples were flagged or classified for blocking. This evaluation did not modify application links.

Flagged means suspicious OR malicious. Precision is not overall accuracy. Low recall (9.375%) remains the main limitation: low-score examples bypass the LLM in combined mode.

| Variant / model | Precision | Recall | F1 | FPR | Malicious / benign blocks | Median / P95 ms | Calls / attempts | Input / output tokens | Errors |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| heuristics / not_called | 100.0000% | 9.3750% | 17.1429% | 0.0000% | 0 / 0 | 0.0183 / 0.0393 | 0 / 0 | N/A | {} |
| combined / llama3.2:3b | 100.0000% | 9.3750% | 17.1429% | 0.0000% | 0 / 0 | 0.0258 / 12.7535 | 3 / 3 | 418 / 110 | {} |
| combined / gemini-3.1-flash-lite | 100.0000% | 9.3750% | 17.1429% | 0.0000% | 3 / 0 | 0.0434 / 21.4228 | 3 / 3 | 433 / 122 | {} |

All three confusion matrices are TP=3, FP=0, TN=29, FN=29. Latency covers all examples, including the 58 that bypassed inference; its P95 is not the latency of a typical LLM call. Gemini pacing also contributes to elapsed classification time, so these are not controlled provider-speed benchmarks.

## Separate synthetic injection challenge

| Variant / model | Correct | Calls / attempts | Errors | Malicious / benign blocks |
| --- | ---: | ---: | --- | ---: |
| heuristics / not_called | 16/16 | 0/0 | {} | 0/0 |
| combined / llama3.2:3b | 16/16 | 8/8 | {} | 0/0 |
| combined / gemini-3.1-flash-lite | 16/16 | 8/8 | {} | 2/0 |

The 16 injection examples are synthetic and separate from the public dataset. These results do not establish prompt-injection immunity. Successful Flash-Lite inference completed all 11 classifications in 11 attempts across both sets.

## Earlier unsuccessful Gemini runs

| Run | Public-set failures | Injection failures | Interpretation |
| --- | --- | --- | --- |
| gemini-3.8-flash, timeout 30.0s | `{"LLMError": 1, "LLMTimeout": 2}` | `{"LLMError": 7, "LLMTimeout": 1}` | Degraded fallback results, not clean model-accuracy measurements |
| gemini-3.8-flash, timeout 120.0s | `{"LLMTimeout": 2}` | `{"LLMTimeout": 2, "LLMError": 5}` | Degraded fallback results, not clean model-accuracy measurements |

The user observed exhausted RPM and daily request quotas on the original model. A synthetic diagnostic also took 59.19 seconds, exceeding the original 30-second timeout. Increasing the timeout alone did not resolve the failures. The successful run used gemini-3.1-flash-lite, a 120-second timeout, five-second attempt spacing, concurrency 1, and a local 50-attempt budget. These changes were operational; thresholds were not retuned. Original failed-run archives remain unchanged.

## Reproducibility records

The following metadata and commands were copied from the saved JSON reports. Raw data and detailed run archives remain git-ignored; they are not available from a fresh clone. No live calls were made while updating this document.

### heuristics / not_called

UTC: 2026-10-24T17:59:02.954216+00:00

Local archive: `eval/abuse/results/public-20261024T145014Z/ollama/heuristics-ollama-test.json`

Exact recorded command:

```bash
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m eval.abuse.run --variant heuristics --provider ollama --data-dir eval/abuse/data/local/public --config eval/abuse/data/local/frozen.json --split test --seed 42 --limit 0
```

```json
{
  "git_revision": "79ba09d7a50627dd027bec5c425fd96868fdf240",
  "source_sha256": "7e08b90c27f591a2e7f2784f9a7f181aa4f889f3f5693782f5ff4d54dfefdb7d",
  "dataset_sha256": "f5d963f1961bd337b1e0c3834ae4ec31b918b01021df9d8f634ab60671f87750",
  "selected_sha256": "6a27c3921dcd340c4130349e1bed47efda3aa04c5991fc2e1587aad8c155dfda",
  "injection_sha256": "59e0c51c5207d320b6a6ab112e4eef32f8d964e0222a74e3994c4ad63839fec6",
  "seed": 42,
  "sizes": {
    "total": 200,
    "benign": 100,
    "malicious": 100,
    "dev": 139,
    "test": 61,
    "evaluated": 61,
    "injection_evaluated": 16
  },
  "config": {
    "version": 1,
    "dev_fraction": 0.7,
    "gray_low": 0.15,
    "gray_high": 0.65,
    "input_limit": 512,
    "regression": {
      "seed": 42,
      "precision_min": 0.75,
      "recall_min": 0.7
    }
  },
  "runtime": {
    "python": "3.11.14",
    "packages": {
      "tldextract": "5.4.0",
      "pydantic": "2.13.4",
      "requests": "2.34.2"
    },
    "daily_budget": 600,
    "timeout_seconds": 120.0,
    "max_retries": 2,
    "backoff_seconds": 0.25,
    "concurrency": 1,
    "max_output_tokens": 512
  }
}
```

### combined / llama3.2:3b

UTC: 2026-10-24T17:59:16.614569+00:00

Local archive: `eval/abuse/results/public-20261024T145014Z/ollama/combined-ollama-test.json`

Exact recorded command:

```bash
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m eval.abuse.run --variant combined --provider ollama --data-dir eval/abuse/data/local/public --config eval/abuse/data/local/frozen.json --split test --seed 42 --limit 0
```

```json
{
  "git_revision": "79ba09d7a50627dd027bec5c425fd96868fdf240",
  "source_sha256": "7e08b90c27f591a2e7f2784f9a7f181aa4f889f3f5693782f5ff4d54dfefdb7d",
  "dataset_sha256": "f5d963f1961bd337b1e0c3834ae4ec31b918b01021df9d8f634ab60671f87750",
  "selected_sha256": "6a27c3921dcd340c4130349e1bed47efda3aa04c5991fc2e1587aad8c155dfda",
  "injection_sha256": "59e0c51c5207d320b6a6ab112e4eef32f8d964e0222a74e3994c4ad63839fec6",
  "seed": 42,
  "sizes": {
    "total": 200,
    "benign": 100,
    "malicious": 100,
    "dev": 139,
    "test": 61,
    "evaluated": 61,
    "injection_evaluated": 16
  },
  "config": {
    "version": 1,
    "dev_fraction": 0.7,
    "gray_low": 0.15,
    "gray_high": 0.65,
    "input_limit": 512,
    "regression": {
      "seed": 42,
      "precision_min": 0.75,
      "recall_min": 0.7
    }
  },
  "runtime": {
    "python": "3.11.14",
    "packages": {
      "tldextract": "5.4.0",
      "pydantic": "2.13.4",
      "requests": "2.34.2"
    },
    "daily_budget": 600,
    "timeout_seconds": 120.0,
    "max_retries": 2,
    "backoff_seconds": 0.25,
    "concurrency": 1,
    "max_output_tokens": 512
  }
}
```

### combined / gemini-3.1-flash-lite

UTC: 2026-10-25T01:52:04.273282+00:00

Local archive: `eval/abuse/results/public-20261024T145014Z/gemini-lite-20261025T015112Z/combined-gemini-test.json`

Exact recorded command:

```bash
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m eval.abuse.run --variant combined --provider gemini --data-dir eval/abuse/data/local/public --config eval/abuse/data/local/frozen.json --split test --seed 42 --limit 0 --output-dir eval/abuse/results/public-20261024T145014Z/gemini-lite-20261025T015112Z
```

```json
{
  "git_revision": "79ba09d7a50627dd027bec5c425fd96868fdf240",
  "source_sha256": "8754e1b9a4a75ea68a8e11a5360b62824a1765c2e8d8774dc1a89cd9eef36231",
  "dataset_sha256": "f5d963f1961bd337b1e0c3834ae4ec31b918b01021df9d8f634ab60671f87750",
  "selected_sha256": "6a27c3921dcd340c4130349e1bed47efda3aa04c5991fc2e1587aad8c155dfda",
  "injection_sha256": "59e0c51c5207d320b6a6ab112e4eef32f8d964e0222a74e3994c4ad63839fec6",
  "seed": 42,
  "sizes": {
    "total": 200,
    "benign": 100,
    "malicious": 100,
    "dev": 139,
    "test": 61,
    "evaluated": 61,
    "injection_evaluated": 16
  },
  "config": {
    "version": 1,
    "dev_fraction": 0.7,
    "gray_low": 0.15,
    "gray_high": 0.65,
    "input_limit": 512,
    "regression": {
      "seed": 42,
      "precision_min": 0.75,
      "recall_min": 0.7
    }
  },
  "runtime": {
    "python": "3.11.14",
    "packages": {
      "tldextract": "5.4.0",
      "pydantic": "2.13.4",
      "requests": "2.34.2"
    },
    "daily_budget": 50,
    "gemini_min_interval_seconds": 5.0,
    "timeout_seconds": 120.0,
    "max_retries": 2,
    "backoff_seconds": 0.25,
    "concurrency": 1,
    "max_output_tokens": 512
  }
}
```

## Interpretation limits

- Tranco popularity is an imperfect benign label; feed labels and sanitization also introduce uncertainty. The two sources have different URL characteristics.
- Exact hosts are separated between dev and test, but related domains/campaigns may overlap. The test sample is small and is not representative of deployment traffic.
- The synthetic CI regression thresholds do not establish a minimum public-data recall. These measured public-data results show that the current routing policy needs further work.
- LLM token counts cover returned usage metadata, not unreported upstream work. Historical failures cannot be retrospectively assigned HTTP status codes.
- Keep this held-out result as the baseline. Future tuning must use dev data and a fresh final test set; do not select settings or providers based on the best repeated test score.

The historical comparison above was assembled from archived JSON. `make eval` now updates only the marked synthetic section below and preserves this public comparison.

<!-- synthetic-eval:start -->
## Current synthetic regression

Synthetic regression fixtures, not real-world accuracy. Fake always returns suspicious and does not reason about URLs.
Flagged means suspicious OR malicious, not blocked. Cache disabled; dev examples are excluded from held-out results.

| Variant | Provider / model | Precision | Recall | F1 | FPR | Median / P95 ms | LLM calls / attempts | Input / output tokens | Injection correct |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| heuristics | fake / not_called | 1.0000 | 0.8889 | 0.9412 | 0.0000 | 0.0237 / 0.4499 | 0 / 0 | N/A / N/A | 16/16 |
| combined | fake / deterministic | 1.0000 | 0.8889 | 0.9412 | 0.0000 | 0.0368 / 0.4058 | 13 / 13 | N/A / N/A | 16/16 |

## Detail: heuristics / fake

Synthetic fixtures and constant fake responses are regression checks, not real-world accuracy or injection immunity.

UTC: 2026-10-29T14:27:35.626591+00:00
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
| median_latency_ms | 0.0237 |
| p95_latency_ms | 0.4499 |
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
  "median_latency_ms": 0.02720800694078207,
  "p95_latency_ms": 0.11875003110617399,
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

Source SHA-256: `93ce2eaf1ec02583417f3fac959fb824cbe18ac1114d686d32b66e8c12d659bd`
Config: `{"dev_fraction": 0.7, "gray_high": 0.65, "gray_low": 0.15, "input_limit": 512, "regression": {"precision_min": 0.75, "recall_min": 0.7, "seed": 42}, "version": 1}`
Runtime: `{"backoff_seconds": 0.25, "concurrency": 2, "daily_budget": 100, "gemini_min_interval_seconds": 5.0, "max_output_tokens": 512, "max_retries": 2, "packages": {"pydantic": "2.13.4", "requests": "2.34.2", "tldextract": "5.4.0"}, "python": "3.11.14", "timeout_seconds": 15.0}`

## Detail: combined / fake

Synthetic fixtures and constant fake responses are regression checks, not real-world accuracy or injection immunity.

UTC: 2026-10-29T14:27:35.991207+00:00
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
| median_latency_ms | 0.0368 |
| p95_latency_ms | 0.4058 |
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
  "median_latency_ms": 0.0908754882402718,
  "p95_latency_ms": 0.2531659556552768,
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

Source SHA-256: `93ce2eaf1ec02583417f3fac959fb824cbe18ac1114d686d32b66e8c12d659bd`
Config: `{"dev_fraction": 0.7, "gray_high": 0.65, "gray_low": 0.15, "input_limit": 512, "regression": {"precision_min": 0.75, "recall_min": 0.7, "seed": 42}, "version": 1}`
Runtime: `{"backoff_seconds": 0.25, "concurrency": 2, "daily_budget": 100, "gemini_min_interval_seconds": 5.0, "max_output_tokens": 512, "max_retries": 2, "packages": {"pydantic": "2.13.4", "requests": "2.34.2", "tldextract": "5.4.0"}, "python": "3.11.14", "timeout_seconds": 15.0}`

Tune only with `--split dev`; do not tune on held-out scores. See [evaluation instructions](../eval/abuse/README.md).
<!-- synthetic-eval:end -->

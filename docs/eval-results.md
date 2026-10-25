# Abuse evaluation results

## Public-data evaluation

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

This public-data comparison was assembled from archived JSON. Running `make eval` regenerates this path with its selected run, defaulting to the synthetic dataset; preserve this report in version control before regeneration.

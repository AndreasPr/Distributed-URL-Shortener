# Step 9.2 verification

2026-10-29; branch `step-9-2-abuse-recall`, based on master `2dd4367`.
No live model, target website, DNS lookup, or public-feed download was used.
Read [results](eval-results.md), [ADR](adr/0025-abuse-recall-and-reused-holdout.md), and
[split procedure](../eval/splits/README.md) for interpretation and reproduction limits.

## Executed phases

```bash
.venv/bin/python -m eval.abuse.recall prepare
.venv/bin/python -m eval.abuse.recall tune
# Finish lint/type/unit checks; freeze finalized source before test.
.venv/bin/python -m eval.abuse.recall test
make check
make eval EVAL_PROVIDER=fake
make frontend-check
make mcp-test
```

The first policy was archived locally before the pre-test lint-comment correction and
replacement of unmeasured latency zeros with null. Refreezing yielded identical thresholds,
weights and classification metrics. No public test results were viewed until the final
policy was frozen. No scoring/threshold change was made after test.
The public test phase ran once; its result is committed in `eval/splits/test-results.json`.
All later changes were documentation, not scorer/threshold tuning.

Initial `make check` caught and fixed line-length and candidate typing errors. A sandboxed
attempt then failed three pre-existing smoke-script tests because it could not bind local
HTTP sockets (`PermissionError: [Errno 1] Operation not permitted`). Running the unchanged
suite with local socket permission passed. No tests or thresholds were disabled.

## Final command output (selected actual excerpts)

`make check`: exit 0.

```text
Success: no issues found in 70 source files
TOTAL                                       2369    152  93.58%
=============== 421 passed, 23 deselected, 6 warnings in 16.09s ================
sh scripts/check-prometheus.sh
Checking rules/slo.yml
  SUCCESS: 22 rules found

  SUCCESS
```

Black/isort/Flake8 passed. New top-level test files were also checked explicitly (the Makefile
lint paths cover app/, eval/ and integration tests). Unit-only coverage is not a remeasurement
of the combined integration floor. No database schema or broker behavior changed; Docker
integration tests were not rerun in this step. Existing deprecation warnings remain.

`make eval EVAL_PROVIDER=fake`: exit 0. Extracted from the resulting JSON:

```text
heuristics-fake-test.json {'tp': 16, 'fp': 0, 'tn': 18, 'fn': 2}
precision=1.0 recall=0.8888888888888888 f1=0.9411764705882353 FPR=0.0
llm_calls_made=0 injection=16/16
combined-fake-test.json {'tp': 16, 'fp': 0, 'tn': 18, 'fn': 2}
precision=1.0 recall=0.8888888888888888 f1=0.9411764705882353 FPR=0.0
llm_calls_made=13 injection=16/16
```

These are separate **synthetic** regression results. The complete generated synthetic
section includes measured timings, hashes and commands without overwriting the public data.

`make frontend-check`: exit 0, npm ci/ESLint/TypeScript passed.

```text
ℹ tests 5
ℹ suites 0
ℹ pass 5
ℹ fail 0
```

`make mcp-test`: exit 0, formatting/lint/types passed.

```text
Success: no issues found in 14 source files
...................................                                      [100%]
35 passed in 1.20s
```

## Public result, distinct from synthetic regression

Frozen test: 64 examples, 29 benign/35 malicious. Actual combined/fake output:

```json
{
  "precision": 1.0,
  "recall": 0.37142857142857144,
  "f1": 0.5416666666666666,
  "false_positive_rate": 0.0,
  "confusion_matrix": {"tp": 13, "fp": 0, "tn": 29, "fn": 22},
  "blocked_malicious": 0,
  "blocked_benign": 0,
  "llm_calls_made": 13,
  "llm_attempts": 13,
  "llm_errors": {}
}
```

The same original 61 rows compare old 3/32 recall to new 13/32 recall; do not compare
9.375% and 37.1429% as though their denominators were equal. These reused snapshot results
are exploratory. No new Gemini/Ollama accuracy, production false-positive rate or protection
against live phishing is established. Queries are removed before model input; explicit
query features are local only. Raw public samples and secrets remain ignored/uncommitted.

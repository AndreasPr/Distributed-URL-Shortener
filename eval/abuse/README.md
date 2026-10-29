# Abuse evaluation

Run from the repository root with the pinned `.venv` dependencies. No new package,
Redis, broker, database or model server is needed for the fake runs:

```bash
.venv/bin/python -m eval.abuse.run --variant heuristics --provider fake --limit 0 --seed 42
.venv/bin/python -m eval.abuse.run --variant llm --provider fake --limit 0 --seed 42
.venv/bin/python -m eval.abuse.run --variant combined --provider fake --limit 0 --seed 42
make eval EVAL_PROVIDER=fake
```

Each invocation writes JSON and Markdown under ignored `eval/abuse/results/`.
`make eval` runs heuristics and combined on the same held-out split and writes the
requested tracked aggregate report, `docs/eval-results.md`. That report is an
intentional documentation artifact; raw runs and public data remain ignored.
`EVAL_PROVIDER` defaults to exported `LLM_PROVIDER`, or `fake` if unset. To guarantee
no live inference, explicitly use `EVAL_PROVIDER=fake`. `.env` is never sourced.
`EVAL_LIMIT` (default 0) and `EVAL_SEED` (42) configure the Make target.

## Data and reproducibility

- Default loader reads only `eval/abuse/data/*.csv`, validates `url,label`, rejects
  malformed/conflicting rows and deduplicates identical URL/label pairs. It never
  recurses into raw/local folders. Labels must be benign or malicious.
- The committed hand-authored set has 60 benign and 60 fictional malicious-looking
  URLs on reserved example domains. It includes benign credential pages and subtle
  malicious-looking lures that the current heuristic misses. See data/README.md.
- Sorted normalized host groups are shuffled with `random.Random(seed)`. 70% of
  hosts enter dev and the rest test. All paths of a given host remain together.
  This is reproducible for a fixed dataset, seed and runtime; adding/changing a
  dataset can change partitions. The report records dataset, selected-data and
  source hashes, revision, runtime versions, configuration and exact command.
- The split is constructed **before limiting**. `--limit N` caps the chosen split
  at N rows and independently caps the injection challenge at N. `--limit 0` means
  all rows. Thus live llm-only mode can process up to 2N examples plus retries/
  repairs, not N total requests. Set the daily budget deliberately.
- Default `--split test` numbers are held-out results. Use `--split dev` to tune
  gray_low/gray_high in a copied `--config` JSON first, then freeze it before test.
  The runner does not optimize thresholds or inspect test labels during prediction.
  Do not lower regression thresholds to hide a failing change. Repeated inspection
  can overfit even a held-out test; public claims need a fresh independent dataset.
- `injection.csv` has 16 separate hosts (8 per label), evaluated and reported
  independently. It includes instruction-like attacks and benign discussion of
  instructions. Main/injection host overlap is rejected. All URLs are treated as
  text; no pages, DNS or tools are accessed.

## Variants and measurement

Heuristics: low score is clean, gray score suspicious, high score malicious; no
provider is invoked. LLM: every URL goes through the same capped/quoted prompt and
strict schema, without a heuristic decision floor. Combined: uses the production
routing and gray-zone floor. Invalid output or unavailable inference remains
suspicious, exactly as in production. Cache is explicitly disabled for every run;
there is no mutation of the production Redis client or global classifier settings.

FakeProvider returns a **constant valid suspicious verdict**, independent of input
and labels. It is an interface/regression baseline, not an LLM accuracy estimate.
The production fake's default invalid JSON object is unchanged. Heuristics and
combined have identical binary flag decisions under the conservative gray-zone
floor: LLM can escalate to blocking but cannot clear gray-zone concerns. Therefore
compare block counts as well as flag metrics; do not claim an LLM improves binary
recall merely because combined passed.

Main metrics map suspicious OR malicious to positive (flag/review), clean to
negative. Confusion matrix keys are tp/fp/tn/fn; precision=tp/(tp+fp),
recall=tp/(tp+fn), F1=2tp/(2tp+fp+fn), FPR=fp/(fp+tn). Zero denominators are N/A/null,
not perfect scores. Actual malicious/benign block counts and per-verdict counts are
also reported. Median and nearest-rank P95 use measured whole-classification
milliseconds, including retries and local initialization; they vary across runs.

LLM calls count classification invocations; attempts count budget reservations,
including retry/repair. Fake attempts perform no HTTP. Tokens are summed only
where returned metadata exists; input_known/output_known count calls with usage.
Unknown totals are null, not zero, and failed/retried upstream requests may omit
usage. Main and injection counts/errors are separate and share one invocation's
budget. Error classes and quota exhaustion are reported: inspect these before
interpreting apparently good recall (suspicious fallback can inflate it).

## Optional user-run live models

No live provider was invoked during implementation. After following docs/llm.md,
export keys/model names privately and run the same CLI with `--provider ollama` or
`--provider gemini`; Claude is deliberately excluded. No model names are hardcoded
in the runner. Live inference is not deterministic even with a deterministic data
seed. Record the model/version, runtime and quotas; outputs are aggregated only.
Do not send sensitive paths to a free-tier provider. A per-process request budget
resets between commands, including the two commands in `make eval`.

## Regression gate

`tests/test_abuse_eval.py` runs combined+Fake on the committed held-out split with
seed and precision/recall floors from config.json (0.75 / 0.70). It also requires
no inference errors and checks the injection cases. HTTP and Redis are forbidden
by test fixtures. The existing GitHub Actions `make check` includes this pytest
file; lint/type checks now cover eval/ as well. Production policy remains unchanged
by default; only explicit evaluator constructor options select alternate modes.

## Public recall follow-up

The fixed train/dev/test protocol, hashed membership and frozen policy are in [eval/splits](../splits/README.md). This retains the previously reported test examples and labels the reused-snapshot limitation explicitly. `make eval` now updates only the marked synthetic block in docs/eval-results.md; it preserves the historical and current public comparison. It does not run the public split by default.

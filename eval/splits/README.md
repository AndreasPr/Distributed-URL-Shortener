# Fixed public-snapshot splits

`manifest.json` stores SHA-256 row IDs (URL+label), not URLs. The dataset fingerprint
must match before any phase runs. Raw and derived public CSVs remain ignored because
source terms have not been reviewed. Hashes are identifiers, not anonymization guarantees.

Seed 42. Preserve every historical test host from the original 70/30 host split, then
expand test membership to its registered domains (bundled PSL, including private suffixes).
Split the remaining registered domains 70/30 into train/dev. No domain overlaps splits.
This yields train 96 (42 benign/54 malicious), dev 40 (29/11), test 64 (29/35).
The extra three test examples prevent domain leakage from the old split.

This is **not a new independent holdout**. The original 61-example test was reported
before this task, and the old 139-example dev set was used historically. No labels or
scores from the new test partition are used for this task's threshold selection.
Acquire a separately dated, independently labeled dataset for confirmatory validation.

## Locked procedure

Weights are transparent expert rules in `app/abuse/heuristics.py`, not learned coefficients
or calibrated probabilities. Train is reserved for future fitting; this change does not fit
weights. New lexical feature definitions were specified before scoring the holdout.

Tune only on dev: review threshold grid [0.05, .10, .15, .20, .25, .30, .35, .40].
Require precision >=90% and FPR <=5%, maximize F1, tie-break by recall then higher threshold.
Fail if infeasible. For blocking, take the first of [.65, .75, .85, 1.0] with no benign
blocks on dev. This small sample does not justify a production zero-FPR claim.
The selected thresholds are .15/.65; `policy.json` records all dev candidates, weights,
scorer hash and manifest hash. Query/entropy thresholds and weights were not tuned on test.

Commands from the root, with existing ignored sanitized CSVs in
`eval/abuse/data/local/public/` (never download/fetch target pages automatically):

```bash
# Reproduce into a new directory; do not overwrite committed evidence.
.venv/bin/python -m eval.abuse.recall prepare --splits-dir /tmp/abuse-recall-reproduction
.venv/bin/python -m eval.abuse.recall tune --splits-dir /tmp/abuse-recall-reproduction
.venv/bin/python -m eval.abuse.recall test --splits-dir /tmp/abuse-recall-reproduction
```

All phases refuse to overwrite their evidence. Test requires frozen matching source and
split hashes. Test uses heuristics plus constant FakeProvider, no HTTP/Redis/live LLMs.
Only aggregate metrics are saved. Historical baseline implementation is frozen in
`eval/abuse/legacy.py` with .15/.65 thresholds and the original TLD list. Reports distinguish
the original 61 examples from the expanded 64-example domain-separated test.
Latency is measured for combined/fake only; other summaries use null, not fabricated timing.

`make eval EVAL_PROVIDER=fake` is a separate synthetic regression. It now updates only a
marked section of docs/eval-results.md, preserving the public comparison. Synthetic results
are not evidence of live LLM accuracy. To reproduce public numbers in a fresh clone you
must provide the exact legally acquired snapshot; the manifest alone cannot reconstruct it.

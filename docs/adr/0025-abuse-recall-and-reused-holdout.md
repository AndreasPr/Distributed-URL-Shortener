# 0025: Transparent abuse features and leakage-aware recall evaluation

## Context

The prior 200-URL sanitized Tranco/OpenPhish snapshot reported 3/32 detection recall
(9.375%) on 61 test examples at .15/.65 thresholds. Low-score URLs bypassed the LLM.
Popularity/feed labels are noisy and test results have already been inspected. Repartitioning
cannot turn this snapshot into unseen independent validation. Public source terms are not
reviewed, so URLs cannot be committed as a reproducibility shortcut.

## Decision

Use pure lexical features and explicit additive weights, retaining low/high gray-zone routing.
Add bounded lexical checks for homoglyph characters, hex/high-entropy host labels, explicit
nested shortener URLs, and long base64 query values. Existing IDN, IP, brand, depth, TLD and
path checks are small pure functions too. No DNS, redirect following or page requests occur.
Do not send queries or decoded query content to models or logs. Keep a limited fixed reason
vocabulary and the existing constant FakeProvider test path.

Use fixed seed 42 and registered-domain grouping with the bundled/private PSL. Preserve
all old test hosts and expand test to include related registered domains. Split the remainder
into train/dev; train is unused for fitting because weights are hand-specified. Store hashed
memberships, fingerprints and aggregate results under eval/splits/. Tune only thresholds on
dev using the predeclared constrained F1 grid in its README, then freeze before test. Selected
.15/.65 defaults replace .25/.75 in application configuration; environment overrides still win.
Keep the old scorer frozen for paired comparisons, rather than comparing different denominators.

Prefer explicit weighted features over logistic regression for this small noisy snapshot:
no fitting/runtime dependency, each contribution is explainable. More model complexity without
new labels would not establish generalization. Choose registered-domain rather than exact-host
splits to reduce related-host leakage, and disclose that even domain grouping misses campaigns.

## Consequences

New feature signals can flag benign IDNs, CDNs, login paths, shorteners or encoded state.
The shortener feature detects lexical evidence only, not an observed redirect chain; the
confusable map is deliberately incomplete. Scores are not calibrated probabilities.
The gray zone remains reviewable even if a model answers clean; LLM failure remains suspicious.
Feature changes affect new classifications; existing persisted verdicts are not backfilled.
Runtime environment overrides must be explicitly aligned to the measured policy by the operator.

Any improved recall is an exploratory paired result on a reused snapshot, not a fresh accuracy
estimate. Freeze and report all outcomes; do not retune after test. Public raw data stays ignored;
fresh clones reproduce synthetic checks but need the exact source snapshot for public metrics.
No live providers are called by this evaluation. A new independently labeled temporal holdout
is required before claiming deployment accuracy or selecting more features using test errors.

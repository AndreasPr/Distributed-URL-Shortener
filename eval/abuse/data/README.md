# Synthetic fixture provenance

`sample.csv` is a hand-authored set of 60 benign and 60 malicious-looking examples.
All hosts are reserved example.com/example.org/example.net subdomains; none is a
known victim site. Labels describe fictional scenarios, not verified reputation.
The benign examples include legitimate login/verification/update pages; malicious
examples include innocuous-looking document lures to expose false negatives.
These are intentionally small, patterned regression fixtures, not a representative
benchmark. Their patterns overlap the implemented rules. Do not claim real-world
accuracy from them or tune production thresholds to maximize their test score.

`../injection.csv` is a separate 16-case challenge set (8 per label), never used to
tune thresholds. It includes both attack-like instructions and benign discussions
of injection; instruction text alone does not establish a malicious label.

The default loader reads only top-level *.csv. `raw/` and `local/` are ignored and
never loaded implicitly. See ../prepare_public_data.md for manual preparation.

# Manually preparing public datasets

Nothing in the loader, runner, tests or Makefile downloads lists, resolves hostnames,
or visits listed URLs. The committed CSV is synthetic. Public acquisition is an
optional **manual** task; no raw public data should be committed.

## Review sources before downloading

These are candidate sources, not an assurance of unrestricted use. Check the
current terms, permitted purposes, attribution/redistribution rules, authentication
and rate limits yourself. Save the terms URL and access date in a private manifest.
Use only a free option for which you qualify; skip a source if access requires payment.

| Source | Starting point | Label and caveat |
| --- | --- | --- |
| Tranco | [Ranking and permanent list IDs](https://tranco-list.eu/) | Candidate benign domains; popularity does **not** prove safety. Preserve the permanent list ID and review attribution/licences for constituent rankings. |
| PhishTank | [Developer documentation](https://phishtank.org/developer_info.php) and its linked terms | Candidate malicious URLs: retain verified records, note online status and verification date. Follow its access-key and descriptive User-Agent requirements. |
| OpenPhish | [Community feed and linked Terms of Use](https://openphish.com/phishing_feeds.html) | Community feed is limited and distinct from paid products. Review permitted use and redistribution before saving or using entries. |
| URLhaus | [Community API, authentication and fair-use links](https://urlhaus.abuse.ch/api/) | Malware-delivery URLs, not necessarily phishing. Keep a separate evaluation cohort. Access requires an Auth-Key; current fair-use rules may restrict commercial use. Never save a key-bearing download URL in a committed manifest. |

No feed was downloaded while implementing this step. These documentation links
were checked on 2026-10-24; terms and access mechanisms can change.

## Local files and conversion

1. Create `eval/abuse/data/raw/` and download the chosen snapshot **yourself** from
   its official source. Keep archives and original files there; the entire folder
   is git-ignored. Do not open, crawl, execute or follow URL entries.
2. Record acquisition UTC date, source/list ID, source-file SHA-256, label rule,
   filters and licences in a manifest in that same ignored folder. Keep credentials
   in your environment, not filenames, shell history, manifests or reports.
3. Create ignored `eval/abuse/data/local/`. Convert locally to UTF-8 CSV using a CSV
   writer, with **exactly** the header `url,label`. Labels are `benign` or `malicious`.
   Preserve CSV quoting rather than splitting on commas manually.
   - Tranco's rank/domain rows: retain the domain, construct `https://DOMAIN/`,
     label `benign` as a **weak popularity-derived label**. Do not resolve the host.
   - PhishTank's CSV: take its URL field after your verified/status/date filters,
     label `malicious`. Keep the source metadata in the private manifest.
   - OpenPhish text: each nonempty URL becomes a `malicious` row.
   - URLhaus: use its documented URL column, handling metadata/comment lines with
     a proper CSV parser. Filter status/time deliberately and record those choices.
4. Review labels, remove exact duplicates, investigate conflicting labels, and
   exclude credentials/PII/token-bearing URLs. The loader rejects conflicting exact
   URLs and embedded username/password, but it does not certify that paths are safe
   to send to a provider. Keep raw and normalized data out of Git. The runner never
   silently mixes nested raw/local CSVs into the default synthetic fixture.
5. Run an offline baseline explicitly:

   ```bash
   .venv/bin/python -m eval.abuse.run --variant heuristics --provider fake \
     --data-dir eval/abuse/data/local --split dev --seed 42 --limit 100
   ```

   Then, after fixing your policy using only dev data, run the same command with
   `--split test`. Grouping keeps an exact normalized host in only one split;
   related subdomains/campaigns can still leak across splits. For credible public
   research, curate domain/campaign-disjoint and time-separated datasets, audit
   label uncertainty and source imbalance, and document that additional procedure.
6. Reports contain aggregate metrics, hashes and commands, not source URLs. Keep
   per-run artifacts under ignored `eval/abuse/results/`; review aggregate reports
   and licence obligations before sharing. Gemini receives domain/path content:
   do not select a live provider for public data until you have reviewed privacy
   and source terms. Local Ollama or heuristics are preferable for private data.

The synthetic injection challenge is evaluated separately even when using a public
main dataset. Its results must not be presented as real-feed injection performance.

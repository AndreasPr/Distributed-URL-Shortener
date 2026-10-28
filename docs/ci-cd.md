# CI and releases

The workflows run on GitHub-hosted Ubuntu runners using free tooling for this public
repository. No cloud credentials or personal access token are required.

## Workflows

| Workflow | Trigger | Gates |
| --- | --- | --- |
| `ci.yml` | PR, push to master/main, reusable call | lint/types, unit coverage, PostgreSQL/Redis integration coverage, MCP, frontend, gitleaks, pip-audit, npm audit report, promtool |
| `docker.yml` | PR, version tag | Buildx build/load, Trivy; tags additionally require reusable CI before image build and publication |
| `k8s-smoke.yml` | PR | kind deployment with the existing CI overlay, HTTP smoke, 30-second k6 test |
| `codeql.yml` | PR, Monday 06:23 UTC | Python and JavaScript/TypeScript analysis |
| `terraform-checks.yml` | PR/main push touching infra or its tooling | fmt, backend-disabled init/validate, TFLint, Checkov; no cloud credentials or plan/apply |

All workflow tokens default to `contents: read`. Only the release publication job
gets `packages: write`; CodeQL analysis gets `security-events: write`. External
actions are pinned to full commit SHAs with version comments. Dependabot checks
Actions weekly. Concurrency cancels superseded runs. No `pull_request_target` or
unsafe `workflow_run` publisher is used. Python's hashed development lock and npm's
lock are cached; image builds deliberately bypass layer cache and pull the base
image so OS security updates are applied.

## Local equivalents and coverage

```bash
make check
make test-integration
make frontend-check
npm --prefix frontend run build
make mcp-test
actionlint
RUN_K6=true bash scripts/kind_smoke.sh
```

Docker is needed for Testcontainers, promtool fallback and kind. Install kind,
kubectl, kubeconform and k6 for the last command. `make test` stays fast/unit-only;
`make test-integration` runs unit plus real PostgreSQL/Redis tests and enforces the
measured **93.6% combined floor**. Optional slow Kafka tests are not in this gate.
Raise the floor after measuring new coverage; never lower it to conceal failures.
No unused database credentials are injected: Testcontainers supplies ephemeral URLs.

Unit/integration coverage, dependency scans, and kind/load diagnostics are uploaded
for seven days, including available reports after failure. Generated `artifacts/`
and `reports/` remain ignored. Codecov is off by default; set repository variable
`CODECOV_ENABLED=true` for an optional non-blocking upload. Local coverage remains
the authoritative gate regardless of Codecov availability.

## Security gates

Gitleaks scans the full Git history with redacted output. pip-audit scans backend
and MCP runtime locks and fails on findings. npm audit produces an advisory JSON
artifact; npm install, lint, type checks, tests and production build still block.
Trivy scans the actual built image and fails on **fixable HIGH/CRITICAL** findings.
`.trivyignore` currently has no exceptions. Any future exception must name the exact
CVE/package, evidence, owner, tracking issue and expiry; broad suppression is not
acceptable. See [the original verification record](ci-verification.md) and
[security remediation verification](ci-security-verification.md) for dated results.

## Kubernetes and performance

`helm/kind-action` creates the cluster. The runner accepts this explicitly owned
cluster with `KIND_EXISTING=true`, validates both overlays, builds/loads the checkout
SHA image, generates ephemeral credentials, and delegates deployment to `apply -k`.
The CI overlay uses Redis Streams and single replicas without ingress or HPA.
Frontend production build is checked separately; it runs outside this cluster.
The migration is initially suspended, then starts after PostgreSQL/Redis readiness,
so its deadline measures migration execution rather than cold dependency startup.

The HTTP smoke checks health, shorten, 307, eventual analytics, metrics, missing-key
401 and write-bucket 429 with Retry-After. It intentionally exhausts its API key.
k6 gets a separate temporary key and drives five redirects/second for 30 seconds:
p95 below 500ms, error rate below 1%, all response checks true, zero dropped iterations.
This portable load gate is not a proof of the 100ms cache-hit SLO. Redirects are not
followed to external sites, and expected auth/throttling failures are tested separately.
Failed runs save pod logs/events/status; the workflow always deletes its kind cluster.

## Release procedure

1. Open a PR and inspect every required check and report. Configure branch protection
   to require CI, Docker scan, Kubernetes smoke and both CodeQL analyses. Workflow files
   alone cannot configure repository branch protection.
2. Resolve blocking security findings before release. Review and merge the PR.
3. On the intended merged commit, create and push an unused version tag:
   `git tag v1.2.3` followed by `git push origin v1.2.3` (choose the real version).
4. The tag runs all reusable CI jobs. Only on success does it build/scan the image;
   only after both succeed can the publication job load the scanned image artifact
   and push `ghcr.io/andreaspr/distributed-url-shortener:v1.2.3` and `sha-<commit>`.
5. Check the Actions run and package digest. No mutable latest tag or automatic
   persistent deployment is created. Follow [Kubernetes instructions](kubernetes.md)
   for deployment/rollback. Existing GHCR packages must grant this repository Actions
   access; configure package permissions rather than adding a personal token.

GitHub-hosted orchestration, CodeQL uploads, optional Codecov and GHCR publication
require a real GitHub run; local checks do not establish their success.

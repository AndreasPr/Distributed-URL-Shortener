# CI/CD guide

This consolidates the former implementation, setup, quick-reference, and CI/CD guides. Workflow files, not historical success claims, define current behavior. All local development uses free tools and requires no cloud credentials. See [developer setup](developer.md), [deployment](DEPLOYMENT.md), and [baseline findings](baseline.md).

## What runs

| Workflow / job | Trigger | Work performed |
| --- | --- | --- |
| [CI / lint-and-test](../.github/workflows/ci.yml) | Push and PR targeting master, main, develop | Python 3.11.14 from .python-version; hashed development lock; make check (full Flake8 and blocking mypy); make mcp-test; Codecov upload |
| [CI / frontend-check](../.github/workflows/ci.yml) | Same push/PR triggers as backend CI | Node 22; make frontend-check (npm ci, core-web-vitals ESLint, TypeScript) |
| [CD / build-and-push](../.github/workflows/cd.yml) | Push to master/main, `v*` tags, completed CI on master/main | Build metadata, Docker Buildx, GHCR login, multi-stage backend image build and push, registry cache |

CD publishes images; it does not deploy Kubernetes or verify runtime health. Its direct push trigger is independent of CI, and its `workflow_run` trigger does not check for a successful conclusion. Mypy, tests, lint, and frontend checks are blocking; Codecov upload remains nonblocking and there is no enforced coverage minimum. Branch protection and required reviews are repository settings, not established by these YAML files.

## Setup and daily development

1. Install root development dependencies and MCP requirements using [AGENTS.md](../AGENTS.md).
2. Copy the safe environment example and configure local credentials using [deployment instructions](DEPLOYMENT.md). Never commit local environment files.
3. Create a scoped feature branch; run the checks below; stage explicit source paths and use a conventional commit message.
4. Push the feature branch and open a PR targeting a configured branch. A push to an arbitrary feature branch alone does not trigger this CI workflow.
5. Inspect each workflow result before merging. Image publication is distinct from deployment.

From the repository root:

```sh
make check
make frontend-check
make mcp-test
```

The gate uses normal pytest capture with a clean pinned Python build; recreate the environment as described in [developer setup](developer.md) instead of disabling capture. Coverage reports remain ignored locally. Pre-commit hooks provide the same local backend checks and redacted Gitleaks scanning; they do not replace CI.

## Publishing and versioning

The existing CD workflow references the repository Actions secret `GHCR_TOKEN` for registry authentication. No token value belongs in this repository; this cleanup neither adds credentials nor changes that workflow. Local builds and tests do not require this integration. If publication is unavailable, use local images. No `KUBE_CONFIG` or cloud deployment credentials are needed or supported by the current jobs.

`REGISTRY` is `ghcr.io`; `IMAGE_NAME` derives from the repository and is normalized to lowercase. Tags come from branch refs, semantic versions, a generated `main-YYYYMMDD-shortsha` version (or the pushed tag), and `sha-*`. For a release, after reviewing the commit, use `git tag vX.Y.Z` and `git push origin vX.Y.Z` with an actual chosen version. Inspect the metadata step for the exact generated tags; do not assume a tag publishes a deployment.

The Dockerfile has builder/runtime stages, OCI version/date/revision labels, and corresponding build arguments. CI caches Python packages and Docker registry layers. `.dockerignore` excludes credentials, databases, tests, docs, frontend artifacts, and the independent MCP server. Historical build-time and image-size estimates have been removed because they were not measurements of the current build.

## Inspecting and troubleshooting

Use GitHub's Actions tab, select a run, then expand the failing step. Optional read-only CLI commands:

```sh
gh workflow list
gh run list
gh run view RUN_ID --log
```

- Test/lint failure: reproduce the exact command locally; do not infer success from another job. Current suites use SQLite/mocks; live service containers and their unused credential variables are no longer part of this unit-test job.
- Build failure: inspect dependency installation, Docker context, and image metadata steps. Reproduce with `docker build -t url-shortener:local .`.
- Registry failure: inspect the login/push step and repository package permissions without printing tokens. Check GitHub Packages for the emitted version after a successful push.
- Cache behavior: retain the existing build stages and registry cache; compare measured runs instead of claiming fixed build times.

## Optional local Kubernetes deployment and rollback

Follow [deployment setup](DEPLOYMENT.md#kubernetes) to create the local Secret and prepare images/storage. From the repository root, run `bash k8s/deploy.sh` only against the intended local context. An available registry image is not automatically used by manifests referencing a local image tag.

```sh
kubectl get pods -n url-shortener
kubectl rollout status deployment/api -n url-shortener
kubectl logs deployment/api -n url-shortener
kubectl rollout history deployment/api -n url-shortener
```

When a previously working rollout must be restored, `kubectl rollout undo deployment/api -n url-shortener` restores the Deployment revision; verify readiness afterward. It does not roll back database migrations or data. Kubernetes has known baseline failures; a script completing does not prove the application is healthy.

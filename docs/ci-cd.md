# CI/CD guide

This consolidates the former implementation, setup, quick-reference, and CI/CD guides. Workflow files, not historical success claims, define current behavior. All local development uses free tools and requires no cloud credentials. See [developer setup](DEVELOPER.md), [deployment](DEPLOYMENT.md), and [baseline findings](baseline.md).

## What runs

| Workflow / job | Trigger | Work performed |
| --- | --- | --- |
| [CI / lint-and-test](../.github/workflows/ci.yml) | Push and PR targeting master, main, develop | Python 3.11; PostgreSQL and Redis services; dependency installation; Black, selected Flake8 error checks, isort, informational mypy; pytest with coverage; Codecov upload |
| [CD / build-and-push](../.github/workflows/cd.yml) | Push to master/main, `v*` tags, completed CI on master/main | Build metadata, Docker Buildx, GHCR login, multi-stage backend image build and push, registry cache |

CD publishes images; it does not deploy Kubernetes or verify runtime health. Its direct push trigger is independent of CI, and its `workflow_run` trigger does not check for a successful conclusion. Mypy and Codecov upload failures are nonblocking; there is no enforced coverage minimum. MCP and frontend checks are currently local-only. Branch protection and required reviews are repository settings, not established by these YAML files.

## Setup and daily development

1. Install root development dependencies and MCP requirements using [AGENTS.md](../AGENTS.md).
2. Copy the safe environment example and configure local credentials using [deployment instructions](DEPLOYMENT.md). Never commit local environment files.
3. Create a scoped feature branch; run the checks below; stage explicit source paths and use a conventional commit message.
4. Push the feature branch and open a PR targeting a configured branch. A push to an arbitrary feature branch alone does not trigger this CI workflow.
5. Inspect each workflow result before merging. Image publication is distinct from deployment.

From the repository root:

```sh
.venv/bin/python -m pytest --cov=app --cov-report=term-missing -v
.venv/bin/black --check app/
.venv/bin/flake8 app/ --count --select=E9,F63,F7,F82 --show-source --statistics
.venv/bin/isort --check-only app/
.venv/bin/mypy app/ --ignore-missing-imports
```

CI adds `--cov-report=xml`; reports remain ignored locally. On the baseline macOS environment, add `-p no:capture` to pytest to avoid the documented readline crash. Run MCP tests from `mcp-server/` using `../.venv/bin/python -m pytest -v`. See AGENTS.md for frontend checks and their current limitations. Optional editor formatting or pre-commit hooks are local tooling, not configured CI requirements.

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

- Test/lint failure: reproduce the exact command locally; do not infer success from another job. CI's separate DB variables do not match application's DB_URL configuration; existing unit fixtures use SQLite.
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

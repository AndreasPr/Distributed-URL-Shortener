# GitHub Actions Quick Reference

Visual reference for CI/CD workflows, secrets setup, and common commands.

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     GitHub Repository                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                      Developer Push                             │
│                            │                                    │
│                            ▼                                    │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  CI Workflow (.github/workflows/ci.yml)                │     │
│  │  Triggered: Push to master/main/develop, PRs           │     │
│  │                                                        │     │
│  │  ┌─────────────────────────────────────────────────┐   │     │
│  │  │ 1. Lint & Format                                │   │     │
│  │  │    - Black (code formatting)                    │   │     │
│  │  │    - Flake8 (style violations)                  │   │     │
│  │  │    - isort (import organization)                │   │     │
│  │  └─────────────────────────────────────────────────┘   │     │
│  │                    │                                   │     │
│  │                    ▼                                   │     │
│  │  ┌─────────────────────────────────────────────────┐   │     │
│  │  │ 2. Type Checking                                │   │     │
│  │  │    - mypy (detect type errors)                  │   │     │
│  │  └─────────────────────────────────────────────────┘   │     │
│  │                    │                                   │     │
│  │                    ▼                                   │     │
│  │  ┌─────────────────────────────────────────────────┐   │     │
│  │  │ 3. Unit Tests                                   │   │     │
│  │  │    - pytest with coverage                       │   │     │
│  │  │    - PostgreSQL + Redis services                │   │     │
│  │  │    - Coverage report to Codecov                 │   │     │
│  │  └─────────────────────────────────────────────────┘   │     │
│  │                    │                                   │     │
│  │     All Checks Passed                                  │     │
│  │                                                        │     │
│  └────────────────────────────────────────────────────────┘     │
│                        │                                        │
│   (On master/main only)│                                        │
│                        ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  CD Workflow (.github/workflows/cd.yml)                  │   │
│  │  Triggered: Push to master/main, tags, CI completion     │   │
│  │                                                          │   │
│  │  ┌─────────────────────────────────────────────────┐     │   │
│  │  │ 1. Generate Version                             │     │   │
│  │  │    Branch: main-YYYYMMDD-{hash}                 │     │   │
│  │  │    Tag:    v1.2.3 (semver)                      │     │   │
│  │  └─────────────────────────────────────────────────┘     │   │
│  │                    │                                     │   │
│  │                    ▼                                     │   │
│  │  ┌─────────────────────────────────────────────────┐     │   │
│  │  │ 2. Docker Build & Push                          │     │   │
│  │  │    - Multi-stage build (builder + runtime)      │     │   │
│  │  │    - Push to GHCR (GitHub Container Registry)   │     │   │
│  │  │    - Cache layers for faster builds             │     │   │
│  │  │    - OCI labels (version, date, revision)       │     │   │
│  │  └─────────────────────────────────────────────────┘     │   │
│  │                    │                                     │   │
│  │                    ▼                                     │   │
│  │  ┌─────────────────────────────────────────────────┐     │   │
│  │  │ 3. (Optional) Kubernetes Deployment             │     │   │
│  │  │    - Update API deployment image (manual/local) │     │   │
│  │  │    - Use `./k8s/deploy-simple.sh` for local     │     │   │
│  │  │    - For cloud clusters, add `KUBE_CONFIG`      │     │   │
│  │  │      secret and enable remote deploy            │     │   │
│  │  └─────────────────────────────────────────────────┘     │   │
│  │                    │                                     │   │
│  │                    ▼                                     │   │
│  │  ┌─────────────────────────────────────────────────┐     │   │
│  │  │ 4. Deployment Verification                      │     │   │
│  │  │    - Check all pods ready                       │     │   │
│  │  │    - Health check /health/redis                 │     │   │
│  │  │    - List pod status                            │     │   │
│  │  │    - Display deployment summary                 │     │   │
│  │  └─────────────────────────────────────────────────┘     │   │
│  │                    │                                     │   │
│  │          Deployment Complete                             │   │ 
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                        │                                        │
│                        ▼                                        │
│              Service Running                                    │
│              Kubernetes Pod Ready                               │
│              Health Check Passing                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Secrets Setup

### GitHub Secrets Location

**Settings** → **Secrets and variables** → **Actions**

### Required Secrets

```yaml
GHCR_TOKEN:
  Description: Personal Access Token for GitHub Container Registry
  Permissions:
    - write:packages (push images)
    - read:packages (pull images)
    - repo (repository access)
  Created: https://github.com/settings/tokens
  Expires: Set your own expiration date

KUBE_CONFIG: (optional)
  Description: Base64-encoded kubectl config (only for cloud/remote deployments)
  Command: cat ~/.kube/config | base64 | tr -d '\n'
  Used by: CD workflow only if remote Kubernetes deployment is enabled
  Sensitive: Yes and don't expose
```

### Add Secret Safely

```bash
# Export kubeconfig
export KUBECONFIG=~/.kube/config
ENCODED=$(cat ~/.kube/config | base64 | tr -d '\n')

# Copy to GitHub Secrets (Settings → Secrets → New repository secret)
# Paste ENCODED value into KUBE_CONFIG secret
```

## Workflow Files

### CI Workflow (`.github/workflows/ci.yml`)

**Trigger Events:**
```yaml
on:
  push:
    branches: [master, main, develop]
  pull_request:
    branches: [master, main, develop]
```

**What it checks:**
- ✅ Black formatting
- ✅ Flake8 linting
- ✅ isort import organization
- ✅ mypy type checking
- ✅ pytest unit tests
- ✅ Code coverage

**Status:** Required for PRs to master/main

### CD Workflow (`.github/workflows/cd.yml`)

**Trigger Events:**
```yaml
on:
  push:
    branches: [master, main]
    tags: ['v*']
  workflow_run:
    workflows: ['CI - Tests & Code Quality']
    types: [completed]
    branches: [master, main]
```

**What it does:**
- ✅ Builds Docker image
- ✅ Pushes to GHCR
- (Optional) Updates Kubernetes deployment (if `KUBE_CONFIG` provided and remote deploy enabled)
- (Optional) Verifies rollout and health checks for remote deployments

## Common Workflows

### Workflow 1: Regular Development

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes
vim app/services/url_service.py

# 3. Test locally
pytest

# 4. Format and lint
black app/
isort app/

# 5. Commit
git add .
git commit -m "feat: improve cache efficiency"

# 6. Push and create PR
git push origin feature/my-feature
# → GitHub shows "Create Pull Request"

# 7. CI runs automatically
# → If CI passes, reviewer approves

# 8. Merge to main
# - CD runs automatically
# - Docker builds and pushes
# - Images ready for deployment (manual or cloud-configured)
```

### Workflow 2: Production Release

```bash
# 1. Ensure main branch is ready
git checkout main
git pull origin main

# 2. Create and push tag
git tag v1.2.3
git push origin v1.2.3

# 3. GitHub shows CD running with tag
# - Image tagged as ghcr.io/owner/repo:v1.2.3
# - Deployed to Kubernetes
# - Can rollback to v1.2.2 if needed

# 4. Verify deployment
kubectl rollout status deployment/api -n url-shortener
```

### Workflow 3: Hotfix

```bash
# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug

# 2. Fix the bug
vim app/api/routes.py

# 3. Test thoroughly
pytest -v

# 4. Commit and push
git add .
git commit -m "fix: handle edge case in URL redirect"
git push origin hotfix/critical-bug

# 5. Create PR to main
# - CI runs
# - Once approved, merge to main
# - CD deploys immediately

# 6. Tag release
git checkout main
git pull origin main
git tag v1.2.1
git push origin v1.2.1
```

## Monitoring Workflows

### View Workflow Runs

1. GitHub repository → **Actions** tab
2. Click workflow name (CI or CD)
3. View all runs with status

### Check Workflow Logs

1. Click specific run
2. Click job (lint-and-test, build-and-push, deploy-to-k8s)
3. Expand steps to see output
4. Look for ✅ or ❌ status

### Common Log Sections

**CI Workflow:**
```
✅ Lint with Black        — Code formatting
✅ Lint with Flake8       — Style violations
✅ Import sorting isort   — Import order
✅ Type checking mypy     — Type errors
✅ Run tests with coverage — Unit tests
```

**CD Workflow:**
```
✅ Generate version        — Version tagging
✅ Build and push image    — Docker push
✅ Update deployment image — kubectl set image
✅ Wait for rollout        — kubectl rollout status
✅ Verify deployment       — Pod readiness check
✅ Health check            — API /health endpoint
```

## Environment Variables in Workflows

### CI Workflow (`.github/workflows/ci.yml`)

```yaml
env:
  DB_USER: user
  DB_PASSWORD: postgres_password_k8s
  DB_HOST: localhost
  DB_PORT: 5432
  DB_NAME: url_db
  REDIS_HOST: localhost
  REDIS_PORT: 6379
```

### CD Workflow (`.github/workflows/cd.yml`)

```yaml
env:
  REGISTRY: ghcr.io                    # Container registry
  IMAGE_NAME: ${{ github.repository }} # owner/repo-name
  NAMESPACE: url-shortener             # K8s namespace
  DEPLOYMENT: api                      # K8s deployment
```

## Troubleshooting

### Tests Failing

1. **Check logs**: Actions → [workflow] → lint-and-test
2. **Common causes**:
   - Import errors → Fix imports with `isort app/`
   - Type errors → Check mypy output
   - Test failures → Run locally: `pytest -vv`
3. **Fix and push again**: CD won't run until CI passes

### Build/Push Failing

1. **Check logs**: Actions → [workflow] → build-and-push
2. **Common causes**:
   - GHCR_TOKEN missing/expired → Regenerate token
   - Docker syntax error → Fix Dockerfile
   - Python import error → Check app code
3. **Fix and re-push**

### Deployment Failing

1. **Check logs**: Actions → [workflow] → deploy-to-k8s
2. **Common causes**:
  - KUBE_CONFIG invalid (if used) → Re-encode kubeconfig or remove the secret if you don't use remote deploy
   - Cluster unreachable → Check K8s cluster status
   - Pod unhealthy → Check deployment logs: `kubectl logs deployment/api`
3. **Verify and retry**: Push same commit again (will re-run workflow)

## Performance Tips

### Faster Docker Builds

- Leverage layer caching:
  ```dockerfile
  COPY requirements.txt ./
  RUN pip install ...  # Cache layer reused
  COPY . ./            # Only this changes on code update
  ```

- Multi-stage builds (already implemented):
  ```dockerfile
  FROM python:3.11 AS builder      # Heavy build tools
  RUN pip install ...
  FROM python:3.11 AS runtime      # Smaller image
  COPY --from=builder ...          # Only dependencies
  ```

### Faster Tests

- Run tests in parallel:
  ```bash
  pytest -n auto  # Requires pytest-xdist
  ```

- Skip slow tests:
  ```bash
  pytest -m "not slow"
  ```

- Use test markers:
  ```python
  @pytest.mark.slow
  def test_slow_operation():
      ...
  ```

### Faster Deployments

- Use `imagePullPolicy: IfNotPresent`:
  ```yaml
  spec:
    containers:
    - imagePullPolicy: IfNotPresent  # Skip registry on K8s node
  ```

- Pre-pull images on nodes (advanced)

## Verification Checklist

Before first deployment:

- [ ] Repository has `.github/workflows/` directory
- [ ] `ci.yml` and `cd.yml` exist in workflows
- [ ] `GHCR_TOKEN` secret added to repository
 - [ ] (Optional) `KUBE_CONFIG` secret added (cloud deployments only)
 - [ ] Push to main/master triggers CI workflow
 - [ ] CI passes (all checks green)
 - [ ] CD workflow runs after CI passes
 - [ ] Image appears in GHCR packages
 - [ ] Local deployment tested with `./k8s/deploy-simple.sh` (optional)
 - [ ] (Optional) Health check passed for remote deployments
 - [ ] API accessible locally via port-forward (if deployed)

## Reference

| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | Continuous Integration (tests, linting) |
| `.github/workflows/cd.yml` | Continuous Deployment (build, push, deploy) |
| `CICD.md` | Detailed CI/CD setup guide |
| `DEVELOPER.md` | Local development guide |
| `Dockerfile` | Multi-stage Docker build |
| `.dockerignore` | Optimize Docker builds |
| `requirements-dev.txt` | Development dependencies |
| `pytest.ini` | Pytest configuration |


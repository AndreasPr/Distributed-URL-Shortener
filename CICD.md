# GitHub Actions CI/CD Pipeline

Automated testing, building, and pushing Docker images to GitHub Container Registry with every push.

## Overview

```
Developer Push to GitHub
    ↓
[CI Workflow: Tests & Code Quality]
    ├─ Lint (Black, Flake8, isort)
    ├─ Type checking (mypy)
    └─ Unit tests (pytest with coverage)
    ↓
[CD Workflow: Build & Push]
    ├─ Generate semantic version
    ├─ Build multi-stage Docker image
    └─ Push to GitHub Container Registry (GHCR)
    
    Image available for deployment
    
Local deployment (see Kubernetes section):
    ./k8s/deploy-simple.sh
```

## Setup Steps

### Step 1: Create Personal Access Token

1. Go to GitHub: https://github.com/settings/tokens
2. Click "Generate new token"
3. Name: `GHCR_TOKEN`
4. Permissions:
   - ✅ `write:packages` — Push images
   - ✅ `read:packages` — Pull images
   - ✅ `repo` — Read repository
5. Copy the token (you'll need it next)

### Step 2: Add GitHub Secrets

In your repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click "New repository secret"
3. Add this secret:

| Name | Value |
|------|-------|
| `GHCR_TOKEN` | Personal Access Token from Step 1 |

**Note:** `KUBE_CONFIG` secret is optional. It's only needed if you deploy to cloud Kubernetes (EKS, GKE, AKS).

### Step 3: Update Container Registry Username

Edit `.github/workflows/cd.yml` and update this section if using a different registry:

```yaml
env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}
```

For Docker Hub, change to:
```yaml
env:
  REGISTRY: docker.io
  IMAGE_NAME: your-docker-username/url-shortener
```

## Workflows

### CI Workflow (`.github/workflows/ci.yml`)

**Triggers on:**
- Push to `master`, `main`, or `develop` branches
- Pull requests to `master`, `main`, or `develop` branches

**What it does:**
1. Sets up PostgreSQL and Redis services
2. Installs Python dependencies
3. **Lint & Format:**
   - Black (code formatting)
   - Flake8 (style violations)
   - isort (import sorting)
4. **Type Checking:** mypy (catches type errors)
5. **Tests:** pytest with coverage reporting
6. **Upload:** Code coverage to Codecov

**Status Check:** Required before merging PRs

### CD Workflow (`.github/workflows/cd.yml`)

**Triggers on:**
- Push to `master` or `main` branches
- Git tags (`v*`)
- CI workflow completion (on master/main)

**What it does:**
1. **Version Generation:**
   - Tags: Use git tag (e.g., `v1.0.0`)
   - Branches: Use `main-YYYYMMDD-{commit_hash}`
2. **Build & Push:**
   - Multi-stage Docker build
   - Push to GitHub Container Registry
   - Cache layers for faster builds
3. **Done:** Image is available for deployment

**Note:** Kubernetes deployment is not automated in this workflow because the kubeconfig points to local Docker Desktop (not accessible from GitHub runners). For local K8s deployment, use `./k8s/deploy-simple.sh`. For cloud K8s deployment (EKS/GKE/AKS), update the KUBE_CONFIG secret to point to your cloud cluster and uncomment the `deploy-to-k8s` job.

## Image Push Flow

### Automatic Build & Push (Recommended)

Just push to `master`/`main`:

```bash
git add .
git commit -m "fix: improve cache hit ratio"
git push origin master
```

GitHub Actions will:
1. Run tests automatically (CI)
2. If tests pass, build Docker image (CD)
3. Push to GHCR as: `ghcr.io/owner/repo:main-YYYYMMDD-{hash}`
4. Image ready for deployment

### Release with Version Tag

For production releases, tag your commit:

```bash
git tag v1.2.3
git push origin v1.2.3
```

This will:
1. Build image as `ghcr.io/your-repo/url-shortener:v1.2.3`
2. Also tag as: `v1`, `latest`, `sha-{hash}`
3. All previous versions remain in GHCR for reference

### Deploy to Local Kubernetes

After image is built, deploy locally:

```bash
cd k8s
./deploy-simple.sh
```

This will:
1. Use the image from Docker Desktop
2. Deploy to local Kubernetes cluster
3. Verify pods are running

## Monitoring Workflows

### GitHub Actions Dashboard

1. Go to your repository
2. Click "Actions" tab
3. View workflow runs and logs

### View Workflow Logs

Click on a workflow run to see:
- ✅ Passed jobs (green)
- ❌ Failed jobs (red)
- Detailed step output
- Image build and push logs

### Check Image in GHCR

1. Go to your repository
2. Click "Packages" (right sidebar)
3. Click `url-shortener` image
4. View all tags and versions

## Troubleshooting

### Tests Failing

Check the CI workflow logs:
1. Go to Actions → Latest run
2. Click "lint-and-test" job
3. Expand "Run tests with coverage"
4. Fix issues locally:

```bash
# Run tests locally
pytest --cov=app --cov-report=term-missing

# Fix linting issues
black app/
isort app/
```

### Build Failing

Check the CD workflow logs:
1. Go to Actions → Latest run
2. Click "build-and-push" job
3. Check "Build and push Docker image" step
4. Common issues:
   - Missing dependencies → Update `requirements.txt`
   - Python syntax errors → Fix locally with `black` and `flake8`
   - Import errors → Check `isort` output

### Image Not Pushing to GHCR

Verify secrets are set:
```bash
# (Can't view secret values, but you can verify they exist)
# Go to Settings → Secrets and variables → Actions
# Should see GHCR_TOKEN listed
```

Verify token has correct permissions:
- ✅ `write:packages`
- ✅ `read:packages`
- ✅ `repo`

## Configuration Options

### Environment Variables in CD

Edit `.github/workflows/cd.yml` to customize:

```yaml
env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}  # owner/repo-name
```

### Image Tags

Automatically generated tags in order of preference:

1. **Git tag:** `v1.0.0` → `ghcr.io/owner/repo:v1.0.0`
2. **Branch:** `main` → `ghcr.io/owner/repo:main`
3. **Date-based:** `main-20260515-abc1234`
4. **Commit SHA:** `ghcr.io/owner/repo:sha-abc1234`

All tags point to the same image for flexibility.

### Using Different Registries

To use Docker Hub instead of GHCR:

1. Create Docker Hub account and Personal Access Token
2. Change in `.github/workflows/cd.yml`:
   ```yaml
   env:
     REGISTRY: docker.io
     IMAGE_NAME: your-docker-username/url-shortener
   ```
3. Update `GHCR_TOKEN` secret → `DOCKER_TOKEN`
4. Update login step to use Docker credentials

## Best Practices

### Code Quality

✅ **Always run tests before pushing:**
```bash
pytest
black app/
flake8 app/
```

✅ **Use semantic commits:**
```
feat: add caching layer
fix: handle redis connection timeout
docs: update README
```

✅ **Write meaningful commit messages:**
```
Bad:  "update code"
Good: "improve cache hit ratio by 25% using LRU eviction"
```

### Image Management

✅ **Tag releases with semver:**
```bash
git tag v1.2.3
git push origin v1.2.3
```

✅ **Deploy from GHCR:**
```bash
# Pull and run the image locally
docker run ghcr.io/owner/repo:v1.2.3

# Or deploy to Kubernetes
kubectl set image deployment/api api=ghcr.io/owner/repo:v1.2.3
```

✅ **Keep images small:**
- Use multi-stage Dockerfile
- Exclude build artifacts in .dockerignore
- Remove unnecessary dependencies

### Secrets Management

✅ **Never commit secrets:**
```bash
# Bad - don't do this:
echo "GHCR_TOKEN=ghp_xxxx" > .env

# Good:
# Add to .gitignore and use GitHub Secrets
```

✅ **Rotate tokens periodically:**
- Update `GHCR_TOKEN` every 90 days

✅ **Use least-privilege tokens:**
- Only grant permissions needed
- Separate tokens for different services

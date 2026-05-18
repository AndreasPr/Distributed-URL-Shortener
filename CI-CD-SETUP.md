# CI/CD Setup Checklist

Step-by-step guide to enable GitHub Actions CI/CD for your project.

## ✅ Pre-Deployment Setup

### Step 1: Create GitHub Personal Access Token

**Location:** https://github.com/settings/tokens

**What to do:**
1. Click "Generate new token"
2. Name: `GHCR_TOKEN`
3. Expiration: 90 days (recommended)
4. Permissions:
   - ✅ `write:packages` — Push images to GHCR
   - ✅ `read:packages` — Pull images from GHCR
   - ✅ `repo` — Access repository
5. Click "Generate token"
6. **Copy the token immediately**


### Step 2: (Optional) Export Kubeconfig

**Only required for cloud Kubernetes deployments.** If you deploy only to a local Docker Desktop or minikube cluster, skip this step and use the local `./k8s/deploy-simple.sh` script instead.

**Location:** Your machine's `~/.kube/config`

**What to do (cloud clusters only):**
```bash
# Run this command and copy the entire output (one long line)
cat ~/.kube/config | base64 | tr -d '\n'
```

**Status:**
```
Kubeconfig exported (optional)
```

### Step 3: Add GitHub Secrets

**Location:** Your repository → Settings → Secrets and variables → Actions

**Add first secret (GHCR_TOKEN):**
1. Click "New repository secret"
2. **Name:** `GHCR_TOKEN`
3. **Value:** Paste the token from Step 1
4. Click "Add secret"

**Add second secret (KUBE_CONFIG) — optional:**
1. If you will allow the CD workflow to deploy to a remote cloud cluster, add `KUBE_CONFIG`.
2. Click "New repository secret"
3. **Name:** `KUBE_CONFIG`
4. **Value:** Paste the base64 kubeconfig from Step 2
5. Click "Add secret"

**Status:**
```
✅ GHCR_TOKEN added
✅ KUBE_CONFIG optional (add only for cloud deployments)
```

## ✅ Verify Files Exist

Check that these files are in your repository:

```
.github/
├── workflows/
    ├── ci.yml              ✅ Tests & linting
    └── cd.yml              ✅ Build & deploy

.dockerignore              ✅ Optimize Docker builds
Dockerfile                 ✅ Multi-stage build
requirements-dev.txt       ✅ Dev dependencies
pytest.ini                 ✅ Test configuration
```

**Status:**
```
✅ All workflow files in place
```

## ✅ Commit and Push

**Push the workflow files to GitHub:**

```bash
# Stage files
git add .github/ Dockerfile .dockerignore requirements-dev.txt pytest.ini

# Commit
git commit -m "ci: add GitHub Actions CI/CD pipeline"

# Push to main
git push origin main
```

**Status:**
```
✅ Workflow files pushed to GitHub
```

## ✅ Verify CI/CD Works

### Monitor CI Workflow

1. Go to your repository on GitHub
2. Click **Actions** tab
3. Select **CI - Tests & Code Quality** (left sidebar)
4. You should see a workflow run in progress
5. Wait for all checks to pass (green ✅)

**Expected status:**
```
✅ Lint with Black
✅ Lint with Flake8
✅ Import sorting with isort
✅ Type checking with mypy
✅ Run tests with coverage
✅ Upload coverage reports
```

**If any fail:**
- Click the failed step to see error
- Fix locally: `black app/`, `isort app/`, `pytest`
- Commit and push again

### Monitor CD Workflow

Once CI passes, CD should automatically start (build & push image):

1. Refresh Actions tab
2. Select **CD - Build, Push & Deploy** (left sidebar)
3. You should see **build-and-push** job running

**Expected status:**
```
✅ Generate version
✅ Set up Docker Buildx
✅ Log in to Container Registry
✅ Extract metadata
✅ Build and push Docker image
```

**If any fail:**
- Check the failed step for error message
- Common issues:
  - GHCR_TOKEN invalid → Regenerate and update secret
  - (Optional) KUBE_CONFIG invalid → Re-export and update secret if you added it

### Verify Image in GHCR

1. Go to your repository on GitHub
2. Click **Packages** (right sidebar)
3. You should see `url-shortener` image
4. Click to view versions: `main-20260515-abc1234`, `sha-abc1234`, etc.


### Verify Kubernetes Deployment

```bash
# Check deployment updated
kubectl get deployment api -n url-shortener

# Check pod status
kubectl get pods -n url-shortener

```

**Status:**
```
✅ Kubernetes deployment updated
✅ All pods running and ready
```

## ✅ Test the Full Pipeline

Make a test change and push:

```bash
# Create test branch
git checkout -b test/ci-cd

# Make a small change
echo "# Testing CI/CD" >> README.md

# Commit
git add README.md
git commit -m "test: verify CI/CD pipeline"

# Push
git push origin test/ci-cd
```

**What should happen:**
1. GitHub shows "Create Pull Request" button
2. Click it and create PR to `main`
3. GitHub Actions automatically runs CI
4. Wait for all checks to pass (green ✅)
5. CI results show up as status check on PR
6. You can now merge to main

**If you merge to main:**
1. GitHub Actions CI runs (should be quick, cache hit)
2. Once CI passes, CD runs immediately
3. Docker builds and pushes (takes ~1-2 min)
4. Kubernetes deployment updates
5. Health check verifies deployment

**Status:**
```
✅ CI runs on PR
✅ CD runs on merge to main
✅ Kubernetes updates automatically
✅ Pipeline working end-to-end
```

## ✅ Cleanup Test Branch

```bash
# Delete test branch locally
git branch -d test/ci-cd

# Delete on GitHub
git push origin --delete test/ci-cd
```

## ✅ Configure IDE (Optional)

### VS Code Setup

Install extensions for linting/formatting (runs before GitHub Actions):

```bash
# From terminal
pip install -r requirements-dev.txt
```

Add to `.vscode/settings.json`:
```json
{
  "[python]": {
    "editor.defaultFormatter": "ms-python.python",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.organizeImports": "explicit"
    }
  },
  "python.formatting.provider": "black",
  "python.linting.enabled": true,
  "python.linting.flake8Enabled": true,
  "python.linting.flake8Args": [
    "--max-line-length=88"
  ]
}
```

### Pre-commit Hook (Automatic Linting)

```bash
# Install pre-commit
pip install pre-commit

# Install hook
pre-commit install

# Test it
pre-commit run --all-files
```

## ✅ Production Deployment

Once everything works, you can deploy with confidence:

### Standard Deployment

```bash
# Regular feature
git push origin feature/my-feature
# → CI runs
# → PR created
# → Merge to main
# → CD runs
# → Deployed to production
```

### Release Deployment

```bash
# Tag release
git tag v1.2.3
git push origin v1.2.3

# CD runs with semantic version
# → Image tagged: ghcr.io/owner/repo:v1.2.3
# → Deployed to production
# → Can rollback: kubectl rollout undo deployment/api
```

## ✅ Daily Operations

### Review Workflow Status

Every morning, check:
```bash
# Go to GitHub → Actions tab
# Verify last workflow was successful
# Check for any failures or warnings
```

### Monitor Deployment

```bash
# Check current deployment
kubectl get deployment api -n url-shortener

# View recent deployments
kubectl rollout history deployment/api -n url-shortener

# Check pod health
kubectl get pods -n url-shortener
```

### Rollback if Needed

```bash
# If something goes wrong
kubectl rollout undo deployment/api -n url-shortener

# Verify rollback
kubectl rollout status deployment/api -n url-shortener
kubectl get pods -n url-shortener
```

## ✅ Troubleshooting

| Problem | Solution |
|---------|----------|
| CI tests failing | Run locally: `pytest` |
| Code formatting failing | Run: `black app/ && isort app/` |
| GHCR_TOKEN error | Generate new token at https://github.com/settings/tokens |
| KUBE_CONFIG error | Re-export: `cat ~/.kube/config \| base64` |
| Kubernetes won't deploy | Check: `kubectl get pods -n url-shortener` |
| Image not in GHCR | Check CD workflow logs, see "Build and push" step |

## ✅ Performance Tuning

### Speed Up Builds

**GitHub Actions already caches:**
- ✅ Docker layers (previous builds)
- ✅ Python packages (via `cache: 'pip'`)
- ✅ Workflow artifacts

**Optimize further:**
- Use `requirements-dev.txt` (smaller than full install)
- Leverage `.dockerignore` (skip unnecessary files)
- Multi-stage Dockerfile (smaller final image)

### Current Performance

- **CI:** ~2-3 minutes (tests, linting)
- **CD:** ~4-5 minutes (build, push, deploy)
- **Total:** ~6-8 minutes from push to production

## ✅ Security Review

Double-check:

- [ ] GHCR_TOKEN secret is present
- [ ] KUBE_CONFIG secret is present
- [ ] No secrets in code or `.env` files
- [ ] `.gitignore` excludes `.env`
- [ ] Token has minimal required permissions
- [ ] Kubeconfig is base64 encoded

## ✅ Documentation

Keep these files handy:

- **CICD.md** — Detailed setup guide
- **DEVELOPER.md** — Local development workflow
- **CI-CD-QUICKREF.md** — Quick visual reference
- **CI-CD-IMPLEMENTATION.md** — Summary and overview

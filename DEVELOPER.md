# Developer Setup Guide

Quick start for local development with code quality checks and testing.

## Prerequisites

- Python 3.11+
- Docker & Docker Compose (for local stack)
- Kubernetes cluster (for K8s testing)
- Git

## 1. Clone & Setup

```bash
# Clone repository
git clone <your-repo>
cd distributed-URL-Shortener

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements-dev.txt
```

## 2. Pre-commit Hooks (Optional but Recommended)

Automatically run linting before commits:

```bash
# Install pre-commit
pip install pre-commit

# Create .pre-commit-config.yaml
cat > .pre-commit-config.yaml << 'EOF'
repos:
  - repo: https://github.com/psf/black
    rev: 23.7.0
    hooks:
      - id: black

  - repo: https://github.com/PyCQA/flake8
    rev: 6.0.0
    hooks:
      - id: flake8

  - repo: https://github.com/PyCQA/isort
    rev: 5.12.0
    hooks:
      - id: isort
        args: ["--profile", "black"]

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.4.1
    hooks:
      - id: mypy
        args: ["--ignore-missing-imports"]
EOF

# Install git hooks
pre-commit install

# Test manually
pre-commit run --all-files
```

## 3. Local Development Workflow

### Start the Stack

```bash
# Start all services (PostgreSQL, Redis, Kafka)
docker compose up -d

# Check status
docker compose ps

# Stop when done
docker compose down
```

### Run Tests

```bash
# All tests with coverage
pytest --cov=app --cov-report=html

# Specific test file
pytest tests/test_api.py -v

# Run with markers
pytest -m unit  # Only unit tests
pytest -m integration  # Only integration tests
```

### Code Quality Checks

```bash
# Format code with Black
black app/

# Check imports
isort app/

# Lint with Flake8
flake8 app/ --count --select=E9,F63,F7,F82 --show-source

# Type check
mypy app/ --ignore-missing-imports
```

### Quick Validation

Run all checks before committing:

```bash
# One command to rule them all
black app/ && isort app/ && flake8 app/ && mypy app/ --ignore-missing-imports && pytest
```

## 4. Git Workflow

### Create Feature Branch

```bash
# Create and switch to new branch
git checkout -b feature/improve-cache

# Make changes, commit regularly
git add app/cache/redis_client.py
git commit -m "add TTL configuration for cache entries"

# Push branch
git push origin feature/improve-cache
```

### Create Pull Request

1. Push branch to GitHub
2. GitHub will show "Create Pull Request" button
3. Fill in description
4. GitHub Actions will automatically:
   - Run tests
   - Check code quality
   - Run linting
5. Fix any issues locally, commit, and push
6. Once all checks pass, reviewer approves
7. Merge to `master` / `main`

### Merge to Main

Once PR is approved:

```bash
# Update local main
git checkout main
git pull origin main

# Verify tests still pass
pytest

# Your changes are now in main!
# GitHub Actions will build and push a Docker image to GHCR.
# To deploy to Kubernetes you can:
# - Run the local deploy script: `./k8s/deploy-simple.sh` (for Docker Desktop/minikube), or
# - Add a cloud kubeconfig (`KUBE_CONFIG`) and enable remote deployment in the CD workflow.
```

## 5. Kubernetes Development

### Build and Test Locally

```bash
# Build Docker image
docker build -t url-shortener:local .

# Test image locally
docker run -e DB_URL=postgresql://... url-shortener:local

# Load into Docker Desktop K8s
docker tag url-shortener:local url-shortener:latest
# Image is now available in K8s as url-shortener:latest (IfNotPresent)
```

### Deploy to K8s

```bash
# Deploy to local Kubernetes
cd k8s
./deploy-simple.sh

# Verify deployment
kubectl get pods -n url-shortener
kubectl get svc -n url-shortener

# Access API
kubectl port-forward svc/api 8000:8000 -n url-shortener
curl http://localhost:8000/health/redis

# Check logs
kubectl logs -f deployment/api -n url-shortener
```

### Cleanup

```bash
# Remove namespace (clears all resources)
kubectl delete namespace url-shortener

# Or selective cleanup
kubectl delete deployment api -n url-shortener
kubectl delete pod -l app=api -n url-shortener
```

## 6. Debugging

### Inspect Container Logs

```bash
# Real-time API logs
kubectl logs -f deployment/api -n url-shortener

# All output (including errors on startup)
kubectl logs deployment/api -n url-shortener --tail=100

# Logs from specific pod
kubectl logs api-xyz123-abc -n url-shortener
```

### Execute Commands in Container

```bash
# Get interactive shell
kubectl exec -it deployment/api -n url-shortener -- /bin/bash

# Run single command
kubectl exec deployment/api -n url-shortener -- curl http://localhost:8000/health/redis

# Check environment variables
kubectl exec deployment/api -n url-shortener -- env | grep DB_
```

### Inspect Resources

```bash
# Get full resource details
kubectl describe pod <pod-name> -n url-shortener
kubectl describe deployment api -n url-shortener

# Get YAML manifest
kubectl get deployment api -n url-shortener -o yaml

# Watch changes in real-time
kubectl get pods -n url-shortener -w
```

### Check Network Connectivity

```bash
# From API pod, test database connectivity
kubectl exec deployment/api -n url-shortener -- nc -zv postgres.url-shortener.svc.cluster.local 5432

# From API pod, test Redis
kubectl exec deployment/api -n url-shortener -- redis-cli -h redis.url-shortener.svc.cluster.local ping
```

## 7. Common Issues

### Tests Failing Locally

```bash
# Clear pytest cache
rm -rf .pytest_cache/ __pycache__ .coverage htmlcov/

# Reinstall dependencies
pip install --upgrade -r requirements-dev.txt

# Run with verbose output
pytest -vv --tb=short
```

### Import Errors in Tests

```bash
# Ensure current directory is in PYTHONPATH
export PYTHONPATH=$PYTHONPATH:.

# Or use pytest from project root
pytest
```

### Docker Build Fails

```bash
# Clear Docker cache
docker system prune -a

# Rebuild without cache
docker build --no-cache -t url-shortener:local .

# Check Dockerfile syntax
docker run --rm -i hadolint/hadolint < Dockerfile
```

### Kubernetes Deployment Stuck

```bash
# Check pod events
kubectl describe pod <pod-name> -n url-shortener

# Check resource usage
kubectl top pods -n url-shortener
kubectl top nodes

# Check PVC status
kubectl get pvc -n url-shortener

# Delete stuck pod (will be recreated)
kubectl delete pod <pod-name> -n url-shortener
```

## 8. Code Style Guide

### Python Conventions

- **Line length**: 88 characters (Black default)
- **Imports**: Organized with isort
  - Standard library
  - Third-party libraries
  - Local imports
- **Type hints**: Use `mypy` annotations where practical
- **Docstrings**


### Commit Message Format

```
<type>: <subject>

<body>

<footer>
```

Types:
- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation only
- `style` — Code style (formatting)
- `refactor` — Code refactoring
- `perf` — Performance improvement
- `test` — Adding/updating tests
- `ci` — CI/CD changes

Examples:
```
feat: add cache ttl configuration

Allows configurable TTL for URL cache entries instead of hardcoded 1 hour.
Improves cache hit ratio on high-traffic sites.

Closes #25
```

```
fix: handle redis connection timeout gracefully

Wrap redis client calls with timeout and fallback to database query.
Prevents hanging requests when Redis is slow.
```

## 9. Performance Profiling

### Profile Slow Requests

```bash
# Add to FastAPI middleware
from fastapi import FastAPI
from time import time

app = FastAPI()

@app.middleware("http")
async def add_process_time_header(request, call_next):
    start_time = time()
    response = await call_next(request)
    process_time = time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    if process_time > 0.5:
        logger.warning(f"Slow request: {request.url.path} took {process_time}s")
    return response
```

### View Prometheus Metrics Locally

```bash
# Port forward Prometheus
kubectl port-forward svc/prometheus 9090:9090 -n url-shortener

# Visit http://localhost:9090
# Query examples:
# - rate(http_requests_total[1m])  — Throughput
# - histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))  — P95 latency
```

## 10. Useful Commands Reference

```bash
# Development
source .venv/bin/activate           # Activate virtual env
pip install -r requirements-dev.txt # Install dev deps
pytest                              # Run tests
black app/                          # Format code
isort app/                          # Sort imports
flake8 app/                         # Lint
mypy app/ --ignore-missing-imports  # Type check

# Docker
docker compose up -d                # Start stack
docker compose down                 # Stop stack
docker build -t url-shortener .     # Build image
docker run -e VAR=value image:tag   # Run container

# Kubernetes
kubectl get pods -n url-shortener           # List pods
kubectl logs -f deployment/api -n url-shortener  # Watch logs
kubectl exec -it pod/name -n url-shortener -- /bin/bash  # Shell
kubectl port-forward svc/api 8000:8000 -n url-shortener  # Port forward

# Git
git checkout -b feature/name        # Create branch
git commit -m "type: message"       # Commit
git push origin feature/name        # Push branch
git pull origin main                # Update local
```

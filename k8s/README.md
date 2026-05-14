# Kubernetes Deployment for URL Shortener

This directory contains all Kubernetes manifests to deploy the URL Shortener application in a cloud-native architecture.

## Architecture Overview

```
Internet
   ↓
Ingress Controller
   ↓
┌─────────────────────────────────┐
│ FastAPI API (2 replicas, HPA)   │ ← Scales 2-5 replicas
│ Health checks (/health/redis)   │
│ Prometheus metrics (/metrics)   │
└─────────────────────────────────┘
   ↓
┌──────────────────────────────────────────────┐
│  Data & Message Layer                        │
├──────────────────────────────────────────────┤
│ PostgreSQL (StatefulSet)                     │
│ Redis (StatefulSet)                          │
│ Kafka + Zookeeper (StatefulSet)              │
│ Prometheus (Monitoring)                      │
│ Grafana (Observability)                      │
└──────────────────────────────────────────────┘
   ↓
┌─────────────────────────────────┐
│ Analytics Worker (1 replica)    │
│ Consumes from Kafka topic       │
│ Writes to PostgreSQL            │
└─────────────────────────────────┘
```

## File Organization

```
k8s/
├── 0-namespace.yaml              # Create url-shortener namespace
├── 1-configmap.yaml              # Non-sensitive configuration
├── 2-secrets.yaml                # Sensitive data (DB creds, etc)
├── 3-persistent-volumes.yaml     # PersistentVolumeClaims
├── 4-db-migrate-job.yaml         # Database initialization
├── 5-ingress.yaml                # Ingress controller rules
├── 6-hpa.yaml                    # Horizontal Pod Autoscaler
├── api/
│   └── deployment.yaml           # API deployment + service
├── worker/
│   └── deployment.yaml           # Analytics worker
├── postgres/
│   └── statefulset.yaml          # PostgreSQL database
├── redis/
│   └── statefulset.yaml          # Redis cache
├── kafka/
│   ├── zookeeper.yaml            # Zookeeper coordinator
│   └── kafka.yaml                # Kafka message broker
├── prometheus/
│   └── deployment.yaml           # Prometheus monitoring
├── grafana/
│   └── deployment.yaml           # Grafana dashboards
├── deploy.sh                     # Deployment script
└── README.md                     # This file
```

## Prerequisites

1. **Kubernetes cluster** running (Docker Desktop K8s, minikube, etc.)
   ```bash
   kubectl cluster-info
   kubectl get nodes
   ```

2. **Docker image built and available**
   ```bash
   docker build -t localhost:5000/url-shortener:latest .
   # For Docker Desktop, this is accessible within pods
   ```

3. **kubectl** configured to access your cluster
   ```bash
   kubectl config current-context
   ```

## Quick Start

### Option A: Automated Deployment (Recommended)

```bash
chmod +x k8s/deploy.sh
./k8s/deploy.sh
```

This script:
- Creates namespace and configuration
- Deploys databases in dependency order
- Waits for each component to be ready
- Runs migrations
- Deploys API, Worker, and monitoring
- Sets up Ingress and HPA

### Option B: Manual Deployment

```bash
# 1. Create namespace and configuration
kubectl apply -f k8s/0-namespace.yaml
kubectl apply -f k8s/1-configmap.yaml
kubectl apply -f k8s/2-secrets.yaml
kubectl apply -f k8s/3-persistent-volumes.yaml

# 2. Deploy data layer (in order)
kubectl apply -f k8s/postgres/statefulset.yaml
kubectl wait --for=condition=ready pod -l app=postgres -n url-shortener --timeout=120s

kubectl apply -f k8s/redis/statefulset.yaml
kubectl wait --for=condition=ready pod -l app=redis -n url-shortener --timeout=60s

kubectl apply -f k8s/kafka/zookeeper.yaml
kubectl wait --for=condition=ready pod -l app=zookeeper -n url-shortener --timeout=120s

kubectl apply -f k8s/kafka/kafka.yaml
kubectl wait --for=condition=ready pod -l app=kafka -n url-shortener --timeout=120s

# 3. Run migrations
kubectl apply -f k8s/4-db-migrate-job.yaml
kubectl wait --for=condition=complete job/db-migrate -n url-shortener --timeout=120s

# 4. Deploy application layer
kubectl apply -f k8s/api/deployment.yaml
kubectl apply -f k8s/worker/deployment.yaml

# 5. Deploy observability
kubectl apply -f k8s/prometheus/deployment.yaml
kubectl apply -f k8s/grafana/deployment.yaml

# 6. Enable scaling and networking
kubectl apply -f k8s/5-ingress.yaml
kubectl apply -f k8s/6-hpa.yaml
```

## Accessing Services

### Using Port Forwarding (Simple)

```bash
# API
kubectl port-forward svc/api 8000:8000 -n url-shortener
# Visit: http://localhost:8000/docs

# Grafana (admin/admin_password_k8s)
kubectl port-forward svc/grafana 3000:3000 -n url-shortener
# Visit: http://localhost:3000

# Prometheus
kubectl port-forward svc/prometheus 9090:9090 -n url-shortener
# Visit: http://localhost:9090
```

### Using Ingress (Production-like)

Add to `/etc/hosts`:
```
127.0.0.1 api.local grafana.local prometheus.local
```

Then visit:
- http://api.local
- http://grafana.local (admin/admin_password_k8s)
- http://prometheus.local

**Note**: Ingress requires an ingress controller. Docker Desktop includes nginx-ingress by default.

## Configuration & Secrets

### Environment Variables (ConfigMap)

Edit `1-configmap.yaml` to change:
- Database host/port/name
- Redis configuration
- Kafka bootstrap servers
- API port and log level

Apply changes:
```bash
kubectl apply -f k8s/1-configmap.yaml
kubectl rollout restart deployment/api -n url-shortener
```

### Sensitive Data (Secrets)

Edit `2-secrets.yaml` to change:
- Database password
- Redis password (optional)
- Grafana admin credentials
- Sentry DSN (optional)

```bash
kubectl apply -f k8s/2-secrets.yaml
kubectl rollout restart deployment/api -n url-shortener
```

**Security**: For production, use Sealed Secrets or HashiCorp Vault instead of plain text YAML.

## Monitoring & Observability

### Prometheus

Scrapes metrics from:
- API `/metrics` endpoint every 15 seconds
- Kubernetes API server
- All pods with `prometheus.io/scrape: "true"` annotation

View targets: http://localhost:9090/targets

### Grafana

Pre-configured with:
- **Datasource**: Prometheus (auto-provisioned)
- **Dashboard**: URL Shortener Production Observability (8 panels)

Metrics tracked:
- Request throughput (req/sec)
- P95/P99 latency (ms)
- Cache hit ratio (%)
- Error rate (5xx errors/sec)
- Kafka events processed (per min)
- URL shorten latency distribution

### Available Metrics

```
# HTTP metrics (auto-instrumented)
http_requests_total
http_request_duration_seconds
http_requests_in_progress

# Custom metrics
redirect_requests_total
cache_hits_total
cache_misses_total
analytics_events_processed_total
shorten_request_duration_seconds
```

## Health Checks

Every service has probes configured:

### API Health Checks
- **Liveness**: `/health/redis` - Pod restarted if unhealthy for 30s
- **Readiness**: `/health/redis` - Pod removed from load balancer if unhealthy for 10s
- **Startup**: `/health/redis` - Pod given 30 seconds to start

### Database Health Checks
- **PostgreSQL**: `pg_isready` command
- **Redis**: `redis-cli ping` command
- **Kafka**: Broker API version check

## Autoscaling (HPA)

API auto-scales based on:
- **CPU**: Scale up at 70% utilization
- **Memory**: Scale up at 80% utilization

Configuration:
- **Min replicas**: 2
- **Max replicas**: 5
- **Scale down**: 50% per 15 seconds (with 5 min stabilization)
- **Scale up**: 100% per 15 seconds (up to 1 new pod)

Check HPA status:
```bash
kubectl get hpa -n url-shortener
kubectl describe hpa api-hpa -n url-shortener
```

## Resource Limits

Each component has requests and limits:

```
API:
  Request: 256Mi memory, 250m CPU
  Limit:   512Mi memory, 500m CPU

Worker:
  Request: 256Mi memory, 250m CPU
  Limit:   512Mi memory, 500m CPU

PostgreSQL:
  Request: 256Mi memory, 250m CPU
  Limit:   512Mi memory, 500m CPU

Redis:
  Request: 128Mi memory, 100m CPU
  Limit:   256Mi memory, 200m CPU

Prometheus:
  Request: 256Mi memory, 250m CPU
  Limit:   512Mi memory, 500m CPU

Grafana:
  Request: 256Mi memory, 250m CPU
  Limit:   512Mi memory, 500m CPU
```

## Troubleshooting

### Check pod status
```bash
kubectl get pods -n url-shortener
kubectl describe pod <pod-name> -n url-shortener
```

### View logs
```bash
# API logs
kubectl logs -f deployment/api -n url-shortener

# Worker logs
kubectl logs -f deployment/worker -n url-shortener

# PostgreSQL logs
kubectl logs -f statefulset/postgres -n url-shortener

# Kafka logs
kubectl logs -f statefulset/kafka -n url-shortener
```

### Check service connectivity
```bash
# Get shell in a pod
kubectl exec -it deployment/api -n url-shortener -- /bin/sh

# Test database connection
nc -zv postgres.url-shortener.svc.cluster.local 5432

# Test Redis connection
redis-cli -h redis.url-shortener.svc.cluster.local ping

# Test Kafka connection
nc -zv kafka.url-shortener.svc.cluster.local 9092
```

### View cluster resources
```bash
kubectl get nodes
kubectl top nodes
kubectl top pods -n url-shortener
```

### Delete everything and start fresh
```bash
kubectl delete namespace url-shortener
# Then run deploy.sh again
```

## Production Considerations

1. **Persistent Data**: Replace `emptyDir` volumes with proper storage classes
2. **Secrets Management**: Use Sealed Secrets, HashiCorp Vault, or cloud provider secret management
3. **Ingress Controller**: Install NGINX Ingress Controller or use cloud provider's load balancer
4. **SSL/TLS**: Add cert-manager and certificate resources for HTTPS
5. **Logging**: Add ELK stack or cloud provider's logging solution
6. **Backups**: Configure regular PostgreSQL backups
7. **Network Policies**: Restrict traffic between pods
8. **Pod Disruption Budgets**: Ensure availability during cluster upgrades
9. **Resource Quotas**: Enforce namespace resource limits
10. **RBAC**: Create service accounts and role bindings with minimal permissions

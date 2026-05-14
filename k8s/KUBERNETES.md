# Kubernetes Deployment - Quick Start Guide

## Deployment Complete

Your distributed URL shortener is now running on Kubernetes!

### Verify Deployment Status

```bash
kubectl get pods -n url-shortener
kubectl get services -n url-shortener
```

Expected output:
- **Pods**: api (2 replicas), worker (1), postgres-0, redis-0, prometheus-0, grafana-0, db-migrate (completed)
- **Services**: api, worker (internal), postgres, redis, prometheus, grafana

### Access Services via Port Forwarding

#### 1. FastAPI Application (Port 8000)

```bash
kubectl port-forward svc/api 8000:8000 -n url-shortener
```

Access:
- **API Documentation**: http://localhost:8000/docs
- **API Root**: http://localhost:8000
- **Health Check**: http://localhost:8000/health/redis
- **Metrics**: http://localhost:8000/metrics

Test creating a short URL:
```bash
curl -X POST http://localhost:8000/shorten \
  -H "Content-Type: application/json" \
  -d '{"long_url":"https://www.example.com/very/long/url"}'
```

#### 2. Grafana Dashboards (Port 3000)

```bash
kubectl port-forward svc/grafana 3000:3000 -n url-shortener
```

Access: http://localhost:3000
- **Username**: admin
- **Password**: admin_password_k8s

Pre-configured dashboard: "URL Shortener - Production Observability"
- 8 panels showing real-time metrics
- Auto-refreshes every 10 seconds

#### 3. Prometheus Metrics (Port 9090)

```bash
kubectl port-forward svc/prometheus 9090:9090 -n url-shortener
```

Access: http://localhost:9090

Query examples:
- `rate(http_requests_total[1m])` — Request throughput
- `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))` — P95 latency
- `cache_hits_total / (cache_hits_total + cache_misses_total)` — Cache hit ratio

## Architecture

```
Internet / Load Balancer
         ↓
Ingress (api.local, grafana.local, prometheus.local)
         ↓
┌─────────────────────────────────────────────────┐
│         Kubernetes Cluster                      │
├─────────────────────────────────────────────────┤
│  API Pods (2 replicas, HPA: 2-5)                │
│  Worker Pod (1 replica)                         │
│  Prometheus Pod (metrics)                       │
│  Grafana Pod (dashboards)                       │
├─────────────────────────────────────────────────┤
│  PostgreSQL StatefulSet (5Gi storage)           │
│  Redis StatefulSet (2Gi storage)                │
│  (Kafka/Zookeeper - optional, not deployed)     │
└─────────────────────────────────────────────────┘
```

## Key Kubernetes Features Demonstrated

### 1. Namespaces
Isolation: All resources in `url-shortener` namespace

### 2. ConfigMaps
Non-sensitive configuration:
```bash
kubectl get configmap url-shortener-config -n url-shortener -o yaml
```

### 3. Secrets
Sensitive data (DB credentials, admin passwords):
```bash
kubectl get secret url-shortener-secrets -n url-shortener -o yaml
```

### 4. StatefulSets
Databases with stable identities:
- `postgres-0` — PostgreSQL with persistent storage
- `redis-0` — Redis with persistent storage

### 5. Deployments
Horizontally scalable applications:
- `api` — 2 replicas with RollingUpdate strategy
- `worker` — 1 replica for analytics processing

### 6. Services
Internal DNS-based networking:
- `postgres.url-shortener.svc.cluster.local:5432`
- `redis.url-shortener.svc.cluster.local:6379`
- `api.url-shortener.svc.cluster.local:8000`

### 7. Health Probes
Reliability and automatic recovery:
- **Liveness Probe**: Restarts unhealthy pods
- **Readiness Probe**: Removes pods from service if unhealthy
- **Startup Probe**: Gives pods time to initialize

### 8. Resource Limits & Requests
Prevent resource starvation:
```yaml
requests:
  memory: 256Mi
  cpu: 250m
limits:
  memory: 512Mi
  cpu: 500m
```

### 9. Horizontal Pod Autoscaler (HPA)
Auto-scaling API based on metrics:
```bash
kubectl get hpa -n url-shortener
kubectl describe hpa api-hpa -n url-shortener
```

Scaling policy:
- **Min replicas**: 2
- **Max replicas**: 5
- **Scale-up**: 100% per 15 seconds
- **Scale-down**: 50% per 15 seconds (5 min stabilization)
- **Triggers**: CPU 70%, Memory 80%

Test autoscaling:
```bash
# Generate load
for i in {1..100}; do curl http://localhost:8000/c &>/dev/null & done

# Watch HPA
kubectl get hpa -n url-shortener -w
```

### 10. PersistentVolumes (PV) & PersistentVolumeClaims (PVC)
Durable storage:
```bash
kubectl get pvc -n url-shortener
kubectl get pv
```

Storage classes:
- `hostpath` — Local storage (for Docker Desktop K8s)
- Production: Use cloud provider storage (EBS, GCP, Azure)

### 11. Jobs
One-time tasks:
```bash
kubectl get jobs -n url-shortener
kubectl logs job/db-migrate -n url-shortener
```

Database migration runs before API/Worker start.

### 12. Ingress
External traffic routing:
```bash
kubectl get ingress -n url-shortener
```

Configure `/etc/hosts`:
```
127.0.0.1 api.local grafana.local prometheus.local
```

Then access:
- http://api.local — API
- http://grafana.local — Grafana (admin/admin_password_k8s)
- http://prometheus.local — Prometheus

### 13. RBAC (Role-Based Access Control)
Least-privilege permissions for Prometheus:
```bash
kubectl get clusterrole prometheus
kubectl get clusterrolebinding prometheus
```

## Monitoring & Observability

### Prometheus Scraping

Auto-discovery of metrics:
- API `/metrics` endpoint
- Kubernetes API server
- All pods with `prometheus.io/scrape: "true"` annotation

Check targets:
```bash
kubectl port-forward svc/prometheus 9090:9090 -n url-shortener
# Visit http://localhost:9090/targets
```

### Grafana Dashboards

Pre-configured panels:
1. **Request Throughput** — HTTP requests/sec
2. **P95 Latency** — Response time distribution
3. **Cache Hit Ratio** — Redis effectiveness
4. **Redirect Requests** — Short URL redirects/min
5. **Error Rate** — 5xx errors/sec
6. **Kafka Events** — Analytics events processed/min
7. **URL Shorten Latency** — Write-path P95/P99
8. **Cache Operations** — Hits and misses/min

### Custom Metrics

- `http_requests_total` — HTTP request count
- `http_request_duration_seconds` — HTTP request latency
- `cache_hits_total` — Redis cache hits
- `cache_misses_total` — Redis cache misses
- `redirect_requests_total` — Redirect count
- `shorten_request_duration_seconds` — Shorten API latency
- `analytics_events_processed_total` — Worker throughput

## Logs & Debugging

### View Logs

```bash
# API logs
kubectl logs -f deployment/api -n url-shortener

# Worker logs
kubectl logs -f deployment/worker -n url-shortener

# Postgres logs
kubectl logs -f statefulset/postgres -n url-shortener

# Grafana logs
kubectl logs -f deployment/grafana -n url-shortener

# Prometheus logs
kubectl logs -f deployment/prometheus -n url-shortener
```

### Describe Resources

```bash
# Describe a pod
kubectl describe pod <pod-name> -n url-shortener

# Describe a deployment
kubectl describe deployment api -n url-shortener

# Describe a service
kubectl describe svc api -n url-shortener
```

### Execute Commands in Pod

```bash
# Get shell in API pod
kubectl exec -it deployment/api -n url-shortener -- /bin/bash

# Test database connectivity from API pod
kubectl exec -it deployment/api -n url-shortener -- nc -zv postgres.url-shortener.svc.cluster.local 5432

# Check Redis connectivity
kubectl exec -it deployment/api -n url-shortener -- redis-cli -h redis.url-shortener.svc.cluster.local ping
```

## Production Considerations

### Security
- [ ] Use cloud provider secrets management (AWS Secrets Manager, GCP Secret Manager)
- [ ] Implement Network Policies to restrict traffic between pods
- [ ] Use RBAC with minimal permissions
- [ ] Enable Pod Security Policies/Standards
- [ ] Use TLS for all communications

### High Availability
- [ ] Replicate PostgreSQL across multiple nodes
- [ ] Set up Redis with sentinel/cluster mode
- [ ] Configure Pod Disruption Budgets (PDB)
- [ ] Use multiple availability zones/regions
- [ ] Implement load balancing across zones

### Storage
- [ ] Use cloud provider block storage (EBS, GCP Persistent Disk)
- [ ] Implement automated backups
- [ ] Enable encryption at rest
- [ ] Configure storage snapshots for disaster recovery

### Monitoring & Logging
- [ ] Deploy ELK stack or cloud logging (CloudWatch, Stackdriver)
- [ ] Configure Prometheus alerting rules
- [ ] Set up Grafana alert notifications (Slack, PagerDuty)
- [ ] Implement distributed tracing (Jaeger, Zipkin)
- [ ] Configure log aggregation and parsing

### Cost Optimization
- [ ] Use spot instances for non-critical workloads
- [ ] Right-size resource requests/limits
- [ ] Enable cluster autoscaling
- [ ] Use resource quotas per namespace
- [ ] Monitor and optimize cloud spending

### Updates & Deployment
- [ ] Implement GitOps workflow (ArgoCD, Flux)
- [ ] Use rolling updates for zero-downtime deployments
- [ ] Implement canary and blue-green deployments
- [ ] Automate testing and validation
- [ ] Create disaster recovery procedures

## Cleanup

### Delete Everything

```bash
kubectl delete namespace url-shortener
```

This will:
- Delete all pods, deployments, statefulsets
- Remove all services and ingress
- Delete all configmaps and secrets
- Release all persistent volume claims

### Selective Cleanup

```bash
# Delete specific deployment
kubectl delete deployment api -n url-shortener

# Delete specific service
kubectl delete svc api -n url-shortener

# Delete persistent volume claim
kubectl delete pvc postgres-storage -n url-shortener
```

## Troubleshooting

### Pod Stuck in Pending

```bash
kubectl describe pod <pod-name> -n url-shortener
# Check: PVC not bound, storage class not found, node selector mismatch
```

### Pod Crashing (CrashLoopBackOff)

```bash
kubectl logs <pod-name> -n url-shortener --tail=100
# Check: Application startup errors, missing environment variables
```

### Service Not Accessible

```bash
# Check endpoints
kubectl get endpoints <service-name> -n url-shortener

# Check pod readiness
kubectl get pods -n url-shortener | grep <pod-name>

# Port forward test
kubectl port-forward svc/<service-name> <local-port>:<svc-port> -n url-shortener
```

### Resource Quota Exceeded

```bash
kubectl describe quota -n url-shortener
kubectl describe resourcequota -n url-shortener
```

### HPA Not Scaling

```bash
# Check HPA status
kubectl get hpa -n url-shortener
kubectl describe hpa api-hpa -n url-shortener

# Check metrics availability
kubectl get --raw /apis/custom.metrics.k8s.io/v1beta1/namespaces/url-shortener/pods/*/http_requests_total
```

## Next Steps

1. **Deploy to Cloud Kubernetes** (EKS, GKE, AKS)
   - Update image registry to cloud provider
   - Configure cloud-specific storage classes
   - Use cloud provider secrets management
   - Set up load balancer (NLB, CLB)

2. **Implement CI/CD**
   - GitHub Actions or GitLab CI to build and push images
   - ArgoCD or Flux for GitOps deployment
   - Automated testing and validation

3. **Add Advanced Features**
   - Istio for service mesh
   - Keda for event-driven autoscaling
   - Velero for backup and disaster recovery
   - Sealed Secrets for secure secret management

4. **Optimize for Production**
   - Performance tuning
   - Cost optimization
   - Security hardening
   - Compliance and auditing

## Files Reference

```
k8s/
├── 0-namespace.yaml              # Namespace
├── 1-configmap.yaml              # Configuration
├── 2-secrets.yaml                # Secrets
├── 3-persistent-volumes.yaml     # Storage claims
├── 4-db-migrate-job.yaml         # DB migration
├── 5-ingress.yaml                # Ingress controller
├── 6-hpa.yaml                    # Autoscaling
├── api/deployment.yaml           # API deployment
├── worker/deployment.yaml        # Worker deployment
├── postgres/statefulset.yaml     # PostgreSQL database
├── redis/statefulset.yaml        # Redis cache
├── prometheus/deployment.yaml    # Prometheus monitoring
├── grafana/deployment.yaml       # Grafana dashboards
├── kafka/zookeeper.yaml          # Zookeeper (optional)
├── kafka/kafka.yaml              # Kafka (optional)
├── deploy.sh                     # Full deployment script
├── deploy-simple.sh              # Core-only deployment
└── README.md                     # Full documentation
```

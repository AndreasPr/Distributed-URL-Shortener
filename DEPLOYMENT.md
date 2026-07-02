# Deployment Guide: Local Docker Compose and Kubernetes

This project is designed to run on your computer using Docker Desktop and Kubernetes.

## Docker Compose

Run the full stack locally:

```bash
docker compose up --build
```

That starts:

- FastAPI API
- PostgreSQL
- Redis
- Kafka + Zookeeper
- Analytics worker
- Prometheus
- Grafana
- Jaeger

If you want to start it in the background:

```bash
docker compose up -d
```

Stop the stack with:

```bash
docker compose down
```

## Kubernetes on Your Computer

Use Docker Desktop Kubernetes or minikube.

1. Make sure your cluster is running and `kubectl` points to it.
2. Build the image locally so Kubernetes can pull it from your local Docker engine.
3. Deploy the full stack:

```bash
cd k8s
chmod +x deploy.sh
./deploy.sh
```

4. Port-forward the main services if you prefer browser access:

```bash
kubectl port-forward svc/api 8000:8000 -n url-shortener
kubectl port-forward svc/grafana 3000:3000 -n url-shortener
kubectl port-forward svc/prometheus 9090:9090 -n url-shortener
```

## Local Environment Variables

Use `.env.example` as the starting point. The local defaults are:

```bash
DATABASE_URL=postgresql://user:pass@localhost:5433/url_db
REDIS_URL=redis://localhost:6379/0
KAFKA_BOOTSTRAP_SERVERS=localhost:9094
```

For frontend development, also set:

```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

## Verification

After the stack is up, verify the main services:

```bash
curl http://localhost:8000/health | jq .
curl http://localhost:8000/health/redis | jq .
curl http://localhost:9090/-/ready
```

## Notes

- Kafka is part of the local stack and the analytics worker consumes from it.
- The redirect path publishes click events to Kafka; the worker writes them to PostgreSQL in batches.
- Prometheus and Grafana are included for local observability and dashboards.

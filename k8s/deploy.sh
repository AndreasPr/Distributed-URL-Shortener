#!/bin/bash
# Kubernetes Deployment Script for URL Shortener
# This script deploys all components to Kubernetes in the correct order

set -e  # Exit on any error

NAMESPACE="url-shortener"
IMAGE_NAME="url-shortener:latest"

echo "Starting Kubernetes deployment for URL Shortener..."
echo "Namespace: $NAMESPACE"
echo "Image: $IMAGE_NAME"
echo ""

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "kubectl not found. Please install kubectl and try again."
    exit 1
fi

# Check cluster connectivity
if ! kubectl cluster-info &> /dev/null; then
    echo "Cannot connect to Kubernetes cluster. Please ensure your cluster is running."
    exit 1
fi

echo "Kubernetes cluster is accessible"
echo ""

# Step 1: Create namespace
echo "Step 1: Creating namespace..."
kubectl apply -f k8s/0-namespace.yaml
sleep 2

# Step 2: Create ConfigMap
echo "Step 2: Creating ConfigMap..."
kubectl apply -f k8s/1-configmap.yaml
sleep 2

# Step 3: Create Secrets
echo "Step 3: Creating Secrets..."
kubectl apply -f k8s/2-secrets.yaml
sleep 2

# Step 4: Create PersistentVolumes
echo "Step 4: Creating PersistentVolumeClaims..."
kubectl apply -f k8s/3-persistent-volumes.yaml
sleep 2

# Step 5: Deploy PostgreSQL
echo "Step 5: Deploying PostgreSQL..."
kubectl apply -f k8s/postgres/statefulset.yaml
echo "   Waiting for PostgreSQL to be ready (this may take 30 seconds)..."
kubectl wait --for=condition=ready pod -l app=postgres -n $NAMESPACE --timeout=120s 2>/dev/null || echo "Timeout waiting for PostgreSQL (it may still be starting)"
sleep 5

# Step 6: Deploy Redis
echo "Step 6: Deploying Redis..."
kubectl apply -f k8s/redis/statefulset.yaml
echo "   Waiting for Redis to be ready..."
kubectl wait --for=condition=ready pod -l app=redis -n $NAMESPACE --timeout=60s 2>/dev/null || echo "Timeout waiting for Redis (it may still be starting)"
sleep 5

# Step 7: Deploy Kafka & Zookeeper
echo "Step 7: Deploying Zookeeper & Kafka..."
kubectl apply -f k8s/kafka/zookeeper.yaml
echo "   Waiting for Zookeeper to be ready..."
kubectl wait --for=condition=ready pod -l app=zookeeper -n $NAMESPACE --timeout=120s 2>/dev/null || echo "Timeout waiting for Zookeeper (it may still be starting)"
sleep 10

kubectl apply -f k8s/kafka/kafka.yaml
echo "   Waiting for Kafka to be ready..."
kubectl wait --for=condition=ready pod -l app=kafka -n $NAMESPACE --timeout=120s 2>/dev/null || echo "Timeout waiting for Kafka (it may still be starting)"
sleep 5

# Step 8: Run database migrations
echo "Step 8: Running database migrations..."
kubectl apply -f k8s/4-db-migrate-job.yaml
echo "   Waiting for migration job to complete..."
kubectl wait --for=condition=complete job/db-migrate -n $NAMESPACE --timeout=120s 2>/dev/null || echo "Migration job still running"
sleep 5

# Step 9: Deploy API
echo "Step 9: Deploying API..."
kubectl apply -f k8s/api/deployment.yaml
echo "   Waiting for API to be ready..."
kubectl wait --for=condition=available deployment/api -n $NAMESPACE --timeout=120s 2>/dev/null || echo "API still starting"
sleep 5

# Step 10: Deploy Worker
echo "Step 10: Deploying Analytics Worker..."
kubectl apply -f k8s/worker/deployment.yaml
sleep 5

# Step 11: Deploy Prometheus
echo "Step 11: Deploying Prometheus..."
kubectl apply -f k8s/prometheus/deployment.yaml
echo "   Waiting for Prometheus to be ready..."
kubectl wait --for=condition=available deployment/prometheus -n $NAMESPACE --timeout=60s 2>/dev/null || echo "Prometheus still starting"
sleep 5

# Step 12: Deploy Grafana
echo "Step 12: Deploying Grafana..."
kubectl apply -f k8s/grafana/deployment.yaml
echo "   Waiting for Grafana to be ready..."
kubectl wait --for=condition=available deployment/grafana -n $NAMESPACE --timeout=60s 2>/dev/null || echo "Grafana still starting"
sleep 5

# Step 13: Deploy Ingress
echo "Step 13: Creating Ingress..."
kubectl apply -f k8s/5-ingress.yaml
sleep 2

# Step 14: Deploy HPA
echo "Step 14: Setting up Horizontal Pod Autoscaler..."
kubectl apply -f k8s/6-hpa.yaml
sleep 2

echo ""
echo "Kubernetes deployment initiated!"
echo ""
echo "Checking pod status..."
kubectl get pods -n $NAMESPACE
echo ""
echo "   Access your services via port forwarding:"
echo ""
echo "   # API (FastAPI Docs)"
echo "   kubectl port-forward svc/api 8000:8000 -n $NAMESPACE"
echo "   # Then visit: http://localhost:8000/docs"
echo ""
echo "   # Grafana (admin/admin_password_k8s)"
echo "   kubectl port-forward svc/grafana 3000:3000 -n $NAMESPACE"
echo "   # Then visit: http://localhost:3000"
echo ""
echo "   # Prometheus"
echo "   kubectl port-forward svc/prometheus 9090:9090 -n $NAMESPACE"
echo "   # Then visit: http://localhost:9090"
echo ""
echo "   View service logs:"
echo "   kubectl logs -f deployment/api -n $NAMESPACE"
echo "   kubectl logs -f deployment/worker -n $NAMESPACE"
echo ""
echo "   All pods may take 30-60 seconds to start. Check status with:"
echo "   kubectl get pods -n $NAMESPACE -w"
echo ""

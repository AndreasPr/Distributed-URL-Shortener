#!/bin/bash
# Simplified Kubernetes Deployment Script for URL Shortener (Without Kafka)
# This focuses on core components for K8s demonstration

set -e

NAMESPACE="url-shortener"
IMAGE_NAME="url-shortener:latest"

echo "Simplified Kubernetes deployment (core components only)"
echo "Namespace: $NAMESPACE"
echo ""

# Check cluster
if ! kubectl cluster-info &> /dev/null; then
    echo "Cannot connect to Kubernetes cluster"
    exit 1
fi

echo "Kubernetes cluster is accessible"
echo ""

# Clean up old deployment if exists
echo "Cleaning up previous deployment (if any)..."
kubectl delete statefulset -n $NAMESPACE --all --ignore-not-found=true 2>/dev/null || true
kubectl delete deployment -n $NAMESPACE --all --ignore-not-found=true 2>/dev/null || true
sleep 3

# Core components
echo "Deploying core Kubernetes components..."
kubectl apply -f k8s/0-namespace.yaml
kubectl apply -f k8s/1-configmap.yaml
kubectl apply -f k8s/2-secrets.yaml
kubectl apply -f k8s/3-persistent-volumes.yaml
sleep 2

# Databases
echo "Deploying PostgreSQL..."
kubectl apply -f k8s/postgres/statefulset.yaml
echo "   Waiting for PostgreSQL (30s timeout)..."
kubectl wait --for=condition=ready pod -l app=postgres -n $NAMESPACE --timeout=30s 2>/dev/null || echo "PostgreSQL starting (may take longer)"
sleep 5

echo "Deploying Redis..."
kubectl apply -f k8s/redis/statefulset.yaml
echo "   Waiting for Redis (15s timeout)..."
kubectl wait --for=condition=ready pod -l app=redis -n $NAMESPACE --timeout=15s 2>/dev/null || echo "Redis starting"
sleep 3

# DB migration
echo "Running database migration..."
kubectl apply -f k8s/4-db-migrate-job.yaml
echo "   Waiting for migration to complete (30s timeout)..."
kubectl wait --for=condition=complete job/db-migrate -n $NAMESPACE --timeout=30s 2>/dev/null || echo "Migration still running"
sleep 3

# App components
echo "Deploying API..."
kubectl apply -f k8s/api/deployment.yaml
sleep 2

echo "Deploying Analytics Worker..."
kubectl apply -f k8s/worker/deployment.yaml
sleep 2

# Observability
echo "Deploying Prometheus..."
kubectl apply -f k8s/prometheus/deployment.yaml
sleep 2

echo "Deploying Grafana..."
kubectl apply -f k8s/grafana/deployment.yaml
sleep 2

# Networking & scaling
echo "Creating Ingress..."
kubectl apply -f k8s/5-ingress.yaml
sleep 1

echo "Setting up HPA..."
kubectl apply -f k8s/6-hpa.yaml
sleep 1

echo ""
echo "Deployment initiated!"
echo ""
echo "Pod status:"
kubectl get pods -n $NAMESPACE
echo ""
echo "Access services via port forwarding:"
echo ""
echo "   # API (http://localhost:8000/docs)"
echo "   kubectl port-forward svc/api 8000:8000 -n $NAMESPACE"
echo ""
echo "   # Grafana (http://localhost:3000, admin/admin_password_k8s)"
echo "   kubectl port-forward svc/grafana 3000:3000 -n $NAMESPACE"
echo ""
echo "   # Prometheus (http://localhost:9090)"
echo "   kubectl port-forward svc/prometheus 9090:9090 -n $NAMESPACE"
echo ""
echo "   Pods may take 30-60 seconds to start. Monitor with:"
echo "   kubectl get pods -n $NAMESPACE -w"
echo ""
echo "   View logs:"
echo "   kubectl logs -f deployment/api -n $NAMESPACE"
echo "   kubectl logs -f deployment/worker -n $NAMESPACE"
echo ""

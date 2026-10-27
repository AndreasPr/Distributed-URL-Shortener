# Kubernetes: local and CI deployments

The supported entry points are `k8s/overlays/local` and `k8s/overlays/ci`, sharing
`k8s/base`. Use the gated deployment script, not recursive `kubectl apply -f k8s`.
The [diagnosis](kubernetes-diagnosis.md) and [verification](kubernetes-verification.md)
distinguish reproduced failures from the historical baseline.

| Overlay | Broker | API replicas | Exposure / scaling |
| --- | --- | --- | --- |
| local | Kafka 8.3.0 KRaft; no ZooKeeper | 2 initially | nginx Ingress (`api.local`, `grafana.local`), HPA 2–5 |
| ci | Redis Streams; no Kafka/ZooKeeper | 1 | port-forward only; no Ingress/HPA; smaller CPU/memory requests |

Both include PostgreSQL, Redis, analytics/abuse workers (FakeProvider, no external
LLM), Alembic Job, Prometheus, Grafana, Jaeger, NetworkPolicies and PDBs. **Frontend
runs outside the cluster** with `cd frontend && npm ci && npm run dev`, browser API
URL `http://localhost:8000`, and API port-forward below. Its client key remains in
memory. There is no deployed frontend in either overlay.

## Tools and context

Install Docker Desktop, kubectl, kind and kubeconform (free tools). On macOS:

```sh
brew install kubectl kind kubeconform
kind create cluster --name shortener --image kindest/node:v1.37.0
export KUBE_CONTEXT=kind-shortener
kubectl --context "$KUBE_CONTEXT" get storageclass
```

For Docker Desktop Kubernetes use `KUBE_CONTEXT=docker-desktop`; for minikube use
its actual context and `minikube addons enable ingress` / `metrics-server`.
PVCs omit storageClassName and require a **default dynamically provisioning class**;
kind supplies `standard`. They are still node-local storage, not replicated disks.
Existing hostpath PVCs are immutable: migrate/backup existing data before replacing
claims or StatefulSets. Never delete an existing user's namespace to upgrade it.
The diagnosis reset only its newly created disposable namespace.

## Image and Secret setup

From the repository root, with a clean source commit:

```sh
SHA=$(git rev-parse HEAD)
bash scripts/set-k8s-image.sh "$SHA"
docker build -t "url-shortener:$SHA" .
kind load docker-image "url-shortener:$SHA" --name shortener
# For minikube instead: minikube image load "url-shortener:$SHA"
kubectl --context "$KUBE_CONTEXT" apply -f k8s/base/0-namespace.yaml
# Copy only if this file does not already exist, then edit placeholders locally:
test -f k8s/.env || cp k8s/.env.example k8s/.env
chmod 600 k8s/.env
kubectl --context "$KUBE_CONTEXT" create secret generic url-shortener-secrets \
  -n url-shortener --from-env-file=k8s/.env
```

Required keys: DB_USER, DB_PASSWORD, GRAFANA_ADMIN_USER, GRAFANA_ADMIN_PASSWORD.
Use URL-safe database credentials because DB_URL is assembled by environment
substitution (hex passwords are suitable). Do not apply secrets.example.yaml:
Kubernetes does not expand its placeholders. Do not overwrite existing volume
credentials. Images use full source SHA tags; CI builds and loads its own exact
checkout without registry credentials. Third-party versions are explicitly pinned.
The image-setting script changes the overlay files; review those changes normally.

## Validate and deploy

```sh
kubectl kustomize k8s/overlays/local > /tmp/shortener-local.yaml
kubectl kustomize k8s/overlays/ci > /tmp/shortener-ci.yaml
kubeconform -strict -summary -kubernetes-version 1.37.0 \
  /tmp/shortener-local.yaml /tmp/shortener-ci.yaml
bash k8s/deploy.sh ci  # or local, after installing its prerequisites
```

Schema validation and live kind verification both target Kubernetes 1.37.
Both overlays use stable API versions. The script requires explicit
KUBE_CONTEXT, uses `set -euo pipefail`, and applies a temporary sibling Kustomize
overlay with application replicas zero. It waits for stateful dependencies and
`alembic upgrade head` to finish before applying final application replicas. A
migration is initially suspended until dependency rollouts succeed, then starts its
180-second deadline. Every failed wait stops deployment and emits
pod/event/job diagnostics. Completed/failed migration Jobs are recreated; an active
Job causes refusal. Deployments must be serialized; this local script is not a
distributed deployment lock and deliberately introduces downtime during migration.
Changing overlays in place leaves resources omitted from the new overlay (kubectl
does not prune); use separate namespaces/clusters or deliberately remove obsolete
Kafka/Ingress/HPA resources. Never prune database PVCs automatically.

## Ingress and metrics-server

The local overlay requires an ingress controller with class `nginx` and namespace
`ingress-nginx` (policy selectors depend on this). Docker Desktop does not supply
one automatically; install a maintained controller compatible with that class and
your Kubernetes version. On minikube use its ingress addon. Map `api.local` and
`grafana.local` to the controller address. No cert-manager issuer or public TLS is
assumed. CI has no controller requirement. Browser CORS defaults to
`http://localhost:3000`; patch it to the exact frontend origin when changing it.

For a disposable kind cluster, install metrics-server separately:

```sh
kubectl --context "$KUBE_CONTEXT" apply -f \
  https://github.com/kubernetes-sigs/metrics-server/releases/download/v0.8.1/components.yaml
kubectl --context "$KUBE_CONTEXT" -n kube-system patch deployment metrics-server \
  --type=json -p='[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]'
kubectl --context "$KUBE_CONTEXT" -n kube-system rollout status deployment/metrics-server --timeout=120s
kubectl --context "$KUBE_CONTEXT" top pods -n url-shortener
kubectl --context "$KUBE_CONTEXT" get hpa -n url-shortener
```

The insecure flag is **only for local kubelet certificates**, not production.
See the [upstream requirements](https://github.com/kubernetes-sigs/metrics-server/blob/master/README.md).
The HPA uses CPU/memory requests, stabilizes scale-down for 300 seconds and caps
scale-up at one pod/minute. PDBs allow one voluntary disruption; a single worker
can still be interrupted and redelivered events rely on idempotency. API topology
spread is soft so a one-node local cluster can schedule both replicas.

## Access and smoke test

In separate terminals (with KUBECONFIG pointing at the intended cluster):

```sh
kubectl --context "$KUBE_CONTEXT" -n url-shortener port-forward svc/api 8000:8000
kubectl --context "$KUBE_CONTEXT" -n url-shortener port-forward svc/api-metrics 18002:8002
kubectl --context "$KUBE_CONTEXT" -n url-shortener port-forward svc/jaeger 16686:16686
kubectl --context "$KUBE_CONTEXT" -n url-shortener port-forward svc/grafana 3001:3000
```

Create a read/write key with `kubectl ... exec deployment/api -- python -m app.cli
keys create --name smoke --scopes read write`. Keep its output private. Export its
key as API_KEY without committing it, then run:

```sh
BASE_URL=http://localhost:8000 METRICS_URL=http://localhost:18002/metrics \
  bash scripts/smoke_test.sh
```

The script checks healthy dependencies, creates an example.com link, verifies its
307 Location without following it, waits for exactly one analytics row, and checks
metrics, an unauthenticated 401, and a write-rate 429 with Retry-After. The last check
exhausts the test key’s write bucket; use a dedicated key. It never prints the key. Revoke the smoke key afterward with `keys revoke
<ID>`. Metrics are on the separate internal 8002 Service, never in Ingress.
Jaeger UI is http://localhost:16686; its bounded in-memory traces are ephemeral.
Application liveness/startup use `/livez`; readiness uses dependency-aware `/health`.

`bash scripts/kind_smoke.sh` automates a **new disposable cluster**, SHA image,
validation, ephemeral credentials, deploy and smoke, then deletes only that cluster.
It refuses to reuse an existing cluster name. GitHub Actions runs it without cloud
secrets. Local smoke validates functionality, not NetworkPolicy enforcement; use a
policy-enforcing CNI and explicit denial tests before treating policies as proven.
Ingress routing, node drain behavior, and autoscaling under load require separate
operator validation. PostgreSQL/Redis/Kafka remain single-instance local services.

## Rollback

Inspect revisions and roll back an application deployment explicitly:

```sh
kubectl --context "$KUBE_CONTEXT" -n url-shortener rollout history deployment/api
kubectl --context "$KUBE_CONTEXT" -n url-shortener rollout undo deployment/api
kubectl --context "$KUBE_CONTEXT" -n url-shortener rollout status deployment/api --timeout=300s
```

Do the same for worker/abuse-worker if their compatible image must be restored.
Keep previous SHA images available. Rollout undo does **not** revert ConfigMaps,
PVCs, Secrets or Alembic revisions. Restore compatible overlay configuration and
plan database rollback separately; never automatically downgrade a populated DB.

For the CI performance gate, run `RUN_K6=true bash scripts/kind_smoke.sh` with k6
installed. It uses a separate key and measures 30 seconds of redirects at 5/sec
(p95 <500ms, errors <1%, all checks passing). Logs and the k6 summary remain in
ignored `artifacts/k8s/`. `.github/workflows/k8s-smoke.yml` creates kind with
helm/kind-action and passes `KIND_EXISTING=true KIND_NAME=shortener-ci`; only use
that option for an explicitly owned disposable cluster. The workflow cleans it up.

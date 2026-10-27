# Kubernetes diagnosis (step 5.3)

Reproduced from commit `0c6b86053e7bb97d858dd3b779bbcf23d05db6a5` on
2026-10-26 America/Chicago (cluster logs use 2026-10-27 UTC). A new kind
`shortener-step53` cluster used `kindest/node:v1.37.0`, with a separate kubeconfig
at `/tmp/shortener-step53.kubeconfig`. No existing cluster was changed.

The original YAML was preserved before editing in
`/tmp/step53-before/manifests.yaml`, excluding the Secret example. The backend was
built from that source and loaded under the original expected tag for diagnosis.
An ephemeral generated Secret supplied only test credentials; no real `.env` or
Secret values were printed. Applied all current manifests, including frontend.

Captured `kubectl describe pod <name>` and `kubectl logs <name> -c <container>
--tail=100` for **every pod and init container**, plus PVC/HPA descriptions,
StorageClasses, metrics discovery and final restart status. Raw local evidence is
in `/tmp/step53-before/`; pertinent verbatim excerpts follow. Pending containers
have no application logs: their captured log command explicitly returns that fact.

## Confirmed failures

| Component / observed pods | Evidence | Root cause and change |
| --- | --- | --- |
| `postgres-0`, `redis-0` | `0/1 nodes are available: pod has unbound immediate PersistentVolumeClaims.` | StatefulSet claims explicitly request `hostpath`; cluster has only `standard (default) rancher.io/local-path`. Omit storageClassName to use the default. |
| PVCs | `postgres-storage-postgres-0 Pending ... hostpath`; `redis-storage-redis-0 Pending ... hostpath` | Also remove unused standalone postgres/redis claims; they were not the StatefulSets' claims. Grafana's unused claim now backs its actual data volume. |
| `db-migrate-q28m5` | Init log repeats `PostgreSQL is unavailable - sleeping`; main log: `container "migrate" ... is waiting to start: PodInitializing` | Database unavailable due to storage, **not an obsolete migration command**. Alembic was already configured. Add a Job deadline and preserve the completion gate. |
| `api-6875847bf7-5stxn`, `api-6875847bf7-cwr4s`, `worker-84c5b48795-hlc79`, `abuse-worker-58bb7984c-9fgzd` | `Init:0/2` or `Init:0/1`; main log commands return `PodInitializing` | Their PostgreSQL init checks cannot complete while postgres is Pending. No application crash was observed in these pods. |
| `kafka-0` | Describe: `Liveness probe failed: bash: kafka-broker-api-versions.sh: command not found`; same readiness failure | Probe executable does not exist in this image. Final capture shows two restarts, not an inferred OOM or listener failure. Local overlay replaces ZooKeeper mode with pinned KRaft and startup/TCP probes. |
| `zookeeper-0` | Actual probe command returns `ruok is not executed because it is not in the whitelist.` | Probe uses a disallowed four-letter command; final capture shows two restarts. Remove ZooKeeper from new overlays; KRaft does not need it. |
| `frontend-6d95d94c5c-dz9n8` | `Failed to pull image "url-shortener-frontend:latest" ... pull access denied, repository does not exist or may require authorization` | Manifest exists but image is not built/loaded. Its browser URL `http://api:8000` is also cluster-internal (static configuration defect). Explicitly run frontend outside cluster instead of claiming a working in-cluster frontend. |
| `api-hpa` | `FailedGetResourceMetric ... unable to fetch metrics from resource metrics API ... (get pods.metrics.k8s.io)`; discovery: `Error from server (NotFound): the server could not find the requested resource` | No metrics-server. Document pinned installation and local-only kubelet TLS workaround; CI omits HPA. |

Grafana and Prometheus reached Running/Ready in the reproduction. Grafana logged
plugin-update network timeouts, but did **not** crash. Jaeger had no manifest.
API liveness already used `/livez`; readiness used `/health`; startup already used
`/livez`. The old baseline's dependency-based liveness claim is historical.

The old deploy script had e.g. `kubectl wait ... || echo "Timeout waiting for
PostgreSQL (it may still be starting)"`, so it continued after readiness failures.
The replacement stops and emits diagnostics; no success message follows a failed
wait or migration.

## Further defects exposed while validating fixes

1. After PVCs bound, PostgreSQL logged `initdb: error: could not change permissions
   of directory "/var/lib/postgresql/data": Operation not permitted`. The mounted
   subPath was not owned by UID 70. Remove subPath and use
   `PGDATA=/var/lib/postgresql/data/pgdata`, allowing the non-root process to create
   its own directory. PostgreSQL subsequently became Ready and Alembic completed.
2. Initial two-phase deploy used an absolute Kustomize resource directory. kubectl
   rejected it: `new root ... cannot be absolute`. Deploy now creates a temporary
   sibling overlay with a relative resource reference. The failed attempt exited
   1 and printed diagnostics as intended.
3. Static review found the analytics worker had no REDIS_URL. Its Redis Streams
   client would otherwise default to localhost; the base now explicitly uses the
   Redis Service. OTLP endpoint and matching egress/ingress policies were also
   missing and now point all application processes at Jaeger.

4. KRaft startup initially logged `java.net.UnknownHostException: kafka`. Its
   headless Service withheld unready endpoints, preventing controller discovery
   before readiness. Setting `publishNotReadyAddresses: true` resolved the startup
   deadlock; the Kafka-backed smoke test then passed.

No evidence established broker OOM, a failing SQL revision, or an advertised
listener fault in the original run; those are not claimed as reproduced causes.
See [kubernetes-verification.md](kubernetes-verification.md) for final results and
remaining limits. This is a local deployment exercise, not production certification.

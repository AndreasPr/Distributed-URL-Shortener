# ADR 0016: Kustomize overlays with a migration gate

## Context

A fresh kind deployment reproduced unbound hostpath claims, invalid broker probes,
blocked application init containers, an unavailable frontend image and no metrics
API. The deployment script continued after readiness timeouts. Some old baseline
claims were stale: Alembic and dependency-independent liveness already existed.
See the captured evidence in [kubernetes-diagnosis.md](../kubernetes-diagnosis.md).

## Decision

Keep shared workloads/security/monitoring in k8s/base. Use local for Kafka KRaft,
nginx Ingress, two API replicas and HPA; use ci for Redis Streams, one replica,
smaller requests and port-forward access. Kafka is required in local; ZooKeeper is
not used. Running one broker on local persistent storage is not a production HA
configuration. Explicitly run the Next.js frontend outside the cluster.

Use the cluster's default StorageClass, a non-root-owned PostgreSQL PGDATA child,
and publish Kafka headless addresses before readiness for controller discovery.
Add Jaeger, OTLP policies, voluntary-disruption budgets and soft API topology
spread. Keep /livez for startup/liveness and dependency-aware /health for readiness.
Install metrics-server separately, with a TLS workaround confined to local kind.

Deploy through a temporary Kustomize overlay with application replicas zero, then
wait for dependencies and the bounded Alembic Job before final replica rollout.
Stop on every failure and emit diagnostics. This intentionally trades local
deployment downtime for a clear schema gate; do not describe it as zero downtime.
An active migration Job is not replaced. Concurrent deployments are unsupported.

Build/load source-commit SHA images in a disposable kind CI job, use schema and
server validation plus authenticated HTTP smoke checks. Never put generated test
credentials in Git. Preserve previous images and document rollout undo separately
from schema rollback.

## Alternatives / consequences

Helm would add a template/package layer that these two small environments do not
need. Maintaining duplicated flat YAML caused drift. Shared developer Compose
services would hide clean-install failures and risk developer data. Running Kafka
in every CI job is slower and unnecessary for the default functional smoke; the
local overlay and optional integration test retain Kafka coverage.

Default-class claims are portable across these local clusters but existing claims
cannot be changed in place; users must back up/migrate data. Applying a different
overlay does not prune omitted resources. PDBs cannot prevent involuntary failures,
and maxUnavailable=1 permits a single worker to stop. Ingress-controller behavior,
NetworkPolicy denial enforcement, drain/load behavior and production resilience
are separate validations, not implied by a passing smoke test.

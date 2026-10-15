# ADR 0002: Local credentials, smaller build context, and explicit image versions

Date: 2026-10-14
Status: Accepted

## Context

Tracked runtime data, generated outputs, duplicated operational documentation, committed development credentials, and floating third-party image tags make the baseline difficult to reproduce safely. Application behavior is outside this step's scope.

## Decision

Remove tracked generated/data artifacts and ignore future copies. Keep only placeholder environment examples; Compose requires locally supplied PostgreSQL and Grafana credentials. Kubernetes consumes DB_USER and passwords from a separately created Secret, using an ignored environment file. Do not automatically apply the example Secret. Preserve existing volumes and do not rotate their credentials implicitly.

Consolidate CI/CD documentation under docs/ci-cd.md and move operational guides into docs/. Exclude local credentials, data, frontend artifacts, tests, docs, Kubernetes, and the independent MCP server from the backend build context. Pin third-party images to releases observed in locally running binaries/packages, retaining the different Compose KRaft and Kubernetes ZooKeeper Kafka configurations. Version/evidence details are in DEPLOYMENT.md.

## Consequences

Fresh deployments require explicit local credential setup. Existing volumes still require their original credentials. Host-run applications need environment variables exported explicitly; application defaults are unchanged. Removing files does not erase Git history; this step does not rewrite history. Image version tags are not immutable digests, and retaining the existing Jaeger version does not resolve its end-of-life status. Tests and a rebuilt-image startup check validate the cleanup without claiming end-to-end delivery or Kubernetes readiness.

## Rebuild finding

The first clean rebuild resolved unpinned SQLAlchemy to 2.1.4. Its PostgreSQL URL selected an unavailable `psycopg` driver, so the smoke health check failed. Pin SQLAlchemy to 2.0.51, verified in the running API, to preserve the existing psycopg2 behavior without changing application code or URLs. Other dependency locking remains a separate task.

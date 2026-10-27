# Local deployment

Run commands from the repository root. Only free local tools are required. See [CI/CD](ci-cd.md) for image publication and [AGENTS.md](../AGENTS.md) for development commands.

## Docker Compose

```sh
# Only copy if .env does not already exist:
cp -n .env.example .env
# Edit .env locally: replace every credential placeholder.
docker compose --profile kafka config --quiet
docker compose --profile kafka up --build -d
docker compose ps
```

Compose reads `.env` automatically. Set `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `GRAFANA_ADMIN_USER`, and `GRAFANA_ADMIN_PASSWORD`; missing/empty values fail configuration. Use URL-safe database credentials (random hex works) because Compose constructs its internal DB_URL. The example contains placeholders only. Do not paste resolved `docker compose config` output: it contains credentials; use `--quiet` or redirect output to a private temporary file.

For the lightweight mode use `docker compose --profile redis-streams up --build -d` instead; API/worker service names are `api-redis` and `worker-redis`. Kafka and ZooKeeper are excluded. Stop the selected profile before switching, without removing volumes. See [event-bus operations](developer.md#analytics-event-bus-step-15).

The Kafka stack includes API, migration job, worker, PostgreSQL, Redis, Kafka (KRaft), the retained ZooKeeper service, Prometheus, Grafana, and Jaeger. Start the Next.js frontend separately with `cd frontend`, `npm ci`, `npm run dev`.

- API: http://localhost:8000
- Frontend: http://localhost:3000
- Grafana: http://localhost:3001; use the credentials configured in `.env`.
- Prometheus: http://localhost:9090
- Jaeger: http://localhost:16686

Existing PostgreSQL and Grafana volumes retain their initialized credentials. Changing `.env` does not rotate database users or reset an existing Grafana login. Preserve the matching local credentials or perform a separate, deliberate credential migration; do not delete volumes as part of cleanup. `docker compose down` stops the stack without requesting volume removal.

## Host-run backend

Set the host-only `DB_URL` in `.env` to match the selected PostgreSQL credentials on port 5433. Ensure a previously exported `DATABASE_URL` is unset or correct: it overrides DB_URL. The application does not load `.env` itself. For a trusted local file with shell-compatible values:

```sh
set -a
. ./.env
set +a
docker compose --profile kafka up -d postgres redis kafka zookeeper
.venv/bin/alembic upgrade head
.venv/bin/uvicorn app.main:app --no-proxy-headers --reload --host 0.0.0.0 --port 8000
# In another terminal with the same environment:
.venv/bin/python -m app.workers.analytics_worker
```

Stop the Compose API first if port 8000 is occupied. Redis defaults to localhost:6379 and Kafka to localhost:9094. The frontend uses NEXT_PUBLIC_API_URL; its separate example is in `frontend/.env.example`. MCP has a separate example and setup guide in [mcp-server](../mcp-server/README.md); optional external integrations remain disabled without local configuration.

## Kubernetes

Follow [the Kustomize deployment guide](kubernetes.md) for explicit cluster context,
ignored Secret setup, SHA images, migration gates, and rollback. Local uses Kafka
KRaft; CI uses Redis Streams. Frontend runs outside Kubernetes. Do not recursively
apply k8s/ or use the old flat manifest paths.

## Verification and image versions

```sh
curl --fail http://localhost:8000/health
curl --fail http://localhost:8000/health/redis
curl --fail http://localhost:9090/-/ready
```

`/health` returns 503 when PostgreSQL or Redis is unavailable (including an open cache breaker). Broker delivery is best-effort and tracked by event metrics, not dependency health. Worker batches now flush on a timed poll even without new arrivals. A startup smoke test alone does not verify end-to-end delivery.

Third-party versions are pinned to locally observed releases, preserving existing behavior rather than upgrading:

| Image | Version | Evidence / reason |
| --- | --- | --- |
| PostgreSQL | `16.13-alpine` | Running `postgres --version` |
| Redis | `7.4.9-alpine` | Running `redis-server --version` |
| Grafana | `13.2.4` | Running `grafana --version` |
| Prometheus | `v3.15.0` | Running `prometheus --version` |
| Jaeger all-in-one | `1.76.0` | Running binary's version output; retains current Thrift exporter compatibility |
| BusyBox | `1.38.0` | Local image's binary version |
| Compose Kafka | `8.3.0` | Running Kafka JAR name and image release label; retains KRaft mode |
| Compose ZooKeeper | `7.9.1` | Running Confluent package version |
| Kubernetes Kafka/ZooKeeper | `7.5.0` | Already pinned and present locally; retains existing ZooKeeper-based configuration |

Jaeger v1 reports end-of-life; migrating to v2 requires a separate tracing change. All newly selected tags were also verified with `docker manifest inspect`. SQLAlchemy is pinned to the running API's `2.0.51` after the first clean rebuild exposed a driver mismatch with the newly resolved release; see ADR 0002.

Version tags improve reproducibility but are not immutable digests or a security-support claim. Local application images retain their development tags; they are not third-party dependencies.

## Versioned database migrations

Run `alembic upgrade head` using the project environment. See the [migration guide](migrations.md) for settings, empty databases, existing-volume adoption, rollback, and PostgreSQL tests. Existing pre-Alembic databases must be verified and stamped at revision 0001 before normal startup. Never blindly stamp head.

## Security hardening rollout

Read the [Step 2.2 rollout checklist](security-hardening-verification.md) before
applying the updated manifests. It covers persistent-volume ownership, immutable
migration Jobs, CNI/ingress/DNS selectors, resource limits and removal of old
additive policies/RBAC. Set the ConfigMap's CORS_ORIGINS to the actual public
frontend origin. Build the frontend with `--build-arg NEXT_PUBLIC_API_URL=https://YOUR_API_ORIGIN`;
this is public configuration, never an API key. Kubernetes security tests are
static checks; they do not establish that your CNI enforces these policies.

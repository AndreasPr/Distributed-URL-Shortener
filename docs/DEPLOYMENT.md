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
.venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
# In another terminal with the same environment:
.venv/bin/python -m app.workers.analytics_worker
```

Stop the Compose API first if port 8000 is occupied. Redis defaults to localhost:6379 and Kafka to localhost:9094. The frontend uses NEXT_PUBLIC_API_URL; its separate example is in `frontend/.env.example`. MCP has a separate example and setup guide in [mcp-server](../mcp-server/README.md); optional external integrations remain disabled without local configuration.

## Kubernetes

The Kubernetes path is optional and has unresolved baseline deployment issues. Confirm `kubectl config current-context` points to the intended local cluster. Storage provisioning, ingress controller, metrics API, and accessible images are prerequisites.

The old committed Secret is removed. [k8s/secrets.example.yaml](../k8s/secrets.example.yaml) documents only required key names and placeholders; applying it would store literal placeholders. Kubernetes does not substitute shell variables in YAML.

Create a Secret without putting its contents into shell arguments or command output:

```sh
kubectl apply -f k8s/0-namespace.yaml
cp k8s/.env.example k8s/.env
# Edit ignored k8s/.env locally; replace every placeholder.
chmod 600 k8s/.env
kubectl create secret generic url-shortener-secrets \
  -n url-shortener --from-env-file=k8s/.env
```

Required keys: `DB_USER`, `DB_PASSWORD`, `GRAFANA_ADMIN_USER`, `GRAFANA_ADMIN_PASSWORD`. DB_USER is now consumed from the Secret instead of the ConfigMap. Redis authentication is not configured by these manifests; an unused REDIS_PASSWORD field would not enable it. SENTRY_DSN was also unused and is omitted. For an existing Secret, update it deliberately through a protected local manifest or your local cluster tooling; `create` intentionally does not overwrite it. Any real `k8s/2-secrets.yaml` is ignored and must never be committed.

```sh
docker build -t url-shortener:latest .
bash k8s/deploy.sh
kubectl get pods -n url-shortener
kubectl port-forward svc/api 8000:8000 -n url-shortener
```

The deploy script requires the Secret to exist; it never applies placeholder credentials. Docker Desktop can share local images; other clusters need an explicit image load. Use `kubectl port-forward svc/grafana 3001:3000 -n url-shortener` and the locally chosen Secret credentials for Grafana.

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

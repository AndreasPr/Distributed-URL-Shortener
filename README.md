# Distributed URL Shortener

[![CI](https://github.com/AndreasPr/Distributed-URL-Shortener/actions/workflows/ci.yml/badge.svg)](https://github.com/AndreasPr/Distributed-URL-Shortener/actions/workflows/ci.yml)
[![Docker](https://github.com/AndreasPr/Distributed-URL-Shortener/actions/workflows/docker.yml/badge.svg)](https://github.com/AndreasPr/Distributed-URL-Shortener/actions/workflows/docker.yml)
[![Kubernetes smoke](https://github.com/AndreasPr/Distributed-URL-Shortener/actions/workflows/k8s-smoke.yml/badge.svg)](https://github.com/AndreasPr/Distributed-URL-Shortener/actions/workflows/k8s-smoke.yml)
[![CodeQL](https://github.com/AndreasPr/Distributed-URL-Shortener/actions/workflows/codeql.yml/badge.svg)](https://github.com/AndreasPr/Distributed-URL-Shortener/actions/workflows/codeql.yml)

Local-first distributed URL shortener showcasing an event-driven architecture with caching, persistent storage, analytics streaming, and a modern full-stack web interface.

**Core Demo Features:**
- 🔗 **URL Shortening** — Generate compact short codes for long URLs with instant redirect
- 📊 **Real-time Analytics** — View click patterns and trends with interactive charts
- 📈 **Dashboard** — Monitor system health, recent URLs, and activity in real-time
- ❤️ **Health Status** — Check API, database, and Redis connectivity at a glance
- ⚡ **Fast Redirects** — Redis-cached lookups for instant URL resolution
- 🔄 **Analytics Pipeline** — Clicks are queued for Kafka or Redis Streams and persisted idempotently by the worker

The [MCP server](docs/mcp.md) provides on-demand stdio tools for links, analytics and abuse review through the authenticated API. It is read-only by default; GitHub context and Slack reporting are optional and disabled by default.

**Tech Stack:**
- **Backend:** Python, FastAPI, SQLAlchemy, PostgreSQL, Redis
- **Frontend:** Next.js 14 (React), TypeScript, Tailwind CSS, Recharts, shadcn/ui
- **Infrastructure:** Docker, Docker Compose, Kubernetes, Prometheus, Grafana
- **Observability:** OpenTelemetry, Prometheus metrics, structured logging

The [AWS Terraform design](docs/aws-design.md) is a validation-only portfolio artifact:
**not deployed**, no cloud credentials required for checks, and AWS resources would
incur charges if someone separately authorized deployment. The free local stack is unchanged.

## Quality checks

Use [the developer guide](docs/developer.md) to install pinned Python and locked dependencies. Run `make check`, `make frontend-check`, and `make mcp-test`; all three are blocking CI checks.

## 🚀 Deployment

Copy `.env.example` to `.env` and replace credential placeholders before running Compose. See [local credential setup](docs/DEPLOYMENT.md). Kubernetes requires a separately created Secret; the checked-in example contains placeholders only.

The project includes a step-by-step **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** guide for running the stack locally with Docker Compose and Kubernetes.

The guide covers:
- ✅ Docker Compose for the full local stack
- ✅ Docker Desktop Kubernetes deployment
- ✅ Local PostgreSQL, Redis, Kafka, Prometheus, Grafana, and Jaeger
- ✅ Environment variables and verification commands


Table of Contents
-----------------
- Deployment
- API authentication (step 2.1)
-----------------------------

Create a scoped API key with `python -m app.cli keys create --name browser --scopes read write`
inside the API container (after migrations). Paste it into the frontend key field
or Swagger Authorize dialog. Shortening, deletion, URL listing and analytics now
require `X-API-Key`; redirects and health remain public. Keys are stored as hashes,
with metadata/revocation available to admins. See [security setup](docs/security.md).
For the curl examples below, set `$API_KEY` privately to your key.

Project summary
- Key Features
- Architecture
- Repository layout
- Quick start (local)
- Frontend setup
- Full stack with Docker Compose
- Kubernetes Deployment
- Configuration
- API reference
- Batch analytics writes
- GitHub Actions CI/CD
- Testing & verification
- Load Testing
- Observability
- Troubleshooting
- Developer notes

Project summary
---------------

- Generates random seven-character base62 codes or optional 3–32 character custom aliases, with optional expiry and soft deletion. PostgreSQL enforces uniqueness; random allocation allows up to ten attempts. Existing codes remain valid. See [the design decision](docs/adr/0001-short-code-generation.md).
- Redirects coalesce cold loads, revalidate positive cached links in PostgreSQL, and briefly cache unknown codes. Redis failures fall back through a circuit breaker; Kafka or Redis Streams analytics are persisted in batch transactions. See [cache strategy](docs/adr/0002-cache-strategy.md).
- The analytics worker batches click events before writing them to PostgreSQL.
- Full-stack web interface with real-time dashboards and analytics visualization.

Key Features
------------

### Frontend Pages

1. **Dashboard** (`/dashboard`)
   - Real-time system health status (API, database, Redis)
   - Recent URLs list with click counts
   - Performance metrics display
   - Live data fetched from backend

2. **Analytics** (`/analytics`)
   - Search any shortened URL by code
   - View total click count and status
   - Interactive bar & line charts showing click patterns over time
   - Click data aggregated by day with responsive visualizations
   - Built with Recharts for rich data visualization

3. **Health Page** (`/health`)
   - Comprehensive system status overview
   - Individual service health checks (API, database, Redis)
   - Redis database size and total URL count
   - Color-coded status indicators (green/amber)
   - Real-time connectivity verification

### Backend Services

1. **URL Shortening** (`POST /shorten`)
   - Accepts long URLs, generates compact short codes
   - Stores URL mapping in PostgreSQL
   - Returns short code for immediate use

2. **URL Redirection** (`GET /{code}`)
   - Checks Redis cache first for instant lookup
   - Falls back to database if not cached
   - Enqueues a versioned click event for background publication and batched analytics persistence
   - Returns 307 temporary redirect

3. **Analytics API** (`GET /analytics/{short_code}`)
   - Returns detailed click statistics
   - Provides raw timestamps for chart aggregation
   - Accessible via frontend analytics page

4. **Health Checks** (`GET /health`, `/health/redis`)
   - Database connectivity verification
   - Redis availability check
   - Redis database size reporting
   - Overall system status reporting

Architecture
------------

User → HTTP (FastAPI)
   - POST `/shorten` → create URL record (DB) → return `short_code`
   - GET `/{code}` → check Redis cache → DB fallback → 307 redirect + record click in Postgres

Redis → cache `short_code` → `long_url` mapping (TTL)
Postgres → durable store for `urls` and `analytics`

Repository layout
-----------------

- `app/`
	- `main.py` — FastAPI entrypoint
	- `api/routes.py` — HTTP endpoints (shorten, redirect, analytics, health)
	- `services/` — business logic (`url_service.py`, `analytics_service.py`)
	- `repositories/` — DB access (`url_repository.py`, `analytics_repository.py`)
	- `models/` — SQLAlchemy models (`url.py`, `analytics.py`)
	- `cache/redis_client.py` — Redis helper
	- `db/database.py` — SQLAlchemy engine & session
	- `kafka/` — `producer.py`, `consumer.py` (kafka-python helpers)
	- `workers/analytics_worker.py` — background worker
	- `core/config.py` — environment-backed settings
- `alembic/versions/` — versioned DB schema
- `docker-compose.yml` — full local stack
   - `Dockerfile` — image for API/worker
- `requirements.txt`

Quick start (local, recommended)
--------------------------------

1. Create & activate virtual environment:

```bash
uv python install 3.11.14
uv venv --python 3.11.14 --managed-python .venv
source .venv/bin/activate
```

2. Install Python dependencies:

```bash
uv pip sync --python .venv/bin/python --require-hashes requirements-dev.txt
```

3. Start infra (recommended) — run Postgres, Redis, Kafka (and Zookeeper) via Docker Compose:

```bash
docker compose --profile kafka up -d postgres redis kafka zookeeper
```

4. Apply pending migrations before starting the API. Export database settings first; for an existing pre-Alembic database, follow the [adoption instructions](docs/migrations.md).

```bash
.venv/bin/alembic upgrade head
```

5. Run the API locally (project root):

```bash
.venv/bin/uvicorn app.main:app --no-proxy-headers --reload --host 0.0.0.0 --port 8000
```

6. Run the analytics worker in another terminal:

```bash
.venv/bin/python -m app.workers.analytics_worker
```

Now you can create short URLs, hit them to generate clicks, and query analytics.

Frontend setup
--------------

The project includes a full-featured Next.js frontend at `127.0.0.1:3000`.

### Prerequisites

- Node.js 18+ and npm

### Quick Start (Local Frontend + Backend)

1. **Ensure backend is running:**

```bash
.venv/bin/uvicorn app.main:app --no-proxy-headers --reload --host 0.0.0.0 --port 8000
```

2. **In a new terminal, start the frontend:**

```bash
cd frontend
npm install
npm run dev
```

3. **Open in browser:**

```
http://127.0.0.1:3000
```

If `http://127.0.0.1:3000` is refused, the frontend is not running. Start it again from the `frontend/` directory.

You should see the URL Shortener dashboard with navigation to:
- **Dashboard** — System status & recent URLs
- **Analytics** — Click statistics for any short code
- **Health** — Real-time service health monitoring

### Frontend Architecture

```
frontend/
├── app/
│   ├── page.tsx          # Landing page
│   ├── dashboard/        # Dashboard with live data
│   ├── analytics/        # Click analytics with charts
│   ├── health/          # System health status
│   ├── layout.tsx       # Global layout & navigation
│   └── globals.css      # Tailwind styles
├── components/
│   ├── AnalyticsChart.tsx    # Recharts visualization
│   ├── URLTable.tsx          # Data table component
│   ├── ShortenForm.tsx       # URL shortening form
│   └── ui/              # shadcn/ui components
├── lib/
│   ├── api.ts           # Centralized API client with types
│   └── utils.ts         # Utility functions
└── package.json
```

### Features

- **Type-Safe API Client** — Full TypeScript support with interfaces for all endpoints
- **Real-Time Data** — Frontend fetches live health, URLs, and analytics data
- **Chart Visualization** — Interactive Recharts components for click trends
- **Responsive Design** — Mobile-friendly with Tailwind CSS
- **Error Handling** — Graceful error states and user feedback
- **Loading States** — Clear loading indicators during data fetches

### Environment Configuration

Create `frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

This ensures the frontend can reach the backend API running on port 8000. If you use `localhost` instead of `127.0.0.1`, the current CORS settings support both origins.

Run full stack in Docker

------------------------

To run everything in containers (API + worker + infra), just run:

```bash
docker compose --profile kafka up --build
docker compose --profile kafka up -d
```

The compose file now runs the database migration automatically before the API and worker start, so you do not need a separate migration step for the Docker flow.

Stop the stack:

```bash
docker compose down
```

Kubernetes Deployment
---------------------

Use the [Kubernetes guide](docs/kubernetes.md). Kustomize has a local overlay
(Kafka KRaft, nginx Ingress and HPA) and a kind CI overlay (Redis Streams, single
replicas, port-forward access). Both include Jaeger; the frontend runs outside
Kubernetes. Deployments use source-SHA images and gate API startup on Alembic.

```bash
# After image/Secret/context setup in the guide:
KUBE_CONTEXT=kind-shortener bash k8s/deploy.sh ci
# Fully disposable validation used by CI:
bash scripts/kind_smoke.sh
```

See [observed failures and fixes](docs/kubernetes-diagnosis.md) and
[verification output](docs/kubernetes-verification.md). This is local deployment
validation, not a claim of production readiness.


Configuration
-------------

Environment variables are read from `.env` and set sensible defaults in `app/core/config.py`.

Key settings:

```python
DB_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5433/url_db
REDIS_URL=redis://localhost:6379/0
KAFKA_BOOTSTRAP_SERVERS=localhost:9094
RATE_LIMIT_REQUESTS=20         # Requests per minute per IP
RATE_LIMIT_WINDOW=60          # Window in seconds
```

For Docker Compose, these are pre-configured in `docker-compose.yml`.

API Reference
-------------

All endpoints return JSON. The API is available at `http://localhost:8000` (locally) or your Kubernetes ingress endpoint.

**Interactive API Docs:**

- OpenAPI (Swagger UI): `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Endpoints

#### Create Short URL
```bash
POST /shorten
Content-Type: application/json

Request:
{
  "long_url": "https://example.com/very/long/path?with=params"
}

Response (201 Created):
{
  "short_code": "abc123"
}

# Usage
curl -H "X-API-Key: $API_KEY" -X POST http://localhost:8000/shorten \
  -H "Content-Type: application/json" \
  -d '{"long_url":"https://example.com"}'
```

#### Redirect to Original URL
```bash
GET /{code}

Response:
HTTP/1.1 307 Temporary Redirect
Location: https://example.com

# Example
curl -i http://localhost:8000/abc123
```

**What happens:**
1. Checks Redis cache (instant hit for hot URLs)
2. Falls back to PostgreSQL on cache miss
3. Enqueues a click event for background publication to the configured event bus
4. Returns 307 redirect to original URL

#### Get Recent URLs
```bash
GET /urls?limit=20

Response (200 OK):
[
  {
    "short_code": "abc123",
    "long_url": "https://example.com",
    "created_at": "2024-05-14T10:30:00Z",
    "click_count": 11
  },
  ...
]

# Example
curl -H "X-API-Key: $API_KEY" "http://localhost:8000/urls?limit=10"
```

#### Get Analytics for a URL
```bash
GET /analytics/{short_code}

Response (200 OK):
{
  "short_code": "abc123",
  "total_clicks": 11,
  "timestamps": [
    "2024-05-14T10:30:00Z",
    "2024-05-14T11:15:00Z",
    "2024-05-15T09:45:00Z",
    ...
  ]
}

Response (404 Not Found):
{
  "detail": "Analytics not found: ..."
}

# Example
curl -H "X-API-Key: $API_KEY" http://localhost:8000/analytics/abc123 | jq .
```

**Frontend Note:** The analytics page groups these timestamps by day and renders interactive charts.

#### System Health Check
```bash
GET /health

Response (200 OK):
{
  "status": "ok",  # or "degraded"
  "db": "reachable",  # or "unreachable"
  "redis": "reachable",  # or "unreachable"
  "dbsize": 42,  # Redis database size in keys
  "total_urls": 19  # Total shortened URLs in PostgreSQL
}

# Example
curl http://localhost:8000/health | jq .
```

#### Redis Health Check
```bash
GET /health/redis

Response (200 OK):
{
  "status": "ok",
  "redis": "reachable",
  "dbsize": 42
}

Response (503 Service Unavailable):
{
  "detail": "Redis unavailable: ..."
}

# Example
curl http://localhost:8000/health/redis | jq .
```

### Rate Limiting

The registered Redis token bucket allows a write burst of 20 requests per API key
and route template, refilling at one token/second. Public redirects share a looser
IP bucket across all codes (120 tokens, 10/second). Exhaustion returns 429 with
Retry-After and RateLimit-Limit/Remaining/Reset headers. Redis outages return 503
for writes and fail open for redirects. Forwarded IPs require TRUSTED_PROXIES and
project launchers use --no-proxy-headers. See [security details](docs/security.md).

GitHub Actions CI/CD
-------------------

Pull requests run backend lint/types, unit and PostgreSQL/Redis integration tests,
frontend checks/build, MCP tests, secret/dependency scans, Prometheus validation,
Docker build/Trivy, CodeQL, and a disposable kind deployment with HTTP and k6 gates.
The combined coverage floor is 93.6%. npm audit and optional Codecov are advisory.

Only version tags (`vMAJOR.MINOR.PATCH`) can publish to GHCR. The tag runs the
reusable CI workflow first; a successful image scan is also required. Publishing
uses the built-in `GITHUB_TOKEN`, with package write permission only in that job.
No personal token is needed. Main-branch pushes and PRs never publish images.
The exact scanned image receives version and `sha-<commit>` tags; no `latest` tag.
Publishing does not deploy to a persistent cluster.

See [CI configuration and release instructions](docs/ci-cd.md),
[security remediation verification](docs/ci-security-verification.md), and
[Kubernetes deployment](docs/kubernetes.md). Passing functional tests does not
bypass dependency findings: blocking audit failures must be resolved before release.


Configuration
-------------

Settings are defined in `app/core/config.py` and can be overridden via environment variables.

Common defaults used in development / Docker:

- `DB_URL`: `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5433/url_db`
- `REDIS_URL`: `redis://localhost:6379/0`
- `KAFKA_BOOTSTRAP_SERVERS`: `localhost:9094`

API Reference
-------------

- POST `/shorten`
	- Body: `{ \"long_url\": \"https://...\" }`
	- Response: `{ \"short_code\": \"abc\" }`
- GET `/{short_code}`
	- 307 Temporary Redirect to the original URL (also enqueues a best-effort click event)
- GET `/analytics/{short_code}`
	- Returns `{ short_code, total_clicks, timestamps }`
- GET `/health/redis`
	- Health check for Redis connectivity

Batch Analytics Writes
----------------------

The analytics worker buffers up to 100 events or five seconds (configurable),
then commits a transaction containing idempotent inserts keyed by event UUID.
A timed poll flushes idle batches; SIGTERM flushes remaining work. Acknowledgements
follow database commit or confirmed dead-letter publication. Poison events get
three attempts; database outages retain unacknowledged work for recovery.

Redirects only enqueue to a bounded background publisher. Saturation and broker
failures drop analytics and increment `events_dropped_total`, without delaying
redirects. This is best-effort telemetry, not guaranteed delivery.

Use `docker compose --profile kafka up --build` for Kafka, or
`docker compose --profile redis-streams up --build` for the smaller Redis Streams
mode. Start one profile at a time. See the [event bus ADR](docs/adr/0003-event-bus.md)
and [runbook](docs/developer.md#analytics-event-bus-step-15) for replay and limits.

Observability
-------------

The API exposes Prometheus metrics at `/metrics`, and Prometheus can scrape the app directly from Docker Compose.

Tracked metrics:

| Metric | Why it matters |
| --- | --- |
| `http_requests_total` | Request volume and traffic growth |
| `http_request_duration_seconds` | Request latency and tail behavior |
| `cache_hits_total` | Redis effectiveness |
| `cache_misses_total` | Cache miss pressure on the database |
| `redirect_requests_total` | Redirect throughput |
| `shorten_request_duration_seconds` | Write-path latency |
| `analytics_events_processed_total` | Kafka event throughput in the analytics worker |

Example PromQL:

```promql
rate(http_requests_total[1m])
```

```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

```promql
cache_hits_total / (cache_hits_total + cache_misses_total)
```

Grafana Dashboards
-------------------

Grafana visualizes the observability stack with pre-built dashboards.

**Access Grafana:**

When running `docker compose --profile kafka up`, Grafana is automatically available at:

```
http://localhost:3001
```

**Credentials:**
- Username: `${GRAFANA_ADMIN_USER}`
- Password: `${GRAFANA_ADMIN_PASSWORD}`

**Dashboard:** "URL Shortener - Production Observability"
- Automatically imported and provisioned
- 8 panels covering request throughput, latency, cache efficiency, error rates, and Kafka activity
- Refreshes every 10 seconds

**Key Panels:**
1. **Request Throughput (req/sec)** — Overall API request rate
2. **P95 Latency (ms)** — 95th percentile response time (tail behavior under load)
3. **Cache Hit Ratio** — Percentage of Redis hits vs. misses
4. **Redirect Requests (per minute)** — Short URL redirect volume
5. **Error Rate (5xx)** — Server error frequency
6. **Kafka Events Processed (per minute)** — Analytics worker throughput
7. **URL Shorten Latency (ms)** — Write-path P95/P99 latency
8. **Cache Operations (per minute)** — Hit and miss rates

**Export Dashboard for Portfolio:**

The dashboard is stored in `grafana/dashboards/url-shortener-dashboard.json`

Prometheus
-----------

Local Prometheus UI available at:

```bash
http://localhost:9090
```

Query raw metrics or visualize using the expression browser.


Database
--------

Schema is versioned in `alembic/versions/` (see [migration guide](docs/migrations.md)). Two tables:

- `urls` — `id`, `short_code`, `long_url`, `created_at`, nullable `expires_at`, `deleted_at`, `created_by`
- `analytics` — `id`, `short_code`, `clicked_at`, nullable unique `event_id`

Testing & verification
----------------------

Run the unit tests with:

```bash
pytest
```

The pytest suite covers:

- Base62 encoding utility
- URL repository create / update / lookup flow
- Analytics repository batch inserts and query helpers
- URL service shorten / resolve paths with cache and publish behavior
- Analytics service aggregation logic
- Registered token-bucket rate limiting
- API route handlers and Redis health check

Load Testing with k6
--------------------

k6 is a modern load testing tool for measuring latency, throughput, and discovering bottlenecks.

**Installation:**

```bash
brew install k6
# or visit https://k6.io/docs/getting-started/installation/
```

**Normal load test** (30s baseline, ~10 concurrent users):

```bash
k6 run scripts/load_test.js
```

Customize:

```bash
BASE_URL=http://localhost:8000 DURATION=60s VUS=20 k6 run scripts/load_test.js
```

**Key improvements in this test:**
- **Legacy scripts**: these k6 scripts need API-key headers and updated token-bucket expectations before reuse. Spoofing X-Forwarded-For no longer creates independent buckets.
- **Rate-limit awareness**: Treats HTTP 429 (rate limited) as expected behavior, not a failure
- **Read vs write split**: Most requests are reads (redirects, analytics) which scale well; writes are rate-limited by design
- **Realistic success criteria**: p95 latency < 100ms (redirects with cache), error rate < 10%

Metrics tracked:
- HTTP request duration (p95, p99)
- Success/failure rates (accounting for 429s as expected)
- Throughput (requests/second)
- Per-endpoint breakdown (shorten, redirect, analytics, health)

**Stress test** (24 minutes, ramps from 10 to 300 VUs):

```bash
k6 run scripts/stress_test.js
```

This discovers:
- Where latency degrades
- Database saturation point
- Redis connection pool limits
- Rate limiter behavior under load
- CPU/memory bottlenecks

Expected observations:
- Redirects (cached, read-heavy): should handle 100+ VUs smoothly
- Shorten writes now use per-key token buckets; historical load figures predate step 2.1 and must be remeasured with authenticated clients.
- Analytics (aggregation): may show latency growth as load increases

**Spike test** (sudden 10x traffic increase):

```bash
k6 run scripts/spike_test.js
```

Tests recovery and graceful degradation under sudden spikes.

**Interpreting results:**

- **p95 latency < 100ms**: Good; users experience responsive redirects
- **p99 latency < 200ms**: Acceptable; tail latencies are controlled
- **Error rate < 10%**: Acceptable; occasional 429s under load are expected and controlled
- **Timeouts or 500s**: Indicates saturation; scale the system (more API instances, connection pooling)

What the load tests reveal:
- **Redirects scale linearly** with concurrent users (cached, read-only, high throughput)
- **Shorten endpoint hits rate limit** (intentional: the configured per-key token bucket protects writes)
- **Analytics reads scale well** even under stress (distributed aggregation queries)
- **Redis becomes a bottleneck** only if connection pool is exhausted (configure `max_connections` if needed)

To scale beyond load test limits:
- Run multiple API instances behind a load balancer
- Scale Postgres with read replicas for analytics queries
- Increase Redis connection pool size in production
- Adjust rate limits based on your business requirements

---

End-to-end test:

1. Create a short URL
```bash
curl -s -H "X-API-Key: $API_KEY" -X POST http://localhost:8000/shorten \\
	-H "Content-Type: application/json" \\
	-d '{"long_url":"https://example.com"}'
```
2. Visit the short URL (follows redirect)
```bash
curl -i http://localhost:8000/<short_code>
```
3. Check analytics
```bash
curl -H "X-API-Key: $API_KEY" http://localhost:8000/analytics/<short_code> | jq .
```

Troubleshooting
---------------

- `ModuleNotFoundError: No module named 'app'` — run `uvicorn` from project root:

```bash
.venv/bin/uvicorn app.main:app --no-proxy-headers --reload
```

- Port conflicts (8000, 5432, 6379, 9094):

```bash
lsof -nP -iTCP:8000 -sTCP:LISTEN
docker compose ps
```

- `NoBrokersAvailable` from `kafka-python`: ensure Kafka/Zookeeper are up and `KAFKA_BOOTSTRAP_SERVERS` is correct.

- Missing packages: activate `.venv` then `uv pip sync --python .venv/bin/python --require-hashes requirements-dev.txt`.

Developer notes
---------------

- Redis TTL reduces DB load for frequent redirects.
- Kafka decouples latency-sensitive redirects from analytics persistence.
- Lazy Kafka initialization avoids blocking app startup if broker is down temporarily.

Getting Started
---------------

### For First-Time Users

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/Distributed-URL-Shortener.git
   cd Distributed-URL-Shortener
   ```

2. **Follow the Quick Start guide** above (section "Quick start (local)"):
   - Create virtual environment
   - Install dependencies
   - Start Docker services (Postgres, Redis, Kafka)
   - Run API and worker

3. **Start the frontend:**
   ```bash
   cd frontend && npm install && npm run dev
   ```

4. **Open browser:**
   - Frontend: http://127.0.0.1:3000
   - API Docs: http://localhost:8000/docs
   - Grafana: http://localhost:3001 (${GRAFANA_ADMIN_USER}/${GRAFANA_ADMIN_PASSWORD})

### For Contributions

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m "feat: add your feature"`
4. Push to branch: `git push origin feature/your-feature`
5. Open a Pull Request

**Before submitting:**
- Run backend gate: `make check`
- Format code: `black app/`
- Check types: `make typecheck`
- Lint: `flake8 app/`

### Project Structure for Contributors

Key files to understand:

- **Backend entry:** `app/main.py` (FastAPI app setup, middleware)
- **Routes:** `app/api/routes.py` (all HTTP endpoints)
- **Business logic:** `app/services/` (URL shortening, analytics)
- **Data access:** `app/repositories/` (database queries)
- **Frontend pages:** `frontend/app/` (Dashboard, Analytics, Health)
- **Frontend API:** `frontend/lib/api.ts` (type-safe API client)

License & Contact
-----------------

This project is open source and available under the MIT License.

For questions or support, please open an issue on GitHub.


Click tracing: [OTLP, JSON logs and finding a trace in Jaeger](docs/observability.md).

Monitoring: [SLO definitions and measurement gaps](docs/slo.md), [alert runbook](docs/runbook.md). `make check` includes promtool rule validation and tests; install promtool or start Docker.

The optional [LLM provider layer](docs/llm.md) defaults to deterministic offline
responses and supports Gemini/local Ollama. The abuse worker uses it only for
gray-zone decisions; request threads do not run inference.

[Asynchronous abuse review](docs/abuse-pipeline.md) analyzes newly created links
without fetching pages, blocks committed malicious verdicts with HTTP 451, and
provides an admin Flagged queue. Pending links remain redirectable; heuristic/model
verdicts can be wrong and require review. Both Compose profiles include the worker.

Run `make eval EVAL_PROVIDER=fake` for the [offline abuse evaluation](eval/abuse/README.md).
[Generated results](docs/eval-results.md) are synthetic regression evidence, not
real-world phishing accuracy. Public feeds are never downloaded automatically.

Local performance testing: `make perf` uses a disposable stack and writes ignored artifacts.
See [performance methodology and capacity assumptions](docs/performance.md).

Local resilience experiments: [chaos methodology](docs/chaos.md), including opt-in `make chaos`
against an already running test stack. These commands intentionally stop/pause services.

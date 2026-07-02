# Distributed URL Shortener

Local-first distributed URL shortener showcasing an event-driven architecture with caching, persistent storage, analytics streaming, and a modern full-stack web interface.

**Core Demo Features:**
- 🔗 **URL Shortening** — Generate compact short codes for long URLs with instant redirect
- 📊 **Real-time Analytics** — View click patterns and trends with interactive charts
- 📈 **Dashboard** — Monitor system health, recent URLs, and activity in real-time
- ❤️ **Health Status** — Check API, database, and Redis connectivity at a glance
- ⚡ **Fast Redirects** — Redis-cached lookups for instant URL resolution
- 🔄 **Analytics Pipeline** — Clicks are published to Kafka and batch-written to PostgreSQL by the worker

**Tech Stack:**
- **Backend:** Python, FastAPI, SQLAlchemy, PostgreSQL, Redis
- **Frontend:** Next.js 14 (React), TypeScript, Tailwind CSS, Recharts, shadcn/ui
- **Infrastructure:** Docker, Docker Compose, Kubernetes, Prometheus, Grafana
- **Observability:** OpenTelemetry, Prometheus metrics, structured logging

## 🚀 Deployment

The project includes a step-by-step **[DEPLOYMENT.md](./DEPLOYMENT.md)** guide for running the stack locally with Docker Compose and Kubernetes.

The guide covers:
- ✅ Docker Compose for the full local stack
- ✅ Docker Desktop Kubernetes deployment
- ✅ Local PostgreSQL, Redis, Kafka, Prometheus, Grafana, and Jaeger
- ✅ Environment variables and verification commands


Table of Contents
-----------------
- Deployment
- Project summary
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

- Generates compact short codes for long URLs.
- Fast redirects using a Redis cache and Kafka-backed batch persistence to PostgreSQL.
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
   - Publishes the click event to Kafka for batched analytics persistence
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
- `scripts/migrate.sql` — DB schema
- `docker-compose.yml` — full local stack
   - `Dockerfile` — image for API/worker
- `requirements.txt`

Quick start (local, recommended)
--------------------------------

1. Create & activate virtual environment:

```bash
python3.11 -m venv .venv
source .venv/bin/activate
```

2. Install Python dependencies:

```bash
pip install -r requirements.txt
```

3. Start infra (recommended) — run Postgres, Redis, Kafka (and Zookeeper) via Docker Compose:

```bash
docker compose up -d postgres redis kafka zookeeper
```

4. Apply DB migration (one-time, if you are running the API locally against the Docker services):

```bash
python scripts/migrate.py
```

5. Run the API locally (project root):

```bash
.venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
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
.venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
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
docker compose up --build
docker compose up -d
```

The compose file now runs the database migration automatically before the API and worker start, so you do not need a separate migration step for the Docker flow.

Stop the stack:

```bash
docker compose down
```

Kubernetes Deployment
---------------------

Deploy the entire application to a Kubernetes cluster (Docker Desktop, minikube, GKE, EKS, etc.) for cloud-native, production-grade orchestration.

### Prerequisites

1. **Kubernetes cluster** running (Docker Desktop K8s enabled, or minikube)
   ```bash
   kubectl cluster-info
   kubectl get nodes
   ```

2. **Docker image built**
   ```bash
   docker build -t localhost:5000/url-shortener:latest .
   ```

3. **kubectl** configured
   ```bash
   kubectl config current-context
   ```

### Quick Start

Navigate to the `k8s/` directory and run the automated deployment:

```bash
cd k8s/
chmod +x deploy.sh
./deploy.sh
```

This will:
- Create a `url-shortener` namespace
- Deploy PostgreSQL, Redis, Kafka (with Zookeeper)
- Run database migrations
- Deploy the FastAPI API (2 replicas with HPA)
- Deploy the analytics worker
- Deploy Prometheus and Grafana for observability
- Configure Ingress and Horizontal Pod Autoscaler

### Access Services

Using **port forwarding** (simplest):

```bash
# API
kubectl port-forward svc/api 8000:8000 -n url-shortener
# Visit: http://localhost:8000/docs

# Grafana (admin/admin_password_k8s)
kubectl port-forward svc/grafana 3000:3000 -n url-shortener

# Prometheus
kubectl port-forward svc/prometheus 9090:9090 -n url-shortener
```

Or use **Ingress** (production-like):
1. Add to `/etc/hosts`: `127.0.0.1 api.local grafana.local prometheus.local`
2. Visit: http://api.local, http://grafana.local, http://prometheus.local

### Cloud-Native Features Demonstrated

| Feature | Value |
|---------|-------|
| **StatefulSets** | Databases and Kafka with stable identities |
| **Deployments** | Horizontally scalable API and worker |
| **ConfigMaps** | Externalized, non-sensitive configuration |
| **Secrets** | Secure credential storage |
| **Probes** | Liveness, readiness, and startup health checks |
| **Ingress** | External traffic routing |
| **HPA** | Auto-scaling API from 2-5 replicas based on CPU/memory |
| **Resource Limits** | Prevent resource starvation |
| **Service Discovery** | Kubernetes DNS for internal pod communication |
| **Jobs** | One-time database migration task |
| **Observability** | Prometheus + Grafana stack integrated |

### Manifest Structure

```
k8s/
├── 0-namespace.yaml              # Namespace isolation
├── 1-configmap.yaml              # Non-sensitive config
├── 2-secrets.yaml                # Database/admin credentials
├── 3-persistent-volumes.yaml     # Durable storage claims
├── 4-db-migrate-job.yaml         # Database initialization
├── 5-ingress.yaml                # External routing
├── 6-hpa.yaml                    # Autoscaling rules
├── api/deployment.yaml           # API + service
├── worker/deployment.yaml        # Analytics worker
├── postgres/statefulset.yaml     # PostgreSQL (5Gi PVC)
├── redis/statefulset.yaml        # Redis (2Gi PVC)
├── kafka/zookeeper.yaml          # Zookeeper coordinator
├── kafka/kafka.yaml              # Kafka broker
├── prometheus/deployment.yaml    # Prometheus monitoring
├── grafana/deployment.yaml       # Grafana dashboards
├── deploy.sh                     # Automation script
└── README.md                     # Detailed guide
```

### Key Design Decisions

1. **Namespace isolation** — All resources in `url-shortener` namespace
2. **ConfigMaps + Secrets** — 12-factor app configuration management
3. **StatefulSets for state** — PostgreSQL, Redis, Kafka maintain identity across restarts
4. **Deployments for stateless** — API and worker scale horizontally
5. **Health probes** — Ensure reliability (liveness/readiness/startup)
6. **HPA** — Scales API 2-5 replicas based on actual load (70% CPU, 80% memory)
7. **Resource requests/limits** — Prevent resource contention
8. **Ingress** — Production-ready external access (optional, requires ingress controller)

### Monitoring in Kubernetes

The same Prometheus + Grafana stack runs in the cluster:
- **Datasource**: Auto-provisioned Prometheus at `prometheus:9090`
- **Dashboard**: Pre-configured with all 8 panels
- **Service Discovery**: Kubernetes API scrape jobs for pods/endpoints

### Troubleshooting

```bash
# Check pod status
kubectl get pods -n url-shortener

# View logs
kubectl logs -f deployment/api -n url-shortener

# Describe a pod for detailed info
kubectl describe pod <pod-name> -n url-shortener

# Access pod shell
kubectl exec -it deployment/api -n url-shortener -- /bin/sh

# Test internal connectivity
kubectl run -it --rm debug --image=busybox --restart=Never -- sh
# Inside: nc -zv api.url-shortener.svc.cluster.local 8000

# Monitor HPA
kubectl get hpa -n url-shortener -w
```

### Remove Everything

```bash
kubectl delete namespace url-shortener
```

See [k8s/README.md](k8s/README.md) for detailed configuration, production hardening, and advanced topics.

Configuration
-------------

Environment variables are read from `.env` and set sensible defaults in `app/core/config.py`.

Key settings:

```python
DB_URL=postgresql://user:pass@localhost:5433/url_db
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
curl -X POST http://localhost:8000/shorten \
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
3. Publishes click event to Kafka `url-events` topic
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
curl http://localhost:8000/urls?limit=10
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
curl http://localhost:8000/analytics/abc123 | jq .
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

The API enforces per-IP rate limiting on write endpoints:

- **POST /shorten**: 20 requests per minute per IP
- **Other endpoints**: No rate limit (reads)

Rate limit exceeded:

```bash
HTTP/1.1 429 Too Many Requests
Retry-After: 60

{
  "detail": "Rate limit exceeded. Try again in 60 seconds."
}
```

**Note:** In the frontend, localhost API calls share the same IP; in production with a reverse proxy, ensure `X-Forwarded-For` or `X-Real-IP` headers are passed correctly.

GitHub Actions CI/CD
-------------------

Automated testing and Docker image building with every push to GitHub.

### Workflow

```
Developer Push
	↓
GitHub Actions (CI)
	├─ Lint (Black, Flake8, isort)
	├─ Type checking (mypy)
	└─ Unit tests (pytest with coverage)
	↓
GitHub Actions (CD)
	├─ Build multi-stage Docker image
	├─ Push to GitHub Container Registry (GHCR)
	└─ Image ready for deployment
```

### Setup

1. Create [Personal Access Token](https://github.com/settings/tokens):
   - Permissions: `write:packages`, `read:packages`, `repo`

2. Add GitHub Secret (Settings → Secrets and variables → Actions):
   - `GHCR_TOKEN` — Personal Access Token from step 1

### Automatic Build & Push

Just push to `master` or `main`:

```bash
git add .
git commit -m "feat: improve cache hit ratio"
git push origin master
```

GitHub Actions will automatically:
1. Run tests and linting
2. Build Docker image
3. Push to GitHub Container Registry (`ghcr.io/owner/repo:main-YYYYMMDD-hash`)
4. Image available for deployment

### Release with Semantic Versioning

Tag your commits for releases:

```bash
git tag v1.2.3
git push origin v1.2.3
```

This triggers the CD pipeline with semantic versioning:
- Image tagged as `ghcr.io/owner/repo:v1.2.3`
- Also tagged as `v1`, `latest`, and `sha-{hash}`
- All previous versions remain in GHCR for reference

### Deploy to Kubernetes

After CD workflow completes and image is pushed to GHCR:

**Local Kubernetes** (Docker Desktop or minikube):
```bash
./k8s/deploy.sh
```

**Cloud Kubernetes** (EKS, GKE, AKS):
1. Update image reference to use GHCR image
2. Authenticate with cloud cluster credentials
3. Deploy using `kubectl apply -f k8s/` or your GitOps tool (ArgoCD)

See [CICD.md](CICD.md) for detailed setup, troubleshooting, and advanced configuration.


Configuration
-------------

Settings are defined in `app/core/config.py` and can be overridden via environment variables.

Common defaults used in development / Docker:

- `DB_URL`: `postgresql://user:pass@localhost:5433/url_db`
- `REDIS_URL`: `redis://localhost:6379/0`
- `KAFKA_BOOTSTRAP_SERVERS`: `localhost:9094`

API Reference
-------------

- POST `/shorten`
	- Body: `{ \"long_url\": \"https://...\" }`
	- Response: `{ \"short_code\": \"abc\" }`
- GET `/{short_code}`
	- 307 Temporary Redirect to the original URL (also publishes a Kafka event)
- GET `/analytics/{short_code}`
	- Returns `{ short_code, total_clicks, timestamps }`
- GET `/health/redis`
	- Health check for Redis connectivity

Batch Analytics Writes
----------------------

The analytics worker no longer writes one database row per Kafka event. Instead, it buffers click events and flushes them in batches for better throughput and lower database overhead.

**How it works:**
- Kafka events are accumulated in memory by the worker.
- When the buffer reaches **100 events**, the worker performs a single batch insert.
- A timeout flush ensures smaller bursts are still persisted promptly.
- Any remaining buffered events are flushed before shutdown.

**Why it matters:**
- Fewer database round-trips
- Lower commit overhead
- Better throughput under traffic spikes
- More realistic production-style ingestion pattern

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

When running `docker compose up`, Grafana is automatically available at:

```
http://localhost:3001
```

**Credentials:**
- Username: `admin`
- Password: `admin`

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

Schema is in `scripts/migrate.sql`. Two tables:

- `urls` — `id`, `short_code`, `long_url`, `created_at`
- `analytics` — `id`, `short_code`, `clicked_at`

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
- Sliding-window rate limiting middleware
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
- **IP spoofing**: Each VU spoofs a different IP (192.168.1.100 - 192.168.1.109) via `X-Forwarded-For` header, so each gets its own rate limit bucket
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
- Shorten (write-heavy, rate-limited): will hit 20 req/min/IP limit at ~300 VUs
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
- **Shorten endpoint hits rate limit** (intentional: 20 req/min/IP protects the database from write overload)
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
curl -s -X POST http://localhost:8000/shorten \\
	-H "Content-Type: application/json" \\
	-d '{"long_url":"https://example.com"}'
```
2. Visit the short URL (follows redirect)
```bash
curl -i http://localhost:8000/<short_code>
```
3. Check analytics
```bash
curl http://localhost:8000/analytics/<short_code> | jq .
```

Troubleshooting
---------------

- `ModuleNotFoundError: No module named 'app'` — run `uvicorn` from project root:

```bash
.venv/bin/uvicorn app.main:app --reload
```

- Port conflicts (8000, 5432, 6379, 9094):

```bash
lsof -nP -iTCP:8000 -sTCP:LISTEN
docker compose ps
```

- `NoBrokersAvailable` from `kafka-python`: ensure Kafka/Zookeeper are up and `KAFKA_BOOTSTRAP_SERVERS` is correct.

- Missing packages: activate `.venv` then `pip install -r requirements.txt`.

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
   - Grafana: http://localhost:3001 (admin/admin)

### For Contributions

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m "feat: add your feature"`
4. Push to branch: `git push origin feature/your-feature`
5. Open a Pull Request

**Before submitting:**
- Run tests: `pytest`
- Format code: `black app/`
- Check types: `mypy app/`
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


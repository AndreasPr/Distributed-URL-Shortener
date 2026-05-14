# Distributed URL Shortener

Production-oriented URL shortener showcasing an event-driven architecture with caching, persistent storage, and analytics streaming.

Tech stack: 
- Python 
- FastAPI
- Uvicorn
- SQLAlchemy
- PostgreSQL
- SQL
- Redis
- Kafka (Confluent)
- kafka-python
- Prometheus
- prometheus-client
- prometheus-fastapi-instrumentator
- Docker & Docker Compose


Table of Contents
-----------------
- Project summary
- Architecture
- Repository layout
- Quick start (local)
- Full stack with Docker Compose
- Configuration
- API reference
- Rate limiting
- Batch analytics writes
- Database
- Testing & verification
- Troubleshooting
- Developer notes
- License & contact

Project summary
---------------

- Generates compact short codes for long URLs.
- Fast redirects using a Redis cache and asynchronous analytics via Kafka.
- Background worker consumes click events and writes analytics to PostgreSQL in batches.

Architecture
------------

User → HTTP (FastAPI)
	- POST `/shorten` → create URL record (DB) → return `short_code`
	- GET `/{code}` → check Redis cache → DB fallback → 307 redirect + publish Kafka click event

Kafka → topic `url-events` → analytics worker consumes → inserts into `analytics` table (Postgres)
Redis → cache `short_code` → `long_url` mapping (TTL)
Postgres → durable store for `urls` and `analytics`

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

This means the system now behaves more like a real event pipeline: fast writes to Kafka on the request path, then efficient batched persistence in the analytics worker.

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
.venv/bin/uvicorn app.main:app --reload
```

6. Run the analytics worker in another terminal:

```bash
.venv/bin/python -m app.workers.analytics_worker
```

Now you can create short URLs, hit them to generate clicks, and query analytics.

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

Configuration
-------------

Settings are defined in `app/core/config.py` and can be overridden via environment variables.

Common defaults used in development / Docker:

- `DB_URL`: `postgresql://user:pass@localhost:5433/url_db`
- `REDIS_URL`: `redis://localhost:6380/0`
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

Rate Limiting
-------------

A distributed, sliding-window rate limiter protects against abuse and ensures fair resource usage across instances.

**Strategy:**
- Redis-backed (atomic, shared across API instances)
- Per-IP address + per-route
- Sliding 60-second window for smooth traffic control

**Current limits:**
- POST `/shorten` — **20 requests per 60 seconds** (strict for write operations)
- All other routes — **100 requests per 60 seconds**

**Rate limit response (HTTP 429):**

```json
{
  "error": "Rate limit exceeded",
  "path": "/shorten",
  "limit": 20,
  "window_seconds": 60,
  "retry_after_seconds": 45
}
```

**Response headers:**
- `Retry-After`: Seconds to wait before retrying
- `X-RateLimit-Limit`: Current route limit
- `X-RateLimit-Remaining`: Requests remaining in window (on success)

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

Local Prometheus:

```bash
docker compose up -d prometheus
```


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

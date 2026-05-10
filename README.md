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
- Database
- Testing & verification
- Troubleshooting
- Developer notes
- License & contact

Project summary
---------------

- Generates compact short codes for long URLs.
- Fast redirects using a Redis cache and asynchronous analytics via Kafka.
- Background worker consumes click events and writes analytics to PostgreSQL.

Architecture
------------

User → HTTP (FastAPI)
	- POST `/shorten` → create URL record (DB) → return `short_code`
	- GET `/{code}` → check Redis cache → DB fallback → 307 redirect + publish Kafka click event

Kafka → topic `url-events` → analytics worker consumes → inserts into `analytics` table (Postgres)
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

4. Apply DB migration (one-time):

```bash
cat scripts/migrate.sql | docker exec -i url_shortener_db psql -U user -d url_db
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

To run everything in containers (API + worker + infra):

```bash
docker compose up --build
# or detached
docker compose up -d
```

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


Database
--------

Schema is in `scripts/migrate.sql`. Two tables:

- `urls` — `id`, `short_code`, `long_url`, `created_at`
- `analytics` — `id`, `short_code`, `clicked_at`

Testing & verification
----------------------

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

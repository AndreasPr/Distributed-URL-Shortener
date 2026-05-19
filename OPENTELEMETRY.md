# OpenTelemetry Distributed Tracing Guide

Complete guide to understanding and using distributed tracing in the URL Shortener project.

## What I've Built

A production-grade observability stack combining:

- **OpenTelemetry**: Instrumentation framework
- **Jaeger**: Trace storage and visualization
- **Prometheus**: Metrics collection
- **Grafana**: Metrics visualization

## The Observability Stack

```
┌─────────────────────────────────────────────────────────────┐
│                   Your Application                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  FastAPI API                                                │
│    ↓ spans for HTTP endpoints                               │
│  Redis Cache                                                │
│    ↓ auto-instrumented (all Redis calls traced)             │
│  PostgreSQL Database                                        │
│    ↓ auto-instrumented (all SQL queries traced)             │
│  Kafka Producer                                             │
│    ↓ custom spans for events                                │
│  Analytics Worker                                           │
│    ↓ custom spans for batch operations                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
          ↓                 ↓              ↓
    Traces sent        Metrics sent    Logs with
    via UDP/HTTP        (Prometheus)    Trace ID
          ↓                 ↓              ↓
    ┌──────────┐       ┌──────────┐   ┌──────────┐
    │ Jaeger   │       │Prometheus│   │  Logs    │
    │ Storage  │       │ Scraper  │   │  Files   │
    └──────────┘       └──────────┘   └──────────┘
          ↓                 ↓              ↓
    ┌──────────┐       ┌──────────┐   ┌─────────────┐
    │ Jaeger   │       │ Grafana  │   │ (correlated │
    │   UI     │       │(visualize│   │ with spans) │
    │(traces)  │       │ metrics) │   └─────────────┘ 
    └──────────┘       └──────────┘     
```

## Key Concepts

### Traces vs Metrics

| Aspect | Metrics | Traces |
|--------|---------|--------|
| **Question** | "How much?" / "How fast?" | "Why is it slow?" |
| **Example** | Response time: 234ms | HTTP → Redis (50ms) → DB (180ms) |
| **Granularity** | Aggregate numbers | Request-level detail |
| **Use Case** | SLOs, alerting | Debugging slow requests |

### Spans

A **span** is a unit of work in a trace.

```
Trace (entire request lifecycle):
├─ Span 1: HTTP request (200ms)
│  ├─ Span 2: Cache lookup (10ms)
│  ├─ Span 3: Database query (150ms)
│  ├─ Span 4: Kafka publish (30ms)
│  └─ Span 5: Response serialization (10ms)
```

### Auto-Instrumentation

Automatically traces key library calls without code changes:

- **FastAPI**: HTTP requests, responses
- **Redis**: GET, SET, DELETE operations
- **SQLAlchemy**: SQL queries
- **Requests**: HTTP client calls

### Custom Spans

You add these to trace business logic:

```python
with tracer.start_as_current_span("url.shorten") as span:
    span.set_attribute("url.input", long_url)
    # ... business logic ...
    span.set_attribute("url.code", code)
```


## Running the Stack

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Start Services

```bash
docker compose up -d
```

Services available:
- **API**: http://localhost:8000
- **Jaeger UI**: http://localhost:16686
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)

### 3. Generate Traffic

Create and redirect URLs:

```bash
# Create a short URL
curl -X POST http://localhost:8000/shorten \
  -H "Content-Type: application/json" \
  -d '{"long_url":"https://github.com/very/long/url/example"}'

# Response: {"short_code":"hello890"}

# Redirect (generates a trace)
curl -L http://localhost:8000/hello890
```

### 4. View Traces in Jaeger

1. Open http://localhost:16686
2. Select **Service**: `url-shortener-api`
3. Click **Find Traces**
4. Click on a trace to see the full span hierarchy

## Understanding a Trace

### Example: URL Shortening Request

```
Trace: POST /shorten (total: 250ms)
├─ fastapi.request (250ms)
│  └─ http.server.request (245ms)
│     ├─ url.shorten (custom span) (240ms)
│     │  └─ db.execute (175ms) [SQLAlchemy auto-instrumented]
│     │     └─ postgresql.execute (170ms)
│     └─ response.serialization (5ms)
```

**What this tells you:**
- Total request: 250ms
- Database is the bottleneck: 175ms / 250ms = 70%
- Action: Optimize database queries or add caching

### Example: URL Resolution with Cache

```
Trace: GET /{code} (total: 15ms)
├─ fastapi.request (15ms)
│  └─ http.server.request (14ms)
│     ├─ url.resolve (custom span) (12ms)
│     │  ├─ cache.get (2ms) [auto-instrumented Redis]
│     │  │  └─ redis.get (1ms)
│     │  └─ kafka.publish (8ms) [custom span]
│     │     └─ kafka.send (7ms) [auto-instrumented]
│     └─ response (2ms)
```

**What this tells you:**
- Cache hit: 2ms to get from Redis
- No database query (cache worked!)
- Kafka publish takes 8ms

## Viewing Trace Details

In Jaeger UI, click on a trace to see:

1. **Timeline**: Visual span timeline with durations
2. **JSON**: Raw span data with all attributes
3. **Tags**: Custom attributes you set (e.g., `url.code`, `cache.hit`)
4. **Logs**: Structured logs attached to spans
5. **Links**: Relationships between spans

### Search Traces

```
Service: url-shortener-api
Operation: POST /shorten
Tags: http.status_code=200
Min duration: 100ms
Max duration: 500ms
```

Jaeger supports powerful queries to find specific traces.

## Trace ID Correlation with Logs

Logs now include trace IDs automatically

**Same trace ID across all log lines!**

This is called **observability correlation** — matching logs with traces.

### Finding a Trace from a Log

1. Copy trace ID from log: `csk42clqa...`
2. Go to Jaeger UI
3. Paste in trace search

Instantly see the full trace for that request!

## Advanced: Kafka Tracing

The Kafka producer adds trace context:

```python
with tracer.start_as_current_span("kafka.publish") as span:
    span.set_attribute("kafka.topic", "url-events")
    span.set_attribute("url.code", short_code)
    producer.send(TOPIC, event)
```

In Jaeger, you'll see:
- Where Kafka publish happens in the timeline
- How long it takes
- Whether it succeeded or failed

The analytics worker continues the trace:

```python
with tracer.start_as_current_span("analytics_worker.run"):
    # Process Kafka events
    # This span is linked to the original request's trace
```

This allows end-to-end tracing: **Request → Kafka → Worker → Database**

## Performance Considerations

### Sampling

For high-traffic applications, trace every request can be expensive. Use sampling:

```python
tracer_provider.add_span_processor(
    BatchSpanProcessor(
        jaeger_exporter,
        sampler=TraceSampler(sample_rate=0.1)  # Trace 10% of requests
    )
)
```

### Span Processor Batching

Traces are batched before sending to Jaeger:
- **Default**: 2048 spans per batch
- **Latency**: ~5 seconds max before flush

This minimizes network overhead while maintaining low latency.

## Configuration

Environment variables control tracing:

```bash
JAEGER_AGENT_HOST=localhost       # Where to send traces
JAEGER_AGENT_PORT=6831            # Jaeger agent port
```

In Jaeger's all-in-one container:
- Agent listens on `6831/udp` for trace data
- UI runs on `16686`
- Traces stored in memory (can configure Elasticsearch for persistence)

## Real-World Use Cases

### 1. Find Slow Requests

Jaeger query: `http.status_code=200 AND duration > 1000ms`

See all requests slower than 1 second.

### 2. Debug Errors

Jaeger query: `http.status_code=500`

See all failed requests with full trace.

### 3. Track Kafka Messages

Search traces where `kafka.topic="url-events"`

Follow message from API → Kafka → Worker

### 4. Database Performance

Filter spans: `component=db` or `db.operation=SELECT`

Identify slow queries.

## ✅ Verification Checklist

- [ ] Dependencies installed: `pip install -r requirements.txt`
- [ ] Jaeger running: `docker compose up jaeger`
- [ ] API starts without errors: `docker compose up api`
- [ ] Jaeger UI accessible: http://localhost:16686
- [ ] Created at least one short URL
- [ ] See traces in Jaeger UI
- [ ] Trace includes span hierarchy
- [ ] Log messages include trace ID

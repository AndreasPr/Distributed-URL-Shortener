# Run and verify abuse review

Apply migration **0005** before running the updated API or workers. It creates
`url_verdicts` and `abuse_outbox`; no existing links are classified automatically.
Do not downgrade while the new API is serving requests. Model selection, privacy
and local-only setup are described in [llm.md](llm.md).

## Docker Compose

Keep your existing credentials/volumes. Choose exactly one profile:

```bash
docker compose --profile redis-streams up -d --build
# Or: docker compose --profile kafka up -d --build
```

The migration service runs first. Redis Streams starts `abuse-worker-redis`; Kafka
starts `abuse-worker`. The new worker uses the same event adapter as the API and
analytics worker but a different topic/group. Metrics are on internal port 8003,
scraped by Prometheus; they are not published on the host. No application logic
fetches the destination URL. HTTP inference calls contact only the selected model
service. No tools are provided to a model.

Default `LLM_PROVIDER=fake` requires no credentials and makes gray-zone links
suspicious with llm_invalid_output. For a real local model, set `LLM_PROVIDER=ollama`,
`OLLAMA_MODEL` to your installed model and, for Docker Desktop,
`OLLAMA_BASE_URL=http://host.docker.internal:11434` in your local environment/.env.
An existing host-only `http://localhost:11434` value will not reach your Mac from a
container. Keep Ollama cloud disabled. Worker environment passes Gemini key/model
only if you explicitly configure them; only send non-sensitive data. Paths can
contain sensitive information even after query removal. Claude is not configured
in the free-only Compose workflow. Do not put keys in frontend variables.

Controls (same topic names must be used by all worker replicas):

| Variable | Default | Meaning |
| --- | --- | --- |
| ABUSE_TOPIC | url-created | Creation events |
| ABUSE_GROUP | abuse-group | Shared consumer group |
| ABUSE_DLQ_TOPIC | abuse-dlq | Invalid event envelopes |
| ABUSE_GRAY_LOW | 0.25 | Scores below this skip inference as clean |
| ABUSE_GRAY_HIGH | 0.75 | Scores at/above this skip inference as malicious |
| ABUSE_VERDICT_TTL | 3600 | Contextual domain cache seconds |
| ABUSE_LLM_INPUT_LIMIT | 512 | Host+path characters before JSON quoting |
| ABUSE_METRICS_PORT | 8003 | Host-run worker metric port |

All step 4.1 LLM retry, timeout, output-token, concurrency and daily-budget settings
apply. Code changes to heuristics/prompt semantics should bump the cache namespace
(`abuse:v1`) or wait for its TTL; changing model/threshold values changes the key.

## Demonstration

1. Run `make check`, `make frontend-check`, `make mcp-test`.
2. Start one Compose profile and create an admin key with the existing
   `python -m app.cli keys create` CLI (see `--help` for flags); keep the key private.
3. Through the frontend or POST /shorten, create synthetic examples:
   - `https://example.com/`: low-risk clean.
   - `https://example.com/login`: gray-zone suspicious with default Fake.
   - `https://paypal.a.b.c.d.example.zip/login`: high-risk malicious.
   Do not visit the destination; these examples need no page to exist.
4. Wait for the abuse worker, then request only the short link without following
   redirects (`curl -i http://localhost:8000/CODE`). Expect 307 for suspicious and
   451 for malicious. There is an initial 307 window before the verdict commits.
5. In the frontend's in-memory settings enter your **admin** key. Open `/flagged`,
   refresh, inspect reasons, then Allow or Block. Allowed links return 307; blocked
   links return 451. Reviewed links disappear from the unreviewed queue.
6. Stop the abuse worker, create another link, and restart it: outbox rows are
   retained in PostgreSQL until the worker publishes them. No in-process queue
   is relied upon for security work. Check both outbox and broker gauges.

Metrics: `abuse_checks_total{verdict,source}` counts committed new verdicts,
`llm_calls_saved_total` counts heuristic/cache bypasses, and
`abuse_queue_size{kind="outbox"|"broker"}` shows unpublished rows and broker
unread+pending work (Kafka uncommitted offsets). Read outbox gauges with max across
replicas; Redis group backlog also uses max, not sum. Gauges refresh every five
seconds between processing calls; long inference/outages can leave stale values.
The short code and domain are not metric labels. Existing alerts do not yet cover
this new worker's queue; inspect its target and metrics explicitly.

## Kubernetes

`k8s/deploy.sh` includes the new hardened abuse worker and its NetworkPolicies.
Run the migration Job with the rebuilt image first, then deploy updated API and
workers. `k8s/abuse-worker/deployment.yaml` defaults to Fake. Its headless metrics
Service is scraped per pod. Default-deny plus explicit policies allow only DNS,
PostgreSQL, Redis, Kafka and inbound Prometheus scrapes. Public model endpoints
and arbitrary destination pages remain unreachable. Remote model setup would
need a deliberate restricted egress design; do not open unrestricted egress.
Topics default consistently with the API; configure ABUSE_TOPIC/ABUSE_GROUP/
ABUSE_DLQ_TOPIC explicitly on workers if changing defaults. This step does not
create a model server or a paid account. Traces use service.name=abuse-worker;
OTLP export also requires a configured reachable endpoint and permitted egress.

## Failure semantics and limitations

- Missing/unprocessed verdict: redirect normally. Pending links are not yet safe.
- Gray-zone malformed output, missing model, quota or timeout: suspicious/review.
- Redis cache unavailable: compute a fresh verdict; redirect enforcement uses DB.
- PostgreSQL unavailable: no verdict ack and no bypass of existing redirect DB checks.
- Duplicate event: no overwrite of verdict or admin review.
- Suspicious/brand/TLD features are indicators, not verified maliciousness. A model
  can still return an incorrect schema-valid verdict. Only human review can clear
  gray-zone heuristic concerns. No guarantee of prompt-injection immunity is made.
- Replays of poison envelopes go to the separate abuse DLQ; the existing analytics
  DLQ CLI defaults to analytics settings and is not an abuse review interface.

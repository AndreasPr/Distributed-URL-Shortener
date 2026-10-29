# 0026: Isolated repeatable local demo

## Context

The demo target was a placeholder. Recording the normal stack risks altering existing
links, credentials or rate limits, and a fresh clone has neither a .venv nor frontend
node_modules. Repeatable aliases/history are useful, but fixed API credentials are unsafe.

## Decision

Overlay the root Compose baseline in project shortener-demo, use Redis Streams and the
FakeProvider, and build the existing frontend image. Publish loopback-only alternative
ports, with private Postgres/Redis ports. A standard-library Python bootstrap needs only
Docker/Compose and Python, explicitly migrates/waits for readiness, and captures key
creation internally before displaying each raw key once. It never inherits project DB/LLM
variables or reads root .env. Generated DB/Grafana secrets live in ignored mode-0600 state.

Use guarded, empty-database-only SQLAlchemy fixtures for 30 named aliases, 115 historical
clicks and six heuristic review verdicts. This keeps recordings stable without waiting for
rate limits or pretending fabricated history was measured. Six subsequent real HTTP 307s
must reach the running Streams analytics worker before startup succeeds. The five-token
write limit is isolated to the demo; public API behavior remains the application's own.
No heavy seed runtime dependency is introduced. Seeds are mounted read-only into the demo
API image, not copied into the production image.

Prefer fixed fixture aliases/counts and relative timestamps over fully random data or
ancient absolute dates. Event IDs for fixtures are stable; keys and live click event IDs
remain random. Repeated make demo refuses to overwrite existing state. Cleanup checks
checkout ownership and deletes only demo resources; images/build cache are retained.

## Consequences

Docker builds can be slow and need registry access; specified ports must be free. The
frontend uses its existing Dockerfile and known dependency limitations. Fixture verdicts
are not proof of live-model detection and synthetic click rows are not throughput evidence.
The walkthrough clearly distinguishes graceful worker-stop recovery from arbitrary crashes.
A 3-minute recording allocates 30 seconds to architecture, 90 seconds to prepared actions,
and a full final minute to limitations; setup and waiting are outside the recording.
Failing startup leaves isolated resources for inspection and explicit make demo-down.
No cloud credentials, paid services or live provider calls are required.

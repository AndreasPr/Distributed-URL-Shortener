# ADR 0008: bounded requests and least-privilege deployment

Status: accepted.

We need security defaults that remain usable with free local tools. We buffer
at most MAX_REQUEST_BODY_BYTES (default 16384) before dispatch, including
chunked requests, and bound body reads to ten seconds. This is simpler to
reason about than throwing from a receive wrapper after a handler has started.
It deliberately does not support large uploads. Validation keeps the existing
`detail` envelope but removes input/context; unexpected failures return generic
500 JSON. Exact HTTP(S) CORS origins are required; production must explicitly
set them. CORS is not authentication.

Database connections/pool acquisition and statements are bounded (5 seconds,
lock acquisition 2 seconds); migrations allow 60-second statements and 5-second
locks. Redis retries are disabled at the transport layer where the worker
already owns retries. Kafka requests and explicit commits/close have deadlines.
Browser requests use a ten-second AbortSignal, including body consumption.
Jaeger collector export has a five-second timeout. These are per-operation
bounds, not a single end-to-end request deadline; DNS/OS scheduling can add time.
MCP HTTP clients already specify timeouts.

We use non-root, runtime-only multi-stage backend images and a /livez
healthcheck; worker and migration Compose services disable that HTTP check.
Kubernetes uses default-deny networking, explicit dependency flows, seccomp,
resource bounds and read-only roots with writable volumes. Kafka/Zookeeper
retain writable roots for vendor startup scripts instead of untested template
mounts. Prometheus uses existing static targets instead of broad cluster RBAC.
Existing cluster RBAC objects must be removed explicitly during upgrade.

Static frontend CSP permits inline scripts/styles for Next hydration; per-request
nonces would require a larger rendering change. Production disallows eval and
uses an exact API origin. The frontend runtime now copies next.config.js so
headers are actually configured in the image. Node is pinned to 22.23.4,
verified in the [official release](https://github.com/nodejs/nodejs.org/blob/main/apps/site/pages/en/blog/release/v22.23.4.md);
its image build and non-root/read-only HTTP smoke test passed. Backend Python remains 3.11.14.

pip-audit 2.10.1 is a development-only dependency ([release](https://pypi.org/project/pip-audit/)).
Dependabot proposes updates; no automatic merges or paid scanner is introduced.

The production npm version rejected the previous picomatch lock layout. The lock
was regenerated with Node 22.23.4/npm 10.9.9, keeping declared dependency ranges
unchanged. Frontend build contexts exclude local environment files and artifacts.
The dependency audit reports existing vulnerabilities; framework/OTel upgrades
remain follow-up work, with findings retained in the verification record.

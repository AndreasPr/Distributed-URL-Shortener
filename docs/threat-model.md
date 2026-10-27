# Threat model: URL shortener

Scope: the API, browser frontend, PostgreSQL, Redis, Kafka/Redis Streams,
analytics worker and Kubernetes monitoring. This is a portfolio deployment,
not a claim of production certification. The controls below are implemented;
cluster enforcement and operational controls still need deployment validation.

## Assets and trust boundaries

Assets include API keys, destination URLs (which can contain sensitive queries),
ownership records, click analytics, database credentials, availability and the
shortener's reputation. The browser and all request headers are untrusted.
The ingress terminates the public boundary; the API authenticates protected
operations. PostgreSQL is authoritative, Redis is a disposable cache and rate
limit store, and the broker transports untrusted event payloads. The worker
crosses the broker/database boundary. Operators with CLI, Docker, Kubernetes
or database access are privileged. Monitoring is an internal administrative
surface; browser-held API keys are never a server-side secret.

## Attacker goals and implemented controls

| Goal | Controls and evidence | Residual risk |
| --- | --- | --- |
| Phishing abuse | [URL validation](../app/schemas/url_schema.py), scoped creation and soft deletion in [routes](../app/api/routes.py); [URL feature tests](../tests/test_url_features.py) | Valid public HTTPS sites can still be malicious. The [async abuse pipeline](abuse-pipeline.md) adds offline heuristics and admin review; pending links still redirect, and classifiers can produce false positives/negatives. No destination fetching or reputation feed is implemented. |
| Link enumeration | Random seven-character codes, unique database constraint and bounded retries in [generator](../app/services/code_generator.py) and [repository](../app/repositories/url_repository.py); [tests](../tests/test_code_generation.py) | Codes are public identifiers, not authorization. Custom aliases are guessable; IP limits can be distributed around. |
| SSRF/internal navigation | HTTP(S)-only validation rejects credentials, local names and nonpublic literal IP addresses. Kubernetes [egress policies](../k8s/base/7-network-policies.yaml) restrict API/worker connections to dependencies and DNS. | The backend does not fetch destinations. Hostnames can resolve/rebind to private addresses in a visitor's browser. DNS resolution is not a complete destination safety guarantee. |
| Resource exhaustion | [Body middleware](../app/middleware/hardening.py) caps actual bytes at 16 KiB and body reading at ten seconds, including chunked input. [Token buckets](../app/middleware/rate_limiter.py), bounded event queue, cache single-flight, database/socket deadlines and container limits constrain work. [Hardening tests](../tests/test_hardening.py) cover boundary failures. | Many parallel connections, large response lists, expensive queries and distributed attackers can still exhaust capacity. Add ingress connection limits and pagination as later work. |
| Key theft or privilege escalation | [Key service](../app/services/api_keys.py) stores SHA-256 hashes, compares in constant time and supports revocation; [auth tests](../tests/test_auth.py). Browser keys remain in memory. Exact CORS origins, [frontend headers](../frontend/next.config.js), non-root containers and dropped capabilities reduce exposure. | No tenant ownership isolation: scoped keys operate on shared workspace data. TLS must be configured at ingress. XSS can steal in-memory keys. Static CSP retains unsafe-inline for Next hydration/styles; nonce-based CSP is deferred. |
| Information disclosure | Validation responses omit submitted input/context; unexpected errors return generic JSON. Redis health errors no longer echo exceptions. URL tracing redacts paths/queries. [Assembly tests](../tests/test_app_assembly.py) and [trace tests](../tests/test_trace_privacy.py) cover these contracts. | Operational exception logs may contain dependency details; restrict log access and retention. Public local metrics and health reveal operational information. Kubernetes metrics ports are restricted to Prometheus. |
| Supply-chain compromise | Hashed Python locks, npm lock, runtime-only backend dependencies, [Dependabot](../.github/dependabot.yml), and `make audit` using pip-audit. | Pins are not proof of safety. Audit requires network access, covers known Python advisories only, and is not an image or npm audit. Review updates and regenerate locks before merging. |

## Operational boundaries and exceptions

All Kubernetes containers have resource requests/limits, non-root execution,
RuntimeDefault seccomp and no privilege escalation. Root filesystems are read
only except Kafka/Zookeeper, whose supplied images generate writable runtime
configuration. Writable data/cache/tmp volumes remain intentional. Database
volume ownership must match the image user; hostPath provisioners may not apply
fsGroup. Containers still share the host kernel.

NetworkPolicies default-deny both directions and allow explicit dependency,
DNS, ingress-controller and metrics flows. They require a policy-capable CNI;
see the [Kubernetes policy documentation](https://kubernetes.io/docs/concepts/services-networking/network-policies/).
No network encryption or broker authentication is added. DNS is still an egress
channel. Prometheus now uses static service targets and no service-account
credentials; cluster-wide discovery is removed. Grafana plugin downloads and
external telemetry are blocked. An external trace collector needs an explicit,
narrow egress rule before enabling it.

See [deployment caveats and verification](security-hardening-verification.md)
for what was actually run. Live cluster enforcement and vulnerability auditing
must not be inferred from passing mock/static tests.

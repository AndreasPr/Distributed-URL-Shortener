# LLM classification layer

`app/llm/` provides synchronous `classify_json(system_prompt, user_content, schema)`.
The result has `.value` (your validated Pydantic model) and `.metadata` (provider,
model, elapsed milliseconds, input/output tokens when reported). No application
route or worker calls it yet; do not put blocking model calls on the redirect path.
No SDK/dependency change is necessary: the adapters use the existing pinned requests.

## Local setup and example

Settings read **exported environment variables at process startup**, not `.env`
automatically. Compose's `.env` substitution does not pass arbitrary variables to
containers; this layer is currently intended for host-run code. Keep keys in your
private environment; never put them in frontend variables or committed files.

Default provider is `fake`, which performs no network activity. Supply deterministic
JSON explicitly for required schema fields; its default `{}` works with models
whose fields have defaults. It validates exactly like the real providers:

```python
from pydantic import BaseModel, ConfigDict
from app.llm.providers import FakeProvider

class Verdict(BaseModel):
    model_config = ConfigDict(extra="forbid")
    safe: bool

result = FakeProvider('{"safe":true}').classify_json(
    "Classify this synthetic text.", "Example content", Verdict
)
print(result.value.safe, result.metadata)
```

For configured providers, replace construction with `from app.llm import
get_provider` and `provider = get_provider()`. The factory accepts
`LLM_PROVIDER=fake|gemini|ollama|claude`. Real model names have **no defaults**.
Pydantic strict validation rejects coercion; use `extra="forbid"` when unknown
fields must be rejected. Provider JSON Schema subsets can reject complex schemas;
start with a small object and test it offline.

## Gemini free tier

1. Follow Google's [API-key instructions](https://ai.google.dev/gemini-api/docs/api-key)
   to create a key in [Google AI Studio](https://aistudio.google.com/apikey).
2. Use a project without billing enabled and verify the selected model has a free
   tier in the [current pricing table](https://ai.google.dev/gemini-api/docs/pricing).
   Availability, quotas and supported models vary. Do not enable billing or create
   a paid fallback for this project. A local request budget cannot verify your
   Google account's billing status or enforce a provider-wide quota.
3. Export `LLM_PROVIDER=gemini`, `GEMINI_API_KEY` privately, and `GEMINI_MODEL` using
   the exact supported model identifier from AI Studio (without a `models/` prefix).
4. Start with a low `LLM_DAILY_BUDGET`, for example `10`. No model is hardcoded here.

**Only send non-sensitive, synthetic or deliberately sanitized data.** Google's
free tier may use prompts and outputs to improve products; see the pricing table
and [terms](https://ai.google.dev/gemini-api/terms). Never send full private URLs,
query strings, API keys, bearer tokens, personal information or production content.
Telemetry suppression is not content sanitization: callers must minimize content
before calling this layer. The adapter sends the key as a header, not in the URL.
[Structured-output reference](https://ai.google.dev/gemini-api/docs/structured-output).

## Ollama on this Mac

This machine reports Apple Silicon (arm64) and 32 GiB RAM. Start with the local
instruction-tuned [llama3.2:1b](https://ollama.com/library/llama3.2:1b) model (about
1.3 GB download). It leaves room for Docker; actual runtime memory also depends on
context length. This is a small demonstration model, not evidence of accurate
abuse classification.

1. Install the macOS app from the [official download](https://ollama.com/download/mac)
   and open it, following the [quickstart](https://docs.ollama.com/quickstart).
2. Choose local models; do not sign up for a cloud service. Disable cloud features
   using `OLLAMA_NO_CLOUD=1` in the Ollama server's environment (restart that server).
   See the [official cloud configuration](https://github.com/ollama/ollama/blob/main/docs/cloud.mdx).
3. Pull the model and set the application's variables:

   ```bash
   ollama pull llama3.2:1b
   export LLM_PROVIDER=ollama
   export OLLAMA_BASE_URL=http://localhost:11434
   export OLLAMA_MODEL=llama3.2:1b
   export LLM_TIMEOUT_SECONDS=30
   ```

4. If the app is not serving, start `OLLAMA_NO_CLOUD=1 ollama serve` in another
   terminal. Do not start a second server if the app already owns port 11434.
5. Run your host-side classification using `get_provider()`. Local generation may
   need a longer timeout on cold load. Models remain on your machine after download.

The adapter only accepts loopback, `host.docker.internal`, or `ollama` hostnames,
and rejects cloud-tagged model names. These checks are not a firewall: trusted
local server configuration must keep cloud forwarding disabled. Docker Desktop
clients can use `http://host.docker.internal:11434` if explicitly configured and
reachable. Do not expose an unauthenticated Ollama server publicly.
[Structured outputs](https://docs.ollama.com/capabilities/structured-outputs).

## Claude compatibility only

`ClaudeProvider` raises `NotConfigured` without both `ANTHROPIC_API_KEY` and
`ANTHROPIC_MODEL`. It is an explicit compatibility extension requested for this
project, **not a free-tier recommendation**; do not configure or call it as part
of the free-only setup. There is no automatic provider fallback. Tests replay the
checked-in representative Messages response in `tests/fixtures/llm/`; it was
constructed from the documented response contract, not captured from a paid call.
[Messages structured output](https://platform.claude.com/docs/en/build-with-claude/structured-outputs).

## Limits, failures and telemetry

- All default instances share one thread-safe semaphore and UTC daily budget
  **per Python process**, across providers. Explicit `Limits` injection is for
  isolation in tests. Workers/replicas each have their own allowance. Restarting
  resets the in-memory budget; this is not durable or a deployment-wide cost cap.
- Every outbound attempt consumes one request, including 429/5xx retries, timeouts,
  and repair. Fake attempts consume it too. `0` disables attempts. Exhaustion raises
  `BudgetExceeded`; no refunds or provider fallback. UTC rollover resets on the
  next reservation; clock rollback does not reset the budget.
- `LLM_CONCURRENCY=2`, `LLM_DAILY_BUDGET=100` by default. Queue admission has the
  configured timeout. A classification holds its slot during retry/repair waits.
- Connect timeout is at most 3 seconds; socket read inactivity timeout is
  `LLM_TIMEOUT_SECONDS` (15 by default). Response chunks check an elapsed deadline
  and a 1 MiB cap. This is not a hard interrupt of DNS or an in-progress socket read;
  a read may finish after the deadline before it is checked. Callers should not
  interpret it as a strict whole-classification wall-clock limit.
- Only HTTP 429/5xx retry, up to `LLM_MAX_RETRIES=2` (maximum configurable 5), with
  exponential equal jitter starting at `LLM_BACKOFF_SECONDS=0.25`. Other statuses,
  connection errors and timeouts fail immediately. No redirects or ambient proxies.
- Invalid JSON/schema/envelopes get **one** repair generation, requesting valid JSON
  again with the original input and schema. It does not echo invalid output/errors.
  Each generation has its own bounded transient retries. Persistent invalid output
  raises `InvalidOutput`. Output length is capped at `LLM_MAX_OUTPUT_TOKENS=512`.
- No full prompts, outputs, keys or upstream error bodies are logged. HTTP automatic
  tracing is suppressed for these requests. Exceptions are sanitized; do not enable
  wire/debug body logging in deployment. Latency includes admission/backoff/repair.
  Token metadata sums reported usage across successful HTTP generations including
  repair; it cannot account for upstream attempts without usage data.
- Metrics: `llm_requests_total{provider}` counts attempts; `llm_errors_total` uses
  bounded provider/kind labels; `llm_latency_seconds` observes classification time;
  `llm_budget_remaining` reflects the process budget, refreshed on reservations.
  NotConfigured is raised before admission; it is not an outbound attempt metric.

Run `make check`, or `.venv/bin/python -m pytest tests/test_llm.py` for this layer.
All LLM HTTP requests are intercepted by test fakes; no live model calls, credentials
or local model installation are needed. This verifies contracts, not model quality
or current live API availability.

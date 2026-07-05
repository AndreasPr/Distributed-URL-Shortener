# MCP Server for Abuse Flagging

This MCP server adds an abuse-detection workflow for the distributed URL shortener.
It uses three data sources:

- **Project data**: Postgres and Redis signals from the URL shortener runtime.
- **GitHub**: recent commits/PRs in this repository to correlate suspicious activity with recent code changes.
- **Slack**: alerts flagged URLs to a human review channel.

## Primary Workflow

The main tool is `CheckSuspiciousUrlActivityTool`.
An agent asks it to check suspicious URL activity in a time window.
The tool:

1. Reads click velocity, cache health, and rate-limit triggers from the app's own Postgres/Redis.
2. Fetches recent GitHub commits and filters by relevant paths.
3. Flags suspicious URLs based on configured thresholds.
4. Optionally posts a Slack report if `MCP_SLACK_POST_ENABLED=true`.

## Local setup

1. Create a Python virtual environment.
2. Install dependencies:
   ```bash
   python -m pip install -r requirements.txt
   ```
3. Copy `.env.example` to `.env` and populate secrets.
4. Run the MCP server:
   ```bash
   .venv/bin/python -m mcp_server.app
   ```

> The server now starts using HTTP transport by default in stateless JSON response mode so direct HTTP POST calls to `/mcp` work without a prior session handshake.

### Run & invoke (quick guide)

1. Activate your project virtualenv (example using the repo `.venv`):

```bash
source .venv/bin/activate
```

2. Ensure Postgres, Redis, and the application DB are reachable and `.env` contains the correct connection strings and `GITHUB_TOKEN` / `SLACK_WEBHOOK_URL` if used.

3. Run the MCP server (serves the tool endpoints over stdio or configured transport):

```bash
python -m mcp_server.app
```

4. Invoke the main tool locally via the included function in `app.py` using a simple HTTP client or the `mcp` client. Example: call the tool via the packaged server entrypoint (structured JSON over stdio is supported by `mcp` clients). For quick local testing you can run the library function directly in Python:

```bash
python - <<'PY'
from mcp_server.workflows.abuse_flagging import CheckSuspiciousUrlActivityTool
print(CheckSuspiciousUrlActivityTool().run(time_window_minutes=60))
PY
```

5. To run the packaged tests for the MCP server:

```bash
cd mcp-server
pytest -q
```

### Verify the MCP server is working

1. Start the server from the `mcp-server` directory:

```bash
cd /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/mcp-server
source ../.venv/bin/activate
python -m mcp_server.app
```

2. In a second terminal, send a direct JSON-RPC POST to `/mcp`:

```bash
curl -i -X POST http://127.0.0.1:8001/mcp \
  -H "Accept: application/json, text/event-stream" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "CheckSuspiciousUrlActivityTool",
      "arguments": {
        "time_window_minutes": 60
      }
    }
  }'
```

3. Confirm the response is valid JSON and includes `jsonrpc`, `id`, and `result`.

Expected output should look like:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [ ... ],
    "structuredContent": { ... },
    "isError": false
  }
}
```

4. If the server is not working, the response will include an error object such as:

- `Bad Request: Missing session ID` if the request headers are wrong
- `Not Found: Invalid or expired session ID` if the wrong session header is used
- `Bad credentials` if GitHub authentication is missing

5. If the same tool call returns a `200 OK` with a valid `result`, the MCP server is functioning.

### Troubleshooting

- If you see import errors referencing `mcp_server` while running tests, ensure `tests/conftest.py` exists (it adjusts `sys.path`).
- If GitHub requests fail, confirm `GITHUB_TOKEN` and optionally set `GITHUB_REPOSITORY` in `.env`.
- Slack posts are gated by `MCP_SLACK_POST_ENABLED=true` to avoid accidental notifications during testing.


## Source overview

- `ProjectDataSource` is read-only and reuses the app's existing DB and Redis clients.
- `GitHubSource` is read-only and uses `GITHUB_TOKEN`.
- `SlackSource` is a write action gated by `MCP_SLACK_POST_ENABLED` and `SLACK_WEBHOOK_URL`.

## Failure behavior

Each source returns structured errors for its own failures.
If GitHub is rate-limited or Redis is unavailable, the workflow still returns a result and includes diagnostics.
Slack posting only happens when enabled.

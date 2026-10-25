# URL Shortener MCP server

An **on-demand stdio** MCP server for URL creation, analytics, status, abuse review
and per-code activity inspection. It calls the authenticated API over HTTP; it
never reads PostgreSQL or Redis directly. Read-only by default. Optional GitHub
context and explicit Slack reports are disabled by default.

See [docs/mcp.md](../docs/mcp.md) for setup, generic client JSON, tool scopes,
three-prompt demo, source failure semantics, security and recorded contracts.

From the repository root, use the pinned shared `.venv` and `make mcp-test`.
Run with `PYTHONPATH=mcp-server .venv/bin/python -m mcp_server.app`; provide
MCP_API_KEY privately in the environment. Private .env files are not automatically
loaded. Installation uses the existing hashed requirements lock; its legacy
backend dependency superset is retained, but runtime imports no backend modules.

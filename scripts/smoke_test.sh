#!/usr/bin/env bash
set -euo pipefail
: "${API_KEY:?Set API_KEY to a read/write key; it is never printed}"
BASE_URL=${BASE_URL:-http://127.0.0.1:18000}
METRICS_URL=${METRICS_URL:-http://127.0.0.1:18002/metrics}
PYTHON=${PYTHON:-python3}
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
# Keep the credential out of curl's process arguments and logs.
umask 077
printf 'X-API-Key: %s\n' "$API_KEY" > "$TMP/auth"
curl --fail --silent --show-error --max-time 10 "$BASE_URL/health" > "$TMP/health"
"$PYTHON" -c 'import json,sys; d=json.load(open(sys.argv[1])); assert d["db"]=="reachable" and d["redis"]=="reachable", d' "$TMP/health"
curl --fail --silent --show-error --max-time 10 -H @"$TMP/auth" -H 'Content-Type: application/json' -d '{"long_url":"https://example.com/"}' "$BASE_URL/shorten" > "$TMP/created"
CODE=$("$PYTHON" -c 'import json,sys; print(json.load(open(sys.argv[1]))["short_code"])' "$TMP/created")
STATUS=$(curl --silent --show-error --max-time 10 -o /dev/null -D "$TMP/headers" -w '%{http_code}' "$BASE_URL/$CODE")
[[ "$STATUS" == 307 ]]
grep -qi '^location: https://example.com/' "$TMP/headers"
VISIBLE=false
for _ in $(seq 1 60); do
  curl --fail --silent --show-error --max-time 5 -H @"$TMP/auth" "$BASE_URL/analytics/$CODE" > "$TMP/analytics"
  if "$PYTHON" -c 'import json,sys; sys.exit(json.load(open(sys.argv[1]))["total_clicks"] != 1)' "$TMP/analytics"; then VISIBLE=true; break; fi
  sleep 1
done
[[ "$VISIBLE" == true ]]
curl --fail --silent --show-error --max-time 10 "$METRICS_URL" > "$TMP/metrics"
grep -q '^http_requests_total' "$TMP/metrics"
printf 'PASS: health; shorten; redirect 307; analytics=1; metrics\n'

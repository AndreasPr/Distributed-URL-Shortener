#!/usr/bin/env bash
# Owns an isolated cluster and removes it even when validation fails.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"
SHA=$(git rev-parse HEAD)
NAME=${KIND_NAME:-shortener-ci}
TMP=$(mktemp -d)
export KUBECONFIG="$TMP/kubeconfig" KUBE_CONTEXT="kind-$NAME"
CREATED=false
cleanup() {
  status=$?
  trap - EXIT
  if [[ -n "${PF:-}" ]]; then kill "$PF" 2>/dev/null || :; wait "$PF" 2>/dev/null || :; fi
  if [[ -n "${MPF:-}" ]]; then kill "$MPF" 2>/dev/null || :; wait "$MPF" 2>/dev/null || :; fi
  if [[ "$CREATED" == true ]]; then kind delete cluster --name "$NAME"; fi
  rm -rf "$TMP"
  exit "$status"
}
trap cleanup EXIT
if kind get clusters | grep -qx "$NAME"; then echo "Cluster $NAME already exists; refusing to reuse/delete it" >&2; exit 1; fi
CREATED=true
kind create cluster --name "$NAME" --image kindest/node:v1.37.0 --kubeconfig "$KUBECONFIG" --wait 120s
scripts/set-k8s-image.sh "$SHA"
for mode in local ci; do
  kubectl kustomize "k8s/overlays/$mode" > "$TMP/$mode.yaml"
  kubeconform -strict -summary -kubernetes-version 1.37.0 "$TMP/$mode.yaml"
done
docker build -t "url-shortener:$SHA" .
kind load docker-image "url-shortener:$SHA" --name "$NAME"
kubectl apply -f k8s/base/0-namespace.yaml
# Ephemeral test credentials are never printed or written to the working tree.
python3 - <<'PY'
import json,secrets,subprocess
s={'apiVersion':'v1','kind':'Secret','metadata':{'name':'url-shortener-secrets','namespace':'url-shortener'},'stringData':{'DB_USER':'shortener','DB_PASSWORD':secrets.token_hex(24),'GRAFANA_ADMIN_USER':'operator','GRAFANA_ADMIN_PASSWORD':secrets.token_hex(24)}}
subprocess.run(['kubectl','apply','-f','-'],input=json.dumps(s),text=True,check=True)
PY
bash k8s/deploy.sh ci
kubectl -n url-shortener port-forward svc/api 18000:8000 > "$TMP/api-forward.log" 2>&1 & PF=$!
kubectl -n url-shortener port-forward svc/api-metrics 18002:8002 > "$TMP/metrics-forward.log" 2>&1 & MPF=$!
for _ in $(seq 1 30); do
  if curl -fsS --max-time 2 http://127.0.0.1:18000/livez >/dev/null 2>&1 && curl -fsS --max-time 2 http://127.0.0.1:18002/metrics >/dev/null 2>&1; then break; fi
  sleep 1
done
KEY_JSON=$(kubectl -n url-shortener exec deployment/api -- python -m app.cli keys create --name kind-smoke --scopes read write)
export API_KEY
API_KEY=$(printf '%s' "$KEY_JSON" | python3 -c 'import json,sys; print(json.load(sys.stdin)["key"])')
bash scripts/smoke_test.sh
KEY_ID=$(printf '%s' "$KEY_JSON" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')
kubectl -n url-shortener exec deployment/api -- python -m app.cli keys revoke "$KEY_ID"
unset API_KEY KEY_JSON

#!/usr/bin/env bash
# Owns an isolated cluster and removes it even when validation fails.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"
SHA=$(git rev-parse HEAD)
NAME=${KIND_NAME:-shortener-ci}
RESULTS_DIR=${RESULTS_DIR:-"$ROOT/artifacts/k8s"}
mkdir -p "$RESULTS_DIR"
TMP=$(mktemp -d)
export KUBECONFIG="$TMP/kubeconfig" KUBE_CONTEXT="kind-$NAME"
CREATED=false
cleanup() {
  status=$?
  trap - EXIT
  if [[ "$status" != 0 ]]; then
    kubectl -n url-shortener get pods,pvc,jobs > "$RESULTS_DIR/status.txt" 2>&1 || :
    kubectl -n url-shortener get events --sort-by=.lastTimestamp > "$RESULTS_DIR/events.txt" 2>&1 || :
    while read -r pod; do
      [[ -n "$pod" ]] || continue
      kubectl -n url-shortener logs "$pod" --all-containers --tail=100 > "$RESULTS_DIR/${pod#pod/}.log" 2>&1 || :
      cat "$RESULTS_DIR/${pod#pod/}.log"
    done < <(kubectl -n url-shortener get pods -o name 2>/dev/null || :)
  fi
  if [[ -n "${PF:-}" ]]; then kill "$PF" 2>/dev/null || :; wait "$PF" 2>/dev/null || :; fi
  if [[ -n "${MPF:-}" ]]; then kill "$MPF" 2>/dev/null || :; wait "$MPF" 2>/dev/null || :; fi
  if [[ "$CREATED" == true ]]; then kind delete cluster --name "$NAME"; fi
  rm -rf "$TMP"
  exit "$status"
}
trap cleanup EXIT
if [[ "${KIND_EXISTING:-false}" == true ]]; then
  kind get clusters | grep -qx "$NAME"
  kind get kubeconfig --name "$NAME" > "$KUBECONFIG"
else
  if kind get clusters | grep -qx "$NAME"; then echo "Cluster $NAME already exists; refusing to reuse/delete it" >&2; exit 1; fi
  CREATED=true
  kind create cluster --name "$NAME" --image kindest/node:v1.37.0 --kubeconfig "$KUBECONFIG" --wait 120s
fi
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
bash k8s/deploy.sh ci 2>&1 | tee "$RESULTS_DIR/deploy.log"
kubectl -n url-shortener port-forward svc/api 18000:8000 > "$TMP/api-forward.log" 2>&1 & PF=$!
kubectl -n url-shortener port-forward svc/api-metrics 18002:8002 > "$TMP/metrics-forward.log" 2>&1 & MPF=$!
for _ in $(seq 1 30); do
  if curl -fsS --max-time 2 http://127.0.0.1:18000/livez >/dev/null 2>&1 && curl -fsS --max-time 2 http://127.0.0.1:18002/metrics >/dev/null 2>&1; then break; fi
  sleep 1
done
KEY_JSON=$(kubectl -n url-shortener exec deployment/api -- python -m app.cli keys create --name kind-smoke --scopes read write)
export API_KEY
API_KEY=$(printf '%s' "$KEY_JSON" | python3 -c 'import json,sys; print(json.load(sys.stdin)["key"])')
bash scripts/smoke_test.sh 2>&1 | tee "$RESULTS_DIR/smoke.log"
if [[ "${RUN_K6:-false}" == true ]]; then
  # Separate key: the smoke test deliberately exhausts its write bucket.
  LOAD_KEY_JSON=$(kubectl -n url-shortener exec deployment/api -- python -m app.cli keys create --name kind-load --scopes read write)
  API_KEY=$(printf '%s' "$LOAD_KEY_JSON" | python3 -c 'import json,sys; print(json.load(sys.stdin)["key"])')
  export API_KEY BASE_URL=http://127.0.0.1:18000 DURATION=30s
  k6 run --summary-export "$RESULTS_DIR/k6-summary.json" scripts/smoke_load_test.js 2>&1 | tee "$RESULTS_DIR/k6.log"
  LOAD_KEY_ID=$(printf '%s' "$LOAD_KEY_JSON" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')
  kubectl -n url-shortener exec deployment/api -- python -m app.cli keys revoke "$LOAD_KEY_ID"
  unset LOAD_KEY_JSON LOAD_KEY_ID
fi
KEY_ID=$(printf '%s' "$KEY_JSON" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')
kubectl -n url-shortener exec deployment/api -- python -m app.cli keys revoke "$KEY_ID"
unset API_KEY KEY_JSON

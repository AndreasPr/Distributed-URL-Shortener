#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
OVERLAY=${1:-local}
: "${KUBE_CONTEXT:?Set KUBE_CONTEXT explicitly to the intended local cluster}"
case "$OVERLAY" in local|ci) ;; *) echo 'Usage: deploy.sh local|ci' >&2; exit 2;; esac
K=(kubectl --context "$KUBE_CONTEXT")
NS=url-shortener
WAIT_TIMEOUT=${WAIT_TIMEOUT:-300s}
STAGE=$(mktemp -d "$ROOT/k8s/overlays/.deploy-XXXXXX")
cleanup() { rm -rf "$STAGE"; }
diagnostics() {
  local status=$?
  trap - ERR
  echo "Deployment failed (exit $status); collecting diagnostics" >&2
  "${K[@]}" -n "$NS" get pods,pvc,jobs || :
  "${K[@]}" -n "$NS" get events --sort-by=.lastTimestamp || :
  "${K[@]}" -n "$NS" describe pods || :
  "${K[@]}" -n "$NS" logs job/db-migrate --all-containers --tail=80 || :
  exit "$status"
}
trap cleanup EXIT
trap diagnostics ERR
"${K[@]}" cluster-info >/dev/null
"${K[@]}" apply -f "$ROOT/k8s/base/0-namespace.yaml"
"${K[@]}" -n "$NS" get secret url-shortener-secrets >/dev/null
# Local deployment is deliberately quiesced during schema changes; not zero downtime.
cat > "$STAGE/kustomization.yaml" <<EOF
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- ../$OVERLAY
replicas:
- name: api
  count: 0
- name: worker
  count: 0
- name: abuse-worker
  count: 0
patches:
- target:
    kind: Job
    name: db-migrate
  patch: |-
    - op: add
      path: /spec/suspend
      value: true
EOF
if [[ "$OVERLAY" == local ]]; then
  cat >> "$STAGE/kustomization.yaml" <<'EOF'
- target:
    kind: HorizontalPodAutoscaler
    name: api-hpa
  patch: |-
    $patch: delete
    apiVersion: autoscaling/v2
    kind: HorizontalPodAutoscaler
    metadata:
      name: api-hpa
EOF
  "${K[@]}" -n "$NS" delete hpa api-hpa --ignore-not-found
fi
# Do not replace an actively running migration.
ACTIVE=$("${K[@]}" -n "$NS" get job db-migrate --ignore-not-found -o jsonpath='{.status.active}')
if [[ "${ACTIVE:-0}" != 0 ]]; then echo 'Migration already active; refusing concurrent deployment' >&2; false; fi
"${K[@]}" -n "$NS" delete job db-migrate --ignore-not-found --wait=true
"${K[@]}" apply -k "$STAGE"
"${K[@]}" -n "$NS" rollout status statefulset/postgres --timeout="$WAIT_TIMEOUT"
"${K[@]}" -n "$NS" rollout status statefulset/redis --timeout="$WAIT_TIMEOUT"
if [[ "$OVERLAY" == local ]]; then
  "${K[@]}" -n "$NS" rollout status statefulset/kafka --timeout="$WAIT_TIMEOUT"
fi
# Start the bounded migration only after cold dependency startup completes.
"${K[@]}" -n "$NS" patch job db-migrate --type=merge -p '{"spec":{"suspend":false}}'
"${K[@]}" -n "$NS" wait --for=condition=complete job/db-migrate --timeout="$WAIT_TIMEOUT"
"${K[@]}" apply -k "$ROOT/k8s/overlays/$OVERLAY"
for name in api worker abuse-worker jaeger prometheus grafana; do
  "${K[@]}" -n "$NS" rollout status "deployment/$name" --timeout="$WAIT_TIMEOUT"
done
"${K[@]}" -n "$NS" get pods,pvc
printf 'Deployment ready. Run scripts/smoke_test.sh against a port-forward.\n'

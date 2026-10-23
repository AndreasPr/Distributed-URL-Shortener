#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
run_promtool() {
    if command -v promtool >/dev/null 2>&1; then
        promtool "$@"
    else
        docker run --rm --network none --entrypoint /bin/promtool \
            -v "$PWD/prometheus:/work:ro" -w /work \
            prom/prometheus:v3.15.0 "$@"
    fi
}
# Paths are relative to the same rules directory both locally and in Docker.
if command -v promtool >/dev/null 2>&1; then
    cd prometheus
fi
run_promtool check rules rules/slo.yml
run_promtool test rules tests/slo.test.yml

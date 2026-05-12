#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8000}"

if ! command -v k6 &> /dev/null; then
    echo "k6 is not installed. Install it with: brew install k6"
    exit 1
fi

if ! curl -fsS "$BASE_URL/health/redis" >/dev/null 2>&1; then
    echo "API is not responding at $BASE_URL"
    echo "Make sure the API, Redis, Kafka, and Postgres are running:"
    echo "  docker compose up -d postgres redis kafka zookeeper"
    echo "  .venv/bin/uvicorn app.main:app --reload"
    exit 1
fi

echo "Running k6 load tests against $BASE_URL"
echo

test_type="${1:-all}"

run_test() {
    local name=$1
    local script=$2
    echo "========================================"
    echo "Running: $name"
    echo "========================================"
    k6 run "$script"
    echo
}

case "$test_type" in
    load)
        run_test "Normal Load Test" "scripts/load_test.js"
        ;;
    stress)
        run_test "Stress Test (24 minutes)" "scripts/stress_test.js"
        ;;
    spike)
        run_test "Spike Test" "scripts/spike_test.js"
        ;;
    all)
        run_test "Normal Load Test" "scripts/load_test.js"
        run_test "Spike Test" "scripts/spike_test.js"
        run_test "Stress Test (24 minutes)" "scripts/stress_test.js"
        ;;
    *)
        echo "Usage: $0 [load|stress|spike|all]"
        exit 1
        ;;
esac

echo "All tests completed!"

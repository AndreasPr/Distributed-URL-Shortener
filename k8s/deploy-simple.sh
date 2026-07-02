#!/bin/bash
# Compatibility wrapper for the full local Kubernetes deployment.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$SCRIPT_DIR/deploy.sh"

#!/usr/bin/env bash
set -euo pipefail
# RESTORE_DATABASE_URL is private and must name an empty loopback PostgreSQL DB.
# Private age key stays on the operator's machine; never pass its contents here.
if [[ $# -ne 2 ]]; then
  echo 'Usage: bash scripts/restore_backup.sh BACKUP.age /private/path/age-identity.txt' >&2
  exit 2
fi
python3 "$(dirname "$0")/backup.py" restore --file "$1" --identity "$2"

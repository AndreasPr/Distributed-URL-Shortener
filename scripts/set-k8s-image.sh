#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
python3 - "$ROOT" "${1:?Pass the full source commit SHA}" <<'PY'
from pathlib import Path
import re,sys
root,sha=Path(sys.argv[1]),sys.argv[2]
if not re.fullmatch(r'[0-9a-f]{40}',sha):raise SystemExit('Expected a full lowercase commit SHA')
for mode in ['ci','local']:
 p=root/'k8s/overlays'/mode/'kustomization.yaml'
 s,n=re.subn(r'newTag: [0-9a-f]{40}', 'newTag: '+sha,p.read_text())
 if n!=1:raise SystemExit('Expected exactly one backend image tag')
 p.write_text(s)
PY

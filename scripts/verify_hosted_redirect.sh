#!/usr/bin/env bash
# Requests a designated synthetic link without following redirects; creates click events.
set -euo pipefail
if [[ -z "${API_ORIGIN:-}" ]]; then
  echo 'SKIP: API_ORIGIN is unset. After deploying to Render, set it and run this check once.'
  exit 0
fi
python3 - <<'PY'
import os, re, sys
from urllib.request import build_opener, HTTPRedirectHandler, ProxyHandler
from urllib.error import HTTPError
from urllib.parse import urlsplit
class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None
try:
    code = os.environ.get('VERIFY_SHORT_CODE', '')
    if not re.fullmatch(r'[A-Za-z0-9_-]{1,32}', code):
        raise ValueError('Set VERIFY_SHORT_CODE to an active, clean synthetic link')
    direct = os.environ['API_ORIGIN'].rstrip('/')
    hosted = os.environ.get('HOSTED_SHORT_BASE_URL', '').rstrip('/')
    opener = build_opener(ProxyHandler({}), NoRedirect())
    locations = []
    for base in [direct] + ([hosted] if hosted else []):
        u = urlsplit(base)
        if u.scheme != 'https' or not u.hostname or u.username or u.password or u.query or u.fragment:
            raise ValueError('Use credential-free HTTPS bases')
        try:
            response = opener.open(base + '/' + code, timeout=20)
        except HTTPError as error:
            response = error
        with response:
            if response.status != 307 or not response.headers.get('Location'):
                raise ValueError('Expected 307 with Location; use direct API short links if proxy differs')
            locations.append(response.headers['Location'])
    if len(set(locations)) != 1:
        raise ValueError('Proxy changed Location; set NEXT_PUBLIC_SHORT_BASE_URL to API_ORIGIN')
    expected = os.environ.get('VERIFY_EXPECTED_LOCATION')
    if expected and locations[0] != expected:
        raise ValueError('Location does not match the expected destination')
    print('PASS: direct API returns 307 with Location')
    print('PASS: hosted proxy preserves exact 307/Location' if hosted else 'SKIP: HOSTED_SHORT_BASE_URL unset; Vercel preservation remains unverified')
except Exception as error:
    print('FAIL: ' + (str(error) if isinstance(error, ValueError) else 'network/HTTP check failed; inspect deployment privately'))
    sys.exit(1)
PY

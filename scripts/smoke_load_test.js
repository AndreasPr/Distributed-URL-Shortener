import http from 'k6/http';
import { check, fail, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const headers = { 'Content-Type': 'application/json', 'X-API-Key': __ENV.API_KEY || '' };

// Five redirects/second stays below the public bucket's ten/second refill.
// This is a portable smoke-load gate, not the 100ms cache-hit SLO measurement.
export const options = {
  scenarios: {
    redirects: {
      executor: 'constant-arrival-rate', rate: 5, timeUnit: '1s',
      // 5/s × observed 0.83s transient = 4.15 concurrent VUs. Allocate the
      // existing ceiling upfront; dynamic allocation dropped arrivals at 2 VUs.
      duration: __ENV.DURATION || '30s', preAllocatedVUs: 5, maxVUs: 5,
      gracefulStop: '5s',
    },
  },
  thresholds: {
    'http_req_duration{name:redirect}': ['p(95)<500'],
    'http_req_failed{name:redirect}': ['rate<0.01'],
    checks: ['rate==1'],
    dropped_iterations: ['count==0'],
  },
};

export function setup() {
  if (!__ENV.API_KEY) fail('API_KEY must be supplied for authenticated setup');
  const result = http.post(`${BASE_URL}/shorten`, JSON.stringify({ long_url: 'https://example.com/' }), {
    headers, timeout: '5s', tags: { name: 'setup' },
  });
  if (result.status !== 200) fail(`Authenticated setup failed: HTTP ${result.status}`);
  const code = result.json('short_code');
  if (!code) fail('Setup did not return a short code');
  sleep(1); // allow asynchronous verdict processing before measuring redirects
  return { code };
}

export default function (data) {
  const response = http.get(`${BASE_URL}/${data.code}`, {
    redirects: 0, timeout: '5s', tags: { name: 'redirect' },
    responseCallback: http.expectedStatuses(307),
  });
  check(response, {
    'redirect is 307': (r) => r.status === 307,
    'destination is example.com': (r) => r.headers.Location === 'https://example.com/',
  });
}

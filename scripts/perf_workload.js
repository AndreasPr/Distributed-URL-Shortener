import http from 'k6/http';
import { check, fail } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import exec from 'k6/execution';

const base = __ENV.BASE_URL || 'http://localhost:18000';
const headers = { 'Content-Type': 'application/json', 'X-API-Key': __ENV.API_KEY || '' };
const latency = new Trend('workload_latency', true);
const stamps = new Trend('workload_timestamp');
const errors = new Rate('workload_errors');
const requests = new Counter('workload_requests');
export const common = {
  setupTimeout: '30m',
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(95)', 'p(99)'],
  thresholds: { workload_errors: ['rate<0.01'], workload_latency: ['p(95)<500'] },
};
export function setup() {
  if (!__ENV.API_KEY) fail('API_KEY is required (read and write scopes)');
  const count = Number(__ENV.DATASET_SIZE || 10000);
  if (!Number.isInteger(count) || count < 10) fail('DATASET_SIZE must be an integer >=10');
  const codes = [];
  for (let i = 0; i < count; i++) {
    const r = http.post(`${base}/shorten`, JSON.stringify({long_url: `https://example.com/perf/${i}`}),
      {headers, timeout: '10s', tags: {name: 'seed'}});
    if (r.status !== 200 || !r.json('short_code')) fail(`Seeding failed at ${i}: HTTP ${r.status}`);
    codes.push(r.json('short_code'));
  }
  // Warm the hottest 10%; the long tail starts cold. No cache deletion/admin bypass.
  const hot = Math.ceil(count * 0.1);
  for (let i = 0; i < hot; i++) {
    const r = http.get(`${base}/${codes[i]}`, {redirects: 0, timeout: '10s', tags: {name:'warmup'}});
    if (r.status !== 307) fail(`Warmup failed: HTTP ${r.status}`);
  }
  return {codes, hot, nonce: Date.now()};
}
export function workload(data) {
  const choice = Math.random();
  let code = data.codes[Math.min(data.hot - 1, Math.floor(Math.pow(Math.random(), 3) * data.hot))];
  let path = `/${code}`, expected = 307, name = 'redirect_hot';
  if (choice < 0.05) {
    path = `/analytics/${code}`; expected = 200; name = 'analytics';
  } else if (choice < 0.07) {
    path = `/missing-${data.nonce}-${exec.scenario.iterationInTest}`; expected = 404; name = 'unknown';
  } else if (choice < 0.17) {
    const rank = data.hot + exec.scenario.iterationInTest % (data.codes.length - data.hot);
    path = `/${data.codes[rank]}`; name = 'redirect_tail';
  }
  const r = http.get(base + path, {headers, redirects: 0, timeout: '5s', tags: {name},
    responseCallback: http.expectedStatuses(expected)});
  stamps.add(Date.now()); requests.add(1); latency.add(r.timings.duration); errors.add(r.status !== expected);
  check(r, {'expected status': (response) => response.status === expected});
}

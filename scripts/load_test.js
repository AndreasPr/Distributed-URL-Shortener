import http from 'k6/http';
import { check, group, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const DURATION = __ENV.DURATION || '30s';
const VUS = parseInt(__ENV.VUS || '10');

export const options = {
  stages: [
    { duration: '5s', target: VUS / 2 },
    { duration: `${DURATION}`, target: VUS },
    { duration: '5s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<100', 'p(99)<200'],
    http_req_failed: ['rate<0.10'],
    'http_req_duration{group:read_heavy}': ['p(95)<50'],
  },
};

const LONG_URLS = [
  'https://github.com/golang/go',
  'https://www.wikipedia.org/wiki/HTTP',
  'https://www.python.org',
  'https://www.rust-lang.org',
  'https://www.docker.com',
  'https://www.kubernetes.io',
  'https://www.postgresql.org',
  'https://redis.io',
  'https://www.linux.org',
  'https://www.apache.org',
];

let createdCodes = [];

const EXPECT_SHORTEN = http.expectedStatuses(200, 429);
const EXPECT_REDIRECT = http.expectedStatuses(307, 404);
const EXPECT_ANALYTICS = http.expectedStatuses(200);
const EXPECT_HEALTH = http.expectedStatuses(200);

// Simulate multiple source IPs using x-forwarded-for header
function getSpoofedIP() {
  const vuId = __VU % 10;
  return `192.168.1.${100 + vuId}`;
}

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Forwarded-For': getSpoofedIP(),
  };
}

export default function () {
  const spoofedIP = getSpoofedIP();

  // Write operation: Create short URLs (but respect rate limit)
  // With spoofed IPs, each VU gets its own rate limit bucket
  group('POST /shorten', () => {
    const url = LONG_URLS[Math.floor(Math.random() * LONG_URLS.length)];
    const res = http.post(`${BASE_URL}/shorten`, JSON.stringify({ long_url: url }), {
      headers: getHeaders(),
      tags: { name: 'shorten' },
      responseCallback: EXPECT_SHORTEN,
    });

    check(res, {
      'shorten: 200 or 429': (r) => r.status === 200 || r.status === 429,
      'shorten: has short_code or error': (r) => r.json('short_code') !== undefined || r.json('error') !== undefined,
    });

    if (res.status === 200) {
      const code = res.json('short_code');
      if (code) {
        createdCodes.push(code);
      }
    }
  });

  sleep(0.2);

  // Read operation: Redirect (cache hits, high throughput, should scale well)
  group('GET /{code} (read_heavy)', () => {
    let code;
    if (createdCodes.length > 0) {
      code = createdCodes[Math.floor(Math.random() * createdCodes.length)];
    } else {
      code = 'abc';
    }

    const res = http.get(`${BASE_URL}/${code}`, {
      headers: getHeaders(),
      tags: { name: 'redirect', group: 'read_heavy' },
      redirects: 0,
      responseCallback: EXPECT_REDIRECT,
    });

    check(res, {
      'redirect: 307 or 404': (r) => r.status === 307 || r.status === 404,
      'redirect: location when 307': (r) => r.status !== 307 || r.headers['Location'] !== undefined,
    });
  });

  sleep(0.1);

  // Read operation: Analytics query
  group('GET /analytics/{code} (read_heavy)', () => {
    let code;
    if (createdCodes.length > 0) {
      code = createdCodes[Math.floor(Math.random() * createdCodes.length)];
    } else {
      code = 'abc';
    }

    const res = http.get(`${BASE_URL}/analytics/${code}`, {
      headers: getHeaders(),
      tags: { name: 'analytics', group: 'read_heavy' },
      responseCallback: EXPECT_ANALYTICS,
    });

    check(res, {
      'analytics: 200': (r) => r.status === 200,
      'analytics: has total_clicks': (r) => r.json('total_clicks') !== undefined,
    });
  });

  sleep(0.1);

  // Health check (low frequency)
  group('GET /health/redis', () => {
    const res = http.get(`${BASE_URL}/health/redis`, {
      headers: getHeaders(),
      tags: { name: 'health' },
      responseCallback: EXPECT_HEALTH,
    });

    check(res, {
      'health: 200': (r) => r.status === 200,
      'health: redis reachable': (r) => r.json('redis') === 'reachable',
    });
  });

  sleep(0.5);
}

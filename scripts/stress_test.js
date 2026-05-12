import http from 'k6/http';
import { check, group } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

export const options = {
  stages: [
    { duration: '2m', target: 10 },
    { duration: '5m', target: 50 },
    { duration: '5m', target: 100 },
    { duration: '5m', target: 200 },
    { duration: '5m', target: 300 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(99)<500'],
    http_req_failed: ['rate<0.1'],
  },
};

const LONG_URLS = [
  'https://github.com/golang/go',
  'https://www.wikipedia.org/wiki/HTTP',
  'https://www.python.org',
  'https://www.rust-lang.org',
  'https://www.docker.com',
];

let shortCodes = [];

// Simulate multiple source IPs to distribute rate limit buckets
function getSpoofedIP() {
  const vuId = __VU % 100;
  return `192.168.${Math.floor(vuId / 256)}.${vuId % 256 || 1}`;
}

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Forwarded-For': getSpoofedIP(),
  };
}

export default function () {
  const url = LONG_URLS[Math.floor(Math.random() * LONG_URLS.length)];

  group('POST /shorten (write)', () => {
    const res = http.post(`${BASE_URL}/shorten`, JSON.stringify({ long_url: url }), {
      headers: getHeaders(),
      timeout: '10s',
    });

    if (res.status === 200) {
      const code = res.json('short_code');
      if (code && shortCodes.length < 1000) {
        shortCodes.push(code);
      }
    }

    check(res, {
      'shorten 200 or 429': (r) => r.status === 200 || r.status === 429,
      'not 500 error': (r) => r.status !== 500,
      'response has data': (r) => r.status === 200 ? r.json('short_code') : r.json('error'),
    });
  });

  if (shortCodes.length > 0) {
    group('GET /{code} (read)', () => {
      const code = shortCodes[Math.floor(Math.random() * shortCodes.length)];
      const res = http.get(`${BASE_URL}/${code}`, {
        headers: getHeaders(),
        timeout: '10s',
        redirects: 0,
      });

      check(res, {
        'redirect success or not found': (r) => r.status === 307 || r.status === 404,
        'not 500': (r) => r.status !== 500,
      });
    });

    group('GET /analytics/{code} (read)', () => {
      const code = shortCodes[Math.floor(Math.random() * shortCodes.length)];
      const res = http.get(`${BASE_URL}/analytics/${code}`, {
        headers: getHeaders(),
        timeout: '10s',
      });

      check(res, {
        'analytics success': (r) => r.status === 200,
        'not 500': (r) => r.status !== 500,
      });
    });
  }
}

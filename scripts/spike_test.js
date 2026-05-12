import http from 'k6/http';
import { check, group } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

export const options = {
  stages: [
    { duration: '10s', target: 10 },
    { duration: '1s', target: 100 },
    { duration: '10s', target: 100 },
    { duration: '1s', target: 10 },
    { duration: '10s', target: 10 },
    { duration: '1s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<150'],
    http_req_failed: ['rate<0.05'],
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

// Simulate multiple source IPs
function getSpoofedIP() {
  const vuId = __VU % 50;
  return `192.168.${Math.floor(vuId / 256)}.${vuId % 256 || 1}`;
}

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Forwarded-For': getSpoofedIP(),
  };
}

export default function () {
  group('POST /shorten (write)', () => {
    const res = http.post(`${BASE_URL}/shorten`, JSON.stringify({ long_url: 'https://example.com' }), {
      headers: getHeaders(),
    });
    if (res.status === 200) {
      const code = res.json('short_code');
      if (code) shortCodes.push(code);
    }
  });

  group('GET /{code} (spike test - read)', () => {
    if (shortCodes.length === 0) {
      return;
    }

    if (shortCodes.length > 0) {
      const code = shortCodes[Math.floor(Math.random() * shortCodes.length)];
      const res = http.get(`${BASE_URL}/${code}`, {
        headers: getHeaders(),
        timeout: '10s',
        redirects: 0,
      });

      check(res, {
        'spike: 307 redirect': (r) => r.status === 307,
        'spike: not 500': (r) => r.status !== 500,
        'spike: latency acceptable': (r) => r.timings.duration < 200,
      });
    }
  });
}

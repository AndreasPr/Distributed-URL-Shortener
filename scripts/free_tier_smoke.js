// MANUAL ONLY. 20 iterations, one GET each, one VU, no redirects/retries/setup.
import http from 'k6/http';
import { check, sleep } from 'k6';
export const options = {
  vus: 1, iterations: 20, maxDuration: '3m',
  maxRedirects: 0, thresholds: { checks: ['rate==1'] },
};
const origin = (__ENV.API_ORIGIN || '').replace(/\/$/, '');
const code = __ENV.SMOKE_SHORT_CODE || '';
if (!/^https:\/\/[^/?#@\s]+$/.test(origin) || !/^[A-Za-z0-9_-]{1,32}$/.test(code)) {
  throw new Error('Set HTTPS API_ORIGIN and an existing clean SMOKE_SHORT_CODE');
}
export default function () {
  const response = http.get(`${origin}/${code}`, { redirects: 0, timeout: '5s', tags: { name: 'manual-redirect-smoke' } });
  check(response, { 'redirect is 307 with Location': r => r.status === 307 && !!r.headers.Location });
  sleep(2);
}

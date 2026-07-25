import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    rate_limit_test: {
      executor: 'constant-arrival-rate',
      rate: 100, // 100 RPS
      timeUnit: '1s',
      duration: '10s', // Run for 10 seconds (total ~1000 requests)
      preAllocatedVUs: 50,
      maxVUs: 100,
    },
  },
  thresholds: {
    // We expect a lot of 429s, so we check for them
    'http_req_failed{status:500}': ['rate==0'], // No 500 errors allowed!
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:8081/v1';

export default function () {
  // Test rate limiting on login endpoint
  const payload = JSON.stringify({
    email: 'test@example.com',
    password: 'wrongpassword'
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };
  
  const res = http.post(`${BASE_URL}/auth/login`, payload, params);
  
  check(res, {
    'is status 200 or 400 (accepted)': (r) => r.status === 200 || r.status === 400 || r.status === 401,
    'is status 429 (rate limited)': (r) => r.status === 429,
  });
}

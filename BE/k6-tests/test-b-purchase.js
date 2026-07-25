import http from 'k6/http';
import { check } from 'k6';
import { SharedArray } from 'k6/data';

// Load data seeded by seed-data.js
const data = new SharedArray('test data', function () {
  return [JSON.parse(open('./k6-data.json'))];
});

const tokens = data[0].testB.tokens;
const accountIds = data[0].testB.accountIds;

export const options = {
  scenarios: {
    purchase: {
      executor: 'per-vu-iterations',
      vus: 50,
      iterations: 2, // 50 VUs * 2 = 100 purchases
      maxDuration: '30s',
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<1000'],
    'http_req_failed': ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:8081/v1';

export default function () {
  const idx = (__VU - 1) * 2 + __ITER; // 0 to 99 across 50 VUs
  
  if (idx >= accountIds.length || idx >= tokens.length) {
    return; // out of bounds just in case
  }
  
  const token = tokens[idx];
  const accountId = accountIds[idx];

  const params = {
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
  };
  
  const res = http.post(`${BASE_URL}/accounts/${accountId}/purchase`, JSON.stringify({}), params);
  
  check(res, {
    'is status 200': (r) => r.status === 200,
  });
}

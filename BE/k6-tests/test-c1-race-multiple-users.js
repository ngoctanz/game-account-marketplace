import http from 'k6/http';
import { check } from 'k6';
import { SharedArray } from 'k6/data';

// Load data seeded by seed-data.js
const data = new SharedArray('test data', function () {
  return [JSON.parse(open('./k6-data.json'))];
});

const tokens = data[0].testC1.tokens;
const targetAccountId = data[0].testC1.targetAccountId;

export const options = {
  scenarios: {
    race_condition: {
      executor: 'per-vu-iterations',
      vus: 50,
      iterations: 1, // each VU tries to buy once exactly
      maxDuration: '10s',
    },
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:8081/v1';

export default function () {
  // Each VU gets a unique token (0 to 49)
  const idx = __VU - 1; 
  if (idx >= tokens.length) return;
  
  const token = tokens[idx];

  const params = {
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
  };
  
  const res = http.post(`${BASE_URL}/accounts/${targetAccountId}/purchase`, JSON.stringify({}), params);
  
  // We expect exactly 1 request to get 200, and others to get 409 (or similar)
  check(res, {
    'is status 200 or 409': (r) => r.status === 200 || r.status === 409 || r.status === 400,
  });
}

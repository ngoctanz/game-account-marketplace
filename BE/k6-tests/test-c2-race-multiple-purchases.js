import http from 'k6/http';
import { check } from 'k6';
import { SharedArray } from 'k6/data';

// Load data seeded by seed-data.js
const data = new SharedArray('test data', function () {
  return [JSON.parse(open('./k6-data.json'))];
});

const token = data[0].testC2.token;
const accountIds = data[0].testC2.accountIds; // Array of 150 accounts

export const options = {
  scenarios: {
    race_condition: {
      executor: 'shared-iterations',
      vus: 150, // 150 simultaneous virtual users
      iterations: 150, // 150 requests total (1 per VU)
      maxDuration: '10s',
    },
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:8081/v1';

export default function () {
  const idx = __ITER; // 0 to 149
  if (idx >= accountIds.length) return;
  
  const accountId = accountIds[idx];

  const params = {
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
  };
  
  const res = http.post(`${BASE_URL}/accounts/${accountId}/purchase`, JSON.stringify({}), params);
  
  // They have 500k balance, each account is 10k. They should be able to buy exactly 50 accounts.
  // 50 requests should return 200, 100 requests should return 400 (Insufficient balance)
  check(res, {
    'is status 200 or 400': (r) => r.status === 200 || r.status === 400,
  });
}

import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

// Load data seeded by seed-data.js
const data = new SharedArray('test data', function () {
  return [JSON.parse(open('./k6-data.json'))];
});
const accountIds = data[0].testB.accountIds;

export const options = {
  scenarios: {
    // 1. Get Accounts List
    read_list: {
      executor: 'constant-arrival-rate',
      rate: 100, // 100 RPS
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 50,
      maxVUs: 100,
      exec: 'getAccounts',
    },
    // 2. Get Single Account
    read_single: {
      executor: 'constant-arrival-rate',
      rate: 100, // 100 RPS
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 50,
      maxVUs: 100,
      exec: 'getAccountById',
    }
  },
  thresholds: {
    'http_req_duration': ['p(95)<500'], // 95% of requests must complete below 500ms
    'http_req_failed': ['rate<0.01'],   // Error rate must be less than 1%
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:8081/v1';

export function getAccounts() {
  const params = {
    headers: { 'Content-Type': 'application/json' },
  };
  
  const res = http.get(`${BASE_URL}/accounts?limit=20&page=1`, params);
  
  check(res, {
    'is status 200': (r) => r.status === 200,
  });
}

export function getAccountById() {
  const randomAccountId = accountIds[Math.floor(Math.random() * accountIds.length)];
  
  const params = {
    headers: { 'Content-Type': 'application/json' },
  };
  
  const res = http.get(`${BASE_URL}/accounts/${randomAccountId}`, params);
  
  check(res, {
    'is status 200': (r) => r.status === 200,
  });
}

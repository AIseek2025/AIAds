/**
 * AIAds Platform Performance Test Script
 * Tests key API endpoints for performance regression
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 users
    { duration: '1m', target: 50 },    // Ramp up to 50 users
    { duration: '2m', target: 50 },    // Stay at 50 users
    { duration: '1m', target: 100 },   // Ramp up to 100 users
    { duration: '2m', target: 100 },   // Stay at 100 users
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(50)<100', 'p(95)<200', 'p(99)<500'], // P50<100ms, P95<200ms, P99<500ms
    http_req_failed: ['rate<0.01'], // Error rate < 1%
    errors: ['rate<0.1'], // Custom error rate < 10%
  },
};

// Test data
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';

// Test credentials (should be provided via environment variables)
const TEST_EMAIL = __ENV.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = __ENV.TEST_PASSWORD || 'TestPass123!';

let accessToken = '';

/**
 * Test 1: Health Check Endpoint
 * Expected: P95 < 50ms
 */
export function healthCheck() {
  const res = http.get(`${BASE_URL}/health`);
  
  const success = check(res, {
    'health check status is 200': (r) => r.status === 200,
    'health check < 50ms': (r) => r.timings.duration < 50,
  });
  
  errorRate.add(!success);
  sleep(0.5);
}

/**
 * Test 2: Authentication - Login
 * Expected: P95 < 150ms
 */
export function loginTest() {
  const payload = JSON.stringify({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  const res = http.post(`${BASE_URL}/auth/login`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  const success = check(res, {
    'login status is 200': (r) => r.status === 200,
    'login < 150ms': (r) => r.timings.duration < 150,
  });

  errorRate.add(!success);

  if (res.status === 200) {
    try {
      const body = JSON.parse(res.body as string);
      accessToken = body.data?.accessToken || '';
    } catch (e) {
      // Ignore parse errors
    }
  }

  sleep(1);
}

/**
 * Test 3: Get KOLs List
 * Expected: P95 < 100ms
 */
export function getKolsTest() {
  const params = accessToken ? {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  } : {};

  const res = http.get(`${BASE_URL}/kols?platform=tiktok&min_followers=10000`, params);

  const success = check(res, {
    'get KOLs status is 200': (r) => r.status === 200,
    'get KOLs < 100ms': (r) => r.timings.duration < 100,
  });

  errorRate.add(!success);
  sleep(0.5);
}

/**
 * Test 4: Get Campaigns List
 * Expected: P95 < 150ms
 */
export function getCampaignsTest() {
  const params = accessToken ? {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  } : {};

  const res = http.get(`${BASE_URL}/campaigns?status=active`, params);

  const success = check(res, {
    'get campaigns status is 200': (r) => r.status === 200,
    'get campaigns < 150ms': (r) => r.timings.duration < 150,
  });

  errorRate.add(!success);
  sleep(0.5);
}

/**
 * Test 5: Get Admin Dashboard Stats
 * Expected: P95 < 200ms
 */
export function getAdminDashboardTest() {
  const params = accessToken ? {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  } : {};

  const res = http.get(`${BASE_URL}/admin/dashboard/stats`, params);

  const success = check(res, {
    'dashboard status is 200': (r) => r.status === 200,
    'dashboard < 200ms': (r) => r.timings.duration < 200,
  });

  errorRate.add(!success);
  sleep(1);
}

/**
 * Main test flow
 */
export default function () {
  // Health check
  healthCheck();
  
  // Login
  loginTest();
  
  // Test authenticated endpoints
  if (accessToken) {
    getKolsTest();
    getCampaignsTest();
    getAdminDashboardTest();
  } else {
    console.log('No access token, skipping authenticated tests');
  }
}

/**
 * Handle test summary
 */
export function handleSummary(data: any) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data: any, options: any) {
  const { http_req_duration, http_req_failed } = data.metrics;
  
  let summary = '\n=== Performance Test Summary ===\n\n';
  
  if (http_req_duration) {
    summary += `Response Times:\n`;
    summary += `  P50: ${http_req_duration.values.p50.toFixed(2)}ms (target: <100ms)\n`;
    summary += `  P95: ${http_req_duration.values.p95.toFixed(2)}ms (target: <200ms)\n`;
    summary += `  P99: ${http_req_duration.values.p99.toFixed(2)}ms (target: <500ms)\n`;
    summary += `  Min: ${http_req_duration.values.min.toFixed(2)}ms\n`;
    summary += `  Max: ${http_req_duration.values.max.toFixed(2)}ms\n`;
  }
  
  if (http_req_failed) {
    summary += `\nError Rate: ${(http_req_failed.values.rate * 100).toFixed(2)}% (target: <1%)\n`;
  }
  
  summary += `\nTotal Requests: ${data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0}\n`;
  summary += `Test Duration: ${data.state.testRunDurationMs / 1000}s\n`;
  
  return summary;
}

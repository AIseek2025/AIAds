/**
 * AIAds Platform Performance Test Script
 * Node.js-based performance testing (alternative to k6)
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000/api/v1';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'TestPass123!';
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '10', 10);
const REQUESTS_PER_CLIENT = parseInt(process.env.REQUESTS_PER_CLIENT || '100', 10);

// Performance targets
const TARGETS = {
  p50: 100,  // P50 < 100ms
  p95: 200,  // P95 < 200ms
  p99: 500,  // P99 < 500ms
  errorRate: 0.01, // < 1%
};

// Metrics
class Metrics {
  latencies: number[] = [];
  successes = 0;
  failures = 0;
  startTime = Date.now();

  record(latency: number, success: boolean) {
    this.latencies.push(latency);
    if (success) {
      this.successes++;
    } else {
      this.failures++;
    }
  }

  getPercentile(p: number): number {
    if (this.latencies.length === 0) return 0;
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  getStats() {
    const total = this.successes + this.failures;
    return {
      p50: this.getPercentile(50),
      p95: this.getPercentile(95),
      p99: this.getPercentile(99),
      min: Math.min(...this.latencies, 0),
      max: Math.max(...this.latencies, 0),
      avg: this.latencies.reduce((a, b) => a + b, 0) / (this.latencies.length || 1),
      total,
      successes: this.successes,
      failures: this.failures,
      errorRate: total > 0 ? this.failures / total : 0,
      rps: total / ((Date.now() - this.startTime) / 1000),
    };
  }
}

// HTTP request helper
function makeRequest(method: string, path: string, body?: any, headers?: any): Promise<{ status: number; duration: number; data?: any }> {
  return new Promise((resolve) => {
    const url = new URL(path, BASE_URL);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const startTime = Date.now();
    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const duration = Date.now() - startTime;
        try {
          resolve({
            status: res.statusCode || 0,
            duration,
            data: JSON.parse(data),
          });
        } catch {
          resolve({
            status: res.statusCode || 0,
            duration,
          });
        }
      });
    });

    req.on('error', () => {
      const duration = Date.now() - startTime;
      resolve({ status: 0, duration });
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

// Test endpoints
async function testHealthCheck(metrics: Metrics) {
  const result = await makeRequest('GET', '/health');
  const success = result.status === 200 && result.duration < 50;
  metrics.record(result.duration, success);
  return success;
}

async function testLogin(metrics: Metrics): Promise<string> {
  const result = await makeRequest('POST', '/auth/login', {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  const success = result.status === 200 && result.duration < 150;
  metrics.record(result.duration, success);
  
  if (result.data?.data?.accessToken) {
    return result.data.data.accessToken;
  }
  return '';
}

async function testGetKols(metrics: Metrics, token: string) {
  const result = await makeRequest('GET', '/kols?platform=tiktok&min_followers=10000', undefined, {
    'Authorization': `Bearer ${token}`,
  });
  const success = result.status === 200 && result.duration < 100;
  metrics.record(result.duration, success);
}

async function testGetCampaigns(metrics: Metrics, token: string) {
  const result = await makeRequest('GET', '/campaigns?status=active', undefined, {
    'Authorization': `Bearer ${token}`,
  });
  const success = result.status === 200 && result.duration < 150;
  metrics.record(result.duration, success);
}

async function testAdminDashboard(metrics: Metrics, token: string) {
  const result = await makeRequest('GET', '/admin/dashboard/stats', undefined, {
    'Authorization': `Bearer ${token}`,
  });
  const success = result.status === 200 && result.duration < 200;
  metrics.record(result.duration, success);
}

// Run load test
async function runLoadTest() {
  console.log('=== AIAds Performance Load Test ===\n');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Concurrency: ${CONCURRENCY}`);
  console.log(`Requests per client: ${REQUESTS_PER_CLIENT}`);
  console.log(`Targets: P50<${TARGETS.p50}ms, P95<${TARGETS.p95}ms, P99<${TARGETS.p99}ms\n`);

  const metrics = new Metrics();
  let accessToken = '';

  // First, get an access token
  console.log('Getting access token...');
  try {
    accessToken = await testLogin(new Metrics());
    if (!accessToken) {
      console.log('⚠️  Failed to get access token, running unauthenticated tests only');
    } else {
      console.log('✓ Access token obtained\n');
    }
  } catch (error) {
    console.log('⚠️  Login failed, running unauthenticated tests only\n');
  }

  // Run concurrent requests
  console.log(`Running ${CONCURRENCY} concurrent clients with ${REQUESTS_PER_CLIENT} requests each...\n`);

  const clients: Promise<void>[] = [];

  for (let i = 0; i < CONCURRENCY; i++) {
    const clientPromise = (async () => {
      for (let j = 0; j < REQUESTS_PER_CLIENT; j++) {
        // Health check (20% of requests)
        if (Math.random() < 0.2) {
          await testHealthCheck(metrics);
        }
        
        // Login (10% of requests)
        if (Math.random() < 0.1) {
          const newToken = await testLogin(metrics);
          if (newToken) accessToken = newToken;
        }
        
        // Get KOLs (30% of requests)
        if (accessToken && Math.random() < 0.3) {
          await testGetKols(metrics, accessToken);
        }
        
        // Get Campaigns (20% of requests)
        if (accessToken && Math.random() < 0.2) {
          await testGetCampaigns(metrics, accessToken);
        }
        
        // Admin Dashboard (20% of requests)
        if (accessToken && Math.random() < 0.2) {
          await testAdminDashboard(metrics, accessToken);
        }

        // Small delay to simulate real user behavior
        if (j % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
    })();

    clients.push(clientPromise);
  }

  await Promise.all(clients);

  // Print results
  const stats = metrics.getStats();
  const duration = (Date.now() - metrics.startTime) / 1000;

  console.log('\n=== Performance Test Results ===\n');
  console.log('Response Times:');
  console.log(`  P50: ${stats.p50.toFixed(2)}ms ${stats.p50 < TARGETS.p50 ? '✓' : '✗'} (target: <${TARGETS.p50}ms)`);
  console.log(`  P95: ${stats.p95.toFixed(2)}ms ${stats.p95 < TARGETS.p95 ? '✓' : '✗'} (target: <${TARGETS.p95}ms)`);
  console.log(`  P99: ${stats.p99.toFixed(2)}ms ${stats.p99 < TARGETS.p99 ? '✓' : '✗'} (target: <${TARGETS.p99}ms)`);
  console.log(`  Min: ${stats.min.toFixed(2)}ms`);
  console.log(`  Max: ${stats.max.toFixed(2)}ms`);
  console.log(`  Avg: ${stats.avg.toFixed(2)}ms`);
  console.log(`\nError Rate: ${(stats.errorRate * 100).toFixed(2)}% ${stats.errorRate < TARGETS.errorRate ? '✓' : '✗'} (target: <${TARGETS.errorRate * 100}%)`);
  console.log(`\nTotal Requests: ${stats.total}`);
  console.log(`Successful: ${stats.successes}`);
  console.log(`Failed: ${stats.failures}`);
  console.log(`Duration: ${duration.toFixed(2)}s`);
  console.log(`Requests/sec: ${stats.rps.toFixed(2)}`);

  // Check if targets are met
  const allTargetsMet = stats.p50 < TARGETS.p50 && 
                        stats.p95 < TARGETS.p95 && 
                        stats.p99 < TARGETS.p99 && 
                        stats.errorRate < TARGETS.errorRate;

  console.log(`\n=== Overall: ${allTargetsMet ? 'PASS ✓' : 'FAIL ✗'} ===`);

  return { stats, allTargetsMet };
}

// Run the test
runLoadTest().catch(console.error);

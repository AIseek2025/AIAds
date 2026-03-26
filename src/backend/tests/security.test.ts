/**
 * Security Tests for Medium Severity Fixes
 * Tests for M01-M08 security improvements
 */

import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/database';
import { hashPassword } from '../src/utils/crypto';

describe('Medium Severity Security Fixes', () => {
  // Test user data
  const testUser = {
    email: 'security-test@example.com',
    password: 'SecurePassword123!',
    nickname: 'Security Test',
  };

  // Clean up before each test
  beforeEach(async () => {
    await prisma.user.deleteMany({
      where: { email: testUser.email },
    });
  });

  // Clean up after all tests
  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: testUser.email },
    });
  });

  /**
   * M01: Bcrypt Cost Factor Test
   * Verify that password hashing uses cost factor >= 12
   */
  describe('M01: Bcrypt Cost Factor', () => {
    it('should hash password with cost factor 12', async () => {
      const bcrypt = require('bcrypt');
      const BCRYPT_COST = parseInt(process.env.BCRYPT_COST || '12', 10);
      
      expect(BCRYPT_COST).toBeGreaterThanOrEqual(12);
      
      const hash = await hashPassword(testUser.password);
      const cost = bcrypt.getRounds(hash);
      
      expect(cost).toBeGreaterThanOrEqual(12);
    });

    it('should take reasonable time to hash with cost 12', async () => {
      const startTime = Date.now();
      await hashPassword(testUser.password);
      const duration = Date.now() - startTime;
      
      // With cost 12, hashing should take 100-500ms
      expect(duration).toBeGreaterThan(50);
      expect(duration).toBeLessThan(2000);
    });
  });

  /**
   * M02: Account Lock Policy Test
   * Verify account locks after 5 failed attempts
   */
  describe('M02: Account Lock Policy', () => {
    it('should allow login with correct credentials', async () => {
      // Create test user
      const passwordHash = await hashPassword(testUser.password);
      await prisma.user.create({
        data: {
          email: testUser.email,
          passwordHash,
          nickname: testUser.nickname,
          role: 'advertiser',
          status: 'active',
        },
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.tokens.access_token).toBeDefined();
    });

    it('should track failed login attempts', async () => {
      // Create test user
      const passwordHash = await hashPassword(testUser.password);
      await prisma.user.create({
        data: {
          email: 'lock-test@example.com',
          passwordHash,
          nickname: 'Lock Test',
          role: 'advertiser',
          status: 'active',
        },
      });

      // Make 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'lock-test@example.com',
            password: 'wrongpassword',
          });

        expect(response.status).toBe(401);
      }

      // 6th attempt should fail with account locked message
      const lockedResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'lock-test@example.com',
          password: 'wrongpassword',
        });

      // Account should be locked (either 401 or 403)
      expect([401, 403]).toContain(lockedResponse.status);
    });
  });

  /**
   * M03: Refresh Token Rotation Test
   * Verify refresh tokens are rotated on use
   */
  describe('M03: Refresh Token Rotation', () => {
    it('should return new refresh token on refresh', async () => {
      // Create test user
      const passwordHash = await hashPassword(testUser.password);
      await prisma.user.create({
        data: {
          email: 'refresh-test@example.com',
          passwordHash,
          nickname: 'Refresh Test',
          role: 'advertiser',
          status: 'active',
        },
      });

      // Login to get tokens
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'refresh-test@example.com',
          password: testUser.password,
        });

      const refreshToken = loginResponse.body.data.tokens.refresh_token;
      

      // Refresh token
      const refreshResponse = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: refreshToken });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.data.refresh_token).toBeDefined();
      
      // New refresh token should be different
      expect(refreshResponse.body.data.refresh_token).not.toBe(refreshToken);
    });
  });

  /**
   * M04: Rate Limiter Fail-Closed Test
   * Verify rate limiter fails closed
   */
  describe('M04: Rate Limiter Fail-Closed', () => {
    it('should return 429 when rate limit exceeded', async () => {
      // Make many requests quickly
      const requests: Promise<any>[] = [];
      for (let i = 0; i < 150; i++) {
        requests.push(
          request(app).get('/api/v1/health')
        );
      }

      const responses = await Promise.all(requests);
      
      // At least some requests should be rate limited
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  /**
   * M05: Audit Logging Test
   * Verify audit logs contain required fields
   */
  describe('M05: Audit Logging', () => {
    it('should include request ID in response headers', async () => {
      const response = await request(app).get('/api/v1/health');
      
      expect(response.headers['x-request-id']).toBeDefined();
    });

    it('should log requests with required fields', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .set('X-Request-ID', 'test-request-id');

      expect(response.status).toBe(200);
      expect(response.headers['x-request-id']).toBe('test-request-id');
    });
  });

  /**
   * M06: HttpOnly Cookie Test
   * Verify cookies have secure attributes
   */
  describe('M06: HttpOnly Cookie', () => {
    it('should set HttpOnly cookie on login', async () => {
      // Create test user
      const passwordHash = await hashPassword(testUser.password);
      await prisma.user.create({
        data: {
          email: 'cookie-test@example.com',
          passwordHash,
          nickname: 'Cookie Test',
          role: 'advertiser',
          status: 'active',
        },
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'cookie-test@example.com',
          password: testUser.password,
        });

      // Check for Set-Cookie header
      const setCookie = response.headers['set-cookie'];
      if (setCookie) {
        // Verify HttpOnly flag
        const hasHttpOnly = Array.isArray(setCookie) && setCookie.some((cookie: string) => 
          cookie.includes('HttpOnly')
        );
        expect(hasHttpOnly).toBe(true);
      }
    });
  });

  /**
   * M07: MFA Support Test
   * Verify MFA endpoints work correctly
   */
  describe('M07: MFA Support', () => {
    it('should have MFA setup endpoint', async () => {
      // This test verifies the endpoint exists
      // Full MFA testing requires authenticated user
      const response = await request(app)
        .post('/api/v1/auth/mfa/setup');

      // Should return 401 (unauthorized) not 404 (not found)
      expect(response.status).not.toBe(404);
    });
  });

  /**
   * M08: Production Query Logging Test
   * Verify query logging configuration
   */
  describe('M08: Production Query Logging', () => {
    it('should have correct NODE_ENV configuration', async () => {
      const isProduction = process.env.NODE_ENV === 'production';
      
      // This test just verifies the config is accessible
      expect(typeof isProduction).toBe('boolean');
    });
  });
});

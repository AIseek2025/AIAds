import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env.test') });

import request from 'supertest';

jest.mock('../src/config/database', () => {
  if (process.env.TEST_USE_REAL_DB === '1') {
    return jest.requireActual('../src/config/database');
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./prisma-memory').createPrismaMemoryMock();
});

jest.mock('../src/config/redis', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getTestRedis } = require('./memory-redis');
  return {
    cacheService: {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    },
    initRedis: jest.fn(() => getTestRedis()),
    getRedis: jest.fn(() => getTestRedis()),
    closeRedis: jest.fn(),
  };
});

import { resetPrismaMemory } from './prisma-memory';
import { resetTestRedis } from './memory-redis';
import app from '../src/app';
import { hashPassword } from '../src/utils/crypto';

beforeAll(async () => {
  await new Promise((resolve) => setTimeout(resolve, 500));
});

afterEach(async () => {
  resetTestRedis();
  if (process.env.TEST_USE_REAL_DB !== '1') {
    resetPrismaMemory();
  }
  jest.clearAllMocks();
});

afterAll(async () => {
  // no-op
});

export async function createTestUser(overrides: Record<string, unknown> = {}) {
  const userData = {
    email: `test_${Date.now()}@test.com`,
    password: 'TestPass123!',
    role: 'advertiser' as const,
    nickname: 'Test User',
    ...overrides,
  };

  const passwordHash = await hashPassword(userData.password as string);

  return {
    id: 'test-user-id',
    email: userData.email,
    passwordHash,
    role: userData.role,
    nickname: userData.nickname,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function getAuthToken(overrides: Record<string, unknown> = {}) {
  const email = `test_${Date.now()}@test.com`;
  await request(app)
    .post('/api/v1/auth/register')
    .send({
      email,
      password: 'TestPass123!',
      role: 'advertiser',
      nickname: 'Test User',
      ...overrides,
    });

  const response = await request(app).post('/api/v1/auth/login').send({
    email,
    password: 'TestPass123!',
  });

  return {
    token: response.body.data?.tokens?.access_token || 'mock-token',
    user: response.body.data?.user,
  };
}

declare global {
  namespace NodeJS {
    interface Global {
      testUser: unknown;
      testToken: string;
    }
  }
}

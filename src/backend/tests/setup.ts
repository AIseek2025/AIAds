// Load test environment variables first
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

import request from 'supertest';

// Mock Prisma before importing app
jest.mock('../src/config/database', () => {
  const mockPrisma = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    advertiser: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    kol: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    campaign: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    order: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $on: jest.fn(),
    $use: jest.fn(),
    $transaction: jest.fn(),
  };

  return {
    __esModule: true,
    default: mockPrisma,
    connectDatabase: jest.fn(),
    disconnectDatabase: jest.fn(),
    connectionPoolConfig: {},
  };
});

// Mock Redis
jest.mock('../src/config/redis', () => ({
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  },
  initRedis: jest.fn(),
  closeRedis: jest.fn(),
}));

import app from '../src/app';
import { hashPassword } from '../src/utils/crypto';

// Global test setup
beforeAll(async () => {
  // Wait for database to be ready
  await new Promise((resolve) => setTimeout(resolve, 1000));
});

// Clean up test data after each test
afterEach(async () => {
  // Clear all mocks
  jest.clearAllMocks();
});

// Close database connection
afterAll(async () => {
  // Cleanup
});

// Helper function to create test user
export async function createTestUser(overrides = {}) {
  const userData = {
    email: `test_${Date.now()}@test.com`,
    password: 'TestPass123!',
    role: 'advertiser' as const,
    nickname: 'Test User',
    ...overrides,
  };

  const passwordHash = await hashPassword(userData.password);

  const user = {
    id: 'test-user-id',
    email: userData.email,
    passwordHash,
    role: userData.role,
    nickname: userData.nickname,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return user;
}

// Helper function to get auth token
export async function getAuthToken(overrides = {}) {
  const user = await createTestUser(overrides);

  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: user.email,
      password: 'TestPass123!',
    });

  return {
    token: response.body.data?.tokens?.access_token || 'mock-token',
    user,
  };
}

// Declare global test types
declare global {
  namespace NodeJS {
    interface Global {
      testUser: any;
      testToken: string;
    }
  }
}

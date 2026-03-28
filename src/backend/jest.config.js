const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.test') });

const useRealDb = process.env.TEST_USE_REAL_DB === '1';

/** Without a real Postgres (TEST_USE_REAL_DB=1), only auth + unit tests run; prisma-memory covers auth/admin. */
const integrationTestFiles = useRealDb
  ? []
  : [
      'kols\\.test\\.ts$',
      'orders\\.test\\.ts$',
      'campaigns\\.test\\.ts$',
      'advertisers\\.test\\.ts$',
      'tasks\\.test\\.ts$',
      'users\\.test\\.ts$',
      'security\\.test\\.ts$',
      'admin\\/kols\\.test\\.ts$',
      'admin\\/users\\.test\\.ts$',
      'admin\\/finance\\.test\\.ts$',
      'admin\\/dashboard\\.test\\.ts$',
    ];

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/app.ts',
    '!src/config/**/*',
    '!src/types/**/*',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', ...integrationTestFiles],
  verbose: true,
  testTimeout: 30000,
  setupFiles: ['<rootDir>/tests/load-env.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

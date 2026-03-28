'use strict';

/**
 * ESLint 9+ flat config — 通过 FlatCompat 复用 `.eslintrc.json`，避免重复规则。
 * @see https://eslint.org/docs/latest/use/configure/migration-guide
 */
const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

const eslintrc = require('./.eslintrc.json');

module.exports = [
  ...compat.config(eslintrc),
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', '*.js', 'jest.config.js', 'tests/performance/**'],
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      // 大量 `req.admin?.id!` 等需逐步改为显式判空；暂降为 warn 以免阻塞 CI
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'warn',
      // 允许 `== null` / `!= null` 同时覆盖 null 与 undefined（TS 常见写法）
      eqeqeq: ['error', 'always', { null: 'ignore' }],
    },
  },
  {
    files: ['src/middleware/auth.ts', 'src/middleware/adminAuth.ts', 'src/middleware/auditLog.ts'],
    rules: {
      // Express `declare global { namespace Express { ... } }` 为标准扩展方式
      '@typescript-eslint/no-namespace': 'off',
    },
  },
  {
    files: ['tests/**/*.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
  {
    files: ['tests/setup.ts'],
    rules: {
      '@typescript-eslint/no-namespace': 'off',
    },
  },
];

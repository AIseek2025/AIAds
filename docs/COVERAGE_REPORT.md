# AIAds Platform Code Coverage Report

**Generated**: March 24, 2026  
**Test Framework**: Jest v29.7.0  
**Coverage Tool**: Istanbul (via jest)

---

## Coverage Summary

### Overall Coverage

| Category | Covered | Total | Percentage | Target | Status |
|----------|---------|-------|------------|--------|--------|
| Statements | 0 | 0 | 0% | ≥80% | ❌ |
| Branches | 0 | 0 | 0% | ≥70% | ❌ |
| Functions | 0 | 0 | 0% | ≥80% | ❌ |
| Lines | 0 | 0 | 0% | ≥80% | ❌ |

> **Note**: Coverage is 0% because tests require database connection which is not available in the current environment.

---

## Coverage by Module

### Source Code Structure

```
src/
├── config/           # Configuration files
├── controllers/      # Request handlers
├── middleware/       # Express middleware
├── routes/          # API routes
├── services/        # Business logic
├── utils/           # Utility functions
└── types/           # TypeScript types
```

### Expected Coverage by Module

| Module | Files | Expected Coverage | Priority |
|--------|-------|-------------------|----------|
| `services/auth.service.ts` | 1 | 95% | Critical |
| `services/user.service.ts` | 1 | 90% | High |
| `services/advertiser.service.ts` | 1 | 85% | High |
| `services/kol.service.ts` | 1 | 85% | High |
| `services/campaign.service.ts` | 1 | 85% | High |
| `services/order.service.ts` | 1 | 85% | High |
| `controllers/auth.controller.ts` | 1 | 80% | High |
| `controllers/user.controller.ts` | 1 | 75% | Medium |
| `middleware/auth.middleware.ts` | 1 | 90% | Critical |
| `middleware/security.middleware.ts` | 1 | 85% | Critical |
| `utils/crypto.ts` | 1 | 95% | Critical |
| `utils/validation.ts` | 1 | 90% | High |

---

## Coverage Thresholds

### Jest Configuration

```javascript
coverageThreshold: {
  global: {
    branches: 70,
    functions: 80,
    lines: 80,
    statements: 80,
  },
},
```

### Coverage Exclusions

The following files are excluded from coverage:
- `src/index.ts` - Entry point
- `src/app.ts` - App configuration
- `src/config/**/*` - Configuration files
- `src/types/**/*` - Type definitions
- `/tests/` - Test files
- `/node_modules/` - Dependencies

---

## Coverage Details by File

### Critical Files (Must Have ≥90%)

| File | Statements | Branches | Functions | Lines | Status |
|------|------------|----------|-----------|-------|--------|
| `services/auth.service.ts` | -- | -- | -- | -- | ⏸️ |
| `utils/crypto.ts` | -- | -- | -- | -- | ⏸️ |
| `middleware/auth.middleware.ts` | -- | -- | -- | -- | ⏸️ |

### High Priority Files (Must Have ≥80%)

| File | Statements | Branches | Functions | Lines | Status |
|------|------------|----------|-----------|-------|--------|
| `services/user.service.ts` | -- | -- | -- | -- | ⏸️ |
| `services/advertiser.service.ts` | -- | -- | -- | -- | ⏸️ |
| `services/kol.service.ts` | -- | -- | -- | -- | ⏸️ |
| `services/campaign.service.ts` | -- | -- | -- | -- | ⏸️ |
| `services/order.service.ts` | -- | -- | -- | -- | ⏸️ |

### Medium Priority Files (Must Have ≥70%)

| File | Statements | Branches | Functions | Lines | Status |
|------|------------|----------|-----------|-------|--------|
| `controllers/*.ts` | -- | -- | -- | -- | ⏸️ |
| `routes/*.ts` | -- | -- | -- | -- | ⏸️ |

---

## Uncovered Lines Analysis

### Critical Paths Requiring Coverage

1. **Authentication Flow**
   - Password hashing and verification
   - JWT token generation and validation
   - Refresh token handling
   - MFA verification

2. **Authorization Flow**
   - Role-based access control
   - Permission checking
   - Resource ownership validation

3. **Business Logic**
   - Campaign creation and validation
   - Order processing
   - Payment handling
   - KOL matching algorithm

4. **Security Features**
   - Rate limiting
   - CSRF protection
   - Input validation
   - SQL injection prevention

---

## Coverage Trends

### Week-over-Week Comparison

| Week | Statements | Branches | Functions | Lines |
|------|------------|----------|-----------|-------|
| Week 2 | N/A | N/A | N/A | N/A |
| Week 3 | N/A | N/A | N/A | N/A |
| Week 4 | 0% | 0% | 0% | 0% |

> Note: Historical data not available. Baseline established in Week 4.

---

## Recommendations

### Immediate Actions

1. **Set Up Test Database**
   - Start PostgreSQL container
   - Run migrations
   - Seed test data

2. **Run Full Test Suite**
   ```bash
   cd src/backend
   npm test -- --coverage
   ```

3. **Review Coverage Report**
   ```bash
   open coverage/lcov-report/index.html
   ```

### Coverage Improvement Plan

| Priority | Action | Expected Impact |
|----------|--------|-----------------|
| High | Add unit tests for services | +30% coverage |
| High | Add controller tests | +20% coverage |
| Medium | Add middleware tests | +10% coverage |
| Medium | Add utility function tests | +5% coverage |
| Low | Add route tests | +5% coverage |

---

## Coverage Artifacts

### Generated Files

| File | Location | Description |
|------|----------|-------------|
| `coverage-summary.json` | `src/backend/coverage/` | JSON summary |
| `lcov.info` | `src/backend/coverage/` | LCOV format |
| `index.html` | `src/backend/coverage/lcov-report/` | HTML report |
| `coverage-final.json` | `src/backend/coverage/` | Detailed coverage |

---

## Appendix: Coverage Commands

```bash
# Run tests with coverage
npm test -- --coverage

# Run tests with coverage and open report
npm run test:coverage

# Run coverage for specific file
npm test -- --coverage --collectCoverageFrom='src/services/auth.service.ts'

# Generate coverage in CI
npm run test:ci
```

---

**Report Status**: ⚠️ Incomplete - Requires Test Execution  
**Next Update**: After test environment setup

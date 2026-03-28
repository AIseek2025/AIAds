import { describe, it, expect } from 'vitest';
import {
  budgetUtilizationRatio,
  isBudgetAtOrAboveRisk,
} from '../usePublicUiConfig';

describe('budgetUtilizationRatio', () => {
  it('returns 0 when budget is 0', () => {
    expect(budgetUtilizationRatio(0, 100)).toBe(0);
  });

  it('computes spent/budget', () => {
    expect(budgetUtilizationRatio(100, 85)).toBeCloseTo(0.85);
  });

  it('zero spent yields 0 utilization', () => {
    expect(budgetUtilizationRatio(100, 0)).toBe(0);
  });
});

describe('isBudgetAtOrAboveRisk', () => {
  it('is true when utilization equals threshold', () => {
    expect(isBudgetAtOrAboveRisk(100, 85, 0.85)).toBe(true);
  });

  it('is false when below threshold', () => {
    expect(isBudgetAtOrAboveRisk(100, 84, 0.85)).toBe(false);
  });
});

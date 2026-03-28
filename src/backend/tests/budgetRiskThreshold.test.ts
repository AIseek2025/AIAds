import { getBudgetRiskThreshold } from '../src/utils/budgetRiskThreshold';

describe('getBudgetRiskThreshold', () => {
  const KEY = 'AIADS_BUDGET_RISK_THRESHOLD';
  let saved: string | undefined;

  beforeEach(() => {
    saved = process.env[KEY];
    delete process.env[KEY];
  });

  afterEach(() => {
    if (saved === undefined) delete process.env[KEY];
    else process.env[KEY] = saved;
  });

  it('defaults to 0.85 when unset', () => {
    expect(getBudgetRiskThreshold()).toBe(0.85);
  });

  it('clamps to [0, 1]', () => {
    process.env[KEY] = '1.5';
    expect(getBudgetRiskThreshold()).toBe(1);
    process.env[KEY] = '-0.1';
    expect(getBudgetRiskThreshold()).toBe(0);
  });

  it('parses valid decimal', () => {
    process.env[KEY] = '0.9';
    expect(getBudgetRiskThreshold()).toBe(0.9);
  });

  it('falls back when non-finite', () => {
    process.env[KEY] = 'nan';
    expect(getBudgetRiskThreshold()).toBe(0.85);
  });

  it('empty string env falls back to default', () => {
    process.env[KEY] = '';
    expect(getBudgetRiskThreshold()).toBe(0.85);
  });

  it('boundary 0 and 1 are accepted', () => {
    process.env[KEY] = '0';
    expect(getBudgetRiskThreshold()).toBe(0);
    process.env[KEY] = '1';
    expect(getBudgetRiskThreshold()).toBe(1);
  });
});

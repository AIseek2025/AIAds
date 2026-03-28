import { describe, it, expect } from 'vitest';
import { getLowBalanceAlertCny, isAdvertiserLowBalance } from '../lowBalanceAlert';

describe('getLowBalanceAlertCny', () => {
  it('prefers balance field', () => {
    expect(getLowBalanceAlertCny({ low_balance_alert_cny: 300 }, { low_balance_alert_cny: 500 })).toBe(300);
  });

  it('falls back to public config then default', () => {
    expect(getLowBalanceAlertCny(undefined, { low_balance_alert_cny: 400 })).toBe(400);
    expect(getLowBalanceAlertCny(undefined, undefined)).toBe(500);
  });
});

describe('isAdvertiserLowBalance', () => {
  it('is false when balance missing', () => {
    expect(isAdvertiserLowBalance(undefined, undefined)).toBe(false);
  });

  it('is true when wallet below line', () => {
    expect(
      isAdvertiserLowBalance({ wallet_balance: 100, low_balance_alert_cny: 200 }, undefined)
    ).toBe(true);
  });

  it('is false when wallet equals alert line', () => {
    expect(isAdvertiserLowBalance({ wallet_balance: 200, low_balance_alert_cny: 200 }, undefined)).toBe(false);
  });
});

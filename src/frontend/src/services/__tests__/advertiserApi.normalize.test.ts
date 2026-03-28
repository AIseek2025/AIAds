import { describe, it, expect } from 'vitest';
import {
  normalizeAdvertiserFromApi,
  normalizeAdvertiserTransactionFromApi,
  normalizeCampaignFromApi,
  serializeCampaignForCreateApi,
} from '../advertiserApi';

describe('normalizeCampaignFromApi', () => {
  it('maps backend engagement objective to consideration', () => {
    const c = normalizeCampaignFromApi({
      id: '1',
      advertiser_id: 'a1',
      title: 'T',
      objective: 'engagement',
      budget: 100,
      status: 'draft',
    });
    expect(c.objective).toBe('consideration');
  });

  it('accepts camelCase advertiserId and targetPlatforms', () => {
    const c = normalizeCampaignFromApi({
      id: 'c1',
      advertiserId: 'adv',
      title: 'Camp',
      objective: 'awareness',
      budget: 0,
      targetPlatforms: ['tiktok', 'youtube'],
      status: 'active',
    });
    expect(c.advertiserId).toBe('adv');
    expect(c.targetPlatforms).toEqual(['tiktok', 'youtube']);
  });

  it('coerces numeric strings to numbers for budget and counters', () => {
    const c = normalizeCampaignFromApi({
      id: '1',
      advertiser_id: 'a',
      title: 'x',
      budget: '5000' as unknown as number,
      total_kols: '3' as unknown as number,
      status: 'draft',
    });
    expect(c.budget).toBe(5000);
    expect(c.totalKols).toBe(3);
  });
});

describe('serializeCampaignForCreateApi + objective roundtrip', () => {
  it('maps consideration back to engagement for backend', () => {
    const payload = serializeCampaignForCreateApi({
      title: 'N',
      objective: 'consideration',
      budget: 100,
    });
    expect(payload.objective).toBe('engagement');
  });
});

describe('normalizeAdvertiserFromApi', () => {
  it('maps snake_case balances and counters', () => {
    const a = normalizeAdvertiserFromApi({
      id: 'adv1',
      user_id: 'u1',
      company_name: 'Co',
      wallet_balance: '99.5' as unknown as number,
      frozen_balance: 10,
      total_campaigns: '2' as unknown as number,
      verification_status: 'verified',
    });
    expect(a.walletBalance).toBe(99.5);
    expect(a.frozenBalance).toBe(10);
    expect(a.totalCampaigns).toBe(2);
    expect(a.verificationStatus).toBe('verified');
  });
});

describe('normalizeAdvertiserTransactionFromApi', () => {
  it('maps snake_case transaction fields', () => {
    const t = normalizeAdvertiserTransactionFromApi({
      id: 'tx1',
      transaction_no: 'T-001',
      type: 'order_payment',
      amount: 100,
      currency: 'CNY',
      payment_method: 'alipay',
      status: 'completed',
      order_id: 'ord-1',
      created_at: '2026-01-01T00:00:00.000Z',
      balance_before: 1000,
      balance_after: 900,
    });
    expect(t.transactionNo).toBe('T-001');
    expect(t.type).toBe('order_payment');
    expect(t.orderId).toBe('ord-1');
    expect(t.balanceAfter).toBe(900);
    expect(t.paymentMethod).toBe('alipay');
  });
});

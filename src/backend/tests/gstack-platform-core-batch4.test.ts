/**
 * GStack 平台核心域单测第四批次：CPM 结算 / KOL 关键词排序加成 / 脱敏边界 / 常量契约
 */

import { Prisma } from '@prisma/client';
import {
  EFFECTIVE_IMPRESSION_VIDEO_MIN_SEC,
  EFFECTIVE_IMPRESSION_IMAGE_MIN_SEC,
  DEFAULT_PLATFORM_FEE_RATE,
  billableImpressionsFromOrderViews,
  grossSpendFromCpm,
  applyCpmBudgetCap,
  splitGrossWithPlatformFee,
  buildCpmBreakdown,
  prismaDecimalsFromCpmSettlement,
} from '../src/services/cpm-metrics.service';
import { computeKolKeywordRank } from '../src/utils/kolSearchRank';
import {
  maskIdNumber,
  maskCardNumber,
  maskTaxId,
  maskPhone,
  maskAdvertiserData,
  maskVerificationCode,
} from '../src/utils/mask';

describe('cpm-metrics constants and billableImpressionsFromOrderViews', () => {
  it('exposes effective impression floor constants', () => {
    expect(EFFECTIVE_IMPRESSION_VIDEO_MIN_SEC).toBe(3);
    expect(EFFECTIVE_IMPRESSION_IMAGE_MIN_SEC).toBe(2);
    expect(DEFAULT_PLATFORM_FEE_RATE).toBe(0.1);
  });

  it('billableImpressionsFromOrderViews floors non-negative', () => {
    expect(billableImpressionsFromOrderViews(99.7)).toBe(99);
    expect(billableImpressionsFromOrderViews(-1)).toBe(0);
  });
});

describe('cpm-metrics grossSpendFromCpm / applyCpmBudgetCap / splitGrossWithPlatformFee', () => {
  it('grossSpendFromCpm returns 0 when cpmRate not positive', () => {
    expect(grossSpendFromCpm(1000, 0)).toBe(0);
    expect(grossSpendFromCpm(1000, -1)).toBe(0);
  });

  it('applyCpmBudgetCap ignores non-positive cap', () => {
    expect(applyCpmBudgetCap(100, new Prisma.Decimal(0))).toBe(100);
    expect(applyCpmBudgetCap(100, null)).toBe(100);
  });

  it('splitGrossWithPlatformFee uses default fee rate', () => {
    const s = splitGrossWithPlatformFee(100);
    expect(s.platformFee).toBe(10);
    expect(s.kolEarning).toBe(90);
  });

  it('splitGrossWithPlatformFee zero fee passes gross to kol', () => {
    const s = splitGrossWithPlatformFee(50, 0);
    expect(s.platformFee).toBe(0);
    expect(s.kolEarning).toBe(50);
  });

  it('applyCpmBudgetCap clamps gross to cap', () => {
    expect(applyCpmBudgetCap(200, new Prisma.Decimal(40))).toBe(40);
  });

  it('splitGrossWithPlatformFee rate 1 assigns all gross to platform fee', () => {
    const s = splitGrossWithPlatformFee(100, 1);
    expect(s.platformFee).toBe(100);
    expect(s.kolEarning).toBe(0);
  });
});

describe('cpm-metrics buildCpmBreakdown fixed vs cpm', () => {
  const baseOrder = {
    views: 5000,
    cpmRate: null as Prisma.Decimal | null,
    cpmBudgetCap: null as Prisma.Decimal | null,
    price: new Prisma.Decimal(200),
    platformFee: new Prisma.Decimal(20),
    kolEarning: new Prisma.Decimal(180),
  };

  it('fixed pricing keeps order monetary fields', () => {
    const out = buildCpmBreakdown({ ...baseOrder, pricingModel: 'fixed' });
    expect(out.pricing_model).toBe('fixed');
    expect(out.gross_spend).toBe(200);
    expect(out.cpm_rate).toBeNull();
  });

  it('cpm pricing recomputes gross and split', () => {
    const out = buildCpmBreakdown({
      ...baseOrder,
      pricingModel: 'cpm',
      cpmRate: new Prisma.Decimal(10),
      cpmBudgetCap: new Prisma.Decimal(9999),
    });
    expect(out.pricing_model).toBe('cpm');
    expect(out.billable_impressions).toBe(5000);
    expect(out.gross_spend).toBeGreaterThan(0);
    expect(out.platform_fee + out.kol_earning).toBeCloseTo(out.gross_spend, 5);
  });
});

describe('cpm-metrics prismaDecimalsFromCpmSettlement', () => {
  it('returns Prisma.Decimal triple with fixed precision', () => {
    const d = prismaDecimalsFromCpmSettlement(12.345678, 1.234567, 11.111111);
    expect(d.price.toFixed(2)).toBe('12.35');
    expect(d.platformFee.toFixed(2)).toBe('1.23');
    expect(d.kolEarning.toFixed(2)).toBe('11.11');
  });
});

describe('kolSearchRank computeKolKeywordRank', () => {
  it('multi-field hits add bonus capped at 15', () => {
    const row = {
      platformUsername: 'foouser',
      platformDisplayName: 'Foo Display',
      bio: 'something foo bar',
      category: 'foo',
    };
    const r = computeKolKeywordRank(row, 'foo');
    expect(r.matched_fields.length).toBeGreaterThanOrEqual(2);
    expect(r.score).toBeGreaterThanOrEqual(85);
  });

  it('category exact match scores and lists category', () => {
    const row = {
      platformUsername: 'x',
      platformDisplayName: null,
      bio: null,
      category: 'beauty',
    };
    const r = computeKolKeywordRank(row, 'beauty');
    expect(r.matched_fields).toContain('category');
    expect(r.score).toBeGreaterThanOrEqual(72);
  });

  it('empty keyword returns zero score', () => {
    expect(computeKolKeywordRank({ platformUsername: 'a', platformDisplayName: null, bio: null, category: null }, '   ').score).toBe(0);
  });

  it('display_name prefix match records display_name', () => {
    const r = computeKolKeywordRank(
      { platformUsername: 'z', platformDisplayName: 'HelloWorld', bio: null, category: null },
      'hello'
    );
    expect(r.matched_fields).toContain('display_name');
    expect(r.score).toBeGreaterThanOrEqual(78);
  });
});

describe('mask edge cases', () => {
  it('maskIdNumber non-18 long digits uses middle mask branch', () => {
    const out = maskIdNumber('1101011990010112345');
    expect(out).toContain('********');
  });

  it('maskCardNumber short digit string returns fallback', () => {
    expect(maskCardNumber('1234')).toBe('****');
  });

  it('maskTaxId short returns stars', () => {
    expect(maskTaxId('123')).toBe('****');
  });

  it('maskPhone strips non-digits then masks 11-digit chinese mobile', () => {
    expect(maskPhone('138-1234-5678')).toBe('138****5678');
  });

  it('maskAdvertiserData leaves unrelated keys', () => {
    const out = maskAdvertiserData({ id: 'x', companyName: 'Test Co Ltd' } as Record<string, unknown>);
    expect(out.id).toBe('x');
    expect(String(out.companyName)).toContain('T**');
  });

  it('maskVerificationCode is fixed', () => {
    expect(maskVerificationCode()).toBe('******');
  });
});

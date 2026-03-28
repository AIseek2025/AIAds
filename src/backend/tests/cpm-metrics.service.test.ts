import {
  applyCpmBudgetCap,
  grossSpendFromCpm,
  billableImpressionsFromOrderViews,
  splitGrossWithPlatformFee,
  buildCpmBreakdown,
  prismaDecimalsFromCpmSettlement,
} from '../src/services/cpm-metrics.service';
import { Prisma } from '@prisma/client';

describe('cpm-metrics.service', () => {
  it('grossSpendFromCpm matches 曝光/1000×CPM', () => {
    expect(grossSpendFromCpm(10000, 50)).toBe(500);
    expect(grossSpendFromCpm(500, 20)).toBe(10);
    expect(grossSpendFromCpm(0, 99)).toBe(0);
    expect(grossSpendFromCpm(333, 10)).toBe(3.33);
  });

  it('grossSpendFromCpm returns 0 when CPM rate is not positive', () => {
    expect(grossSpendFromCpm(1000, 0)).toBe(0);
    expect(grossSpendFromCpm(1000, -5)).toBe(0);
  });

  it('applyCpmBudgetCap caps gross', () => {
    expect(applyCpmBudgetCap(500, new Prisma.Decimal(100))).toBe(100);
    expect(applyCpmBudgetCap(50, null)).toBe(50);
  });

  it('applyCpmBudgetCap ignores non-positive cap', () => {
    expect(applyCpmBudgetCap(500, new Prisma.Decimal(0))).toBe(500);
    expect(applyCpmBudgetCap(500, new Prisma.Decimal(-10))).toBe(500);
  });

  it('splitGrossWithPlatformFee uses 10% default', () => {
    const s = splitGrossWithPlatformFee(100, 0.1);
    expect(s.platformFee).toBe(10);
    expect(s.kolEarning).toBe(90);
  });

  it('splitGrossWithPlatformFee zero fee passes gross to kol', () => {
    const s = splitGrossWithPlatformFee(200, 0);
    expect(s.platformFee).toBe(0);
    expect(s.kolEarning).toBe(200);
  });

  it('splitGrossWithPlatformFee rate 1 takes full gross as platform fee', () => {
    const s = splitGrossWithPlatformFee(100, 1);
    expect(s.platformFee).toBe(100);
    expect(s.kolEarning).toBe(0);
  });

  it('billableImpressionsFromOrderViews floors views', () => {
    expect(billableImpressionsFromOrderViews(3.7)).toBe(3);
    expect(billableImpressionsFromOrderViews(-1)).toBe(0);
  });

  it('buildCpmBreakdown keeps fixed order amounts when pricing is not cpm', () => {
    const b = buildCpmBreakdown({
      pricingModel: 'fixed',
      views: 1000,
      cpmRate: new Prisma.Decimal(20),
      cpmBudgetCap: null,
      price: new Prisma.Decimal(500),
      platformFee: new Prisma.Decimal(50),
      kolEarning: new Prisma.Decimal(450),
    });
    expect(b.pricing_model).toBe('fixed');
    expect(b.gross_spend).toBe(500);
    expect(b.platform_fee).toBe(50);
    expect(b.kol_earning).toBe(450);
  });

  it('buildCpmBreakdown applies CPM math and budget cap for cpm orders', () => {
    const b = buildCpmBreakdown({
      pricingModel: 'cpm',
      views: 100000,
      cpmRate: new Prisma.Decimal(50),
      cpmBudgetCap: new Prisma.Decimal(100),
      price: new Prisma.Decimal(9999),
      platformFee: new Prisma.Decimal(0),
      kolEarning: new Prisma.Decimal(0),
    });
    expect(b.pricing_model).toBe('cpm');
    expect(b.gross_spend).toBe(100);
    expect(b.platform_fee).toBe(10);
    expect(b.kol_earning).toBe(90);
  });

  it('prismaDecimalsFromCpmSettlement preserves monetary values as Decimal', () => {
    const d = prismaDecimalsFromCpmSettlement(10.5, 1.05, 9.45);
    expect(d.price.toNumber()).toBeCloseTo(10.5);
    expect(d.platformFee.toNumber()).toBeCloseTo(1.05);
    expect(d.kolEarning.toNumber()).toBeCloseTo(9.45);
  });
});

import { describe, it, expect } from 'vitest';
import { advertiserOrderFrozenCny, advertiserOrderGrossSpendCny } from '../advertiserOrderGross';

describe('advertiserOrderGrossSpendCny', () => {
  it('CPM 用 gross_spend', () => {
    expect(
      advertiserOrderGrossSpendCny({
        pricing_model: 'cpm',
        cpm_breakdown: { gross_spend: 120 },
        price: 999,
      })
    ).toBe(120);
  });

  it('CPM 支持 camelCase', () => {
    expect(
      advertiserOrderGrossSpendCny({
        pricingModel: 'cpm',
        cpmBreakdown: { grossSpend: 88 },
      })
    ).toBe(88);
  });

  it('非 CPM 用 price', () => {
    expect(
      advertiserOrderGrossSpendCny({
        pricing_model: 'fixed',
        price: 500,
      })
    ).toBe(500);
  });

  it('无 price 时回退 order_price', () => {
    expect(
      advertiserOrderGrossSpendCny({
        pricing_model: 'fixed',
        order_price: 199,
      })
    ).toBe(199);
  });

  it('CPM 合并行：gross_spend 优先于订单 price（与活动/订单详情合成行一致）', () => {
    expect(
      advertiserOrderGrossSpendCny({
        pricing_model: 'cpm',
        price: 40,
        cpm_breakdown: { gross_spend: 250 },
      })
    ).toBe(250);
  });
});

describe('advertiserOrderFrozenCny', () => {
  it('snake_case 与 camelCase', () => {
    expect(advertiserOrderFrozenCny({ frozen_amount: 12.5 })).toBe(12.5);
    expect(advertiserOrderFrozenCny({ frozenAmount: 3 })).toBe(3);
  });

  it('非法为空', () => {
    expect(advertiserOrderFrozenCny({})).toBe(0);
    expect(advertiserOrderFrozenCny({ frozen_amount: 'x' })).toBe(0);
  });
});

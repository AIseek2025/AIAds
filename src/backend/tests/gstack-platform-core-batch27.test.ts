/**
 * GStack 平台核心域单测第二十七批次（30 条）：order-frozen 聚合与批量冻结合计、cpm-metrics 计费分支、
 * kol 关键词排序与 validateRequest/apiResponseSchema、parseMetricsBatchArgs 与 buildOrderMetricsBatchItems（Prisma mock）、
 * helpers 与 mask、CacheKeys/CacheTTL。
 */

import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import {
  sumFrozenAmountForKol,
  sumFrozenAmountForKols,
  sumFrozenAmountForCampaign,
  sumFrozenAmountForAdvertiser,
  sumFrozenAmountForAdvertisers,
  sumFrozenAmountForCampaigns,
} from '../src/services/order-frozen.util';
import {
  billableImpressionsFromOrderViews,
  grossSpendFromCpm,
  applyCpmBudgetCap,
  splitGrossWithPlatformFee,
  buildCpmBreakdown,
  prismaDecimalsFromCpmSettlement,
} from '../src/services/cpm-metrics.service';
import { computeKolKeywordRank } from '../src/utils/kolSearchRank';
import {
  validateRequest,
  loginSchema,
  apiResponseSchema,
  ValidationError,
} from '../src/utils/validator';
import { parseMetricsBatchArgs, buildOrderMetricsBatchItems } from '../src/scripts/lib/orderMetricsBatchPayload';
import { truncate, formatNumber, isEmpty } from '../src/utils/helpers';
import { maskPhone, maskEmail } from '../src/utils/mask';
import { CacheKeys, CacheTTL } from '../src/services/cache.service';
import {
  seedOrderFrozenForKol,
  seedOrderFrozenForCampaign,
  seedOrderFrozenForAdvertiser,
} from './prisma-memory';

describe('gstack batch27 — order-frozen.util', () => {
  it('sumFrozenAmountForKol 读取 prisma-memory 种子', async () => {
    seedOrderFrozenForKol('kol-a', 88.5);
    await expect(sumFrozenAmountForKol('kol-a')).resolves.toBe(88.5);
  });

  it('sumFrozenAmountForCampaign', async () => {
    seedOrderFrozenForCampaign('camp-1', 200);
    await expect(sumFrozenAmountForCampaign('camp-1')).resolves.toBe(200);
  });

  it('sumFrozenAmountForAdvertiser', async () => {
    seedOrderFrozenForAdvertiser('adv-1', 50.25);
    await expect(sumFrozenAmountForAdvertiser('adv-1')).resolves.toBe(50.25);
  });

  it('sumFrozenAmountForKols 多 KOL 映射', async () => {
    seedOrderFrozenForKol('k1', 10);
    seedOrderFrozenForKol('k2', 20);
    const m = await sumFrozenAmountForKols(['k1', 'k2']);
    expect(m.get('k1')).toBe(10);
    expect(m.get('k2')).toBe(20);
  });

  it('sumFrozenAmountForAdvertisers 批量', async () => {
    seedOrderFrozenForAdvertiser('a1', 1);
    seedOrderFrozenForAdvertiser('a2', 2);
    const m = await sumFrozenAmountForAdvertisers(['a1', 'a2']);
    expect(m.get('a1')).toBe(1);
    expect(m.get('a2')).toBe(2);
  });

  it('sumFrozenAmountForCampaigns 批量', async () => {
    seedOrderFrozenForCampaign('c1', 3);
    seedOrderFrozenForCampaign('c2', 4);
    const m = await sumFrozenAmountForCampaigns(['c1', 'c2']);
    expect(m.get('c1')).toBe(3);
    expect(m.get('c2')).toBe(4);
  });
});

describe('gstack batch27 — cpm-metrics', () => {
  it('billableImpressionsFromOrderViews 负数归零', () => {
    expect(billableImpressionsFromOrderViews(-3)).toBe(0);
  });

  it('grossSpendFromCpm cpmRate≤0 返回 0', () => {
    expect(grossSpendFromCpm(1000, 0)).toBe(0);
  });

  it('applyCpmBudgetCap 上限截断 gross', () => {
    expect(applyCpmBudgetCap(500, new Prisma.Decimal(100))).toBe(100);
  });

  it('splitGrossWithPlatformFee 自定义费率', () => {
    const s = splitGrossWithPlatformFee(100, 0.2);
    expect(s.platformFee).toBe(20);
    expect(s.kolEarning).toBe(80);
  });

  it('buildCpmBreakdown CPM 路径重算 gross 与分成', () => {
    const b = buildCpmBreakdown({
      pricingModel: 'cpm',
      views: 10_000,
      cpmRate: new Prisma.Decimal(50),
      cpmBudgetCap: null,
      price: new Prisma.Decimal(0),
      platformFee: new Prisma.Decimal(0),
      kolEarning: new Prisma.Decimal(0),
    });
    expect(b.pricing_model).toBe('cpm');
    expect(b.billable_impressions).toBe(10_000);
    expect(b.gross_spend).toBe(500);
    expect(b.platform_fee).toBe(50);
    expect(b.kol_earning).toBe(450);
  });

  it('prismaDecimalsFromCpmSettlement 非零金额精度', () => {
    const d = prismaDecimalsFromCpmSettlement(12.3, 1.23, 11.07);
    expect(d.price.toNumber()).toBeCloseTo(12.3, 5);
    expect(d.platformFee.toNumber()).toBeCloseTo(1.23, 5);
  });
});

describe('gstack batch27 — kolSearchRank + validateRequest + apiResponseSchema', () => {
  it('computeKolKeywordRank 空关键词', () => {
    const r = computeKolKeywordRank(
      { platformUsername: 'u', platformDisplayName: 'x', bio: null, category: null },
      '   '
    );
    expect(r.score).toBe(0);
    expect(r.matched_fields).toEqual([]);
  });

  it('computeKolKeywordRank username 全等 + 单字段加成', () => {
    const r = computeKolKeywordRank(
      { platformUsername: 'exact', platformDisplayName: null, bio: null, category: null },
      'exact'
    );
    expect(r.matched_fields).toContain('username');
    expect(r.score).toBe(103);
  });

  it('validateRequest 成功返回解析结果', () => {
    const r = validateRequest(loginSchema, { email: 'a@b.co', password: 'TestPass123!' });
    expect(r.email).toBe('a@b.co');
  });

  it('validateRequest Zod 失败抛出 ValidationError', () => {
    try {
      validateRequest(loginSchema, { email: 'not-email', password: 'TestPass123!' });
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).details.length).toBeGreaterThan(0);
    }
  });

  it('apiResponseSchema 包装 data', () => {
    const s = apiResponseSchema(z.object({ n: z.number() }));
    const ok = s.parse({ success: true, data: { n: 42 } });
    expect((ok.data as { n: number }).n).toBe(42);
  });
});

describe('gstack batch27 — parseMetricsBatchArgs + buildOrderMetricsBatchItems', () => {
  it('parseMetricsBatchArgs --limit 上限 200', () => {
    expect(parseMetricsBatchArgs(['--limit', '999']).limit).toBe(200);
  });

  it('parseMetricsBatchArgs --limit 0 视为 1', () => {
    expect(parseMetricsBatchArgs(['--limit', '0']).limit).toBe(1);
  });

  it('parseMetricsBatchArgs --cpm-only', () => {
    expect(parseMetricsBatchArgs(['--cpm-only']).cpmOnly).toBe(true);
  });

  it('buildOrderMetricsBatchItems 映射 views 与 viewsDelta', async () => {
    const findMany = jest.fn().mockResolvedValue([
      { id: 'o1', views: 10, likes: 1, comments: 0, shares: 2 },
    ]);
    const prisma = { order: { findMany } } as unknown as PrismaClient;
    const items = await buildOrderMetricsBatchItems(prisma, { limit: 5, cpmOnly: false, viewsDelta: 5 });
    expect(items[0]).toEqual(
      expect.objectContaining({ order_id: 'o1', views: 15, likes: 1, comments: 0, shares: 2 })
    );
  });

  it('buildOrderMetricsBatchItems cpmOnly 传入 pricingModel 过滤', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { order: { findMany } } as unknown as PrismaClient;
    await buildOrderMetricsBatchItems(prisma, { limit: 3, cpmOnly: true, viewsDelta: 0 });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { pricingModel: 'cpm' },
      })
    );
  });
});

describe('gstack batch27 — helpers + mask + CacheKeys', () => {
  it('truncate 超长截断', () => {
    expect(truncate('abcdefghij', 5)).toBe('abcde...');
  });

  it('formatNumber 千分位', () => {
    expect(formatNumber(12345.6)).toMatch(/12/);
  });

  it('isEmpty 空对象', () => {
    expect(isEmpty({})).toBe(true);
    expect(isEmpty({ a: 1 })).toBe(false);
  });

  it('maskPhone 11 位大陆号', () => {
    expect(maskPhone('13812345678')).toBe('138****5678');
  });

  it('maskEmail 长用户名', () => {
    expect(maskEmail('hello_world@test.com')).toContain('hel****@test.com');
  });

  it('CacheKeys.user.byEmail 稳定前缀', () => {
    expect(CacheKeys.user.byEmail('A@B.C')).toContain('user:email:');
  });

  it('CacheKeys.kol.byId', () => {
    expect(CacheKeys.kol.byId('kid')).toBe('kol:kid');
  });

  it('CacheTTL.user.detail 与 system.config', () => {
    expect(CacheTTL.user.detail).toBe(600);
    expect(CacheTTL.system.config).toBe(3600);
  });
});

/**
 * GStack 平台核心域单测第十二批次（25–30 个核心域）：
 * Zod 扩展矩阵 / helpers 网络与时间 / CPM 与 Prisma Decimal / 脱敏 / 预算工具 / 指标脚本 / KOL 精确匹配
 */

import type { Request } from 'express';
import { Prisma } from '@prisma/client';
import { parseMetricsBatchArgs } from '../src/scripts/lib/orderMetricsBatchPayload';
import { buildCpmBreakdown, prismaDecimalsFromCpmSettlement } from '../src/services/cpm-metrics.service';
import { genTransactionNo, partialReleaseAmount } from '../src/services/order-budget.service';
import { decimalToNumber } from '../src/utils/decimal';
import { getClientIP, getUserAgent } from '../src/utils/helpers';
import { maskPhone, maskCardNumber, maskAdvertiserData } from '../src/utils/mask';
import { computeKolKeywordRank } from '../src/utils/kolSearchRank';
import { z } from 'zod';
import {
  updateUserSchema,
  createCampaignSchema,
  updateCampaignSchema,
  createOrderSchema,
  createKolSchema,
  bindKolAccountSchema,
  applyTaskSchema,
  submitOrderSchema,
  createAdvertiserSchema,
  sendVerificationCodeSchema,
  resetPasswordBodySchema,
  paginationSchema,
  rechargeSchema,
  apiResponseSchema,
} from '../src/utils/validator';

const CID = '550e8400-e29b-41d4-a716-446655440001';
const KID = '550e8400-e29b-41d4-a716-446655440002';

describe('gstack batch12 — updateUser / Campaign 数值与标签', () => {
  it('updateUserSchema currency ISO4217', () => {
    const r = updateUserSchema.parse({ currency: 'USD' });
    expect(r.currency).toBe('USD');
  });

  it('updateUserSchema currency 长度非法失败', () => {
    expect(() => updateUserSchema.parse({ currency: 'US' })).toThrow();
  });

  it('updateUserSchema timezone', () => {
    const r = updateUserSchema.parse({ timezone: 'UTC' });
    expect(r.timezone).toBe('UTC');
  });

  it('createCampaignSchema min_engagement_rate', () => {
    const r = createCampaignSchema.parse({
      title: 'T',
      budget: 100,
      min_engagement_rate: 0.02,
    });
    expect(r.min_engagement_rate).toBeCloseTo(0.02);
  });

  it('createCampaignSchema objective sales', () => {
    const r = createCampaignSchema.parse({
      title: 'T',
      budget: 50,
      objective: 'sales',
    });
    expect(r.objective).toBe('sales');
  });

  it('updateCampaignSchema required_hashtags', () => {
    const r = updateCampaignSchema.parse({
      required_hashtags: ['#x', '#y'],
    });
    expect(r.required_hashtags).toEqual(['#x', '#y']);
  });
});

describe('gstack batch12 — createOrder CPM 全量 / KOL / 任务 / 交稿', () => {
  it('createOrderSchema CPM 全字段', () => {
    const r = createOrderSchema.parse({
      campaign_id: CID,
      kol_id: KID,
      pricing_model: 'cpm',
      cpm_rate: 8,
      offered_price: 2000,
      requirements: '按 brief',
    });
    expect(r.pricing_model).toBe('cpm');
    expect(r.cpm_rate).toBe(8);
  });

  it('createKolSchema tiktok 含 bio', () => {
    const r = createKolSchema.parse({
      platform: 'tiktok',
      platform_username: 'tt_u',
      platform_id: 'tid',
      bio: 'lifestyle',
    });
    expect(r.bio).toBe('lifestyle');
  });

  it('bindKolAccountSchema refresh_token 可选', () => {
    const r = bindKolAccountSchema.parse({
      platform: 'tiktok',
      platform_username: 'a',
      platform_id: 'b',
      refresh_token: 'rt',
    });
    expect(r.refresh_token).toBe('rt');
  });

  it('applyTaskSchema draft_urls', () => {
    const r = applyTaskSchema.parse({
      draft_urls: ['https://v.example.com/1'],
    });
    expect(r.draft_urls).toHaveLength(1);
  });

  it('submitOrderSchema 仅 draft_urls', () => {
    const r = submitOrderSchema.parse({
      draft_urls: ['https://v.example.com/x'],
    });
    expect(r.draft_urls).toHaveLength(1);
  });
});

describe('gstack batch12 — 广告主 / 验证码 / 重置密码 / 分页 / 充值', () => {
  it('createAdvertiserSchema industry', () => {
    const r = createAdvertiserSchema.parse({
      company_name: 'Co',
      industry: '3C',
    });
    expect(r.industry).toBe('3C');
  });

  it('sendVerificationCodeSchema type phone', () => {
    const r = sendVerificationCodeSchema.parse({
      type: 'phone',
      target: '+8613800138000',
    });
    expect(r.type).toBe('phone');
  });

  it('resetPasswordBodySchema 强新密码', () => {
    const r = resetPasswordBodySchema.parse({
      type: 'email',
      target: 'a@b.co',
      code: '123456',
      new_password: 'New9!zzzz',
    });
    expect(r.new_password).toBe('New9!zzzz');
  });

  it('paginationSchema page_size 上限 100', () => {
    const r = paginationSchema.parse({ page_size: 100 });
    expect(r.page_size).toBe(100);
  });

  it('rechargeSchema alipay 与 payment_proof', () => {
    const r = rechargeSchema.parse({
      amount: 300,
      payment_method: 'alipay',
      payment_proof: 'https://img.example.com/p.png',
    });
    expect(r.payment_proof).toContain('https://');
  });
});

describe('gstack batch12 — apiResponseSchema', () => {
  it('成功信封含 data', () => {
    const schema = apiResponseSchema(z.object({ n: z.number() }));
    const ok = schema.parse({ success: true, data: { n: 1 } });
    expect(ok.success).toBe(true);
    expect(ok.data).toEqual({ n: 1 });
  });
});

describe('gstack batch12 — helpers getClientIP / getUserAgent', () => {
  it('getClientIP 取 x-forwarded-for 首段', () => {
    const req = {
      headers: { 'x-forwarded-for': '203.0.113.2, 10.0.0.1' },
      socket: { remoteAddress: '::1' },
    } as unknown as Request;
    expect(getClientIP(req)).toBe('203.0.113.2');
  });

  it('getUserAgent 缺省为 unknown', () => {
    expect(getUserAgent({ headers: {} } as unknown as Request)).toBe('unknown');
  });
});

describe('gstack batch12 — buildCpmBreakdown / prismaDecimalsFromCpmSettlement', () => {
  it('fixed 计价 views 为 0 仍保留订单金额', () => {
    const r = buildCpmBreakdown({
      pricingModel: 'fixed',
      views: 0,
      cpmRate: null,
      cpmBudgetCap: null,
      price: new Prisma.Decimal(200),
      platformFee: new Prisma.Decimal(20),
      kolEarning: new Prisma.Decimal(180),
    });
    expect(r.pricing_model).toBe('fixed');
    expect(r.billable_impressions).toBe(0);
    expect(r.gross_spend).toBe(200);
  });

  it('prismaDecimalsFromCpmSettlement 固定小数位', () => {
    const d = prismaDecimalsFromCpmSettlement(10.5, 1.05, 9.45);
    expect(d.price.toFixed(2)).toBe('10.50');
    expect(d.platformFee.toFixed(2)).toBe('1.05');
    expect(d.kolEarning.toFixed(2)).toBe('9.45');
  });
});

describe('gstack batch12 — maskPhone / maskCardNumber / maskAdvertiserData', () => {
  it('maskPhone 11 位国内号', () => {
    expect(maskPhone('13812345678')).toBe('138****5678');
  });

  it('maskCardNumber 16+ 位卡号', () => {
    const out = maskCardNumber('6222021234567890123');
    expect(out).toContain('6222');
  });

  it('maskAdvertiserData 公司名与税号', () => {
    const out = maskAdvertiserData({
      companyName: 'ACME Trading Ltd',
      taxId: '91310101MA1234567X',
    });
    expect(String(out.companyName)).toMatch(/^A\*\*/);
    expect(out.taxId).toContain('913101');
  });
});

describe('gstack batch12 — computeKolKeywordRank / order-budget / parseMetricsBatchArgs / decimalToNumber', () => {
  it('computeKolKeywordRank username 精确匹配（含单字段加成）', () => {
    const r = computeKolKeywordRank(
      { platformUsername: 'brand', platformDisplayName: null, bio: null, category: null },
      'brand'
    );
    expect(r.matched_fields).toContain('username');
    expect(r.score).toBe(103);
  });

  it('genTransactionNo 唯一性', () => {
    expect(genTransactionNo()).not.toBe(genTransactionNo());
  });

  it('partialReleaseAmount 请求大于冻结', () => {
    expect(partialReleaseAmount(50, 200)).toBe(50);
  });

  it('parseMetricsBatchArgs --limit 999 封顶 200', () => {
    expect(parseMetricsBatchArgs(['--limit', '999']).limit).toBe(200);
  });

  it('decimalToNumber Infinity 为 0', () => {
    expect(decimalToNumber(Infinity)).toBe(0);
  });
});

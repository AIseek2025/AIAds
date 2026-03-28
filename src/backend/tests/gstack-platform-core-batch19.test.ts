/**
 * GStack 平台核心域单测第十九批次（30 个核心域，单文件成批）：
 * 广告主创建/更新、注册 invite 预处理、充值 wechat、活动 per_video/deadline/active、
 * 订单 CPM、KOL YouTube/Instagram、任务草稿、提现 wechat_pay、同步 account_ids、
 * KOL 排序 category 前缀、CPM breakdown 预算帽与拆分/Prisma、预算释放与流水号、
 * 指标脚本 limit 边界、decimal、脱敏广告主/用户/卡号、helpers、validateRequest 失败、
 * sanitize/UUID、CacheTTL/CacheKeys、errors 工厂、apiResponse 失败信封
 */

import { Prisma } from '@prisma/client';
import { parseMetricsBatchArgs } from '../src/scripts/lib/orderMetricsBatchPayload';
import {
  applyCpmBudgetCap,
  buildCpmBreakdown,
  prismaDecimalsFromCpmSettlement,
  splitGrossWithPlatformFee,
} from '../src/services/cpm-metrics.service';
import { genTransactionNo, partialReleaseAmount } from '../src/services/order-budget.service';
import { CacheKeys, CacheTTL } from '../src/services/cache.service';
import { decimalToNumber } from '../src/utils/decimal';
import { deepClone, formatCurrency, formatNumber, isEmpty, omit, pick, slugify, truncate } from '../src/utils/helpers';
import { computeKolKeywordRank } from '../src/utils/kolSearchRank';
import { maskAdvertiserData, maskCardNumber, maskUserData } from '../src/utils/mask';
import { z } from 'zod';
import { errors } from '../src/middleware/errorHandler';
import {
  registerSchema,
  loginSchema,
  sendVerificationCodeSchema,
  resetPasswordBodySchema,
  createAdvertiserSchema,
  updateAdvertiserSchema,
  rechargeSchema,
  createCampaignSchema,
  updateCampaignSchema,
  createOrderSchema,
  createKolSchema,
  bindKolAccountSchema,
  applyTaskSchema,
  withdrawSchema,
  syncKolDataSchema,
  reviseOrderSchema,
  paginationSchema,
  kolSearchSchema,
  validateRequest,
  ValidationError,
  sanitizeString,
  generateUUID,
  apiResponseSchema,
} from '../src/utils/validator';

const CID = '550e8400-e29b-41d4-a716-446655440001';
const KID = '550e8400-e29b-41d4-a716-446655440002';
const AID = '550e8400-e29b-41d4-a716-446655440003';
const BID = '550e8400-e29b-41d4-a716-446655440004';
const STRONG = 'Abcd1234!';

describe('gstack batch19 — register invite / resetPassword / advertiser', () => {
  it('registerSchema invite_code 空串预处理后 undefined', () => {
    const r = registerSchema.parse({
      email: 'i@n.com',
      password: STRONG,
      invite_code: '',
    });
    expect(r.invite_code).toBeUndefined();
  });

  it('resetPasswordBodySchema type email', () => {
    const r = resetPasswordBodySchema.parse({
      type: 'email',
      target: 'r@e.com',
      code: '998877',
      new_password: STRONG,
    });
    expect(r.type).toBe('email');
  });

  it('createAdvertiserSchema 最小集', () => {
    const r = createAdvertiserSchema.parse({ company_name: '最小公司' });
    expect(r.company_name).toBe('最小公司');
  });

  it('updateAdvertiserSchema website null', () => {
    const r = updateAdvertiserSchema.parse({ website: null });
    expect(r.website).toBeNull();
  });
});

describe('gstack batch19 — recharge / Campaign / Order / pagination / kolSearch', () => {
  it('rechargeSchema wechat', () => {
    const r = rechargeSchema.parse({
      amount: 50,
      payment_method: 'wechat',
    });
    expect(r.payment_method).toBe('wechat');
  });

  it('createCampaignSchema per_video 与 deadline', () => {
    const r = createCampaignSchema.parse({
      title: 'PV',
      budget: 99,
      budget_type: 'per_video',
      deadline: '2026-12-01T12:00:00.000Z',
    });
    expect(r.budget_type).toBe('per_video');
    expect(r.deadline).toBeDefined();
  });

  it('updateCampaignSchema active', () => {
    expect(updateCampaignSchema.parse({ status: 'active' }).status).toBe('active');
  });

  it('createOrderSchema cpm', () => {
    const r = createOrderSchema.parse({
      campaign_id: CID,
      kol_id: KID,
      pricing_model: 'cpm',
      cpm_rate: 6,
      offered_price: 400,
    });
    expect(r.pricing_model).toBe('cpm');
  });

  it('paginationSchema page_size 100', () => {
    expect(paginationSchema.parse({ page_size: '100' }).page_size).toBe(100);
  });

  it('kolSearchSchema regions', () => {
    const r = kolSearchSchema.parse({ regions: 'JP,KR' });
    expect(r.regions).toBe('JP,KR');
  });
});

describe('gstack batch19 — KOL youtube instagram / task / withdraw / sync / revise', () => {
  it('createKolSchema youtube', () => {
    const r = createKolSchema.parse({
      platform: 'youtube',
      platform_username: 'yt',
      platform_id: 'UCyt',
    });
    expect(r.platform).toBe('youtube');
  });

  it('bindKolAccountSchema instagram 与 platform_avatar_url', () => {
    const r = bindKolAccountSchema.parse({
      platform: 'instagram',
      platform_username: 'ig',
      platform_id: 'igid',
      platform_avatar_url: 'https://cdn.example.com/i.jpg',
    });
    expect(r.platform).toBe('instagram');
  });

  it('applyTaskSchema draft_urls', () => {
    const r = applyTaskSchema.parse({
      draft_urls: ['https://a.com/1', 'https://a.com/2'],
    });
    expect(r.draft_urls).toHaveLength(2);
  });

  it('withdrawSchema wechat_pay', () => {
    const r = withdrawSchema.parse({
      amount: 20,
      payment_method: 'wechat_pay',
      account_name: '王',
      account_number: 'wx123',
    });
    expect(r.payment_method).toBe('wechat_pay');
  });

  it('syncKolDataSchema account_ids', () => {
    const r = syncKolDataSchema.parse({ account_ids: [AID, BID] });
    expect(r.account_ids).toEqual([AID, BID]);
  });

  it('reviseOrderSchema 仅 draft_urls', () => {
    const r = reviseOrderSchema.parse({ draft_urls: ['https://v.com/r'] });
    expect(r.draft_urls).toHaveLength(1);
  });
});

describe('gstack batch19 — computeKolKeywordRank category 前缀', () => {
  it('category 前缀匹配 58+单字段加成', () => {
    const r = computeKolKeywordRank(
      { platformUsername: 'u', platformDisplayName: null, bio: null, category: 'gaming gear' },
      'gaming'
    );
    expect(r.matched_fields).toContain('category');
    expect(r.score).toBe(61);
  });
});

describe('gstack batch19 — buildCpmBreakdown 预算帽 / applyCap / split / prismaDecimals', () => {
  it('buildCpmBreakdown cpm 曝光计费被 cap 截断', () => {
    const b = buildCpmBreakdown({
      pricingModel: 'cpm',
      views: 50_000,
      cpmRate: new Prisma.Decimal(10),
      cpmBudgetCap: new Prisma.Decimal(80),
      price: new Prisma.Decimal(0),
      platformFee: new Prisma.Decimal(0),
      kolEarning: new Prisma.Decimal(0),
    });
    expect(b.gross_spend).toBe(80);
    expect(b.platform_fee).toBe(8);
    expect(b.kol_earning).toBe(72);
  });

  it('applyCpmBudgetCap 与 splitGrossWithPlatformFee 0.25 与 prismaDecimalsFromCpmSettlement', () => {
    expect(applyCpmBudgetCap(300, new Prisma.Decimal(100))).toBe(100);
    const s = splitGrossWithPlatformFee(400, 0.25);
    expect(s.platformFee).toBe(100);
    expect(s.kolEarning).toBe(300);
    const d = prismaDecimalsFromCpmSettlement(10, 2, 8);
    expect(d.price.toFixed(8)).toBe('10.00000000');
  });
});

describe('gstack batch19 — partialRelease / genTransactionNo / parseMetricsBatchArgs / decimal', () => {
  it('partialReleaseAmount 与 genTransactionNo', () => {
    expect(partialReleaseAmount(100, 25)).toBe(25);
    expect(genTransactionNo()).toMatch(/^TXN-/);
  });

  it('parseMetricsBatchArgs limit 0→1 与 999→200', () => {
    expect(parseMetricsBatchArgs(['--limit', '0']).limit).toBe(1);
    expect(parseMetricsBatchArgs(['--limit', '999']).limit).toBe(200);
  });

  it('decimalToNumber null', () => {
    expect(decimalToNumber(null)).toBe(0);
  });
});

describe('gstack batch19 — maskAdvertiserData / maskUserData / maskCardNumber', () => {
  it('广告主/用户/卡号脱敏', () => {
    const adv = maskAdvertiserData({
      companyName: '测试科技股份公司',
      taxId: '91110000MA01234567',
    });
    expect(String(adv.companyName)).toContain('测');
    const u = maskUserData({ phone: '13800138000', email: 'a@b.com' });
    expect(String(u.phone)).toContain('****');
    expect(maskCardNumber('6222021234567890123')).toContain('****');
  });
});

describe('gstack batch19 — pick / omit / slugify / truncate / deepClone / isEmpty', () => {
  it('pick omit slugify truncate', () => {
    const o = { a: 1, b: 2, c: 3 };
    expect(pick(o, ['a'])).toEqual({ a: 1 });
    expect(omit(o, ['b'])).toEqual({ a: 1, c: 3 });
    expect(slugify('A  B')).toBe('a-b');
    expect(truncate('abcdef', 4)).toBe('abcd...');
  });

  it('deepClone 与 isEmpty', () => {
    expect(isEmpty({})).toBe(true);
    const x = { n: 1 };
    const y = deepClone(x);
    y.n = 2;
    expect(x.n).toBe(1);
  });
});

describe('gstack batch19 — validateRequest 失败 / sanitize / UUID / errors / apiResponse / Cache', () => {
  it('validateRequest 抛 ValidationError 与 sanitizeString generateUUID', () => {
    expect(() => validateRequest(z.string().email(), 'bad')).toThrow(ValidationError);
    expect(sanitizeString('<z>')).toBe('z');
    expect(generateUUID().length).toBe(36);
  });

  it('errors.notFound 与 apiResponseSchema 失败信封', () => {
    const e = errors.notFound();
    expect(e.statusCode).toBe(404);
    const schema = apiResponseSchema(z.object({ id: z.number() }));
    const r = schema.parse({ success: false, error: { code: 'X', message: 'm' } });
    expect(r.success).toBe(false);
    expect(r.error).toEqual({ code: 'X', message: 'm' });
  });

  it('CacheTTL.kol.detail 与 CacheKeys.kol.search', () => {
    expect(CacheTTL.kol.detail).toBe(600);
    const k = CacheKeys.kol.search({
      platform: 'tiktok',
      minFollowers: 1000,
      maxFollowers: 5000,
      minEngagementRate: 0.02,
      category: 'c',
      country: 'US',
    });
    expect(k).toContain('kol:search:');
  });
});

describe('gstack batch19 — login / sendCode / formatCurrency', () => {
  it('loginSchema', () => {
    expect(loginSchema.parse({ email: 'x@y.com', password: 'p' }).email).toBe('x@y.com');
  });

  it('sendVerificationCodeSchema purpose register 与 format 数字/货币', () => {
    const r = sendVerificationCodeSchema.parse({
      type: 'email',
      target: 'new@u.com',
      purpose: 'register',
    });
    expect(r.purpose).toBe('register');
    expect(formatNumber(1000)).toMatch(/1/);
    expect(formatCurrency(9.9, 'CNY')).toMatch(/9/);
  });
});

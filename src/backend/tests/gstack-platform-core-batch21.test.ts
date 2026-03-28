/**
 * GStack 平台核心域单测第二十一批次（30 个核心域，单文件成批）：
 * 登录/发码/邀请码/手机重置、广告主字段、验证码 login、分页默认、KOL 搜索 weibo、
 * 活动 traffic/sales/hashtags、pending_review、订单 CPM、KOL 多平台绑定、任务草稿、
 * PayPal/银行充值、同步与修订、KOL 排序 display 包含与 bio 前缀、CPM 帽与拆分/Prisma、
 * 预算释放与流水号、指标 limit 边界、decimal、脱敏、pick/omit/slugify、deepClone/isEmpty、
 * validateRequest、有效曝光常量、Cache、errors、apiResponse 失败
 */

import { Prisma } from '@prisma/client';
import { parseMetricsBatchArgs } from '../src/scripts/lib/orderMetricsBatchPayload';
import {
  EFFECTIVE_IMPRESSION_IMAGE_MIN_SEC,
  EFFECTIVE_IMPRESSION_VIDEO_MIN_SEC,
  applyCpmBudgetCap,
  buildCpmBreakdown,
  prismaDecimalsFromCpmSettlement,
  splitGrossWithPlatformFee,
} from '../src/services/cpm-metrics.service';
import { genTransactionNo, partialReleaseAmount } from '../src/services/order-budget.service';
import { CacheKeys, CacheTTL } from '../src/services/cache.service';
import { decimalToNumber } from '../src/utils/decimal';
import { deepClone, isEmpty, omit, pick, slugify, truncate } from '../src/utils/helpers';
import { computeKolKeywordRank } from '../src/utils/kolSearchRank';
import { maskAdvertiserData, maskCardNumber, maskUserData } from '../src/utils/mask';
import { z } from 'zod';
import { errors } from '../src/middleware/errorHandler';
import {
  loginSchema,
  registerSchema,
  resetPasswordBodySchema,
  createAdvertiserSchema,
  updateAdvertiserSchema,
  sendVerificationCodeSchema,
  verifyCodeBodySchema,
  paginationSchema,
  kolSearchSchema,
  createCampaignSchema,
  updateCampaignSchema,
  createOrderSchema,
  createKolSchema,
  bindKolAccountSchema,
  applyTaskSchema,
  withdrawSchema,
  rechargeSchema,
  syncKolDataSchema,
  reviseOrderSchema,
  validateRequest,
  ValidationError,
  sanitizeString,
  generateUUID,
  apiResponseSchema,
} from '../src/utils/validator';

const CID = '550e8400-e29b-41d4-a716-446655440001';
const KID = '550e8400-e29b-41d4-a716-446655440002';
const AID = '550e8400-e29b-41d4-a716-446655440003';
const STRONG = 'Abcd1234!';

describe('gstack batch21 — login / register invite / resetPassword / advertiser', () => {
  it('loginSchema 与 sendVerificationCode purpose login', () => {
    expect(loginSchema.parse({ email: 'a@b.com', password: 'p' }).email).toBe('a@b.com');
    const r = sendVerificationCodeSchema.parse({
      type: 'email',
      target: 'u@e.com',
      purpose: 'login',
    });
    expect(r.purpose).toBe('login');
  });

  it('registerSchema invite_code', () => {
    const r = registerSchema.parse({
      email: 'i@n.com',
      password: STRONG,
      invite_code: 'TEAM2026',
    });
    expect(r.invite_code).toBe('TEAM2026');
  });

  it('resetPasswordBodySchema type phone', () => {
    const r = resetPasswordBodySchema.parse({
      type: 'phone',
      target: '+8615911122233',
      code: '123456',
      new_password: STRONG,
    });
    expect(r.type).toBe('phone');
  });

  it('createAdvertiserSchema contact_email 与 website', () => {
    const r = createAdvertiserSchema.parse({
      company_name: 'Co',
      contact_email: 'c@co.com',
      website: 'https://co.com',
    });
    expect(r.website).toMatch(/^https:/);
  });

  it('updateAdvertiserSchema industry', () => {
    const r = updateAdvertiserSchema.parse({ industry: '跨境电商' });
    expect(r.industry).toBe('跨境电商');
  });
});

describe('gstack batch21 — verifyCode / pagination / kolSearch / Campaign / Order', () => {
  it('verifyCodeBodySchema purpose login', () => {
    const r = verifyCodeBodySchema.parse({
      type: 'email',
      target: 'x@y.com',
      code: '778899',
      purpose: 'login',
    });
    expect(r.purpose).toBe('login');
  });

  it('paginationSchema 默认 page page_size order', () => {
    const r = paginationSchema.parse({});
    expect(r.page).toBe(1);
    expect(r.page_size).toBe(20);
    expect(r.order).toBe('desc');
  });

  it('kolSearchSchema weibo 与 max_followers 强转', () => {
    const r = kolSearchSchema.parse({
      platform: 'weibo',
      max_followers: '20000' as unknown as number,
    });
    expect(r.platform).toBe('weibo');
    expect(r.max_followers).toBe(20000);
  });

  it('createCampaignSchema traffic/hashtags 与 sales', () => {
    const t = createCampaignSchema.parse({
      title: 'T',
      budget: 120,
      objective: 'traffic',
      required_hashtags: ['#promo'],
    });
    expect(t.objective).toBe('traffic');
    const s = createCampaignSchema.parse({
      title: 'S',
      budget: 50,
      objective: 'sales',
    });
    expect(s.objective).toBe('sales');
  });

  it('updateCampaignSchema pending_review', () => {
    expect(updateCampaignSchema.parse({ status: 'pending_review' }).status).toBe('pending_review');
  });

  it('createOrderSchema cpm', () => {
    const r = createOrderSchema.parse({
      campaign_id: CID,
      kol_id: KID,
      pricing_model: 'cpm',
      cpm_rate: 7,
      offered_price: 500,
    });
    expect(r.cpm_rate).toBe(7);
  });
});

describe('gstack batch21 — KOL xiaohongshu weibo / task / withdraw / recharge / sync / revise', () => {
  it('createKolSchema xiaohongshu', () => {
    const r = createKolSchema.parse({
      platform: 'xiaohongshu',
      platform_username: 'xhs',
      platform_id: 'x1',
    });
    expect(r.platform).toBe('xiaohongshu');
  });

  it('bindKolAccountSchema weibo', () => {
    const r = bindKolAccountSchema.parse({
      platform: 'weibo',
      platform_username: 'wb',
      platform_id: 'wbid',
    });
    expect(r.platform).toBe('weibo');
  });

  it('applyTaskSchema draft_urls', () => {
    const r = applyTaskSchema.parse({
      draft_urls: ['https://a.com/1'],
    });
    expect(r.draft_urls).toHaveLength(1);
  });

  it('withdrawSchema paypal', () => {
    const r = withdrawSchema.parse({
      amount: 60,
      payment_method: 'paypal',
      account_name: 'P',
      account_number: 'p@p.com',
    });
    expect(r.payment_method).toBe('paypal');
  });

  it('rechargeSchema bank_transfer 可无 payment_proof', () => {
    const r = rechargeSchema.parse({
      amount: 1,
      payment_method: 'bank_transfer',
    });
    expect(r.payment_proof).toBeUndefined();
  });

  it('syncKolDataSchema account_ids', () => {
    const r = syncKolDataSchema.parse({ account_ids: [AID] });
    expect(r.account_ids).toEqual([AID]);
  });

  it('reviseOrderSchema', () => {
    const r = reviseOrderSchema.parse({ draft_urls: ['https://b.com/r'] });
    expect(r.draft_urls[0]).toContain('b.com');
  });
});

describe('gstack batch21 — computeKolKeywordRank display 包含 / bio 前缀', () => {
  it('display_name 子串包含 62+单字段加成', () => {
    const r = computeKolKeywordRank(
      { platformUsername: 'u', platformDisplayName: 'My Beauty Lab', bio: null, category: null },
      'beauty'
    );
    expect(r.matched_fields).toContain('display_name');
    expect(r.score).toBe(65);
  });

  it('bio 前缀 45+单字段加成', () => {
    const r = computeKolKeywordRank(
      { platformUsername: 'u', platformDisplayName: null, bio: 'coffeeshop daily', category: null },
      'coffee'
    );
    expect(r.matched_fields).toContain('bio');
    expect(r.score).toBe(48);
  });
});

describe('gstack batch21 — buildCpmBreakdown 帽 / applyCap / split / prismaDecimals', () => {
  it('buildCpmBreakdown cpm 被预算帽截断', () => {
    const b = buildCpmBreakdown({
      pricingModel: 'cpm',
      views: 100_000,
      cpmRate: new Prisma.Decimal(20),
      cpmBudgetCap: new Prisma.Decimal(90),
      price: new Prisma.Decimal(0),
      platformFee: new Prisma.Decimal(0),
      kolEarning: new Prisma.Decimal(0),
    });
    expect(b.gross_spend).toBe(90);
    expect(b.platform_fee).toBe(9);
    expect(b.kol_earning).toBe(81);
  });

  it('applyCpmBudgetCap splitGrossWithPlatformFee 0.15 prismaDecimalsFromCpmSettlement', () => {
    expect(applyCpmBudgetCap(200, new Prisma.Decimal(50))).toBe(50);
    const s = splitGrossWithPlatformFee(200, 0.15);
    expect(s.platformFee).toBe(30);
    expect(s.kolEarning).toBe(170);
    const d = prismaDecimalsFromCpmSettlement(100, 10, 90);
    expect(d.kolEarning.toFixed(8)).toBe('90.00000000');
  });
});

describe('gstack batch21 — partialRelease / genTransactionNo / parseMetrics / decimal', () => {
  it('partialReleaseAmount 与 genTransactionNo', () => {
    expect(partialReleaseAmount(200, 50)).toBe(50);
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

describe('gstack batch21 — maskAdvertiserData / maskUserData / maskCardNumber', () => {
  it('广告主/用户/卡号', () => {
    const a = maskAdvertiserData({
      companyName: '深圳某某公司',
      taxId: '91440300MA5EXAMPLE',
    });
    expect(String(a.companyName).length).toBeGreaterThan(0);
    const u = maskUserData({ email: 'user@example.com', realName: '李四' });
    expect(String(u.email)).toContain('****');
    expect(maskCardNumber('6222021234567890123')).toContain('****');
  });
});

describe('gstack batch21 — pick / omit / slugify / truncate / deepClone / isEmpty', () => {
  it('pick omit slugify truncate deepClone isEmpty', () => {
    const o = { a: 1, b: 2 };
    expect(pick(o, ['a'])).toEqual({ a: 1 });
    expect(omit(o, ['b'])).toEqual({ a: 1 });
    expect(slugify('Hello World!')).toBe('hello-world');
    expect(truncate('1234567890', 5)).toBe('12345...');
    expect(isEmpty({})).toBe(true);
    const src = { k: [1, 2] };
    const c = deepClone(src);
    c.k.push(3);
    expect(src.k).toHaveLength(2);
  });
});

describe('gstack batch21 — validateRequest / sanitize / UUID / EFFECTIVE / Cache / errors / apiResponse', () => {
  it('validateRequest 抛 ValidationError 与 sanitizeString generateUUID', () => {
    expect(() => validateRequest(z.number(), 'x')).toThrow(ValidationError);
    expect(sanitizeString('<<>>')).toBe('');
    expect(generateUUID()[14]).toBe('4');
  });

  it('EFFECTIVE_IMPRESSION_* 与 CacheTTL.system.config 与 CacheKeys.order.byNo', () => {
    expect(EFFECTIVE_IMPRESSION_VIDEO_MIN_SEC).toBe(3);
    expect(EFFECTIVE_IMPRESSION_IMAGE_MIN_SEC).toBe(2);
    expect(CacheTTL.system.config).toBe(3600);
    expect(CacheKeys.order.byNo('NO-1')).toBe('order:no:NO-1');
  });

  it('errors.forbidden 与 apiResponseSchema 失败', () => {
    const e = errors.forbidden();
    expect(e.statusCode).toBe(403);
    const schema = apiResponseSchema(z.object({ id: z.number() }));
    const r = schema.parse({ success: false, error: { code: 'F', message: 'm' } });
    expect(r.success).toBe(false);
    expect(r.error).toEqual({ code: 'F', message: 'm' });
  });
});

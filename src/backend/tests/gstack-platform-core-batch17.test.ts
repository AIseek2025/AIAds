/**
 * GStack 平台核心域单测第十七批次（30 个核心域，单文件成批）：
 * 广告主创建/更新、注册手机、验证码 login、分页与 KOL 搜索、活动 awareness、
 * 订单 CPM、KOL 小红书/YouTube、修订与 PayPal 提现、KOL 排序 display 包含、
 * CPM cap/拆分/Prisma、指标脚本、预算释放、缓存 TTL 与有效曝光常量、
 * helpers、apiResponse 失败信封、validateRequest 抛错、脱敏、decimal
 */

import { Prisma } from '@prisma/client';
import { parseMetricsBatchArgs } from '../src/scripts/lib/orderMetricsBatchPayload';
import {
  EFFECTIVE_IMPRESSION_IMAGE_MIN_SEC,
  EFFECTIVE_IMPRESSION_VIDEO_MIN_SEC,
  applyCpmBudgetCap,
  prismaDecimalsFromCpmSettlement,
  splitGrossWithPlatformFee,
} from '../src/services/cpm-metrics.service';
import { genTransactionNo, partialReleaseAmount } from '../src/services/order-budget.service';
import { CacheKeys, CacheTTL } from '../src/services/cache.service';
import { decimalToNumber } from '../src/utils/decimal';
import { flattenObject, formatCurrency, truncate } from '../src/utils/helpers';
import { computeKolKeywordRank } from '../src/utils/kolSearchRank';
import { maskCompanyName, maskRealName, maskTaxId } from '../src/utils/mask';
import { z } from 'zod';
import {
  registerSchema,
  resetPasswordBodySchema,
  createAdvertiserSchema,
  updateAdvertiserSchema,
  verifyCodeBodySchema,
  sendVerificationCodeSchema,
  rechargeSchema,
  paginationSchema,
  kolSearchSchema,
  createCampaignSchema,
  updateCampaignSchema,
  createOrderSchema,
  createKolSchema,
  bindKolAccountSchema,
  reviseOrderSchema,
  withdrawSchema,
  updateKolSchema,
  validateRequest,
  ValidationError,
  apiResponseSchema,
} from '../src/utils/validator';

const CID = '550e8400-e29b-41d4-a716-446655440001';
const KID = '550e8400-e29b-41d4-a716-446655440002';
const STRONG = 'Abcd1234!';

describe('gstack batch17 — resetPassword / advertiser / register / verify', () => {
  it('resetPasswordBodySchema type phone', () => {
    const r = resetPasswordBodySchema.parse({
      type: 'phone',
      target: '+8613912345678',
      code: '112233',
      new_password: STRONG,
    });
    expect(r.type).toBe('phone');
  });

  it('createAdvertiserSchema business_license 与 legal_representative', () => {
    const r = createAdvertiserSchema.parse({
      company_name: '上海示例有限公司',
      business_license: '91310000MA0000000X',
      legal_representative: '李某',
    });
    expect(r.business_license).toContain('9131');
  });

  it('updateAdvertiserSchema contact_email 与 company_size', () => {
    const r = updateAdvertiserSchema.parse({
      contact_email: 'ops@co.com',
      company_size: '51-200',
    });
    expect(r.company_size).toBe('51-200');
  });

  it('registerSchema 手机 E.164 与 role 默认 advertiser', () => {
    const r = registerSchema.parse({
      email: 'e@f.com',
      password: STRONG,
      phone: '+8613800138000',
    });
    expect(r.phone).toBe('+8613800138000');
    expect(r.role).toBe('advertiser');
  });

  it('verifyCodeBodySchema purpose login', () => {
    const r = verifyCodeBodySchema.parse({
      type: 'email',
      target: 'u@e.com',
      code: '445566',
      purpose: 'login',
    });
    expect(r.purpose).toBe('login');
  });

  it('sendVerificationCodeSchema purpose register 显式', () => {
    const r = sendVerificationCodeSchema.parse({
      type: 'email',
      target: 'new@u.com',
      purpose: 'register',
    });
    expect(r.purpose).toBe('register');
  });

  it('rechargeSchema bank_transfer', () => {
    const r = rechargeSchema.parse({
      amount: 200,
      payment_method: 'bank_transfer',
    });
    expect(r.payment_method).toBe('bank_transfer');
  });
});

describe('gstack batch17 — pagination / kolSearch / Campaign / Order', () => {
  it('paginationSchema page_size 上限 100', () => {
    const r = paginationSchema.parse({ page: '1', page_size: '100' });
    expect(r.page_size).toBe(100);
  });

  it('kolSearchSchema xiaohongshu 与 min_followers', () => {
    const r = kolSearchSchema.parse({
      platform: 'xiaohongshu',
      min_followers: '5000' as unknown as number,
    });
    expect(r.platform).toBe('xiaohongshu');
    expect(r.min_followers).toBe(5000);
  });

  it('createCampaignSchema awareness 与 required_categories', () => {
    const r = createCampaignSchema.parse({
      title: 'T',
      budget: 300,
      objective: 'awareness',
      required_categories: ['美妆', '护肤'],
    });
    expect(r.objective).toBe('awareness');
    expect(r.required_categories).toHaveLength(2);
  });

  it('updateCampaignSchema pending_review', () => {
    const r = updateCampaignSchema.parse({ status: 'pending_review' });
    expect(r.status).toBe('pending_review');
  });

  it('createOrderSchema cpm 全量', () => {
    const r = createOrderSchema.parse({
      campaign_id: CID,
      kol_id: KID,
      pricing_model: 'cpm',
      cpm_rate: 8,
      offered_price: 600,
      requirements: 'CPM 订单说明',
    });
    expect(r.pricing_model).toBe('cpm');
    expect(r.cpm_rate).toBe(8);
  });
});

describe('gstack batch17 — KOL 小红书 YouTube / revise / withdraw / updateKol', () => {
  it('createKolSchema xiaohongshu', () => {
    const r = createKolSchema.parse({
      platform: 'xiaohongshu',
      platform_username: 'xhs_u',
      platform_id: 'xhs1',
      bio: '笔记作者',
    });
    expect(r.platform).toBe('xiaohongshu');
  });

  it('bindKolAccountSchema youtube 与 platform_display_name', () => {
    const r = bindKolAccountSchema.parse({
      platform: 'youtube',
      platform_username: 'ytch',
      platform_id: 'UCxxxx',
      platform_display_name: 'Channel Name',
    });
    expect(r.platform_display_name).toBe('Channel Name');
  });

  it('reviseOrderSchema 修订链接', () => {
    const r = reviseOrderSchema.parse({
      draft_urls: ['https://youtu.be/abc'],
    });
    expect(r.draft_urls[0]).toContain('youtu');
  });

  it('withdrawSchema paypal 与 remarks', () => {
    const r = withdrawSchema.parse({
      amount: 80,
      payment_method: 'paypal',
      account_name: 'Pay User',
      account_number: 'pay@user.com',
      remarks: '上月结算',
    });
    expect(r.payment_method).toBe('paypal');
    expect(r.remarks).toBe('上月结算');
  });

  it('updateKolSchema bio', () => {
    const r = updateKolSchema.parse({ bio: '更新简介' });
    expect(r.bio).toBe('更新简介');
  });
});

describe('gstack batch17 — computeKolKeywordRank display_name 包含', () => {
  it('display_name 子串包含 62+单字段加成', () => {
    const r = computeKolKeywordRank(
      { platformUsername: 'u', platformDisplayName: 'My Beauty Shop', bio: null, category: null },
      'beauty'
    );
    expect(r.matched_fields).toContain('display_name');
    expect(r.score).toBe(65);
  });
});

describe('gstack batch17 — applyCpmBudgetCap / splitGross / prismaDecimals / parseArgs / partialRelease', () => {
  it('applyCpmBudgetCap 与 splitGrossWithPlatformFee 0.12', () => {
    expect(applyCpmBudgetCap(500, new Prisma.Decimal(100))).toBe(100);
    const s = splitGrossWithPlatformFee(250, 0.12);
    expect(s.platformFee).toBe(30);
    expect(s.kolEarning).toBe(220);
  });

  it('prismaDecimalsFromCpmSettlement', () => {
    const d = prismaDecimalsFromCpmSettlement(10, 1, 9);
    expect(d.kolEarning.toFixed(8)).toBe('9.00000000');
  });

  it('parseMetricsBatchArgs --limit 1', () => {
    expect(parseMetricsBatchArgs(['--limit', '1']).limit).toBe(1);
  });

  it('partialReleaseAmount 请求等于冻结', () => {
    expect(partialReleaseAmount(40, 40)).toBe(40);
  });

  it('genTransactionNo TXN- 前缀', () => {
    expect(genTransactionNo()).toMatch(/^TXN-\d+-[0-9A-Z]+$/);
  });
});

describe('gstack batch17 — 有效曝光常量 / CacheKeys / CacheTTL', () => {
  it('EFFECTIVE_IMPRESSION_* 与 CacheKeys.user.byEmail 与 CacheTTL.order.stats', () => {
    expect(EFFECTIVE_IMPRESSION_VIDEO_MIN_SEC).toBe(3);
    expect(EFFECTIVE_IMPRESSION_IMAGE_MIN_SEC).toBe(2);
    expect(CacheKeys.user.byEmail('a@b.com')).toBe('user:email:a@b.com');
    expect(CacheTTL.order.stats).toBe(60);
  });
});

describe('gstack batch17 — flattenObject / formatCurrency / truncate', () => {
  it('flattenObject 嵌套键', () => {
    expect(flattenObject({ a: { b: 1 }, c: 2 })).toEqual({ 'a.b': 1, c: 2 });
  });

  it('formatCurrency USD', () => {
    expect(formatCurrency(10.5, 'USD')).toMatch(/10/);
  });

  it('truncate 短串不截断', () => {
    expect(truncate('hi', 10)).toBe('hi');
  });
});

describe('gstack batch17 — apiResponseSchema 失败信封 / validateRequest 抛 ValidationError', () => {
  it('apiResponseSchema 解析失败响应', () => {
    const schema = apiResponseSchema(z.object({ id: z.number() }));
    const r = schema.parse({
      success: false,
      error: { code: 'E1', message: 'msg' },
    });
    expect(r.success).toBe(false);
    expect(r.error).toEqual({ code: 'E1', message: 'msg' });
  });

  it('validateRequest 失败抛出 ValidationError', () => {
    expect(() => validateRequest(z.object({ x: z.number() }), { x: 'bad' })).toThrow(ValidationError);
  });
});

describe('gstack batch17 — maskRealName / maskTaxId / maskCompanyName / decimalToNumber', () => {
  it('maskRealName 多字、maskTaxId 短、maskCompanyName 单字、decimalToNumber 字符串', () => {
    expect(maskRealName('王小明')).toMatch(/^王/);
    expect(maskTaxId('12345')).toBe('****');
    expect(maskCompanyName('A')).toBe('*');
    expect(decimalToNumber('3.25')).toBe(3.25);
  });
});

/**
 * GStack 平台核心域单测第十五批次（30 个核心域，单文件成批）：
 * （display_name 前缀用 BeautyBrand：beautybrand.startsWith('beauty') 为真；Beautopia 因第 6 位为 o 不会匹配 beauty 前缀）
 * 提现/重置密码/验证码用途、广告主创建与充值、活动受众与国家、KOL Instagram 绑定、
 * 订单 requirements、CPM 工具与固定价 breakdown、KOL 排序前缀与包含、指标脚本、
 * 脱敏与对象工具、apiResponseSchema
 */

import { Prisma } from '@prisma/client';
import { parseMetricsBatchArgs } from '../src/scripts/lib/orderMetricsBatchPayload';
import {
  grossSpendFromCpm,
  applyCpmBudgetCap,
  buildCpmBreakdown,
  splitGrossWithPlatformFee,
} from '../src/services/cpm-metrics.service';
import { decimalToNumber } from '../src/utils/decimal';
import { addDays, daysDifference, omit, pick, slugify } from '../src/utils/helpers';
import { computeKolKeywordRank } from '../src/utils/kolSearchRank';
import { maskAdvertiserData, maskCardNumber, maskPhone, maskUserData } from '../src/utils/mask';
import { z } from 'zod';
import {
  withdrawSchema,
  resetPasswordBodySchema,
  sendVerificationCodeSchema,
  createAdvertiserSchema,
  rechargeSchema,
  createCampaignSchema,
  updateCampaignSchema,
  createKolSchema,
  bindKolAccountSchema,
  createOrderSchema,
  updateKolSchema,
  paginationSchema,
  kolSearchSchema,
  apiResponseSchema,
} from '../src/utils/validator';

const CID = '550e8400-e29b-41d4-a716-446655440001';
const KID = '550e8400-e29b-41d4-a716-446655440002';
const STRONG = 'Abcd1234!';

describe('gstack batch15 — withdraw / resetPassword / sendCode purpose', () => {
  it('withdrawSchema wechat_pay', () => {
    const r = withdrawSchema.parse({
      amount: 100,
      payment_method: 'wechat_pay',
      account_name: '张三',
      account_number: 'wx_openid_xxx',
    });
    expect(r.payment_method).toBe('wechat_pay');
  });

  it('resetPasswordBodySchema 强新密码', () => {
    const r = resetPasswordBodySchema.parse({
      type: 'email',
      target: 'u@e.com',
      code: '123456',
      new_password: STRONG,
    });
    expect(r.new_password).toBe(STRONG);
  });

  it('sendVerificationCodeSchema purpose login', () => {
    const r = sendVerificationCodeSchema.parse({
      type: 'phone',
      target: '+8613800138000',
      purpose: 'login',
    });
    expect(r.purpose).toBe('login');
  });
});

describe('gstack batch15 — createAdvertiser / recharge', () => {
  it('createAdvertiserSchema 含 contact_email 与 website', () => {
    const r = createAdvertiserSchema.parse({
      company_name: 'Co',
      contact_email: 'c@co.com',
      website: 'https://co.com',
    });
    expect(r.contact_email).toBe('c@co.com');
    expect(r.website).toBe('https://co.com');
  });

  it('rechargeSchema wechat 与 payment_proof', () => {
    const r = rechargeSchema.parse({
      amount: 500,
      payment_method: 'wechat',
      payment_proof: 'https://cdn.example.com/p.png',
    });
    expect(r.payment_method).toBe('wechat');
    expect(r.payment_proof).toMatch(/^https:/);
  });

});

describe('gstack batch15 — Campaign 受众 / 更新', () => {
  it('createCampaignSchema target_audience 与 target_countries', () => {
    const r = createCampaignSchema.parse({
      title: 'T',
      budget: 200,
      target_audience: {
        gender: 'female',
        locations: ['US', 'UK'],
        interests: ['fitness'],
      },
      target_countries: ['US', 'DE'],
      content_requirements: '竖屏 9:16',
    });
    expect(r.target_audience?.gender).toBe('female');
    expect(r.target_countries).toEqual(['US', 'DE']);
    expect(r.content_requirements).toContain('9:16');
  });

  it('updateCampaignSchema status paused 与 content_requirements', () => {
    const r = updateCampaignSchema.parse({
      status: 'paused',
      content_requirements: '加字幕',
    });
    expect(r.status).toBe('paused');
    expect(r.content_requirements).toBe('加字幕');
  });
});

describe('gstack batch15 — KOL instagram / bind / tags / Order requirements', () => {
  it('createKolSchema instagram', () => {
    const r = createKolSchema.parse({
      platform: 'instagram',
      platform_username: 'inst_user',
      platform_id: '1784',
      category: 'lifestyle',
    });
    expect(r.platform).toBe('instagram');
  });

  it('bindKolAccountSchema instagram 与 refresh_token', () => {
    const r = bindKolAccountSchema.parse({
      platform: 'instagram',
      platform_username: 'i',
      platform_id: 'ig1',
      refresh_token: 'rt',
    });
    expect(r.refresh_token).toBe('rt');
  });

  it('createOrderSchema requirements 可选长文案', () => {
    const req = 'a'.repeat(500);
    const r = createOrderSchema.parse({
      campaign_id: CID,
      kol_id: KID,
      pricing_model: 'fixed',
      offered_price: 50,
      requirements: req,
    });
    expect(r.requirements?.length).toBe(500);
  });

  it('updateKolSchema tags', () => {
    const r = updateKolSchema.parse({ tags: ['美妆', '测评'] });
    expect(r.tags).toEqual(['美妆', '测评']);
  });
});

describe('gstack batch15 — pagination / kolSearch', () => {
  it('paginationSchema order asc 与 sort', () => {
    const r = paginationSchema.parse({
      page: '2',
      page_size: '10',
      sort: 'budget',
      order: 'asc',
    });
    expect(r.page).toBe(2);
    expect(r.order).toBe('asc');
    expect(r.sort).toBe('budget');
  });

  it('kolSearchSchema regions keyword max_followers 强转', () => {
    const r = kolSearchSchema.parse({
      regions: 'EU',
      keyword: 'skincare',
      max_followers: '50000' as unknown as number,
    });
    expect(r.regions).toBe('EU');
    expect(r.max_followers).toBe(50000);
  });
});

describe('gstack batch15 — computeKolKeywordRank 前缀与 bio 包含', () => {
  it('display_name 前缀匹配 78+单字段加成（BeautyBrand 以 beauty 开头）', () => {
    const r = computeKolKeywordRank(
      { platformUsername: 'x', platformDisplayName: 'BeautyBrand', bio: null, category: null },
      'beauty'
    );
    expect(r.matched_fields).toContain('display_name');
    expect(r.score).toBe(81);
  });

  it('bio 子串包含 35+单字段加成', () => {
    const r = computeKolKeywordRank(
      { platformUsername: 'u', platformDisplayName: null, bio: 'best coffee in town', category: null },
      'coffee'
    );
    expect(r.matched_fields).toContain('bio');
    expect(r.score).toBe(38);
  });
});

describe('gstack batch15 — grossSpendFromCpm / applyCpmBudgetCap / buildCpmBreakdown fixed', () => {
  it('grossSpendFromCpm 2000 曝光 × 5 CPM', () => {
    expect(grossSpendFromCpm(2000, 5)).toBe(10);
  });

  it('applyCpmBudgetCap Prisma.Decimal 截断 gross', () => {
    expect(applyCpmBudgetCap(100, new Prisma.Decimal(30))).toBe(30);
  });

  it('buildCpmBreakdown fixed 保留订单价与分成字段', () => {
    const b = buildCpmBreakdown({
      pricingModel: 'fixed',
      views: 5000,
      cpmRate: new Prisma.Decimal(9),
      cpmBudgetCap: null,
      price: new Prisma.Decimal(888),
      platformFee: new Prisma.Decimal(88),
      kolEarning: new Prisma.Decimal(800),
    });
    expect(b.pricing_model).toBe('fixed');
    expect(b.gross_spend).toBe(888);
    expect(b.platform_fee).toBe(88);
    expect(b.kol_earning).toBe(800);
  });

  it('splitGrossWithPlatformFee 默认 10% 平台费', () => {
    const s = splitGrossWithPlatformFee(1000);
    expect(s.platformFee).toBe(100);
    expect(s.kolEarning).toBe(900);
  });
});

describe('gstack batch15 — parseMetricsBatchArgs / decimalToNumber', () => {
  it('parseMetricsBatchArgs --limit 5 与 --cpm-only', () => {
    const a = parseMetricsBatchArgs(['--limit', '5', '--cpm-only']);
    expect(a.limit).toBe(5);
    expect(a.cpmOnly).toBe(true);
  });

  it('decimalToNumber null 与 undefined 为 0', () => {
    expect(decimalToNumber(null)).toBe(0);
    expect(decimalToNumber(undefined)).toBe(0);
  });
});

describe('gstack batch15 — maskPhone / maskCardNumber / maskUserData / maskAdvertiserData', () => {
  it('maskPhone 11 位国内号', () => {
    expect(maskPhone('13800138000')).toMatch(/138\*\*\*\*8000/);
  });

  it('maskCardNumber 16 位+', () => {
    expect(maskCardNumber('6222021234567890123')).toContain('****');
  });

  it('maskUserData phone 与 email', () => {
    const out = maskUserData({
      phone: '13900001111',
      email: 'user@example.com',
    });
    expect(String(out.phone)).toContain('****');
    expect(String(out.email)).toContain('****');
  });

  it('maskAdvertiserData companyName 与 taxId', () => {
    const out = maskAdvertiserData({
      companyName: '上海测试科技有限公司',
      taxId: '91310000MA1FL1234XY',
    });
    expect(String(out.companyName)).toMatch(/^\S/);
    expect(String(out.taxId)).toContain('****');
  });
});

describe('gstack batch15 — addDays / daysDifference / pick / omit / slugify', () => {
  it('addDays 与 daysDifference', () => {
    const a = new Date('2026-01-01T00:00:00.000Z');
    const b = addDays(a, 7);
    expect(daysDifference(a, b)).toBe(7);
  });

  it('pick 与 omit', () => {
    const o = { a: 1, b: 2, c: 3 };
    expect(pick(o, ['a', 'c'])).toEqual({ a: 1, c: 3 });
    expect(omit(o, ['b'])).toEqual({ a: 1, c: 3 });
  });

  it('slugify 空格与标点折叠为横线', () => {
    expect(slugify('Foo   Bar!!!')).toBe('foo-bar');
  });
});

describe('gstack batch15 — apiResponseSchema', () => {
  it('成功信封解析 data', () => {
    const schema = apiResponseSchema(z.object({ id: z.number() }));
    const ok = schema.parse({ success: true, data: { id: 42 } });
    expect(ok.success).toBe(true);
    expect(ok.data).toEqual({ id: 42 });
  });
});

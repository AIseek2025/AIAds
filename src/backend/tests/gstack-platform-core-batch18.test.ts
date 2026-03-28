/**
 * GStack 平台核心域单测第十八批次（30 个核心域，单文件成批）：
 * 登录/刷新/改密/邮箱验证码、注册昵称、用户币种、验证码 verify/reset_password、
 * 分页与 KOL 搜索、活动 conversion/平台、暂停、订单 fixed、KOL tiktok/微博、
 * 任务与交稿、提现 alipay、同步与修订、KOL 排序 username 包含与 category 精确、
 * 默认平台费与 gross/billable、指标脚本组合、decimal、脱敏、ISO 日期与 IP、
 * apiResponse 成功与 CacheKeys
 */

import type { Request } from 'express';
import { Prisma } from '@prisma/client';
import { parseMetricsBatchArgs } from '../src/scripts/lib/orderMetricsBatchPayload';
import {
  DEFAULT_PLATFORM_FEE_RATE,
  billableImpressionsFromOrderViews,
  grossSpendFromCpm,
  splitGrossWithPlatformFee,
} from '../src/services/cpm-metrics.service';
import { CacheKeys } from '../src/services/cache.service';
import { decimalToNumber } from '../src/utils/decimal';
import { formatISODate, getClientIP, parseISODate } from '../src/utils/helpers';
import { computeKolKeywordRank } from '../src/utils/kolSearchRank';
import { maskEmail, maskPhone, maskVerificationCode } from '../src/utils/mask';
import { z } from 'zod';
import {
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  loginEmailCodeSchema,
  registerSchema,
  updateUserSchema,
  verifyCodeBodySchema,
  sendVerificationCodeSchema,
  paginationSchema,
  kolSearchSchema,
  createCampaignSchema,
  updateCampaignSchema,
  createOrderSchema,
  createKolSchema,
  bindKolAccountSchema,
  applyTaskSchema,
  submitOrderSchema,
  withdrawSchema,
  syncKolDataSchema,
  reviseOrderSchema,
  apiResponseSchema,
} from '../src/utils/validator';

const CID = '550e8400-e29b-41d4-a716-446655440001';
const KID = '550e8400-e29b-41d4-a716-446655440002';
const STRONG = 'Abcd1234!';

describe('gstack batch18 — login / refresh / changePassword / loginEmailCode', () => {
  it('loginSchema', () => {
    expect(loginSchema.parse({ email: 'a@b.com', password: 'p' }).email).toBe('a@b.com');
  });

  it('refreshTokenSchema', () => {
    expect(refreshTokenSchema.parse({ refresh_token: 'rt' }).refresh_token).toBe('rt');
  });

  it('changePasswordSchema', () => {
    const r = changePasswordSchema.parse({
      current_password: 'Old1!zz',
      new_password: STRONG,
    });
    expect(r.new_password).toBe(STRONG);
  });

  it('loginEmailCodeSchema', () => {
    const r = loginEmailCodeSchema.parse({ email: 'm@n.com', code: '000000' });
    expect(r.code).toBe('000000');
  });
});

describe('gstack batch18 — register nickname / updateUser currency / 验证码', () => {
  it('registerSchema nickname', () => {
    const r = registerSchema.parse({
      email: 'z@y.com',
      password: STRONG,
      nickname: '广告主A',
    });
    expect(r.nickname).toBe('广告主A');
  });

  it('updateUserSchema currency', () => {
    const r = updateUserSchema.parse({ currency: 'EUR' });
    expect(r.currency).toBe('EUR');
  });

  it('verifyCodeBodySchema purpose verify', () => {
    const r = verifyCodeBodySchema.parse({
      type: 'phone',
      target: '+8615900000000',
      code: '334455',
      purpose: 'verify',
    });
    expect(r.purpose).toBe('verify');
  });

  it('sendVerificationCodeSchema reset_password', () => {
    const r = sendVerificationCodeSchema.parse({
      type: 'email',
      target: 'u@e.com',
      purpose: 'reset_password',
    });
    expect(r.purpose).toBe('reset_password');
  });
});

describe('gstack batch18 — pagination / kolSearch / Campaign / Order', () => {
  it('paginationSchema sort 与 order desc', () => {
    const r = paginationSchema.parse({ sort: 'updated_at', order: 'desc', page: '3' });
    expect(r.sort).toBe('updated_at');
    expect(r.order).toBe('desc');
    expect(r.page).toBe(3);
  });

  it('kolSearchSchema instagram 与 keyword', () => {
    const r = kolSearchSchema.parse({ platform: 'instagram', keyword: 'fitness' });
    expect(r.platform).toBe('instagram');
    expect(r.keyword).toBe('fitness');
  });

  it('createCampaignSchema conversion 与 target_platforms', () => {
    const r = createCampaignSchema.parse({
      title: 'T',
      budget: 400,
      objective: 'conversion',
      target_platforms: ['instagram', 'tiktok'],
    });
    expect(r.objective).toBe('conversion');
    expect(r.target_platforms).toContain('tiktok');
  });

  it('updateCampaignSchema paused', () => {
    expect(updateCampaignSchema.parse({ status: 'paused' }).status).toBe('paused');
  });

  it('createOrderSchema fixed', () => {
    const r = createOrderSchema.parse({
      campaign_id: CID,
      kol_id: KID,
      pricing_model: 'fixed',
      offered_price: 240,
    });
    expect(r.pricing_model).toBe('fixed');
    expect(r.offered_price).toBe(240);
  });
});

describe('gstack batch18 — KOL tiktok weibo / task / submit / withdraw / sync / revise', () => {
  it('createKolSchema tiktok', () => {
    const r = createKolSchema.parse({
      platform: 'tiktok',
      platform_username: 'tt_u',
      platform_id: 'ttid',
      country: 'US',
    });
    expect(r.platform).toBe('tiktok');
  });

  it('bindKolAccountSchema weibo', () => {
    const r = bindKolAccountSchema.parse({
      platform: 'weibo',
      platform_username: 'wb',
      platform_id: 'wb1',
    });
    expect(r.platform).toBe('weibo');
  });

  it('applyTaskSchema expected_price', () => {
    const r = applyTaskSchema.parse({ expected_price: 150 });
    expect(r.expected_price).toBe(150);
  });

  it('submitOrderSchema 单链接', () => {
    const r = submitOrderSchema.parse({ draft_urls: ['https://v.com/1'] });
    expect(r.draft_urls).toHaveLength(1);
  });

  it('withdrawSchema alipay', () => {
    const r = withdrawSchema.parse({
      amount: 50,
      payment_method: 'alipay',
      account_name: '李',
      account_number: '2088xxx',
    });
    expect(r.payment_method).toBe('alipay');
  });

  it('syncKolDataSchema 空对象', () => {
    expect(syncKolDataSchema.parse({})).toEqual({});
  });

  it('reviseOrderSchema 含 message', () => {
    const r = reviseOrderSchema.parse({
      draft_urls: ['https://x.com/a'],
      message: '修订说明',
    });
    expect(r.message).toBe('修订说明');
  });
});

describe('gstack batch18 — computeKolKeywordRank username 包含 / category 精确', () => {
  it('username 子串包含 70+单字段加成', () => {
    const r = computeKolKeywordRank(
      { platformUsername: 'user_best_one', platformDisplayName: null, bio: null, category: null },
      'best'
    );
    expect(r.matched_fields).toContain('username');
    expect(r.score).toBe(73);
  });

  it('category 精确匹配 72+单字段加成', () => {
    const r = computeKolKeywordRank(
      { platformUsername: 'u', platformDisplayName: null, bio: null, category: 'gaming' },
      'gaming'
    );
    expect(r.matched_fields).toContain('category');
    expect(r.score).toBe(75);
  });
});

describe('gstack batch18 — DEFAULT_PLATFORM_FEE_RATE / grossSpendFromCpm / billable', () => {
  it('DEFAULT_PLATFORM_FEE_RATE 与 splitGrossWithPlatformFee 默认', () => {
    expect(DEFAULT_PLATFORM_FEE_RATE).toBe(0.1);
    const s = splitGrossWithPlatformFee(100);
    expect(s.platformFee).toBe(10);
    expect(s.kolEarning).toBe(90);
  });

  it('grossSpendFromCpm 费率非正 与 billable 负数归零', () => {
    expect(grossSpendFromCpm(5000, 0)).toBe(0);
    expect(billableImpressionsFromOrderViews(-10)).toBe(0);
  });
});

describe('gstack batch18 — parseMetricsBatchArgs 组合 / decimalToNumber Infinity', () => {
  it('parseMetricsBatchArgs limit + cpm-only + views-delta', () => {
    const a = parseMetricsBatchArgs(['--limit', '25', '--cpm-only', '--views-delta', '2']);
    expect(a.limit).toBe(25);
    expect(a.cpmOnly).toBe(true);
    expect(a.viewsDelta).toBe(2);
  });

  it('decimalToNumber Infinity 与 Prisma.Decimal', () => {
    expect(decimalToNumber(Number.POSITIVE_INFINITY)).toBe(0);
    expect(decimalToNumber(new Prisma.Decimal('7.5'))).toBe(7.5);
  });
});

describe('gstack batch18 — maskPhone / maskEmail / maskVerificationCode', () => {
  it('maskPhone 11 位、maskEmail、验证码星号', () => {
    expect(maskPhone('13900001111')).toMatch(/139/);
    expect(maskEmail('abc@def.com')).toContain('****');
    expect(maskVerificationCode()).toBe('******');
  });
});

describe('gstack batch18 — formatISODate / parseISODate / getClientIP', () => {
  it('ISO 日期往返 与 getClientIP x-forwarded-for', () => {
    const d = new Date('2026-06-01T10:00:00.000Z');
    const s = formatISODate(d);
    expect(parseISODate(s).toISOString()).toBe(d.toISOString());
    const req = {
      headers: { 'x-forwarded-for': '198.51.100.1, 10.0.0.1' },
      socket: { remoteAddress: '::1' },
    } as unknown as Request;
    expect(getClientIP(req)).toBe('198.51.100.1');
  });
});

describe('gstack batch18 — apiResponseSchema 成功 / CacheKeys', () => {
  it('apiResponseSchema 成功 data', () => {
    const schema = apiResponseSchema(z.object({ ok: z.boolean() }));
    const r = schema.parse({ success: true, data: { ok: true } });
    expect(r.success).toBe(true);
    expect(r.data).toEqual({ ok: true });
  });

  it('CacheKeys order.list 与 campaign.stats', () => {
    expect(CacheKeys.order.list('adv1', 'k1', 'paid')).toContain('adv1');
    expect(CacheKeys.campaign.stats('camp-1')).toBe('campaign:camp-1:stats');
  });
});

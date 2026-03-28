/**
 * GStack 平台核心域单测第二十批次（30 个核心域，单文件成批）：
 * refresh/改密/邮箱验证码、注册 kol、用户 language/avatar、活动 engagement/受众/状态、
 * 订单 fixed、KOL tiktok 绑定与交稿/任务、充值 alipay、提现对公、KOL 排序 username/bio 精确、
 * billable/gross、buildCpmBreakdown fixed、默认平台费、指标脚本、decimal、
 * getClientIP/getUserAgent、日期链、isPast/isFuture、flatten、脱敏、
 * extractTokenFromHeader、errors.unauthorized、apiResponse 成功
 */

import { Prisma } from '@prisma/client';
import { parseMetricsBatchArgs } from '../src/scripts/lib/orderMetricsBatchPayload';
import {
  DEFAULT_PLATFORM_FEE_RATE,
  billableImpressionsFromOrderViews,
  grossSpendFromCpm,
  buildCpmBreakdown,
  splitGrossWithPlatformFee,
} from '../src/services/cpm-metrics.service';
import { decimalToNumber } from '../src/utils/decimal';
import {
  addDays,
  daysDifference,
  flattenObject,
  formatISODate,
  getClientIP,
  getUserAgent,
  isFuture,
  isPast,
  parseISODate,
} from '../src/utils/helpers';
import { computeKolKeywordRank } from '../src/utils/kolSearchRank';
import { maskEmail, maskIdNumber, maskPhone } from '../src/utils/mask';
import { extractTokenFromHeader } from '../src/utils/crypto';
import { z } from 'zod';
import { errors } from '../src/middleware/errorHandler';
import type { Request } from 'express';
import {
  registerSchema,
  refreshTokenSchema,
  changePasswordSchema,
  loginEmailCodeSchema,
  verifyCodeBodySchema,
  updateUserSchema,
  createCampaignSchema,
  updateCampaignSchema,
  createOrderSchema,
  createKolSchema,
  bindKolAccountSchema,
  applyTaskSchema,
  submitOrderSchema,
  withdrawSchema,
  rechargeSchema,
  syncKolDataSchema,
  apiResponseSchema,
} from '../src/utils/validator';

const CID = '550e8400-e29b-41d4-a716-446655440001';
const KID = '550e8400-e29b-41d4-a716-446655440002';
const STRONG = 'Abcd1234!';

describe('gstack batch20 — refresh / changePassword / loginEmailCode / verify', () => {
  it('refreshTokenSchema', () => {
    expect(refreshTokenSchema.parse({ refresh_token: 'r1' }).refresh_token).toBe('r1');
  });

  it('changePasswordSchema', () => {
    const r = changePasswordSchema.parse({
      current_password: 'Old1!aa',
      new_password: STRONG,
    });
    expect(r.new_password).toBe(STRONG);
  });

  it('loginEmailCodeSchema', () => {
    const r = loginEmailCodeSchema.parse({ email: 'e@f.com', code: '111222' });
    expect(r.code).toHaveLength(6);
  });

  it('verifyCodeBodySchema purpose reset_password', () => {
    const r = verifyCodeBodySchema.parse({
      type: 'email',
      target: 'u@e.com',
      code: '556677',
      purpose: 'reset_password',
    });
    expect(r.purpose).toBe('reset_password');
  });
});

describe('gstack batch20 — register kol / updateUser / Campaign / Order', () => {
  it('registerSchema role kol', () => {
    const r = registerSchema.parse({
      email: 'kol@e.com',
      password: STRONG,
      role: 'kol',
    });
    expect(r.role).toBe('kol');
  });

  it('updateUserSchema language 与 avatar_url', () => {
    const r = updateUserSchema.parse({
      language: 'zh-CN',
      avatar_url: 'https://img.example.com/a.png',
    });
    expect(r.language).toBe('zh-CN');
    expect(r.avatar_url).toMatch(/^https:/);
  });

  it('createCampaignSchema engagement 与 target_audience', () => {
    const r = createCampaignSchema.parse({
      title: 'E',
      budget: 88,
      objective: 'engagement',
      target_audience: { gender: 'all', interests: ['tech'] },
    });
    expect(r.objective).toBe('engagement');
    expect(r.target_audience?.interests).toContain('tech');
  });

  it('updateCampaignSchema completed 与 cancelled', () => {
    expect(updateCampaignSchema.parse({ status: 'completed' }).status).toBe('completed');
    expect(updateCampaignSchema.parse({ status: 'cancelled' }).status).toBe('cancelled');
  });

  it('createOrderSchema fixed', () => {
    const r = createOrderSchema.parse({
      campaign_id: CID,
      kol_id: KID,
      pricing_model: 'fixed',
      offered_price: 199,
    });
    expect(r.offered_price).toBe(199);
  });
});

describe('gstack batch20 — KOL tiktok / bind / task / submit / recharge / withdraw / sync', () => {
  it('createKolSchema tiktok', () => {
    const r = createKolSchema.parse({
      platform: 'tiktok',
      platform_username: 'tt',
      platform_id: 'ttid',
    });
    expect(r.platform).toBe('tiktok');
  });

  it('bindKolAccountSchema tiktok 与 refresh_token', () => {
    const r = bindKolAccountSchema.parse({
      platform: 'tiktok',
      platform_username: 'u',
      platform_id: 'id',
      refresh_token: 'rtok',
    });
    expect(r.refresh_token).toBe('rtok');
  });

  it('applyTaskSchema message', () => {
    const r = applyTaskSchema.parse({ message: '意向说明' });
    expect(r.message).toBe('意向说明');
  });

  it('submitOrderSchema', () => {
    const r = submitOrderSchema.parse({ draft_urls: ['https://d.com/1'] });
    expect(r.draft_urls).toHaveLength(1);
  });

  it('rechargeSchema alipay', () => {
    const r = rechargeSchema.parse({ amount: 10, payment_method: 'alipay' });
    expect(r.payment_method).toBe('alipay');
  });

  it('withdrawSchema bank_transfer 含 bank_code', () => {
    const r = withdrawSchema.parse({
      amount: 300,
      payment_method: 'bank_transfer',
      account_name: 'Corp',
      account_number: '6222000000000001',
      bank_name: 'BOC',
      bank_code: '104',
    });
    expect(r.bank_code).toBe('104');
  });

  it('syncKolDataSchema 空', () => {
    expect(syncKolDataSchema.parse({})).toEqual({});
  });
});

describe('gstack batch20 — computeKolKeywordRank username 精确 / bio 精确', () => {
  it('username 精确 100+单字段加成', () => {
    const r = computeKolKeywordRank(
      { platformUsername: 'brand', platformDisplayName: null, bio: null, category: null },
      'brand'
    );
    expect(r.matched_fields).toContain('username');
    expect(r.score).toBe(103);
  });

  it('bio 精确 55+单字段加成', () => {
    const r = computeKolKeywordRank(
      { platformUsername: 'u', platformDisplayName: null, bio: 'coffee', category: null },
      'coffee'
    );
    expect(r.matched_fields).toContain('bio');
    expect(r.score).toBe(58);
  });
});

describe('gstack batch20 — billable / gross / DEFAULT_PLATFORM_FEE / buildCpmBreakdown fixed / split', () => {
  it('billableImpressionsFromOrderViews 与 grossSpendFromCpm', () => {
    expect(billableImpressionsFromOrderViews(333.3)).toBe(333);
    expect(grossSpendFromCpm(3000, 4)).toBe(12);
  });

  it('DEFAULT_PLATFORM_FEE_RATE 与 splitGrossWithPlatformFee 默认', () => {
    expect(DEFAULT_PLATFORM_FEE_RATE).toBe(0.1);
    const s = splitGrossWithPlatformFee(1000);
    expect(s.platformFee).toBe(100);
    expect(s.kolEarning).toBe(900);
  });

  it('buildCpmBreakdown fixed 沿用订单价', () => {
    const b = buildCpmBreakdown({
      pricingModel: 'fixed',
      views: 100,
      cpmRate: new Prisma.Decimal(5),
      cpmBudgetCap: null,
      price: new Prisma.Decimal(500),
      platformFee: new Prisma.Decimal(50),
      kolEarning: new Prisma.Decimal(450),
    });
    expect(b.pricing_model).toBe('fixed');
    expect(b.gross_spend).toBe(500);
  });
});

describe('gstack batch20 — parseMetricsBatchArgs / decimalToNumber undefined', () => {
  it('parseMetricsBatchArgs --cpm-only --views-delta', () => {
    const a = parseMetricsBatchArgs(['--cpm-only', '--views-delta', '5']);
    expect(a.cpmOnly).toBe(true);
    expect(a.viewsDelta).toBe(5);
  });

  it('decimalToNumber undefined', () => {
    expect(decimalToNumber(undefined)).toBe(0);
  });
});

describe('gstack batch20 — getClientIP / getUserAgent', () => {
  it('getClientIP 与 getUserAgent', () => {
    const req = {
      headers: { 'user-agent': 'jest', 'x-forwarded-for': '203.0.113.1' },
      socket: { remoteAddress: '::1' },
    } as unknown as Request;
    expect(getClientIP(req)).toBe('203.0.113.1');
    expect(getUserAgent(req)).toBe('jest');
    expect(getUserAgent({ headers: {} } as unknown as Request)).toBe('unknown');
  });
});

describe('gstack batch20 — 日期链 / isPast / isFuture / flattenObject', () => {
  it('formatISODate parseISODate addDays daysDifference', () => {
    const a = new Date('2026-03-01T00:00:00.000Z');
    const b = addDays(a, 10);
    expect(daysDifference(a, b)).toBe(10);
    expect(parseISODate(formatISODate(a)).getTime()).toBe(a.getTime());
  });

  it('isPast 与 isFuture', () => {
    expect(isPast(new Date('2000-01-01'))).toBe(true);
    expect(isFuture(new Date('2099-01-01'))).toBe(true);
  });

  it('flattenObject', () => {
    expect(flattenObject({ x: { y: { z: 1 } } })).toEqual({ 'x.y.z': 1 });
  });
});

describe('gstack batch20 — maskEmail / maskPhone / maskIdNumber', () => {
  it('maskEmail maskPhone maskIdNumber', () => {
    expect(maskEmail('abc@def.com')).toContain('****');
    expect(maskPhone('13800138000')).toMatch(/138/);
    expect(maskIdNumber('110101199001011234')).toMatch(/110101/);
  });
});

describe('gstack batch20 — extractTokenFromHeader / errors.unauthorized / apiResponseSchema', () => {
  it('extractTokenFromHeader Bearer 与 errors.unauthorized', () => {
    expect(extractTokenFromHeader('Bearer eyJhbG')).toBe('eyJhbG');
    expect(extractTokenFromHeader(undefined)).toBeNull();
    const e = errors.unauthorized();
    expect(e.statusCode).toBe(401);
    expect(e.code).toBe('UNAUTHORIZED');
  });

  it('apiResponseSchema 成功 data', () => {
    const schema = apiResponseSchema(z.object({ name: z.string() }));
    const r = schema.parse({ success: true, data: { name: 'x' } });
    expect(r.success).toBe(true);
    expect(r.data).toEqual({ name: 'x' });
  });
});

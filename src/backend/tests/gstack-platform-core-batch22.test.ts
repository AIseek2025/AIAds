/**
 * GStack 平台核心域单测第二十二批次（30 条核心用例）：与 batch18–21 错开断言，
 * 侧重 createOrder superRefine 失败分支、未覆盖的 schema 字段、校验中间件与 CSRF、
 * Token/脱敏、CPM 无帽路径、KOL 排序多字段、Cache 与 errors 余下工厂、apiResponse details。
 */

import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import {
  billableImpressionsFromOrderViews,
  buildCpmBreakdown,
  applyCpmBudgetCap,
  grossSpendFromCpm,
} from '../src/services/cpm-metrics.service';
import { CacheKeys, CacheTTL } from '../src/services/cache.service';
import { csrfErrorHandler } from '../src/middleware/csrf';
import { parseQueryOrRespond, parseBodyOrRespond } from '../src/middleware/validation';
import { extractTokenFromHeader, TokenError } from '../src/utils/crypto';
import { computeKolKeywordRank } from '../src/utils/kolSearchRank';
import { maskCompanyName, maskRealName, maskTaxId } from '../src/utils/mask';
import { z } from 'zod';
import { errors } from '../src/middleware/errorHandler';
import {
  registerSchema,
  updateUserSchema,
  createAdvertiserSchema,
  updateAdvertiserSchema,
  createCampaignSchema,
  updateCampaignSchema,
  createOrderSchema,
  kolSearchSchema,
  updateKolSchema,
  createKolSchema,
  bindKolAccountSchema,
  rechargeSchema,
  submitOrderSchema,
  sendVerificationCodeSchema,
  loginSchema,
  paginationSchema,
  apiResponseSchema,
} from '../src/utils/validator';

const CID = '550e8400-e29b-41d4-a716-446655440001';
const KID = '550e8400-e29b-41d4-a716-446655440002';

function mockRes(): Response & { _status?: number; _json?: unknown } {
  const r = {
    _status: 200 as number,
    _json: undefined as unknown,
    status(code: number) {
      this._status = code;
      return this;
    },
    json(body: unknown) {
      this._json = body;
      return this;
    },
  };
  return r as Response & { _status?: number; _json?: unknown };
}

describe('gstack batch22 — createOrderSchema superRefine 失败分支', () => {
  it('fixed 缺少 offered_price 失败', () => {
    const r = createOrderSchema.safeParse({
      campaign_id: CID,
      kol_id: KID,
      pricing_model: 'fixed',
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes('offered_price'))).toBe(true);
    }
  });

  it('cpm 缺少 cpm_rate 失败', () => {
    const r = createOrderSchema.safeParse({
      campaign_id: CID,
      kol_id: KID,
      pricing_model: 'cpm',
      offered_price: 300,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes('cpm_rate'))).toBe(true);
    }
  });

  it('cpm 缺少 offered_price 失败', () => {
    const r = createOrderSchema.safeParse({
      campaign_id: CID,
      kol_id: KID,
      pricing_model: 'cpm',
      cpm_rate: 8,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.join('.').includes('offered_price'))).toBe(true);
    }
  });
});

describe('gstack batch22 — register / updateUser / advertiser / campaign', () => {
  it('registerSchema invite_code null 预处理后可选', () => {
    const r = registerSchema.parse({
      email: 'n@u.ll',
      password: 'Aa1!aaaa',
      invite_code: null,
    });
    expect(r.invite_code).toBeUndefined();
  });

  it('registerSchema phone E.164', () => {
    const r = registerSchema.parse({
      email: 'p@u.ll',
      password: 'Aa1!aaaa',
      phone: '+8613911122233',
    });
    expect(r.phone).toBe('+8613911122233');
  });

  it('updateUserSchema timezone', () => {
    expect(updateUserSchema.parse({ timezone: 'Asia/Shanghai' }).timezone).toBe('Asia/Shanghai');
  });

  it('createAdvertiserSchema company_name_en 与 business_license', () => {
    const r = createAdvertiserSchema.parse({
      company_name: 'Co',
      company_name_en: 'Co Ltd',
      business_license: 'BL-001',
    });
    expect(r.company_name_en).toBe('Co Ltd');
  });

  it('createCampaignSchema 默认 awareness、日期与 target_audience', () => {
    const r = createCampaignSchema.parse({
      title: 'Dated',
      budget: 99,
      start_date: '2026-01-01',
      end_date: '2026-03-01',
      target_audience: { gender: 'female', locations: ['US'] },
    });
    expect(r.objective).toBe('awareness');
    expect(r.start_date).toBe('2026-01-01');
    expect(r.target_audience?.gender).toBe('female');
  });

  it('updateCampaignSchema draft', () => {
    expect(updateCampaignSchema.parse({ status: 'draft' }).status).toBe('draft');
  });

  it('updateAdvertiserSchema company_name_en 可置 null', () => {
    const r = updateAdvertiserSchema.parse({ company_name_en: null });
    expect(r.company_name_en).toBeNull();
  });
});

describe('gstack batch22 — kolSearch / updateKol / bind / recharge / submitOrder', () => {
  it('kolSearchSchema tiktok 指标 与 xiaohongshu keyword', () => {
    const a = kolSearchSchema.parse({
      platform: 'tiktok',
      min_followers: '5000',
      categories: '美妆',
      min_engagement_rate: '0.03',
    });
    expect(a.min_followers).toBe(5000);
    const b = kolSearchSchema.parse({ platform: 'xiaohongshu', keyword: '笔记' });
    expect(b.keyword).toBe('笔记');
  });

  it('updateKolSchema base_price 与 tags', () => {
    const r = updateKolSchema.parse({
      base_price: 1200,
      tags: ['a', 'b'],
    });
    expect(r.base_price).toBe(1200);
    expect(r.tags).toHaveLength(2);
  });

  it('createKolSchema instagram', () => {
    const r = createKolSchema.parse({
      platform: 'instagram',
      platform_username: 'ig_user',
      platform_id: '17841400000000000',
    });
    expect(r.platform).toBe('instagram');
  });

  it('bindKolAccountSchema youtube 与 access_token', () => {
    const r = bindKolAccountSchema.parse({
      platform: 'youtube',
      platform_username: 'ch',
      platform_id: 'UCxxxxxxxx',
      access_token: 'at',
      refresh_token: 'rt',
    });
    expect(r.platform).toBe('youtube');
    expect(r.refresh_token).toBe('rt');
  });

  it('rechargeSchema bank_transfer 与 payment_proof', () => {
    const r = rechargeSchema.parse({
      amount: 500,
      payment_method: 'bank_transfer',
      payment_proof: 'https://cdn.example.com/p.png',
    });
    expect(r.payment_proof).toMatch(/^https:/);
  });

  it('submitOrderSchema 双链接', () => {
    const r = submitOrderSchema.parse({
      draft_urls: ['https://v.com/a', 'https://v.com/b'],
    });
    expect(r.draft_urls).toHaveLength(2);
  });
});

describe('gstack batch22 — computeKolKeywordRank 前缀与多字段加成', () => {
  it('username 前缀 85+单字段加成', () => {
    const r = computeKolKeywordRank(
      { platformUsername: 'techguru', platformDisplayName: null, bio: null, category: null },
      'tech'
    );
    expect(r.matched_fields).toContain('username');
    expect(r.score).toBe(88);
  });

  it('display_name 前缀 78+单字段加成', () => {
    const r = computeKolKeywordRank(
      { platformUsername: 'u', platformDisplayName: 'TechWorld', bio: null, category: null },
      'tech'
    );
    expect(r.matched_fields).toContain('display_name');
    expect(r.score).toBe(81);
  });

  it('category 与 bio 同时命中 72+6', () => {
    const r = computeKolKeywordRank(
      {
        platformUsername: 'x',
        platformDisplayName: null,
        bio: 'technology blog',
        category: 'tech',
      },
      'tech'
    );
    expect(r.matched_fields.sort()).toEqual(['bio', 'category'].sort());
    expect(r.score).toBe(78);
  });
});

describe('gstack batch22 — CPM 数值路径', () => {
  it('applyCpmBudgetCap undefined 与 buildCpmBreakdown 无预算帽', () => {
    expect(applyCpmBudgetCap(200, undefined)).toBe(200);
    const b = buildCpmBreakdown({
      pricingModel: 'cpm',
      views: 5000,
      cpmRate: new Prisma.Decimal(12),
      cpmBudgetCap: null,
      price: new Prisma.Decimal(0),
      platformFee: new Prisma.Decimal(0),
      kolEarning: new Prisma.Decimal(0),
    });
    expect(b.gross_spend).toBe(60);
    expect(b.platform_fee).toBe(6);
    expect(b.kol_earning).toBe(54);
  });

  it('billableImpressionsFromOrderViews 小数向下取整 与 grossSpendFromCpm', () => {
    expect(billableImpressionsFromOrderViews(3.9)).toBe(3);
    expect(grossSpendFromCpm(1000, 10)).toBe(10);
  });
});

describe('gstack batch22 — parseQueryOrRespond / parseBodyOrRespond / csrfErrorHandler', () => {
  it('parseQueryOrRespond pagination 成功', () => {
    const req = { path: '/x', query: { page: '3', page_size: '10', sort: 'name', order: 'asc' } } as unknown as Request;
    const res = mockRes();
    const out = parseQueryOrRespond(paginationSchema, req, res as Response);
    expect(out).not.toBeNull();
    expect(out!.page).toBe(3);
    expect(out!.order).toBe('asc');
  });

  it('parseBodyOrRespond login 非法邮箱 422', () => {
    const req = { path: '/login', body: { email: 'bad', password: 'x' } } as Request;
    const res = mockRes();
    const ok = parseBodyOrRespond(loginSchema, req, res as Response);
    expect(ok).toBe(false);
    expect(res._status).toBe(422);
  });

  it('csrfErrorHandler 非 CSRF 错误透传 next', () => {
    const req = { path: '/z', method: 'GET', ip: '' } as Request;
    const res = mockRes();
    const next = jest.fn();
    const err = new Error('plain');
    csrfErrorHandler(err, req, res as Response, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

describe('gstack batch22 — extractTokenFromHeader / TokenError / 脱敏', () => {
  it('Authorization 边界与 TokenError.code', () => {
    expect(extractTokenFromHeader('Basic xxx')).toBeNull();
    expect(extractTokenFromHeader('Bearer a b')).toBeNull();
    expect(extractTokenFromHeader('Bearer abc.def.ghi')).toBe('abc.def.ghi');
    expect(new TokenError('过期', 'TOKEN_EXPIRED').code).toBe('TOKEN_EXPIRED');
  });

  it('maskCompanyName maskTaxId maskRealName', () => {
    expect(maskCompanyName('ACME Tech Ltd')).toContain('**');
    expect(maskTaxId('91310101MA1234567X')).toContain('**********');
    expect(maskRealName('王五')).toMatch(/^王/);
  });
});

describe('gstack batch22 — sendVerificationCode 默认 purpose / errors / apiResponse / Cache', () => {
  it('sendVerificationCodeSchema 省略 purpose 默认 register', () => {
    const r = sendVerificationCodeSchema.parse({ type: 'email', target: 'd@e.com' });
    expect(r.purpose).toBe('register');
  });

  it('errors 工厂 statusCode 与 code', () => {
    expect(errors.badRequest().statusCode).toBe(400);
    expect(errors.conflict().code).toBe('CONFLICT');
    expect(errors.tooManyRequests().statusCode).toBe(429);
    expect(errors.internal().code).toBe('INTERNAL_ERROR');
    expect(errors.serviceUnavailable().statusCode).toBe(503);
  });

  it('apiResponseSchema 失败含 error.details', () => {
    const schema = apiResponseSchema(z.object({ id: z.number() }));
    const r = schema.parse({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'bad',
        details: [{ field: 'email', message: 'invalid' }],
      },
    }) as { success: boolean; error?: { details?: Array<{ field?: string }> } };
    expect(r.success).toBe(false);
    expect(r.error?.details?.[0]?.field).toBe('email');
  });

  it('CacheKeys user.byId system.locks 与 CacheTTL campaign.stats dashboard.analytics', () => {
    expect(CacheKeys.user.byId('u1')).toBe('user:u1');
    expect(CacheKeys.system.locks('pay')).toBe('system:locks:pay');
    expect(CacheTTL.campaign.stats).toBe(120);
    expect(CacheTTL.dashboard.analytics).toBe(120);
  });
});

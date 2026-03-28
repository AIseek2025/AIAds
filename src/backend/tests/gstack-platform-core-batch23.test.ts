/**
 * GStack 平台核心域单测第二十三批次（30 条）：validateParams / validateQuery / validateBody / validate 组合、
 * phoneSchema 与多 schema 失败样例、decimalToNumber 与 CPM 边界、mask/crypto 小函数、parseMetrics 默认、
 * 业务 schema 拒绝路径、Cache/errors、apiResponse 带 message；与 batch2 的校验用例错开组合与断言。
 */

import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { parseMetricsBatchArgs } from '../src/scripts/lib/orderMetricsBatchPayload';
import {
  billableImpressionsFromOrderViews,
  applyCpmBudgetCap,
  grossSpendFromCpm,
} from '../src/services/cpm-metrics.service';
import { CacheKeys, CacheTTL } from '../src/services/cache.service';
import {
  validateParams,
  validateQuery,
  validateBody,
  validate,
} from '../src/middleware/validation';
import { createRateLimiter, strictRateLimiter } from '../src/middleware/rateLimiter';
import { decodeToken, generateRandomString } from '../src/utils/crypto';
import { decimalToNumber } from '../src/utils/decimal';
import { formatCurrency } from '../src/utils/helpers';
import { computeKolKeywordRank } from '../src/utils/kolSearchRank';
import { maskVerificationCode } from '../src/utils/mask';
import { z } from 'zod';
import { errors } from '../src/middleware/errorHandler';
import {
  phoneSchema,
  emailSchema,
  passwordSchema,
  uuidSchema,
  registerSchema,
  paginationSchema,
  loginSchema,
  createCampaignSchema,
  updateKolSchema,
  withdrawSchema,
  submitOrderSchema,
  rechargeSchema,
  apiResponseSchema,
} from '../src/utils/validator';

const UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const STRONG = 'Aa1!aaaa';

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

describe('gstack batch23 — validateParams', () => {
  it('合法 uuid 写回 params 并 next', () => {
    const schema = z.object({ id: z.string().uuid() });
    const mw = validateParams(schema);
    const req = { params: { id: UUID }, path: '/p' } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();
    mw(req, res as Response, next);
    expect(req.params).toEqual({ id: UUID });
    expect(next).toHaveBeenCalled();
  });

  it('非法 uuid 返回 422 路径参数文案', () => {
    const schema = z.object({ id: z.string().uuid() });
    const mw = validateParams(schema);
    const req = { params: { id: 'nope' }, path: '/p' } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();
    mw(req, res as Response, next);
    expect(res._status).toBe(422);
    expect((res._json as { error?: { message?: string } })?.error?.message).toContain('路径参数');
    expect(next).not.toHaveBeenCalled();
  });
});

describe('gstack batch23 — validate / validateQuery / validateBody', () => {
  it('validate body+params 同时通过', () => {
    const mw = validate({
      body: z.object({ note: z.string().min(1) }),
      params: z.object({ id: z.string().uuid() }),
    });
    const req = {
      body: { note: 'hi' },
      params: { id: UUID },
      path: '/c',
    } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();
    mw(req, res as Response, next);
    expect(req.body).toEqual({ note: 'hi' });
    expect(req.params).toEqual({ id: UUID });
    expect(next).toHaveBeenCalled();
  });

  it('validate body+params body 失败 422', () => {
    const mw = validate({
      body: z.object({ note: z.string().min(1) }),
      params: z.object({ id: z.string().uuid() }),
    });
    const req = {
      body: { note: '' },
      params: { id: UUID },
      path: '/c',
    } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();
    mw(req, res as Response, next);
    expect(res._status).toBe(422);
    expect(next).not.toHaveBeenCalled();
  });

  it('validate query+params 同时通过', () => {
    const mw = validate({
      query: z.object({ page: z.coerce.number().int().positive() }),
      params: z.object({ campaignId: z.string().uuid() }),
    });
    const req = {
      query: { page: '4' },
      params: { campaignId: UUID },
      path: '/list',
    } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();
    mw(req, res as Response, next);
    expect((req.query as { page?: number }).page).toBe(4);
    expect(req.params).toEqual({ campaignId: UUID });
    expect(next).toHaveBeenCalled();
  });

  it('validate 仅 params', () => {
    const mw = validate({ params: z.object({ orderId: z.string().uuid() }) });
    const req = { params: { orderId: UUID }, path: '/o' } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();
    mw(req, res as Response, next);
    expect(req.params).toEqual({ orderId: UUID });
    expect(next).toHaveBeenCalled();
  });

  it('validateQuery pagination 失败', () => {
    const mw = validateQuery(paginationSchema);
    const req = { query: { page_size: '200' }, path: '/q' } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();
    mw(req, res as Response, next);
    expect(res._status).toBe(422);
    expect((res._json as { error?: { message?: string } })?.error?.message).toContain('查询参数');
    expect(next).not.toHaveBeenCalled();
  });

  it('validateBody loginSchema 成功', () => {
    const mw = validateBody(loginSchema);
    const req = {
      body: { email: 'ok@example.com', password: 'x' },
      path: '/auth',
    } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();
    mw(req, res as Response, next);
    expect((req.body as { email?: string }).email).toBe('ok@example.com');
    expect(next).toHaveBeenCalled();
  });

  it('validateBody loginSchema 邮箱非法 422', () => {
    const mw = validateBody(loginSchema);
    const req = { body: { email: 'bad', password: 'p' }, path: '/auth' } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();
    mw(req, res as Response, next);
    expect(res._status).toBe(422);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('gstack batch23 — phoneSchema / register / 多 schema 失败', () => {
  it('phoneSchema 拒绝前导 0 与字母', () => {
    expect(phoneSchema.safeParse('0138000112233').success).toBe(false);
    expect(phoneSchema.safeParse('abcd').success).toBe(false);
    expect(phoneSchema.safeParse('+14155552671').success).toBe(true);
  });

  it('registerSchema 非法 phone（+ 后首位不能为 0）', () => {
    const r = registerSchema.safeParse({
      email: 'u@u.co',
      password: STRONG,
      phone: '+01234567890',
    });
    expect(r.success).toBe(false);
  });

  it('email password pagination uuid 校验失败样例', () => {
    expect(emailSchema.safeParse('not-email').success).toBe(false);
    expect(passwordSchema.safeParse('onlylowercase1!').success).toBe(false);
    expect(paginationSchema.safeParse({ page_size: 101 }).success).toBe(false);
    expect(uuidSchema.safeParse('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx').success).toBe(false);
  });
});

describe('gstack batch23 — decimalToNumber / CPM 边界', () => {
  it('decimalToNumber Prisma.Decimal 与 NaN 与字符串', () => {
    expect(decimalToNumber(new Prisma.Decimal('12.5'))).toBe(12.5);
    expect(decimalToNumber({ toNumber: () => NaN })).toBe(0);
    expect(decimalToNumber('99')).toBe(99);
    expect(decimalToNumber('z')).toBe(0);
  });

  it('applyCpmBudgetCap cap 为 0 不截断', () => {
    expect(applyCpmBudgetCap(80, new Prisma.Decimal(0))).toBe(80);
  });

  it('grossSpendFromCpm 舍入', () => {
    expect(grossSpendFromCpm(3333, 0.01)).toBe(0.03);
  });

  it('billableImpressionsFromOrderViews 负数归零', () => {
    expect(billableImpressionsFromOrderViews(-9)).toBe(0);
  });
});

describe('gstack batch23 — mask / crypto / metrics / helpers', () => {
  it('maskVerificationCode', () => {
    expect(maskVerificationCode()).toBe('******');
  });

  it('decodeToken 非法串与 generateRandomString 长度', () => {
    expect(decodeToken('not.a.valid.jwt.structure')).toBeNull();
    expect(generateRandomString(6).length).toBe(12);
  });

  it('parseMetricsBatchArgs 默认 limit 50', () => {
    const a = parseMetricsBatchArgs([]);
    expect(a.limit).toBe(50);
    expect(a.cpmOnly).toBe(false);
  });

  it('formatCurrency CNY', () => {
    expect(formatCurrency(1234.5, 'CNY')).toContain('1');
  });
});

describe('gstack batch23 — 业务 schema 拒绝路径', () => {
  it('createCampaignSchema title 为空失败', () => {
    expect(createCampaignSchema.safeParse({ title: '', budget: 10 }).success).toBe(false);
  });

  it('updateKolSchema bio 超长失败', () => {
    const long = 'a'.repeat(1001);
    expect(updateKolSchema.safeParse({ bio: long }).success).toBe(false);
  });

  it('withdrawSchema 缺 account 字段失败', () => {
    expect(
      withdrawSchema.safeParse({
        amount: 10,
        payment_method: 'alipay',
      }).success
    ).toBe(false);
  });

  it('submitOrderSchema draft_urls 空数组失败', () => {
    expect(submitOrderSchema.safeParse({ draft_urls: [] }).success).toBe(false);
  });

  it('rechargeSchema 金额为负失败', () => {
    expect(
      rechargeSchema.safeParse({
        amount: -1,
        payment_method: 'alipay',
      }).success
    ).toBe(false);
  });
});

describe('gstack batch23 — computeKolKeywordRank / apiResponse / Cache / errors / rateLimiter', () => {
  it('username 精确匹配 100+单字段加成', () => {
    const r = computeKolKeywordRank(
      { platformUsername: 'beauty', platformDisplayName: null, bio: null, category: null },
      'beauty'
    );
    expect(r.matched_fields).toContain('username');
    expect(r.score).toBe(103);
  });

  it('apiResponseSchema 成功可带 message', () => {
    const schema = apiResponseSchema(z.object({ id: z.number() }));
    const r = schema.parse({ success: true, data: { id: 1 }, message: '保存成功' });
    expect(r.success).toBe(true);
    expect(r.message).toBe('保存成功');
  });

  it('CacheKeys campaign.list 与 kol.byPlatform 与 CacheTTL', () => {
    expect(CacheKeys.campaign.list('adv1', 'active')).toContain('adv1');
    expect(CacheKeys.kol.byPlatform('tiktok', 'approved')).toContain('tiktok');
    expect(CacheTTL.order.list).toBe(120);
  });

  it('errors.notFound', () => {
    const e = errors.notFound('missing');
    expect(e.statusCode).toBe(404);
    expect(e.code).toBe('NOT_FOUND');
  });

  it('createRateLimiter 与 strictRateLimiter 可实例化', () => {
    expect(typeof createRateLimiter({ max: 1, windowMs: 1000 })).toBe('function');
    expect(typeof strictRateLimiter).toBe('function');
  });
});

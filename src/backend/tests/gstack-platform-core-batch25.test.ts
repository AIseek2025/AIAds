/**
 * GStack 平台核心域单测第二十五批次（30 条核心用例）：errorHandler 扩展分支（SyntaxError / 配置错误 / 生产 500 脱敏 / 友好文案）、
 * notFoundHandler、crypto 验证码与随机串、mask 边界、Zod 字段组合、computeKolKeywordRank、CPM/Prisma、
 * Cache、retry/formatCurrency/parseMetrics/isPast；与 batch2 的 errorHandler 三类型、batch20–24 错开断言。
 */

import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { errorHandler, notFoundHandler, ApiError } from '../src/middleware/errorHandler';
import { ValidationError } from '../src/utils/validator';
import { TokenError } from '../src/utils/crypto';
import {
  generateVerificationCode,
  hashVerificationCode,
  verifyVerificationCode,
  generateRandomString,
} from '../src/utils/crypto';
import { logger } from '../src/utils/logger';
import { buildCpmBreakdown, prismaDecimalsFromCpmSettlement } from '../src/services/cpm-metrics.service';
import { CacheKeys, CacheTTL } from '../src/services/cache.service';
import { parseMetricsBatchArgs } from '../src/scripts/lib/orderMetricsBatchPayload';
import { computeKolKeywordRank } from '../src/utils/kolSearchRank';
import { maskRealName, maskUserData, maskPhone } from '../src/utils/mask';
import { retry, formatCurrency } from '../src/utils/helpers';
import {
  sendVerificationCodeSchema,
  verifyCodeBodySchema,
  createAdvertiserSchema,
  updateCampaignSchema,
  createKolSchema,
  withdrawSchema,
  applyTaskSchema,
} from '../src/utils/validator';

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

describe('gstack batch25 — errorHandler 扩展分支', () => {
  const baseReq = { method: 'POST', path: '/api/x', requestId: 'eh-1' } as Request;

  beforeEach(() => {
    jest.spyOn(logger, 'error').mockImplementation(() => logger);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('SyntaxError 且 req 含 body → 400 INVALID_JSON', () => {
    const err = new SyntaxError('Unexpected token');
    const req = { ...baseReq, body: {} } as Request;
    const res = mockRes();
    errorHandler(err, req, res as Response, jest.fn());
    expect(res._status).toBe(400);
    expect((res._json as { error?: { code?: string } })?.error?.code).toBe('INVALID_JSON');
  });

  it('Error 含 configuration error → 500 CONFIGURATION_ERROR', () => {
    const res = mockRes();
    errorHandler(new Error('JWT secret configuration error'), baseReq, res as Response, jest.fn());
    expect(res._status).toBe(500);
    expect((res._json as { error?: { code?: string } })?.error?.code).toBe('CONFIGURATION_ERROR');
  });

  it('普通 Error → 500 INTERNAL_ERROR（非生产文案）', () => {
    const res = mockRes();
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
      errorHandler(new Error('internal detail'), baseReq, res as Response, jest.fn());
      expect(res._status).toBe(500);
      expect((res._json as { error?: { message?: string } })?.error?.message).toContain('服务器内部错误');
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  it('生产环境 500 隐藏内部文案', () => {
    const res = mockRes();
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      errorHandler(new Error('db password leak'), baseReq, res as Response, jest.fn());
      expect((res._json as { error?: { message?: string } })?.error?.message).toBe(
        '服务器内部错误，请稍后重试或联系技术支持'
      );
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  it('ApiError NOT_FOUND 使用友好 message', () => {
    const res = mockRes();
    errorHandler(new ApiError('raw-msg', 404, 'NOT_FOUND'), baseReq, res as Response, jest.fn());
    expect((res._json as { error?: { message?: string } })?.error?.message).toBe('请求的资源不存在');
  });

  it('ValidationError 422 与 details', () => {
    const res = mockRes();
    errorHandler(new ValidationError('v', [{ field: 'email', message: 'bad' }]), baseReq, res as Response, jest.fn());
    expect(res._status).toBe(422);
    expect((res._json as { error?: { details?: { field?: string }[] } })?.error?.details?.[0]?.field).toBe('email');
  });

  it('TokenError 401 与 code', () => {
    const res = mockRes();
    errorHandler(new TokenError('x', 'TOKEN_EXPIRED'), baseReq, res as Response, jest.fn());
    expect(res._status).toBe(401);
    expect((res._json as { error?: { message?: string } })?.error?.message).toBe('登录已过期，请重新登录');
  });
});

describe('gstack batch25 — notFoundHandler', () => {
  it('404 与 NOT_FOUND', () => {
    jest.spyOn(logger, 'info').mockImplementation(() => logger);
    const req = { method: 'GET', path: '/missing', requestId: 'nf-1' } as Request;
    const res = mockRes();
    notFoundHandler(req, res as Response);
    expect(res._status).toBe(404);
    expect((res._json as { error?: { code?: string } })?.error?.code).toBe('NOT_FOUND');
    jest.restoreAllMocks();
  });
});

describe('gstack batch25 — crypto 验证码与随机串', () => {
  it('generateVerificationCode 为 6 位数字串', () => {
    const c = generateVerificationCode();
    expect(c).toMatch(/^\d{6}$/);
  });

  it('hashVerificationCode 确定性', () => {
    expect(hashVerificationCode('123456')).toBe(hashVerificationCode('123456'));
  });

  it('verifyVerificationCode 真与假', () => {
    const h = hashVerificationCode('888888');
    expect(verifyVerificationCode('888888', h)).toBe(true);
    expect(verifyVerificationCode('000000', h)).toBe(false);
  });

  it('generateRandomString 默认长度 64 hex', () => {
    expect(generateRandomString()).toHaveLength(64);
  });
});

describe('gstack batch25 — mask 边界', () => {
  it('maskRealName 空与单字', () => {
    expect(maskRealName('')).toBe('');
    expect(maskRealName('李')).toBe('*');
  });

  it('maskUserData snake_case real_name', () => {
    const m = maskUserData({ real_name: '赵六' });
    expect(String(m['real_name'])).toMatch(/^赵/);
  });

  it('maskPhone 极短号码', () => {
    expect(maskPhone('123')).toBe('****');
  });
});

describe('gstack batch25 — Zod 契约', () => {
  it('sendVerificationCodeSchema type phone', () => {
    const r = sendVerificationCodeSchema.parse({ type: 'phone', target: '+8613800000000' });
    expect(r.type).toBe('phone');
  });

  it('verifyCodeBodySchema purpose 默认 register', () => {
    const r = verifyCodeBodySchema.parse({
      type: 'email',
      target: 'a@b.co',
      code: '000000',
    });
    expect(r.purpose).toBe('register');
  });

  it('createAdvertiserSchema legal_representative 与 company_size', () => {
    const r = createAdvertiserSchema.parse({
      company_name: 'Co',
      legal_representative: '法人',
      company_size: '51-200',
    });
    expect(r.company_size).toBe('51-200');
  });

  it('updateCampaignSchema min_followers 与 max_followers', () => {
    const r = updateCampaignSchema.parse({
      min_followers: 5000,
      max_followers: 500000,
    });
    expect(r.max_followers).toBe(500000);
  });

  it('createKolSchema bio category country', () => {
    const r = createKolSchema.parse({
      platform: 'tiktok',
      platform_username: 'u',
      platform_id: 'id1',
      bio: 'hello',
      category: '游戏',
      country: 'US',
    });
    expect(r.country).toBe('US');
  });

  it('withdrawSchema swift_code 与 remarks', () => {
    const r = withdrawSchema.parse({
      amount: 100,
      payment_method: 'bank_transfer',
      account_name: 'A',
      account_number: '6222000000000000',
      bank_name: 'ICBC',
      swift_code: 'ICBKCNBJ',
      remarks: '加急',
    });
    expect(r.swift_code).toBe('ICBKCNBJ');
  });

  it('applyTaskSchema 仅 message', () => {
    const r = applyTaskSchema.parse({ message: '期待合作' });
    expect(r.message).toContain('合作');
  });
});

describe('gstack batch25 — computeKolKeywordRank / CPM / Cache', () => {
  it('display_name 精确 95+单字段加成', () => {
    const r = computeKolKeywordRank(
      { platformUsername: 'u', platformDisplayName: 'beauty', bio: null, category: null },
      'beauty'
    );
    expect(r.matched_fields).toContain('display_name');
    expect(r.score).toBe(98);
  });

  it('prismaDecimalsFromCpmSettlement 全零', () => {
    const d = prismaDecimalsFromCpmSettlement(0, 0, 0);
    expect(d.price.toFixed(2)).toBe('0.00');
  });

  it('buildCpmBreakdown fixed 沿用订单价', () => {
    const b = buildCpmBreakdown({
      pricingModel: 'fixed',
      views: 0,
      cpmRate: null,
      cpmBudgetCap: null,
      price: new Prisma.Decimal(250),
      platformFee: new Prisma.Decimal(25),
      kolEarning: new Prisma.Decimal(225),
    });
    expect(b.pricing_model).toBe('fixed');
    expect(b.gross_spend).toBe(250);
  });

  it('CacheKeys dashboard.kol 与 order.stats', () => {
    expect(CacheKeys.dashboard.kol('k1', '7d')).toContain('k1');
    expect(CacheKeys.order.stats('ord-1')).toBe('order:ord-1:stats');
  });

  it('CacheTTL kol.stats 与 order.stats', () => {
    expect(CacheTTL.kol.stats).toBe(180);
    expect(CacheTTL.order.stats).toBe(60);
  });
});

describe('gstack batch25 — helpers / parseMetrics', () => {
  it('retry 第二次成功', async () => {
    let n = 0;
    const v = await retry(async () => {
      n += 1;
      if (n < 2) {
        throw new Error('once');
      }
      return 7;
    }, 3, 0);
    expect(v).toBe(7);
    expect(n).toBe(2);
  });

  it('formatCurrency USD', () => {
    expect(formatCurrency(99.5, 'USD')).toMatch(/99/);
  });

  it('parseMetricsBatchArgs views-delta 负值', () => {
    expect(parseMetricsBatchArgs(['--views-delta', '-5']).viewsDelta).toBe(-5);
  });
});

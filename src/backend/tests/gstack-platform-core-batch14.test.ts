/**
 * GStack 平台核心域单测第十四批次（30 个核心域，单文件成批）：
 * errors 工厂与 ApiError、登录/验证码/活动日期/订单成功路径、KOL 同步与修订、
 * CPM buildCpmBreakdown 预算帽、抽成比例、KOL 分类精确匹配、脱敏与 helpers 边界
 */

import { Prisma } from '@prisma/client';
import { buildCpmBreakdown, splitGrossWithPlatformFee } from '../src/services/cpm-metrics.service';
import { computeKolKeywordRank } from '../src/utils/kolSearchRank';
import {
  formatNumber,
  isFuture,
  isPast,
  truncate,
} from '../src/utils/helpers';
import {
  maskCompanyName,
  maskRealName,
  maskTaxId,
  maskVerificationCode,
} from '../src/utils/mask';
import {
  loginSchema,
  loginEmailCodeSchema,
  verifyCodeBodySchema,
  registerSchema,
  updateUserSchema,
  createCampaignSchema,
  createOrderSchema,
  reviseOrderSchema,
  updateKolSchema,
  syncKolDataSchema,
  updateAdvertiserSchema,
  paginationSchema,
  kolSearchSchema,
  applyTaskSchema,
  submitOrderSchema,
} from '../src/utils/validator';
import { ApiError, errors, createError } from '../src/middleware/errorHandler';

const CID = '550e8400-e29b-41d4-a716-446655440001';
const KID = '550e8400-e29b-41d4-a716-446655440002';
const STRONG = 'Abcd1234!';

describe('gstack batch14 — ApiError / errors 工厂 / createError', () => {
  it('errors.badRequest 默认 400 BAD_REQUEST', () => {
    const e = errors.badRequest();
    expect(e).toBeInstanceOf(ApiError);
    expect(e.statusCode).toBe(400);
    expect(e.code).toBe('BAD_REQUEST');
  });

  it('errors.notFound / unauthorized / forbidden 状态码契约', () => {
    expect(errors.notFound().statusCode).toBe(404);
    expect(errors.notFound().code).toBe('NOT_FOUND');
    expect(errors.unauthorized().statusCode).toBe(401);
    expect(errors.forbidden().statusCode).toBe(403);
  });

  it('errors.conflict / tooManyRequests / internal / serviceUnavailable', () => {
    expect(errors.conflict().statusCode).toBe(409);
    expect(errors.tooManyRequests().statusCode).toBe(429);
    expect(errors.internal().statusCode).toBe(500);
    expect(errors.serviceUnavailable().statusCode).toBe(503);
  });

  it('createError 可带 details', () => {
    const e = createError('x', 422, 'VALIDATION_ERROR', [{ field: 'a', message: 'm' }]);
    expect(e.details?.[0].field).toBe('a');
  });
});

describe('gstack batch14 — login / 验证码 / 注册 / 用户更新', () => {
  it('loginSchema', () => {
    const r = loginSchema.parse({ email: 'u@e.com', password: 'x' });
    expect(r.email).toBe('u@e.com');
  });

  it('loginEmailCodeSchema', () => {
    const r = loginEmailCodeSchema.parse({ email: 'a@b.com', code: '123456' });
    expect(r.code).toBe('123456');
  });

  it('verifyCodeBodySchema purpose reset_password', () => {
    const r = verifyCodeBodySchema.parse({
      type: 'email',
      target: 't@e.com',
      code: '654321',
      purpose: 'reset_password',
    });
    expect(r.purpose).toBe('reset_password');
  });

  it('registerSchema nickname 可选', () => {
    const r = registerSchema.parse({
      email: 'n@b.com',
      password: STRONG,
      nickname: 'Nick',
    });
    expect(r.nickname).toBe('Nick');
  });

  it('updateUserSchema avatar_url 可置 null', () => {
    const r = updateUserSchema.parse({ avatar_url: null, language: 'en-US' });
    expect(r.avatar_url).toBeNull();
    expect(r.language).toBe('en-US');
  });
});

describe('gstack batch14 — Campaign 日期区间 / Order 成功路径 / 修订 / KOL', () => {
  it('createCampaignSchema start_date 与 end_date', () => {
    const r = createCampaignSchema.parse({
      title: 'T',
      budget: 100,
      start_date: '2026-01-01',
      end_date: '2026-03-01',
    });
    expect(r.start_date).toBe('2026-01-01');
    expect(r.end_date).toBe('2026-03-01');
  });

  it('createOrderSchema fixed 成功', () => {
    const r = createOrderSchema.parse({
      campaign_id: CID,
      kol_id: KID,
      pricing_model: 'fixed',
      offered_price: 199,
    });
    expect(r.pricing_model).toBe('fixed');
    expect(r.offered_price).toBe(199);
  });

  it('createOrderSchema cpm 成功', () => {
    const r = createOrderSchema.parse({
      campaign_id: CID,
      kol_id: KID,
      pricing_model: 'cpm',
      cpm_rate: 12,
      offered_price: 800,
    });
    expect(r.cpm_rate).toBe(12);
    expect(r.offered_price).toBe(800);
  });

  it('reviseOrderSchema 含 message', () => {
    const r = reviseOrderSchema.parse({
      draft_urls: ['https://a.com/x'],
      message: '请调整',
    });
    expect(r.message).toBe('请调整');
  });

  it('updateKolSchema base_price', () => {
    const r = updateKolSchema.parse({ base_price: 88.8 });
    expect(r.base_price).toBeCloseTo(88.8);
  });

  it('syncKolDataSchema 无 account_ids', () => {
    expect(syncKolDataSchema.parse({})).toEqual({});
  });

  it('updateAdvertiserSchema website 可置 null', () => {
    const r = updateAdvertiserSchema.parse({ website: null });
    expect(r.website).toBeNull();
  });
});

describe('gstack batch14 — pagination / kolSearch / task / submit', () => {
  it('paginationSchema 默认 page 与 page_size', () => {
    const r = paginationSchema.parse({});
    expect(r.page).toBe(1);
    expect(r.page_size).toBe(20);
    expect(r.order).toBe('desc');
  });

  it('kolSearchSchema youtube 与 categories', () => {
    const r = kolSearchSchema.parse({
      platform: 'youtube',
      categories: 'gaming,tech',
    });
    expect(r.platform).toBe('youtube');
    expect(r.categories).toBe('gaming,tech');
  });

  it('applyTaskSchema 仅 message', () => {
    const r = applyTaskSchema.parse({ message: '接单说明' });
    expect(r.message).toBe('接单说明');
  });

  it('submitOrderSchema 双链接', () => {
    const r = submitOrderSchema.parse({
      draft_urls: ['https://a.com/1', 'https://b.com/2'],
    });
    expect(r.draft_urls).toHaveLength(2);
  });
});

describe('gstack batch14 — buildCpmBreakdown CPM+帽 / splitGrossWithPlatformFee', () => {
  it('buildCpmBreakdown cpm 高额曝光被预算帽截断', () => {
    const b = buildCpmBreakdown({
      pricingModel: 'cpm',
      views: 100_000,
      cpmRate: new Prisma.Decimal(10),
      cpmBudgetCap: new Prisma.Decimal(50),
      price: new Prisma.Decimal(0),
      platformFee: new Prisma.Decimal(0),
      kolEarning: new Prisma.Decimal(0),
    });
    expect(b.gross_spend).toBe(50);
    expect(b.cpm_budget_cap).toBe(50);
    expect(b.platform_fee).toBe(5);
    expect(b.kol_earning).toBe(45);
  });

  it('splitGrossWithPlatformFee 费率 0.15', () => {
    const s = splitGrossWithPlatformFee(200, 0.15);
    expect(s.platformFee).toBe(30);
    expect(s.kolEarning).toBe(170);
  });

});

describe('gstack batch14 — computeKolKeywordRank category 精确', () => {
  it('category 精确匹配 72+单字段加成', () => {
    const r = computeKolKeywordRank(
      { platformUsername: 'x', platformDisplayName: null, bio: null, category: 'electronics' },
      'electronics'
    );
    expect(r.matched_fields).toContain('category');
    expect(r.score).toBe(75);
  });
});

describe('gstack batch14 — maskCompanyName / maskTaxId / maskRealName / maskVerificationCode', () => {
  it('maskCompanyName 多词', () => {
    expect(maskCompanyName('ACME Trading Co')).toMatch(/^A\*\*/);
  });

  it('maskTaxId 长度≥18', () => {
    expect(maskTaxId('91310101MA1234567X')).toContain('**********');
  });

  it('maskRealName 单字为 *', () => {
    expect(maskRealName('李')).toBe('*');
  });

  it('maskVerificationCode 固定星号', () => {
    expect(maskVerificationCode()).toBe('******');
  });
});

describe('gstack batch14 — helpers isPast / isFuture / truncate / formatNumber', () => {
  it('isPast 与 isFuture', () => {
    expect(isPast(new Date('2000-01-01'))).toBe(true);
    expect(isFuture(new Date('2099-01-01'))).toBe(true);
  });

  it('truncate 超长加省略', () => {
    expect(truncate('abcdef', 3)).toBe('abc...');
  });

  it('formatNumber 千分位', () => {
    expect(formatNumber(12345)).toMatch(/12/);
    expect(formatNumber(12345)).toMatch(/345/);
  });
});

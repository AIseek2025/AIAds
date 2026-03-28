/**
 * GStack 平台核心域单测第二十四批次（30 条）：requireAdmin、PerformanceMonitor / DatabasePerformanceMonitor、
 * auditLog 中间件与 logCriticalAction / 安全审计函数、Zod 契约补充、KOL 排序、CPM、decimal、Cache、
 * createError / ApiError、helpers；与 batch3 的管理员权限矩阵、batch23 的 validate 矩阵错开。
 */

import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { requireAdmin } from '../src/middleware/adminAuth';
import { ApiError, createError } from '../src/middleware/errorHandler';
import {
  auditLog,
  logSecurityEvent,
  logAuthEvent,
  logDataAccess,
  logCriticalAction,
} from '../src/middleware/auditLog';
import { PerformanceMonitor, DatabasePerformanceMonitor } from '../src/middleware/performance';
import { logger } from '../src/utils/logger';
import { DEFAULT_PLATFORM_FEE_RATE, splitGrossWithPlatformFee } from '../src/services/cpm-metrics.service';
import { CacheKeys } from '../src/services/cache.service';
import { decimalToNumber } from '../src/utils/decimal';
import {
  generateRequestId,
  sleep,
  formatNumber,
  flattenObject,
  omit,
  daysDifference,
} from '../src/utils/helpers';
import { computeKolKeywordRank } from '../src/utils/kolSearchRank';
import {
  changePasswordSchema,
  refreshTokenSchema,
  loginEmailCodeSchema,
  updateUserSchema,
  createCampaignSchema,
  bindKolAccountSchema,
  paginationSchema,
} from '../src/utils/validator';

const STRONG = 'Aa1!aaaa';
const STRONG_NEW = 'Bb2!bbbb';

describe('gstack batch24 — requireAdmin', () => {
  it('无 req.admin 抛 ApiError 401', () => {
    expect(() => requireAdmin({} as Request)).toThrow(ApiError);
    try {
      requireAdmin({} as Request);
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).statusCode).toBe(401);
      expect((e as ApiError).code).toBe('AUTH_REQUIRED');
    }
  });

  it('有 admin 返回非空对象', () => {
    const adm = {
      id: 'adm-1',
      email: 'a@x.co',
      name: 'N',
      role: 'admin',
      permissions: ['p:1'],
    };
    const out = requireAdmin({ admin: adm } as Request);
    expect(out.id).toBe('adm-1');
    expect(out.permissions).toContain('p:1');
  });
});

describe('gstack batch24 — PerformanceMonitor', () => {
  it('middleware 记录请求与 getMetrics', () => {
    const pm = new PerformanceMonitor(0);
    const finishers: Array<() => void> = [];
    const res = {
      statusCode: 200,
      on(ev: string, fn: () => void) {
        if (ev === 'finish') finishers.push(fn);
        return res;
      },
      getHeader: () => undefined,
    } as unknown as Response;
    pm.middleware({ method: 'GET', path: '/api/v1/orders/550e8400-e29b-41d4-a716-446655440099', headers: {} } as Request, res, jest.fn());
    finishers.forEach((f) => f());
    const m = pm.getMetrics();
    expect(m.requestCount).toBe(1);
    expect(m.avgDuration).toBeGreaterThanOrEqual(0);
  });

  it('reset 清空计数', () => {
    const pm = new PerformanceMonitor(10000);
    pm.reset();
    expect(pm.getMetrics().requestCount).toBe(0);
  });

  it('checkP95Target 返回 meets/current/target', () => {
    const pm = new PerformanceMonitor(10000);
    const c = pm.checkP95Target(200);
    expect(c.target).toBe(200);
    expect(typeof c.meets).toBe('boolean');
  });

  it('getSlowPaths 阈值过滤', () => {
    const pm = new PerformanceMonitor(0);
    const finishers: Array<() => void> = [];
    const res = {
      statusCode: 200,
      on(ev: string, fn: () => void) {
        if (ev === 'finish') finishers.push(fn);
        return res;
      },
      getHeader: () => undefined,
    } as unknown as Response;
    pm.middleware({ method: 'POST', path: '/slow', headers: {} } as Request, res, jest.fn());
    finishers.forEach((f) => f());
    const slow = pm.getSlowPaths(0);
    expect(Array.isArray(slow)).toBe(true);
  });
});

describe('gstack batch24 — DatabasePerformanceMonitor', () => {
  it('recordQuery 与 getQueryStats', () => {
    const db = new DatabasePerformanceMonitor(30);
    db.recordQuery('Campaign', 'findMany', 80, true);
    const rows = db.getQueryStats();
    expect(rows.length).toBe(1);
    expect(rows[0].model).toBe('Campaign');
    expect(rows[0].count).toBe(1);
  });

  it('慢查询计入 slowCount', () => {
    const db = new DatabasePerformanceMonitor(50);
    db.recordQuery('Order', 'aggregate', 200, true);
    expect(db.getQueryStats()[0].slowCount).toBeGreaterThanOrEqual(1);
  });

  it('reset 清空', () => {
    const db = new DatabasePerformanceMonitor(10);
    db.recordQuery('X', 'y', 5, true);
    db.reset();
    expect(db.getQueryStats().length).toBe(0);
  });
});

describe('gstack batch24 — auditLog 中间件与 critical / 事件函数', () => {
  beforeEach(() => {
    jest.spyOn(logger, 'info').mockImplementation(() => logger);
    jest.spyOn(logger, 'warn').mockImplementation(() => logger);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('auditLog 使用 x-request-id', () => {
    const req = {
      headers: { 'x-request-id': 'req-from-edge' },
      method: 'GET',
      path: '/api/ping',
      query: {},
      body: {},
      ip: '127.0.0.1',
      get: () => '',
    } as unknown as Request;
    const res = { on: jest.fn() } as unknown as Response;
    const next = jest.fn();
    auditLog(req, res, next);
    expect(req.requestId).toBe('req-from-edge');
    expect(next).toHaveBeenCalled();
  });

  it('logCriticalAction 工厂调用 next', () => {
    const mw = logCriticalAction('wallet_adjust');
    const req = {
      method: 'POST',
      path: '/admin/wallet',
      user: { id: 'u-1' },
      requestId: 'r2',
    } as unknown as Request;
    const next = jest.fn();
    mw(req, {} as Response, next);
    expect(next).toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('logSecurityEvent / logAuthEvent / logDataAccess 写入 logger.info', () => {
    logSecurityEvent('csrf_retry', 'u1', { ip: '1.1.1.1' });
    logAuthEvent('password_reset', 'u2', true, { channel: 'email' });
    logDataAccess('Advertiser', 'adv-9', 'u3', 'read');
    expect(logger.info).toHaveBeenCalled();
  });
});

describe('gstack batch24 — Zod 契约补充', () => {
  it('changePasswordSchema refreshTokenSchema loginEmailCodeSchema', () => {
    expect(
      changePasswordSchema.parse({
        current_password: STRONG,
        new_password: STRONG_NEW,
      }).new_password
    ).toBe(STRONG_NEW);
    expect(refreshTokenSchema.parse({ refresh_token: 'rtok' }).refresh_token).toBe('rtok');
    expect(loginEmailCodeSchema.parse({ email: 'm@e.co', code: '123456' }).code).toBe('123456');
  });

  it('updateUserSchema nickname', () => {
    expect(updateUserSchema.parse({ nickname: 'Nick' }).nickname).toBe('Nick');
  });

  it('createCampaignSchema content_requirements 与 target_platforms', () => {
    const r = createCampaignSchema.parse({
      title: 'C',
      budget: 200,
      content_requirements: '必须口播品牌名',
      target_platforms: ['youtube', 'tiktok'],
    });
    expect(r.content_requirements).toContain('口播');
    expect(r.target_platforms).toHaveLength(2);
  });

  it('bindKolAccountSchema platform_display_name 与 avatar', () => {
    const r = bindKolAccountSchema.parse({
      platform: 'tiktok',
      platform_username: 'tt',
      platform_id: 'tid',
      platform_display_name: 'Show',
      platform_avatar_url: 'https://cdn.example.com/a.png',
    });
    expect(r.platform_display_name).toBe('Show');
  });

  it('paginationSchema order asc', () => {
    const r = paginationSchema.parse({ page: '2', order: 'asc' });
    expect(r.page).toBe(2);
    expect(r.order).toBe('asc');
  });
});

describe('gstack batch24 — computeKolKeywordRank / CPM / decimal / Cache', () => {
  it('category 子串 48+单字段加成', () => {
    const r = computeKolKeywordRank(
      { platformUsername: 'u', platformDisplayName: null, bio: null, category: 'outdoor tech gear' },
      'tech'
    );
    expect(r.matched_fields).toEqual(['category']);
    expect(r.score).toBe(51);
  });

  it('三字段命中 bonus 9', () => {
    const r = computeKolKeywordRank(
      {
        platformUsername: 'tech',
        platformDisplayName: 'tech blog',
        bio: 'tech life',
        category: 'other',
      },
      'tech'
    );
    expect(r.matched_fields.length).toBe(3);
    expect(r.score).toBe(109);
  });

  it('DEFAULT_PLATFORM_FEE_RATE 与 splitGrossWithPlatformFee 0.2', () => {
    expect(DEFAULT_PLATFORM_FEE_RATE).toBe(0.1);
    const s = splitGrossWithPlatformFee(1000, 0.2);
    expect(s.platformFee).toBe(200);
    expect(s.kolEarning).toBe(800);
  });

  it('decimalToNumber 大整数', () => {
    expect(decimalToNumber(new Prisma.Decimal('999999999.12'))).toBe(999999999.12);
  });

  it('CacheKeys advertiser.wallet 与 campaign.byId', () => {
    expect(CacheKeys.advertiser.wallet('adv-x')).toBe('advertiser:adv-x:wallet');
    expect(CacheKeys.campaign.byId('cmp-y')).toBe('campaign:cmp-y');
  });
});

describe('gstack batch24 — createError ApiError helpers', () => {
  it('createError 自定义 code', () => {
    const e = createError('Teapot', 418, 'I_AM_A_TEAPOT');
    expect(e.statusCode).toBe(418);
    expect(e.code).toBe('I_AM_A_TEAPOT');
  });

  it('ApiError details 可选', () => {
    const e = new ApiError('bad', 400, 'BAD', [{ field: 'x', message: 'y' }]);
    expect(e.details?.[0].field).toBe('x');
  });
});

describe('gstack batch24 — helpers 时间与对象', () => {
  it('generateRequestId 前缀', () => {
    expect(generateRequestId()).toMatch(/^req_\d+_/);
  });

  it('sleep 0 立即完成', async () => {
    const t0 = Date.now();
    await sleep(0);
    expect(Date.now() - t0).toBeLessThan(500);
  });

  it('formatNumber', () => {
    expect(formatNumber(1234567)).toContain('234');
  });

  it('flattenObject 嵌套', () => {
    expect(flattenObject({ a: { b: 1 } })).toEqual({ 'a.b': 1 });
  });

  it('omit 删除键', () => {
    expect(omit({ a: 1, b: 2, c: 3 }, ['b'])).toEqual({ a: 1, c: 3 });
  });

  it('daysDifference', () => {
    const a = new Date('2026-01-01T00:00:00.000Z');
    const b = new Date('2026-01-04T00:00:00.000Z');
    expect(daysDifference(a, b)).toBe(3);
  });
});

/**
 * GStack 平台核心域单测第二十八批次（30 条核心用例）：order-budget 冻结/解冻/部分解冻（OrderTx mock）、
 * hashPassword/verifyPassword、mask 扩展字段、helpers（IP/UA/日期/扁平化）、Zod 订单与提现、
 * validate/validateParams/validateQuery 中间件、NotificationService 列表/未读/已读/全部已读（Prisma spy）。
 */

import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import type { OrderTx } from '../src/services/order-budget.service';
import {
  freezeBudgetOnOrderCreate,
  releaseFrozenBudgetTx,
  releasePartialFrozenBudgetTx,
} from '../src/services/order-budget.service';
import { hashPassword, verifyPassword } from '../src/utils/crypto';
import {
  maskCardNumber,
  maskRealName,
  maskIdNumber,
  maskUserData,
  maskVerificationCode,
} from '../src/utils/mask';
import { getClientIP, getUserAgent, addDays, flattenObject, deepClone } from '../src/utils/helpers';
import {
  createOrderSchema,
  reviseOrderSchema,
  withdrawSchema,
  submitOrderSchema,
  bindKolAccountSchema,
  loginSchema,
  paginationSchema,
} from '../src/utils/validator';
import { validate, validateParams, validateQuery } from '../src/middleware/validation';
import { notificationService } from '../src/services/notifications.service';
import prisma from '../src/config/database';
import { z } from 'zod';

const CID = '550e8400-e29b-41d4-a716-446655440010';
const KID = '550e8400-e29b-41d4-a716-446655440011';

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

describe('gstack batch28 — order-budget.service（OrderTx mock）', () => {
  it('freezeBudgetOnOrderCreate 成功扣减可用并记流水', async () => {
    const update = jest.fn().mockResolvedValue({});
    const create = jest.fn().mockResolvedValue({});
    const tx = {
      advertiser: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'adv1',
          walletBalance: new Prisma.Decimal(500),
          frozenBalance: new Prisma.Decimal(0),
        }),
        update,
      },
      transaction: { create },
    } as unknown as OrderTx;

    await freezeBudgetOnOrderCreate(tx, {
      advertiserId: 'adv1',
      orderId: 'ord1',
      orderNo: 'ON-F1',
      freezeAmount: new Prisma.Decimal(100),
    });

    expect(update).toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'budget_freeze', orderId: 'ord1' }),
      })
    );
  });

  it('freezeBudgetOnOrderCreate 广告主不存在 → 404', async () => {
    const tx = {
      advertiser: { findUnique: jest.fn().mockResolvedValue(null), update: jest.fn() },
      transaction: { create: jest.fn() },
    } as unknown as OrderTx;

    await expect(
      freezeBudgetOnOrderCreate(tx, {
        advertiserId: 'missing',
        orderId: 'o',
        orderNo: 'ON-X',
        freezeAmount: new Prisma.Decimal(1),
      })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('freezeBudgetOnOrderCreate 余额不足 → INSUFFICIENT_BALANCE', async () => {
    const tx = {
      advertiser: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'adv2',
          walletBalance: new Prisma.Decimal(10),
          frozenBalance: new Prisma.Decimal(0),
        }),
        update: jest.fn(),
      },
      transaction: { create: jest.fn() },
    } as unknown as OrderTx;

    await expect(
      freezeBudgetOnOrderCreate(tx, {
        advertiserId: 'adv2',
        orderId: 'o',
        orderNo: 'ON-L',
        freezeAmount: new Prisma.Decimal(100),
      })
    ).rejects.toMatchObject({ statusCode: 400, code: 'INSUFFICIENT_BALANCE' });
  });

  it('releaseFrozenBudgetTx frozenAmount≤0 直接返回', async () => {
    const update = jest.fn();
    const tx = {
      advertiser: { update },
      transaction: { create: jest.fn() },
    } as unknown as OrderTx;

    await releaseFrozenBudgetTx(tx, {
      id: 'o1',
      advertiserId: 'a1',
      orderNo: 'ON-R0',
      frozenAmount: new Prisma.Decimal(0),
    });
    expect(update).not.toHaveBeenCalled();
  });

  it('releaseFrozenBudgetTx 解冻并记 budget_release', async () => {
    const update = jest.fn().mockResolvedValue({});
    const create = jest.fn().mockResolvedValue({});
    const tx = {
      advertiser: { update },
      transaction: { create },
    } as unknown as OrderTx;

    await releaseFrozenBudgetTx(tx, {
      id: 'o2',
      advertiserId: 'a2',
      orderNo: 'ON-R1',
      frozenAmount: new Prisma.Decimal(25),
    });
    expect(update).toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'budget_release' }),
      })
    );
  });

  it('releasePartialFrozenBudgetTx 请求 0 → 不更新', async () => {
    const tx = {
      advertiser: { update: jest.fn() },
      transaction: { create: jest.fn() },
      order: { update: jest.fn() },
    } as unknown as OrderTx;

    const n = await releasePartialFrozenBudgetTx(
      tx,
      {
        id: 'o3',
        advertiserId: 'a3',
        orderNo: 'ON-P0',
        frozenAmount: new Prisma.Decimal(50),
      },
      new Prisma.Decimal(0)
    );
    expect(n).toBe(0);
    expect(tx.advertiser.update).not.toHaveBeenCalled();
  });

  it('releasePartialFrozenBudgetTx 部分解冻 min(冻结,请求)', async () => {
    const tx = {
      advertiser: { update: jest.fn().mockResolvedValue({}) },
      transaction: { create: jest.fn().mockResolvedValue({}) },
      order: { update: jest.fn().mockResolvedValue({}) },
    } as unknown as OrderTx;

    const n = await releasePartialFrozenBudgetTx(
      tx,
      {
        id: 'o4',
        advertiserId: 'a4',
        orderNo: 'ON-P1',
        frozenAmount: new Prisma.Decimal(100),
      },
      new Prisma.Decimal(30)
    );
    expect(n).toBe(30);
    expect(tx.order.update).toHaveBeenCalled();
  });

  it('releasePartialFrozenBudgetTx 请求超过冻结时按冻结额', async () => {
    const tx = {
      advertiser: { update: jest.fn().mockResolvedValue({}) },
      transaction: { create: jest.fn().mockResolvedValue({}) },
      order: { update: jest.fn().mockResolvedValue({}) },
    } as unknown as OrderTx;

    const n = await releasePartialFrozenBudgetTx(
      tx,
      {
        id: 'o5',
        advertiserId: 'a5',
        orderNo: 'ON-P2',
        frozenAmount: new Prisma.Decimal(100),
      },
      new Prisma.Decimal(500)
    );
    expect(n).toBe(100);
  });
});

describe('gstack batch28 — crypto / mask / helpers', () => {
  it('hashPassword + verifyPassword 验真', async () => {
    const h = await hashPassword('TestPass123!');
    expect(await verifyPassword('TestPass123!', h)).toBe(true);
  });

  it('verifyPassword 错误密码', async () => {
    const h = await hashPassword('OtherPass123!');
    expect(await verifyPassword('WrongPass123!', h)).toBe(false);
  });

  it('maskCardNumber 16+ 位卡号保留首尾组', () => {
    const m = maskCardNumber('6222021234567890123');
    expect(m).toContain('6222');
    expect(m).toContain('****');
    expect(m.endsWith('123')).toBe(true);
  });

  it('maskRealName / maskIdNumber 18 位 / maskVerificationCode', () => {
    expect(maskRealName('王小明')).toMatch(/^王/);
    expect(maskIdNumber('110101199001011234')).toContain('110101');
    expect(maskVerificationCode()).toBe('******');
  });

  it('maskUserData 含银行卡与 snake_case real_name', () => {
    const out = maskUserData({
      email: 'longname@test.com',
      bankAccount: '6222021234567890123',
      real_name: '李四',
    });
    expect(out.email).toContain('****');
    expect(String(out.bankAccount)).toContain('6222');
    expect(out['real_name']).toContain('*');
  });

  it('getClientIP 取 x-forwarded-for 首段', () => {
    const req = {
      headers: { 'x-forwarded-for': '203.0.113.1, 10.0.0.1' },
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as Request;
    expect(getClientIP(req)).toBe('203.0.113.1');
  });

  it('getUserAgent', () => {
    const req = { headers: { 'user-agent': 'JestUA/1.0' } } as unknown as Request;
    expect(getUserAgent(req)).toBe('JestUA/1.0');
  });

  it('addDays 与 flattenObject 嵌套', () => {
    const d = new Date('2026-06-01T00:00:00.000Z');
    expect(addDays(d, 2).getUTCDate()).toBe(3);
    expect(flattenObject({ a: { b: 1 }, c: 2 })).toEqual({ 'a.b': 1, c: 2 });
  });

  it('deepClone 断开嵌套引用', () => {
    const a = { x: { y: 1 } };
    const b = deepClone(a);
    b.x.y = 2;
    expect(a.x.y).toBe(1);
  });
});

describe('gstack batch28 — Zod 业务 schema', () => {
  it('createOrderSchema fixed + offered_price', () => {
    const r = createOrderSchema.parse({
      campaign_id: CID,
      kol_id: KID,
      pricing_model: 'fixed',
      offered_price: 199,
    });
    expect(r.pricing_model).toBe('fixed');
    expect(r.offered_price).toBe(199);
  });

  it('createOrderSchema cpm + cpm_rate + offered_price 上限', () => {
    const r = createOrderSchema.parse({
      campaign_id: CID,
      kol_id: KID,
      pricing_model: 'cpm',
      cpm_rate: 15.5,
      offered_price: 5000,
    });
    expect(r.pricing_model).toBe('cpm');
    expect(r.cpm_rate).toBe(15.5);
    expect(r.offered_price).toBe(5000);
  });

  it('reviseOrderSchema 草稿链接', () => {
    const r = reviseOrderSchema.parse({
      draft_urls: ['https://example.com/p/1'],
      message: '请审核',
    });
    expect(r.draft_urls).toHaveLength(1);
  });

  it('withdrawSchema 提现账户', () => {
    const r = withdrawSchema.parse({
      amount: 500,
      payment_method: 'bank_transfer',
      account_name: '张三',
      account_number: '6222000000000000',
      bank_name: 'ICBC',
    });
    expect(r.payment_method).toBe('bank_transfer');
  });

  it('submitOrderSchema 作品链接数组', () => {
    const r = submitOrderSchema.parse({
      draft_urls: ['https://cdn.example.com/a.mp4'],
    });
    expect(r.draft_urls).toHaveLength(1);
  });

  it('bindKolAccountSchema 平台与用户名', () => {
    const r = bindKolAccountSchema.parse({
      platform: 'tiktok',
      platform_username: 'creator_x',
      platform_id: 'pid-1',
    });
    expect(r.platform).toBe('tiktok');
  });
});

describe('gstack batch28 — validate / validateParams / validateQuery', () => {
  it('validateParams UUID 合法 → next', () => {
    const mw = validateParams(z.object({ id: z.string().uuid() }));
    const req = { params: { id: CID } } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();
    mw(req, res as Response, next);
    expect(next).toHaveBeenCalled();
  });

  it('validateQuery 非法分页 → 422', () => {
    const mw = validateQuery(paginationSchema);
    const req = { query: { page: 'not-a-number' } } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();
    mw(req, res as Response, next);
    expect(res._status).toBe(422);
    expect(next).not.toHaveBeenCalled();
  });

  it('validate body+query 组合成功', () => {
    const mw = validate({ body: loginSchema, query: paginationSchema });
    const req = {
      body: { email: 'ok@example.com', password: 'x' },
      query: { page: '2', page_size: '10' },
    } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();
    mw(req, res as Response, next);
    expect(next).toHaveBeenCalled();
    expect((req as { body: { email: string } }).body.email).toBe('ok@example.com');
  });
});

describe('gstack batch28 — NotificationService + prisma spy', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('listForUser 分页与 snake_case 行', async () => {
    jest.spyOn(prisma.notification, 'count').mockResolvedValue(1);
    jest.spyOn(prisma.notification, 'findMany').mockResolvedValue([
      {
        id: 'n1',
        userId: 'u1',
        type: 'order',
        title: 't',
        content: 'c',
        relatedType: 'order',
        relatedId: 'oid',
        isRead: false,
        readAt: null,
        actionUrl: '/x',
        actionText: '查看',
        createdAt: new Date('2026-01-15T00:00:00.000Z'),
      },
    ] as never);

    const page = await notificationService.listForUser('u1', 1, 10, false);
    expect(page.items[0].related_id).toBe('oid');
    expect(page.pagination.total).toBe(1);
  });

  it('unreadCount', async () => {
    jest.spyOn(prisma.notification, 'count').mockResolvedValue(7);
    await expect(notificationService.unreadCount('u2')).resolves.toBe(7);
  });

  it('markRead 更新为已读', async () => {
    const base = {
      id: 'nid',
      userId: 'u3',
      type: 'order' as const,
      title: 't',
      content: 'c',
      relatedType: 'order',
      relatedId: 'x',
      isRead: false,
      readAt: null,
      actionUrl: null,
      actionText: null,
      createdAt: new Date(),
    };
    jest.spyOn(prisma.notification, 'findFirst').mockResolvedValue(base as never);
    jest.spyOn(prisma.notification, 'update').mockResolvedValue({
      ...base,
      isRead: true,
      readAt: new Date('2026-02-01T00:00:00.000Z'),
    } as never);

    const row = await notificationService.markRead('u3', 'nid');
    expect(row.is_read).toBe(true);
    expect(row.read_at).not.toBeNull();
  });

  it('markAllRead 返回更新条数', async () => {
    const fn = jest.fn().mockResolvedValue({ count: 4 });
    Object.assign(prisma.notification as object, { updateMany: fn });
    try {
      await expect(notificationService.markAllRead('u4')).resolves.toEqual({ updated: 4 });
    } finally {
      delete (prisma.notification as { updateMany?: unknown }).updateMany;
    }
  });
});

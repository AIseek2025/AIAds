import type { PrismaClient } from '@prisma/client';
import { buildOrderMetricsBatchItems, parseMetricsBatchArgs } from '../src/scripts/lib/orderMetricsBatchPayload';

describe('parseMetricsBatchArgs', () => {
  it('defaults', () => {
    expect(parseMetricsBatchArgs([])).toEqual({
      limit: 50,
      cpmOnly: false,
      viewsDelta: 0,
    });
  });

  it('respects limit cap 200', () => {
    expect(parseMetricsBatchArgs(['--limit', '999']).limit).toBe(200);
  });

  it('limit 下限为 1', () => {
    expect(parseMetricsBatchArgs(['--limit', '0']).limit).toBe(1);
    expect(parseMetricsBatchArgs(['--limit', '-5']).limit).toBe(1);
  });

  it('cpm-only and views-delta', () => {
    expect(parseMetricsBatchArgs(['--cpm-only', '--views-delta', '10'])).toEqual({
      limit: 50,
      cpmOnly: true,
      viewsDelta: 10,
    });
  });

  it('views-delta 可为负（模拟回退或纠错）', () => {
    expect(parseMetricsBatchArgs(['--views-delta', '-3']).viewsDelta).toBe(-3);
  });

  it('last --limit wins when repeated', () => {
    expect(parseMetricsBatchArgs(['--limit', '5', '--limit', '80']).limit).toBe(80);
  });

  it('limit token 非数字时回退为默认 50 再参与上限', () => {
    expect(parseMetricsBatchArgs(['--limit', 'abc']).limit).toBe(50);
  });

  it('--views-delta without value leaves viewsDelta at 0', () => {
    expect(parseMetricsBatchArgs(['--views-delta']).viewsDelta).toBe(0);
  });
});

describe('buildOrderMetricsBatchItems', () => {
  it('maps rows and applies viewsDelta', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 'u1', views: 10, likes: 1, comments: 2, shares: 0 }]);
    const prisma = { order: { findMany } } as unknown as PrismaClient;
    const items = await buildOrderMetricsBatchItems(prisma, {
      limit: 50,
      cpmOnly: false,
      viewsDelta: 5,
    });
    expect(items).toEqual([{ order_id: 'u1', views: 15, likes: 1, comments: 2, shares: 0 }]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
        take: 50,
      })
    );
  });

  it('uses cpm-only filter', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { order: { findMany } } as unknown as PrismaClient;
    await buildOrderMetricsBatchItems(prisma, { limit: 10, cpmOnly: true, viewsDelta: 0 });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { pricingModel: 'cpm' },
        take: 10,
      })
    );
  });

  it('viewsDelta 为负时 views 不低于 0', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 'u1', views: 5, likes: 0, comments: 0, shares: 0 }]);
    const prisma = { order: { findMany } } as unknown as PrismaClient;
    const items = await buildOrderMetricsBatchItems(prisma, {
      limit: 10,
      cpmOnly: false,
      viewsDelta: -20,
    });
    expect(items[0].views).toBe(0);
  });
});

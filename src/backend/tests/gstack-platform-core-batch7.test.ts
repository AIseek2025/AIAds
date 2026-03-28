/**
 * GStack 平台核心域单测第七批次：
 * Zod 业务契约矩阵 / helpers 边界 / CPM buildCpmBreakdown / KOL 多字段加成 / TokenError
 */

import type { Request } from 'express';
import { Prisma } from '@prisma/client';
import { TokenError } from '../src/utils/crypto';
import { isEmpty, getClientIP, retry } from '../src/utils/helpers';
import { buildCpmBreakdown } from '../src/services/cpm-metrics.service';
import { computeKolKeywordRank } from '../src/utils/kolSearchRank';
import {
  uuidSchema,
  paginationSchema,
  phoneSchema,
  passwordSchema,
  changePasswordSchema,
  refreshTokenSchema,
  loginSchema,
  createCampaignSchema,
  updateCampaignSchema,
  updateKolSchema,
  syncKolDataSchema,
  submitOrderSchema,
  reviseOrderSchema,
  withdrawSchema,
  applyTaskSchema,
} from '../src/utils/validator';

describe('gstack batch7 — Zod uuid / pagination / phone / password / auth bodies', () => {
  it('uuidSchema 接受标准 UUID', () => {
    expect(uuidSchema.parse('550e8400-e29b-41d4-a716-446655440000')).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(() => uuidSchema.parse('not-uuid')).toThrow();
  });

  it('paginationSchema page_size 超过 100 失败', () => {
    expect(() => paginationSchema.parse({ page: 1, page_size: 101 })).toThrow();
  });

  it('phoneSchema 可为 null', () => {
    expect(phoneSchema.parse(null)).toBeNull();
  });

  it('passwordSchema 强密码通过', () => {
    expect(passwordSchema.parse('Aa1!aaaa')).toBe('Aa1!aaaa');
  });

  it('passwordSchema 弱密码失败', () => {
    expect(() => passwordSchema.parse('weak')).toThrow();
  });

  it('changePasswordSchema 新旧密码结构', () => {
    const r = changePasswordSchema.parse({
      current_password: 'Old1!aaaa',
      new_password: 'New2!bbbb',
    });
    expect(r.current_password).toBe('Old1!aaaa');
    expect(r.new_password).toBe('New2!bbbb');
  });

  it('refreshTokenSchema', () => {
    expect(refreshTokenSchema.parse({ refresh_token: 'tok' }).refresh_token).toBe('tok');
  });

  it('loginSchema 邮箱+密码', () => {
    const r = loginSchema.parse({ email: 'a@b.co', password: 'x' });
    expect(r.email).toBe('a@b.co');
  });
});

describe('gstack batch7 — Zod campaign / kol / tasks / orders / withdraw', () => {
  it('createCampaignSchema 默认 objective 与 budget_type', () => {
    const r = createCampaignSchema.parse({ title: 'T', budget: 100 });
    expect(r.objective).toBe('awareness');
    expect(r.budget_type).toBe('fixed');
  });

  it('updateCampaignSchema 仅更新 status', () => {
    const r = updateCampaignSchema.parse({ status: 'paused' });
    expect(r.status).toBe('paused');
  });

  it('updateKolSchema tags', () => {
    const r = updateKolSchema.parse({ tags: ['a', 'b'] });
    expect(r.tags).toEqual(['a', 'b']);
  });

  it('syncKolDataSchema 空对象', () => {
    expect(syncKolDataSchema.parse({})).toEqual({});
  });

  it('syncKolDataSchema account_ids', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    const r = syncKolDataSchema.parse({ account_ids: [id] });
    expect(r.account_ids).toEqual([id]);
  });

  it('submitOrderSchema 至少一条作品链接', () => {
    const r = submitOrderSchema.parse({
      draft_urls: ['https://example.com/v/1'],
    });
    expect(r.draft_urls).toHaveLength(1);
  });

  it('reviseOrderSchema 同上', () => {
    const r = reviseOrderSchema.parse({
      draft_urls: ['https://example.com/v/2'],
      message: 'rev',
    });
    expect(r.message).toBe('rev');
  });

  it('withdrawSchema wechat_pay', () => {
    const r = withdrawSchema.parse({
      amount: 50,
      payment_method: 'wechat_pay',
      account_name: '张三',
      account_number: 'wx123',
    });
    expect(r.payment_method).toBe('wechat_pay');
  });

  it('applyTaskSchema draft_urls 可选 URL 列表', () => {
    const r = applyTaskSchema.parse({
      draft_urls: ['https://a.com/x'],
      expected_price: 99,
    });
    expect(r.expected_price).toBe(99);
  });
});

describe('gstack batch7 — helpers isEmpty / getClientIP / retry', () => {
  it('isEmpty 对无自有键的对象为 true（含数组对象）', () => {
    expect(isEmpty({})).toBe(true);
    expect(isEmpty([] as unknown as object)).toBe(true);
  });

  it('getClientIP x-forwarded-for 非字符串时回退 socket', () => {
    const req = {
      headers: { 'x-forwarded-for': ['9.9.9.9'] as unknown as string },
      socket: { remoteAddress: '10.0.0.1' },
    } as unknown as Request;
    expect(getClientIP(req)).toBe('10.0.0.1');
  });

  it('retry 第二次成功', async () => {
    let n = 0;
    const v = await retry(async () => {
      n += 1;
      if (n < 2) {
        throw new Error('fail');
      }
      return 42;
    }, 3, 1);
    expect(v).toBe(42);
    expect(n).toBe(2);
  });
});

describe('gstack batch7 — buildCpmBreakdown fixed vs cpm', () => {
  it('fixed 计价保留订单金额字段', () => {
    const r = buildCpmBreakdown({
      pricingModel: 'fixed',
      views: 9999,
      cpmRate: new Prisma.Decimal(100),
      cpmBudgetCap: null,
      price: new Prisma.Decimal(300),
      platformFee: new Prisma.Decimal(30),
      kolEarning: new Prisma.Decimal(270),
    });
    expect(r.pricing_model).toBe('fixed');
    expect(r.gross_spend).toBe(300);
    expect(r.cpm_rate).toBe(100);
  });

  it('cpm 计价按曝光重算 gross 与分成', () => {
    const r = buildCpmBreakdown({
      pricingModel: 'cpm',
      views: 1000,
      cpmRate: new Prisma.Decimal(10),
      cpmBudgetCap: null,
      price: new Prisma.Decimal(9999),
      platformFee: new Prisma.Decimal(0),
      kolEarning: new Prisma.Decimal(0),
    });
    expect(r.pricing_model).toBe('cpm');
    expect(r.billable_impressions).toBe(1000);
    expect(r.gross_spend).toBe(10);
    expect(r.platform_fee).toBe(1);
    expect(r.kol_earning).toBe(9);
  });
});

describe('gstack batch7 — computeKolKeywordRank multi-field bonus', () => {
  it('两字段精确命中含加成（best + min(2*3,15)）', () => {
    const r = computeKolKeywordRank(
      {
        platformUsername: 'foo',
        platformDisplayName: 'foo',
        bio: null,
        category: null,
      },
      'foo'
    );
    expect(r.matched_fields).toEqual(['username', 'display_name']);
    expect(r.score).toBe(106);
  });

  it('三字段命中（username/bio/category）加成 9', () => {
    const r = computeKolKeywordRank(
      {
        platformUsername: 'uuubar',
        platformDisplayName: null,
        bio: 'xbarx',
        category: 'bar',
      },
      'bar'
    );
    expect(r.matched_fields.length).toBe(3);
    expect(r.score).toBe(81);
  });
});

describe('gstack batch7 — TokenError', () => {
  it('携带 code 字段', () => {
    const e = new TokenError('过期', 'TOKEN_EXPIRED');
    expect(e.code).toBe('TOKEN_EXPIRED');
    expect(e.name).toBe('TokenError');
  });
});

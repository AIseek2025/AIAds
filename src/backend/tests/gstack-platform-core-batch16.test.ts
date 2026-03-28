/**
 * GStack 平台核心域单测第十六批次（30 个核心域，单文件成批）：
 * 登录/刷新/改密/验证码矩阵、注册 invite、订单默认 fixed、活动 objective/hashtags、
 * KOL weibo/tiktok、任务草稿与交稿、提现对公、CPM 未封顶 breakdown、预算释放、
 * 指标脚本 views-delta、decimal/mask/helpers、UUID 与 sanitize、validateRequest 成功路径
 */

import { Prisma } from '@prisma/client';
import { parseMetricsBatchArgs } from '../src/scripts/lib/orderMetricsBatchPayload';
import {
  billableImpressionsFromOrderViews,
  grossSpendFromCpm,
  buildCpmBreakdown,
} from '../src/services/cpm-metrics.service';
import { genTransactionNo, partialReleaseAmount } from '../src/services/order-budget.service';
import { decimalToNumber } from '../src/utils/decimal';
import { deepClone, isEmpty } from '../src/utils/helpers';
import { computeKolKeywordRank } from '../src/utils/kolSearchRank';
import { maskEmail, maskIdNumber } from '../src/utils/mask';
import { z } from 'zod';
import {
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  verifyCodeBodySchema,
  sendVerificationCodeSchema,
  registerSchema,
  loginEmailCodeSchema,
  updateUserSchema,
  createCampaignSchema,
  updateCampaignSchema,
  createOrderSchema,
  createKolSchema,
  bindKolAccountSchema,
  applyTaskSchema,
  submitOrderSchema,
  withdrawSchema,
  syncKolDataSchema,
  rechargeSchema,
  validateRequest,
  generateUUID,
  sanitizeString,
} from '../src/utils/validator';

const CID = '550e8400-e29b-41d4-a716-446655440001';
const KID = '550e8400-e29b-41d4-a716-446655440002';
const AID = '550e8400-e29b-41d4-a716-446655440003';
const BID = '550e8400-e29b-41d4-a716-446655440004';
const STRONG = 'Abcd1234!';

describe('gstack batch16 — login / refresh / changePassword / 验证码', () => {
  it('loginSchema', () => {
    const r = loginSchema.parse({ email: 'a@b.com', password: 'p' });
    expect(r.email).toBe('a@b.com');
  });

  it('refreshTokenSchema', () => {
    const r = refreshTokenSchema.parse({ refresh_token: 'rt' });
    expect(r.refresh_token).toBe('rt');
  });

  it('changePasswordSchema', () => {
    const r = changePasswordSchema.parse({
      current_password: 'Old1!pass',
      new_password: STRONG,
    });
    expect(r.new_password).toBe(STRONG);
  });

  it('verifyCodeBodySchema purpose 默认 register', () => {
    const r = verifyCodeBodySchema.parse({
      type: 'email',
      target: 't@e.com',
      code: '000000',
    });
    expect(r.purpose).toBe('register');
  });

  it('sendVerificationCodeSchema 与 loginEmailCodeSchema', () => {
    const s1 = sendVerificationCodeSchema.parse({ type: 'email', target: 'x@y.com' });
    expect(s1.purpose).toBe('register');
    const s2 = loginEmailCodeSchema.parse({ email: 'm@n.com', code: '888888' });
    expect(s2.code).toHaveLength(6);
  });
});

describe('gstack batch16 — register invite / updateUser', () => {
  it('registerSchema invite_code 有效', () => {
    const r = registerSchema.parse({
      email: 'inv@e.com',
      password: STRONG,
      invite_code: 'PROMO2026',
    });
    expect(r.invite_code).toBe('PROMO2026');
  });

  it('updateUserSchema nickname 与 timezone', () => {
    const r = updateUserSchema.parse({ nickname: 'N', timezone: 'Asia/Shanghai' });
    expect(r.timezone).toBe('Asia/Shanghai');
  });
});

describe('gstack batch16 — Campaign / Order 默认 fixed / 更新 completed', () => {
  it('createCampaignSchema objective traffic 与 required_hashtags', () => {
    const r = createCampaignSchema.parse({
      title: 'T',
      budget: 50,
      objective: 'traffic',
      required_hashtags: ['#ad', '#sponsored'],
    });
    expect(r.objective).toBe('traffic');
    expect(r.required_hashtags).toHaveLength(2);
  });

  it('updateCampaignSchema status completed', () => {
    const r = updateCampaignSchema.parse({ status: 'completed' });
    expect(r.status).toBe('completed');
  });

  it('createOrderSchema 省略 pricing_model 默认 fixed', () => {
    const r = createOrderSchema.parse({
      campaign_id: CID,
      kol_id: KID,
      offered_price: 120,
    });
    expect(r.pricing_model).toBe('fixed');
    expect(r.offered_price).toBe(120);
  });

  it('rechargeSchema alipay', () => {
    const r = rechargeSchema.parse({
      amount: 99.5,
      payment_method: 'alipay',
    });
    expect(r.payment_method).toBe('alipay');
  });
});

describe('gstack batch16 — KOL weibo / tiktok / 任务 / 交稿 / 同步 / 提现', () => {
  it('createKolSchema weibo', () => {
    const r = createKolSchema.parse({
      platform: 'weibo',
      platform_username: 'wb_u',
      platform_id: 'wb1',
      country: 'CN',
    });
    expect(r.platform).toBe('weibo');
  });

  it('bindKolAccountSchema tiktok 与 platform_avatar_url', () => {
    const r = bindKolAccountSchema.parse({
      platform: 'tiktok',
      platform_username: 'tt',
      platform_id: 'tt1',
      platform_avatar_url: 'https://cdn.example.com/a.jpg',
    });
    expect(r.platform_avatar_url).toMatch(/^https:/);
  });

  it('applyTaskSchema draft_urls 与 expected_price', () => {
    const r = applyTaskSchema.parse({
      draft_urls: ['https://v.com/1'],
      expected_price: 300,
      message: '报价说明',
    });
    expect(r.expected_price).toBe(300);
  });

  it('submitOrderSchema 含 message', () => {
    const r = submitOrderSchema.parse({
      draft_urls: ['https://p.com/x'],
      message: '已上传',
    });
    expect(r.message).toBe('已上传');
  });

  it('syncKolDataSchema account_ids', () => {
    const r = syncKolDataSchema.parse({ account_ids: [AID, BID] });
    expect(r.account_ids).toHaveLength(2);
  });

  it('withdrawSchema bank_transfer 含 bank 与 swift', () => {
    const r = withdrawSchema.parse({
      amount: 500,
      payment_method: 'bank_transfer',
      account_name: 'Lee',
      account_number: '6222000000000000',
      bank_name: 'ICBC',
      swift_code: 'ICBKCNBJ',
    });
    expect(r.swift_code).toBe('ICBKCNBJ');
  });
});

describe('gstack batch16 — computeKolKeywordRank 用户名前缀 / category 包含', () => {
  it('username 前缀匹配 85+单字段加成', () => {
    const r = computeKolKeywordRank(
      { platformUsername: 'beautystore', platformDisplayName: null, bio: null, category: null },
      'beauty'
    );
    expect(r.matched_fields).toContain('username');
    expect(r.score).toBe(88);
  });

  it('category 子串包含 48+单字段加成', () => {
    const r = computeKolKeywordRank(
      { platformUsername: 'u', platformDisplayName: null, bio: null, category: 'mobile gaming gear' },
      'gaming'
    );
    expect(r.matched_fields).toContain('category');
    expect(r.score).toBe(51);
  });
});

describe('gstack batch16 — billable / gross / buildCpmBreakdown cpm 无帽', () => {
  it('billable 与 grossSpend 与 buildCpmBreakdown cpm 无帽', () => {
    expect(billableImpressionsFromOrderViews(42.9)).toBe(42);
    expect(grossSpendFromCpm(10_000, 20)).toBe(200);
  });

  it('buildCpmBreakdown cpm 无预算帽按曝光计费', () => {
    const b = buildCpmBreakdown({
      pricingModel: 'cpm',
      views: 10_000,
      cpmRate: new Prisma.Decimal(5),
      cpmBudgetCap: null,
      price: new Prisma.Decimal(0),
      platformFee: new Prisma.Decimal(0),
      kolEarning: new Prisma.Decimal(0),
    });
    expect(b.pricing_model).toBe('cpm');
    expect(b.gross_spend).toBe(50);
    expect(b.platform_fee).toBe(5);
    expect(b.kol_earning).toBe(45);
  });
});

describe('gstack batch16 — partialRelease / genTransactionNo / parseMetricsBatchArgs / decimal', () => {
  it('partialReleaseAmount frozen<=0 返回 0', () => {
    expect(partialReleaseAmount(0, 10)).toBe(0);
    expect(partialReleaseAmount(-1, 10)).toBe(0);
  });

  it('genTransactionNo 格式', () => {
    expect(genTransactionNo()).toMatch(/^TXN-\d+-[0-9A-Z]+$/);
  });

  it('parseMetricsBatchArgs --views-delta 负数', () => {
    const a = parseMetricsBatchArgs(['--views-delta', '-3']);
    expect(a.viewsDelta).toBe(-3);
  });

  it('decimalToNumber Prisma.Decimal', () => {
    expect(decimalToNumber(new Prisma.Decimal('12.5'))).toBe(12.5);
  });
});

describe('gstack batch16 — maskEmail / maskIdNumber / isEmpty / deepClone', () => {
  it('maskEmail 非法格式返回 ****', () => {
    expect(maskEmail('not-an-email')).toBe('****');
  });

  it('maskIdNumber 18 位', () => {
    expect(maskIdNumber('110101199001011234')).toMatch(/110101\*\*\*\*\*\*\*\*1234/);
  });

  it('isEmpty 空对象', () => {
    expect(isEmpty({})).toBe(true);
  });

  it('deepClone 独立副本', () => {
    const a = { x: { y: 1 } };
    const b = deepClone(a);
    b.x.y = 2;
    expect(a.x.y).toBe(1);
  });
});

describe('gstack batch16 — validateRequest / generateUUID / sanitizeString', () => {
  it('validateRequest 成功、UUID 形态、sanitizeString', () => {
    const s = z.object({ ok: z.literal(true) });
    expect(validateRequest(s, { ok: true })).toEqual({ ok: true });
    const u = generateUUID();
    expect(u).toMatch(/^[0-9a-f-]{36}$/);
    expect(u[14]).toBe('4');
    expect(sanitizeString('  <x>y</x>  ')).toBe('xy/x');
  });
});

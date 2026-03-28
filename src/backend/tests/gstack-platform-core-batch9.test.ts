/**
 * GStack 平台核心域单测第九批次：
 * 订单/活动/提现/注册等 Zod 深层字段、CPM 预算帽、指标脚本参数、helpers、脱敏验证码
 */

import { Prisma } from '@prisma/client';
import { parseMetricsBatchArgs } from '../src/scripts/lib/orderMetricsBatchPayload';
import { buildCpmBreakdown, splitGrossWithPlatformFee } from '../src/services/cpm-metrics.service';
import { addDays, formatCurrency } from '../src/utils/helpers';
import { maskVerificationCode } from '../src/utils/mask';
import {
  createOrderSchema,
  createCampaignSchema,
  updateCampaignSchema,
  createAdvertiserSchema,
  registerSchema,
  phoneSchema,
  sendVerificationCodeSchema,
  verifyCodeBodySchema,
  loginEmailCodeSchema,
  createKolSchema,
  bindKolAccountSchema,
  kolSearchSchema,
  paginationSchema,
  updateUserSchema,
  withdrawSchema,
  rechargeSchema,
  applyTaskSchema,
} from '../src/utils/validator';

const CID = '550e8400-e29b-41d4-a716-446655440001';
const KID = '550e8400-e29b-41d4-a716-446655440002';

describe('gstack batch9 — createOrderSchema CPM superRefine 失败路径', () => {
  it('CPM 缺 cpm_rate 失败', () => {
    expect(() =>
      createOrderSchema.parse({
        campaign_id: CID,
        kol_id: KID,
        pricing_model: 'cpm',
        offered_price: 100,
      })
    ).toThrow();
  });

  it('CPM 缺 offered_price（预算帽）失败', () => {
    expect(() =>
      createOrderSchema.parse({
        campaign_id: CID,
        kol_id: KID,
        pricing_model: 'cpm',
        cpm_rate: 10,
      })
    ).toThrow();
  });
});

describe('gstack batch9 — Campaign create/update 扩展字段', () => {
  it('createCampaignSchema target_platforms 与 content_requirements', () => {
    const r = createCampaignSchema.parse({
      title: 'T',
      budget: 50,
      target_platforms: ['tiktok', 'youtube'],
      content_requirements: '竖屏 9:16',
    });
    expect(r.target_platforms).toEqual(['tiktok', 'youtube']);
    expect(r.content_requirements).toBe('竖屏 9:16');
  });

  it('updateCampaignSchema 标题/预算/状态', () => {
    const r = updateCampaignSchema.parse({
      title: 'New',
      budget: 999,
      status: 'active',
    });
    expect(r.title).toBe('New');
    expect(r.budget).toBe(999);
    expect(r.status).toBe('active');
  });
});

describe('gstack batch9 — withdraw / recharge 支付矩阵', () => {
  it('withdrawSchema bank_transfer 含支行与 SWIFT', () => {
    const r = withdrawSchema.parse({
      amount: 100,
      payment_method: 'bank_transfer',
      account_name: 'Lee',
      account_number: '6222000000000000',
      bank_name: 'ICBC',
      swift_code: 'ICBKCNBJ',
    });
    expect(r.payment_method).toBe('bank_transfer');
    expect(r.swift_code).toBe('ICBKCNBJ');
  });

  it('withdrawSchema paypal', () => {
    const r = withdrawSchema.parse({
      amount: 20,
      payment_method: 'paypal',
      account_name: 'P',
      account_number: 'pay@me.com',
    });
    expect(r.payment_method).toBe('paypal');
  });

  it('rechargeSchema alipay', () => {
    const r = rechargeSchema.parse({
      amount: 500,
      payment_method: 'alipay',
    });
    expect(r.payment_method).toBe('alipay');
  });
});

describe('gstack batch9 — 注册 / 手机 / 验证码 / 邮箱码登录', () => {
  it('registerSchema 邀请码 4 位', () => {
    const r = registerSchema.parse({
      email: 'inv@example.com',
      password: 'Abcd1234!',
      invite_code: 'ABCD',
    });
    expect(r.invite_code).toBe('ABCD');
  });

  it('phoneSchema undefined', () => {
    expect(phoneSchema.parse(undefined)).toBeUndefined();
  });

  it('sendVerificationCodeSchema purpose 为 reset_password', () => {
    const r = sendVerificationCodeSchema.parse({
      type: 'email',
      target: 'a@b.co',
      purpose: 'reset_password',
    });
    expect(r.purpose).toBe('reset_password');
  });

  it('verifyCodeBodySchema purpose 为 login', () => {
    const r = verifyCodeBodySchema.parse({
      type: 'email',
      target: 'a@b.co',
      code: '654321',
      purpose: 'login',
    });
    expect(r.purpose).toBe('login');
  });

  it('loginEmailCodeSchema', () => {
    const r = loginEmailCodeSchema.parse({
      email: 'user@example.com',
      code: '123456',
    });
    expect(r.code).toBe('123456');
  });
});

describe('gstack batch9 — KOL 绑定 / 搜索 / 分页 / 用户资料', () => {
  it('createKolSchema youtube', () => {
    const r = createKolSchema.parse({
      platform: 'youtube',
      platform_username: 'ch',
      platform_id: 'ytid',
    });
    expect(r.platform).toBe('youtube');
  });

  it('bindKolAccountSchema weibo', () => {
    const r = bindKolAccountSchema.parse({
      platform: 'weibo',
      platform_username: 'wb',
      platform_id: 'wid',
    });
    expect(r.platform).toBe('weibo');
  });

  it('kolSearchSchema min_followers 字符串强转数字', () => {
    const r = kolSearchSchema.parse({ min_followers: '800' as unknown as number });
    expect(r.min_followers).toBe(800);
  });

  it('paginationSchema page 字符串强转', () => {
    const r = paginationSchema.parse({ page: '3' as unknown as number, page_size: '5' as unknown as number });
    expect(r.page).toBe(3);
    expect(r.page_size).toBe(5);
  });

  it('updateUserSchema nickname 与 timezone', () => {
    const r = updateUserSchema.parse({
      nickname: 'Nick',
      timezone: 'Asia/Shanghai',
    });
    expect(r.nickname).toBe('Nick');
    expect(r.timezone).toBe('Asia/Shanghai');
  });

  it('createAdvertiserSchema 含官网 URL', () => {
    const r = createAdvertiserSchema.parse({
      company_name: 'Co',
      website: 'https://corp.example.com',
    });
    expect(r.website).toBe('https://corp.example.com');
  });

  it('applyTaskSchema 仅可选 message', () => {
    const r = applyTaskSchema.parse({ message: '议价说明' });
    expect(r.message).toBe('议价说明');
  });
});

describe('gstack batch9 — buildCpmBreakdown 预算帽与分成比例', () => {
  it('CPM gross 被 cpmBudgetCap 截断后重算平台费与 KOL', () => {
    const r = buildCpmBreakdown({
      pricingModel: 'cpm',
      views: 100_000,
      cpmRate: new Prisma.Decimal(100),
      cpmBudgetCap: new Prisma.Decimal(50),
      price: new Prisma.Decimal(9999),
      platformFee: new Prisma.Decimal(0),
      kolEarning: new Prisma.Decimal(0),
    });
    expect(r.gross_spend).toBe(50);
    expect(r.platform_fee).toBe(5);
    expect(r.kol_earning).toBe(45);
  });

  it('splitGrossWithPlatformFee 费率 20%', () => {
    const s = splitGrossWithPlatformFee(1000, 0.2);
    expect(s.platformFee).toBe(200);
    expect(s.kolEarning).toBe(800);
  });
});

describe('gstack batch9 — parseMetricsBatchArgs / helpers / mask', () => {
  it('parseMetricsBatchArgs 默认 limit=50', () => {
    expect(parseMetricsBatchArgs([])).toEqual({
      limit: 50,
      cpmOnly: false,
      viewsDelta: 0,
    });
  });

  it('formatCurrency 默认 CNY', () => {
    const s = formatCurrency(1234.5);
    expect(s).toContain('1');
    expect(s).toMatch(/234/);
  });

  it('addDays 加 0 天日期不变', () => {
    const d = new Date(2026, 2, 15);
    expect(addDays(d, 0).getTime()).toBe(d.getTime());
  });

  it('maskVerificationCode 固定掩码', () => {
    expect(maskVerificationCode()).toBe('******');
  });
});
